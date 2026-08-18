"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, Timer, Copy, Check } from "lucide-react";

function PayPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("invoice");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState("pending");
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const QRIS_TIMEOUT_MIN = 15; // QRIS biasanya expire dalam 15 menit

  const fetchData = async () => {
    if (!invoiceId) { setError("Invoice tidak valid"); setLoading(false); return; }
    try {
      const res = await fetch(`/api/pay?invoice_id=${invoiceId}`);
      if (!res.ok) { setError("Transaksi tidak ditemukan"); setLoading(false); return; }
      const d = await res.json();
      setData(d);
      setStatus(d.status);
      setLoading(false);
    } catch { setError("Gagal memuat data"); setLoading(false); }
  };

  const checkStatus = async () => {
    if (!invoiceId || status === "completed") return;
    try {
      const res = await fetch(`/api/topup/status?invoice_id=${invoiceId}`);
      if (res.ok) {
        const d = await res.json();
        setStatus(d.status);
        if (d.status === "completed") {
          setData((prev: any) => prev ? { ...prev, status: "completed" } : prev);
        }
      }
    } catch { /* silent */ }
  };

  useEffect(() => { fetchData(); }, [invoiceId]);

  useEffect(() => {
    if (status === "completed") return;
    const iv = setInterval(checkStatus, 3000);
    return () => clearInterval(iv);
  }, [invoiceId, status]);

  useEffect(() => {
    if (status === "completed") return;
    const iv = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(iv);
  }, [status]);

  const copyInvoice = () => {
    if (!invoiceId) return;
    navigator.clipboard.writeText(invoiceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const minutesLeft = Math.max(0, QRIS_TIMEOUT_MIN - Math.floor(elapsed / 60));
  const secondsLeft = Math.max(0, (QRIS_TIMEOUT_MIN * 60 - elapsed) % 60);
  const isExpired = elapsed >= QRIS_TIMEOUT_MIN * 60;

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="bg-surface border border-border rounded-lg p-8 text-center max-w-sm w-full">
          <AlertCircle className="mx-auto mb-3 text-red" size={40} />
          <h2 className="text-lg font-bold mb-2">Terjadi Kesalahan</h2>
          <p className="text-sm text-text-muted mb-4">{error}</p>
          <button onClick={() => router.push("/dashboard/topup")} className="py-2.5 px-6 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors">
            Kembali
          </button>
        </div>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="bg-surface border border-border rounded-lg p-8 text-center max-w-sm w-full">
          <CheckCircle2 className="mx-auto mb-3 text-green" size={48} />
          <h2 className="text-xl font-bold mb-2">Pembayaran Berhasil!</h2>
          <p className="text-sm text-text-muted mb-6">Token Anda telah ditambahkan.</p>
          <div className="space-y-3">
            <button onClick={() => router.push("/dashboard")} className="w-full py-2.5 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors">
              Ke Dashboard
            </button>
            <button onClick={() => router.push("/dashboard/topup")} className="w-full py-2.5 bg-surface-alt text-text-muted text-sm font-medium rounded-lg hover:bg-border transition-colors">
              Topup Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold mb-1">Pembayaran QRIS</h1>
          <p className="text-sm text-text-muted">Scan kode QR menggunakan aplikasi e-wallet atau bank</p>
        </div>

        {/* Amount */}
        <div className="bg-surface border border-border rounded-lg p-5 text-center mb-5">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Total Pembayaran</p>
          <p className="text-3xl font-bold text-accent">
            Rp {data?.amount?.toLocaleString("id-ID") || "0"}
          </p>
        </div>

        {/* Timer */}
        {!isExpired && (
          <div className="flex items-center justify-center gap-2 text-sm text-yellow mb-4">
            <Timer size={16} />
            <span>Berlaku {minutesLeft}:{secondsLeft.toString().padStart(2, "0")}</span>
          </div>
        )}
        {isExpired && (
          <div className="flex items-center justify-center gap-2 text-sm text-red mb-4">
            <AlertCircle size={16} />
            <span>QRIS telah expired. Silakan buat transaksi baru.</span>
          </div>
        )}

        {/* QRIS Image */}
        <div className="bg-white rounded-lg p-6 mb-5 flex items-center justify-center border border-border">
          {data?.qris_url && !isExpired ? (
            <img src={data.qris_url} alt="QRIS" className="w-56 h-56 object-contain" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-text-muted text-sm">
              QRIS tidak tersedia
            </div>
          )}
        </div>

        {/* Invoice ID */}
        <div className="bg-surface border border-border rounded-lg p-3 flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-text-muted">ID Invoice</p>
            <p className="text-sm font-mono font-medium">{invoiceId}</p>
          </div>
          <button onClick={copyInvoice} className="p-2 rounded-lg hover:bg-surface-alt transition-colors">
            {copied ? <Check size={16} className="text-green" /> : <Copy size={16} className="text-text-muted" />}
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-2 text-sm mb-5">
          <div className="w-2 h-2 rounded-full bg-yellow animate-pulse" />
          <span className="text-text-muted">Menunggu pembayaran...</span>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button onClick={checkStatus} className="w-full py-2.5 bg-surface-alt text-text text-sm font-medium rounded-lg hover:bg-border transition-colors flex items-center justify-center gap-2">
            <RefreshCw size={16} /> Cek Status
          </button>
          <button onClick={() => router.push("/dashboard/topup")} className="w-full py-2.5 bg-surface-alt text-text-muted text-sm font-medium rounded-lg hover:bg-border transition-colors flex items-center justify-center gap-2">
            <ArrowLeft size={16} /> Kembali
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-text-muted mt-6">
          Pastikan nominal pembayaran sesuai. Jangan tutup halaman ini sebelum pembayaran selesai.
        </p>
      </div>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PayPageInner />
    </Suspense>
  );
}
