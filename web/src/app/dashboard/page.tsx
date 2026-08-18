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
  User,
  Activity,
  Menu,
  Copy,
  Check,
  Code2,
  Terminal,
  ShieldCheck,
  CreditCard,
  Phone,
  UserCheck
} from "lucide-react";
import AIModelsCatalog from "./components/AIModelsCatalog";
import ServerlessInferenceView from "./components/ServerlessInferenceView";
import AIPlaygroundView from "./components/AIPlaygroundView";
import NewCheckerView from "./components/NewCheckerView";
import IntipNomorView from "./components/IntipNomorView";
import CekInfoAkunView from "./components/CekInfoAkunView";
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
];

type Status = "idle" | "deducting" | "processing" | "completed" | "failed" | "uploading";

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
  const pollingTimeouts = useRef<Record<string, any>>({});

  const idList = useMemo(
    () => rawInput.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
    [rawInput]
  );
  const uniqueIds = useMemo(() => Array.from(new Set(idList)), [idList]);
  const dupCount = idList.length - uniqueIds.length;
  const totalCost = uniqueIds.length * costPerUse;
  const insufficient = userBalance < totalCost;

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/sortir-banned/history");
      const data = await res.json();
      if (data.jobs) {
        setHistoryJobs(data.jobs);
        data.jobs.forEach((job: any) => {
          if (job.status === "pending" || job.status === "processing") {
            pollHistoryJob(job.id);
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
    };
  }, []);

  const pollHistoryJob = async (activityId: string) => {
    try {
      const res = await fetch(
        "/api/sortir-banned?activityId=" + activityId + "&t=" + Date.now(),
        { cache: "no-store" }
      );
      const data = await res.json();
      setHistoryJobs((prev) =>
        prev.map((job) => {
          if (job.id === activityId) {
            return {
              ...job,
              status: data.status,
              current_index: data.current_index,
              total_ids: data.total_ids,
            };
          }
          return job;
        })
      );
      if (data.status === "pending" || data.status === "processing") {
        pollingTimeouts.current[activityId] = setTimeout(
          () => pollHistoryJob(activityId),
          5000
        );
      } else {
        if (data.status === "completed") onSuccess();
      }
    } catch (e) {
      pollingTimeouts.current[activityId] = setTimeout(
        () => pollHistoryJob(activityId),
        5000
      );
    }
  };

  const handleStart = async () => {
    if (uniqueIds.length === 0 || insufficient) return;
    setShowConfirm(false);
    setError(null);
    setStatus("deducting");
    try {
      const BATCH_SIZE = 20;
      for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
        const chunk = uniqueIds.slice(i, i + BATCH_SIZE);
        const res = await fetch("/api/sortir-banned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: chunk }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Gagal memproses sortir");
      }
      setRawInput("");
      setStatus("idle");
      loadHistory();
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
        for (let i = 0; i < maxLen; i++)
          csv += (results.aman?.[i] || "") + "," + (results.banned?.[i] || "") + "\n";
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

  const handleCancelJob = async (activityId: string) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan proses sortir ini? Saldo token akan dikembalikan."))
      return;
    try {
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

  return (
    <div className="space-y-6">
      {activeJob || status === "deducting" ? (
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
                Batalkan Proses & Refund Saldo
              </button>
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
                <Upload size={13} /> Upload File (.TXT / .CSV)
                <input type="file" accept=".txt,.csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              rows={6}
              placeholder="Paste ID target disini, satu per baris atau dipisahkan koma..."
              className="w-full bg-white border border-[#e4e4e7] rounded-xs px-4 py-3 text-xs font-mono text-[#18181b] outline-none focus:border-black resize-none placeholder:text-[#a1a1aa] transition-all font-normal"
            />

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

      {/* History Section */}
      <div className="bg-white border border-[#e4e4e7] rounded-xs p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e4e4e7] pb-3">
          <div>
            <h3 className="text-xs font-medium text-[#18181b] uppercase tracking-wider">
              Riwayat Pekerjaan
            </h3>
            <p className="text-[11px] text-[#71717a]">Daftar file hasil sortir akun</p>
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
          <div className="space-y-2">
            {pastJobs.map((job) => {
              const isFailed = job.status === "failed";
              return (
                <div
                  key={job.id}
                  className="bg-[#fafafa] border border-[#e4e4e7] hover:border-black transition-colors rounded-xs p-3.5 flex flex-col sm:flex-row gap-3 sm:items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xs ${
                        isFailed ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {isFailed ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#18181b]">
                        {job.total_ids.toLocaleString()} ID Target
                      </p>
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
                    <button
                      onClick={() => downloadHistoryCSV(job.id)}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-[#e4e4e7] shadow-2xs text-black hover:bg-[#f4f4f5] text-xs font-medium rounded-xs transition-all cursor-pointer"
                    >
                      <Download size={12} /> Unduh CSV
                    </button>
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
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const pollAnalysis = (id: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/extractor?jobId=${id}`);
        const data = await res.json();
        if (data.status === "uploaded") {
          clearInterval(intervalRef.current);
          setStats({
            totalConf: data.totalConf,
            totalExtracted: data.totalExtracted,
            dupRemoved: data.dupRemoved || 0,
            totalCost: data.totalCost,
          });
          setStatus("idle");
        } else if (data.status === "failed") {
          clearInterval(intervalRef.current);
          setStatus("idle");
          setError(data.error || "Gagal menganalisis file .zip.");
          setFile(null);
        }
      } catch (err) {}
    }, 1500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".zip")) {
      setError("Hanya file .zip yang didukung");
      return;
    }
    if (f.size > 500 * 1024 * 1024) {
      setError("Maksimal ukuran file adalah 500MB");
      return;
    }

    setError(null);
    setFile(f);
    setStatus("uploading");
    setStats(null);
    const formData = new FormData();
    formData.append("file", f);

    try {
      const res = await fetch("/api/extractor", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Upload gagal");
      setJobId(data.jobId);
      pollAnalysis(data.jobId);
    } catch (err: any) {
      setError(err.message);
      setStatus("idle");
      setFile(null);
    }
  };

  const handleConfirm = async () => {
    if (!jobId) return;
    setStatus("processing");
    try {
      const res = await fetch("/api/extractor/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Gagal konfirmasi");

      // Fetch completed results
      const resData = await fetch(`/api/extractor?jobId=${jobId}`);
      const jobData = await resData.json();

      setStatus("completed");
      setResults(jobData.results || []);
      onSuccess(true);
    } catch (err: any) {
      setError(err.message);
      setStatus("idle");
    }
  };

  const downloadExtractedTxt = () => {
    if (results.length === 0) return;
    const txt = results.map((r) => `${r.id || ""},${r.pw || r.password || ""},${r.mac || ""}`).join("\n");
    const blob = new Blob([txt], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vortx_extracted_${jobId ? jobId.slice(0, 6) : "data"}.txt`;
    a.click();
  };

  const downloadExtractedCsv = () => {
    if (results.length === 0) return;
    const header = "ID Akun,Password,MAC Address\n";
    const csvContent = results.map((r) => `"${r.id || ""}","${r.pw || r.password || ""}","${r.mac || ""}"`).join("\n");
    const blob = new Blob([header + csvContent], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vortx_extracted_${jobId ? jobId.slice(0, 6) : "data"}.csv`;
    a.click();
  };

  const insufficient = stats ? userBalance < stats.totalCost : false;

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-red-600 text-xs p-3 bg-red-50 rounded-xs flex items-center gap-2 font-normal border border-red-200">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {status === "uploading" && (
        <div className="flex flex-col items-center justify-center gap-3 py-10 bg-[#fafafa] border border-[#e4e4e7] rounded-xs">
          <Loader2 className="animate-spin text-black" size={24} />
          <p className="text-xs text-[#71717a]">Mengunggah & menganalisis file zip...</p>
        </div>
      )}

      {status === "processing" && (
        <div className="flex flex-col items-center justify-center gap-3 py-10 bg-[#fafafa] border border-[#e4e4e7] rounded-xs">
          <Loader2 className="animate-spin text-black" size={24} />
          <p className="text-xs text-[#71717a]">Mengekstraksi data akun...</p>
        </div>
      )}

      {status === "completed" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xs p-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-emerald-700" size={20} />
              <div>
                <p className="text-xs font-semibold text-[#18181b]">Ekstraksi Selesai!</p>
                <p className="text-[11px] text-[#71717a]">{results.length} akun berhasil diekstrak</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadExtractedTxt}
                className="px-3 py-1.5 bg-black text-white text-xs font-medium rounded-xs hover:bg-[#27272a] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <Download size={12} /> Unduh .TXT
              </button>
              <button
                onClick={downloadExtractedCsv}
                className="px-3 py-1.5 bg-white border border-[#e4e4e7] hover:border-black text-[#18181b] text-xs font-medium rounded-xs hover:bg-[#fafafa] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <Download size={12} /> Unduh .CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {status === "idle" && !stats && (
        <div className="border-2 border-dashed border-[#e4e4e7] rounded-xs p-8 text-center hover:border-black transition-colors bg-[#fafafa]">
          <input
            type="file"
            accept=".zip"
            onChange={handleFileUpload}
            className="hidden"
            id="extractor-upload"
          />
          <label htmlFor="extractor-upload" className="cursor-pointer flex flex-col items-center gap-2">
            <FolderArchive size={30} className="text-[#18181b]" />
            <span className="text-xs font-medium text-[#18181b] uppercase tracking-wider">
              Pilih File .ZIP Game
            </span>
            <span className="text-[11px] text-[#71717a]">
              Maksimal 500MB • Auto scanning XML & database akun
            </span>
          </label>
        </div>
      )}

      {status === "idle" && stats && (
        <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#e4e4e7] pb-2">
            <div className="flex items-center gap-2">
              <FolderArchive size={15} className="text-black" />
              <span className="text-xs font-semibold text-[#18181b] truncate max-w-xs">{file?.name}</span>
            </div>
            <button
              onClick={() => {
                setStats(null);
                setFile(null);
              }}
              className="text-xs text-red-600 font-medium hover:underline cursor-pointer"
            >
              Batal
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center bg-white p-3 rounded-xs border border-[#e4e4e7] divide-x divide-[#e4e4e7]">
            <div>
              <p className="text-[#71717a] text-[10px] uppercase font-medium">Total Conf</p>
              <p className="text-xs font-semibold font-mono text-[#18181b]">{stats.totalConf}</p>
            </div>
            <div>
              <p className="text-[#71717a] text-[10px] uppercase font-medium">Akun Ditemukan</p>
              <p className="text-xs font-semibold font-mono text-[#18181b]">{stats.totalExtracted}</p>
            </div>
            <div>
              <p className="text-[#71717a] text-[10px] uppercase font-medium">Duplikat</p>
              <p className="text-xs font-semibold font-mono text-[#18181b]">{stats.dupRemoved}</p>
            </div>
            <div>
              <p className="text-[#71717a] text-[10px] uppercase font-medium">Total Biaya</p>
              <p className={"text-xs font-semibold font-mono " + (insufficient ? "text-red-600" : "text-black")}>
                {stats.totalCost}
              </p>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            disabled={insufficient || stats.totalExtracted === 0}
            className={
              "w-full py-2.5 text-xs font-medium rounded-xs transition-all uppercase tracking-wider cursor-pointer " +
              (insufficient || stats.totalExtracted === 0
                ? "bg-[#fafafa] border border-[#e4e4e7] text-[#71717a] cursor-not-allowed"
                : "bg-black text-white hover:bg-[#27272a] shadow-2xs")
            }
          >
            {insufficient
              ? "Token Tidak Cukup"
              : stats.totalExtracted === 0
              ? "Tidak Ada Data Akun"
              : "Bayar & Proses Sekarang"}
          </button>
        </div>
      )}
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
                  </button>
                );
              })}
            </div>

            {/* Main Tool Container */}
            <div className="bg-white border border-[#e4e4e7] rounded-xs p-5 sm:p-6 shadow-xs space-y-6">
              {activeHiggsTool.sku !== "new-checker" && (
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
                          ? `${toolCost} token / ekstraksi`
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
                <DataExtractorView
                  userBalance={userProfile?.vcoin_balance || 0}
                  costPerUse={toolCost}
                  onSuccess={fetchProfile}
                />
              )}

              {activeHiggsTool.sku === "new-checker" && <NewCheckerView onBalanceChange={fetchProfile} />}
            </div>
          </div>
        )}
      </main>

      {/* ===== UNIFIED FOOTER ===== */}
      <Footer />
    </div>
  );
}