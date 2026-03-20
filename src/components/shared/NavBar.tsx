"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, MapPin, Car, Gauge, SlidersHorizontal, Pencil, Check, LocateFixed, Fuel, Route, Store, ArrowRight } from "lucide-react";
import { useFuelStore, type AppMode } from "@/stores/fuel-store";
import { useTollStore } from "@/stores/toll-store";
import { useVehicleStore } from "@/stores/vehicle-store";
import { geocode as tollGeocode, type GeocodingResult } from "@/lib/openroute";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import BrandLogo from "./BrandLogo";
import { VEHICLE_DATABASE, vehicleDisplayName, type VehicleSpec } from "@/data/vehicles";
import type { VehicleProfile } from "@/stores/vehicle-store";

interface SearchResult { display_name: string; lat: string; lon: string; }

const FUEL_OPTIONS = ["U91", "P95", "P98", "DSL", "E10", "LPG", "PDSL"];

type ExpandedPanel = "trip" | "car" | "fill" | null;
type ModalType = "filters" | null;

export default function NavBar() {
  // ─── Store reads ───
  const appMode = useFuelStore((s) => s.mode);
  const setMode = useFuelStore((s) => s.setMode);
  const tripMode = useFuelStore((s) => s.tripMode);
  const tripDestination = useFuelStore((s) => s.tripDestination);
  const setTripMode = useFuelStore((s) => s.setTripMode);
  const setTripDestination = useFuelStore((s) => s.setTripDestination);
  const tripOrigin = useFuelStore((s) => s.tripOrigin);
  const setTripOrigin = useFuelStore((s) => s.setTripOrigin);
  const userLocation = useFuelStore((s) => s.userLocation);
  const selectedFuelType = useFuelStore((s) => s.selectedFuelType);
  const setSelectedFuelType = useFuelStore((s) => s.setSelectedFuelType);
  const rangeKm = useFuelStore((s) => s.rangeKm);
  const setRangeKm = useFuelStore((s) => s.setRangeKm);
  const allStations = useFuelStore((s) => s.allStations);
  const selectedBrands = useFuelStore((s) => s.selectedBrands);
  const setSelectedBrands = useFuelStore((s) => s.setSelectedBrands);
  const timeValuePerHour = useFuelStore((s) => s.timeValuePerHour);
  const setTimeValuePerHour = useFuelStore((s) => s.setTimeValuePerHour);
  const locationName = useFuelStore((s) => s.locationName);
  const locationSource = useFuelStore((s) => s.locationSource);
  const setManualLocation = useFuelStore((s) => s.setManualLocation);
  const clearManualLocation = useFuelStore((s) => s.clearManualLocation);
  const setUserLocation = useFuelStore((s) => s.setUserLocation);
  const setFlyToTarget = useFuelStore((s) => s.setFlyToTarget);
  const fillMode = useFuelStore((s) => s.fillMode);
  const setFillIntent = useFuelStore((s) => s.setFillIntent);

  const vehicleProfile = useVehicleStore((s) => s.profile);
  const setVehicleProfile = useVehicleStore((s) => s.setProfile);
  const costModel = useVehicleStore((s) => s.costModel);
  const setCostModel = useVehicleStore((s) => s.setCostModel);

  // ─── Local state ───
  const [expanded, setExpanded] = useState<ExpandedPanel>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const filtersOpen = useFuelStore((s) => s.filtersOpen);
  const setFiltersOpen = useFuelStore((s) => s.setFiltersOpen);

  // Sync filters open state from mobile floating button
  useEffect(() => {
    if (filtersOpen) { setModal("filters"); setFiltersOpen(false); }
  }, [filtersOpen]);

  // Trip planner
  const [destQuery, setDestQuery] = useState("");
  const [destResults, setDestResults] = useState<SearchResult[]>([]);
  const [destLoading, setDestLoading] = useState(false);
  const [localDest, setLocalDest] = useState(tripDestination);
  const [editingOrigin, setEditingOrigin] = useState(false);
  const [originQuery, setOriginQuery] = useState("");
  const [originResults, setOriginResults] = useState<SearchResult[]>([]);
  const [originLoading, setOriginLoading] = useState(false);
  const [localOrigin, setLocalOrigin] = useState(tripOrigin);
  const [gpsSuburb, setGpsSuburb] = useState<string | null>(null);
  const destInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const originDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fill
  const [fillLitresInput, setFillLitresInput] = useState("");
  const [fillDollarsInput, setFillDollarsInput] = useState("");

  // Location search (inside trip panel)
  const [locQuery, setLocQuery] = useState("");
  const [locResults, setLocResults] = useState<SearchResult[]>([]);
  const [locLoading, setLocLoading] = useState(false);
  const locDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Toll search
  const tollStore = useTollStore();
  const [tollOriginQuery, setTollOriginQuery] = useState("");
  const [tollDestQuery, setTollDestQuery] = useState("");
  const [tollOriginResults, setTollOriginResults] = useState<GeocodingResult[]>([]);
  const [tollDestResults, setTollDestResults] = useState<GeocodingResult[]>([]);
  const [tollOriginLoading, setTollOriginLoading] = useState(false);
  const [tollDestLoading, setTollDestLoading] = useState(false);
  const tollOriginRef = useRef<HTMLInputElement>(null);
  const tollDestRef = useRef<HTMLInputElement>(null);
  const tollOriginDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tollDestDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  const searchTollOrigin = useCallback((q: string) => {
    if (q.length < 2) { setTollOriginResults([]); return; }
    setTollOriginLoading(true);
    tollGeocode(q).then((r) => { setTollOriginResults(r); setTollOriginLoading(false); }).catch(() => setTollOriginLoading(false));
  }, []);
  const searchTollDest = useCallback((q: string) => {
    if (q.length < 2) { setTollDestResults([]); return; }
    setTollDestLoading(true);
    tollGeocode(q).then((r) => { setTollDestResults(r); setTollDestLoading(false); }).catch(() => setTollDestLoading(false));
  }, []);

  const handleTollOriginInput = (v: string) => { setTollOriginQuery(v); clearTimeout(tollOriginDebounce.current); if (!v) { setTollOriginResults([]); return; } tollOriginDebounce.current = setTimeout(() => searchTollOrigin(v), 300); };
  const handleTollDestInput = (v: string) => { setTollDestQuery(v); clearTimeout(tollDestDebounce.current); if (!v) { setTollDestResults([]); return; } tollDestDebounce.current = setTimeout(() => searchTollDest(v), 300); };

  const handleSelectTollOrigin = (r: GeocodingResult) => {
    setTollOriginQuery(r.label);
    setTollOriginResults([]);
    tollStore.selectOrigin(r);
  };
  const handleSelectTollDest = (r: GeocodingResult) => {
    setTollDestQuery(r.label);
    setTollDestResults([]);
    tollStore.selectDest(r);
  };

  const handleTollCompare = () => {
    // If origin not set, use GPS location
    if (!tollStore.origin && userLocation) {
      const gpsOrigin: GeocodingResult = { lat: userLocation.lat, lng: userLocation.lng, label: gpsSuburb || locationName || "Your location" };
      tollStore.selectOrigin(gpsOrigin);
    }
    setExpanded(null);
  };

  // Car search + custom entry
  const [carQuery, setCarQuery] = useState("");
  const [carCustom, setCarCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customTank, setCustomTank] = useState("55");
  const [customConsumption, setCustomConsumption] = useState("8.5");
  const [customFuel, setCustomFuel] = useState("U91");
  const carInputRef = useRef<HTMLInputElement>(null);
  const carResults = useMemo(() => {
    if (!carQuery.trim()) {
      const popular = ["Toyota Corolla", "Toyota HiLux", "Mazda CX-5", "Toyota RAV4", "Ford Ranger", "Hyundai i30"];
      return VEHICLE_DATABASE.filter((v) => popular.some((p) => vehicleDisplayName(v).startsWith(p))).slice(0, 6);
    }
    const terms = carQuery.toLowerCase().split(/\s+/);
    return VEHICLE_DATABASE.filter((v) => { const n = vehicleDisplayName(v).toLowerCase(); return terms.every((t) => n.includes(t)); }).slice(0, 8);
  }, [carQuery]);

  const handleSaveCustomCar = () => {
    const profile: VehicleProfile = {
      name: customName || "My car",
      tankSize: parseFloat(customTank) || 55,
      consumption: parseFloat(customConsumption) || 8.5,
      fuelType: customFuel,
    };
    setVehicleProfile(profile);
    setSelectedFuelType(customFuel);
    try { localStorage.setItem("petrolsaver-fuel-chosen", customFuel); } catch {}
    setCarCustom(false);
    setExpanded(null);
  };

  const handleSelectCar = (v: VehicleSpec) => {
    const profile: VehicleProfile = { name: vehicleDisplayName(v), tankSize: v.tankSize, consumption: v.consumption, fuelType: v.fuelType };
    setVehicleProfile(profile);
    setSelectedFuelType(v.fuelType);
    try { localStorage.setItem("petrolsaver-fuel-chosen", v.fuelType); } catch {}
    setCarQuery("");
    setExpanded(null);
  };

  // Filters
  const [brandQuery, setBrandQuery] = useState("");
  const brandInputRef = useRef<HTMLInputElement>(null);

  const barRef = useRef<HTMLDivElement>(null);

  // ─── Computed ───
  const tankSize = vehicleProfile.tankSize;
  const tankPercent = Math.min(1, rangeKm / 800);
  const fuelInTank = tankSize * tankPercent;
  const litresFillingUp = Math.max(0, tankSize - fuelInTank);
  const fuelLabel = selectedFuelType === "DSL" ? "Diesel" : selectedFuelType === "PDSL" ? "P.Diesel" : selectedFuelType;
  const isTripActive = tripMode === "trip" && tripDestination;

  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    allStations.forEach((s) => { if (s.brand?.name) brands.add(s.brand.name); });
    return [...brands].sort();
  }, [allStations]);

  const avgPrice = useMemo(() => {
    const prices = allStations
      .map((s: { prices: { fuelType: string; price: number }[] }) => s.prices.find((p) => p.fuelType === selectedFuelType)?.price)
      .filter((p: number | undefined): p is number => p != null && p < 500);
    if (prices.length === 0) return 180;
    return prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
  }, [allStations, selectedFuelType]);

  const filteredBrands = brandQuery
    ? availableBrands.filter((b) => b.toLowerCase().includes(brandQuery.toLowerCase()))
    : availableBrands;

  const fillLabel = fillMode === "litres" && fillLitresInput ? `${fillLitresInput}L`
    : fillMode === "dollars" && fillDollarsInput ? `$${fillDollarsInput}`
    : `~${Math.round(litresFillingUp)}L`;

  const activeFilterCount = (selectedBrands.length > 0 ? 1 : 0) + (timeValuePerHour > 0 ? 1 : 0) + (costModel === "fullCost" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  // ─── Effects ───
  useEffect(() => {
    if (!userLocation) return;
    fetch(`/api/geocode?mode=reverse&lat=${userLocation.lat}&lng=${userLocation.lng}`)
      .then((r) => r.json())
      .then((data) => { const n = data.address?.suburb || data.address?.town || data.address?.city; if (n) setGpsSuburb(n); })
      .catch(() => {});
  }, [userLocation?.lat, userLocation?.lng]);

  useEffect(() => {
    if (expanded === "trip") {
      setLocalDest(tripDestination);
      setDestQuery(tripDestination?.name || "");
      setLocalOrigin(tripOrigin);
      setEditingOrigin(false);
      setDestResults([]);
      setTimeout(() => destInputRef.current?.focus(), 200);
    }
    if (expanded === "trip" && appMode === "tolls") {
      setTollOriginQuery(tollStore.origin?.label || "");
      setTollDestQuery(tollStore.destination?.label || "");
      setTollOriginResults([]);
      setTollDestResults([]);
      setTimeout(() => tollDestRef.current?.focus(), 200);
    }
    if (expanded === "car") { setCarQuery(""); setCarCustom(false); setTimeout(() => carInputRef.current?.focus(), 200); }
    if (expanded === "fill") { setFillLitresInput(""); setFillDollarsInput(""); }
  }, [expanded]);

  useEffect(() => {
    if (modal === "filters") { setBrandQuery(""); setTimeout(() => brandInputRef.current?.focus(), 50); }
  }, [modal]);

  // Sync vehicle profile + live fuel price to toll settings
  useEffect(() => {
    tollStore.updateSettings({ fuelConsumption: vehicleProfile.consumption, costModel });
  }, [vehicleProfile.consumption, costModel]);

  // Sync live fuel price to toll settings
  useEffect(() => {
    if (avgPrice > 0) {
      tollStore.updateSettings({ fuelPriceCentsPerLitre: Math.round(avgPrice) });
    }
  }, [avgPrice]);

  // Close on click outside
  useEffect(() => {
    if (!expanded) return;
    const handle = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setExpanded(null);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [expanded]);

  // ─── Handlers ───
  const searchDest = useCallback((q: string) => {
    if (q.length < 2) { setDestResults([]); return; }
    setDestLoading(true);
    fetch(`/api/geocode?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((d: SearchResult[]) => { setDestResults(d); setDestLoading(false); }).catch(() => setDestLoading(false));
  }, []);
  const handleDestInput = (v: string) => { setDestQuery(v); setLocalDest(null); clearTimeout(debounceRef.current); if (!v) { setDestResults([]); return; } debounceRef.current = setTimeout(() => searchDest(v), 300); };
  const handleSelectDest = (r: SearchResult) => { const n = r.display_name.split(",").slice(0, 2).join(",").trim(); setLocalDest({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), name: n }); setDestQuery(n); setDestResults([]); };

  const searchOriginFn = useCallback((q: string) => {
    if (q.length < 2) { setOriginResults([]); return; }
    setOriginLoading(true);
    fetch(`/api/geocode?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((d: SearchResult[]) => { setOriginResults(d); setOriginLoading(false); }).catch(() => setOriginLoading(false));
  }, []);
  const handleOriginInput = (v: string) => { setOriginQuery(v); clearTimeout(originDebounceRef.current); if (!v) { setOriginResults([]); return; } originDebounceRef.current = setTimeout(() => searchOriginFn(v), 300); };
  const handleSelectOrigin = (r: SearchResult) => { const n = r.display_name.split(",").slice(0, 2).join(",").trim(); setLocalOrigin({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), name: n }); setOriginQuery(n); setOriginResults([]); setEditingOrigin(false); };

  const handleGo = () => { if (!localDest) return; setTripDestination(localDest); if (localOrigin) setTripOrigin(localOrigin); else setTripOrigin(null); setTripMode("trip"); setExpanded(null); };
  const handleClearTrip = (e: React.MouseEvent) => { e.stopPropagation(); setTripMode("nearby"); setTripDestination(null); setTripOrigin(null); };

  const searchLocation = useCallback((q: string) => {
    if (q.length < 2) { setLocResults([]); return; }
    setLocLoading(true);
    fetch(`/api/geocode?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((d: SearchResult[]) => { setLocResults(d); setLocLoading(false); }).catch(() => setLocLoading(false));
  }, []);
  const handleLocInput = (v: string) => { setLocQuery(v); clearTimeout(locDebounceRef.current); if (!v) { setLocResults([]); return; } locDebounceRef.current = setTimeout(() => searchLocation(v), 300); };
  const handleSelectLocation = (r: SearchResult) => { const n = r.display_name.split(",").slice(0, 2).join(",").trim(); const lat = parseFloat(r.lat); const lng = parseFloat(r.lon); setManualLocation({ lat, lng }, n); setFlyToTarget({ lat, lng, zoom: 13 }); setLocQuery(""); setLocResults([]); };
  const handleUseGps = () => {
    clearManualLocation();
    if ("geolocation" in navigator) { navigator.geolocation.getCurrentPosition((p) => { const l = { lat: p.coords.latitude, lng: p.coords.longitude }; setUserLocation(l); setFlyToTarget({ ...l, zoom: 13 }); }, () => { setUserLocation({ lat: -37.8136, lng: 144.9631 }); setFlyToTarget({ lat: -37.8136, lng: 144.9631, zoom: 13 }); }, { enableHighAccuracy: false, timeout: 15000 }); }
  };

  const litrestoRangeKm = (l: number) => Math.round(Math.max(0, Math.min(1, 1 - l / tankSize)) * 800);
  const dollarsToRangeKm = (d: number) => litrestoRangeKm(d / (avgPrice / 100));
  const toggleBrand = (b: string) => { if (selectedBrands.includes(b)) setSelectedBrands(selectedBrands.filter((x) => x !== b)); else setSelectedBrands([...selectedBrands, b]); };

  const originDisplayName = localOrigin?.name || gpsSuburb || "Your location";

  // ─── Styles ───
  const btnBase = "flex items-center gap-2 px-5 py-3 text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap";

  const fuelTripLabel = isTripActive
    ? tripDestination.name
    : locationSource === "manual" && locationName
    ? locationName.split(",")[0].trim()
    : "Plan a trip...";

  const tollTripLabel = tollStore.comparison
    ? `${tollStore.origin?.label?.split(",")[0] || "?"} → ${tollStore.destination?.label?.split(",")[0] || "?"}`
    : "Compare routes...";

  const tripLabel = appMode === "tolls" ? tollTripLabel : fuelTripLabel;

  return (
    <>
      {/* Backdrop when expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      <div
        ref={barRef}
        className="absolute top-3 left-3 right-3 z-[1000] flex flex-col md:flex-row md:items-start gap-2"
      >
        {/* Mode toggle — mobile: full width row, desktop: compact pill left */}
        <div className="flex items-center bg-[var(--card)] rounded-full border border-[var(--subtle-border)] shadow-lg p-0.5 md:shrink-0">
          {([
            { id: "petrol" as AppMode, label: "Fuel", icon: Fuel },
            { id: "tolls" as AppMode, label: "Tolls", icon: Route },
          ]).map((m) => {
            const active = appMode === m.id;
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-[12px] md:text-[13px] font-bold transition-all cursor-pointer ${
                  active ? "bg-[var(--foreground)] text-[var(--card)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}>
                <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={2} />
                {m.label}
              </button>
            );
          })}
        </div>
        <div className="hidden md:block flex-1" />

        {/* ─── Main pill bar (desktop only when collapsed, both when expanded) ─── */}
        <motion.div
          layout
          transition={{ type: "spring", damping: 28, stiffness: 350 }}
          className={`flex min-w-0 flex-1 md:flex-none bg-[var(--card)] border border-[var(--subtle-border)] flex-col transition-shadow ${
            expanded ? "rounded-2xl md:w-[480px] shadow-2xl" : "rounded-full shadow-lg hover:shadow-xl overflow-hidden"
          }`}
        >
          {/* Segments row */}
          <motion.div layout className="flex items-center">
            {([
              { id: "trip" as ExpandedPanel, icon: MapPin, iconColor: "text-[var(--accent-text)]",
                label: tripLabel,
                mobileLabel: isTripActive ? tripDestination!.name.split(",")[0] : appMode === "tolls" ? "Route..." : "Trip...",
                extra: isTripActive ? <span onClick={handleClearTrip} className="p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer ml-0.5"><X className="h-3 w-3" strokeWidth={2.5} /></span> : null },
              { id: "car" as ExpandedPanel, icon: Car, iconColor: "text-[var(--muted)]",
                label: vehicleProfile.name,
                mobileLabel: vehicleProfile.name.split(" ").slice(-2).join(" "),
                extra: null },
              { id: "fill" as ExpandedPanel, icon: Gauge, iconColor: "text-[var(--muted)]",
                label: fillLabel,
                mobileLabel: fillLabel,
                extra: null },
            ]).map((seg, i, arr) => {
              const isActive = expanded === seg.id;
              const isFirst = i === 0;
              const isLast = i === arr.length - 1;
              const Icon = seg.icon;
              return (
                <div key={seg.id} className="flex items-center flex-1 min-w-0">
                  {i > 0 && <div className="w-px h-6 shrink-0 bg-[var(--subtle-border)]" />}
                  <button
                    onClick={() => setExpanded(expanded === seg.id ? null : seg.id)}
                    className={`flex items-center gap-2 py-3 text-[13px] font-medium cursor-pointer whitespace-nowrap w-full justify-center transition-colors ${
                      isFirst && !expanded ? "rounded-l-full pl-5 pr-3" : isLast && !expanded ? "rounded-r-full pr-5 pl-3" : "px-3"
                    } ${isActive ? "bg-[var(--subtle)] text-[var(--foreground)]" : "text-[var(--foreground)]"}`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${seg.iconColor}`} strokeWidth={1.5} />
                    <span className="hidden md:inline truncate">{seg.label}</span>
                    <span className="md:hidden truncate">{seg.mobileLabel}</span>
                    {seg.extra}
                  </button>
                </div>
              );
            })}
          </motion.div>

          {/* ─── Expanded panel (drops down from pill bar) ─── */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 28, stiffness: 350 }}
                className="overflow-hidden"
              >
                <div className="border-t border-[var(--subtle-border)]" />

                {/* ─── Trip panel ─── */}
                {expanded === "trip" && appMode === "tolls" && (
                  <div className="p-4 space-y-3 max-h-[50vh] md:max-h-[60vh] overflow-y-auto">
                    {/* Toll: Origin */}
                    <div>
                      <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">From</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#4285f4] pointer-events-none" strokeWidth={2} />
                        <input ref={tollOriginRef} type="text" value={tollOriginQuery} onChange={(e) => handleTollOriginInput(e.target.value)}
                          placeholder={gpsSuburb || "Your location (GPS)"} style={{ fontSize: "16px" }}
                          className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors" />
                        {tollOriginLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />}
                      </div>
                      {tollOriginResults.length > 0 && (
                        <div className="mt-1.5 rounded-xl border border-[var(--subtle-border)] bg-[var(--background)] overflow-hidden">
                          {tollOriginResults.map((r, i) => (
                            <button key={i} onClick={() => handleSelectTollOrigin(r)}
                              className="w-full text-left px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--subtle-hover)] transition-colors border-b border-[var(--subtle-border)] last:border-0 truncate cursor-pointer">
                              {r.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Toll: Destination */}
                    <div>
                      <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">To</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--tier-exp)] pointer-events-none" strokeWidth={2} />
                        <input ref={tollDestRef} type="text" value={tollDestQuery} onChange={(e) => handleTollDestInput(e.target.value)}
                          placeholder="Where are you going?" style={{ fontSize: "16px" }}
                          className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors" />
                        {tollDestLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />}
                      </div>
                      {tollDestResults.length > 0 && (
                        <div className="mt-1.5 rounded-xl border border-[var(--subtle-border)] bg-[var(--background)] overflow-hidden">
                          {tollDestResults.map((r, i) => (
                            <button key={i} onClick={() => { handleSelectTollDest(r); setExpanded(null); }}
                              className="w-full text-left px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--subtle-hover)] transition-colors border-b border-[var(--subtle-border)] last:border-0 truncate cursor-pointer">
                              {r.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {tollStore.loading && (
                      <div className="flex items-center justify-center gap-2 py-2">
                        <div className="h-4 w-4 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                        <span className="text-xs text-[var(--muted)]">Comparing routes...</span>
                      </div>
                    )}

                    {/* Compare button */}
                    {!tollStore.loading && (
                      <motion.button whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          // Close immediately
                          setExpanded(null);
                          // If no origin set, use GPS
                          if (!tollStore.origin && userLocation) {
                            tollStore.selectOrigin({ lat: userLocation.lat, lng: userLocation.lng, label: gpsSuburb || locationName || "Your location" });
                          } else if (tollStore.origin && tollStore.destination) {
                            tollStore.compare();
                          }
                        }}
                        disabled={!tollStore.destination}
                        className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          tollStore.destination ? "bg-[var(--foreground)] text-[var(--card)] hover:opacity-90 shadow-lg" : "bg-[var(--subtle)] text-[var(--muted)] cursor-not-allowed"
                        }`}>
                        <Route className="h-4 w-4" strokeWidth={2} />
                        Compare routes
                      </motion.button>
                    )}
                  </div>
                )}

                {expanded === "trip" && appMode !== "tolls" && (
                  <div className="p-4 space-y-3 max-h-[50vh] md:max-h-[60vh] overflow-y-auto">
                    {/* From */}
                    <div>
                      <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">From</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#4285f4] pointer-events-none" strokeWidth={2} />
                        <input type="text" value={originQuery} onChange={(e) => handleOriginInput(e.target.value)}
                          placeholder={gpsSuburb || "Your location (GPS)"} style={{ fontSize: "16px" }}
                          className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors" />
                        {originLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />}
                      </div>
                      {originResults.length > 0 && (
                        <div className="mt-1.5 rounded-xl border border-[var(--subtle-border)] bg-[var(--background)] overflow-hidden">
                          {originResults.map((r, i) => (
                            <button key={i} onClick={() => handleSelectOrigin(r)}
                              className="w-full text-left px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--subtle-hover)] transition-colors border-b border-[var(--subtle-border)] last:border-0 truncate cursor-pointer">
                              {r.display_name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* To */}
                    <div>
                      <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">To</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--tier-exp)] pointer-events-none" strokeWidth={2} />
                        <input ref={destInputRef} type="text" value={destQuery} onChange={(e) => handleDestInput(e.target.value)}
                          placeholder="Where are you going?" style={{ fontSize: "16px" }}
                          className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl pl-9 pr-9 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors" />
                        {destLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />}
                        {destQuery && !destLoading && (
                          <button onClick={() => { setDestQuery(""); setLocalDest(null); setDestResults([]); }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer">
                            <X className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                        )}
                      </div>
                      {destResults.length > 0 && (
                        <div className="mt-1.5 rounded-xl border border-[var(--subtle-border)] bg-[var(--background)] overflow-hidden">
                          {destResults.map((r, i) => (
                            <button key={i} onClick={() => handleSelectDest(r)}
                              className="w-full text-left px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--subtle-hover)] transition-colors border-b border-[var(--subtle-border)] last:border-0 truncate cursor-pointer">
                              {r.display_name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Go */}
                    <motion.button whileTap={{ scale: 0.98 }} onClick={handleGo} disabled={!localDest}
                      className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        localDest ? "bg-[var(--foreground)] text-[var(--card)] hover:opacity-90 shadow-lg" : "bg-[var(--subtle)] text-[var(--muted)] cursor-not-allowed"
                      }`}>
                      <Search className="h-4 w-4" strokeWidth={2.5} />
                      Find cheapest fuel
                    </motion.button>
                  </div>
                )}

                {/* ─── Car panel ─── */}
                {expanded === "car" && (
                  <div className="flex flex-col max-h-[50vh] md:max-h-[60vh]">
                    {!carCustom ? (
                      <>
                        {/* Scrollable search + results */}
                        <div className="p-4 pb-2 space-y-3 overflow-y-auto flex-1 min-h-0">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)] pointer-events-none" strokeWidth={2} />
                            <input ref={carInputRef} type="text" value={carQuery} onChange={(e) => setCarQuery(e.target.value)}
                              placeholder="Search make or model..." style={{ fontSize: "16px" }}
                              className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl pl-9 pr-9 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors" />
                            {carQuery && (
                              <button onClick={() => setCarQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer">
                                <X className="h-3.5 w-3.5" strokeWidth={2} />
                              </button>
                            )}
                          </div>
                          {!carQuery && <p className="text-[10px] text-[var(--muted)]">Popular cars</p>}
                          <div className="space-y-0.5">
                            {carResults.map((v, i) => (
                              <button key={`${v.make}-${v.model}-${v.variant || ""}-${i}`} onClick={() => handleSelectCar(v)}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer text-left group">
                                <div className="h-8 w-8 rounded-lg bg-[var(--subtle)] flex items-center justify-center shrink-0 group-hover:bg-[var(--accent-text)]/10 transition-colors">
                                  <Car className="h-4 w-4 text-[var(--muted)] group-hover:text-[var(--accent-text)]" strokeWidth={1.5} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[13px] font-semibold text-[var(--foreground)] truncate">{vehicleDisplayName(v)}</div>
                                  <div className="text-[10px] text-[var(--muted)]">{v.tankSize}L · {v.consumption}L/100km · {v.fuelType}</div>
                                </div>
                              </button>
                            ))}
                            {carQuery && carResults.length === 0 && (
                              <div className="py-4 text-center text-[12px] text-[var(--muted)]">No cars found for &ldquo;{carQuery}&rdquo;</div>
                            )}
                          </div>
                        </div>
                        {/* Sticky bottom */}
                        <div className="shrink-0 border-t border-[var(--subtle-border)] p-4 pt-3 bg-[var(--card)] rounded-b-2xl">
                          <button onClick={() => setCarCustom(true)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer text-left">
                            <div className="h-8 w-8 rounded-lg bg-[var(--subtle)] flex items-center justify-center shrink-0">
                              <Pencil className="h-4 w-4 text-[var(--muted)]" strokeWidth={1.5} />
                            </div>
                            <div>
                              <div className="text-[13px] font-semibold text-[var(--foreground)]">Enter manually</div>
                              <div className="text-[10px] text-[var(--muted)]">Set tank size and consumption yourself</div>
                            </div>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 space-y-3 overflow-y-auto">
                        <button onClick={() => setCarCustom(false)} className="text-[11px] text-[var(--accent-text)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
                          &larr; Back to search
                        </button>
                        <div>
                          <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">Vehicle name</label>
                          <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)}
                            placeholder="e.g. My Hilux" style={{ fontSize: "16px" }}
                            className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4]" />
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">Tank size</label>
                            <div className="relative">
                              <input type="number" value={customTank} onChange={(e) => setCustomTank(e.target.value)}
                                className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl px-3 py-2.5 text-sm font-mono text-[var(--foreground)] pr-8 focus:outline-none focus:border-[#4285f4]" />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">L</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">Consumption</label>
                            <div className="relative">
                              <input type="number" step="0.1" value={customConsumption} onChange={(e) => setCustomConsumption(e.target.value)}
                                className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl px-3 py-2.5 text-sm font-mono text-[var(--foreground)] pr-14 focus:outline-none focus:border-[#4285f4]" />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-[var(--muted)]">L/100km</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">Fuel type</label>
                          <div className="flex gap-1">
                            {["U91", "P95", "P98", "DSL", "E10", "LPG"].map((type) => (
                              <button key={type} onClick={() => setCustomFuel(type)}
                                className={`flex-1 py-2 rounded-lg text-[11px] font-bold font-mono text-center transition-all cursor-pointer ${
                                  customFuel === type ? "bg-[var(--foreground)] text-[var(--card)]" : "bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"
                                }`}>
                                {type === "DSL" ? "Diesel" : type}
                              </button>
                            ))}
                          </div>
                        </div>
                        <motion.button whileTap={{ scale: 0.98 }} onClick={handleSaveCustomCar}
                          className="w-full py-2.5 rounded-xl font-bold text-sm bg-[var(--foreground)] text-[var(--card)] hover:opacity-90 shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2">
                          <Check className="h-4 w-4" strokeWidth={2.5} />
                          Save vehicle
                        </motion.button>
                        <div className="text-center">
                          <span className="text-[10px] text-[var(--muted)]">
                            Currently: <strong className="text-[var(--foreground)]">{vehicleProfile.name}</strong> · {vehicleProfile.tankSize}L · {vehicleProfile.consumption}L/100km
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── Fill panel ─── */}
                {expanded === "fill" && (
                  <div className="p-4 space-y-3">
                    {/* Mode toggle */}
                    <div className="flex gap-1 p-0.5 rounded-lg bg-[var(--background)] border border-[var(--subtle-border)]">
                      {([
                        { id: "gauge" as const, label: "Gauge" },
                        { id: "litres" as const, label: "Litres" },
                        { id: "dollars" as const, label: "$" },
                      ]).map(({ id, label }) => (
                        <button key={id} onClick={() => setFillIntent(id, id === "gauge" ? null : useFuelStore.getState().fillLabel)}
                          className={`flex-1 py-1.5 rounded-md text-[10px] font-bold text-center transition-all cursor-pointer ${
                            fillMode === id ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>

                    {fillMode === "gauge" && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Fuel level</span>
                          <span className="text-xs font-bold font-mono text-[var(--foreground)]">~{Math.round(litresFillingUp)}L to fill</span>
                        </div>
                        <div className="relative h-5 rounded-lg bg-[var(--background)] border border-[var(--subtle-border)] overflow-hidden">
                          <div className="absolute inset-y-0 left-0 rounded-lg transition-all"
                            style={{ width: `${Math.min(100, tankPercent * 100)}%`, background: rangeKm <= 50 ? "#dc2626" : rangeKm <= 200 ? "#ea580c" : rangeKm <= 400 ? "#f59e0b" : "#22c55e" }} />
                          <input type="range" min={10} max={800} step={10} value={rangeKm}
                            onChange={(e) => { setRangeKm(Number(e.target.value)); setFillIntent("gauge", null); }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        </div>
                        <div className="flex justify-between text-[9px] text-[var(--muted)]">
                          <span>E</span><span>¼</span><span>½</span><span>¾</span><span>F</span>
                        </div>
                        <div className="text-[9px] text-[var(--muted)] text-center">{Math.round(fuelInTank)}L in tank · {tankSize}L total</div>
                      </>
                    )}

                    {fillMode === "litres" && (
                      <>
                        <div className="relative">
                          <input type="number" inputMode="decimal" value={fillLitresInput}
                            onChange={(e) => { setFillLitresInput(e.target.value); const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) { const c = Math.min(v, tankSize); setRangeKm(litrestoRangeKm(c)); setFillIntent("litres", c >= tankSize ? null : `${Math.round(c)}L`); } }}
                            placeholder={`e.g. ${Math.round(tankSize / 2)}`} style={{ fontSize: "16px" }}
                            className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl px-3 py-2.5 text-sm font-mono text-[var(--foreground)] pr-8 focus:outline-none focus:border-[#4285f4] transition-colors" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] font-mono">L</span>
                        </div>
                        <div className="flex gap-1.5">
                          {[10, 20, 30, 40].map((n) => (
                            <button key={n} onClick={() => { setFillLitresInput(String(n)); setRangeKm(litrestoRangeKm(Math.min(n, tankSize))); setFillIntent("litres", `${n}L`); }}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold font-mono text-center transition-all cursor-pointer ${fillLitresInput === String(n) ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}>
                              {n}L
                            </button>
                          ))}
                          <button onClick={() => { setFillLitresInput(String(tankSize)); setRangeKm(litrestoRangeKm(tankSize)); setFillIntent("litres", null); }}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold font-mono text-center transition-all cursor-pointer ${fillLitresInput === String(tankSize) ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}>
                            Full
                          </button>
                        </div>
                        {fillLitresInput && !isNaN(parseFloat(fillLitresInput)) && (
                          <div className="text-[9px] text-[var(--muted)] text-center">~${((parseFloat(fillLitresInput) * avgPrice) / 100).toFixed(0)} at avg {avgPrice.toFixed(1)}c/L</div>
                        )}
                      </>
                    )}

                    {fillMode === "dollars" && (
                      <>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] font-mono">$</span>
                          <input type="number" inputMode="decimal" value={fillDollarsInput}
                            onChange={(e) => { setFillDollarsInput(e.target.value); const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) { const mx = (tankSize * avgPrice) / 100; const c = Math.min(v, mx); setRangeKm(dollarsToRangeKm(c)); setFillIntent("dollars", c >= mx * 0.95 ? null : `$${Math.round(c)}`); } }}
                            placeholder="e.g. 50" style={{ fontSize: "16px" }}
                            className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl pl-7 pr-3 py-2.5 text-sm font-mono text-[var(--foreground)] focus:outline-none focus:border-[#4285f4] transition-colors" />
                        </div>
                        <div className="flex gap-1.5">
                          {[20, 40, 50, 80].map((n) => (
                            <button key={n} onClick={() => { setFillDollarsInput(String(n)); setRangeKm(dollarsToRangeKm(Math.min(n, (tankSize * avgPrice) / 100))); setFillIntent("dollars", `$${n}`); }}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold font-mono text-center transition-all cursor-pointer ${fillDollarsInput === String(n) ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}>
                              ${n}
                            </button>
                          ))}
                          <button onClick={() => { const fc = Math.round((tankSize * avgPrice) / 100); setFillDollarsInput(String(fc)); setRangeKm(litrestoRangeKm(tankSize)); setFillIntent("dollars", null); }}
                            className="flex-1 py-1.5 rounded-lg text-[10px] font-bold font-mono text-center transition-all cursor-pointer bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)]">
                            Full
                          </button>
                        </div>
                        {fillDollarsInput && !isNaN(parseFloat(fillDollarsInput)) && (
                          <div className="text-[9px] text-[var(--muted)] text-center">~{((parseFloat(fillDollarsInput) / (avgPrice / 100))).toFixed(0)}L at avg {avgPrice.toFixed(1)}c/L</div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="hidden md:block flex-1" />

        {/* Filters button — desktop only (mobile has it above bottom sheet) */}
        <motion.button
          layout
          onClick={() => setModal("filters")}
          className={`hidden md:flex items-center gap-1.5 px-3 py-3 text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap rounded-full border shadow-lg shrink-0 ${
              hasActiveFilters
                ? "bg-[var(--foreground)] text-[var(--card)] border-[var(--foreground)]"
                : "bg-[var(--card)] text-[var(--muted)] border-[var(--subtle-border)] hover:text-[var(--foreground)]"
            }`}
          >
            <span className="relative">
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
            {hasActiveFilters && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[var(--accent-text)] text-white text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
          </span>
            Filters
          </motion.button>
      </div>{/* end barRef */}

      {/* ─── Filters modal (portal) ─── */}
      {modal === "filters" && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[4000] flex items-end md:items-center justify-center" onClick={() => setModal(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative z-10 w-full max-w-md mx-4 rounded-t-2xl md:rounded-2xl bg-[var(--card)] border border-[var(--subtle-border)] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Filters</h2>
              <button onClick={() => setModal(null)} className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0">
              {/* Brands */}
              <div className="border-b border-[var(--subtle-border)]">
                <div className="px-5 py-2 text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider flex justify-between">
                  <span>Brands</span>
                  {selectedBrands.length > 0 && <button onClick={() => setSelectedBrands([])} className="text-[var(--accent-text)] cursor-pointer">Clear ({selectedBrands.length})</button>}
                </div>
                <div className="px-3 pb-1.5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)] pointer-events-none" strokeWidth={2} />
                    <input ref={brandInputRef} type="text" value={brandQuery} onChange={(e) => setBrandQuery(e.target.value)}
                      placeholder="Search brands..."
                      className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors" />
                  </div>
                </div>
                <div className="max-h-[160px] overflow-y-auto">
                  {filteredBrands.map((brand) => {
                    const sel = selectedBrands.includes(brand);
                    return (
                      <button key={brand} onClick={() => toggleBrand(brand)}
                        className={`w-full text-left px-4 py-2 text-xs font-mono transition-colors cursor-pointer flex items-center gap-2.5 ${sel ? "bg-[var(--subtle)] text-[var(--foreground)] font-semibold" : "text-[var(--foreground)] hover:bg-[var(--subtle-hover)]"}`}>
                        <BrandLogo brandName={brand} size="sm" />
                        <span className="flex-1">{brand}</span>
                        {sel && <Check className="h-3.5 w-3.5 text-[var(--tier-cheap)]" strokeWidth={2.5} />}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Detour cost */}
              <div className="border-b border-[var(--subtle-border)]">
                <div className="px-5 py-2 text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Detour cost</div>
                <button onClick={() => setCostModel("fuelOnly")}
                  className={`w-full text-left px-5 py-2 text-xs transition-colors cursor-pointer ${costModel === "fuelOnly" ? "bg-[var(--subtle)] text-[var(--foreground)] font-semibold" : "text-[var(--foreground)] hover:bg-[var(--subtle-hover)]"}`}>
                  Fuel only<span className="block text-[9px] text-[var(--muted)] font-normal mt-0.5">Just the petrol burned</span>
                </button>
                <button onClick={() => setCostModel("fullCost")}
                  className={`w-full text-left px-5 py-2 text-xs transition-colors cursor-pointer ${costModel === "fullCost" ? "bg-[var(--subtle)] text-[var(--foreground)] font-semibold" : "text-[var(--foreground)] hover:bg-[var(--subtle-hover)]"}`}>
                  Full cost (ATO 88¢/km)<span className="block text-[9px] text-[var(--muted)] font-normal mt-0.5">Fuel + tyres + servicing + depreciation</span>
                </button>
              </div>
              {/* Time value */}
              <div>
                <div className="px-5 py-2 text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Time value</div>
                {[0, 20, 30, 40, 50, 75, 100].map((n) => (
                  <button key={n} onClick={() => setTimeValuePerHour(n)}
                    className={`w-full text-left px-5 py-2 text-xs transition-colors cursor-pointer ${timeValuePerHour === n ? "bg-[var(--subtle)] text-[var(--foreground)] font-semibold" : "text-[var(--foreground)] hover:bg-[var(--subtle-hover)]"}`}>
                    {n === 0 ? "Ignore time cost" : `$${n}/hr`}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
}
