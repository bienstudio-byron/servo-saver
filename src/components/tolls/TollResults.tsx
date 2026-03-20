"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, Fuel, DollarSign, TriangleAlert, Search, X, Zap, ChevronDown } from "lucide-react";
import { useTollStore } from "@/stores/toll-store";
import { useVehicleStore } from "@/stores/vehicle-store";
import type { TimePeriod, TollSegment } from "@/types/toll";
import SidebarFooter from "@/components/shared/SidebarFooter";

const PERIODS: { id: TimePeriod; label: string; desc: string }[] = [
  { id: "peak", label: "Peak", desc: "7-9am, 4-7pm" },
  { id: "offPeak", label: "Off-Peak", desc: "Other weekday" },
  { id: "weekend", label: "Weekend", desc: "Sat + Sun" },
];

function Row({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="flex items-start gap-2.5 px-3.5 py-2">
      <span className="mt-0.5 text-[var(--muted)] shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-[var(--muted)]">{label}</span>
          <span className={`text-[11px] font-bold font-mono shrink-0 ${color || "text-[var(--foreground)]"}`}>{value}</span>
        </div>
        {sub && <div className="text-[9px] text-[var(--muted)] mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function TollBreakdown({ segments, timePeriod }: { segments: TollSegment[]; timePeriod: TimePeriod }) {
  const [open, setOpen] = useState(false);
  if (segments.length === 0) return null;
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1 cursor-pointer">
        <span className={`inline-block transition-transform duration-200 ${open ? "rotate-90" : ""}`}>&#9654;</span>
        Toll breakdown ({segments.length} segment{segments.length > 1 ? "s" : ""})
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="mt-1.5 space-y-1">
              {segments.map((s) => (
                <div key={s.id} className="flex justify-between text-[10px] px-2 py-1 rounded bg-[var(--subtle)]">
                  <span className="text-[var(--muted)] truncate flex-1">{s.name}</span>
                  <span className="font-mono text-[var(--foreground)] shrink-0 ml-2">${((s.pricing[timePeriod] ?? 0) / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsChip({ label, value, active, children }: { label: string; value: string; active?: boolean; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer border ${active ? "bg-[var(--subtle)] text-[var(--foreground)] border-[#4285f4]/30" : "bg-[var(--subtle)] text-[var(--muted)] border-[var(--subtle-border)] hover:text-[var(--foreground)]"}`}>
        {label && <span>{label}</span>}
        <span className="font-bold font-mono">{value}</span>
        <ChevronDown className={`h-2.5 w-2.5 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 mt-1 rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] shadow-2xl overflow-hidden z-50 min-w-[140px]">
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TollResults() {
  const { comparison, settings, loading, error, quotaExceeded, updateSettings } = useTollStore();
  const vehicleProfile = useVehicleStore((s) => s.profile);
  const costModel = useVehicleStore((s) => s.costModel);

  // Don't render if no comparison and not loading
  if (!comparison && !loading && !error && !quotaExceeded) return null;

  const vehicle = vehicleProfile;
  const originLabel = useTollStore.getState().origin?.label?.split(",")[0] || "Origin";
  const destLabel = useTollStore.getState().destination?.label?.split(",")[0] || "Destination";

  const handleClear = () => {
    useTollStore.setState({ comparison: null, tollRouteData: null, freeRouteData: null, origin: null, destination: null, error: null });
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] max-h-[100dvh] md:bottom-4 md:left-4 md:right-auto md:w-[380px] md:max-h-[80vh] flex flex-col items-stretch">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-h-[50vh] md:max-h-[80vh] rounded-t-2xl md:rounded-2xl border-t md:border border-[var(--subtle-border)] bg-[var(--card)]/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
          <div>
            <div className="text-sm font-bold text-[var(--foreground)]">{originLabel} → {destLabel}</div>
            {loading && <div className="text-[11px] text-[var(--muted)]">Comparing routes...</div>}
          </div>
          <button onClick={handleClear} className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8">
              <div className="h-5 w-5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
            </div>
          )}

          {error && (
            <div className="px-4 pb-4">
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-[var(--tier-exp)]">{error}</div>
            </div>
          )}

          {quotaExceeded && (
            <div className="px-4 pb-4">
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-[var(--tier-mid)]">
                Daily routing limit reached (2,000 requests). Try again tomorrow.
              </div>
            </div>
          )}

          {comparison && !loading && (() => {
            const hasTolls = comparison.tollBreakdown.length > 0;
            const freeIsBetter = comparison.savings > 0;
            const savingsAbs = Math.abs(comparison.savings);
            const timeDiffAbs = Math.abs(comparison.timeDifference);

            return (
              <div className="px-4 pb-3 space-y-2.5">
                {/* Settings chips */}
                <div className="flex flex-wrap gap-1.5">
                  <SettingsChip label="" value={PERIODS.find((p) => p.id === settings.timePeriod)?.label || "Peak"}>
                    {(close) => (
                      <div className="p-1">
                        {PERIODS.map((p) => (
                          <button key={p.id} onClick={() => { updateSettings({ timePeriod: p.id }); close(); }}
                            className={`w-full text-left px-3 py-2 text-[11px] transition-colors cursor-pointer ${settings.timePeriod === p.id ? "bg-[var(--subtle)] font-semibold text-[var(--foreground)]" : "text-[var(--foreground)] hover:bg-[var(--subtle-hover)]"}`}>
                            <div>{p.label}</div>
                            <div className="text-[9px] text-[var(--muted)]">{p.desc}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </SettingsChip>

                  <SettingsChip label="" value={settings.tripsPerWeek === 0 ? "One-off" : `${settings.tripsPerWeek}x/wk`}>
                    {(close) => (
                      <div className="p-1">
                        {[0, 2, 5, 6, 10].map((n) => (
                          <button key={n} onClick={() => { updateSettings({ tripsPerWeek: n }); close(); }}
                            className={`w-full text-left px-3 py-2 text-[11px] transition-colors cursor-pointer ${settings.tripsPerWeek === n ? "bg-[var(--subtle)] font-semibold text-[var(--foreground)]" : "text-[var(--foreground)] hover:bg-[var(--subtle-hover)]"}`}>
                            {n === 0 ? "One-off trip" : `${n}x per week`}
                          </button>
                        ))}
                      </div>
                    )}
                  </SettingsChip>
                </div>

                {!hasTolls ? (
                  <div className="bg-[var(--background)] border border-[var(--subtle-border)] rounded-xl overflow-hidden">
                    <div className="px-3.5 py-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-[rgba(16,185,129,0.15)] flex items-center justify-center shrink-0">
                        <Zap className="h-4 w-4 text-[var(--tier-cheap)]" strokeWidth={2} />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[var(--foreground)]">No toll roads on this route</p>
                        <p className="text-[10px] text-[var(--muted)]">The fastest route is already toll-free</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Free route */}
                    <div className={`bg-[var(--background)] border rounded-xl overflow-hidden ${freeIsBetter ? "border-[#4285f4]/40" : "border-[var(--subtle-border)] opacity-60"}`}>
                      <div className="px-3 py-2 flex items-center gap-2.5 border-b border-[var(--subtle-border)]">
                        <div className="w-5 h-1 rounded-full bg-[#4285f4]" />
                        <span className="text-[11px] font-semibold text-[var(--foreground)] flex-1">Free route</span>
                        {freeIsBetter && <span className="text-[8px] font-medium uppercase px-1.5 py-0.5 rounded bg-[rgba(16,185,129,0.15)] text-[var(--tier-cheap)]">Top pick</span>}
                        <span className="text-[14px] font-bold font-mono text-[var(--foreground)]">${comparison.freeCost.totalCost.toFixed(2)}</span>
                      </div>
                      <Row icon={<MapPin className="h-3 w-3" strokeWidth={2} />} label="Distance" value={`${comparison.freeRoute.distance} km`} />
                      <div className="border-t border-[var(--subtle-border)]/50" />
                      <Row icon={<Clock className="h-3 w-3" strokeWidth={2} />} label="Time" value={`${comparison.freeCost.adjustedDuration} min`} sub={timeDiffAbs > 0 && freeIsBetter ? `+${timeDiffAbs} min vs toll` : undefined} />
                      <div className="border-t border-[var(--subtle-border)]/50" />
                      <Row icon={<Fuel className="h-3 w-3" strokeWidth={2} />} label={costModel === "fullCost" ? "Driving (ATO)" : "Fuel"} value={`$${comparison.freeCost.fuelCost.toFixed(2)}`} sub={costModel === "fullCost" ? `${comparison.freeRoute.distance}km × 88¢/km` : `${comparison.freeRoute.distance}km × ${vehicle.consumption}L/100km × ${settings.fuelPriceCentsPerLitre}c/L`} />
                      <div className="border-t border-[var(--subtle-border)]/50" />
                      <Row icon={<DollarSign className="h-3 w-3" strokeWidth={2} />} label="Tolls" value="$0.00" color="text-[var(--tier-cheap)]" />
                    </div>

                    {/* Toll route */}
                    <div className={`bg-[var(--background)] border rounded-xl overflow-hidden ${!freeIsBetter ? "border-[#ef4444]/40" : "border-[var(--subtle-border)] opacity-60"}`}>
                      <div className="px-3 py-2 flex items-center gap-2.5 border-b border-[var(--subtle-border)]">
                        <div className="w-5 h-1 rounded-full bg-[#ef4444]" />
                        <span className="text-[11px] font-semibold text-[var(--foreground)] flex-1">Toll route</span>
                        {!freeIsBetter && <span className="text-[8px] font-medium uppercase px-1.5 py-0.5 rounded bg-[rgba(239,68,68,0.15)] text-[var(--tier-exp)]">Faster</span>}
                        <span className="text-[14px] font-bold font-mono text-[var(--foreground)]">${comparison.tollCost.totalCost.toFixed(2)}</span>
                      </div>
                      <Row icon={<MapPin className="h-3 w-3" strokeWidth={2} />} label="Distance" value={`${comparison.tollRoute.distance} km`} />
                      <div className="border-t border-[var(--subtle-border)]/50" />
                      <Row icon={<Clock className="h-3 w-3" strokeWidth={2} />} label="Time" value={`${comparison.tollCost.adjustedDuration} min`} sub={timeDiffAbs > 0 && !freeIsBetter ? `${timeDiffAbs} min faster` : undefined} />
                      <div className="border-t border-[var(--subtle-border)]/50" />
                      <Row icon={<Fuel className="h-3 w-3" strokeWidth={2} />} label={costModel === "fullCost" ? "Driving (ATO)" : "Fuel"} value={`$${comparison.tollCost.fuelCost.toFixed(2)}`} sub={costModel === "fullCost" ? `${comparison.tollRoute.distance}km × 88¢/km` : `${comparison.tollRoute.distance}km × ${vehicle.consumption}L/100km × ${settings.fuelPriceCentsPerLitre}c/L`} />
                      <div className="border-t border-[var(--subtle-border)]/50" />
                      <Row icon={<TriangleAlert className="h-3 w-3" strokeWidth={2} />} label="Tolls" value={`$${comparison.tollCost.tollCost.toFixed(2)}`} color="text-[var(--tier-exp)]" />
                    </div>

                    {/* Verdict */}
                    <div className={`p-3 rounded-xl ${freeIsBetter ? "bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.3)]" : "bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.3)]"}`}>
                      <p className="text-[12px] font-semibold text-[var(--foreground)]">
                        {freeIsBetter ? "Skip the toll" : "Take the toll"} — save <span className="font-mono">${savingsAbs.toFixed(2)}</span>/trip
                      </p>
                      <p className="text-[10px] text-[var(--muted)] mt-0.5">
                        {freeIsBetter
                          ? `Toll saves ${timeDiffAbs} min but costs $${comparison.tollCost.tollCost.toFixed(2)} in tolls`
                          : `Toll costs $${comparison.tollCost.tollCost.toFixed(2)} but saves ${timeDiffAbs} min`}
                      </p>
                      {comparison.annualSavings !== null && (
                        <p className="text-[12px] font-bold mt-2" style={{ color: "var(--tier-cheap)" }}>
                          {settings.tripsPerWeek}x/week = <span className="font-mono">${Math.abs(comparison.annualSavings).toFixed(0)}</span> saved/year
                        </p>
                      )}
                    </div>

                    <TollBreakdown segments={comparison.tollBreakdown} timePeriod={settings.timePeriod} />
                  </>
                )}
              </div>
            );
          })()}
        </div>

        <SidebarFooter howItWorksUrl="/how-it-works/tolls" />
      </motion.div>
    </div>
  );
}
