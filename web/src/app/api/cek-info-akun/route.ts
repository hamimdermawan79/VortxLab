import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { prisma } from "@/utils/prisma";
import { checkCekInfoAkunRateLimit } from "@/utils/rateLimiter";
import { safeErrorResponse } from "@/utils/security";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getCostPerAccount(): Promise<number> {
  const config = await prisma.service_configs.findUnique({
    where: { service_type: "cek-info-akun" },
  });
  return config?.cost_per_id ?? 100;
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
    const { uid, password, mac } = body;

    if (!uid || !password) {
      return NextResponse.json(
        { error: "MISSING_PARAMS", message: "UID dan Password akun wajib diisi." },
        { status: 400 }
      );
    }

    const cleanUid = String(uid).trim();
    const cleanPassword = String(password).trim();
    const cleanMac = mac ? String(mac).trim() : "";

    if (!cleanUid || !cleanPassword) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS", message: "UID dan Password tidak boleh kosong." },
        { status: 400 }
      );
    }

    // Rate Limiting Check (Max 1 account, Max 20 req/hour)
    const rateCheck = checkCekInfoAkunRateLimit(user.id, 1);
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

    const cost = await getCostPerAccount();

    // Check user balance
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { vcoin_balance: true },
    });

    const currentBalance = profile?.vcoin_balance ?? 0;
    if (currentBalance < cost) {
      return NextResponse.json(
        {
          error: "INSUFFICIENT_BALANCE",
          message: `Saldo token tidak mencukupi. Butuh ${cost.toLocaleString("id-ID")} token, saldo Anda saat ini: ${currentBalance.toLocaleString("id-ID")} token.`,
          required: cost,
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
          data: { vcoin_balance: { decrement: cost } },
        });

        txRecord = await tx.transactions.create({
          data: {
            user_id: user.id,
            amount: -cost,
            type: "cek-info-akun",
            status: "completed",
            meta_data: {
              target_uid: cleanUid,
              target_mac: cleanMac || null,
              cost: cost,
            },
          },
        });
      });
    } catch (dbErr: any) {
      console.error("[Cek Info Akun DB Deduct Error]:", dbErr);
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
        await prisma.profiles.update({
          where: { id: user.id },
          data: { vcoin_balance: { increment: cost } },
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
      const accountObj: Record<string, any> = { uid: cleanUid, password: cleanPassword };
      if (cleanMac) accountObj.mac = cleanMac;

      const formData = new URLSearchParams();
      formData.append("action", "api_login_higgs");
      formData.append("api_key", botkitaApiKey);
      formData.append("accounts", JSON.stringify([accountObj]));

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
        const providerMsg =
          botkitaData.message || botkitaData.error || "Gagal memproses login ke provider upstream.";

        // If system error from API key or insufficient provider balance, refund user
        if (
          providerMsg.includes("API key") ||
          providerMsg.includes("Saldo") ||
          botkitaRes.status >= 500
        ) {
          await prisma.$transaction(async (tx) => {
            await tx.profiles.update({
              where: { id: user.id },
              data: { vcoin_balance: { increment: cost } },
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
        }

        return NextResponse.json(
          {
            error: "UPSTREAM_PROVIDER_ERROR",
            message: `Provider API Response: ${providerMsg}`,
          },
          { status: 502 }
        );
      }

      const accountResult = botkitaData.results?.[0] || null;

      const updatedProfile = await prisma.profiles.findUnique({
        where: { id: user.id },
        select: { vcoin_balance: true },
      });

      return NextResponse.json({
        success: true,
        result: accountResult,
        total_cost: cost,
        remaining_balance: updatedProfile?.vcoin_balance ?? 0,
      });
    } catch (fetchErr: any) {
      console.error("[BotKita Login Higgs Fetch Error]:", fetchErr?.message || "Connection failed");
      // Auto-refund on connection network crash
      await prisma.profiles.update({
        where: { id: user.id },
        data: { vcoin_balance: { increment: cost } },
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
    return safeErrorResponse(err, "Terjadi kesalahan internal server saat memproses cek info akun.");
  }
}
