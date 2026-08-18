import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { prisma } from "@/utils/prisma";
import { checkIntipNomorRateLimit } from "@/utils/rateLimiter";
import { safeErrorResponse } from "@/utils/security";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getCostPerId(): Promise<number> {
  const config = await prisma.service_configs.findUnique({
    where: { service_type: "intip-nomor" },
  });
  return config?.cost_per_id ?? 2500;
}

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

    // Clean & format IDs
    const cleanIds = ids
      .map((x) => String(x).trim())
      .filter((x) => /^\d+$/.test(x));

    if (cleanIds.length === 0) {
      return NextResponse.json(
        { error: "INVALID_IDS", message: "Tidak ditemukan ID numerik yang valid." },
        { status: 400 }
      );
    }

    if (cleanIds.length > 10) {
      return NextResponse.json(
        { error: "MAX_10_IDS_EXCEEDED", message: "Maksimal 10 ID per request untuk fitur Intip Nomor." },
        { status: 400 }
      );
    }

    // Rate Limiting Check (Max 10 IDs, Max 100 req/min)
    const rateCheck = checkIntipNomorRateLimit(user.id, cleanIds.length);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "RATE_LIMIT_EXCEEDED",
          message: rateCheck.error,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const costPerId = await getCostPerId();
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
          message: `Saldo token tidak mencukupi. Butuh ${totalCost.toLocaleString("id-ID")} token, saldo Anda saat ini: ${currentBalance.toLocaleString("id-ID")} token.`,
          required: totalCost,
          balance: currentBalance,
        },
        { status: 402 }
      );
    }

    // Deduct token upfront atomically
    let txRecord: any;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.profiles.update({
          where: { id: user.id },
          data: { vcoin_balance: { decrement: totalCost } },
        });

        txRecord = await tx.transactions.create({
          data: {
            user_id: user.id,
            amount: -totalCost,
            type: "intip-nomor",
            status: "completed",
            meta_data: {
              target_ids: cleanIds,
              count: cleanIds.length,
              cost_per_id: costPerId,
            },
          },
        });
      });
    } catch (dbErr: any) {
      console.error("[Intip Nomor DB Deduct Error]:", dbErr);
      return NextResponse.json(
        { error: "DB_TRANSACTION_FAILED", message: "Gagal memproses saldo token di database." },
        { status: 500 }
      );
    }

    // Call BotKita API
    const botkitaApiKey = process.env.BOTKITA_API_KEY;
    const botkitaUrl = process.env.BOTKITA_BASE_URL || "https://botkita.online/handleMsg.do";

    if (!botkitaApiKey) {
      // Auto-refund if provider is not configured
      if (txRecord) {
        await prisma.profiles.update({
          where: { id: user.id },
          data: { vcoin_balance: { increment: totalCost } },
        });
        await prisma.transactions.update({
          where: { id: txRecord.id },
          data: { status: "failed" },
        });
      }
      return NextResponse.json(
        { error: "SERVICE_UNAVAILABLE", message: "Layanan provider sedang dalam pemeliharaan sistem." },
        { status: 503 }
      );
    }

    try {
      const formData = new URLSearchParams();
      formData.append("action", "api_cek");
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
        await prisma.$transaction(async (tx) => {
          await tx.profiles.update({
            where: { id: user.id },
            data: { vcoin_balance: { increment: totalCost } },
          });
          if (txRecord) {
            await tx.transactions.update({
              where: { id: txRecord.id },
              data: {
                status: "failed",
                meta_data: {
                  ...txRecord.meta_data,
                  error_response: botkitaData,
                  refunded: true,
                },
              },
            });
          }
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

      // Update transaction log with successful results
      if (txRecord) {
        await prisma.transactions.update({
          where: { id: txRecord.id },
          data: {
            meta_data: {
              ...txRecord.meta_data,
              found_count: botkitaData.found_count,
            },
          },
        });
      }

      const updatedProfile = await prisma.profiles.findUnique({
        where: { id: user.id },
        select: { vcoin_balance: true },
      });

      return NextResponse.json({
        success: true,
        results: botkitaData.results || [],
        found_count: botkitaData.found_count ?? (botkitaData.results?.length || 0),
        total_cost: totalCost,
        remaining_balance: updatedProfile?.vcoin_balance ?? 0,
      });
    } catch (fetchErr: any) {
      console.error("[BotKita Fetch Error]:", fetchErr?.message || "Connection failed");
      // Auto-refund on connection failure
      await prisma.profiles.update({
        where: { id: user.id },
        data: { vcoin_balance: { increment: totalCost } },
      });
      if (txRecord) {
        await prisma.transactions.update({
          where: { id: txRecord.id },
          data: { status: "failed" },
        });
      }

      return NextResponse.json(
        {
          error: "NETWORK_ERROR",
          message: "Gagal terhubung ke server provider. Saldo token Anda tidak terpotong (otomatis direfund).",
        },
        { status: 504 }
      );
    }
  } catch (err: any) {
    return safeErrorResponse(err, "Terjadi kesalahan server saat memproses intip nomor.");
  }
}
