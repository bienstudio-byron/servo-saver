"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StationWithPrices } from "@/types/fuel";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import BrandLogo from "@/components/shared/BrandLogo";
import PriceHistory from "@/components/shared/PriceHistory";

interface Props {
  stations: StationWithPrices[];
}

export default function SuburbPageClient({ stations }: Props) {
  const [fuelType, setFuelType] = useState("U91");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const sorted = stations
    .map((s) => {
      const p = s.prices.find((pr) => pr.fuelType === fuelType);
      return p ? { station: s, price: p.price } : null;
    })
    .filter((x): x is { station: typeof stations[0]; price: number } => x !== null)
    .sort((a, b) => a.price - b.price);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {Object.entries(FUEL_TYPE_LABELS)
          .filter(([id]) => stations.some((s) => s.prices.some((p) => p.fuelType === id)))
          .map(([id, label]) => {
            const short = id === "PDSL" ? "P.Diesel" : label.replace("Unleaded ", "U").replace("Premium ", "P").replace("Ethanol ", "E").replace("Biodiesel ", "B");
            return (
              <button
                key={id}
                onClick={() => { setFuelType(id); setExpandedIndex(null); }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  id === fuelType
                    ? "bg-[#4285f4] text-white shadow-lg shadow-[#4285f4]/30"
                    : "bg-[var(--subtle)] text-[var(--muted)] hover:bg-[var(--subtle-hover)] hover:text-[var(--foreground)]"
                }`}
              >
                {short}
              </button>
            );
          })}
      </div>

      <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] overflow-hidden">
        {sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            No stations sell {FUEL_TYPE_LABELS[fuelType] ?? fuelType} in this suburb.
          </div>
        ) : (
          sorted.map(({ station, price }, i) => {
            const isExpanded = expandedIndex === i;
            return (
              <div key={station.id} className={`${i > 0 ? "border-t border-[var(--subtle-border)]" : ""} ${isExpanded ? "bg-[var(--subtle)]" : ""}`}>
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : i)}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--subtle-hover)] text-left cursor-pointer"
                >
                  <span className={`text-xs font-bold w-5 text-center shrink-0 ${
                    i === 0 ? "text-emerald-400" : "text-[var(--muted)]"
                  }`}>
                    {i + 1}
                  </span>
                  <BrandLogo brandName={station.brand?.name ?? "?"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <a
                      href={`/station/${encodeURIComponent(station.id)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-medium text-[var(--foreground)] truncate block hover:text-[var(--accent-text)] transition-colors"
                    >
                      {station.name}
                    </a>
                    <div className="text-[11px] text-[var(--muted)] truncate">
                      {station.brand?.name ?? "Unknown"} &middot; {station.address}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-sm font-bold font-mono ${
                      i === 0 ? "text-emerald-400" : "text-[var(--foreground)]"
                    }`}>
                      {price.toFixed(1)}c
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 text-[var(--muted)] transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 space-y-3">
                        {/* Price history chart */}
                        <div className="rounded-lg bg-[var(--subtle)] p-3">
                          <PriceHistory stationId={station.id} fuelType={fuelType} />
                        </div>

                        {/* All fuel prices at this station */}
                        <div>
                          <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1.5">All fuel types</div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {station.prices.map((p) => (
                              <div
                                key={p.fuelType}
                                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 ${
                                  p.fuelType === fuelType ? "bg-[#4285f4]/10" : "bg-[var(--subtle)]"
                                }`}
                              >
                                <span className="text-[10px] text-[var(--muted)]">{FUEL_TYPE_LABELS[p.fuelType] ?? p.fuelType}</span>
                                <span className="text-xs font-mono font-bold text-[var(--foreground)]">{p.price.toFixed(1)}c</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* CTA */}
                        <a
                          href={`/station/${encodeURIComponent(station.id)}`}
                          className="w-full inline-flex items-center justify-center gap-1.5 bg-[#4285f4] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#5a9bf6] transition-colors cursor-pointer"
                        >
                          View station details
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
