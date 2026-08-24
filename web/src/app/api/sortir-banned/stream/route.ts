import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { prisma } from "@/utils/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
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

    const initialJob = await prisma.sortir_banned_jobs.findUnique({
      where: { id: activityId },
    });

    if (!initialJob || initialJob.user_id !== user.id) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const encoder = new TextEncoder();
    let isStreamClosed = false;

    const stream = new ReadableStream({
      async start(controller) {
        req.signal.addEventListener("abort", () => {
          isStreamClosed = true;
          try {
            controller.close();
          } catch {}
        });

        let pollCount = 0;
        const maxPolls = 3600; // max 1 hour of streaming per connection

        while (!isStreamClosed && pollCount < maxPolls) {
          pollCount++;
          try {
            const job = await prisma.sortir_banned_jobs.findUnique({
              where: { id: activityId },
            });

            if (!job || isStreamClosed) break;

            const rawRes = (job.raw_results as any) || {};
            const amanList = Array.isArray(rawRes.aman) ? rawRes.aman : [];
            const bannedList = Array.isArray(rawRes.banned) ? rawRes.banned : [];
            const interimAmanCount = typeof rawRes.aman_count === "number" ? rawRes.aman_count : amanList.length;
            const interimBannedCount = typeof rawRes.banned_count === "number" ? rawRes.banned_count : bannedList.length;
            const total = job.total_ids || 0;
            const current = job.current_index || 0;
            const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

            const payload = {
              activity_id: job.id,
              status: job.status,
              current_index: current,
              total_ids: total,
              percent,
              aman_count: interimAmanCount,
              banned_count: interimBannedCount,
              aman_ids: amanList,
              banned_ids: bannedList,
              recent_stream: Array.isArray(rawRes.recent_stream) ? rawRes.recent_stream : [],
              is_completed: job.status === "completed" || job.status === "failed",
              raw_results: {
                aman: amanList,
                banned: bannedList,
              },
            };

            const dataString = `data: ${JSON.stringify(payload)}\n\n`;
            controller.enqueue(encoder.encode(dataString));

            if (job.status === "completed" || job.status === "failed") {
              break;
            }

            // Wait 1 second before next poll
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (e) {
            break;
          }
        }

        try {
          if (!isStreamClosed) {
            controller.close();
          }
        } catch {}
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: "STREAM_ERROR" }, { status: 500 });
  }
}
