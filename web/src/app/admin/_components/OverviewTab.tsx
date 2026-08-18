"use client";

import React, { useState } from "react";
import {
  Users,
  ArrowUpRight,
  Clock,
  CircleDollarSign,
  Coins,
  Activity,
  BarChart3,
  Folder,
  Sliders,
  Package,
  TrendingUp,
  ShieldCheck,
  Zap,
  Eye,
  UserCheck,
  HardDrive,
  ExternalLink
} from "lucide-react";
import { StatCard } from "./StatCard";
import { LineChart } from "./LineChart";
import { DonutChart } from "./DonutChart";
import { EngineHealthCard } from "./EngineHealthCard";

interface OverviewTabProps {
  stats: any;
  setActiveTab?: (tab: string) => void;
  onManageUsers?: () => void;
  onManagePricing?: () => void;
  onManageProducts?: () => void;
  onManageFiles?: () => void;
}

const SERVICE_LABELS: Record<string, string> = {
  'sortir-banned': 'Sortir Banned',
  'data-extractor': 'Data Extractor',
  'intip-nomor': 'Intip Nomor',
  'cek-info-akun': 'Cek Info Akun',
  'topup': 'Topup',
  'activation': 'Activation',
  'adjustment': 'Adjustment'
};

export function OverviewTab({
  stats,
  setActiveTab,
  onManageUsers,
  onManagePricing,
  onManageProducts,
  onManageFiles,
}: OverviewTabProps) {
  const [chartTab, setChartTab] = useState<"visitors" | "features" | "topup">("visitors");

  // Calculate delta percentage
  const getDelta = () => {
    const today = stats?.revenueToday || 0;
    const yesterday = stats?.revenueYesterday || 0;
    if (yesterday === 0) return today > 0 ? 100 : 0;
    return ((today - yesterday) / yesterday) * 100;
  };

  const delta = getDelta();

  const revenueToday = stats?.revenueToday || 0;
  const topupThisMonth = stats?.topupThisMonth || { sum: 0, count: 0 };
  const pendingApprovals = stats?.pendingApprovals || 0;
  const totalCirculation = stats?.totalCirculation || 0;
  const activeUsers7d = stats?.activeUsers7d || 0;
  const topUpTrend30d = stats?.topUpTrend30d || [];
  const revenueByService = stats?.revenueByService || [];
  const topSpenders7d = stats?.topSpenders7d || [];
  const recentActivity = stats?.recentActivity || [];
  const totalUsers = stats?.totalUsers || 0;
  const totalVolume = stats?.totalVolume || 0;

  const viewsToday = stats?.visitors?.viewsToday || 0;
  const uniqueToday = stats?.visitors?.uniqueToday || 0;
  const visitorTrend30d = stats?.visitors?.trend30d || [];

  const totalFiles = stats?.storage?.totalFiles ?? 0;
  const totalSizeFormatted = stats?.storage?.totalSizeFormatted ?? "0 Bytes";

  return (
    <div className="space-y-6">
      {/* Quick Action Bar */}
      <div className="flex items-center justify-between gap-3 p-3 bg-[#fafafa] border border-[#e4e4e7] rounded-xs flex-wrap">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-[#e26d40]" />
          <span className="text-xs font-mono font-medium text-[#18181b]">
            Pusat Kontrol &amp; Telemetri VortX Labs
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onManageFiles && (
            <button
              onClick={onManageFiles}
              className="px-3 py-1 bg-white hover:bg-[#fafafa] border border-[#e4e4e7] hover:border-black rounded-xs text-[11px] font-medium text-[#18181b] transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <HardDrive size={12} className="text-[#e26d40]" />
              <span>Storage VPS ({totalFiles} File · {totalSizeFormatted})</span>
            </button>
          )}
          {onManageUsers && (
            <button
              onClick={onManageUsers}
              className="px-3 py-1 bg-white hover:bg-[#fafafa] border border-[#e4e4e7] hover:border-black rounded-xs text-[11px] font-medium text-[#18181b] transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Users size={12} />
              <span>Kelola User ({totalUsers})</span>
            </button>
          )}
          {onManagePricing && (
            <button
              onClick={onManagePricing}
              className="px-3 py-1 bg-white hover:bg-[#fafafa] border border-[#e4e4e7] hover:border-black rounded-xs text-[11px] font-medium text-[#18181b] transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Coins size={12} />
              <span>Harga Layanan</span>
            </button>
          )}
          {onManageProducts && (
            <button
              onClick={onManageProducts}
              className="px-3 py-1 bg-white hover:bg-[#fafafa] border border-[#e4e4e7] hover:border-black rounded-xs text-[11px] font-medium text-[#18181b] transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Package size={12} />
              <span>Produk Rental</span>
            </button>
          )}
        </div>
      </div>

      {/* Realtime Engine Health & VPS Telemetry Card */}
      <EngineHealthCard />

      {/* Row 1 — Primary KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pengunjung Hari Ini"
          value={`${viewsToday.toLocaleString()} views`}
          subValue={`${uniqueToday.toLocaleString()} unique IP`}
          icon={<Eye size={16} />}
        />
        <StatCard
          label="Revenue Hari Ini"
          value={`Rp ${revenueToday.toLocaleString("id-ID")}`}
          delta={delta}
          icon={<CircleDollarSign size={16} />}
        />
        <StatCard
          label="Topup Bulan Ini"
          value={`Rp ${(topupThisMonth.sum || 0).toLocaleString("id-ID")}`}
          icon={<ArrowUpRight size={16} />}
          subValue={`${topupThisMonth.count || 0} topup`}
        />
        <StatCard
          label="Token Beredar"
          value={totalCirculation.toLocaleString("id-ID")}
          icon={<Coins size={16} />}
          subValue="Total Saldo User"
        />
      </div>

      {/* Row 2 — Secondary KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Pengguna"
          value={totalUsers.toLocaleString()}
          icon={<Users size={16} />}
          onClick={onManageUsers}
        />
        <StatCard
          label="User Aktif (7 Hari)"
          value={activeUsers7d}
          icon={<Activity size={16} />}
        />
        <StatCard
          label="Storage VPS Data"
          value={totalSizeFormatted}
          subValue={`${totalFiles} file terunggah`}
          icon={<HardDrive size={16} />}
          onClick={onManageFiles}
        />
        <StatCard
          label="Topup Pending"
          value={pendingApprovals}
          icon={<Clock size={16} />}
          onClick={() => setActiveTab?.("transactions")}
        />
      </div>

      {/* Row 3 — Visual Interactive Line Charts */}
      <div className="bg-white border border-[#e4e4e7] rounded-xs p-5 shadow-xs space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e4e4e7] pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[#e26d40]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181b]">
              Grafik Analitik &amp; Tren Data (30 Hari)
            </h3>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1 bg-[#fafafa] p-1 border border-[#e4e4e7] rounded-xs text-[11px]">
            <button
              onClick={() => setChartTab("visitors")}
              className={`px-3 py-1 rounded-xs font-semibold transition-all cursor-pointer ${
                chartTab === "visitors"
                  ? "bg-black text-white shadow-2xs"
                  : "text-[#71717a] hover:text-black"
              }`}
            >
              Pengunjung Web
            </button>
            <button
              onClick={() => setChartTab("features")}
              className={`px-3 py-1 rounded-xs font-semibold transition-all cursor-pointer ${
                chartTab === "features"
                  ? "bg-black text-white shadow-2xs"
                  : "text-[#71717a] hover:text-black"
              }`}
            >
              Eksekusi Fitur
            </button>
            <button
              onClick={() => setChartTab("topup")}
              className={`px-3 py-1 rounded-xs font-semibold transition-all cursor-pointer ${
                chartTab === "topup"
                  ? "bg-black text-white shadow-2xs"
                  : "text-[#71717a] hover:text-black"
              }`}
            >
              Nominal Topup
            </button>
          </div>
        </div>

        {/* 1. Visitors Line Chart */}
        {chartTab === "visitors" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-[#71717a]">
              <span>Tren traffic harian (Page Views vs Unique Visitors)</span>
              <span className="font-semibold text-black">
                Total Hari Ini: {viewsToday} Views · {uniqueToday} Unique IP
              </span>
            </div>

            {visitorTrend30d.length > 1 ? (
              <LineChart
                labels={visitorTrend30d.map((item: any) => item.date)}
                series={[
                  {
                    key: "page-views",
                    label: "Page Views",
                    color: "#18181b",
                    data: visitorTrend30d.map((item: any) => item.views),
                  },
                  {
                    key: "unique-ips",
                    label: "Unique Visitors",
                    color: "#e26d40",
                    data: visitorTrend30d.map((item: any) => item.unique),
                  },
                ]}
                width={700}
                height={220}
              />
            ) : (
              <div className="h-44 flex flex-col items-center justify-center bg-[#fafafa] border border-[#e4e4e7] rounded-xs text-center p-4">
                <Eye size={20} className="text-[#71717a] mb-1.5 opacity-60" />
                <span className="text-xs text-[#18181b] font-semibold">Data Pengunjung Aktif</span>
                <span className="text-[11px] text-[#71717a] mt-0.5">
                  Traffic hari ini tercatat {viewsToday} views ({uniqueToday} unique IP). Grafik multi-hari akan otomatis terbentuk seiring berjalannya waktu.
                </span>
              </div>
            )}
          </div>
        )}

        {/* 2. Features Usage Multi-Line Chart */}
        {chartTab === "features" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-[#71717a]">
              <span>Volume eksekusi akun per layanan (Sortir Banned, Extractor, Intip Nomor, Cek Info Akun)</span>
            </div>

            {stats?.featureTrend30d &&
            stats.featureTrend30d.series &&
            stats.featureTrend30d.series.length > 0 ? (
              <LineChart
                labels={stats.featureTrend30d.labels}
                series={stats.featureTrend30d.series}
                width={700}
                height={220}
              />
            ) : (
              <div className="h-44 flex items-center justify-center bg-[#fafafa] border border-[#e4e4e7] rounded-xs">
                <span className="text-[#71717a] text-xs font-mono">Belum ada riwayat eksekusi fitur</span>
              </div>
            )}
          </div>
        )}

        {/* 3. Topup Trend Line Chart */}
        {chartTab === "topup" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-[#71717a]">
              <span>Nominal pembayaran topup QRIS / Manual sukses (IDR)</span>
              <span className="font-semibold text-black">
                Total Bulan Ini: Rp {(topupThisMonth.sum || 0).toLocaleString("id-ID")}
              </span>
            </div>

            {topUpTrend30d.length > 1 ? (
              <LineChart
                labels={topUpTrend30d.map((item: any) => item.date)}
                series={[
                  {
                    key: "topup-trend",
                    label: "Nominal Topup (IDR)",
                    color: "#18181b",
                    data: topUpTrend30d.map((item: any) => item.amount),
                  },
                ]}
                width={700}
                height={220}
              />
            ) : (
              <div className="h-44 flex items-center justify-center bg-[#fafafa] border border-[#e4e4e7] rounded-xs">
                <span className="text-[#71717a] text-xs font-mono">Belum ada riwayat topup</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Row 4 — Revenue Distribution & Spenders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Revenue Breakdown per Service */}
        <div className="lg:col-span-5 bg-white border border-[#e4e4e7] rounded-xs p-5 shadow-xs space-y-4 font-mono">
          <div className="flex items-center justify-between pb-3 border-b border-[#e4e4e7]">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-[#18181b]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181b]">
                Distribusi Pendapatan Layanan
              </h3>
            </div>
          </div>

          <DonutChart
            data={revenueByService.map((s: any) => ({
              service: SERVICE_LABELS[s.service] || s.service,
              revenue: s.revenue,
            }))}
            size={180}
          />
        </div>

        {/* Top 5 Users by Token Spent */}
        <div className="lg:col-span-7 bg-white border border-[#e4e4e7] rounded-xs p-5 shadow-xs space-y-4 font-mono">
          <div className="flex items-center justify-between pb-3 border-b border-[#e4e4e7]">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#18181b]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181b]">
                Top 5 Pengguna Terbanyak (7 Hari)
              </h3>
            </div>
          </div>

          {topSpenders7d.length > 0 ? (
            <div className="space-y-2">
              {topSpenders7d.map((spender: any, idx: number) => (
                <div
                  key={spender.username || idx}
                  className="flex items-center justify-between p-2.5 bg-[#fafafa] border border-[#e4e4e7] rounded-xs text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-xs bg-black text-white flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-[#18181b]">{spender.username}</span>
                  </div>
                  <span className="font-bold text-[#e26d40]">
                    {spender.total_spent.toLocaleString("id-ID")} token
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center bg-[#fafafa] border border-[#e4e4e7] rounded-xs">
              <span className="text-[#71717a] text-xs font-mono">Belum ada data transaksi</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}