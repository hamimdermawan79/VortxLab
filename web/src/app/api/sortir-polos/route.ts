import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { prisma } from "@/utils/prisma";
import { checkSortirPolosRateLimit } from "@/utils/rateLimiter";
import { safeErrorResponse } from "@/utils/security";
import { getCostPerId, categorizeSortirResult, refundProviderFailure } from "@/utils/botkitaSortir";
import { parseHiggsIds } from "@/utils/parseHiggsIds";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SERVICE_TYPE = "sortir-polos";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Sesi telah berakhir atau tidak valid. Silakan login kembali." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "INVALID_IDS", message: "Parameter 'ids' harus berupa array ID string yang tidak kosong." },
        { status: 400 }
      );
    }

    const cleanIds = Array.from(
      new Set(
        (Array.isArray(ids) ? ids : [])
          .flatMap((x) => parseHiggsIds(String(x)))
          .filter((x) => /^\d{5,12}$/.test(x))
      )
    );

    if (cleanIds.length === 0) {
      return NextResponse.json(
        { error: "INVALID_IDS", message: "Tidak ditemukan ID numerik valid dalam request." },
        { status: 400 }
      );
    }

    // Rate Limiting Check (max 2000 IDs/req, 30 req/min)
    const rateCheck = checkSortirPolosRateLimit(user.id, cleanIds.length);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "RATE_LIMIT_EXCEEDED",
          message: rateCheck.error,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        { status: rateCheck.error?.startsWith("BATCH_SIZE") ? 400 : 429 }
      );
    }

    const costPerId = await getCostPerId(SERVICE_TYPE, 50);
    const totalCost = cleanIds.length * costPerId;

    // Check user balance
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { vcoin_balance: true },
    });

    const currentBalance = profile?.vcoin_balance ?? 0;
    if (currentBalance < totalCost) {
      return NextResponse.json(
        {
          error: "INSUFFICIENT_BALANCE",
          message: `Saldo token tidak mencukupi. Butuh ${totalCost.toLocaleString("id-ID")} token (${costPerId} token/ID x ${cleanIds.length.toLocaleString("id-ID")} ID), saldo Anda saat ini: ${currentBalance.toLocaleString("id-ID")} token.`,
          required: totalCost,
          cost_per_id: costPerId,
          total_ids: cleanIds.length,
          balance: currentBalance,
        },
        { status: 402 }
      );
    }

    // Deduct token upfront atomically
    let txRecord: any;
    try {
      await prisma.$transaction(async (tx) => {
        const deduction = await tx.profiles.updateMany({
          where: { id: user.id, vcoin_balance: { gte: totalCost } },
          data: { vcoin_balance: { decrement: totalCost } },
        });
        if (deduction.count === 0) {
          throw new Error("INSUFFICIENT_BALANCE_ATOMIC");
        }

        txRecord = await tx.transactions.create({
          data: {
            user_id: user.id,
            amount: -totalCost,
            type: SERVICE_TYPE,
            status: "completed",
            meta_data: {
              target_ids_count: cleanIds.length,
              cost_per_id: costPerId,
            },
          },
        });
      });
    } catch (dbErr: any) {
      if (dbErr?.message === "INSUFFICIENT_BALANCE_ATOMIC") {
        const latest = await prisma.profiles.findUnique({
          where: { id: user.id },
          select: { vcoin_balance: true },
        });
        return NextResponse.json(
          {
            error: "INSUFFICIENT_BALANCE",
            message: `Saldo token tidak mencukupi. Butuh ${totalCost.toLocaleString("id-ID")} token, saldo Anda saat ini: ${(latest?.vcoin_balance ?? 0).toLocaleString("id-ID")} token.`,
            required: totalCost,
            balance: latest?.vcoin_balance ?? 0,
          },
          { status: 402 }
        );
      }
      console.error("[Sortir Polos DB Deduct Error]:", dbErr);
      return NextResponse.json(
        { error: "DB_TRANSACTION_FAILED", message: "Gagal memproses saldo token di database." },
        { status: 500 }
      );
    }

    // Call BotKita API
    const botkitaApiKey = process.env.BOTKITA_API_KEY;
    const botkitaUrl = process.env.BOTKITA_BASE_URL || "https://botkita.online/handleMsg.do";

    if (!botkitaApiKey) {
      if (txRecord) {
        await refundProviderFailure(user.id, totalCost, txRecord);
      }
      return NextResponse.json(
        { error: "SERVICE_UNAVAILABLE", message: "Layanan provider sedang dalam pemeliharaan sistem." },
        { status: 503 }
      );
    }

    try {
      const formData = new URLSearchParams();
      formData.append("action", "sortir_polos");
      formData.append("api_key", botkitaApiKey);
      formData.append("ids", JSON.stringify(cleanIds));

      const botkitaRes = await fetch(botkitaUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
        cache: "no-store",
      });

      const responseText = await botkitaRes.text();
      let botkitaData: any;
      try {
        botkitaData = JSON.parse(responseText);
      } catch {
        botkitaData = { success: false, message: responseText };
      }

      if (!botkitaRes.ok || botkitaData.success === false) {
        // Refund tokens on provider failure
        await refundProviderFailure(user.id, totalCost, txRecord, {
          error_response: botkitaData,
          refunded: true,
        });

        let providerMsg = botkitaData.error || botkitaData.message || "Gagal mendapatkan data dari provider upstream.";
        if (typeof providerMsg === "string" && (providerMsg.includes("<!DOCTYPE") || providerMsg.includes("<html"))) {
          providerMsg = "Provider upstream sedang offline atau dalam pemeliharaan.";
        }
        return NextResponse.json(
          {
            error: "UPSTREAM_PROVIDER_ERROR",
            message: `Provider API: ${providerMsg}. Saldo token Anda telah dikembalikan otomatis.`,
          },
          { status: 502 }
        );
      }

      const categorized = categorizeSortirResult(botkitaData, "polos");

      const updatedProfile = await prisma.profiles.findUnique({
        where: { id: user.id },
        select: { vcoin_balance: true },
      });

      return NextResponse.json({
        success: true,
        action: "sortir_polos",
        total_ids: cleanIds.length,
        total_cost: totalCost,
        cost_per_id: costPerId,
        remaining_balance: updatedProfile?.vcoin_balance ?? 0,
        category_a: {
          label: categorized.groupA.label,
          ids: categorized.groupA.ids,
        },
        category_b: {
          label: categorized.groupB.label,
          ids: categorized.groupB.ids,
        },
        raw: botkitaData,
      });
    } catch (fetchErr: any) {
      console.error("[BotKita Sortir Polos Fetch Error]:", fetchErr?.message || "Connection failed");
      // Auto-refund on connection failure
      await refundProviderFailure(user.id, totalCost, txRecord);

      return NextResponse.json(
        {
          error: "NETWORK_ERROR",
          message: "Gagal terhubung ke server provider. Saldo token Anda tidak terpotong (otomatis direfund).",
        },
        { status: 504 }
      );
    }
  } catch (err: any) {
    return safeErrorResponse(err, "Terjadi kesalahan server saat memproses sortir polos.");
  }
}
