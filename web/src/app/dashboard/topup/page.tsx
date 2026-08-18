"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Wallet,
  CheckCircle2,
  AlertCircle,
  QrCode,
  RefreshCw,
  Zap,
  ShieldCheck,
  Clock,
  ExternalLink,
  Copy,
  Check,
  CreditCard,
  X,
  Trash2
} from "lucide-react";
import VortXLogo from "@/components/VortXLogo";
import Footer from "@/components/Footer";

interface TopupPreset {
  nominal: number;
  label: string;
  tag?: string;
  bonusPercent?: number;
}

const PRESETS: TopupPreset[] = [
  { nominal: 10000, label: "Starter" },
  { nominal: 25000, label: "Basic" },
  { nominal: 50000, label: "Popular", tag: "POPULAR", bonusPercent: 5 },
  { nominal: 100000, label: "Pro", tag: "+10% BONUS", bonusPercent: 10 },
  { nominal: 250000, label: "Power", tag: "+15% BONUS", bonusPercent: 15 },
  { nominal: 500000, label: "Enterprise", tag: "+20% BONUS", bonusPercent: 20 },
];

const MIN_TOPUP = 10000;

export default function TopupPage() {
  const router = useRouter();
  const [selectedNominal, setSelectedNominal] = useState<number>(50000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [error, setError] = useState("");
  
  // Payment states
  const [paymentUrl, setPaymentUrl] = useState("");
  const [qrisUrl, setQrisUrl] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [copiedInvoice, setCopiedInvoice] = useState(false);
  
  const [userBalance, setUserBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pendingTx, setPendingTx] = useState<any>(null);
  const [cancellingPending, setCancellingPending] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadBalance = async () => {
    setIsRefreshingBalance(true);
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const p = await res.json();
        setUserBalance(p.vcoin_balance || 0);
      }
    } catch {}
    finally {
      setIsRefreshingBalance(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const res = await fetch("/api/transactions?type=topup&page=1&limit=5");
      if (res.ok) {
        const data = await res.json();
        const txList = data.transactions || [];
        setTransactions(txList);
        const pending = txList.find((t: any) => {
          if (t.status !== "pending") return false;
          const ageMs = Date.now() - new Date(t.created_at).getTime();
          return ageMs < 15 * 60 * 1000;
        });
        setPendingTx(pending || null);
      }
    } catch {}
  };

  useEffect(() => {
    loadBalance();
    loadTransactions();
  }, []);

  // Live polling when QRIS checkout is active
  useEffect(() => {
    if (!invoiceId || isPaid) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/topup/status?invoice_id=${invoiceId}&t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "completed") {
            setIsPaid(true);
            clearInterval(interval);
            await loadBalance();
            await loadTransactions();
          }
        }
      } catch (err) {}
    }, 2500);

    return () => clearInterval(interval);
  }, [invoiceId, isPaid]);

  // Calculations
  const currentNominal = customAmount ? parseInt(customAmount, 10) || 0 : selectedNominal;
  const currentPreset = PRESETS.find(p => p.nominal === currentNominal);
  const bonusMultiplier = currentPreset?.bonusPercent ? currentPreset.bonusPercent / 100 : 0;
  const baseTokens = currentNominal;
  const bonusTokens = Math.round(baseTokens * bonusMultiplier);
  const totalTokensReceived = baseTokens + bonusTokens;

  const handleSelectPreset = (nom: number) => {
    setSelectedNominal(nom);
    setCustomAmount("");
    setError("");
  };

  const handleCustomChange = (val: string) => {
    setCustomAmount(val);
    setSelectedNominal(0);
    setError("");
  };

  const handleAddQuickAmount = (increment: number) => {
    const prev = customAmount ? parseInt(customAmount, 10) || 0 : selectedNominal || 0;
    const next = prev + increment;
    setCustomAmount(next.toString());
    setSelectedNominal(0);
    setError("");
  };

  const handleTopup = async () => {
    if (currentNominal < MIN_TOPUP) {
      setError(`Minimal nominal topup adalah Rp ${MIN_TOPUP.toLocaleString("id-ID")}`);
      return;
    }
    setLoading(true);
    setError("");
    setPaymentUrl("");
    setQrisUrl("");
    setInvoiceId("");
    setIsPaid(false);

    try {
      const res = await fetch("/api/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: currentNominal })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.details || "Gagal membuat invoice pembayaran");
        return;
      }
      setPaymentUrl(data.payment_url || "");
      setQrisUrl(data.qris_url || "");
      setInvoiceId(data.invoice_id || "");
    } catch {
      setError("Koneksi ke server pembayaran gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInvoice = () => {
    if (!invoiceId) return;
    navigator.clipboard.writeText(invoiceId);
    setCopiedInvoice(true);
    setTimeout(() => setCopiedInvoice(false), 2000);
  };

  const handleResumePending = () => {
    if (!pendingTx) return;
    const meta = pendingTx.meta_data || {};
    if (meta.qris_url) {
      setQrisUrl(meta.qris_url);
      setPaymentUrl(meta.payment_url || "");
      setInvoiceId(meta.cashi_order_id || meta.bayargg_invoice_id || "");
    }
  };

  const handleCancelPending = async (txId?: string) => {
    setCancellingPending(true);
    try {
      const targetId = txId || pendingTx?.id;
      const res = await fetch("/api/topup/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txId: targetId }),
      });
      if (res.ok) {
        setPendingTx(null);
        await loadTransactions();
      }
    } catch (e) {
      console.error("Cancel topup error:", e);
    } finally {
      setCancellingPending(false);
    }
  };

  // Remaining time for active pending invoice (15 minutes limit)
  const pendingCreatedAt = pendingTx ? new Date(pendingTx.created_at).getTime() : 0;
  const pendingAgeSec = Math.floor((currentTime - pendingCreatedAt) / 1000);
  const remainingSec = Math.max(0, 15 * 60 - pendingAgeSec);
  const remMin = Math.floor(remainingSec / 60);
  const remSec = remainingSec % 60;

  return (
    <div className="min-h-screen bg-white text-[#18181b] flex flex-col font-mono selection:bg-black selection:text-white">
      {/* Top Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#e4e4e7] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => router.push("/dashboard")}>
            <VortXLogo size="lg" />
          </div>

          {/* Centered Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#71717a] absolute left-1/2 -translate-x-1/2">
            <button onClick={() => router.push("/dashboard?tab=inference")} className="hover:text-[#e26d40] transition-colors">
              Dashboard
            </button>
            <button onClick={() => router.push("/dashboard?tab=models")} className="hover:text-[#e26d40] transition-colors">
              Models
            </button>
            <button onClick={() => router.push("/dashboard?tab=playground")} className="hover:text-[#e26d40] transition-colors">
              Playground
            </button>
            <button onClick={() => router.push("/dashboard?tab=higgs")} className="hover:text-[#e26d40] transition-colors">
              Higgs Tools
            </button>
            <button onClick={() => router.push("/docs")} className="hover:text-[#e26d40] transition-colors">
              &lt;/&gt; API Docs
            </button>
            <button onClick={() => router.push("/dashboard/topup")} className="text-[#e26d40] font-bold">
              Add Token
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {/* Live Token Badge */}
            <div className="flex items-center gap-2 bg-[#fafafa] border border-[#e4e4e7] rounded-full px-3.5 py-1.5 text-xs shadow-2xs">
              <Wallet size={14} className="text-black shrink-0" />
              <span className="font-mono font-bold text-black">
                {userBalance.toLocaleString()}
              </span>
              <button
                onClick={loadBalance}
                title="Refresh token"
                className="text-[#71717a] hover:text-black transition-colors p-0.5 ml-0.5 cursor-pointer"
              >
                <RefreshCw size={12} className={isRefreshingBalance ? "animate-spin text-black" : ""} />
              </button>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-1.5 bg-black hover:bg-[#27272a] text-white rounded-full text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Mobile Navigation Strip */}
        <div className="md:hidden border-t border-[#e4e4e7] bg-[#fafafa] px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none shadow-2xs">
          <button
            onClick={() => router.push("/dashboard?tab=inference")}
            className="px-3 py-1.5 rounded-xs text-xs font-semibold whitespace-nowrap bg-white border border-[#e4e4e7] text-[#71717a] hover:text-black transition-all cursor-pointer"
          >
            Dashboard
          </button>
          <button
            onClick={() => router.push("/dashboard?tab=models")}
            className="px-3 py-1.5 rounded-xs text-xs font-semibold whitespace-nowrap bg-white border border-[#e4e4e7] text-[#71717a] hover:text-black transition-all cursor-pointer"
          >
            Models
          </button>
          <button
            onClick={() => router.push("/dashboard?tab=playground")}
            className="px-3 py-1.5 rounded-xs text-xs font-semibold whitespace-nowrap bg-white border border-[#e4e4e7] text-[#71717a] hover:text-black transition-all cursor-pointer"
          >
            Playground
          </button>
          <button
            onClick={() => router.push("/dashboard?tab=higgs")}
            className="px-3 py-1.5 rounded-xs text-xs font-semibold whitespace-nowrap bg-white border border-[#e4e4e7] text-[#71717a] hover:text-black transition-all cursor-pointer"
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
            className="px-3 py-1.5 rounded-xs text-xs font-semibold whitespace-nowrap bg-black text-white transition-all shadow-2xs font-bold cursor-pointer"
          >
            Add Token
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        {/* Page Title */}
        <div className="pb-4 border-b border-[#e4e4e7]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-[#71717a]">1 IDR = 1 Token</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#18181b]">
            Top Up Token
          </h1>
        </div>

        {/* Pending Invoice Notification Banner */}
        {pendingTx && !paymentUrl && remainingSec > 0 && (
          <div className="bg-[#fff9f6] border border-[#f7d8c4] rounded-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs animate-in fade-in">
            <div className="flex items-start gap-3">
              <Clock size={18} className="text-[#e26d40] mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-[#18181b]">
                    Transaksi Tertunda: Rp {pendingTx.amount.toLocaleString("id-ID")}
                  </p>
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xs font-mono font-medium">
                    Sisa {remMin}:{remSec.toString().padStart(2, "0")}
                  </span>
                </div>
                <p className="text-[11px] text-[#71717a] mt-0.5">
                  Anda memiliki invoice QRIS aktif. Lanjutkan pembayaran atau batalkan invoice ini untuk membuat baru.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleCancelPending(pendingTx.id)}
                disabled={cancellingPending}
                className="px-3 py-1.5 bg-white border border-[#e4e4e7] hover:border-red-300 hover:bg-red-50 text-red-600 text-xs font-medium rounded-xs transition-all shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <X size={13} />
                <span>{cancellingPending ? "Membatalkan..." : "Batalkan Invoice"}</span>
              </button>
              <button
                onClick={handleResumePending}
                className="px-3.5 py-1.5 bg-black hover:bg-[#27272a] text-white text-xs font-medium rounded-xs transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <QrCode size={13} />
                <span>Lanjutkan QRIS</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Interface: Form vs Active QRIS Screen */}
        {!paymentUrl ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Preset Cards & Custom Input (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Preset Cards Grid */}
              <div className="bg-white border border-[#e4e4e7] rounded-xs p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#18181b]">
                    1. Pilih Paket Token
                  </span>
                  <span className="text-[11px] text-[#71717a]">Klik kartu untuk memilih</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PRESETS.map((preset) => {
                    const isSelected = selectedNominal === preset.nominal && !customAmount;
                    const calculatedBonus = preset.bonusPercent
                      ? Math.round(preset.nominal * (preset.bonusPercent / 100))
                      : 0;
                    const totalTokens = preset.nominal + calculatedBonus;

                    return (
                      <button
                        key={preset.nominal}
                        onClick={() => handleSelectPreset(preset.nominal)}
                        className={`relative p-3.5 text-left rounded-xs border transition-all flex flex-col justify-between min-h-[96px] ${
                          isSelected
                            ? "bg-black border-black text-white shadow-xs"
                            : "bg-[#fafafa] border-[#e4e4e7] text-[#18181b] hover:border-black hover:bg-white"
                        }`}
                      >
                        {preset.tag && (
                          <span
                            className={`absolute top-2 right-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-xs tracking-wider uppercase ${
                              isSelected
                                ? "bg-white text-black"
                                : "bg-black text-white"
                            }`}
                          >
                            {preset.tag}
                          </span>
                        )}

                        <div>
                          <p className={`text-[11px] uppercase tracking-wider font-medium ${isSelected ? "text-zinc-300" : "text-[#71717a]"}`}>
                            {preset.label}
                          </p>
                          <p className="text-sm sm:text-base font-semibold mt-0.5 font-mono">
                            Rp {preset.nominal.toLocaleString("id-ID")}
                          </p>
                        </div>

                        <div className="pt-2 mt-auto border-t border-current/10">
                          <p className={`text-xs font-semibold ${isSelected ? "text-white" : "text-black"}`}>
                            {totalTokens.toLocaleString("id-ID")} <span className="text-[10px] font-normal opacity-80">Token</span>
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Nominal Box */}
              <div className="bg-white border border-[#e4e4e7] rounded-xs p-5 sm:p-6 shadow-xs space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#18181b] block">
                  2. Atau Masukkan Nominal Custom
                </span>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#71717a]">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => handleCustomChange(e.target.value)}
                    placeholder="Contoh: 150000 (Min. 10.000)"
                    min="10000"
                    step="1000"
                    className="w-full bg-[#fafafa] border border-[#e4e4e7] rounded-xs pl-10 pr-4 py-2.5 text-xs text-[#18181b] font-mono outline-none focus:border-black focus:bg-white transition-all"
                  />
                </div>

                {/* Quick Add Increment Pills */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-[#71717a] mr-1">Tambah cepat:</span>
                  {[10000, 25000, 50000, 100000].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => handleAddQuickAmount(inc)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-white border border-[#e4e4e7] hover:border-black rounded-xs text-[#18181b] transition-colors"
                    >
                      +Rp {inc.toLocaleString("id-ID")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Supported Payment Channels */}
              <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#71717a]">
                <div className="flex items-center gap-2">
                  <QrCode size={18} className="text-black shrink-0" />
                  <div>
                    <p className="font-semibold text-[#18181b]">QRIS Instan Nasional (Semua Bank & e-Wallet)</p>
                    <p className="text-[11px]">BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, ShopeePay, LinkAja</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xs text-[10px] font-semibold tracking-wider uppercase whitespace-nowrap self-start sm:self-auto">
                  0% FEE ADMIN
                </span>
              </div>
            </div>

            {/* Right Column: Order Summary & Checkout Action (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Order Summary Card */}
              <div className="bg-white border border-[#e4e4e7] rounded-xs p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#e4e4e7]">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#18181b]">
                    Ringkasan Pesanan
                  </h3>
                  <span className="text-[11px] text-[#71717a] font-mono">1 IDR = 1 Token</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center text-[#71717a]">
                    <span>Nominal</span>
                    <span className="font-semibold font-mono text-[#18181b]">
                      Rp {currentNominal.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[#71717a]">
                    <span>Token</span>
                    <span className="font-semibold font-mono text-[#18181b]">
                      {baseTokens.toLocaleString("id-ID")} Token
                    </span>
                  </div>

                  {bonusTokens > 0 && (
                    <div className="flex justify-between items-center text-emerald-700 bg-emerald-50 p-2 rounded-xs border border-emerald-200">
                      <span>Bonus (+{currentPreset?.bonusPercent}%)</span>
                      <span className="font-semibold font-mono">
                        +{bonusTokens.toLocaleString("id-ID")} Token
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[#71717a]">
                    <span>Biaya Admin</span>
                    <span className="font-semibold text-emerald-700">Rp 0</span>
                  </div>

                  <div className="pt-3 border-t border-[#e4e4e7] space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-semibold text-[#18181b]">Total Token</span>
                      <span className="text-lg font-bold font-mono text-black">
                        {totalTokensReceived.toLocaleString("id-ID")} Token
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline text-[11px] text-[#71717a]">
                      <span>Total Bayar</span>
                      <span className="font-semibold font-mono text-[#18181b]">
                        Rp {currentNominal.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="text-red text-xs p-3 bg-red-light rounded-xs flex items-center gap-2 font-normal border border-red/20">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={handleTopup}
                  disabled={loading || currentNominal < MIN_TOPUP}
                  className="w-full py-3.5 bg-black hover:bg-[#27272a] text-white text-xs font-semibold rounded-xs transition-all disabled:opacity-40 uppercase tracking-wider shadow-xs flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Membuat Invoice QRIS...</span>
                    </>
                  ) : (
                    <>
                      <QrCode size={15} />
                      <span>Bayar Rp {currentNominal.toLocaleString("id-ID")} via QRIS</span>
                    </>
                  )}
                </button>
              </div>

              {/* Recent Transactions List */}
              <div className="bg-white border border-[#e4e4e7] rounded-xs p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#e4e4e7]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#18181b]">
                    Riwayat Top Up Terakhir
                  </span>
                  <button onClick={loadTransactions} className="text-[#71717a] hover:text-black">
                    <RefreshCw size={12} />
                  </button>
                </div>

                {transactions.length === 0 ? (
                  <p className="text-xs text-[#71717a] py-3 text-center">Belum ada riwayat topup.</p>
                ) : (
                  <div className="space-y-2">
                    {transactions.slice(0, 4).map((tx) => {
                      const isComp = tx.status === "completed";
                      const isPend = tx.status === "pending";
                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-2.5 bg-[#fafafa] border border-[#e4e4e7] rounded-xs text-xs"
                        >
                          <div>
                            <p className="font-semibold text-[#18181b]">Rp {tx.amount.toLocaleString("id-ID")}</p>
                            <p className="text-[10px] text-[#71717a]">
                              {new Date(tx.created_at).toLocaleString("id-ID", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-xs uppercase tracking-wider ${
                              isComp
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : isPend
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : tx.status === "expired" || tx.status === "cancelled"
                                ? "bg-zinc-100 text-zinc-600 border border-zinc-200"
                                : "bg-red-50 text-red-600 border border-red-200"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Active Payment Screen (QRIS Checkout View) */
          <div className="max-w-xl mx-auto space-y-6">
            {isPaid ? (
              /* Success Screen */
              <div className="bg-white border border-[#e4e4e7] rounded-xs p-8 text-center shadow-md space-y-5 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-700">
                  <CheckCircle2 size={36} />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-[#18181b] tracking-tight">
                    Pembayaran Berhasil!
                  </h2>
                  <p className="text-xs text-[#71717a]">
                    Token komputasi telah berhasil ditambahkan ke saldo akun Anda.
                  </p>
                </div>

                <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-4 max-w-sm mx-auto space-y-2 text-xs">
                  <div className="flex justify-between text-[#71717a]">
                    <span>Nominal:</span>
                    <span className="font-semibold font-mono text-[#18181b]">
                      Rp {currentNominal.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#71717a]">
                    <span>Saldo Token Sekarang:</span>
                    <span className="font-semibold font-mono text-emerald-700">
                      {userBalance.toLocaleString("id-ID")} Token
                    </span>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="w-full py-3 bg-black hover:bg-[#27272a] text-white text-xs font-semibold rounded-xs uppercase tracking-wider transition-all shadow-xs"
                  >
                    Buka Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setPaymentUrl("");
                      setIsPaid(false);
                      setInvoiceId("");
                      setSelectedNominal(50000);
                      setCustomAmount("");
                    }}
                    className="w-full py-2.5 bg-white border border-[#e4e4e7] text-[#18181b] text-xs font-medium rounded-xs hover:bg-[#fafafa] transition-all"
                  >
                    Top Up Lagi
                  </button>
                </div>
              </div>
            ) : (
              /* QRIS Scan Screen */
              <div className="bg-white border border-[#e4e4e7] rounded-xs p-6 sm:p-8 shadow-md space-y-6 text-center">
                {/* Live Status Pulse */}
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>Menunggu Pembayaran Masuk...</span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-[#18181b]">
                    Scan QRIS untuk Menyelesaikan
                  </h2>
                  <p className="text-xs text-[#71717a]">
                    Buka aplikasi m-Banking (BCA, Mandiri, BRI, BNI) atau e-Wallet (GoPay, OVO, DANA, ShopeePay)
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="p-4 bg-[#fafafa] border border-[#e4e4e7] rounded-xs inline-block mx-auto shadow-2xs">
                  {qrisUrl ? (
                    <img
                      src={qrisUrl}
                      alt="QRIS Code"
                      className="w-64 h-64 mx-auto object-contain bg-white p-2 border border-[#e4e4e7] rounded-xs"
                    />
                  ) : (
                    <div className="w-64 h-64 flex flex-col items-center justify-center gap-2 text-xs text-[#71717a]">
                      <RefreshCw size={24} className="animate-spin" />
                      <span>Memuat kode QR...</span>
                    </div>
                  )}
                </div>

                {/* Amount & Invoice Info Box */}
                <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-4 space-y-2 text-xs text-left max-w-sm mx-auto">
                  <div className="flex justify-between items-center text-[#71717a]">
                    <span>Total Pembayaran</span>
                    <span className="text-base font-bold font-mono text-black">
                      Rp {currentNominal.toLocaleString("id-ID")}
                    </span>
                  </div>
                  {invoiceId && (
                    <div className="flex justify-between items-center text-[#71717a] pt-2 border-t border-[#e4e4e7]">
                      <span>Invoice ID</span>
                      <button
                        onClick={handleCopyInvoice}
                        className="flex items-center gap-1 font-mono text-black font-semibold hover:underline"
                      >
                        <span>{invoiceId}</span>
                        {copiedInvoice ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2.5 max-w-sm mx-auto pt-2">
                  {paymentUrl && (
                    <a
                      href={paymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-black hover:bg-[#27272a] text-white text-xs font-semibold rounded-xs transition-all uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs"
                    >
                      <span>Buka Halaman Cashi.id</span>
                      <ExternalLink size={14} />
                    </a>
                  )}

                  <button
                    onClick={() => {
                      setPaymentUrl("");
                      setInvoiceId("");
                      setQrisUrl("");
                    }}
                    className="w-full py-2.5 bg-white border border-[#e4e4e7] hover:bg-[#fafafa] text-xs font-medium text-[#71717a] hover:text-[#18181b] rounded-xs transition-colors"
                  >
                    Ganti Nominal / Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}