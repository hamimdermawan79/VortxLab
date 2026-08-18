import { prisma } from "@/utils/prisma";
import { isAllowedWebhookUrl } from "@/utils/security";

const ENGINE_1 = "https://www.toptoplink.com/web/rechargeOrder.do";
const ENGINE_2 = "https://i.urzvz.com/web/rechargeOrder.do";
const MAINTENANCE_MSG = "Sistem sedang dalam maintenance.";

interface CheckResult {
  id: string;
  status: "AMAN" | "Banned";
}

async function checkSingleId(userId: string): Promise<CheckResult> {
  const timestamp = Date.now();
  const body = new URLSearchParams({
    userId,
    costKey: "com.neptune.domino.coincard0035",
    languageType: "2",
    infullType: "40",
    timestamp: timestamp.toString(),
  }).toString();

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "User-Agent": "VortX-Master-Engine-Burst/8.0 (High-Throughput)",
  };

  try {
    // Try primary engine
    let res = await fetch(ENGINE_1, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok || res.status === 403 || res.status === 429) {
      // Fallback engine
      res = await fetch(ENGINE_2, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      });
    }

    if (res.ok) {
      const data = await res.json();
      const msg = data?.message || "";
      const isBanned = msg === MAINTENANCE_MSG;
      return { id: userId, status: isBanned ? "Banned" : "AMAN" };
    }

    // If both failed or blocked, return AMAN default or keep status
    return { id: userId, status: "AMAN" };
  } catch (err) {
    // On network timeout/error, mark as AMAN default
    return { id: userId, status: "AMAN" };
  }
}

export async function processSortirJobAsync(
  jobId: string,
  ids: string[],
  webhookUrl?: string
) {
  try {
    // Set status to processing
    await prisma.sortir_banned_jobs.update({
      where: { id: jobId },
      data: { status: "processing" },
    });

    const amanList: string[] = [];
    const bannedList: string[] = [];
    let processedCount = 0;

    // Process in high concurrency batches of 10
    const BATCH_CONCURRENCY = 10;
    for (let i = 0; i < ids.length; i += BATCH_CONCURRENCY) {
      const chunk = ids.slice(i, i + BATCH_CONCURRENCY);
      const results = await Promise.all(chunk.map((uid) => checkSingleId(uid)));

      for (const r of results) {
        if (r.status === "Banned") {
          bannedList.push(r.id);
        } else {
          amanList.push(r.id);
        }
        processedCount++;
      }

      // Update progress
      await prisma.sortir_banned_jobs.update({
        where: { id: jobId },
        data: {
          current_index: processedCount,
          raw_results: {
            ids,
            aman: amanList,
            banned: bannedList,
            webhook_url: webhookUrl,
          },
        },
      });

      // Small throttle delay
      await new Promise((r) => setTimeout(r, 30));
    }

    // Finalize completed status
    const finalResults = {
      ids,
      aman: amanList,
      banned: bannedList,
      webhook_url: webhookUrl,
    };

    await prisma.sortir_banned_jobs.update({
      where: { id: jobId },
      data: {
        status: "completed",
        current_index: ids.length,
        raw_results: finalResults,
      },
    });

    // Dispatch Webhook if provided (re-validasi anti-SSRF defense-in-depth)
    if (webhookUrl && isAllowedWebhookUrl(webhookUrl)) {
      dispatchWebhook(webhookUrl, {
        event: "sortir.completed",
        activity_id: jobId,
        total_ids: ids.length,
        results: {
          aman: amanList,
          banned: bannedList,
        },
        summary: {
          total_aman: amanList.length,
          total_banned: bannedList.length,
        },
        completed_at: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    console.error(`Sortir Job ${jobId} failed:`, err);
    try {
      await prisma.sortir_banned_jobs.update({
        where: { id: jobId },
        data: { status: "failed" },
      });
    } catch {}
  }
}

async function dispatchWebhook(url: string, payload: any) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "VortX-Webhook-Dispatcher/1.0",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    console.log(`[Webhook] Dispatched to ${url} | Status: ${res.status}`);
  } catch (err: any) {
    console.error(`[Webhook Error] Failed to dispatch to ${url}:`, err.message);
  }
}
