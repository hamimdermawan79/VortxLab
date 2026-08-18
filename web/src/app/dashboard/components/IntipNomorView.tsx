"use client";

import React, { useState } from "react";
import {
  Phone,
  Search,
  Copy,
  Check,
  Download,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Mail,
  Zap
} from "lucide-react";

interface IntipNomorViewProps {
  userBalance: number;
  costPerId: number;
  onBalanceChange: () => void;
}

interface ResultItem {
  user_id_cek: string;
  status: number | string;
  phone?: string;
  email?: string;
}

export default function IntipNomorView({
  userBalance,
  costPerId = 2500,
  onBalanceChange,
}: IntipNomorViewProps) {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Parse valid numeric IDs
  const parsedIds = inputText
    .split(/[\n, ]+/)
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));

  // Unique list capped at 10
  const uniqueIds = Array.from(new Set(parsedIds));
  const isExceeded = uniqueIds.length > 10;
  const targetIds = uniqueIds.slice(0, 10);
  const totalCost = targetIds.length * costPerId;
  const isBalanceEnough = userBalance >= totalCost;

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedIndex(key);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExportCSV = () => {
    if (results.length === 0) return;
    const header = "User ID,Nomor HP,Email,Status\n";
    const rows = results
      .map(
        (r) =>
          `"${r.user_id_cek}","${r.phone || "-"}","${r.email || "-"}","${
            r.phone || r.email ? "Ditemukan" : "Tidak Ada Data"
          }"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intip_nomor_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExecute = async () => {
    setShowConfirmModal(false);
    if (targetIds.length === 0) {
      setError("Masukkan setidaknya 1 ID akun yang valid.");
      return;
    }

    if (!isBalanceEnough) {
      setError(`Saldo token tidak mencukupi. Butuh ${totalCost.toLocaleString("id-ID")} token.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/intip-nomor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: targetIds }),
      });

      let data: any = {};
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await res.json().catch(() => ({}));
      } else {
        const text = await res.text().catch(() => "");
        throw new Error(
          text.includes("<!DOCTYPE") || text.includes("<html")
            ? `Server Error (${res.status}): Terjadi kesalahan saat memproses API Intip Nomor.`
            : text || `Server Error (${res.status})`
        );
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || "Gagal memproses request.");
      }

      setResults(data.results || []);
      onBalanceChange();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mengecek nomor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Grid: Input & Result */}
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
                {targetIds.length} / 10 ID terpilih
              </span>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Contoh:&#10;12345678&#10;87654321&#10;11223344"
              rows={8}
              className="w-full bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-3.5 text-xs text-[#18181b] font-mono outline-none focus:border-black focus:bg-white transition-all placeholder:text-[#a1a1aa] leading-relaxed resize-y"
            />

            {/* Quick helper buttons */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setInputText("12345678\n87654321")}
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

              {isExceeded && (
                <span className="text-[10px] text-amber-600 font-medium">
                  *Otomatis dibatasi 10 ID pertama
                </span>
              )}
            </div>

            {/* Summary & Price calculation */}
            <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#71717a]">
                <span>Jumlah ID valid:</span>
                <span className="font-bold text-[#18181b]">{targetIds.length} ID</span>
              </div>
              <div className="flex items-center justify-between text-[#71717a]">
                <span>Biaya per ID:</span>
                <span className="font-bold text-[#18181b]">{costPerId.toLocaleString("id-ID")} Token</span>
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
                if (targetIds.length === 0) {
                  setError("Masukkan setidaknya 1 ID akun valid.");
                  return;
                }
                setShowConfirmModal(true);
              }}
              disabled={loading || targetIds.length === 0}
              className="w-full py-3 bg-[#18181b] hover:bg-black disabled:opacity-50 text-white font-semibold text-xs rounded-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Sedang Mengintip...</span>
                </>
              ) : (
                <>
                  <Zap size={14} className="text-[#e26d40]" />
                  <span>Intip Nomor Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Results Table */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-[#e4e4e7] rounded-xs p-5 shadow-xs space-y-4 font-mono min-h-[420px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#e4e4e7]">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181b]">
                    Hasil Pengecekan
                  </h3>
                  <p className="text-[11px] text-[#71717a]">
                    {results.length > 0 ? `${results.length} akun diproses` : "Belum ada riwayat hasil"}
                  </p>
                </div>

                {results.length > 0 && (
                  <button
                    onClick={handleExportCSV}
                    className="px-3 py-1.5 bg-[#fafafa] hover:bg-white border border-[#e4e4e7] hover:border-black text-xs font-semibold text-[#18181b] rounded-xs transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Ekspor CSV</span>
                  </button>
                )}
              </div>

              {/* Table or Empty Placeholder */}
              {results.length > 0 ? (
                <div className="overflow-x-auto border border-[#e4e4e7] rounded-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#fafafa] border-b border-[#e4e4e7] text-[10px] text-[#71717a] uppercase tracking-wider">
                      <tr>
                        <th className="px-3.5 py-2.5 font-semibold">User ID</th>
                        <th className="px-3.5 py-2.5 font-semibold">Nomor HP</th>
                        <th className="px-3.5 py-2.5 font-semibold">Email</th>
                        <th className="px-3.5 py-2.5 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e4e4e7]">
                      {results.map((item, idx) => {
                        const hasPhone = Boolean(item.phone && item.phone !== "-");
                        const hasEmail = Boolean(item.email && item.email !== "-");

                        return (
                          <tr key={idx} className="hover:bg-[#fafafa] transition-colors">
                            <td className="px-3.5 py-3 font-semibold text-[#18181b]">
                              {item.user_id_cek}
                            </td>
                            <td className="px-3.5 py-3 text-xs">
                              {hasPhone ? (
                                <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-xs border border-emerald-200">
                                  {item.phone}
                                </span>
                              ) : (
                                <span className="text-[#a1a1aa] italic">Tidak ada HP</span>
                              )}
                            </td>
                            <td className="px-3.5 py-3 text-xs">
                              {hasEmail ? (
                                <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-xs border border-blue-200">
                                  {item.email}
                                </span>
                              ) : (
                                <span className="text-[#a1a1aa] italic">Tidak ada Email</span>
                              )}
                            </td>
                            <td className="px-3.5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {hasPhone && (
                                  <button
                                    onClick={() => handleCopy(item.phone!, `phone-${idx}`)}
                                    title="Copy No HP"
                                    className="p-1 text-[#71717a] hover:text-black hover:bg-white border border-[#e4e4e7] rounded-xs transition-colors cursor-pointer"
                                  >
                                    {copiedIndex === `phone-${idx}` ? (
                                      <Check size={12} className="text-emerald-600" />
                                    ) : (
                                      <Phone size={12} />
                                    )}
                                  </button>
                                )}
                                {hasEmail && (
                                  <button
                                    onClick={() => handleCopy(item.email!, `email-${idx}`)}
                                    title="Copy Email"
                                    className="p-1 text-[#71717a] hover:text-black hover:bg-white border border-[#e4e4e7] rounded-xs transition-colors cursor-pointer"
                                  >
                                    {copiedIndex === `email-${idx}` ? (
                                      <Check size={12} className="text-emerald-600" />
                                    ) : (
                                      <Mail size={12} />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#fafafa] border border-[#e4e4e7] flex items-center justify-center mx-auto text-[#71717a]">
                    <Search size={20} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#18181b]">Belum Ada Hasil</p>
                    <p className="text-[11px] text-[#71717a] max-w-sm mx-auto">
                      Masukkan ID akun di panel kiri lalu tekan &quot;Intip Nomor Sekarang&quot; untuk menampilkan nomor telepon dan email terikat.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono animate-in fade-in duration-100">
          <div className="bg-white border border-[#e4e4e7] rounded-xs max-w-sm w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#e4e4e7]">
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-[#e26d40]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181b]">
                  Konfirmasi Intip Nomor
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
                Anda akan mengecek <strong className="text-[#18181b]">{targetIds.length} ID</strong> akun Higgs Domino.
              </p>

              <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-3 space-y-1.5">
                <div className="flex justify-between text-[#71717a]">
                  <span>Biaya Token:</span>
                  <span className="font-bold text-[#e26d40]">{totalCost.toLocaleString("id-ID")} Token</span>
                </div>
                <div className="flex justify-between text-[#71717a]">
                  <span>Saldo Anda:</span>
                  <span className="font-bold text-[#18181b]">{userBalance.toLocaleString("id-ID")} Token</span>
                </div>
                <div className="flex justify-between text-[#71717a] pt-1.5 border-t border-[#e4e4e7]">
                  <span>Sisa Saldo:</span>
                  <span className="font-bold text-emerald-700">
                    {(userBalance - totalCost).toLocaleString("id-ID")} Token
                  </span>
                </div>
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
                className="flex-1 py-2.5 bg-[#18181b] hover:bg-black text-white text-xs font-semibold rounded-xs transition-colors cursor-pointer shadow-xs"
              >
                Ya, Proses ({totalCost.toLocaleString("id-ID")} Token)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
