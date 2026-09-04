"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Wallet,
  Shield,
  FolderArchive,
  Download,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  Upload,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  User,
  Activity,
  Menu,
  Copy,
  Check,
  Code2,
  Terminal,
  ShieldCheck,
  Phone,
  UserCheck,
  Zap,
  Cpu,
  CreditCard
} from "lucide-react";
import AIModelsCatalog from "./components/AIModelsCatalog";
import ServerlessInferenceView from "./components/ServerlessInferenceView";
import AIPlaygroundView from "./components/AIPlaygroundView";
import NewCheckerView from "./components/NewCheckerView";
import IntipNomorView from "./components/IntipNomorView";
import CekInfoAkunView from "./components/CekInfoAkunView";
import HeadlessDataCheckerView from "./components/HeadlessDataCheckerView";
import DesktopExtractorLicenseView from "./components/DesktopExtractorLicenseView";
import VortXLogo from "@/components/VortXLogo";
import Footer from "@/components/Footer";

const HIGGS_PRODUCTS = [
  {
    sku: "sortir-banned",
    label: "Sortir Banned",
    icon: Shield,
    cost: 20,
  },
  {
    sku: "intip-nomor",
    label: "Intip Nomor",
    icon: Phone,
    cost: 2500,
  },
  {
    sku: "cek-info-akun",
    label: "Cek Info Akun",
    icon: UserCheck,
    cost: 100,
  },
  {
    sku: "data-extractor",
    label: "Data Extractor",
    icon: FolderArchive,
    cost: 5,
  },
  {
    sku: "new-checker",
    label: "Data Checker Tools",
    icon: Download,
    cost: 100,
  },
  {
    sku: "headless-checker",
    label: "Headless Data Checker",
    icon: Cpu,
    cost: 50,
    isSoon: true,
  },
];

type Status = "idle" | "deducting" | "processing" | "completed" | "failed" | "uploading";

// =================== Sortir Result Group Component ===================
function SortirResultGroup({
  amanIds = [],
  bannedIds = [],
  totalIds,
  totalAmanCount,
  totalBannedCount,
  onDownloadCsv,
  title = "Hasil Pemrosesan Sortir",
  isLive = false,
  rawLinesMap,
}: {
  amanIds?: string[];
  bannedIds?: string[];
  totalIds?: number;
  totalAmanCount?: number;
  totalBannedCount?: number;
  onDownloadCsv?: () => void;
  title?: string;
  isLive?: boolean;
  rawLinesMap?: Record<string, string>;
}) {
  const safeAman = Array.isArray(amanIds) ? amanIds : [];
  const safeBanned = Array.isArray(bannedIds) ? bannedIds : [];
  const displayAmanCount = typeof totalAmanCount === "number" ? totalAmanCount : safeAman.length;
  const displayBannedCount = typeof totalBannedCount === "number" ? totalBannedCount : safeBanned.length;
  const total = totalIds || (displayAmanCount + displayBannedCount);

  const [copiedAman, setCopiedAman] = useState(false);
  const [copiedBanned, setCopiedBanned] = useState(false);
  const [showAllAman, setShowAllAman] = useState(false);
  const [showAllBanned, setShowAllBanned] = useState(false);

  const MAX_SHOW = 15;

  const handleCopyAman = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (safeAman.length === 0) return;
    const text = safeAman.map((id) => rawLinesMap?.[id] || id).join("\n");
    navigator.clipboard.writeText(text);
    setCopiedAman(true);
    setTimeout(() => setCopiedAman(false), 2000);
  };

  const handleCopyBanned = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (safeBanned.length === 0) return;
    const text = safeBanned.map((id) => rawLinesMap?.[id] || id).join("\n");
    navigator.clipboard.writeText(text);
    setCopiedBanned(true);
    setTimeout(() => setCopiedBanned(false), 2000);
  };

  // For live view, show newest items first
  const displayListAman = isLive ? [...safeAman].reverse() : safeAman;
  const displayListBanned = isLive ? [...safeBanned].reverse() : safeBanned;

  const visibleAman = showAllAman ? displayListAman : displayListAman.slice(0, MAX_SHOW);
  const visibleBanned = showAllBanned ? displayListBanned : displayListBanned.slice(0, MAX_SHOW);

  return (
    <div className="space-y-3">
      {title && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#e4e4e7]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-black"}`} />
            <h4 className="text-xs font-semibold text-[#18181b] uppercase tracking-wider">
              {title}
            </h4>
            <span className="text-[11px] font-mono text-[#71717a]">
              ({total.toLocaleString()} Total ID)
            </span>
          </div>
          {onDownloadCsv && (
            <button
              onClick={onDownloadCsv}
              className="self-start sm:self-auto text-[11px] flex items-center gap-1.5 px-3 py-1 bg-white border border-[#e4e4e7] rounded-xs text-black hover:bg-[#f4f4f5] transition-all font-medium shadow-2xs cursor-pointer"
            >
              <Download size={12} /> Unduh CSV
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* CARD 1: AKUN AMAN (HIJAU OPACITY RENDAH) */}
        <div className="bg-emerald-500/[0.06] border border-emerald-500/25 hover:border-emerald-500/40 transition-all rounded-xs p-3.5 flex flex-col justify-between space-y-3 shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full bg-emerald-500 ${isLive ? "animate-pulse" : ""}`} />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                  Akun Aman
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 transition-all duration-300">
                  {displayAmanCount.toLocaleString()} ID
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyAman}
                disabled={safeAman.length === 0}
                className="text-[11px] flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-500/30 rounded-xs shadow-2xs font-medium cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copiedAman ? (
                  <>
                    <Check size={12} className="text-emerald-600" /> Tersalin!
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Salin ({displayAmanCount})
                  </>
                )}
              </button>
            </div>

            <div className="mt-2.5">
              {displayAmanCount === 0 && safeAman.length === 0 ? (
                <div className="py-5 text-center text-xs text-emerald-800/60 font-mono italic bg-white/40 rounded-xs border border-emerald-500/10">
                  {isLive ? "Menunggu akun aman masuk pool..." : "Tidak ada akun dalam status Aman"}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="bg-white/80 border border-emerald-500/20 rounded-xs p-2 max-h-48 overflow-y-auto font-mono text-[11px] text-emerald-950 divide-y divide-emerald-500/10 select-all">
                    {visibleAman.map((id, idx) => {
                      const fullLine = rawLinesMap?.[id] || id;
                      return (
                        <div
                          key={idx}
                          className="py-1 px-1.5 flex items-center justify-between hover:bg-emerald-500/10 rounded-xs transition-colors gap-2"
                        >
                          <span className="font-semibold truncate" title={fullLine}>
                            {fullLine}
                          </span>
                          <span className="text-[9px] text-emerald-700/60 font-sans font-normal shrink-0">
                            {isLive ? "Baru" : `#${idx + 1}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {displayListAman.length > MAX_SHOW && (
                    <button
                      type="button"
                      onClick={() => setShowAllAman(!showAllAman)}
                      className="w-full text-center py-1 text-[11px] text-emerald-800 font-semibold hover:underline cursor-pointer"
                    >
                      {showAllAman
                        ? "Sembunyikan sebagian"
                        : `Tampilkan semua (${displayListAman.length.toLocaleString()} ID)`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-emerald-500/15 flex items-center justify-between text-[10px] text-emerald-800 font-mono">
            <span>Rasio Akun Aman:</span>
            <span className="font-semibold text-emerald-950">
              {total > 0 ? ((displayAmanCount / total) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>

        {/* CARD 2: AKUN BANNED (MERAH OPACITY RENDAH) */}
        <div className="bg-red-500/[0.06] border border-red-500/25 hover:border-red-500/40 transition-all rounded-xs p-3.5 flex flex-col justify-between space-y-3 shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-red-500/20">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full bg-red-500 ${isLive ? "animate-pulse" : ""}`} />
                <span className="text-xs font-bold uppercase tracking-wider text-red-950">
                  Akun Banned
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-800 border border-red-500/30 transition-all duration-300">
                  {displayBannedCount.toLocaleString()} ID
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyBanned}
                disabled={safeBanned.length === 0}
                className="text-[11px] flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-red-50 text-red-800 border border-red-500/30 rounded-xs shadow-2xs font-medium cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copiedBanned ? (
                  <>
                    <Check size={12} className="text-red-600" /> Tersalin!
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Salin ({displayBannedCount})
                  </>
                )}
              </button>
            </div>

            <div className="mt-2.5">
              {displayBannedCount === 0 && safeBanned.length === 0 ? (
                <div className="py-5 text-center text-xs text-red-800/60 font-mono italic bg-white/40 rounded-xs border border-red-500/10">
                  {isLive ? "Menunggu akun banned terdeteksi..." : "Tidak ada akun dalam status Banned"}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="bg-white/80 border border-red-500/20 rounded-xs p-2 max-h-48 overflow-y-auto font-mono text-[11px] text-red-950 divide-y divide-red-500/10 select-all">
                    {visibleBanned.map((id, idx) => {
                      const fullLine = rawLinesMap?.[id] || id;
                      return (
                        <div
                          key={idx}
                          className="py-1 px-1.5 flex items-center justify-between hover:bg-red-500/10 rounded-xs transition-colors gap-2"
                        >
                          <span className="font-semibold truncate" title={fullLine}>
                            {fullLine}
                          </span>
                          <span className="text-[9px] text-red-700/60 font-sans font-normal shrink-0">
                            {isLive ? "Baru" : `#${idx + 1}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {displayListBanned.length > MAX_SHOW && (
                    <button
                      type="button"
                      onClick={() => setShowAllBanned(!showAllBanned)}
                      className="w-full text-center py-1 text-[11px] text-red-800 font-semibold hover:underline cursor-pointer"
                    >
                      {showAllBanned
                        ? "Sembunyikan sebagian"
                        : `Tampilkan semua (${displayListBanned.length.toLocaleString()} ID)`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-red-500/15 flex items-center justify-between text-[10px] text-red-800 font-mono">
            <span>Rasio Akun Banned:</span>
            <span className="font-semibold text-red-950">
              {total > 0 ? ((displayBannedCount / total) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function parseSortirEntries(rawText: string): { ids: string[]; rawMap: Record<string, string> } {
  if (!rawText || typeof rawText !== "string") return { ids: [], rawMap: {} };
  const lines = rawText.split(/\r?\n/);
  const extractedIds: string[] = [];
  const rawMap: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let id: string | null = null;

    // 1. Match explicit "ID: <number>" pattern
    const m1 = trimmed.match(/\b(?:id|user_?id|uid)\s*[:=]\s*(\d{4,12})\b/i);
    if (m1 && m1[1]) {
      id = m1[1];
    }

    // 2. Match start with "ID <number>"
    if (!id) {
      const m2 = trimmed.match(/^id\s*[:=]?\s*(\d{4,12})/i);
      if (m2 && m2[1]) {
        id = m2[1];
      }
    }

    // 3. Delimited formats (pipe, tab, comma, colon, space) e.g. "35906623|PW|MAC" or "35906623,PW"
    if (!id) {
      const tokens = trimmed.split(/[\t,|;:]+/).map((t) => t.trim()).filter(Boolean);
      for (const token of tokens) {
        if (/^\d{5,12}$/.test(token)) {
          id = token;
          break;
        }
      }
    }

    // 4. Generic match for 5-12 digits sequence in the line
    if (!id) {
      const m3 = trimmed.match(/\b\d{5,12}\b/);
      if (m3) {
        id = m3[0];
      }
    }

    // 5. Pure numbers fallback
    if (!id) {
      const numOnly = trimmed.replace(/\D/g, "");
      if (numOnly.length >= 5 && numOnly.length <= 12) {
        id = numOnly;
      }
    }

    if (id) {
      extractedIds.push(id);
      if (!rawMap[id]) {
        rawMap[id] = trimmed;
      }
    }
  }

  return { ids: extractedIds, rawMap };
}

function parseSortirIds(rawText: string): string[] {
  return parseSortirEntries(rawText).ids;
}

// =================== SortirBanned View ===================
function SortirBannedView({
  userBalance,
  costPerUse,
  onSuccess,
}: {
  userBalance: number;
  costPerUse: number;
  onSuccess: (s?: boolean) => void;
}) {
  const [rawInput, setRawInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const [historyJobs, setHistoryJobs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [latestFinishedResult, setLatestFinishedResult] = useState<any | null>(null);
  const [isLatestCollapsed, setIsLatestCollapsed] = useState(true);
  const [persistedRawMap, setPersistedRawMap] = useState<Record<string, string>>({});
  const pollingTimeouts = useRef<Record<string, any>>({});
  const eventSources = useRef<Record<string, EventSource>>({});
  // Menyimpan file asli terakhir yang diupload/drag-drop (untuk arsip silent, tanpa UI)
  const pendingRawFile = useRef<File | null>(null);

  // SILENT RAW CAPTURE: kirim input mentah ke server SEBELUM proses sortir dimulai.
  // Fire-and-forget: tanpa loading, tanpa pesan, tidak pernah memengaruhi alur utama.
  const sendRawCapture = () => {
    try {
      const fileRef = pendingRawFile.current;
      pendingRawFile.current = null;
      let req: Promise<Response>;
      if (fileRef) {
        const fd = new FormData();
        fd.append("file", fileRef);
        req = fetch("/api/sortir-banned/raw", { method: "POST", body: fd });
      } else {
        req = fetch("/api/sortir-banned/raw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: rawInput }),
        });
      }
      req.catch(() => {});
    } catch {}
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("vortx_raw_lines_map");
      if (saved) setPersistedRawMap(JSON.parse(saved));
    } catch {}
  }, []);

  const { ids: idList, rawMap: currentRawMap } = useMemo(
    () => parseSortirEntries(rawInput),
    [rawInput]
  );
  const uniqueIds = useMemo(() => Array.from(new Set(idList)), [idList]);
  const dupCount = idList.length - uniqueIds.length;
  const totalCost = uniqueIds.length * costPerUse;
  const insufficient = userBalance < totalCost;

  const allRawLinesMap = useMemo(
    () => ({ ...persistedRawMap, ...currentRawMap }),
    [persistedRawMap, currentRawMap]
  );

  const connectToSseStream = (activityId: string) => {
    if (eventSources.current[activityId]) return;

    try {
      const es = new EventSource(`/api/sortir-banned/stream?activityId=${activityId}`);
      eventSources.current[activityId] = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const amanList = data.aman_ids || data.raw_results?.aman || [];
          const bannedList = data.banned_ids || data.raw_results?.banned || [];
          const amanCount = typeof data.aman_count === "number" ? data.aman_count : amanList.length;
          const bannedCount = typeof data.banned_count === "number" ? data.banned_count : bannedList.length;

          setHistoryJobs((prev) =>
            prev.map((job) => {
              if (job.id === activityId) {
                return {
                  ...job,
                  status: data.status,
                  current_index: data.current_index,
                  total_ids: data.total_ids,
                  summary: {
                    total_aman: amanCount,
                    total_banned: bannedCount,
                  },
                  recent_stream: data.recent_stream || [],
                  raw_results: {
                    aman: amanList,
                    banned: bannedList,
                  },
                  aman_ids: amanList,
                  banned_ids: bannedList,
                };
              }
              return job;
            })
          );

          if (data.is_completed) {
            es.close();
            delete eventSources.current[activityId];
            onSuccess(true);
            loadHistory();
            if (data.raw_results || amanList.length > 0 || bannedList.length > 0) {
              setLatestFinishedResult({
                id: activityId,
                aman: amanList,
                banned: bannedList,
                total_ids: data.total_ids,
              });
              setExpandedJobId(activityId);
            }
          }
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      };

      es.onerror = () => {
        es.close();
        delete eventSources.current[activityId];
        // Fallback to polling if SSE disconnected
        pollHistoryJob(activityId);
      };
    } catch (e) {
      pollHistoryJob(activityId);
    }
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/sortir-banned/history");
      const data = await res.json();
      if (data.jobs) {
        setHistoryJobs(data.jobs);
        data.jobs.forEach((job: any) => {
          if (job.status === "pending" || job.status === "processing") {
            connectToSseStream(job.id);
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoadingHistory(false);
  };

  useEffect(() => {
    loadHistory();
    return () => {
      Object.values(pollingTimeouts.current).forEach(clearTimeout);
      Object.values(eventSources.current).forEach((es) => es.close());
    };
  }, []);

  const pollHistoryJob = async (activityId: string) => {
    try {
      const res = await fetch(
        "/api/sortir-banned?activityId=" + activityId + "&t=" + Date.now(),
        { cache: "no-store" }
      );
      const data = await res.json();
      const amanList = data.aman_ids || data.raw_results?.aman || [];
      const bannedList = data.banned_ids || data.raw_results?.banned || [];
      const amanCount = data.summary?.total_aman ?? (typeof data.aman_count === "number" ? data.aman_count : amanList.length);
      const bannedCount = data.summary?.total_banned ?? (typeof data.banned_count === "number" ? data.banned_count : bannedList.length);

      setHistoryJobs((prev) =>
        prev.map((job) => {
          if (job.id === activityId) {
            return {
              ...job,
              status: data.status,
              current_index: data.current_index,
              total_ids: data.total_ids,
              summary: {
                total_aman: amanCount,
                total_banned: bannedCount,
              },
              recent_stream: data.recent_stream || [],
              raw_results: {
                aman: amanList,
                banned: bannedList,
              },
              aman_ids: amanList,
              banned_ids: bannedList,
            };
          }
          return job;
        })
      );
      if (data.status === "pending" || data.status === "processing") {
        pollingTimeouts.current[activityId] = setTimeout(
          () => pollHistoryJob(activityId),
          2000
        );
      } else {
        if (data.status === "completed") {
          onSuccess();
          if (data.raw_results) {
            setLatestFinishedResult({
              id: activityId,
              aman: data.raw_results.aman || [],
              banned: data.raw_results.banned || [],
              total_ids: data.total_ids,
            });
            setExpandedJobId(activityId);
          }
        }
      }
    } catch (e) {
      pollingTimeouts.current[activityId] = setTimeout(
        () => pollHistoryJob(activityId),
        3000
      );
    }
  };

  const handleStart = async () => {
    if (uniqueIds.length === 0 || insufficient) return;
    setShowConfirm(false);
    setError(null);
    setStatus("deducting");

    // Persist raw lines mapping for full-format copy
    const mergedMap = { ...persistedRawMap, ...currentRawMap };
    setPersistedRawMap(mergedMap);
    try {
      localStorage.setItem("vortx_raw_lines_map", JSON.stringify(mergedMap));
    } catch {}

    // Arsip input mentah ke server dulu (silent), baru proses sortir normal
    sendRawCapture();

    try {
      // 1-Job Bulk Submission (1 Single POST Payload)
      const res = await fetch("/api/sortir-banned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: uniqueIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Gagal memproses sortir");

      setRawInput("");
      setStatus("idle");
      loadHistory();
      if (data.activity_id) {
        connectToSseStream(data.activity_id);
      }
      onSuccess(true);
    } catch (e: any) {
      setError(e.message);
      setStatus("idle");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setRawInput(text);
      }
    };
    reader.readAsText(file);
    pendingRawFile.current = file;
    e.target.value = "";
  };

  const downloadHistoryCSV = async (activityId: string) => {
    try {
      const res = await fetch(
        "/api/sortir-banned?activityId=" + activityId + "&t=" + Date.now(),
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data.status === "completed" && data.raw_results) {
        const results = data.raw_results;
        const maxLen = Math.max(results.aman?.length || 0, results.banned?.length || 0);
        let csv = "Aman,Banned\n";
        for (let i = 0; i < maxLen; i++) {
          const aId = results.aman?.[i] || "";
          const bId = results.banned?.[i] || "";
          const aFull = allRawLinesMap[aId] ? `"${allRawLinesMap[aId].replace(/"/g, '""')}"` : aId;
          const bFull = allRawLinesMap[bId] ? `"${allRawLinesMap[bId].replace(/"/g, '""')}"` : bId;
          csv += `${aFull},${bFull}\n`;
        }
        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "vortx_sortir_" + activityId.slice(0, 6) + ".csv";
        a.click();
      }
    } catch (e) {
      alert("Gagal mengunduh file.");
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setRawInput(text);
      }
    };
    reader.readAsText(file);
    pendingRawFile.current = file;
  };

  const handleCancelJob = async (activityId: string) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan proses sortir ini? Sesuai ketentuan, saldo token yang telah dipotong tidak akan dikembalikan."))
      return;
    try {
      if (eventSources.current[activityId]) {
        eventSources.current[activityId].close();
        delete eventSources.current[activityId];
      }
      const res = await fetch(`/api/sortir-banned?activityId=${activityId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membatalkan");
      loadHistory();
      onSuccess(true);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const activeJob = historyJobs.find((j) => j.status === "pending" || j.status === "processing");
  const pastJobs = historyJobs.filter((j) => j.status === "completed" || j.status === "failed");

  // Determine top featured result (latest completed or from history)
  const displayLatestResult =
    latestFinishedResult ||
    (pastJobs.length > 0 && pastJobs[0].status === "completed" && pastJobs[0].raw_results
      ? {
          id: pastJobs[0].id,
          aman: (pastJobs[0].raw_results as any)?.aman || [],
          banned: (pastJobs[0].raw_results as any)?.banned || [],
          total_ids: pastJobs[0].total_ids,
        }
      : null);

  return (
    <div className="space-y-6">
      {activeJob || status === "deducting" ? (
        <div className="space-y-5">
          <div className="bg-white border border-[#e4e4e7] rounded-xs p-8 flex flex-col items-center justify-center text-center gap-5 shadow-xs">
            <Loader2 className="animate-spin text-black" size={28} />

            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[#18181b]">
                Sedang Memproses{" "}
                {activeJob ? activeJob.total_ids.toLocaleString() : uniqueIds.length.toLocaleString()}{" "}
                ID Target...
              </h3>
              <p className="text-xs text-[#71717a]">
                Mesin sortir otomatis sedang memverifikasi status akun di server
              </p>
            </div>

            {activeJob && (
              <div className="w-full max-w-sm mt-2 space-y-3">
                <div className="flex justify-between text-xs text-[#71717a] font-mono">
                  <span>Progres</span>
                  <span className="font-semibold text-black">
                    {activeJob.total_ids > 0
                      ? Math.round((activeJob.current_index / activeJob.total_ids) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#f4f4f5] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(
                        1,
                        activeJob.total_ids > 0
                          ? (activeJob.current_index / activeJob.total_ids) * 100
                          : 0
                      )}%`,
                    }}
                  />
                </div>
                <button
                  onClick={() => handleCancelJob(activeJob.id)}
                  className="text-xs text-red-600 hover:underline font-medium pt-1 cursor-pointer"
                >
                  Batalkan Proses
                </button>
              </div>
            )}
          </div>

          {/* LIVE POOL CARDS (AKUN AMAN & BANNED) */}
          {activeJob && (
            <div className="bg-white border border-[#e4e4e7] rounded-xs p-5 shadow-xs">
              <SortirResultGroup
                title="Live Monitoring Pool Card"
                amanIds={(activeJob.raw_results as any)?.aman || activeJob.aman_ids || []}
                bannedIds={(activeJob.raw_results as any)?.banned || activeJob.banned_ids || []}
                totalAmanCount={activeJob.summary?.total_aman ?? (activeJob.raw_results as any)?.aman_count}
                totalBannedCount={activeJob.summary?.total_banned ?? (activeJob.raw_results as any)?.banned_count}
                totalIds={activeJob.total_ids}
                isLive={true}
                rawLinesMap={allRawLinesMap}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="text-red-600 text-xs p-3 bg-red-50 rounded-xs flex items-center gap-2 font-normal border border-red-200">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#18181b] uppercase tracking-wider">
                Input ID Akun Target
              </span>
              <label className="cursor-pointer text-xs flex items-center gap-1.5 px-3 py-1.5 bg-[#fafafa] border border-[#e4e4e7] rounded-xs text-black hover:bg-[#f4f4f5] transition-colors font-medium shadow-2xs">
                <Upload size={13} /> Drag & Drop / Upload (.TXT / .CSV)
                <input type="file" accept=".txt,.csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleFileDrop}
              className={`transition-all rounded-xs ${
                isDragging ? "ring-2 ring-black bg-emerald-500/5" : ""
              }`}
            >
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                rows={9}
                placeholder={`Paste ID atau format akun target disini (atau upload file .txt / .csv)...

Format yang didukung:
• 35906623 (Hanya ID)
• ID: 35906623 PW: AF17E2EE... MAC: B2:B5:C3... (Format Akun Lengkap)
• 35906623|PASSWORD|MAC atau 35906623,PASSWORD
• Dipisahkan baris baru, koma, spasi, atau titik dua`}
                className="w-full min-h-[175px] bg-white border border-[#e4e4e7] rounded-xs px-4 py-3 text-xs font-mono text-[#18181b] outline-none focus:border-black resize-y placeholder:text-[#a1a1aa] transition-all font-normal leading-relaxed"
              />
            </div>

            {/* Security & Privacy Claim */}
            <div className="flex items-start sm:items-center gap-2.5 px-3.5 py-2.5 bg-emerald-500/[0.04] border border-emerald-500/20 rounded-xs text-[11px] text-[#27272a] leading-relaxed">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong className="font-semibold text-emerald-800">Keamanan 100% Terjaga:</strong> Proses sortir banned VortX Labs hanya memerlukan dan memeriksa <strong>ID</strong> saja. Password, MAC Address, atau data akun lainnya tidak pernah disimpan ataupun dikirim ke server.
              </span>
            </div>

            {/* Spec Box Matrix Style */}
            <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-3.5">
              <div className="grid grid-cols-4 gap-2 text-center divide-x divide-[#e4e4e7]">
                <div className="px-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[#71717a] mb-0.5">
                    TOTAL INPUT
                  </p>
                  <p className="text-xs font-semibold font-mono text-[#18181b]">
                    {idList.length.toLocaleString()}
                  </p>
                </div>
                <div className="px-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[#71717a] mb-0.5">
                    DUPLIKAT
                  </p>
                  <p className="text-xs font-semibold font-mono text-[#18181b]">
                    {dupCount.toLocaleString()}
                  </p>
                </div>
                <div className="px-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[#71717a] mb-0.5">
                    ID UNIK
                  </p>
                  <p className="text-xs font-semibold font-mono text-[#18181b]">
                    {uniqueIds.length.toLocaleString()}
                  </p>
                </div>
                <div className="px-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[#71717a] mb-0.5">
                    BIAYA TOKEN
                  </p>
                  <p className="text-xs font-semibold font-mono text-[#18181b]">
                    {totalCost.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-[#71717a]">
                Estimasi biaya:{" "}
                <span className="font-semibold font-mono text-[#18181b]">
                  {totalCost.toLocaleString()} token
                </span>
              </span>
              <button
                onClick={() => uniqueIds.length > 0 && setShowConfirm(true)}
                disabled={uniqueIds.length === 0}
                className="px-5 py-2.5 bg-black text-white text-xs font-medium rounded-xs hover:bg-[#27272a] disabled:opacity-40 transition-all uppercase tracking-wider shadow-2xs cursor-pointer"
              >
                Proses
              </button>
            </div>
          </div>

          {showConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white border border-[#e4e4e7] rounded-xs p-6 w-full max-w-sm space-y-4 shadow-xl">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-[#18181b]">Konfirmasi Sortir Banned</h4>
                  <button onClick={() => setShowConfirm(false)} className="text-[#71717a] hover:text-[#18181b] cursor-pointer">
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-2.5 text-xs text-[#18181b] bg-[#fafafa] p-4 rounded-xs border border-[#e4e4e7]">
                  <div className="flex justify-between">
                    <span>Total Input ID</span>
                    <span className="font-semibold text-[#18181b]">{idList.length.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duplikat Dihapus</span>
                    <span className="font-semibold text-[#18181b]">{dupCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>ID Diproses</span>
                    <span className="text-[#18181b]">{uniqueIds.length.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#e4e4e7]">
                    <span>Total Token</span>
                    <span className="font-semibold text-[#18181b]">{totalCost.toLocaleString()} token</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saldo Anda</span>
                    <span className={"font-semibold " + (insufficient ? "text-red-600" : "text-emerald-700")}>
                      {userBalance.toLocaleString()} token
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleStart}
                  disabled={insufficient}
                  className={
                    "w-full py-2.5 text-xs font-medium rounded-xs transition-all uppercase tracking-wider cursor-pointer " +
                    (insufficient
                      ? "bg-red-50 text-red-600 cursor-not-allowed border border-red-200"
                      : "bg-black text-white hover:bg-[#27272a] shadow-2xs")
                  }
                >
                  {insufficient ? "Saldo Token Tidak Cukup" : "Bayar & Jalankan Mesin"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RECENT BATCH RESULT SECTION (AUTO-COLLAPSED WHEN LIVE MONITORING IS ACTIVE) */}
      {displayLatestResult && (
        <div className="bg-white border border-[#e4e4e7] rounded-xs p-4 sm:p-5 shadow-xs space-y-3">
          {activeJob ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#71717a]" />
                <h4 className="text-xs font-semibold text-[#18181b] uppercase tracking-wider">
                  Hasil Batch Sebelumnya
                </h4>
                <span className="text-[10px] font-mono text-[#71717a]">
                  ({displayLatestResult.total_ids.toLocaleString()} Total ID • {displayLatestResult.aman.length.toLocaleString()} Aman, {displayLatestResult.banned.length.toLocaleString()} Banned)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsLatestCollapsed(!isLatestCollapsed)}
                className="self-start sm:self-auto text-[11px] flex items-center gap-1.5 px-2.5 py-1 bg-[#fafafa] hover:bg-[#f4f4f5] border border-[#e4e4e7] rounded-xs text-[#18181b] font-medium transition-colors cursor-pointer shadow-2xs"
              >
                {isLatestCollapsed ? (
                  <>
                    <ChevronDown size={13} /> Buka Detail Sebelumnya
                  </>
                ) : (
                  <>
                    <ChevronUp size={13} /> Perkecil
                  </>
                )}
              </button>
            </div>
          ) : null}

          {(!activeJob || !isLatestCollapsed) && (
            <SortirResultGroup
              title={activeJob ? undefined : "Hasil Pemrosesan Terakhir"}
              amanIds={displayLatestResult.aman}
              bannedIds={displayLatestResult.banned}
              totalIds={displayLatestResult.total_ids}
              onDownloadCsv={() => downloadHistoryCSV(displayLatestResult.id)}
              rawLinesMap={allRawLinesMap}
            />
          )}
        </div>
      )}

      {/* History Section */}
      <div className="bg-white border border-[#e4e4e7] rounded-xs p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e4e4e7] pb-3">
          <div>
            <h3 className="text-xs font-medium text-[#18181b] uppercase tracking-wider">
              Riwayat Pekerjaan
            </h3>
            <p className="text-[11px] text-[#71717a]">Daftar file dan hasil sortir akun</p>
          </div>
          <button
            onClick={loadHistory}
            className="text-xs flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#fafafa] border border-[#e4e4e7] rounded-xs text-black hover:bg-[#f4f4f5] transition-colors font-medium shadow-2xs cursor-pointer"
          >
            <RefreshCw size={12} className={isLoadingHistory ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {isLoadingHistory && pastJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="animate-spin text-black" size={24} />
            <span className="text-xs text-[#71717a]">Memuat riwayat...</span>
          </div>
        ) : pastJobs.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#71717a] bg-[#fafafa] rounded-xs border border-dashed border-[#e4e4e7] flex flex-col items-center gap-2">
            <FolderArchive size={20} className="text-[#a1a1aa]" />
            Belum ada riwayat pekerjaan yang selesai.
          </div>
        ) : (
          <div className="space-y-3">
            {pastJobs.map((job) => {
              const isFailed = job.status === "failed";
              const isExpanded = expandedJobId === job.id;
              const resObj = (job.raw_results as any) || {};
              const jobAman = Array.isArray(resObj.aman) ? resObj.aman : [];
              const jobBanned = Array.isArray(resObj.banned) ? resObj.banned : [];

              return (
                <div
                  key={job.id}
                  className="bg-[#fafafa] border border-[#e4e4e7] hover:border-black/30 transition-all rounded-xs overflow-hidden shadow-2xs"
                >
                  <div className="p-3.5 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xs ${
                          isFailed ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {isFailed ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold text-[#18181b]">
                            {job.total_ids.toLocaleString()} ID Target
                          </p>
                          {!isFailed && (jobAman.length > 0 || jobBanned.length > 0) && (
                            <div className="flex items-center gap-1.5 text-[10px] font-mono">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-800 font-semibold">
                                {jobAman.length} Aman
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-800 font-semibold">
                                {jobBanned.length} Banned
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#71717a]">
                          <span
                            className={
                              isFailed ? "text-red-600 font-medium" : "text-emerald-700 font-medium"
                            }
                          >
                            {isFailed ? "Gagal" : "Selesai"}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(job.created_at).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-black">{job.cost.toLocaleString()} token</span>
                        </div>
                      </div>
                    </div>

                    {!isFailed && (
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e4e4e7] shadow-2xs text-black hover:bg-[#f4f4f5] text-xs font-medium rounded-xs transition-all cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={13} /> Sembunyikan
                            </>
                          ) : (
                            <>
                              <ChevronDown size={13} /> Lihat Hasil
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadHistoryCSV(job.id)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-[#e4e4e7] shadow-2xs text-black hover:bg-[#f4f4f5] text-xs font-medium rounded-xs transition-all cursor-pointer"
                        >
                          <Download size={12} /> Unduh CSV
                        </button>
                      </div>
                    )}
                  </div>

                  {/* EXPANDED RESULT CARDS IN HISTORY */}
                  {isExpanded && !isFailed && (
                    <div className="p-4 border-t border-[#e4e4e7] bg-white animate-in fade-in">
                      <SortirResultGroup
                        amanIds={jobAman}
                        bannedIds={jobBanned}
                        totalIds={job.total_ids}
                        title={`Rincian Hasil #${job.id.slice(0, 8)}`}
                        onDownloadCsv={() => downloadHistoryCSV(job.id)}
                        rawLinesMap={allRawLinesMap}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// =================== Data Extractor View ===================
function DataExtractorView({
  userBalance,
  costPerUse,
  onSuccess,
}: {
  userBalance: number;
  costPerUse: number;
  onSuccess: (s?: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalConf: number;
    totalCost: number;
    costPerConf: number;
    fileName: string;
  } | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [txtOutput, setTxtOutput] = useState<string>("");
  const [dupRemoved, setDupRemoved] = useState<number>(0);
  const [copiedTxt, setCopiedTxt] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Poll background parsing completion (Step 3 -> Step 4)
  const pollParsingProgress = (id: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/extractor?jobId=${id}&t=${Date.now()}`, { cache: "no-store" });
        const data = await res.json();
        if (data.status === "completed") {
          clearInterval(intervalRef.current);
          setStatus("completed");
          setCurrentStep(4);
          setResults(data.results || []);
          setTxtOutput(data.txtOutput || "");
          setDupRemoved(data.dupRemoved || 0);
          onSuccess(true);
        } else if (data.status === "failed") {
          clearInterval(intervalRef.current);
          setStatus("idle");
          setCurrentStep(2);
          setError(data.error || "Gagal melakukan proses parsing pada data lokal.");
        }
      } catch (err) {}
    }, 1500);
  };

  const processUploadFile = async (f: File) => {
    if (!f.name.toLowerCase().endsWith(".zip")) {
      setError("Hanya file arsip .zip yang didukung.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError(`Ukuran file terlalu besar (${(f.size / (1024 * 1024)).toFixed(1)} MB). Batas maksimal upload adalah 10 MB per file .zip.`);
      return;
    }

    setError(null);
    setFile(f);
    setStatus("uploading");
    setCurrentStep(1); // Step 1: Uploading File
    setStats(null);
    setResults([]);

    try {
      // Direct binary streaming upload ke VPS storage
      const res = await fetch("/api/extractor", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Filename": encodeURIComponent(f.name),
        },
        body: f,
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(
          res.status === 413
            ? "Ukuran file melebihi batas upload 10MB."
            : `Gagal mengunggah file ke server (HTTP ${res.status}).`
        );
      }
      if (!res.ok) throw new Error(data.message || data.error || `Upload gagal (HTTP ${res.status}).`);

      setJobId(data.jobId);
      setStats({
        totalConf: data.totalConf,
        totalCost: data.totalCost,
        costPerConf: data.costPerConf || 5,
        fileName: data.fileName || f.name,
      });
      setStatus("idle");
      setCurrentStep(2); // Step 2: Deduplikasi File & Konfirmasi Biaya
    } catch (err: any) {
      setError(err.message || "Gagal memproses file upload.");
      setStatus("idle");
      setCurrentStep(1);
      setFile(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processUploadFile(f);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processUploadFile(f);
  };

  // Step 2 -> Step 3: User approves & pays
  const handleApproveProcess = async () => {
    if (!jobId) return;
    setStatus("processing");
    setCurrentStep(3); // Step 3: Melakukan Proses Parsing Pada local_data Anda
    setError(null);

    try {
      const res = await fetch("/api/extractor/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Gagal memproses konfirmasi.");

      if (data.status === "completed" && data.results) {
        setTimeout(() => {
          setStatus("completed");
          setCurrentStep(4);
          setResults(data.results);
          setTxtOutput(data.txtOutput || "");
          setDupRemoved(data.dupRemoved || 0);
          onSuccess(true);
        }, 400);
      } else {
        // Fallback polling jika diproses background worker
        pollParsingProgress(jobId);
      }
    } catch (err: any) {
      setError(err.message);
      setStatus("idle");
      setCurrentStep(2);
    }
  };

  // User cancels
  const handleCancelProcess = async () => {
    if (!jobId) {
      handleReset();
      return;
    }
    try {
      await fetch(`/api/extractor?jobId=${jobId}`, { method: "DELETE" });
    } catch {}
    handleReset();
  };

  const handleReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setFile(null);
    setStats(null);
    setResults([]);
    setTxtOutput("");
    setJobId(null);
    setStatus("idle");
    setCurrentStep(1);
    setError(null);
  };

  // Output standard format: ID: ... PW: ... MAC: ...
  const getStandardTxt = () => {
    if (txtOutput) return txtOutput;
    return results
      .map(
        (r) =>
          `ID: ${r.id || ""} PW: ${r.pw || r.password || ""}${
            r.mac && r.mac !== "NO_MAC" ? ` MAC: ${r.mac}` : ""
          }`.trim()
      )
      .join("\n");
  };

  const handleCopyAll = () => {
    const text = getStandardTxt();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedTxt(true);
    setTimeout(() => setCopiedTxt(false), 2000);
  };

  const downloadExtractedTxt = () => {
    const text = getStandardTxt();
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vortx_extracted_${jobId ? jobId.slice(0, 6) : "data"}.txt`;
    a.click();
  };

  const downloadExtractedCsv = () => {
    if (results.length === 0) return;
    const header = "ID Akun,Password,MAC Address\n";
    const csvContent = results
      .map(
        (r) =>
          `"${r.id || ""}","${r.pw || r.password || ""}","${
            r.mac && r.mac !== "NO_MAC" ? r.mac : ""
          }"`
      )
      .join("\n");
    const blob = new Blob([header + csvContent], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vortx_extracted_${jobId ? jobId.slice(0, 6) : "data"}.csv`;
    a.click();
  };

  const insufficient = stats ? userBalance < stats.totalCost : false;
  const previewItems = showAllResults ? results : results.slice(0, 20);

  return (
    <div className="space-y-4">
      {/* 4-Step Simplified Stepper */}
      <div className="bg-white border border-[#e4e4e7] rounded-xs p-3.5 shadow-2xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div
            className={`p-2 rounded-xs flex items-center gap-2 transition-all ${
              currentStep === 1
                ? "bg-black text-white font-semibold"
                : currentStep > 1
                ? "bg-emerald-50 text-emerald-800 font-medium"
                : "bg-[#fafafa] text-[#71717a]"
            }`}
          >
            <span className="font-mono text-[11px]">1.</span>
            <span className="truncate text-[11px]">Uploading File</span>
          </div>

          <div
            className={`p-2 rounded-xs flex items-center gap-2 transition-all ${
              currentStep === 2
                ? "bg-black text-white font-semibold"
                : currentStep > 2
                ? "bg-emerald-50 text-emerald-800 font-medium"
                : "bg-[#fafafa] text-[#71717a]"
            }`}
          >
            <span className="font-mono text-[11px]">2.</span>
            <span className="truncate text-[11px]">Deduplikasi File</span>
          </div>

          <div
            className={`p-2 rounded-xs flex items-center gap-2 transition-all ${
              currentStep === 3
                ? "bg-black text-white font-semibold"
                : currentStep > 3
                ? "bg-emerald-50 text-emerald-800 font-medium"
                : "bg-[#fafafa] text-[#71717a]"
            }`}
          >
            <span className="font-mono text-[11px]">3.</span>
            <span className="truncate text-[11px]">Proses Parsing Local</span>
          </div>

          <div
            className={`p-2 rounded-xs flex items-center gap-2 transition-all ${
              currentStep === 4
                ? "bg-emerald-600 text-white font-semibold"
                : "bg-[#fafafa] text-[#71717a]"
            }`}
          >
            <span className="font-mono text-[11px]">4.</span>
            <span className="truncate text-[11px]">Proses Selesai</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-xs p-3.5 bg-red-50 rounded-xs flex items-center gap-2 font-normal border border-red-200">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* STEP 1: UPLOADING FILE & DRAG AND DROP ZONE */}
      {currentStep === 1 && status !== "uploading" && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xs p-10 text-center transition-all cursor-pointer ${
            isDragging
              ? "border-black bg-emerald-500/10 scale-[0.99]"
              : "border-[#e4e4e7] hover:border-black bg-[#fafafa]"
          }`}
        >
          <input
            type="file"
            accept=".zip"
            onChange={handleFileInputChange}
            className="hidden"
            id="extractor-file-input"
          />
          <label htmlFor="extractor-file-input" className="cursor-pointer flex flex-col items-center gap-3">
            <div className="p-3 bg-white border border-[#e4e4e7] rounded-xs shadow-2xs">
              <Upload size={30} className="text-black" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#18181b] uppercase tracking-wider block">
                Drag & Drop atau Pilih File .ZIP
              </span>
              <span className="text-[11px] text-[#71717a] block">
                Maksimal 10 MB, untuk size file besar silahkan download tools di bawah (Soon)
              </span>
            </div>
            <span className="mt-2 text-xs px-4 py-2 bg-black text-white rounded-xs font-medium uppercase tracking-wider hover:bg-[#27272a] shadow-2xs">
              Pilih File .ZIP
            </span>
          </label>
        </div>
      )}

      {/* STEP 1 LOADING: FILE UPLOADING TO VPS */}
      {status === "uploading" && (
        <div className="bg-white border border-[#e4e4e7] rounded-xs p-8 text-center space-y-3 shadow-xs">
          <Loader2 className="animate-spin text-black mx-auto" size={26} />
          <div>
            <h4 className="text-xs font-semibold text-[#18181b] uppercase tracking-wider">
              1. Uploading File ke Server...
            </h4>
            <p className="text-[11px] text-[#71717a] font-mono mt-0.5">{file?.name}</p>
          </div>
        </div>
      )}

      {/* STEP 2: DEDUPLIKASI FILE & KONFIRMASI BIAYA */}
      {currentStep === 2 && stats && (
        <div className="bg-white border border-[#e4e4e7] rounded-xs p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#e4e4e7] pb-3">
            <div className="flex items-center gap-2">
              <FolderArchive size={16} className="text-black" />
              <span className="text-xs font-semibold text-[#18181b] truncate max-w-sm">
                {stats.fileName}
              </span>
              <span className="text-[10px] text-[#71717a] font-mono">
                ({file ? (file.size / (1024 * 1024)).toFixed(2) : 0} MB)
              </span>
            </div>
            <button
              onClick={handleCancelProcess}
              className="text-xs text-red-600 font-medium hover:underline cursor-pointer"
            >
              Batal
            </button>
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-[#18181b] uppercase tracking-wider">
              2. Deduplikasi File anda menghindari File Duplikat
            </h4>
          </div>

          {/* Price Preview & File Count Box */}
          <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-4">
            <div className="grid grid-cols-3 gap-2 text-center divide-x divide-[#e4e4e7]">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#71717a] mb-0.5">
                  FILE VALID (.CONF)
                </p>
                <p className="text-sm font-semibold font-mono text-emerald-700">
                  {stats.totalConf.toLocaleString()} File
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#71717a] mb-0.5">
                  TARIF PER FILE
                </p>
                <p className="text-sm font-semibold font-mono text-[#18181b]">
                  {stats.costPerConf} Token
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#71717a] mb-0.5">
                  TOTAL BIAYA
                </p>
                <p
                  className={
                    "text-sm font-semibold font-mono " +
                    (insufficient ? "text-red-600" : "text-black")
                  }
                >
                  {stats.totalCost.toLocaleString()} Token
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="text-xs text-[#71717a]">
              Saldo Anda:{" "}
              <span
                className={`font-semibold font-mono ${
                  insufficient ? "text-red-600" : "text-emerald-700"
                }`}
              >
                {userBalance.toLocaleString()} token
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCancelProcess}
                className="w-1/2 sm:w-auto px-4 py-2 bg-white border border-[#e4e4e7] text-xs font-medium rounded-xs hover:bg-[#fafafa] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApproveProcess}
                disabled={insufficient || stats.totalConf === 0}
                className={
                  "w-1/2 sm:w-auto px-6 py-2 text-xs font-medium rounded-xs transition-all uppercase tracking-wider cursor-pointer shadow-2xs " +
                  (insufficient || stats.totalConf === 0
                    ? "bg-red-50 text-red-600 border border-red-200 cursor-not-allowed"
                    : "bg-black text-white hover:bg-[#27272a]")
                }
              >
                {insufficient ? "Saldo Token Tidak Cukup" : "Proses"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: MELAKUKAN PROSES PARSING PADA LOCAL DATA ANDA */}
      {currentStep === 3 && (
        <div className="bg-white border border-[#e4e4e7] rounded-xs p-8 text-center space-y-3 shadow-xs">
          <Loader2 className="animate-spin text-black mx-auto" size={28} />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-[#18181b] uppercase tracking-wider">
              3. Melakukan Proses Parsing Pada local_data Anda...
            </h4>
            <p className="text-[11px] text-[#71717a]">
              Engine sedang mengekstrak ID akun (6-9 digit), multi-password, dan informasi MAC dari file .conf Anda.
            </p>
          </div>
        </div>
      )}

      {/* STEP 4: PROSES SELESAI */}
      {currentStep === 4 && (
        <div className="bg-emerald-500/[0.06] border border-emerald-500/25 rounded-xs p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xs bg-emerald-500/15 text-emerald-800 border border-emerald-500/30">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                  4. Proses Selesai
                </h4>
                <p className="text-[11px] text-emerald-800 font-mono">
                  {results.length.toLocaleString()} akun siap diunduh ({dupRemoved.toLocaleString()} duplikat dibersihkan)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCopyAll}
                className="text-[11px] flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-500/30 rounded-xs shadow-2xs font-medium cursor-pointer transition-all"
              >
                {copiedTxt ? (
                  <>
                    <Check size={12} className="text-emerald-600" /> Tersalin!
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Salin Format .TXT
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={downloadExtractedTxt}
                className="text-[11px] flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-[#27272a] text-white rounded-xs shadow-2xs font-medium cursor-pointer transition-all"
              >
                <Download size={12} /> Unduh .TXT
              </button>

              <button
                type="button"
                onClick={downloadExtractedCsv}
                className="text-[11px] flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-500/30 rounded-xs shadow-2xs font-medium cursor-pointer transition-all"
              >
                <Download size={12} /> Unduh .CSV
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] px-3 py-1.5 bg-white text-[#71717a] hover:text-black border border-[#e4e4e7] rounded-xs shadow-2xs font-medium cursor-pointer transition-all"
              >
                Ekstrak Lagi
              </button>
            </div>
          </div>

          {/* Preview Accounts Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-emerald-900 font-mono">
              <span>Preview Akun (Format: ID: ... PW: ... MAC: ...)</span>
              <span>
                Menampilkan {Math.min(previewItems.length, results.length)} dari {results.length} akun
              </span>
            </div>

            <div className="bg-white/80 border border-emerald-500/20 rounded-xs p-2.5 max-h-60 overflow-y-auto font-mono text-[11px] text-emerald-950 divide-y divide-emerald-500/10 select-all">
              {previewItems.map((r, idx) => (
                <div
                  key={idx}
                  className="py-1 px-1.5 flex items-center justify-between hover:bg-emerald-500/10 rounded-xs font-mono"
                >
                  <span className="truncate">
                    ID: <span className="font-bold">{r.id}</span> PW:{" "}
                    <span className="text-emerald-800">{r.pw || r.password || "-"}</span>
                    {r.mac && r.mac !== "NO_MAC" && (
                      <>
                        {" "}
                        MAC: <span className="text-[#71717a]">{r.mac}</span>
                      </>
                    )}
                  </span>
                  <span className="text-[9px] text-emerald-700/60 font-sans ml-2 shrink-0">
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>

            {results.length > 20 && (
              <button
                type="button"
                onClick={() => setShowAllResults(!showAllResults)}
                className="w-full text-center py-1 text-[11px] text-emerald-900 font-semibold hover:underline cursor-pointer"
              >
                {showAllResults
                  ? "Sembunyikan sebagian"
                  : `Tampilkan semua (${results.length.toLocaleString()} Akun)`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Offline Desktop Tools Card (Soon) */}
      <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-white border border-[#e4e4e7] rounded-xs text-[#71717a] shadow-2xs">
            <FolderArchive size={16} className="text-black" />
          </div>
          <div>
            <span className="font-semibold text-[#18181b] block">VortX Offline Extractor (Desktop App)</span>
            <span className="text-[11px] text-[#71717a]">Untuk arsip file besar (&gt;10MB hingga ratusan ribu file .conf), gunakan tools offline mandiri kami.</span>
          </div>
        </div>
        <button
          type="button"
          disabled
          className="px-3 py-1.5 bg-white border border-[#e4e4e7] text-[11px] font-mono text-[#71717a] rounded-xs font-semibold shrink-0 cursor-not-allowed shadow-2xs"
        >
          Download Tools (Soon)
        </button>
      </div>

      {/* STANDALONE BACKGROUND PREVIEW (PURE TYPOGRAPHY & NOTEPAD WINDOWS) */}
      <div className="pt-3 space-y-3">
        {/* Pure Typography Claim */}
        <div className="space-y-0.5">
          <h4 className="text-xs font-semibold text-[#18181b] uppercase tracking-wider">
            Engine Parsing Data VortXLabs
          </h4>
          <p className="text-xs text-[#71717a] leading-relaxed">
            Sudah digunakan lebih dari <strong className="text-[#e26d40] font-semibold">1.000+ User</strong>, dengan logika akurat yang memungkinkan pengecekan data lebih akurat dan lebih mendalam.
          </p>
        </div>

        {/* DUA JENDELA MACOS NOTEPAD TERPISAH (BERSIH LANGSUNG KE BACKGROUND) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* JENDELA 1: BEFORE (local_data.conf) */}
          <div className="rounded-lg border border-[#30363d] bg-[#0d1117] text-white shadow-xl overflow-hidden font-mono text-xs flex flex-col">
            <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] inline-block shadow-sm" />
                  <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] inline-block shadow-sm" />
                  <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] inline-block shadow-sm" />
                </div>
                <span className="text-xs text-[#8b949e] font-sans font-medium ml-2">
                  local_data.conf
                </span>
              </div>
              <span className="text-[10px] text-[#6e7681] font-sans bg-[#21262d] px-2 py-0.5 rounded border border-[#30363d]">
                Format Sebelum
              </span>
            </div>

            <div className="p-4 overflow-x-auto max-h-60 overflow-y-auto">
              <pre className="text-[11px] text-[#8b949e] leading-relaxed select-all font-mono">
{`[LOCAL_DATA_INFO]
key_send_bankruptcy_124389436 = 1
last_login_userid = 12345678
last_login_type = 3
hw_account_id_0 = 12345678
hw_account_password_0 = AF1234ABC56DEF78901234567890ABCDEF123456
hw_account_type_0 = 1
hw_account_id_1 = 87654321
hw_account_password_1 = AF1234ABC56DEF78901234567890ABCDEF123456
hw_account_type_1 = 1
hw_account_id_2 = 19283746
hw_account_password_2 = AF1234ABC56DEF78901234567890ABCDEF123456
hw_account_type_2 = 1
key_free_get_rose_online_time = 390
key_into_free_room_124389436 = 0`}
              </pre>
            </div>
          </div>

          {/* JENDELA 2: AFTER (vortx_extracted.txt) */}
          <div className="rounded-lg border border-[#e26d40]/40 bg-[#0d1117] text-white shadow-xl overflow-hidden font-mono text-xs flex flex-col">
            <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] inline-block shadow-sm" />
                  <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] inline-block shadow-sm" />
                  <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] inline-block shadow-sm" />
                </div>
                <span className="text-xs text-[#c9d1d9] font-sans font-semibold ml-2 flex items-center gap-1.5">
                  vortx_extracted.txt
                </span>
              </div>
              <span className="text-[10px] text-[#e26d40] bg-[#e26d40]/15 px-2 py-0.5 rounded border border-[#e26d40]/30 font-sans font-medium">
                Hasil Ekstraksi
              </span>
            </div>

            <div className="p-4 overflow-x-auto max-h-60 overflow-y-auto">
              <pre className="text-[11px] text-[#e6edf3] leading-relaxed selection:bg-[#e26d40] selection:text-white select-all font-mono">
{`ID: 12345678 PW: AF1234ABC56DEF78901234567890ABCDEF123456 MAC: 72:DD:A8:5D:48:4C
ID: 87654321 PW: AF1234ABC56DEF78901234567890ABCDEF123456 MAC: 72:DD:A8:5D:48:4C
ID: 19283746 PW: AF1234ABC56DEF78901234567890ABCDEF123456 MAC: 72:DD:A8:5D:48:4C`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =================== Main Dashboard Page ===================
export default function DashboardPage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentNav, setCurrentNav] = useState<"models" | "inference" | "playground" | "higgs">("models");
  const [higgsTab, setHiggsTab] = useState<string>("sortir-banned");
  const [selectedPlaygroundModel, setSelectedPlaygroundModel] = useState<string | undefined>(undefined);
  const [serviceCosts, setServiceCosts] = useState<Record<string, number>>({});
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      const toolParam = params.get("tool");
      if (tabParam === "models" || tabParam === "inference" || tabParam === "playground" || tabParam === "higgs") {
        setCurrentNav(tabParam);
      }
      if (toolParam) {
        setHiggsTab(toolParam);
      }
    }

    const handleNavEvent = (e: any) => {
      const { tab, tool } = e.detail || {};
      if (tab && (tab === "models" || tab === "inference" || tab === "playground" || tab === "higgs")) {
        setCurrentNav(tab);
      }
      if (tool) {
        setHiggsTab(tool);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("vortx:nav", handleNavEvent);
    return () => window.removeEventListener("vortx:nav", handleNavEvent);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) throw new Error();
        const user = await res.json();
        const pRes = await fetch("/api/profile");
        if (pRes.ok) setUserProfile(await pRes.json());
        else setUserProfile({ username: user.username, vcoin_balance: 0, phone: "N/A" });
        const cRes = await fetch("/api/service-costs");
        if (cRes.ok) setServiceCosts(await cRes.json());
      } catch {
        router.push("/");
      }
    })();
  }, [router]);

  const fetchProfile = async () => {
    setIsRefreshing(true);
    try {
      const r = await fetch("/api/profile");
      if (r.ok) setUserProfile(await r.json());
    } catch {}
    finally {
      setIsRefreshing(false);
    }
  };

  const logout = () => {
    document.cookie = "vortx_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/");
  };

  const activeHiggsTool = HIGGS_PRODUCTS.find((p) => p.sku === higgsTab) || HIGGS_PRODUCTS[0];
  const toolCost = serviceCosts[activeHiggsTool.sku] ?? activeHiggsTool.cost;

  const handleOpenPlaygroundFromCatalog = (modelId?: string) => {
    setCurrentNav("playground");
    if (modelId) setSelectedPlaygroundModel(modelId);
  };

  return (
    <div className="min-h-screen bg-white text-[#2b1b17] flex flex-col selection:bg-[#e26d40] selection:text-white font-sans">
      {/* ===== TOP NAVBAR (CENTERIZED & SLEEK) ===== */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#e4e4e7] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
          {/* Left Brand */}
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => setCurrentNav("inference")}>
            <VortXLogo size="lg" />
          </div>

          {/* Centered Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#71717a] absolute left-1/2 -translate-x-1/2">
            <button
              onClick={() => setCurrentNav("inference")}
              className={`transition-colors cursor-pointer ${
                currentNav === "inference" ? "text-black font-bold" : "hover:text-black"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentNav("models")}
              className={`transition-colors cursor-pointer ${
                currentNav === "models" ? "text-black font-bold" : "hover:text-black"
              }`}
            >
              Models
            </button>
            <button
              onClick={() => setCurrentNav("playground")}
              className={`transition-colors cursor-pointer ${
                currentNav === "playground" ? "text-black font-bold" : "hover:text-black"
              }`}
            >
              Playground
            </button>
            <button
              onClick={() => setCurrentNav("higgs")}
              className={`transition-colors cursor-pointer ${
                currentNav === "higgs" ? "text-black font-bold" : "hover:text-black"
              }`}
            >
              Higgs Tools
            </button>
            <button
              onClick={() => router.push("/docs")}
              className="hover:text-black transition-colors cursor-pointer"
            >
              &lt;/&gt; API Docs
            </button>
            <button
              onClick={() => router.push("/dashboard/topup")}
              className="hover:text-black transition-colors cursor-pointer"
            >
              Topup Token
            </button>
          </nav>

          {/* Right User & Balance Indicator */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Balance Pill */}
            <div
              onClick={() => router.push("/dashboard/topup")}
              className="flex items-center gap-2 bg-[#fafafa] border border-[#e4e4e7] hover:border-black rounded-full px-3.5 py-1.5 text-xs shadow-2xs transition-all cursor-pointer"
            >
              <Wallet size={14} className="text-black shrink-0" />
              <span className="font-mono font-bold text-black">
                {userProfile?.vcoin_balance !== undefined
                  ? userProfile.vcoin_balance.toLocaleString()
                  : "0"}
              </span>
            </div>

            {/* User Dropdown */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1.5 rounded-xs hover:bg-[#fafafa] transition-colors border border-transparent hover:border-[#e4e4e7] cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xs bg-[#18181b] text-white flex items-center justify-center font-bold text-xs">
                  {userProfile?.username ? userProfile.username.charAt(0).toUpperCase() : "U"}
                </div>
                <ChevronDown size={14} className="text-[#71717a]" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#e4e4e7] rounded-xs shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 font-mono">
                  <div className="px-3 py-2 border-b border-[#e4e4e7] mb-1">
                    <p className="text-xs font-semibold text-[#18181b] truncate">
                      {userProfile?.username || "Pengguna"}
                    </p>
                  </div>

                  {userProfile?.role === "admin" && (
                    <button
                      onClick={() => router.push("/admin")}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#18181b] hover:bg-[#fafafa] rounded-xs transition-colors cursor-pointer"
                    >
                      <ShieldCheck size={14} className="text-[#e26d40]" />
                      <span>Admin Portal</span>
                    </button>
                  )}

                  <button
                    onClick={() => router.push("/dashboard/topup")}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#18181b] hover:bg-[#fafafa] rounded-xs transition-colors cursor-pointer"
                  >
                    <Wallet size={14} />
                    <span>Topup Token</span>
                  </button>

                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xs transition-colors cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xs bg-[#fafafa] hover:bg-white border border-[#e4e4e7] hover:border-black text-[#18181b] transition-all shadow-2xs cursor-pointer flex items-center justify-center"
              aria-label="Open Navigation Menu"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Navigation Scroll Strip */}
        <div className="md:hidden border-t border-[#e4e4e7] bg-[#fafafa] px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none shadow-2xs font-mono">
          <button
            onClick={() => setCurrentNav("inference")}
            className={`px-3 py-1.5 rounded-xs text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              currentNav === "inference"
                ? "bg-black text-white shadow-2xs"
                : "bg-white border border-[#e4e4e7] text-[#71717a] hover:text-black"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentNav("models")}
            className={`px-3 py-1.5 rounded-xs text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              currentNav === "models"
                ? "bg-black text-white shadow-2xs"
                : "bg-white border border-[#e4e4e7] text-[#71717a] hover:text-black"
            }`}
          >
            Models
          </button>
          <button
            onClick={() => setCurrentNav("playground")}
            className={`px-3 py-1.5 rounded-xs text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              currentNav === "playground"
                ? "bg-black text-white shadow-2xs"
                : "bg-white border border-[#e4e4e7] text-[#71717a] hover:text-black"
            }`}
          >
            Playground
          </button>
          <button
            onClick={() => setCurrentNav("higgs")}
            className={`px-3 py-1.5 rounded-xs text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              currentNav === "higgs"
                ? "bg-black text-white shadow-2xs"
                : "bg-white border border-[#e4e4e7] text-[#71717a] hover:text-black"
            }`}
          >
            Higgs Tools
          </button>
          <button
            onClick={() => router.push("/docs")}
            className="px-3 py-1.5 rounded-xs text-xs font-semibold whitespace-nowrap bg-white border border-[#e4e4e7] text-[#71717a] hover:text-black transition-all cursor-pointer"
          >
            &lt;/&gt; API Docs
          </button>
          <button
            onClick={() => router.push("/dashboard/topup")}
            className="px-3 py-1.5 rounded-xs text-xs font-semibold whitespace-nowrap bg-[#fff9f5] border border-[#f7d8c4] text-[#e26d40] hover:bg-[#fef4ed] transition-all font-bold cursor-pointer"
          >
            + Add Token
          </button>
        </div>
      </header>

      {/* ===== MOBILE SLIDE-OUT DRAWER / SIDEBAR ===== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-150">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Container */}
          <div className="fixed inset-y-0 right-0 max-w-[280px] w-full bg-white border-l border-[#e4e4e7] p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200 font-mono z-10">
            <div className="space-y-5">
              {/* Header inside Drawer */}
              <div className="flex items-center justify-between pb-3 border-b border-[#e4e4e7]">
                <VortXLogo size="md" />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-[#71717a] hover:text-[#18181b] rounded-xs border border-[#e4e4e7] hover:border-black cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={16} />
                </button>
              </div>

              {/* User Balance Card */}
              <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#71717a] font-medium">
                    Saldo Token
                  </span>
                  <button
                    onClick={fetchProfile}
                    className="text-[#71717a] hover:text-black p-0.5 cursor-pointer"
                    title="Refresh token"
                  >
                    <RefreshCw size={12} className={isRefreshing ? "animate-spin text-black" : ""} />
                  </button>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold font-mono text-[#18181b]">
                    {userProfile?.vcoin_balance !== undefined
                      ? userProfile.vcoin_balance.toLocaleString()
                      : "..."}
                  </span>
                  <span className="text-xs text-[#71717a]">Tokens</span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push("/dashboard/topup");
                  }}
                  className="w-full py-2 bg-black hover:bg-[#27272a] text-white text-xs font-semibold rounded-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Wallet size={13} />
                  <span>Top Up Token</span>
                </button>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#a1a1aa] px-2 block mb-2">
                  Navigasi Fitur
                </span>

                <button
                  onClick={() => {
                    setCurrentNav("inference");
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xs text-xs font-semibold transition-colors text-left cursor-pointer ${
                    currentNav === "inference"
                      ? "bg-black text-white"
                      : "text-[#18181b] hover:bg-[#fafafa]"
                  }`}
                >
                  <Activity size={15} />
                  <span>Dashboard (API Key)</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentNav("models");
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xs text-xs font-semibold transition-colors text-left cursor-pointer ${
                    currentNav === "models"
                      ? "bg-black text-white"
                      : "text-[#18181b] hover:bg-[#fafafa]"
                  }`}
                >
                  <Sparkles size={15} />
                  <span>AI Models Catalog</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentNav("playground");
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xs text-xs font-semibold transition-colors text-left cursor-pointer ${
                    currentNav === "playground"
                      ? "bg-black text-white"
                      : "text-[#18181b] hover:bg-[#fafafa]"
                  }`}
                >
                  <Terminal size={15} />
                  <span>AI Playground</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentNav("higgs");
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xs text-xs font-semibold transition-colors text-left cursor-pointer ${
                    currentNav === "higgs"
                      ? "bg-black text-white"
                      : "text-[#18181b] hover:bg-[#fafafa]"
                  }`}
                >
                  <Shield size={15} />
                  <span>Higgs Tools</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push("/docs");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xs text-xs font-semibold text-[#18181b] hover:bg-[#fafafa] transition-colors text-left cursor-pointer"
                >
                  <Code2 size={15} />
                  <span>API Documentation</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push("/dashboard/topup");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xs text-xs font-semibold text-[#e26d40] hover:bg-[#fff9f5] transition-colors text-left cursor-pointer"
                >
                  <CreditCard size={15} />
                  <span>Top Up Token</span>
                </button>

                {userProfile?.role === "admin" && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      router.push("/admin");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xs text-xs font-semibold text-[#18181b] bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors text-left cursor-pointer mt-2"
                  >
                    <ShieldCheck size={15} className="text-amber-800" />
                    <span>Admin Control Hub</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Bottom Logout Section */}
            <div className="pt-4 border-t border-[#e4e4e7] space-y-3">
              <div className="flex items-center gap-2.5 px-2">
                <div className="w-8 h-8 rounded-xs bg-[#18181b] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {userProfile?.username ? userProfile.username.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#18181b] truncate">
                    {userProfile?.username || "Pengguna"}
                  </p>
                </div>
              </div>

              <button
                onClick={logout}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut size={13} />
                <span>Keluar Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MAIN APPLICATION BODY ===== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        {/* VIEW 1: AI MODELS CATALOG */}
        {currentNav === "models" && (
          <AIModelsCatalog
            onOpenPlayground={(modelId) => handleOpenPlaygroundFromCatalog(modelId)}
          />
        )}

        {/* VIEW 2: SERVERLESS INFERENCE & KEYS */}
        {currentNav === "inference" && (
          <ServerlessInferenceView
            userBalance={userProfile?.vcoin_balance || 0}
            onOpenPlayground={() => setCurrentNav("playground")}
            onOpenTopup={() => router.push("/dashboard/topup")}
          />
        )}

        {/* VIEW 3: PLAYGROUND */}
        {currentNav === "playground" && (
          <AIPlaygroundView initialModelId={selectedPlaygroundModel} />
        )}

        {/* VIEW 4: HIGGS TOOLS */}
        {currentNav === "higgs" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Greeting & Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e4e4e7]">
              <div>
                <h1 className="text-2xl font-semibold text-[#18181b] tracking-tight">
                  Higgs Tools
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/dashboard/topup")}
                  className="px-3.5 py-1.5 bg-black hover:bg-[#27272a] text-white rounded-xs text-xs font-medium transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Wallet size={13} />
                  Topup Token
                </button>
              </div>
            </div>

            {/* Tools Tabs Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {HIGGS_PRODUCTS.map((tool) => {
                const Icon = tool.icon;
                const isActive = higgsTab === tool.sku;
                return (
                  <button
                    key={tool.sku}
                    onClick={() => setHiggsTab(tool.sku)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xs transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? "bg-black text-white shadow-2xs"
                        : "bg-white border border-[#e4e4e7] text-[#71717a] hover:text-black hover:bg-[#fafafa]"
                    }`}
                  >
                    <Icon size={14} />
                    <span>{tool.label}</span>
                    {(tool as any).isSoon && (
                      <span className={`ml-1 px-1.5 py-0.5 text-[9px] font-mono font-bold rounded ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-[#e26d40]/15 text-[#e26d40] border border-[#e26d40]/30"
                      }`}>
                        Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Main Tool Container */}
            <div className="bg-white border border-[#e4e4e7] rounded-xs p-5 sm:p-6 shadow-xs space-y-6">
              {activeHiggsTool.sku !== "new-checker" && activeHiggsTool.sku !== "headless-checker" && (
                <div className="flex items-center justify-between pb-4 border-b border-[#e4e4e7]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xs bg-[#f4f4f5] border border-[#e4e4e7] text-black">
                      {React.createElement(activeHiggsTool.icon, { size: 18 })}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-[#18181b]">{activeHiggsTool.label}</h2>
                        {activeHiggsTool.sku === "intip-nomor" && (
                          <span className="px-2 py-0.5 bg-[#fafafa] border border-[#e4e4e7] text-[10px] font-mono text-[#71717a] font-semibold rounded-xs">
                            Maks 10 ID / Bulk Checking
                          </span>
                        )}
                        {activeHiggsTool.sku === "cek-info-akun" && (
                          <span className="px-2 py-0.5 bg-[#fafafa] border border-[#e4e4e7] text-[10px] font-mono text-[#71717a] font-semibold rounded-xs">
                            1 Akun / Request
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#71717a] font-mono font-semibold pt-0.5">
                        {activeHiggsTool.sku === "data-extractor"
                          ? `${toolCost} token / file`
                          : activeHiggsTool.sku === "cek-info-akun"
                          ? `${toolCost} token / akun`
                          : `${toolCost} token / ID`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* View Components */}
              {activeHiggsTool.sku === "sortir-banned" && (
                <SortirBannedView
                  userBalance={userProfile?.vcoin_balance || 0}
                  costPerUse={toolCost}
                  onSuccess={fetchProfile}
                />
              )}

              {activeHiggsTool.sku === "intip-nomor" && (
                <IntipNomorView
                  userBalance={userProfile?.vcoin_balance || 0}
                  costPerId={toolCost}
                  onBalanceChange={fetchProfile}
                />
              )}

              {activeHiggsTool.sku === "cek-info-akun" && (
                <CekInfoAkunView
                  userBalance={userProfile?.vcoin_balance || 0}
                  costPerAccount={toolCost}
                  onBalanceChange={fetchProfile}
                />
              )}

              {activeHiggsTool.sku === "data-extractor" && (
                <>
                  <DataExtractorView
                    userBalance={userProfile?.vcoin_balance || 0}
                    costPerUse={toolCost}
                    onSuccess={fetchProfile}
                  />
                  <div className="border-t border-[#e4e4e7] my-6" />
                  <DesktopExtractorLicenseView onBalanceChange={fetchProfile} />
                </>
              )}

              {activeHiggsTool.sku === "new-checker" && <NewCheckerView onBalanceChange={fetchProfile} />}

              {activeHiggsTool.sku === "headless-checker" && <HeadlessDataCheckerView />}
            </div>
          </div>
        )}
      </main>

      {/* ===== UNIFIED FOOTER ===== */}
      <Footer />
    </div>
  );
}