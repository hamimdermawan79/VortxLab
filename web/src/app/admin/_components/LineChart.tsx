"use client";

import React from "react";

interface LineSeries {
  key: string;
  label: string;
  color: string;
  data: number[];
}

interface MultiLineChartProps {
  labels: string[];
  series: LineSeries[];
  width?: number;
  height?: number;
  color?: string;
}

export function LineChart({
  labels,
  series,
  width = 600,
  height = 200,
  color = "#a1a1aa"
}: MultiLineChartProps) {
  if (labels.length < 2 || series.length === 0) {
    return (
      <div className="flex items-center justify-center bg-[#fafafa] border border-[#e4e4e7] rounded-xs" style={{ width: "100%", height }}>
        <span className="text-[#71717a] text-xs font-mono">Belum ada data visualisasi</span>
      </div>
    );
  }

  const padding = 35;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;

  // Flatten all data to find global min/max
  const allValues = series.flatMap((s) => s.data);
  const minValue = Math.min(0, ...allValues);
  const maxValue = Math.max(1, ...allValues);
  const range = maxValue - minValue || 1;

  // Generate points for each series
  const seriesPoints = series.map((seriesData) => {
    return seriesData.data
      .map((value, i) => {
        const x = padding + (i / (labels.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
        return `${x},${y}`;
      })
      .join(" ");
  });

  // Generate X-axis labels
  const labelInterval = Math.max(1, Math.ceil(labels.length / 6));
  const xLabels = labels
    .filter((_, i) => i % labelInterval === 0)
    .map((date, i) => {
      const idx = i * labelInterval;
      const x = padding + (idx / (labels.length - 1)) * chartWidth;
      return (
        <text
          key={idx}
          x={x}
          y={height - 8}
          textAnchor="middle"
          fontSize="9"
          fontFamily="monospace"
          fill="#71717a"
        >
          {new Date(date).toLocaleDateString("id", { day: "numeric", month: "short" })}
        </text>
      );
    });

  // Generate Y-axis labels
  const yLabels = [
    { value: maxValue, position: padding },
    { value: Math.round(minValue + range / 2), position: padding + chartHeight / 2 },
    { value: minValue, position: padding + chartHeight }
  ].map((label, i) => (
    <text
      key={i}
      x={padding - 6}
      y={label.position + 3}
      textAnchor="end"
      dominantBaseline="middle"
      fontSize="9"
      fontFamily="monospace"
      fill="#71717a"
    >
      {label.value.toLocaleString()}
    </text>
  ));

  return (
    <div className="w-full overflow-x-auto">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="min-w-full overflow-visible">
        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#e4e4e7" strokeWidth="1" strokeDasharray="3,3" />
        <line x1={padding} y1={padding + chartHeight / 2} x2={width - padding} y2={padding + chartHeight / 2} stroke="#e4e4e7" strokeWidth="1" strokeDasharray="3,3" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e4e4e7" strokeWidth="1" />

        {/* Y-axis labels */}
        {yLabels}

        {/* X-axis labels */}
        {xLabels}

        {/* Lines and area under each series */}
        {series.map((seriesData, idx) => (
          <g key={seriesData.key}>
            {/* Smooth area fill */}
            <polygon
              fill={seriesData.color}
              fillOpacity="0.08"
              points={`${padding},${height - padding} ${seriesPoints[idx]} ${padding + chartWidth},${height - padding}`}
            />
            {/* Polyline */}
            <polyline
              fill="none"
              stroke={seriesData.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={seriesPoints[idx]}
            />
            {/* Dots */}
            {seriesData.data.map((value, i) => {
              const x = padding + (i / (labels.length - 1)) * chartWidth;
              const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
              return (
                <circle
                  key={`${seriesData.key}-${i}`}
                  cx={x}
                  cy={y}
                  r="2.5"
                  fill="#ffffff"
                  stroke={seriesData.color}
                  strokeWidth="1.5"
                />
              );
            })}
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 justify-center">
        {series.map((seriesData) => (
          <div key={seriesData.key} className="flex items-center gap-1.5 text-xs font-mono">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: seriesData.color }}
            />
            <span className="text-[#71717a] font-medium">{seriesData.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}