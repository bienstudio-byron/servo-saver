"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search, X, Pencil, Route, Clock, Fuel, DollarSign, MapPin, Zap, TriangleAlert, ChevronDown, Car } from "lucide-react";
import { useTollStore } from "@/stores/toll-store";
import { useFuelStore } from "@/stores/fuel-store";
import { geocode, type GeocodingResult } from "@/lib/openroute";
import { haversineDistance } from "@/lib/geo";
import type { TimePeriod, TollSegment } from "@/types/toll";

const VEHICLES = [
  { id: "car", label: "Car", consumption: 8.5 },
  { id: "suv", label: "SUV", consumption: 10.5 },
  { id: "ute", label: "Ute", consumption: 11.0 },
  { id: "small", label: "Small", consumption: 6.5 },
  { id: "hybrid", label: "Hybrid", consumption: 4.5 },
] as const;

const PERIODS: { id: TimePeriod; label: string; desc: string }[] = [
  { id: "peak", label: "Peak", desc: "7-9am, 4-7pm" },
  { id: "offPeak", label: "Off-Peak", desc: "Other weekday" },
  { id: "weekend", label: "Weekend", desc: "Sat + Sun" },
];

const FUEL_TYPES = ["U91", "P95", "P98", "DSL", "E10", "LPG"];

interface SearchResult { label: string; lat: number; lng: number; }

/* ─── Toll Breakdown ─── */

function TollBreakdown({ segments, timePeriod }: { segments: TollSegment[]; timePeriod: TimePeriod }) {
  const [open, setOpen] = useState(false);
  if (segments.length === 0) return null;
  const total = segments.reduce((sum, s) => sum + (s.pricing[timePeriod] ?? 0), 0);

  return (
    <div>
      <button onClick={() => setOpen(!open)} className="text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1">
        <span className={`inline-block transition-transform duration-200 ${open ? "rotate-90" : ""}`}>&#9654;</span>
        Toll breakdown ({segments.length} segment{segments.length > 1 ? "s" : ""})
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="mt-2 flex flex-col gap-1.5 pl-3 border-l border-[var(--subtle-border)]">
              {segments.map((seg) => (
                <div key={seg.id} className="flex justify-between text-[11px]">
                  <span className="text-[var(--muted)]">{seg.name}</span>
                  <span className="text-[var(--foreground)] font-mono">${((seg.pricing[timePeriod] ?? 0) / 100).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-[11px] font-medium pt-1 border-t border-[var(--subtle-border)]">
                <span className="text-[var(--foreground)]">Total</span>
                <span className="text-[var(--foreground)] font-mono">${(total / 100).toFixed(2)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Editable Settings Chip ─── */

function SettingsChip({ label, value, active, children }: {
  label: string; value: string; active?: boolean;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer border ${
          open ? "bg-[var(--foreground)] text-[var(--card)] border-[var(--foreground)]"
          : active ? "bg-[var(--subtle)] text-[var(--foreground)] border-[var(--accent-text)]"
          : "bg-[var(--subtle)] text-[var(--muted)] border-[var(--subtle-border)] hover:text-[var(--foreground)]"
        }`}
      >
        <span className="opacity-60">{label}</span>
        <span className="font-bold font-mono">{value}</span>
        <ChevronDown className={`h-2.5 w-2.5 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full left-0 mt-1 z-50 rounded-lg border border-[var(--subtle-border)] bg-[var(--card)] shadow-2xl overflow-hidden min-w-[180px]"
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Row helper for results ─── */

function Row({ icon, label, value, color, sub }: {
  icon: React.ReactNode; label: string; value: string; color?: string; sub?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5">
      <span className="text-[var(--muted)] shrink-0 w-3.5 flex justify-center">{icon}</span>
      <span className="text-[10px] text-[var(--muted)] flex-1">{label}</span>
      <div className="text-right">
        <span className={`text-[10px] font-mono font-bold ${color || "text-[var(--foreground)]"}`}>{value}</span>
        {sub && <div className="text-[8px] text-[var(--muted)]">{sub}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* ─── MAIN SIDEBAR ─── */
/* ═══════════════════════════════════════ */

export default function TollSidebar() {
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
  const [originLoading, setOriginLoading] = useState(false);
  const [localOrigin, setLocalOrigin] = useState<{ lat: number; lng: number; name: string } | null>(null);

  // Settings state
  const [selectedVehicle, setSelectedVehicle] = useState("car");
  const [tollFuelType, setTollFuelType] = useState(globalFuelType);
  const [step, setStep] = useState<"search" | "results">("search");

  const destInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const originDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fuel price from PetrolSaver stations near origin
  const priceLocation = localOrigin || userLocation;
  const fuelPrices = useMemo(() => {
    if (allStations.length === 0 || !priceLocation) return {};
    const nearby = allStations.filter((s) => haversineDistance(priceLocation.lat, priceLocation.lng, s.latitude, s.longitude) < 15);
    const source = nearby.length > 10 ? nearby : allStations;
    const result: Record<string, { avg: number; low: number; count: number }> = {};
    for (const type of FUEL_TYPES) {
      const prices = source.map((s) => s.prices.find((p) => p.fuelType === type)?.price).filter((p): p is number => p != null && p > 50 && p < 500);
      if (prices.length > 0) {
        result[type] = {
          avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length * 10) / 10,
          low: Math.round(Math.min(...prices) * 10) / 10,
          count: prices.length,
        };
      }
    }
    return result;
  }, [allStations, priceLocation]);

  // Auto-set fuel price from live data
  useEffect(() => {
    const data = fuelPrices[tollFuelType];
    if (data) updateSettings({ fuelPriceCentsPerLitre: Math.round(data.avg) });
  }, [tollFuelType, fuelPrices]);

  useEffect(() => { setTollFuelType(globalFuelType); }, []);

  // Auto-advance to results
  useEffect(() => {
    if (comparison && !loading) setStep("results");
  }, [comparison, loading]);

  // Reverse geocode
  useEffect(() => {
    if (!userLocation) return;
    const c = new AbortController();
    fetch(`/api/geocode?mode=reverse&lat=${userLocation.lat}&lng=${userLocation.lng}`, { signal: c.signal })
      .then((r) => r.json())
      .then((d) => { const n = d.address?.suburb || d.address?.town || d.address?.city; if (n) setLocationName(n); })
      .catch(() => {});
    return () => c.abort();
  }, [userLocation?.lat, userLocation?.lng]);

  // Geocode helpers
  const searchDest = useCallback(async (q: string) => {
    if (q.length < 2) { setDestResults([]); return; }
    setDestLoading(true);
    try { setDestResults(await geocode(q)); } catch {}
    setDestLoading(false);
  }, []);

  const searchOriginFn = useCallback(async (q: string) => {
    if (q.length < 2) { setOriginResults([]); return; }
    setOriginLoading(true);
    try { setOriginResults(await geocode(q)); } catch {}
    setOriginLoading(false);
  }, []);

  const handleDestInput = (v: string) => {
    setDestQuery(v); setLocalDest(null);
    clearTimeout(debounceRef.current);
    if (!v) { setDestResults([]); return; }
    debounceRef.current = setTimeout(() => searchDest(v), 300);
  };

  const handleOriginInput = (v: string) => {
    setOriginQuery(v);
    clearTimeout(originDebounceRef.current);
    if (!v) { setOriginResults([]); return; }
    originDebounceRef.current = setTimeout(() => searchOriginFn(v), 300);
  };

  const handleCompare = () => {
    if (!localDest) return;
    const orig = localOrigin
      ? { lat: localOrigin.lat, lng: localOrigin.lng, label: localOrigin.name }
      : userLocation
      ? { lat: userLocation.lat, lng: userLocation.lng, label: locationName || "Your location" }
      : null;
    if (!orig) return;
    const v = VEHICLES.find((v) => v.id === selectedVehicle);
    if (v) updateSettings({ fuelConsumption: v.consumption });
    selectOrigin(orig);
    selectDest({ lat: localDest.lat, lng: localDest.lng, label: localDest.name });
  };

  const handleSearchAgain = () => {
    setStep("search");
    useTollStore.setState({ comparison: null, tollRouteData: null, freeRouteData: null, origin: null, destination: null, error: null });
    setDestQuery(""); setLocalDest(null); setLocalOrigin(null); setEditingOrigin(false);
  };

  const originDisplayName = localOrigin?.name || locationName || "Your location";
  const vehicle = VEHICLES.find((v) => v.id === selectedVehicle) || VEHICLES[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.3 }}
      className="w-full md:flex-1 md:rounded-none border-r border-[var(--subtle-border)] bg-[var(--card)]/95 backdrop-blur-xl overflow-hidden flex flex-col"
    >
      {/* Header — desktop only (mobile uses tab bar) */}
      <div className="hidden md:flex items-center gap-2 px-4 py-3 shrink-0 border-b border-[var(--subtle-border)]">
        <img src="/logos/nav-icon.png" alt="" className="h-6 w-6" />
        <span className="text-sm font-bold text-[var(--foreground)]">Toll<span className="text-[#4285f4]">Saver</span></span>
        <span className="text-[10px] text-[var(--muted)] truncate ml-auto">{locationName || ""}</span>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Quota exceeded banner */}
        {quotaExceeded && (
          <div className="px-4 pt-3">
            <div className="bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.3)] rounded-xl px-3.5 py-3 flex items-start gap-2.5">
              <TriangleAlert className="h-4 w-4 text-[var(--tier-mid)] shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="text-[12px] font-semibold text-[var(--foreground)]">Daily limit reached</p>
                <p className="text-[10px] text-[var(--muted)] mt-0.5">
                  We&apos;ve hit our routing API limit for today. Route comparisons will be back tomorrow. Thanks for using TollSaver!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 1: SEARCH ═══ */}
        {step === "search" && !quotaExceeded && (
          <>
            {/* Welcome / explainer — only when inputs are empty */}
            {!destQuery && !localDest && (
              <div className="px-4 pt-4 pb-2">
                <div className="rounded-xl bg-[var(--subtle)] p-4 space-y-3">
                  <p className="text-[13px] font-semibold text-[var(--foreground)]">
                    Should you take the toll road?
                  </p>
                  <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                    We compare both routes — toll and free — and show you the <strong className="text-[var(--foreground)]">actual cost</strong> of each,
                    factoring in fuel, tolls, and time. No guessing, just maths.
                  </p>
                  <div className="flex gap-2.5 text-[10px] text-[var(--muted)]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-0.5 rounded-full bg-[#4285f4]" />
                      <span>Free route</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-0.5 rounded-full bg-[#ef4444]" />
                      <span>Toll route</span>
                    </div>
                  </div>
                  <div className="text-[9px] text-[var(--muted)] flex flex-wrap gap-x-3 gap-y-1">
                    <span>20 toll roads</span>
                    <span>Melbourne + Sydney + Brisbane</span>
                    <span>Live fuel prices</span>
                  </div>
                </div>
              </div>
            )}

            {/* Destination */}
            <div className="px-4 pt-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)] pointer-events-none" strokeWidth={2} />
                <input
                  ref={destInputRef}
                  type="text"
                  value={destQuery}
                  onChange={(e) => handleDestInput(e.target.value)}
                  placeholder="Where are you going?"
                  style={{ fontSize: "16px" }}
                  className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl pl-10 pr-9 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors"
                />
                {destLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />}
                {destQuery && !destLoading && (
                  <button onClick={() => { setDestQuery(""); setLocalDest(null); setDestResults([]); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                )}
              </div>
              <AnimatePresence>
                {destResults.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mt-1.5 rounded-xl border border-[var(--subtle-border)] bg-[var(--background)] overflow-hidden">
                    {destResults.map((r, i) => (
                      <button key={i} onClick={() => { setLocalDest({ lat: r.lat, lng: r.lng, name: r.label }); setDestQuery(r.label); setDestResults([]); }} className="w-full text-left px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--subtle-hover)] transition-colors border-b border-[var(--subtle-border)] last:border-0 truncate cursor-pointer">
                        {r.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Origin — GPS default */}
            <div className="px-4 pb-4">
              {editingOrigin ? (
                <div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-[#4285f4]" />
                    <input type="text" value={originQuery} onChange={(e) => handleOriginInput(e.target.value)} placeholder="Starting from..." autoFocus style={{ fontSize: "16px" }}
                      className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl pl-8 pr-9 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors" />
                    {originLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />}
                  </div>
                  <AnimatePresence>
                    {originResults.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mt-1.5 rounded-xl border border-[var(--subtle-border)] bg-[var(--background)] overflow-hidden">
                        {originResults.map((r, i) => (
                          <button key={i} onClick={() => { setLocalOrigin({ lat: r.lat, lng: r.lng, name: r.label }); setOriginQuery(r.label); setOriginResults([]); setEditingOrigin(false); }} className="w-full text-left px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--subtle-hover)] transition-colors border-b border-[var(--subtle-border)] last:border-0 truncate cursor-pointer">
                            {r.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button onClick={() => { setEditingOrigin(false); setLocalOrigin(null); setOriginQuery(""); setOriginResults([]); }} className="mt-1.5 text-[10px] text-[var(--accent-text)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
                    Use GPS location
                  </button>
                </div>
              ) : (
                <button onClick={() => setEditingOrigin(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[var(--muted)] hover:bg-[var(--subtle)] transition-colors cursor-pointer text-left">
                  <div className="h-2 w-2 rounded-full bg-[#4285f4] shrink-0" />
                  <span className="text-xs flex-1 truncate">From {originDisplayName}</span>
                  <Pencil className="h-3 w-3 shrink-0" strokeWidth={2} />
                </button>
              )}
            </div>

            {/* Compare button */}
            <div className="px-4 pb-4">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleCompare}
                disabled={!localDest || loading}
                className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  localDest && !loading
                    ? "bg-[var(--foreground)] text-[var(--card)] hover:opacity-90 shadow-lg"
                    : "bg-[var(--subtle)] text-[var(--muted)] cursor-not-allowed"
                }`}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" strokeWidth={2.5} />}
                Compare routes
              </motion.button>
            </div>

            {error && (
              <div className="px-4 pb-3">
                <div className="text-[11px] text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</div>
              </div>
            )}
          </>
        )}

        {/* ═══ STEP 2: RESULTS ═══ */}
        {step === "results" && comparison && !loading && (() => {
          const hasTolls = comparison.tollBreakdown.length > 0;
          const freeIsBetter = comparison.savings > 0;
          const savingsAbs = Math.abs(comparison.savings);
          const timeDiffAbs = Math.abs(comparison.timeDifference);
          const originLabel = useTollStore.getState().origin?.label || locationName || "your location";
          const destLabel = useTollStore.getState().destination?.label || "destination";
          const fuelData = fuelPrices[tollFuelType];

          return (
            <>
              {/* Summary sentence */}
              <div className="px-4 pt-4 pb-2">
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  <span className="font-medium text-[var(--foreground)]">{originLabel}</span>
                  {" → "}
                  <span className="font-medium text-[var(--foreground)]">{destLabel}</span>
                </p>
              </div>

              {/* Editable settings chips */}
              <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                <SettingsChip label="" value={vehicle.label}>
                  {(close) => (
                    <div className="p-1">
                      {VEHICLES.map((v) => (
                        <button key={v.id} onClick={() => { setSelectedVehicle(v.id); updateSettings({ fuelConsumption: v.consumption }); close(); }}
                          className={`w-full text-left px-3 py-2 text-[11px] transition-colors cursor-pointer flex justify-between ${selectedVehicle === v.id ? "bg-[var(--subtle)] font-semibold text-[var(--foreground)]" : "text-[var(--foreground)] hover:bg-[var(--subtle-hover)]"}`}>
                          <span>{v.label}</span>
                          <span className="font-mono text-[var(--muted)]">{v.consumption}L</span>
                        </button>
                      ))}
                    </div>
                  )}
                </SettingsChip>

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

                <SettingsChip label={fuelData ? "\u{26A1}" : ""} value={`${tollFuelType} ${settings.fuelPriceCentsPerLitre}c`} active={!!fuelData}>
                  {(close) => (
                    <div className="p-1">
                      {FUEL_TYPES.map((type) => {
                        const d = fuelPrices[type];
                        return (
                          <button key={type} onClick={() => { setTollFuelType(type); close(); }}
                            className={`w-full text-left px-3 py-2 text-[11px] transition-colors cursor-pointer flex justify-between ${tollFuelType === type ? "bg-[var(--subtle)] font-semibold text-[var(--foreground)]" : "text-[var(--foreground)] hover:bg-[var(--subtle-hover)]"}`}>
                            <span className="font-mono">{type === "DSL" ? "Diesel" : type}</span>
                            {d ? <span className="font-mono text-[var(--muted)]">{d.avg.toFixed(1)}c</span> : <span className="text-[var(--muted)]">—</span>}
                          </button>
                        );
                      })}
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

                <SettingsChip label="Time" value={settings.timeValuePerHour === 0 ? "ignore" : `$${settings.timeValuePerHour}/hr`} active={settings.timeValuePerHour > 0}>
                  {(close) => (
                    <div className="p-1">
                      <div className="px-3 py-1.5 text-[9px] text-[var(--muted)]">What&apos;s your time worth? Factors extra travel time into the cost.</div>
                      {[0, 20, 30, 40, 50, 75, 100].map((n) => (
                        <button key={n} onClick={() => { updateSettings({ timeValuePerHour: n }); close(); }}
                          className={`w-full text-left px-3 py-2 text-[11px] transition-colors cursor-pointer ${settings.timeValuePerHour === n ? "bg-[var(--subtle)] font-semibold text-[var(--foreground)]" : "text-[var(--foreground)] hover:bg-[var(--subtle-hover)]"}`}>
                          {n === 0 ? "Ignore time" : `$${n}/hr`}
                        </button>
                      ))}
                    </div>
                  )}
                </SettingsChip>
              </div>

              {/* Route cards */}
              <div className="px-4 pb-3 flex flex-col gap-2.5">
                {!hasTolls ? (
                  /* No tolls */
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
                    <div className="border-t border-[var(--subtle-border)]">
                      <Row icon={<MapPin className="h-3 w-3" strokeWidth={2} />} label="Distance" value={`${comparison.tollRoute.distance} km`} />
                      <div className="border-t border-[var(--subtle-border)]/50" />
                      <Row icon={<Clock className="h-3 w-3" strokeWidth={2} />} label="Time" value={`${comparison.tollCost.adjustedDuration} min`} />
                      <div className="border-t border-[var(--subtle-border)]/50" />
                      <Row icon={<Fuel className="h-3 w-3" strokeWidth={2} />} label="Fuel" value={`$${comparison.tollCost.fuelCost.toFixed(2)}`} />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Free route (blue) */}
                    <div className={`bg-[var(--background)] border rounded-xl overflow-hidden ${freeIsBetter ? "border-[#4285f4]/40" : "border-[var(--subtle-border)] opacity-60"}`}>
                      <div className="px-3 py-2 flex items-center gap-2.5 border-b border-[var(--subtle-border)]">
                        <div className="w-5 h-1 rounded-full bg-[#4285f4]" />
                        <span className="text-[11px] font-semibold text-[var(--foreground)] flex-1">Free route</span>
                        {freeIsBetter && <span className="text-[8px] font-medium uppercase px-1.5 py-0.5 rounded bg-[rgba(16,185,129,0.15)] text-[var(--tier-cheap)] border border-[rgba(16,185,129,0.3)]">Best for you</span>}
                        <span className="text-[14px] font-bold font-mono text-[var(--foreground)]">${comparison.freeCost.totalCost.toFixed(2)}</span>
                      </div>
                      <Row icon={<MapPin className="h-3 w-3" strokeWidth={2} />} label="Distance" value={`${comparison.freeRoute.distance} km`} />
                      <div className="border-t border-[var(--subtle-border)]/50" />
                      <Row icon={<Clock className="h-3 w-3" strokeWidth={2} />} label="Time" value={`${comparison.freeCost.adjustedDuration} min`} sub={timeDiffAbs > 0 && freeIsBetter ? `+${timeDiffAbs} min vs toll` : undefined} />
                      <div className="border-t border-[var(--subtle-border)]/50" />
                      <Row icon={<Fuel className="h-3 w-3" strokeWidth={2} />} label="Fuel" value={`$${comparison.freeCost.fuelCost.toFixed(2)}`} sub={`${comparison.freeRoute.distance}km × ${vehicle.consumption}L/100km × ${settings.fuelPriceCentsPerLitre}c/L`} />
                      <div className="border-t border-[var(--subtle-border)]/50" />
                      <Row icon={<DollarSign className="h-3 w-3" strokeWidth={2} />} label="Tolls" value="$0.00" color="text-[var(--tier-cheap)]" />
                      {settings.timeValuePerHour > 0 && (<><div className="border-t border-[var(--subtle-border)]/50" /><Row icon={<Clock className="h-3 w-3" strokeWidth={2} />} label="Time cost" value={`$${comparison.freeCost.timeCost.toFixed(2)}`} sub={`${comparison.freeCost.adjustedDuration}min × $${settings.timeValuePerHour}/hr`} /></>)}
                    </div>

                    {/* Toll route (red) */}
                    <div className={`bg-[var(--background)] border rounded-xl overflow-hidden ${!freeIsBetter ? "border-[#ef4444]/40" : "border-[var(--subtle-border)] opacity-60"}`}>
                      <div className="px-3 py-2 flex items-center gap-2.5 border-b border-[var(--subtle-border)]">
                        <div className="w-5 h-1 rounded-full bg-[#ef4444]" />
                        <span className="text-[11px] font-semibold text-[var(--foreground)] flex-1">Toll route</span>
                        {!freeIsBetter && <span className="text-[8px] font-medium uppercase px-1.5 py-0.5 rounded bg-[rgba(239,68,68,0.15)] text-[var(--tier-exp)] border border-[rgba(239,68,68,0.3)]">Faster</span>}
                        <span className="text-[14px] font-bold font-mono text-[var(--foreground)]">${comparison.tollCost.totalCost.toFixed(2)}</span>
                      </div>
                      <Row icon={<MapPin className="h-3 w-3" strokeWidth={2} />} label="Distance" value={`${comparison.tollRoute.distance} km`} />
                      <div className="border-t border-[var(--subtle-border)]/50" />
                      <Row icon={<Clock className="h-3 w-3" strokeWidth={2} />} label="Time" value={`${comparison.tollCost.adjustedDuration} min`} sub={timeDiffAbs > 0 && !freeIsBetter ? `${timeDiffAbs} min faster` : undefined} />
                      <div className="border-t border-[var(--subtle-border)]/50" />
                      <Row icon={<Fuel className="h-3 w-3" strokeWidth={2} />} label="Fuel" value={`$${comparison.tollCost.fuelCost.toFixed(2)}`} sub={`${comparison.tollRoute.distance}km × ${vehicle.consumption}L/100km × ${settings.fuelPriceCentsPerLitre}c/L`} />
                      <div className="border-t border-[var(--subtle-border)]/50" />
                      <Row icon={<TriangleAlert className="h-3 w-3" strokeWidth={2} />} label="Tolls" value={`$${comparison.tollCost.tollCost.toFixed(2)}`} color="text-[var(--tier-exp)]" />
                      {settings.timeValuePerHour > 0 && (<><div className="border-t border-[var(--subtle-border)]/50" /><Row icon={<Clock className="h-3 w-3" strokeWidth={2} />} label="Time cost" value={`$${comparison.tollCost.timeCost.toFixed(2)}`} sub={`${comparison.tollCost.adjustedDuration}min × $${settings.timeValuePerHour}/hr`} /></>)}
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

                    {/* Toll breakdown + source */}
                    <TollBreakdown segments={comparison.tollBreakdown} timePeriod={settings.timePeriod} />

                    {/* Data sources */}
                    <div className="flex flex-col gap-1 text-[9px] text-[var(--muted)]">
                      {fuelData && (
                        <div className="flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--tier-cheap)]" />
                          Fuel price: live {tollFuelType} avg near you via PetrolSaver ({fuelData.avg.toFixed(1)}c/L)
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${comparison.tollSource === "tfnsw-live" ? "bg-[var(--tier-cheap)]" : "bg-[var(--tier-mid)]"}`} />
                        {comparison.tollSource === "tfnsw-live" ? "Tolls: live via Transport for NSW" : "Tolls: static pricing · Verified Mar 2026"}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Search again */}
              <div className="px-4 pb-4">
                <button onClick={handleSearchAgain} className="w-full py-2 rounded-xl text-[11px] font-semibold text-[var(--accent-text)] bg-[var(--subtle)] hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer flex items-center justify-center gap-1.5">
                  <Search className="h-3.5 w-3.5" strokeWidth={2} />
                  Compare another route
                </button>
              </div>
            </>
          );
        })()}

      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-[var(--subtle-border)]">
        <div className="px-3 py-2 flex items-center justify-center gap-1.5">
          <a href="/how-it-works/tolls" className="text-[9px] font-mono text-[var(--muted)] hover:text-[var(--foreground)] px-2 py-0.5 rounded-full border border-[var(--subtle-border)] hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer">How it works</a>
          <a href="/terms" className="text-[9px] font-mono text-[var(--muted)] hover:text-[var(--foreground)] px-2 py-0.5 rounded-full border border-[var(--subtle-border)] hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer">Terms</a>
          <a href="/privacy" className="text-[9px] font-mono text-[var(--muted)] hover:text-[var(--foreground)] px-2 py-0.5 rounded-full border border-[var(--subtle-border)] hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer">Privacy</a>
        </div>
      </div>
    </motion.div>
  );
}
