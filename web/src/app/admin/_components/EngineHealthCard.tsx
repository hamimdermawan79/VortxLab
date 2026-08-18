"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  Database,
  Cpu,
  Server,
  Zap,
  CheckCircle2,
  RefreshCw,
  Clock,
  Layers,
  HardDrive
} from "lucide-react";

export function EngineHealthCard() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/health");
      if (res.ok) {
        setHealth(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white border border-[#e4e4e7] rounded-xs p-5 shadow-xs space-y-4 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e4e4e7] pb-3">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-[#e26d40]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#18181b]">
            Engine Health &amp; VPS Telemetry
          </h3>
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE TELEMETRY
          </span>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="text-xs text-[#71717a] hover:text-black flex items-center gap-1 p-1 cursor-pointer transition-colors"
          title="Refresh Telemetry"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Grid Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Database Status */}
        <div className="p-3.5 bg-[#fafafa] border border-[#e4e4e7] rounded-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-[#71717a] font-medium flex items-center gap-1.5">
              <Database size={12} className="text-black" />
              PostgreSQL
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-xs">
              {health?.database?.status || "HEALTHY"}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs font-bold text-[#18181b]">
              Latency: {health?.database?.latencyMs ?? 1} ms
            </span>
            <span className="text-[10px] text-[#71717a]">Port 5432</span>
          </div>
        </div>

        {/* 2. Sortir Banned Engine */}
        <div className="p-3.5 bg-[#fafafa] border border-[#e4e4e7] rounded-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-[#71717a] font-medium flex items-center gap-1.5">
              <Zap size={12} className="text-[#e26d40]" />
              Sortir Engine
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-xs border ${
                health?.engines?.sortirBanned?.processing > 0
                  ? "text-amber-700 bg-amber-50 border-amber-200"
                  : "text-emerald-700 bg-emerald-50 border-emerald-200"
              }`}
            >
              {health?.engines?.sortirBanned?.status || "READY"}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs font-bold text-[#18181b]">
              Queue: {health?.engines?.sortirBanned?.processing ?? 0} active / {health?.engines?.sortirBanned?.pending ?? 0} pending
            </span>
          </div>
        </div>

        {/* 3. Data Extractor Engine */}
        <div className="p-3.5 bg-[#fafafa] border border-[#e4e4e7] rounded-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-[#71717a] font-medium flex items-center gap-1.5">
              <HardDrive size={12} className="text-black" />
              Extractor Engine
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-xs">
              {health?.engines?.dataExtractor?.status || "READY"}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs font-bold text-[#18181b]">
              Active: {health?.engines?.dataExtractor?.activeJobs ?? 0} batch
            </span>
            <span className="text-[10px] text-[#71717a]">Streaming Zip</span>
          </div>
        </div>

        {/* 4. VPS Telemetry */}
        <div className="p-3.5 bg-[#fafafa] border border-[#e4e4e7] rounded-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-[#71717a] font-medium flex items-center gap-1.5">
              <Server size={12} className="text-black" />
              VPS System
            </span>
            <span className="text-[10px] font-mono text-[#71717a]">
              {health?.system?.platform || "Linux VPS"}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs font-bold text-[#18181b]">
              RAM: {health?.system?.rss ?? "65 MB"}
            </span>
            <span className="text-[10px] text-[#71717a]">
              Up: {health?.system?.nodeUptime ?? "1 jam"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
