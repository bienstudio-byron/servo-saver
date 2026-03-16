"use client";

import { useEffect, useState } from "react";

interface PricePoint {
  price: number;
  captured_at: string;
}

interface PriceHistoryProps {
  stationId: string;
  fuelType: string;
}

export default function PriceHistory({ stationId, fuelType }: PriceHistoryProps) {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/history?stationId=${encodeURIComponent(stationId)}&fuelType=${fuelType}&days=30`)
      .then((r) => r.json())
      .then((data) => {
        setHistory(data.history || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [stationId, fuelType]);

  if (loading) {
    return (
      <div className="h-16 flex items-center justify-center">
        <div className="h-3 w-3 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (history.length < 2) {
    return (
      <div className="text-[10px] text-[#5f6368] text-center py-2">
        Price history will appear after more data is collected
      </div>
    );
  }

  // Deduplicate by day — keep last price per day
  const byDay = new Map<string, PricePoint>();
  for (const p of history) {
    const day = p.captured_at.slice(0, 10);
    byDay.set(day, p);
  }
  const points = [...byDay.values()].sort(
    (a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()
  );

  if (points.length < 2) {
    return (
      <div className="text-[10px] text-[#5f6368] text-center py-2">
        Price history will appear after more data is collected
      </div>
    );
  }

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const current = prices[prices.length - 1];
  const first = prices[0];
  const diff = current - first;
  const isUp = diff > 0;
  const isFlat = Math.abs(diff) < 0.5;

  // SVG sparkline
  const width = 280;
  const height = 48;
  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const pathPoints = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * chartWidth;
    const y = padding + (1 - (p.price - min) / range) * chartHeight;
    return `${x},${y}`;
  });

  const linePath = `M${pathPoints.join(" L")}`;

  // Gradient fill under the line
  const firstPoint = pathPoints[0];
  const lastPoint = pathPoints[pathPoints.length - 1];
  const fillPath = `${linePath} L${padding + chartWidth},${padding + chartHeight} L${padding},${padding + chartHeight} Z`;

  const lineColor = isFlat ? "#9aa0a6" : isUp ? "#ef4444" : "#22c55e";

  // Date labels
  const firstDate = new Date(points[0].captured_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  const lastDate = new Date(points[points.length - 1].captured_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[#5f6368]">30-day price trend</span>
        <span className={`text-[10px] font-bold font-mono ${isFlat ? "text-[#9aa0a6]" : isUp ? "text-red-400" : "text-emerald-400"}`}>
          {isFlat ? "Stable" : isUp ? `+${diff.toFixed(1)}c` : `${diff.toFixed(1)}c`}
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${stationId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#grad-${stationId})`} />
        <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Current price dot */}
        <circle
          cx={padding + chartWidth}
          cy={padding + (1 - (current - min) / range) * chartHeight}
          r="3"
          fill={lineColor}
        />
      </svg>

      <div className="flex justify-between text-[9px] text-[#5f6368]">
        <span>{firstDate}</span>
        <span>{lastDate}</span>
      </div>
    </div>
  );
}
