"use client";

import React, { useState } from "react";
import {
  Search,
  Zap,
  Copy,
  Check,
  Download,
  AlertCircle,
  Loader2,
  X,
  Users,
  UserRound,
} from "lucide-react";
import { parseHiggsIds } from "@/utils/parseHiggsIds";

interface CategoryGroup {
  label: string;
  ids: string[];
}

interface SortirCategoryViewProps {
  title: string;
  subtitle: string;
  apiEndpoint: string;
  userBalance: number;
  costPerId: number;
  onBalanceChange: () => void;
  categoryAName: string;
  categoryBName: string;
  categoryADesc: string;
  categoryBDesc: string;
  confirmTitle: string;
  loadingLabel: string;
  executeLabel: string;
  placeholders: string[];
}

export default function SortirCategoryView({
  title,
  subtitle,
  apiEndpoint,
  userBalance,
  costPerId,
  onBalanceChange,
  categoryAName,
  categoryBName,
  categoryADesc,
  categoryBDesc,
  confirmTitle,
  loadingLabel,
  executeLabel,
  placeholders,
}: SortirCategoryViewProps) {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [groupA, setGroupA] = useState<CategoryGroup>({ label: categoryAName, ids: [] });
  const [groupB, setGroupB] = useState<CategoryGroup>({ label: categoryBName, ids: [] });
  const [copied, setCopied] = useState<"A" | "B" | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const uniqueIds = parseHiggsIds(inputText);
  const totalCost = uniqueIds.length * costPerId;
  const isBalanceEnough = userBalance >= totalCost;

  const hasResult = groupA.ids.length > 0 || groupB.ids.length > 0;
  const totalResult = groupA.ids.length + groupB.ids.length;

  const handleCopy = (ids: string[], key: "A" | "B") => {
    if (ids.length === 0) return;
    navigator.clipboard.writeText(ids.join("\n"));
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleExportCSV = () => {
    if (!hasResult) return;
    const csv = `${groupA.label},${groupB.label}\n`;
    const maxLen = Math.max(groupA.ids.length, groupB.ids.length);
    let rows = "";
    for (let i = 0; i < maxLen; i++) {
      rows += `${groupA.ids[i] || ""},${groupB.ids[i] || ""}\n`;
    }
    const blob = new Blob([csv + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "_")}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExecute = async () => {
    setShowConfirmModal(false);
    if (uniqueIds.length === 0) {
      setError("Masukkan setidaknya 1 ID akun yang valid.");
      return;
    }

    if (!isBalanceEnough) {
      setError(
        `Saldo token tidak mencukupi. Butuh ${totalCost.toLocaleString("id-ID")} token.`
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: uniqueIds }),
      });

      let data: any = {};
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await res.json().catch(() => ({}));
      } else {
        const text = await res.text().catch(() => "");
        throw new Error(
          text.includes("<!DOCTYPE") || text.includes("<html")
            ? `Server Error (${res.status}): Terjadi kesalahan saat memproses API.`
            : text || `Server Error (${res.status})`
        );
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || "Gagal memproses request.");
      }

      setGroupA({
        label: data.category_a?.label || categoryAName,
        ids: data.category_a?.ids || [],
      });
      setGroupB({
        label: data.category_b?.label || categoryBName,
        ids: data.category_b?.ids || [],
      });
      onBalanceChange();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memproses permintaan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#e4e4e7] rounded-xs p-5 shadow-xs space-y-4 font-mono">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#18181b] flex items-center gap-2">
                <Search size={14} className="text-[#e26d40]" />
                Input Daftar ID Akun
              </label>
              <span className="text-[11px] text-[#71717a]">
                {uniqueIds.length} ID terpilih
              </span>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={placeholders.join("\n")}
              rows={8}
              className="w-full bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-3.5 text-xs text-[#18181b] font-mono outline-none focus:border-black focus:bg-white transition-all placeholder:text-[#a1a1aa] leading-relaxed resize-y"
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setInputText(placeholders.slice(0, 2).join("\n"))}
                  className="px-2 py-1 bg-[#fafafa] hover:bg-[#e4e4e7] text-[#71717a] hover:text-black rounded-xs text-[10px] transition-colors cursor-pointer"
                >
                  Isi Contoh
                </button>
                <button
                  type="button"
                  onClick={() => setInputText("")}
                  className="px-2 py-1 bg-[#fafafa] hover:bg-rose-50 text-[#71717a] hover:text-rose-600 rounded-xs text-[10px] transition-colors cursor-pointer"
                >
                  Hapus
                </button>
              </div>
              <span className="text-[10px] text-[#a1a1aa]">Max 2.000 ID / request</span>
            </div>

            {/* Summary & Price calculation */}
            <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#71717a]">
                <span>Jumlah ID valid:</span>
                <span className="font-bold text-[#18181b]">
                  {uniqueIds.length.toLocaleString("id-ID")} ID
                </span>
              </div>
              {uniqueIds.length > 2000 && (
                <div className="flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-xs text-[11px] text-amber-800">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <span>
                    Maksimal 2.000 ID per request. Kurangi jumlah ID agar bisa diproses.
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-[#71717a]">
                <span>Biaya per ID:</span>
                <span className="font-bold text-[#18181b]">
                  {costPerId.toLocaleString("id-ID")} Token
                </span>
              </div>
              <div className="pt-2 border-t border-[#e4e4e7] flex items-center justify-between text-sm">
                <span className="font-bold text-[#18181b]">Total Biaya:</span>
                <span className="font-bold text-[#e26d40] font-mono">
                  {totalCost.toLocaleString("id-ID")} Token
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xs flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <div className="leading-relaxed">{error}</div>
              </div>
            )}

            <button
              onClick={() => {
                if (uniqueIds.length === 0) {
                  setError("Masukkan setidaknya 1 ID akun valid.");
                  return;
                }
                if (uniqueIds.length > 2000) {
                  setError("Maksimal 2.000 ID per request. Silakan kurangi jumlah ID.");
                  return;
                }
                setShowConfirmModal(true);
              }}
              disabled={loading || uniqueIds.length === 0}
              className="w-full py-3 bg-[#18181b] hover:bg-black disabled:opacity-50 text-white font-semibold text-xs rounded-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{loadingLabel}</span>
                </>
              ) : (
                <>
                  <Zap size={14} className="text-[#e26d40]" />
                  <span>{executeLabel}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-[#e4e4e7] rounded-xs p-5 shadow-xs font-mono min-h-[420px] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#e4e4e7]">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181b]">
                  Hasil {title}
                </h3>
                <p className="text-[11px] text-[#71717a]">
                  {hasResult
                    ? `${totalResult.toLocaleString("id-ID")} ID terpilah`
                    : subtitle}
                </p>
              </div>

              {hasResult && (
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-[#fafafa] hover:bg-white border border-[#e4e4e7] hover:border-black text-xs font-semibold text-[#18181b] rounded-xs transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download size={13} />
                  <span>Ekspor CSV</span>
                </button>
              )}
            </div>

            {hasResult ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 flex-1">
                {/* Category A */}
                <div className="bg-emerald-500/[0.05] border border-emerald-500/25 rounded-xs p-3.5 flex flex-col shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <Users size={13} className="text-emerald-700" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-950">
                        {groupA.label}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 border border-emerald-500/30">
                        {groupA.ids.length.toLocaleString("id-ID")} ID
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(groupA.ids, "A")}
                      disabled={groupA.ids.length === 0}
                      className="text-[10px] flex items-center gap-1 px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-500/30 rounded-xs font-medium cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {copied === "A" ? (
                        <>
                          <Check size={11} /> Tersalin!
                        </>
                      ) : (
                        <>
                          <Copy size={11} /> Salin
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-emerald-800/70 pb-2">{categoryADesc}</p>
                  <div className="bg-white/70 border border-emerald-500/20 rounded-xs p-2 max-h-56 overflow-y-auto text-[11px] text-emerald-950 divide-y divide-emerald-500/10 select-all flex-1">
                    {groupA.ids.length > 0 ? (
                      groupA.ids.map((id, idx) => (
                        <div key={idx} className="py-1 px-1.5 font-semibold hover:bg-emerald-500/10 rounded-xs">
                          {id}
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-[11px] text-emerald-800/50 italic">
                        Tidak ada ID pada kategori ini
                      </div>
                    )}
                  </div>
                </div>

                {/* Category B */}
                <div className="bg-amber-500/[0.05] border border-amber-500/25 rounded-xs p-3.5 flex flex-col shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <UserRound size={13} className="text-amber-700" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-950">
                        {groupB.label}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 border border-amber-500/30">
                        {groupB.ids.length.toLocaleString("id-ID")} ID
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(groupB.ids, "B")}
                      disabled={groupB.ids.length === 0}
                      className="text-[10px] flex items-center gap-1 px-2 py-1 bg-white hover:bg-amber-50 text-amber-800 border border-amber-500/30 rounded-xs font-medium cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {copied === "B" ? (
                        <>
                          <Check size={11} /> Tersalin!
                        </>
                      ) : (
                        <>
                          <Copy size={11} /> Salin
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-800/70 pb-2">{categoryBDesc}</p>
                  <div className="bg-white/70 border border-amber-500/20 rounded-xs p-2 max-h-56 overflow-y-auto text-[11px] text-amber-950 divide-y divide-amber-500/10 select-all flex-1">
                    {groupB.ids.length > 0 ? (
                      groupB.ids.map((id, idx) => (
                        <div key={idx} className="py-1 px-1.5 font-semibold hover:bg-amber-500/10 rounded-xs">
                          {id}
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-[11px] text-amber-800/50 italic">
                        Tidak ada ID pada kategori ini
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center space-y-3 flex-1 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#fafafa] border border-[#e4e4e7] flex items-center justify-center mx-auto text-[#71717a]">
                  <Search size={20} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#18181b]">Belum Ada Hasil</p>
                  <p className="text-[11px] text-[#71717a] max-w-sm mx-auto">
                    Masukkan ID akun di panel kiri lalu tekan &quot;{executeLabel}&quot;
                    untuk memilah akun ke dalam dua kategori.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono animate-in fade-in duration-100">
          <div className="bg-white border border-[#e4e4e7] rounded-xs max-w-sm w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#e4e4e7]">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-[#e26d40]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181b]">
                  {confirmTitle}
                </h3>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-[#71717a] hover:text-black p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#71717a] leading-relaxed">
                Anda akan memilah <strong className="text-[#18181b]">{uniqueIds.length.toLocaleString("id-ID")} ID</strong> akun Higgs Domino.
              </p>

              <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-3 space-y-1.5">
                <div className="flex justify-between text-[#71717a]">
                  <span>Biaya Token:</span>
                  <span className="font-bold text-[#e26d40]">
                    {totalCost.toLocaleString("id-ID")} Token
                  </span>
                </div>
                <div className="flex justify-between text-[#71717a]">
                  <span>Saldo Anda:</span>
                  <span className="font-bold text-[#18181b]">
                    {userBalance.toLocaleString("id-ID")} Token
                  </span>
                </div>
                <div className="flex justify-between text-[#71717a] pt-1.5 border-t border-[#e4e4e7]">
                  <span>Sisa Saldo:</span>
                  <span
                    className={`font-bold ${
                      userBalance - totalCost < 0 ? "text-rose-600" : "text-emerald-700"
                    }`}
                  >
                    {(userBalance - totalCost).toLocaleString("id-ID")} Token
                  </span>
                </div>
                {!isBalanceEnough && (
                  <div className="flex items-start gap-1.5 p-2 bg-rose-50 border border-rose-200 rounded-xs text-[11px] text-rose-700">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <span>Saldo tidak mencukupi untuk proses ini.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 bg-white border border-[#e4e4e7] hover:bg-[#fafafa] text-[#18181b] text-xs font-semibold rounded-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecute}
                disabled={loading || !isBalanceEnough}
                className="flex-1 py-2.5 bg-[#18181b] hover:bg-black text-white text-xs font-semibold rounded-xs transition-colors cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isBalanceEnough ? "Ya, Proses" : "Saldo Tidak Cukup"} ({totalCost.toLocaleString("id-ID")} Token)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Card */}
      <div className="flex items-start gap-3 p-3 rounded-xs border border-amber-200 bg-amber-50">
        <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[11px] text-amber-800 leading-relaxed">
          Hasil dibagi ke dua kategori berdasarkan data provider. Jika fitur bermasalah, silahkan hubungi{" "}
          <a
            href="/contact"
            className="font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900"
          >
            contact admin
          </a>{" "}
          yang tersedia.
        </p>
      </div>
    </div>
  );
}
