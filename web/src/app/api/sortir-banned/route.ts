import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { prisma } from "@/utils/prisma";
import { checkSortirRateLimit } from "@/utils/rateLimiter";
import { safeErrorResponse, isAllowedWebhookUrl } from "@/utils/security";
import { processSortirJobAsync, parseSortirIds } from "@/utils/sortirEngine";

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

    // Validasi webhook_url untuk mencegah SSRF (tolak private/loopback/metadata).
    let safeWebhookUrl: string | null = null;
    if (webhook_url) {
      if (typeof webhook_url !== "string" || !isAllowedWebhookUrl(webhook_url)) {
        return NextResponse.json(
          { error: "INVALID_WEBHOOK_URL", message: "URL webhook harus https dan bukan host internal/private." },
          { status: 400 }
        );
      }
      safeWebhookUrl = webhook_url;
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "INVALID_IDS", message: "Parameter 'ids' harus berupa array ID string yang tidak kosong." },
        { status: 400 }
      );
    }

    // Clean & extract numeric IDs robustly from any format (plain ID, ID: ... PW: ..., ID|PW|MAC, etc.)
    const cleanIds = ids
      .flatMap((item) => parseSortirIds(String(item)))
      .filter((id) => /^\d{5,12}$/.test(id));

    if (cleanIds.length === 0) {
      return NextResponse.json(
        { error: "INVALID_IDS", message: "Tidak ada ID numerik valid dalam request." },
        { status: 400 }
      );
    }

    // 1. Single Request Batch Limit (Max 100,000 IDs per job)
    const rateCheck = checkSortirRateLimit(user.id, cleanIds.length);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "BATCH_SIZE_EXCEEDED",
          message: rateCheck.error || `Maksimal ${rateCheck.limit.toLocaleString()} ID per pemanggilan.`,
          max_allowed: rateCheck.limit,
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
          message: `Saldo token tidak mencukupi. Diperlukan ${totalCost.toLocaleString()} token (${costPerId} token/ID x ${cleanIds.length.toLocaleString()} ID), saldo akun Anda saat ini ${(profile?.vcoin_balance || 0).toLocaleString()} token.`,
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
            webhook_url: safeWebhookUrl || null,
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
            webhook_url: safeWebhookUrl || null,
          },
          current_index: 0,
        },
      }),
    ]);

    const createdJob = result[2];

    const response = NextResponse.json({
      success: true,
      activity_id: createdJob.id,
      total_ids: cleanIds.length,
      cost_per_id: costPerId,
      cost: totalCost,
      remaining_token: (profile?.vcoin_balance || 0) - totalCost,
      webhook_registered: !!safeWebhookUrl,
      rate_limit: {
        remaining_ids_this_minute: rateCheck.remaining,
      },
      message: "Proses sortir ID berhasil dimulai sebagai 1 Job antrean engine. Progres dapat dipantau langsung via SSE stream atau GET /api/sortir-banned.",
    });

    response.headers.set("X-RateLimit-Limit", rateCheck.limit.toString());
    response.headers.set("X-RateLimit-Remaining", rateCheck.remaining.toString());
    return response;
  } catch (err: any) {
    return safeErrorResponse(err, "Gagal memulai pemrosesan sortir banned.");
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

    const amanList = Array.isArray(rawRes.aman) ? rawRes.aman : [];
    const bannedList = Array.isArray(rawRes.banned) ? rawRes.banned : [];
    const interimAmanCount = typeof rawRes.aman_count === "number" ? rawRes.aman_count : amanList.length;
    const interimBannedCount = typeof rawRes.banned_count === "number" ? rawRes.banned_count : bannedList.length;

    const responsePayload: any = {
      activity_id: job.id,
      status: job.status,
      current_index: job.current_index || 0,
      total_ids: job.total_ids || 0,
      progress_percent: job.total_ids > 0 ? Math.round(((job.current_index || 0) / job.total_ids) * 100) : 0,
      created_at: job.created_at,
      summary: {
        total_aman: interimAmanCount,
        total_banned: interimBannedCount,
      },
      recent_stream: Array.isArray(rawRes.recent_stream) ? rawRes.recent_stream : [],
      raw_results: {
        aman: amanList,
        banned: bannedList,
      },
      aman_ids: amanList,
      banned_ids: bannedList,
    };

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

    await prisma.sortir_banned_jobs.update({
      where: { id: activityId },
      data: { status: "failed" },
    });

    return NextResponse.json({
      success: true,
      message: "Pekerjaan berhasil dibatalkan. Sesuai ketentuan, saldo token yang telah dipotong tidak dikembalikan.",
    });
  } catch (err: any) {
    return safeErrorResponse(err, "Gagal membatalkan proses sortir.");
  }
}