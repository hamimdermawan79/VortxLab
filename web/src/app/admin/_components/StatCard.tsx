"use client";

import React from "react";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number;
  icon?: React.ReactNode;
  accent?: string;
  subValue?: string;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  delta,
  icon,
  subValue,
  onClick
}: StatCardProps) {
  const deltaColor = delta !== undefined ? (delta >= 0 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-rose-700 bg-rose-50 border-rose-200") : "";
  const DeltaIcon = delta !== undefined ? (delta >= 0 ? ArrowUpIcon : ArrowDownIcon) : null;

  return (
    <div
      onClick={onClick}
      className={`bg-[#fafafa] hover:bg-white border border-[#e4e4e7] hover:border-black rounded-xs p-4 sm:p-5 transition-all shadow-2xs flex flex-col justify-between ${
        onClick ? "cursor-pointer group" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono font-medium text-[#71717a] uppercase tracking-wider group-hover:text-[#18181b] transition-colors">
          {label}
        </span>
        {icon && (
          <span className="p-1.5 bg-white border border-[#e4e4e7] rounded-xs text-black shadow-2xs">
            {icon}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2 flex-wrap">
        <span className="text-2xl font-bold font-mono text-[#18181b] tracking-tight">
          {value}
        </span>

        {delta !== undefined && delta !== 0 && DeltaIcon && (
          <div className={`flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-xs border ${deltaColor}`}>
            <DeltaIcon size={10} className="mr-0.5 shrink-0" />
            <span>{Math.abs(delta).toFixed(1)}%</span>
          </div>
        )}

        {subValue && (
          <span className="text-[11px] font-mono text-[#71717a]">
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}
