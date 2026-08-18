"use client";

import React from "react";

interface DonutChartProps {
  data: { service: string; revenue: number }[];
  size?: number;
  colors?: string[];
}

const DEFAULT_COLORS = [
  "#18181b", // Black
  "#e26d40", // VortX Terra-cotta
  "#059669", // Emerald
  "#d97706", // Amber
  "#6366f1", // Indigo
  "#71717a", // Zinc
];

export function DonutChart({
  data,
  size = 200,
  colors = DEFAULT_COLORS
}: DonutChartProps) {
  if (data.length === 0 || data.every((d) => d.revenue === 0)) {
    return (
      <div className="flex items-center justify-center bg-[#fafafa] border border-[#e4e4e7] rounded-xs" style={{ width: "100%", height: size }}>
        <span className="text-[#71717a] text-xs font-mono">Belum ada data transaksi</span>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.revenue, 0);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;

  let currentAngle = -90; // Start from top
  const segments = data.map((d, i) => {
    const sliceAngle = (d.revenue / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArc = sliceAngle > 180 ? 1 : 0;
    const color = colors[i % colors.length];

    return {
      path: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color,
      label: d.service,
      value: d.revenue,
      percentage: ((d.revenue / total) * 100).toFixed(1),
    };
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => (
          <path
            key={i}
            d={seg.path}
            fill={seg.color}
            stroke="#ffffff"
            strokeWidth="2"
          />
        ))}
        {/* Center circle for donut effect */}
        <circle cx={cx} cy={cy} r={radius * 0.62} fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="9" fill="#71717a" fontFamily="monospace">
          TOTAL
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#18181b" fontFamily="monospace">
          {total.toLocaleString()}
        </text>
      </svg>

      {/* Legend */}
      <div className="w-full space-y-1.5 text-xs font-mono">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between p-1.5 bg-[#fafafa] border border-[#e4e4e7] rounded-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-[#18181b] font-medium truncate">{seg.label}</span>
            </div>
            <span className="text-[#71717a] shrink-0 font-semibold">{seg.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}