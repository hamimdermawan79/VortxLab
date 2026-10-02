import { prisma } from "@/utils/prisma";
import { isAllowedWebhookUrl } from "@/utils/security";

const ACTIVE_ENDPOINTS = [
  "https://www.topbos.com/web/rechargeOrder.do",
  "https://www.toptoplink.com/web/rechargeOrder.do",
  "https://www.bosbosgames.com/web/rechargeOrder.do",
];

const MAINTENANCE_MSG = "Sistem sedang dalam maintenance.";

export function parseSortirIds(rawText: string): string[] {
  if (!rawText || typeof rawText !== "string") return [];
  const lines = rawText.split(/\r?\n/);
  const extracted: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 1. Match explicit "ID: <number>" pattern
    const m1 = trimmed.match(/\b(?:id|user_?id|uid)\s*[:=]\s*(\d{4,12})\b/i);
    if (m1 && m1[1]) {
      extracted.push(m1[1]);
      continue;
    }

    // 2. Match start with "ID <number>"
    const m2 = trimmed.match(/^id\s*[:=]?\s*(\d{4,12})/i);
    if (m2 && m2[1]) {
      extracted.push(m2[1]);
      continue;
    }

    // 3. Delimited formats (pipe, tab, comma, colon, space) e.g. "35906623|PW|MAC" or "35906623,PW"
    const tokens = trimmed.split(/[\t,|;:]+/).map((t) => t.trim()).filter(Boolean);
    let found = false;
    for (const token of tokens) {
      if (/^\d{5,12}$/.test(token)) {
        extracted.push(token);
        found = true;
        break;
      }
    }
    if (found) continue;

    // 4. Generic match for 5-12 digits sequence in the line
    const m3 = trimmed.match(/\b\d{5,12}\b/);
    if (m3) {
      extracted.push(m3[0]);
      continue;
    }

    // 5. Pure numbers fallback
    const numOnly = trimmed.replace(/\D/g, "");
    if (numOnly.length >= 5 && numOnly.length <= 12) {
      extracted.push(numOnly);
    }
  }

  return extracted;
}

interface CheckResult {
  id: string;
  status: "AMAN" | "Banned" | "Error";
}

let rollingIndex = 0;

async function checkSingleId(userId: string, retryCount = 0): Promise<CheckResult> {
  const endpoint = ACTIVE_ENDPOINTS[(rollingIndex++) % ACTIVE_ENDPOINTS.length];
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
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const code = String(data?.code || "");
      const msg = data?.message || "";

      if (code === "1125" || msg === MAINTENANCE_MSG) {
        return { id: userId, status: "Banned" };
      }

      if (code === "0" && (data?.data || msg === "")) {
        return { id: userId, status: "AMAN" };
      }

      // If code is 999 (degraded) or unfamiliar, retry with another endpoint
      if (retryCount < 3) {
        await new Promise((r) => setTimeout(r, 400));
        return checkSingleId(userId, retryCount + 1);
      }
      return { id: userId, status: "Error" };
    }

    // On 403, 429, 500, retry on alternate endpoint
    if (retryCount < 3) {
      await new Promise((r) => setTimeout(r, 500));
      return checkSingleId(userId, retryCount + 1);
    }

    return { id: userId, status: "Error" };
  } catch (err) {
    if (retryCount < 3) {
      await new Promise((r) => setTimeout(r, 500));
      return checkSingleId(userId, retryCount + 1);
    }
    return { id: userId, status: "Error" };
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
