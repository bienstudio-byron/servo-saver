"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Loader2, Search, X, Pencil, Route, Clock, Fuel, DollarSign, MapPin, Zap, TriangleAlert } from "lucide-react";
import { useTollStore } from "@/stores/toll-store";
import { useFuelStore } from "@/stores/fuel-store";
import { geocode } from "@/lib/openroute";
import { haversineDistance } from "@/lib/geo";
import type { TimePeriod } from "@/types/toll";

const VEHICLES = [
  { id: "car", label: "Car", consumption: 8.5 },
  { id: "suv", label: "SUV", consumption: 10.5 },
  { id: "ute", label: "Ute", consumption: 11.0 },
  { id: "small", label: "Small", consumption: 6.5 },
  { id: "hybrid", label: "Hybrid", consumption: 4.5 },
] as const;

const PERIODS: { id: TimePeriod; label: string }[] = [
  { id: "peak", label: "Peak" },
  { id: "offPeak", label: "Off-Peak" },
  { id: "weekend", label: "Weekend" },
];

interface SearchResult { label: string; lat: number; lng: number; }

export default function TollMobileSheet() {
  const [minimised, setMinimised] = useState(false);
  const { comparison, settings, loading, error, quotaExceeded, updateSettings, selectOrigin, selectDest } = useTollStore();
  const userLocation = useFuelStore((s) => s.userLocation);
  const allStations = useFuelStore((s) => s.allStations);
  const globalFuelType = useFuelStore((s) => s.selectedFuelType);
  const [locationName, setLocationName] = useState<string | null>(null);

  // Search state
  const [destQuery, setDestQuery] = useState("");
  const [destResults, setDestResults] = useState<SearchResult[]>([]);
  const [destLoading, setDestLoading] = useState(false);
  const [localDest, setLocalDest] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [editingOrigin, setEditingOrigin] = useState(false);
  const [originQuery, setOriginQuery] = useState("");
  const [originResults, setOriginResults] = useState<SearchResult[]>([]);
  const [localOrigin, setLocalOrigin] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState("car");
  const [tollFuelType, setTollFuelType] = useState(globalFuelType);
  const [step, setStep] = useState<"search" | "results">("search");

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const originDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fuel price from PetrolSaver
  const priceLocation = localOrigin || userLocation;
  const fuelPrices = useMemo(() => {
    if (allStations.length === 0 || !priceLocation) return {};
    const nearby = allStations.filter((s) => haversineDistance(priceLocation.lat, priceLocation.lng, s.latitude, s.longitude) < 15);
    const source = nearby.length > 10 ? nearby : allStations;
    const result: Record<string, { avg: number }> = {};
    for (const type of ["U91", "P95", "P98", "DSL", "E10", "LPG"]) {
      const prices = source.map((s) => s.prices.find((p) => p.fuelType === type)?.price).filter((p): p is number => p != null && p > 50 && p < 500);
      if (prices.length > 0) result[type] = { avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length * 10) / 10 };
    }
    return result;
  }, [allStations, priceLocation]);

  useEffect(() => { const d = fuelPrices[tollFuelType]; if (d) updateSettings({ fuelPriceCentsPerLitre: Math.round(d.avg) }); }, [tollFuelType, fuelPrices]);
  useEffect(() => { setTollFuelType(globalFuelType); }, []);
  useEffect(() => { if (comparison && !loading) setStep("results"); }, [comparison, loading]);

  // Reverse geocode
  useEffect(() => {
    if (!userLocation) return;
    const c = new AbortController();
    fetch(`/api/geocode?mode=reverse&lat=${userLocation.lat}&lng=${userLocation.lng}`, { signal: c.signal })
      .then((r) => r.json()).then((d) => { const n = d.address?.suburb || d.address?.town || d.address?.city; if (n) setLocationName(n); }).catch(() => {});
    return () => c.abort();
  }, [userLocation?.lat, userLocation?.lng]);

  const searchDest = useCallback(async (q: string) => {
    if (q.length < 2) { setDestResults([]); return; }
    setDestLoading(true); try { setDestResults(await geocode(q)); } catch {} setDestLoading(false);
  }, []);

  const handleDestInput = (v: string) => {
    setDestQuery(v); setLocalDest(null); clearTimeout(debounceRef.current);
    if (!v) { setDestResults([]); return; }
    debounceRef.current = setTimeout(() => searchDest(v), 300);
  };

  const handleOriginInput = (v: string) => {
    setOriginQuery(v); clearTimeout(originDebounceRef.current);
    if (!v) { setOriginResults([]); return; }
    originDebounceRef.current = setTimeout(async () => {
      if (v.length < 2) return;
      try { setOriginResults(await geocode(v)); } catch {}
    }, 300);
  };

  const handleCompare = () => {
    if (!localDest) return;
    const orig = localOrigin
      ? { lat: localOrigin.lat, lng: localOrigin.lng, label: localOrigin.name }
      : userLocation ? { lat: userLocation.lat, lng: userLocation.lng, label: locationName || "Your location" } : null;
    if (!orig) return;
    const v = VEHICLES.find((v) => v.id === selectedVehicle);
    if (v) updateSettings({ fuelConsumption: v.consumption });
    selectOrigin(orig); selectDest({ lat: localDest.lat, lng: localDest.lng, label: localDest.name });
  };

  const handleSearchAgain = () => {
    setStep("search");
    useTollStore.setState({ comparison: null, tollRouteData: null, freeRouteData: null, origin: null, destination: null, error: null });
    setDestQuery(""); setLocalDest(null); setLocalOrigin(null); setEditingOrigin(false);
  };

  const originDisplayName = localOrigin?.name || locationName || "Your location";
  const vehicle = VEHICLES.find((v) => v.id === selectedVehicle) || VEHICLES[0];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] max-h-[100dvh] flex flex-col items-stretch">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.3 }}
        className="w-full max-h-[55vh] rounded-t-2xl border-t border-[var(--subtle-border)] bg-[var(--card)]/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <button onClick={() => setMinimised(!minimised)} className="shrink-0 w-full cursor-pointer">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--subtle-border)]">
            <img src="/logos/nav-icon.png" alt="" className="h-6 w-6 shrink-0" />
            <div className="min-w-0 flex-1 text-left">
              <span className="text-sm font-bold text-[var(--foreground)]">Toll<span className="text-[#4285f4]">Saver</span></span>
              <div className="text-[10px] text-[var(--muted)] truncate">
                {step === "results" && comparison
                  ? `${useTollStore.getState().origin?.label || locationName} → ${useTollStore.getState().destination?.label}`
                  : locationName || "Near you"}
              </div>
            </div>
            <motion.div animate={{ rotate: minimised ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-4 w-4 text-[var(--muted)]" strokeWidth={2} />
            </motion.div>
          </div>
        </button>

        <AnimatePresence>
          {!minimised && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="px-4 py-3 overflow-y-auto" style={{ maxHeight: "calc(55vh - 52px)" }}>

                {/* Quota exceeded */}
                {quotaExceeded && (
                  <div className="bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.3)] rounded-xl px-3 py-2.5 flex items-start gap-2 mb-3">
                    <TriangleAlert className="h-3.5 w-3.5 text-[var(--tier-mid)] shrink-0 mt-0.5" strokeWidth={2} />
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--foreground)]">Daily limit reached</p>
                      <p className="text-[9px] text-[var(--muted)]">Route comparisons will be back tomorrow.</p>
                    </div>
                  </div>
                )}

                {/* ═══ SEARCH STEP ═══ */}
                {step === "search" && !quotaExceeded && (
                  <>
                    {/* Welcome — only when empty */}
                    {!destQuery && !localDest && (
                      <div className="rounded-xl bg-[var(--subtle)] p-3 mb-3 space-y-1.5">
                        <p className="text-[12px] font-semibold text-[var(--foreground)]">Should you take the toll road?</p>
                        <p className="text-[10px] text-[var(--muted)] leading-relaxed">
                          We compare both routes and show you the actual cost — fuel, tolls, and time. No guessing.
                        </p>
                      </div>
                    )}

                    {/* Destination */}
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)] pointer-events-none" strokeWidth={2} />
                      <input type="text" value={destQuery} onChange={(e) => handleDestInput(e.target.value)} placeholder="Where are you going?"
                        style={{ fontSize: "16px" }}
                        className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl pl-9 pr-8 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4]" />
                      {destQuery && !destLoading && (
                        <button onClick={() => { setDestQuery(""); setLocalDest(null); setDestResults([]); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)]"><X className="h-3.5 w-3.5" strokeWidth={2} /></button>
                      )}
                      {destLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />}
                    </div>
                    {destResults.length > 0 && (
                      <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--background)] overflow-hidden mb-2">
                        {destResults.map((r, i) => (
                          <button key={i} onClick={() => { setLocalDest({ lat: r.lat, lng: r.lng, name: r.label }); setDestQuery(r.label); setDestResults([]); }}
                            className="w-full text-left px-3 py-2 text-[12px] text-[var(--foreground)] hover:bg-[var(--subtle-hover)] border-b border-[var(--subtle-border)] last:border-0 truncate cursor-pointer">
                            {r.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Origin */}
                    {editingOrigin ? (
                      <div className="mb-3">
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-[#4285f4]" />
                          <input type="text" value={originQuery} onChange={(e) => handleOriginInput(e.target.value)} placeholder="Starting from..." autoFocus
                            style={{ fontSize: "16px" }}
                            className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl pl-8 pr-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4]" />
                        </div>
                        {originResults.length > 0 && (
                          <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--background)] overflow-hidden mt-1.5">
                            {originResults.map((r, i) => (
                              <button key={i} onClick={() => { setLocalOrigin({ lat: r.lat, lng: r.lng, name: r.label }); setOriginQuery(r.label); setOriginResults([]); setEditingOrigin(false); }}
                                className="w-full text-left px-3 py-2 text-[12px] text-[var(--foreground)] hover:bg-[var(--subtle-hover)] border-b border-[var(--subtle-border)] last:border-0 truncate cursor-pointer">
                                {r.label}
                              </button>
                            ))}
                          </div>
                        )}
                        <button onClick={() => { setEditingOrigin(false); setLocalOrigin(null); }} className="mt-1 text-[10px] text-[var(--accent-text)] cursor-pointer">Use GPS location</button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingOrigin(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[var(--muted)] hover:bg-[var(--subtle)] cursor-pointer text-left mb-3">
                        <div className="h-2 w-2 rounded-full bg-[#4285f4] shrink-0" />
                        <span className="text-[11px] flex-1 truncate">From {originDisplayName}</span>
                        <Pencil className="h-3 w-3 shrink-0" strokeWidth={2} />
                      </button>
                    )}

                    {/* Compare button */}
                    <motion.button whileTap={{ scale: 0.98 }} onClick={handleCompare} disabled={!localDest || loading}
                      className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        localDest && !loading ? "bg-[var(--foreground)] text-[var(--card)] shadow-lg" : "bg-[var(--subtle)] text-[var(--muted)] cursor-not-allowed"
                      }`}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" strokeWidth={2.5} />}
                      Compare routes
                    </motion.button>

                    {error && <div className="text-[11px] text-red-400 bg-red-500/10 rounded-lg px-3 py-2 mt-2">{error}</div>}
                  </>
                )}

                {/* ═══ RESULTS STEP ═══ */}
                {step === "results" && comparison && !loading && (() => {
                  const hasTolls = comparison.tollBreakdown.length > 0;
                  const freeIsBetter = comparison.savings > 0;
                  const savingsAbs = Math.abs(comparison.savings);
                  const timeDiffAbs = Math.abs(comparison.timeDifference);

                  return (
                    <>
                      {!hasTolls ? (
                        /* No tolls */
                        <div className="bg-[var(--background)] border border-[var(--subtle-border)] rounded-xl p-3 mb-3">
                          <div className="flex items-center gap-2.5 mb-2">
                            <Zap className="h-4 w-4 text-[var(--tier-cheap)]" strokeWidth={2} />
                            <span className="text-[12px] font-semibold text-[var(--foreground)]">No toll roads on this route</span>
                          </div>
                          <div className="text-[10px] text-[var(--muted)] flex gap-3">
                            <span>{comparison.tollRoute.distance} km</span>
                            <span>{comparison.tollCost.adjustedDuration} min</span>
                            <span>${comparison.tollCost.fuelCost.toFixed(2)} fuel</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Compact comparison */}
                          <div className="flex gap-2 mb-3">
                            {/* Free */}
                            <div className={`flex-1 rounded-xl p-2.5 border ${freeIsBetter ? "border-[#4285f4]/40 bg-[var(--background)]" : "border-[var(--subtle-border)] bg-[var(--background)] opacity-60"}`}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <div className="w-4 h-0.5 rounded-full bg-[#4285f4]" />
                                <span className="text-[9px] font-semibold text-[var(--muted)] uppercase">Free</span>
                                {freeIsBetter && <span className="text-[7px] font-bold uppercase px-1 py-0.5 rounded bg-[rgba(16,185,129,0.15)] text-[var(--tier-cheap)]">Best</span>}
                              </div>
                              <div className="text-[16px] font-bold font-mono text-[var(--foreground)]">${comparison.freeCost.totalCost.toFixed(2)}</div>
                              <div className="text-[9px] text-[var(--muted)] mt-1 space-y-0.5">
                                <div>{comparison.freeRoute.distance} km · {comparison.freeCost.adjustedDuration} min</div>
                                <div>${comparison.freeCost.fuelCost.toFixed(2)} fuel · $0 tolls</div>
                              </div>
                            </div>
                            {/* Toll */}
                            <div className={`flex-1 rounded-xl p-2.5 border ${!freeIsBetter ? "border-[#ef4444]/40 bg-[var(--background)]" : "border-[var(--subtle-border)] bg-[var(--background)] opacity-60"}`}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <div className="w-4 h-0.5 rounded-full bg-[#ef4444]" />
                                <span className="text-[9px] font-semibold text-[var(--muted)] uppercase">Toll</span>
                                {!freeIsBetter && <span className="text-[7px] font-bold uppercase px-1 py-0.5 rounded bg-[rgba(239,68,68,0.15)] text-[var(--tier-exp)]">Faster</span>}
                              </div>
                              <div className="text-[16px] font-bold font-mono text-[var(--foreground)]">${comparison.tollCost.totalCost.toFixed(2)}</div>
                              <div className="text-[9px] text-[var(--muted)] mt-1 space-y-0.5">
                                <div>{comparison.tollRoute.distance} km · {comparison.tollCost.adjustedDuration} min</div>
                                <div>${comparison.tollCost.fuelCost.toFixed(2)} fuel · <span className="text-[var(--tier-exp)]">${comparison.tollCost.tollCost.toFixed(2)}</span> tolls</div>
                              </div>
                            </div>
                          </div>

                          {/* Verdict */}
                          <div className={`p-2.5 rounded-xl mb-3 ${freeIsBetter ? "bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.3)]" : "bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.3)]"}`}>
                            <p className="text-[11px] font-semibold text-[var(--foreground)]">
                              {freeIsBetter ? "Skip the toll" : "Take the toll"} — save <span className="font-mono">${savingsAbs.toFixed(2)}</span>/trip
                            </p>
                            {timeDiffAbs > 0 && (
                              <p className="text-[9px] text-[var(--muted)] mt-0.5">
                                {freeIsBetter ? `Toll saves ${timeDiffAbs} min but costs $${comparison.tollCost.tollCost.toFixed(2)}` : `Toll costs $${comparison.tollCost.tollCost.toFixed(2)} but saves ${timeDiffAbs} min`}
                              </p>
                            )}
                            {comparison.annualSavings !== null && (
                              <p className="text-[11px] font-bold mt-1.5" style={{ color: "var(--tier-cheap)" }}>
                                {settings.tripsPerWeek}x/week = <span className="font-mono">${Math.abs(comparison.annualSavings).toFixed(0)}</span>/year
                              </p>
                            )}
                          </div>
                        </>
                      )}

                      {/* Search again */}
                      <button onClick={handleSearchAgain} className="w-full py-2 rounded-xl text-[11px] font-semibold text-[var(--accent-text)] bg-[var(--subtle)] hover:bg-[var(--subtle-hover)] cursor-pointer flex items-center justify-center gap-1.5">
                        <Search className="h-3.5 w-3.5" strokeWidth={2} />
                        Compare another route
                      </button>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
