import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { prisma } from "@/utils/prisma";
import { checkSortirRateLimit } from "@/utils/rateLimiter";
import { processSortirJobAsync } from "@/utils/sortirEngine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getCost(isApi: boolean): Promise<number> {
  if (isApi) {
    const apiConfig = await prisma.service_configs.findUnique({
      where: { service_type: "sortir-banned-api" },
    });
    if (apiConfig) return apiConfig.cost_per_id;
  }
  const config = await prisma.service_configs.findUnique({
    where: { service_type: "sortir-banned" },
  });
  return config?.cost_per_id ?? 20;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        {
          error: "UNAUTHORIZED",
          message: "Autentikasi gagal. Pastikan menyertakan Header 'Authorization: Bearer <API_KEY>' yang valid dari Dashboard.",
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { ids, webhook_url } = body;

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
        { error: "INVALID_IDS", message: "Tidak ada ID numerik valid dalam request." },
        { status: 400 }
      );
    }

    // 1. Single Request Batch Limit (Max 20 IDs per request)
    const rateCheck = checkSortirRateLimit(user.id, cleanIds.length);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "BATCH_SIZE_EXCEEDED",
          message: rateCheck.error || "Maksimal 20 ID per pemanggilan request API. Silakan bagi request Anda menjadi batch maksimal 20 ID.",
          max_allowed: 20,
          received_count: cleanIds.length,
        },
        { status: 400 }
      );
    }

    // 2. Token Balance Check based on Admin-Configured Pricing (Web UI vs Calling API)
    const isApi = !!user.isApiKey;
    const costPerId = await getCost(isApi);
    const totalCost = cleanIds.length * costPerId;
    const profile = await prisma.profiles.findUnique({ where: { id: user.id } });

    if (!profile || profile.vcoin_balance < totalCost) {
      return NextResponse.json(
        {
          error: "INSUFFICIENT_BALANCE",
          message: `Saldo token tidak mencukupi. Diperlukan ${totalCost} token (${costPerId} token/ID x ${cleanIds.length} ID), saldo akun Anda saat ini ${profile?.vcoin_balance || 0} token.`,
          required_tokens: totalCost,
          cost_per_id: costPerId,
          total_ids: cleanIds.length,
          current_balance: profile?.vcoin_balance || 0,
        },
        { status: 402 }
      );
    }

    // 3. Atomically deduct tokens & create job
    const result = await prisma.$transaction([
      prisma.profiles.update({
        where: { id: user.id },
        data: { vcoin_balance: { decrement: totalCost } },
      }),
      prisma.transactions.create({
        data: {
          user_id: user.id,
          type: isApi ? "sortir-banned-api" : "sortir-banned",
          amount: -totalCost,
          status: "completed",
          meta_data: {
            ids_count: cleanIds.length,
            cost_per_id: costPerId,
            is_api: isApi,
            webhook_url: webhook_url || null,
          },
        },
      }),
      prisma.sortir_banned_jobs.create({
        data: {
          user_id: user.id,
          total_ids: cleanIds.length,
          cost: totalCost,
          status: "pending",
          raw_results: {
            ids: cleanIds,
            webhook_url: webhook_url || null,
          },
          current_index: 0,
        },
      }),
    ]);

    const createdJob = result[2];

    // 4. Trigger Async Engine in background (with Webhook dispatch support)
    processSortirJobAsync(createdJob.id, cleanIds, webhook_url);

    const response = NextResponse.json({
      success: true,
      activity_id: createdJob.id,
      total_ids: cleanIds.length,
      cost_per_id: costPerId,
      cost: totalCost,
      remaining_token: profile.vcoin_balance - totalCost,
      webhook_registered: !!webhook_url,
      rate_limit: {
        remaining_ids_this_minute: rateCheck.remaining,
      },
      message: "Proses sortir ID berhasil dimulai. Hasil akan dikirimkan ke webhook (jika ada) atau dapat dipoll via GET /api/sortir-banned.",
    });

    response.headers.set("X-RateLimit-Limit", rateCheck.limit.toString());
    response.headers.set("X-RateLimit-Remaining", rateCheck.remaining.toString());
    return response;
  } catch (err: any) {
    console.error("Sortir Banned API Error:", err);
    return NextResponse.json({ error: "SERVER_ERROR", message: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const activityId = searchParams.get("activityId");

    if (!activityId) {
      return NextResponse.json({ error: "MISSING_ACTIVITY_ID", message: "Parameter activityId diperlukan." }, { status: 400 });
    }

    const job = await prisma.sortir_banned_jobs.findUnique({
      where: { id: activityId },
    });

    if (!job) {
      return NextResponse.json({ error: "ACTIVITY_NOT_FOUND", message: "Aktivitas tidak ditemukan." }, { status: 404 });
    }

    if (job.user_id !== user.id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const rawRes = (job.raw_results as any) || {};

    const responsePayload: any = {
      activity_id: job.id,
      status: job.status,
      current_index: job.current_index || 0,
      total_ids: job.total_ids || 0,
      progress_percent: job.total_ids > 0 ? Math.round(((job.current_index || 0) / job.total_ids) * 100) : 0,
      created_at: job.created_at,
    };

    if (job.status === "completed" || job.status === "failed") {
      responsePayload.raw_results = {
        aman: rawRes.aman || [],
        banned: rawRes.banned || [],
      };
      responsePayload.summary = {
        total_aman: (rawRes.aman || []).length,
        total_banned: (rawRes.banned || []).length,
      };
    }

    const response = NextResponse.json(responsePayload);
    response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return response;
  } catch (err: any) {
    console.error("Sortir Banned Polling Error:", err);
    return NextResponse.json({ error: "POLLING_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const activityId = searchParams.get("activityId");

    if (!activityId) {
      return NextResponse.json({ error: "MISSING_ACTIVITY_ID" }, { status: 400 });
    }

    const job = await prisma.sortir_banned_jobs.findUnique({
      where: { id: activityId },
    });

    if (!job) {
      return NextResponse.json({ error: "ACTIVITY_NOT_FOUND" }, { status: 404 });
    }

    if (job.user_id !== user.id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    if (job.status !== "pending" && job.status !== "processing") {
      return NextResponse.json({ error: "JOB_NOT_CANCELLABLE", message: "Pekerjaan sudah selesai atau gagal." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.sortir_banned_jobs.update({
        where: { id: activityId },
        data: { status: "failed" },
      }),
      prisma.profiles.update({
        where: { id: user.id },
        data: { vcoin_balance: { increment: job.cost } },
      }),
      prisma.transactions.create({
        data: {
          user_id: user.id,
          type: "refund-sortir-banned",
          amount: job.cost,
          status: "completed",
          meta_data: { refunded_job_id: activityId },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Pekerjaan berhasil dibatalkan dan saldo token telah dikembalikan.",
      refunded_amount: job.cost,
    });
  } catch (err: any) {
    console.error("Sortir Banned Cancel Error:", err);
    return NextResponse.json({ error: "CANCEL_ERROR", message: err.message }, { status: 500 });
  }
}