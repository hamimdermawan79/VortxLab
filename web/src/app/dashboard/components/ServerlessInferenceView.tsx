"use client";

import React, { useState, useEffect } from "react";
import {
  Key,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Shield,
  Coins,
  X
} from "lucide-react";

interface ServerlessInferenceViewProps {
  userBalance: number;
  onOpenPlayground: () => void;
  onOpenTopup: () => void;
}

export default function ServerlessInferenceView({
  userBalance,
  onOpenPlayground,
  onOpenTopup
}: ServerlessInferenceViewProps) {
  const [copiedBaseUrl, setCopiedBaseUrl] = useState(false);
  const [apiKey, setApiKey] = useState<{ id: string; name: string; key: string; createdAt: string } | null>(null);
  const [isLoadingKey, setIsLoadingKey] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherMsg, setVoucherMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [localBonusTokens, setLocalBonusTokens] = useState(0);
  const [creditLogs, setCreditLogs] = useState<Array<{ desc: string; amount: string; date: string }>>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load API key on mount
  useEffect(() => {
    fetchApiKey();
  }, []);

  const fetchApiKey = async () => {
    setIsLoadingKey(true);
    try {
      const res = await fetch("/api/api-keys");
      const data = await res.json();
      if (data.key) {
        setApiKey({
          id: data.key.id,
          name: data.key.name,
          key: data.key.key,
          createdAt: new Date(data.key.createdAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric"
          })
        });
      }
    } catch (e) {
      console.error("Failed to load api key:", e);
    } finally {
      setIsLoadingKey(false);
    }
  };

  const copyBaseUrl = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://vortxlab.my.id";
    navigator.clipboard.writeText(`${origin}/api`);
    setCopiedBaseUrl(true);
    setTimeout(() => setCopiedBaseUrl(false), 2000);
  };

  const copyApiKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey.key);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const executeRegenerateKey = async () => {
    if (isRegenerating) return;
    setIsRegenerating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.key) {
        setApiKey({
          id: data.key.id,
          name: data.key.name,
          key: data.key.key,
          createdAt: "Baru saja",
        });
        setShowRegenerateModal(false);
      } else if (data.message) {
        alert(data.message);
      }
    } catch (e) {
      console.error("Error regenerating key:", e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRedeemVoucher = () => {
    if (!voucherCode.trim()) return;
    const code = voucherCode.trim().toUpperCase();
    if (code.startsWith("VORTX") || code.startsWith("JVO") || code.startsWith("AI")) {
      const addedTokens = 50000;
      setLocalBonusTokens((prev) => prev + addedTokens);
      setCreditLogs((prev) => [{ desc: `Voucher (${code})`, amount: `+${addedTokens.toLocaleString()} token`, date: "Baru saja" }, ...prev]);
      setVoucherMsg({ type: "success", text: `Voucher ${code} berhasil diklaim! +${addedTokens.toLocaleString()} token telah ditambahkan.` });
      setVoucherCode("");
    } else {
      setVoucherMsg({ type: "error", text: "Kode voucher tidak valid atau telah kedaluwarsa." });
    }
  };

  const handleRefreshTokens = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const totalDisplayTokens = userBalance + localBonusTokens;

  return (
    <div className="space-y-6 animate-in fade-in duration-150 font-mono">
      {/* Top Header */}
      <div className="pb-3 border-b border-[#f7d8c4]">
        <h1 className="text-2xl font-semibold text-[#18181b] tracking-tight">
          Dashboard
        </h1>
      </div>

      {/* 3 Quick Setup Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Base URL */}
        <div className="bg-white border border-[#f7d8c4] rounded-xs p-4 hover:border-[#e26d40] transition-all flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[#71717a]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#e26d40]">BASE URL</span>
              <Shield size={13} className="text-[#e26d40]" />
            </div>
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-xs font-semibold text-[#18181b] font-mono">vortxlab.my.id/api</span>
              <button
                onClick={copyBaseUrl}
                className="text-[#71717a] hover:text-[#e26d40] transition-colors p-1 cursor-pointer"
                title="Copy Base URL"
              >
                {copiedBaseUrl ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-[#71717a] mt-2">
            Base URL untuk pemanggilan REST API Sortir Banned &amp; AI inference.
          </p>
        </div>

        {/* Card 2: API Key */}
        <div className="bg-white border border-[#f7d8c4] rounded-xs p-4 hover:border-[#e26d40] transition-all flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[#71717a]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#e26d40]">API KEY</span>
              <Key size={13} className="text-[#e26d40]" />
            </div>
            <p className="text-xs font-semibold text-[#18181b] pt-0.5">sk-vrtx-••••••••</p>
          </div>
          <p className="text-[11px] text-[#71717a] mt-2">
            Sertakan Authorization: Bearer sk-vrtx-... pada request header.
          </p>
        </div>

        {/* Card 3: Playground */}
        <div className="bg-white border border-[#f7d8c4] rounded-xs p-4 hover:border-[#e26d40] transition-all flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[#71717a]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#e26d40]">PLAYGROUND</span>
              <Sparkles size={13} className="text-[#e26d40]" />
            </div>
            <p className="text-xs font-semibold text-[#18181b] pt-0.5">Test Models</p>
          </div>
          <p className="text-[11px] text-[#71717a] mt-2">
            Uji coba penalaran model AI secara interaktif di playground.
          </p>
        </div>
      </div>

      {/* Account Tokens & Topup Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Token Balance Card */}
        <div className="lg:col-span-6 bg-white border border-[#f7d8c4] rounded-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Coins size={16} className="text-[#e26d40]" />
              <h3 className="text-xs font-bold text-[#e26d40] uppercase tracking-wider">
                Token Balance
              </h3>
            </div>

            <div className="mt-4">
              <h2 className="text-3xl sm:text-4xl font-semibold text-[#e26d40] font-mono tracking-tight">
                {totalDisplayTokens.toLocaleString()}{" "}
                <span className="text-sm font-normal text-[#71717a]">token</span>
              </h2>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#f7d8c4] flex items-center justify-start">
            <button
              onClick={handleRefreshTokens}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-[#f7d8c4] bg-[#fff9f5] hover:bg-[#fef4ed] text-[10px] font-semibold text-[#e26d40] uppercase tracking-wider transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw size={11} className={isRefreshing ? "animate-spin" : ""} />
              Refresh Saldo
            </button>
          </div>
        </div>

        {/* Right: TopUp Token */}
        <div className="lg:col-span-6 bg-white border border-[#f7d8c4] rounded-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#e26d40] uppercase tracking-wider">
              TopUp Token
            </h3>
            <span className="text-[10px] text-[#71717a] font-mono">
              QRIS Otomatis
            </span>
          </div>

          {/* Quick preset buttons */}
          <div className="grid grid-cols-3 gap-2.5">
            {["10.000 Token", "25.000 Token", "50.000 Token"].map((tier) => (
              <button
                key={tier}
                onClick={onOpenTopup}
                className="py-2 rounded-xs border border-[#f7d8c4] bg-[#fff9f5] hover:bg-[#fef4ed] text-xs font-semibold font-mono text-[#e26d40] hover:border-[#e26d40] transition-all text-center cursor-pointer shadow-2xs"
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Voucher Code Form */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] block">
              Klaim Voucher
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="VORTX-..."
                className="flex-1 bg-white border border-[#f7d8c4] rounded-xs px-3 py-1.5 text-xs font-mono text-[#18181b] outline-none focus:border-[#e26d40] placeholder:text-[#a1a1aa] transition-all"
              />
              <button
                onClick={handleRedeemVoucher}
                disabled={!voucherCode.trim()}
                className="px-3.5 py-1.5 bg-[#e26d40] hover:bg-[#ce592c] disabled:opacity-40 text-white rounded-xs text-xs font-semibold tracking-wider uppercase transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <Check size={12} />
                Klaim
              </button>
            </div>
            {voucherMsg && (
              <div
                className={`text-xs p-2 rounded-xs flex items-center gap-1.5 ${
                  voucherMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                <AlertCircle size={13} />
                {voucherMsg.text}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* API Key Panel (Single Key per Account, Clean Re-generate) */}
      <div className="bg-white border border-[#f7d8c4] rounded-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#f7d8c4]">
          <Key size={16} className="text-[#e26d40]" />
          <h3 className="text-xs font-bold text-[#e26d40] uppercase tracking-wider">
            API Key
          </h3>
        </div>

        <p className="text-xs text-[#71717a] leading-relaxed">
          Gunakan API Key ini pada Header <code className="text-[#18181b] bg-[#fff9f5] px-1.5 py-0.5 border border-[#f7d8c4] rounded-xs font-semibold">Authorization: Bearer sk-vrtx-...</code> untuk memanggil REST API Sortir Banned &amp; AI Models.
        </p>

        {/* Single API Key Display Box */}
        {isLoadingKey ? (
          <div className="p-4 text-xs text-[#71717a] text-center bg-[#fff9f5] border border-[#f7d8c4] rounded-xs">
            Memuat API Key...
          </div>
        ) : apiKey ? (
          <div className="bg-[#fff9f5] border border-[#f7d8c4] rounded-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#18181b]">Active API Key</span>
                <span className="text-[10px] text-[#71717a] font-mono">
                  Dibuat: {apiKey.createdAt}
                </span>
              </div>
              <code className="text-xs font-mono text-[#18181b] break-all font-semibold block">
                {apiKey.key.slice(0, 12)}••••••••••••••••••••{apiKey.key.slice(-6)}
              </code>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={copyApiKey}
                className="px-3 py-1.5 bg-white border border-[#f7d8c4] hover:border-[#e26d40] hover:bg-[#fef4ed] rounded-xs text-xs font-semibold text-[#e26d40] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check size={12} className="text-emerald-700" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} className="text-[#e26d40]" />
                    <span>Copy Key</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setShowRegenerateModal(true)}
                disabled={isRegenerating}
                className="px-3 py-1.5 bg-[#18181b] hover:bg-[#e26d40] disabled:opacity-50 text-white rounded-xs text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Cabut key lama dan generate key baru"
              >
                <RefreshCw size={12} className={isRegenerating ? "animate-spin" : ""} />
                <span>{isRegenerating ? "Re-generating..." : "Re-generate Key"}</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Interactive In-App Modal for Key Regeneration */}
      {showRegenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#f7d8c4] rounded-xs p-6 w-full max-w-md space-y-4 shadow-xl font-mono">
            <div className="flex items-center justify-between border-b border-[#f7d8c4] pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-[#e26d40]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#18181b]">
                  Konfirmasi Re-generate Key
                </h4>
              </div>
              <button
                onClick={() => !isRegenerating && setShowRegenerateModal(false)}
                className="text-[#71717a] hover:text-[#18181b] cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-[#71717a] leading-relaxed">
              <p className="text-[#18181b]">
                Apakah Anda yakin ingin me-regenerate API Key akun Anda?
              </p>
              <div className="p-3 bg-[#fff9f5] border border-[#f7d8c4] rounded-xs text-[11px] text-[#2b1b17] space-y-1.5">
                <p className="font-bold text-[#e26d40] flex items-center gap-1">
                  <span>⚠️ Perhatian Penting</span>
                </p>
                <p>
                  API Key saat ini (<code className="font-bold text-[#18181b]">{apiKey ? `${apiKey.key.slice(0, 12)}...` : ""}</code>) akan <strong>langsung dicabut &amp; dihapus permanen</strong> dari database.
                </p>
                <p className="text-[#71717a]">
                  Semua script calling API atau bot yang menggunakan key lama akan terhenti hingga Anda memperbarui konfigurasinya dengan key baru.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f7d8c4]">
              <button
                onClick={() => setShowRegenerateModal(false)}
                disabled={isRegenerating}
                className="px-4 py-2 bg-[#fafafa] hover:bg-[#f4f4f5] border border-[#e4e4e7] rounded-xs text-xs font-semibold text-[#18181b] transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={executeRegenerateKey}
                disabled={isRegenerating}
                className="px-4 py-2 bg-[#18181b] hover:bg-[#e26d40] text-white rounded-xs text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={12} className={isRegenerating ? "animate-spin" : ""} />
                <span>{isRegenerating ? "Memproses..." : "Ya, Re-generate Key"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
