"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Search,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle2,
  Filter,
  Check,
  ChevronDown
} from "lucide-react";
import { StatCard } from "./StatCard";

interface TransactionsTabProps {
  transactions: any[];
  txFilter: string;
  setTxFilter: (filter: string) => void;
  approveTx: (id: string) => void;
}

const SERVICE_LABELS: Record<string, string> = {
  'sortir-banned': 'Sortir Banned',
  'data-extractor': 'Data Extractor',
  'extractor': 'Data Extractor',
  'intip-nomor': 'Intip Nomor',
  'cek-info-akun': 'Cek Info Akun',
  'topup': 'Topup',
  'activation': 'Activation',
  'adjustment': 'Adjustment',
};

export function TransactionsTab({
  transactions,
  txFilter,
  setTxFilter,
  approveTx
}: TransactionsTabProps) {
  const [dateRange, setDateRange] = useState<"today" | "7d" | "30d" | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Calculate summary from transactions
  const count = transactions.length;
  const sumAmount = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const pendingCount = transactions.filter((tx) => tx.status === "pending").length;

  // Filter by date range
  const now = new Date();
  const filteredByDate = transactions.filter((tx) => {
    const txDate = new Date(tx.created_at);
    if (dateRange === "today") {
      return txDate.toDateString() === now.toDateString();
    } else if (dateRange === "7d") {
      return now.getTime() - txDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
    } else if (dateRange === "30d") {
      return now.getTime() - txDate.getTime() <= 30 * 24 * 60 * 60 * 1000;
    }
    return true;
  });

  // Filter by search term & service type
  const filtered = filteredByDate.filter((tx) => {
    const matchSearch = searchTerm === "" || 
      (tx.profiles?.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.id || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchSearch) return false;

    if (txFilter === "all") return true;
    if (txFilter === "topup") return tx.type === "topup";
    if (txFilter === "sortir-banned") return tx.type === "sortir-banned";
    if (txFilter === "data-extractor") return tx.type === "data-extractor" || tx.type === "extractor";
    if (txFilter === "intip-nomor") return tx.type === "intip-nomor";
    if (txFilter === "cek-info-akun") return tx.type === "cek-info-akun";
    if (txFilter === "activation") return tx.type === "activation";
    if (txFilter === "adjustment") return tx.type === "adjustment";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Transaksi"
          value={count.toString()}
          icon={<CreditCard size={18} className="text-[#18181b]" />}
          subValue="Volume transaksi"
        />
        <StatCard
          label="Total Nilai Transaksi"
          value={sumAmount >= 0 ? `+${sumAmount.toLocaleString()}` : sumAmount.toLocaleString()}
          icon={<DollarSign size={18} className="text-[#18181b]" />}
          subValue="Net flow token"
        />
        <StatCard
          label="Pending Verifikasi"
          value={pendingCount.toString()}
          icon={<Clock size={18} className="text-amber-600" />}
          subValue={pendingCount > 0 ? "Perlu ditinjau" : "Semua beres"}
        />
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-[#fafafa] border border-[#e4e4e7] rounded-xs p-4 flex flex-col sm:flex-row items-center gap-3">
        {/* Service Type Filter */}
        <div className="w-full sm:w-auto relative">
          <select
            value={txFilter}
            onChange={(e) => setTxFilter(e.target.value)}
            className="w-full bg-white border border-[#e4e4e7] rounded-xs px-3 py-2 text-xs font-mono text-[#18181b] outline-none focus:border-black transition-all cursor-pointer shadow-2xs appearance-none pr-8"
          >
            <option value="topup">Filter: Topup Saja</option>
            <option value="all">Filter: Semua Tipe</option>
            <option value="sortir-banned">Sortir Banned</option>
            <option value="data-extractor">Data Extractor</option>
            <option value="intip-nomor">Intip Nomor</option>
            <option value="cek-info-akun">Cek Info Akun</option>
            <option value="activation">Aktivasi Produk</option>
            <option value="adjustment">Manual Adjustment</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
        </div>

        {/* Username Search */}
        <div className="relative flex-1 w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]"
            size={14}
          />
          <input
            type="text"
            placeholder="Cari berdasarkan username..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#e4e4e7] rounded-xs text-xs font-mono text-[#18181b] outline-none focus:border-black transition-all shadow-2xs placeholder:text-[#a1a1aa]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Date Range Selector */}
        <div className="w-full sm:w-auto relative flex items-center bg-white border border-[#e4e4e7] rounded-xs px-2.5 py-1.5 shadow-2xs">
          <Calendar size={14} className="text-[#71717a] mr-2 shrink-0" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="bg-transparent text-xs font-mono text-[#18181b] outline-none cursor-pointer pr-4 appearance-none"
          >
            <option value="all">Semua Waktu</option>
            <option value="today">Hari Ini</option>
            <option value="7d">7 Hari Terakhir</option>
            <option value="30d">30 Hari Terakhir</option>
          </select>
          <ChevronDown size={12} className="text-[#71717a] pointer-events-none" />
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-white border border-[#e4e4e7] rounded-xs shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="sticky top-0 bg-[#fafafa] border-b border-[#e4e4e7] z-10">
              <tr className="text-[#71717a] uppercase text-[10px] tracking-wider">
                <th className="px-4 py-3 font-semibold">Waktu</th>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Layanan / Tipe</th>
                <th className="px-4 py-3 font-semibold">Nominal / Token</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e4e7]">
              {filtered.length > 0 ? (
                filtered.map((tx: any) => {
                  const isCompleted = tx.status === "completed";
                  const isPending = tx.status === "pending";
                  const isExpiredOrCancelled = tx.status === "expired" || tx.status === "cancelled";

                  return (
                    <tr key={tx.id} className="hover:bg-[#fafafa] transition-colors">
                      <td className="px-4 py-3 text-[#71717a] whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="px-4 py-3 font-medium text-[#18181b]">
                        {tx.profile?.username || tx.profiles?.username || "—"}
                      </td>

                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-[#fafafa] border border-[#e4e4e7] rounded-xs text-[10px] font-semibold uppercase tracking-wider text-[#18181b]">
                          {SERVICE_LABELS[tx.type] || tx.type}
                        </span>
                      </td>

                      <td
                        className={`px-4 py-3 font-semibold ${
                          tx.amount >= 0 ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {tx.amount >= 0 ? "+" : ""}
                        {tx.amount?.toLocaleString("id-ID")}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-xs text-[10px] font-semibold uppercase tracking-wider ${
                            isCompleted
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : isPending
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : isExpiredOrCancelled
                              ? "bg-zinc-100 text-zinc-600 border border-zinc-200"
                              : "bg-red-50 text-red-600 border border-red-200"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        {isPending ? (
                          <button
                            onClick={() => approveTx(tx.id)}
                            className="px-2.5 py-1 bg-black hover:bg-[#27272a] text-white rounded-xs text-[11px] font-medium transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <Check size={11} />
                            <span>Approve</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#a1a1aa]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#71717a] font-mono">
                    Tidak ditemukan data transaksi yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}