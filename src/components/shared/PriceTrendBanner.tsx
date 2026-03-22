"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, X, ChevronDown } from "lucide-react";
import { useFuelStore } from "@/stores/fuel-store";

interface TrendData {
  fuelType: string;
  today: number;
  yesterday: number;
  weekAgo: number;
  weekAvg: number;
  dailyAvgs: { day: string; avg_price: number }[];
  direction: "rising" | "falling" | "stable";
  changeFromYesterday: number;
  changeFromWeekAgo: number;
  message: string;
  urgency: "fill-now" | "wait" | "neutral";
}

export default function PriceTrendBanner() {
  const selectedFuelType = useFuelStore((s) => s.selectedFuelType);
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setDismissed(false);
    fetch(`/api/price-trend?fuelType=${selectedFuelType}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data && !data.error) setTrend(data); })
      .catch(() => {});
  }, [selectedFuelType]);

  if (!trend || dismissed) return null;

  const icon = trend.direction === "rising"
    ? <TrendingUp className="h-4 w-4 shrink-0" strokeWidth={2} />
    : trend.direction === "falling"
    ? <TrendingDown className="h-4 w-4 shrink-0" strokeWidth={2} />
    : <Minus className="h-4 w-4 shrink-0" strokeWidth={2} />;

  const bgColor = trend.urgency === "fill-now"
    ? "bg-[var(--tier-exp)]/10 border-[var(--tier-exp)]/20"
    : trend.urgency === "wait"
    ? "bg-[var(--tier-cheap)]/10 border-[var(--tier-cheap)]/20"
    : "bg-[var(--subtle)] border-[var(--subtle-border)]";

  const textColor = trend.urgency === "fill-now"
    ? "text-[var(--tier-exp)]"
    : trend.urgency === "wait"
    ? "text-[var(--tier-cheap)]"
    : "text-[var(--foreground)]";

  const urgencyLabel = trend.urgency === "fill-now"
    ? "Fill now"
    : trend.urgency === "wait"
    ? "Wait"
    : "No rush";

  // Mini sparkline from daily averages
  const prices = trend.dailyAvgs.map((d) => d.avg_price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const sparkW = 60;
  const sparkH = 20;
  const sparkPoints = prices.map((p, i) =>
    `${(i / (prices.length - 1)) * sparkW},${sparkH - ((p - min) / range) * sparkH}`
  ).join(" ");
  const sparkColor = trend.direction === "rising" ? "var(--tier-exp)" : trend.direction === "falling" ? "var(--tier-cheap)" : "var(--muted)";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className={`shrink-0 border-b ${bgColor}`}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-3 py-2 flex items-center gap-2 cursor-pointer"
        >
          <span className={textColor}>{icon}</span>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold uppercase ${textColor}`}>{urgencyLabel}</span>
              <span className="text-[10px] text-[var(--muted)] truncate">{trend.message}</span>
            </div>
          </div>
          {/* Mini sparkline */}
          <svg width={sparkW} height={sparkH} className="shrink-0">
            <polyline
              points={sparkPoints}
              fill="none"
              stroke={sparkColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <button onClick={(e) => { e.stopPropagation(); setDismissed(true); }} className="p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer shrink-0">
            <X className="h-3 w-3" strokeWidth={2} />
          </button>
        </button>

        {/* Expanded detail */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-2.5 space-y-1.5">
                <div className="flex gap-3 text-[10px]">
                  <div className="flex-1 bg-[var(--card)] rounded-lg px-2 py-1.5 text-center">
                    <div className="text-[var(--muted)]">Today</div>
                    <div className="font-bold font-mono text-[var(--foreground)]">{trend.today.toFixed(1)}c</div>
                  </div>
                  <div className="flex-1 bg-[var(--card)] rounded-lg px-2 py-1.5 text-center">
                    <div className="text-[var(--muted)]">Yesterday</div>
                    <div className="font-bold font-mono text-[var(--foreground)]">{trend.yesterday.toFixed(1)}c</div>
                    <div className={`text-[9px] font-mono ${trend.changeFromYesterday > 0 ? "text-[var(--tier-exp)]" : trend.changeFromYesterday < 0 ? "text-[var(--tier-cheap)]" : "text-[var(--muted)]"}`}>
                      {trend.changeFromYesterday > 0 ? "+" : ""}{trend.changeFromYesterday.toFixed(1)}c
                    </div>
                  </div>
                  <div className="flex-1 bg-[var(--card)] rounded-lg px-2 py-1.5 text-center">
                    <div className="text-[var(--muted)]">7d avg</div>
                    <div className="font-bold font-mono text-[var(--foreground)]">{trend.weekAvg.toFixed(1)}c</div>
                    <div className={`text-[9px] font-mono ${trend.changeFromWeekAgo > 0 ? "text-[var(--tier-exp)]" : trend.changeFromWeekAgo < 0 ? "text-[var(--tier-cheap)]" : "text-[var(--muted)]"}`}>
                      {trend.changeFromWeekAgo > 0 ? "+" : ""}{trend.changeFromWeekAgo.toFixed(1)}c/wk
                    </div>
                  </div>
                </div>
                {/* Sparkline full width */}
                <div className="bg-[var(--card)] rounded-lg p-2">
                  <svg viewBox={`0 0 ${sparkW} ${sparkH}`} className="w-full h-6" preserveAspectRatio="none">
                    <polyline
                      points={sparkPoints}
                      fill="none"
                      stroke={sparkColor}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx={(prices.length - 1) / (prices.length - 1) * sparkW}
                      cy={sparkH - ((prices[prices.length - 1] - min) / range) * sparkH}
                      r="2"
                      fill={sparkColor}
                    />
                  </svg>
                  <div className="flex justify-between text-[8px] text-[var(--muted)] mt-0.5">
                    {trend.dailyAvgs.length > 0 && (
                      <>
                        <span>{new Date(trend.dailyAvgs[0].day).toLocaleDateString("en-AU", { weekday: "short" })}</span>
                        <span>{new Date(trend.dailyAvgs[trend.dailyAvgs.length - 1].day).toLocaleDateString("en-AU", { weekday: "short" })}</span>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-[9px] text-[var(--muted)]">
                  Based on {selectedFuelType} average across all stations. Updates daily.
                  {" "}<a href="/how-it-works#price-trends" className="text-[var(--accent-text)] hover:text-[var(--foreground)] transition-colors">How this works →</a>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
