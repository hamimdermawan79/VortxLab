import { prisma } from "@/utils/prisma";

export async function getCostPerId(serviceType: string, fallback: number): Promise<number> {
  const config = await prisma.service_configs.findUnique({
    where: { service_type: serviceType },
  });
  return config?.cost_per_id ?? fallback;
}

// Refund token + tandai transaksi gagal saat provider bermasalah.
// Dibungkus try/catch agar kegagalan refund TIDAK menimpa pesan error utama
// (dan tetap ter-log untuk pengecekan manual oleh admin).
export async function refundProviderFailure(
  userId: string,
  amount: number,
  txRecord: { id?: string; meta_data?: any } | null,
  extraMeta?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.profiles.update({
      where: { id: userId },
      data: { vcoin_balance: { increment: amount } },
    });

    if (txRecord?.id) {
      await prisma.transactions.update({
        where: { id: txRecord.id },
        data: {
          status: "failed",
          meta_data: { ...(txRecord.meta_data || {}), ...extraMeta },
        },
      });
    }
  } catch (refundErr: any) {
    console.error("[REFUND GAGAL - butuh pengecekan manual]:", {
      userId,
      amount,
      txId: txRecord?.id,
      error: refundErr?.message || refundErr,
    });
  }
}

export interface SortirGroup {
  label: string;
  ids: string[];
}

export interface CategorizedSortir {
  groupA: SortirGroup;
  groupB: SortirGroup;
  rawCount: number;
}

function normalizeId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(value).trim();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return /^\d+$/.test(trimmed) ? trimmed : null;
  }
  return null;
}

// Gagal-aman categorizer untuk respons sortir_family / sortir_polos dari botkita.
// Respons upstream bisa berupa: hasil berbentuk array objek dengan field status/kategori,
// objek berisi mapping kategori -> [id], atau struktur lain. Kategori diambil sebaik mungkin,
// dan seluruh ID yang berhasil diekstrak tetap direturn untuk di-tampilkan.
export function categorizeSortirResult(rawData: any, previewKey: string): CategorizedSortir {
  const fallback: CategorizedSortir = {
    groupA: { label: "Teridentifikasi", ids: [] },
    groupB: { label: "Lainnya", ids: [] },
    rawCount: 0,
  };

  if (!rawData || typeof rawData !== "object") return fallback;

  // Helper: kumpulkan id dari nilai array (baik array string ataupun array objek).
  const collectIds = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      const out: string[] = [];
      for (const item of value) {
        if (typeof item === "string" || typeof item === "number") {
          const id = normalizeId(item);
          if (id) out.push(id);
        } else if (item && typeof item === "object") {
          const candidates = [item["id"], item["uid"], item["user_id"], item["userid"], item["account"], item[previewKey]];
          for (const c of candidates) {
            const id = normalizeId(c);
            if (id) {
              out.push(id);
              break;
            }
          }
        }
      }
      return Array.from(new Set(out));
    }
    return [];
  };

  // Strategi 1: objek berisi mapping kategori -> array id (mis. { member: [...], nonmember: [...] })
  // atau array berisi objek { status/kategori: array }.
  const container = Array.isArray(rawData) ? rawData[0] : rawData;
  if (container && typeof container === "object") {
    const arrayValueKeys = Object.keys(container).filter((k) => Array.isArray(container[k]));
    if (arrayValueKeys.length > 0) {
      const aIds = collectIds(container[arrayValueKeys[0]]);
      const bIds =
        arrayValueKeys.length > 1 ? collectIds(container[arrayValueKeys[1]]) : [];
      return {
        groupA: { label: previewKey === "member" ? "Member" : "Polos", ids: aIds },
        groupB: { label: previewKey === "member" ? "Bukan Member" : "Tidak Polos", ids: bIds },
        rawCount: (rawData as any)?.found_count ?? aIds.length + bIds.length,
      };
    }
  }

  // Strategi 2: array objek dengan field status/kategori per id
  if (Array.isArray(rawData)) {
    const groupAcc: Record<string, string[]> = {};
    const order: string[] = [];
    for (const item of rawData) {
      if (!item || typeof item !== "object") continue;
      const id = [item["id"], item["uid"], item["user_id"], item["userid"], item["account"]]
        .map(normalizeId)
        .find((n) => n);
      if (!id) continue;
      const status =
        [
          item["status"],
          item["type"],
          item["kategori"],
          item["category"],
          item["result"],
          item["label"],
          item[previewKey],
        ]
          .map((v) => (v == null ? "" : String(v).toLowerCase().trim()))
          .find((v) => v.length > 0) || "";
      const key = status.toLowerCase().includes("non") || status.toLowerCase().includes("bukan") || status.toLowerCase().includes("tidak")
        ? "B"
        : status.toLowerCase().includes(previewKey) || status === "a" || status === "true" || status === "ya"
        ? "A"
        : order.length === 0
        ? "A"
        : "B";
      if (!groupAcc[key]) groupAcc[key] = [];
      groupAcc[key].push(id);
      if (!order.includes(key)) order.push(key);
    }
    const aKey = order[0] || "A";
    const bKey = order[1] || (aKey === "A" ? "B" : "A");
    return {
      groupA: { label: previewKey === "member" ? "Member" : "Polos", ids: groupAcc[aKey] || [] },
      groupB: { label: previewKey === "member" ? "Bukan Member" : "Tidak Polos", ids: groupAcc[bKey] || [] },
      rawCount: rawData.length,
    };
  }

  // Strategi 3: field hasil eksplisit
  const resultsField = rawData["results"] ?? rawData["data"];
  if (resultsField !== undefined) {
    const extracted = collectIds(resultsField);
    if (extracted.length > 0) {
      return {
        groupA: { label: previewKey === "member" ? "Member" : "Polos", ids: extracted },
        groupB: { label: previewKey === "member" ? "Bukan Member" : "Tidak Polos", ids: [] },
        rawCount: extracted.length,
      };
    }
    const nested = categorizeSortirResult(resultsField, previewKey);
    return nested.rawCount > 0 ? nested : fallback;
  }

  return fallback;
}
