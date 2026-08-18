"use client";

import React, { useState } from "react";
import {
  UserCheck,
  KeyRound,
  Eye,
  EyeOff,
  Coins,
  Gem,
  Vault,
  Award,
  Layers,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  Sparkles,
  Zap
} from "lucide-react";

interface CekInfoAkunViewProps {
  userBalance: number;
  costPerAccount: number;
  onBalanceChange: () => void;
}

interface AccountResult {
  uid: number | string;
  status: string;
  nick?: string;
  chip?: number;
  brankas?: number;
  diamond_balance?: number;
  vip_level?: number;
  cards?: Record<string, number>;
  error?: string;
}

function formatChip(amount?: number) {
  if (amount === undefined || amount === null) return "0";
  if (amount >= 1_000_000_000_000) {
    return `${(amount / 1_000_000_000_000).toFixed(2)} T`;
  }
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(2)} B`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)} M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(1)} K`;
  }
  return amount.toLocaleString("id-ID");
}

export default function CekInfoAkunView({
  userBalance,
  costPerAccount = 100,
  onBalanceChange,
}: CekInfoAkunViewProps) {
  const [uid, setUid] = useState("");
  const [password, setPassword] = useState("");
  const [mac, setMac] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AccountResult | null>(null);
  const [copied, setCopied] = useState(false);

  const isBalanceEnough = userBalance >= costPerAccount;

  const handleCopySummary = () => {
    if (!result) return;
    const summary = `--- INFORMASI AKUN HIGGS ---
UID: ${result.uid}
${mac ? `MAC: ${mac}\n` : ""}Nickname: ${result.nick || "-"}
VIP Level: VIP ${result.vip_level ?? 0}
Chip: ${(result.chip ?? 0).toLocaleString("id-ID")} (${formatChip(result.chip)})
Brankas: ${(result.brankas ?? 0).toLocaleString("id-ID")} (${formatChip(result.brankas)})
Diamond: ${(result.diamond_balance ?? 0).toLocaleString("id-ID")}
Kartu: ${
      result.cards
        ? Object.entries(result.cards)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        : "-"
    }
Status: ${result.status}`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanUid = uid.trim();
    const cleanPassword = password.trim();
    const cleanMac = mac.trim();

    if (!cleanUid || !cleanPassword) {
      setError("UID dan Password akun wajib diisi.");
      return;
    }

    if (!isBalanceEnough) {
      setError(`Saldo token tidak mencukupi. Butuh ${costPerAccount.toLocaleString("id-ID")} token.`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/cek-info-akun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: cleanUid,
          password: cleanPassword,
          ...(cleanMac ? { mac: cleanMac } : {}),
        }),
      });

      let data: any = {};
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await res.json().catch(() => ({}));
      } else {
        const text = await res.text().catch(() => "");
        throw new Error(
          text.includes("<!DOCTYPE") || text.includes("<html")
            ? `Server Error (${res.status}): Terjadi kesalahan saat memproses API Cek Info Akun.`
            : text || `Server Error (${res.status})`
        );
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || "Gagal melakukan pengecekan akun.");
      }

      setResult(data.result);
      onBalanceChange();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleExecute} className="bg-white border border-[#e4e4e7] rounded-xs p-5 shadow-xs space-y-4 font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-[#e4e4e7]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#18181b] flex items-center gap-2">
                <KeyRound size={14} className="text-[#e26d40]" />
                Kredensial Akun
              </span>
              <span className="text-[10px] text-amber-700 font-medium">
                1 Akun per Request
              </span>
            </div>

            {/* UID Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#18181b]">
                UID / Game ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder="Contoh: 12345678"
                required
                className="w-full bg-[#fafafa] border border-[#e4e4e7] rounded-xs px-3.5 py-2.5 text-xs text-[#18181b] font-mono outline-none focus:border-black focus:bg-white transition-all placeholder:text-[#a1a1aa]"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#18181b]">
                Password Akun <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#fafafa] border border-[#e4e4e7] rounded-xs px-3.5 py-2.5 text-xs text-[#18181b] font-mono outline-none focus:border-black focus:bg-white transition-all pr-10 placeholder:text-[#a1a1aa]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-black transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* MAC Address Input (Optional) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#18181b]">
                  MAC Address
                </label>
                <span className="text-[10px] text-[#71717a] font-normal">Opsional</span>
              </div>
              <input
                type="text"
                value={mac}
                onChange={(e) => setMac(e.target.value)}
                placeholder="Contoh: 00:1A:2B:3C:4D:5E"
                className="w-full bg-[#fafafa] border border-[#e4e4e7] rounded-xs px-3.5 py-2.5 text-xs text-[#18181b] font-mono outline-none focus:border-black focus:bg-white transition-all placeholder:text-[#a1a1aa]"
              />
            </div>

            {/* Price Info Box */}
            <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-3.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[#71717a]">
                <span>Biaya Pengecekan:</span>
                <span className="font-bold text-[#e26d40]">{costPerAccount.toLocaleString("id-ID")} Token</span>
              </div>
              <div className="flex items-center justify-between text-[#71717a]">
                <span>Saldo Anda:</span>
                <span className="font-bold text-[#18181b]">{userBalance.toLocaleString("id-ID")} Token</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xs flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <div className="leading-relaxed">{error}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !uid || !password}
              className="w-full py-3 bg-[#18181b] hover:bg-black disabled:opacity-50 text-white font-semibold text-xs rounded-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Sedang Memproses Login...</span>
                </>
              ) : (
                <>
                  <Zap size={14} className="text-[#e26d40]" />
                  <span>Cek Info Akun ({costPerAccount} Token)</span>
                </>
              )}
            </button>

            <p className="text-[10px] text-[#71717a] text-center pt-1">
              *Biaya token dipotong per eksekusi pengecekan kredensial.
            </p>
          </form>
        </div>

        {/* Right Column: Account Detail Card */}
        <div className="lg:col-span-7 space-y-4 font-mono">
          <div className="bg-white border border-[#e4e4e7] rounded-xs p-5 shadow-xs space-y-5 min-h-[420px] flex flex-col justify-between">
            {result ? (
              <div className="space-y-5">
                {/* Result Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#e4e4e7]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xs bg-[#18181b] text-white flex items-center justify-center font-bold text-sm">
                      {result.nick ? result.nick.charAt(0).toUpperCase() : "P"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[#18181b]">
                          {result.nick || `UID: ${result.uid}`}
                        </h3>
                        {result.vip_level !== undefined && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-xs text-[10px] font-bold">
                            VIP {result.vip_level}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#71717a] flex items-center gap-2">
                        <span>UID: <strong className="text-[#18181b]">{result.uid}</strong></span>
                        {mac && (
                          <>
                            <span>•</span>
                            <span>MAC: <strong className="text-[#18181b] font-mono">{mac}</strong></span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-xs text-[10px] font-bold uppercase tracking-wider border ${
                        result.status === "success"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {result.status === "success" ? "Berhasil Login" : "Gagal Login"}
                    </span>

                    <button
                      onClick={handleCopySummary}
                      className="px-2.5 py-1 bg-[#fafafa] hover:bg-white border border-[#e4e4e7] hover:border-black rounded-xs text-[10px] font-semibold text-[#18181b] transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check size={12} className="text-emerald-600" />
                          <span>Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Salin Info</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {result.error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xs flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>Error: {result.error}</span>
                  </div>
                )}

                {/* Balance & Inventory Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Chip Card */}
                  <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-[#71717a]">
                      <span className="text-[10px] uppercase font-bold tracking-wider">Saldo Chip</span>
                      <Coins size={14} className="text-amber-500" />
                    </div>
                    <div className="text-base font-bold text-[#18181b]">
                      {formatChip(result.chip)}
                    </div>
                    <div className="text-[10px] text-[#71717a] font-mono">
                      {(result.chip ?? 0).toLocaleString("id-ID")}
                    </div>
                  </div>

                  {/* Brankas Card */}
                  <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-[#71717a]">
                      <span className="text-[10px] uppercase font-bold tracking-wider">Brankas</span>
                      <Vault size={14} className="text-blue-500" />
                    </div>
                    <div className="text-base font-bold text-[#18181b]">
                      {formatChip(result.brankas)}
                    </div>
                    <div className="text-[10px] text-[#71717a] font-mono">
                      {(result.brankas ?? 0).toLocaleString("id-ID")}
                    </div>
                  </div>

                  {/* Diamond Card */}
                  <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-[#71717a]">
                      <span className="text-[10px] uppercase font-bold tracking-wider">Diamond</span>
                      <Gem size={14} className="text-purple-500" />
                    </div>
                    <div className="text-base font-bold text-[#18181b]">
                      {(result.diamond_balance ?? 0).toLocaleString("id-ID")}
                    </div>
                    <div className="text-[10px] text-[#71717a]">Diamond Balance</div>
                  </div>
                </div>

                {/* Cards Inventory Section */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#18181b] flex items-center gap-1.5">
                      <Layers size={13} className="text-[#e26d40]" />
                      Koleksi Kartu
                    </span>
                    <span className="text-[10px] text-[#71717a]">
                      {result.cards ? Object.keys(result.cards).length : 0} Jenis Kartu
                    </span>
                  </div>

                  {result.cards && Object.keys(result.cards).length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(result.cards).map(([cardName, count]) => (
                        <div
                          key={cardName}
                          className="bg-white border border-[#e4e4e7] rounded-xs p-2.5 flex items-center justify-between text-xs"
                        >
                          <span className="font-medium text-[#18181b] truncate">{cardName}</span>
                          <span className="font-bold text-[#e26d40] px-1.5 py-0.5 bg-[#fff9f5] border border-[#f7d8c4] rounded-xs text-[10px]">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-[#fafafa] border border-[#e4e4e7] rounded-xs text-center text-xs text-[#a1a1aa] italic">
                      Tidak ada data kartu pada akun ini
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center space-y-3 my-auto">
                <div className="w-12 h-12 rounded-full bg-[#fafafa] border border-[#e4e4e7] flex items-center justify-center mx-auto text-[#71717a]">
                  <UserCheck size={20} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#18181b]">Belum Ada Akun Yang Dicek</p>
                  <p className="text-[11px] text-[#71717a] max-w-sm mx-auto">
                    Masukkan UID dan Password akun di formulir sebelah kiri untuk melihat saldo Chip, Brankas, Diamond, dan Kartu.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
