"use client";

const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const TAG_DESCRIPTIONS: Record<string, string> = {
  "Best for you": "Saves you the most after accounting for detour costs",
  "Good deal": "Below average price and worth the trip",
  "Nearby": "Convenient, but not the cheapest option",
};

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, RefreshCw, ChevronDown, Navigation, ArrowLeft, LocateFixed, Heart, TriangleAlert, X, Search, Send, Check, Zap, Droplets, Gauge, Store, Fuel } from "lucide-react";
import { AnimatePresence as AP } from "framer-motion";
import InlineReportForm from "@/components/shared/InlineReportForm";
import type { StationWithPrices } from "@/types/fuel";
import { haversineDistance } from "@/lib/geo";
import { useFuelStore } from "@/stores/fuel-store";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import { usePriceThresholds } from "@/stores/price-context";
import { getPriceTier } from "@/lib/price-utils";
import BrandLogo from "@/components/shared/BrandLogo";

import { getFlaggedStations } from "@/lib/flagged-stations";

import TripSummaryCard from "./TripSummaryCard";
import type { RankedOption as TripRankedOption } from "./TripSummaryCard";

interface FillStrategyProps {
  stations: StationWithPrices[];
  selectedFuelType: string;
  loading?: boolean;
  onRecentre?: () => void;
  onEditTrip?: () => void;
  mapCentre?: { lat: number; lng: number };
}

export type { TripRankedOption as RankedOption };

const DEFAULT_CONSUMPTION = 8.5; // L/100km — average passenger car
const DEFAULT_TANK_SIZE = 55; // litres — average Australian car tank
const MAX_RANGE_KM = 800; // slider max — represents a full tank
const ROAD_FACTOR = 1.35;
const AVG_CITY_SPEED = 35;

interface RankedOption {
  station: StationWithPrices;
  price: number;
  distance: number;
  detourKm: number;
  detourMins: number;
  netSavings: number; // vs nearest station
  tag: string; // "Best for you" | "Good deal" | "Nearby"
  isStale: boolean;
  updatedAt: string;
  source?: "official" | "community";
}

function SidebarBrandList({
  availableBrands, selectedBrands, onBrandsChange,
}: {
  availableBrands: string[]; selectedBrands: string[]; onBrandsChange: (brands: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const filtered = query
    ? availableBrands.filter((b) => b.toLowerCase().includes(query.toLowerCase()))
    : availableBrands;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="overflow-hidden"
    >
      <div className="pt-2.5">
        <div className="relative mb-1.5">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)] pointer-events-none" strokeWidth={2} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brands..."
            className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors"
          />
        </div>
        <div className="max-h-[200px] overflow-y-auto">
          {selectedBrands.length > 0 && !query && (
            <button
              onClick={() => onBrandsChange([])}
              className="w-full text-left px-3 py-1.5 text-xs font-medium text-[var(--accent-text)] hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer"
            >
              Clear all
            </button>
          )}
          {filtered.map((brand) => {
            const isSelected = selectedBrands.includes(brand);
            return (
              <button
                key={brand}
                onClick={() => {
                  if (isSelected) onBrandsChange(selectedBrands.filter((b) => b !== brand));
                  else onBrandsChange([...selectedBrands, brand]);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer flex items-center gap-2 ${
                  isSelected ? "bg-[var(--subtle)] text-[var(--foreground)] font-medium" : "text-[var(--foreground)] hover:bg-[var(--subtle-hover)]"
                }`}
              >
                <BrandLogo brandName={brand} size="sm" />
                <span className="flex-1 truncate">{brand}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-[var(--tier-cheap)] shrink-0" strokeWidth={2.5} />}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-xs text-[var(--muted)] text-center">No brands found</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SidebarBrandListInline({
  availableBrands, selectedBrands, onBrandsChange,
}: {
  availableBrands: string[]; selectedBrands: string[]; onBrandsChange: (brands: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const filtered = query
    ? availableBrands.filter((b) => b.toLowerCase().includes(query.toLowerCase()))
    : availableBrands;

  return (
    <>
      <div className="relative mb-1.5">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)] pointer-events-none" strokeWidth={2} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search brands..."
          className="w-full bg-[var(--background)] border border-[var(--subtle-border)] rounded pl-8 pr-3 py-1.5 text-[11px] font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors"
        />
      </div>
      <div className="max-h-[200px] overflow-y-auto rounded border border-[var(--subtle-border)] bg-[var(--background)]">
        {selectedBrands.length > 0 && !query && (
          <button
            onClick={() => onBrandsChange([])}
            className="w-full text-left px-3 py-1.5 text-[11px] font-mono font-medium text-[var(--accent-text)] hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer border-b border-[var(--subtle-border)]/50"
          >
            Clear all
          </button>
        )}
        {filtered.map((brand) => {
          const isSelected = selectedBrands.includes(brand);
          return (
            <button
              key={brand}
              onClick={() => {
                if (isSelected) onBrandsChange(selectedBrands.filter((b) => b !== brand));
                else onBrandsChange([...selectedBrands, brand]);
              }}
              className={`w-full text-left px-3 py-1.5 text-[11px] font-mono transition-colors cursor-pointer flex items-center gap-2 border-b border-[var(--subtle-border)]/30 last:border-0 ${
                isSelected ? "bg-[var(--subtle)] text-[var(--foreground)] font-medium" : "text-[var(--foreground)] hover:bg-[var(--subtle-hover)]"
              }`}
            >
              <BrandLogo brandName={brand} size="sm" />
              <span className="flex-1 truncate">{brand}</span>
              {isSelected && <Check className="h-3.5 w-3.5 text-[var(--tier-cheap)] shrink-0" strokeWidth={2.5} />}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-3 py-2 text-[11px] font-mono text-[var(--muted)] text-center">No brands found</div>
        )}
      </div>
    </>
  );
}

function SidebarFilters({
  selectedFuelType, onFuelTypeChange,
  rangeKm, onRangeChange,
  selectedBrands, onBrandsChange,
  availableBrands,
}: {
  selectedFuelType: string; onFuelTypeChange: (id: string) => void;
  rangeKm: number; onRangeChange: (km: number) => void;
  selectedBrands: string[]; onBrandsChange: (brands: string[]) => void;
  availableBrands: string[];
}) {
  const [expanded, setExpanded] = useState<"fuel" | "tank" | "brands" | null>(null);

  const fuelOptions = ["U91", "P95", "P98", "DSL", "E10", "LPG"];
  const fuelLabel = selectedFuelType === "DSL" ? "Diesel" : selectedFuelType === "PDSL" ? "P.Diesel" : selectedFuelType;
  const fuelFilterLabel = "Fuel";
  const tankFilterLabel = "Tank";
  const tankLabel = rangeKm <= 50 ? "Empty" : rangeKm <= 200 ? "¼" : rangeKm <= 400 ? "½" : rangeKm <= 600 ? "¾" : "Full";
  const brandsLabel = selectedBrands.length === 0 ? "All" : selectedBrands.length === 1 ? selectedBrands[0] : `${selectedBrands.length} selected`;

  return (
    <div className="hidden md:block shrink-0 border-b border-[var(--subtle-border)]">
      <div className="flex px-4">
        <button
          onClick={() => setExpanded(expanded === "fuel" ? null : "fuel")}
          className={`px-3 py-2 text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer border-b-2 -mb-px ${
            expanded === "fuel" ? "border-[var(--foreground)] text-[var(--foreground)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {fuelFilterLabel} <span className="font-mono">{fuelLabel}</span>
        </button>
        <button
          onClick={() => setExpanded(expanded === "tank" ? null : "tank")}
          className={`px-3 py-2 text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer border-b-2 -mb-px ${
            expanded === "tank" ? "border-[var(--foreground)] text-[var(--foreground)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {tankFilterLabel} <span className="font-mono">{tankLabel}</span>
        </button>
        <button
          onClick={() => setExpanded(expanded === "brands" ? null : "brands")}
          className={`px-3 py-2 text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer border-b-2 -mb-px ${
            expanded === "brands" || selectedBrands.length > 0 ? "border-[var(--foreground)] text-[var(--foreground)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Brands <span className="font-mono">{brandsLabel}</span>
        </button>
      </div>

      {/* Expanded panels */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key={expanded}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden bg-[var(--subtle)]/50"
          >
            <div className="px-4 py-3">
              {expanded === "fuel" && (
                <div className="flex gap-1">
                  {fuelOptions.map((id) => (
                    <button
                      key={id}
                      onClick={() => { onFuelTypeChange(id); setExpanded(null); }}
                      className={`flex-1 py-1.5 rounded text-[10px] font-medium font-mono text-center transition-all cursor-pointer ${
                        selectedFuelType === id
                          ? "bg-[var(--foreground)] text-[var(--card)]"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {id === "DSL" ? "Diesel" : id}
                    </button>
                  ))}
                </div>
              )}

              {expanded === "tank" && (
                <>
                  <div className="relative h-6 rounded-lg bg-[var(--background)] border border-[var(--subtle-border)] overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-lg"
                      animate={{ width: `${Math.min(100, (rangeKm / 800) * 100)}%` }}
                      transition={{ type: "spring", damping: 20, stiffness: 200 }}
                      style={{
                        background: rangeKm <= 50
                          ? "linear-gradient(90deg, #dc2626, #ef4444)"
                          : rangeKm <= 200
                          ? "linear-gradient(90deg, #ea580c, #f59e0b)"
                          : rangeKm <= 400
                          ? "linear-gradient(90deg, #f59e0b, #84cc16)"
                          : "linear-gradient(90deg, #22c55e, #4ade80)",
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[9px] font-medium text-white">
                        {rangeKm <= 50 ? "Almost empty" : rangeKm <= 200 ? "Getting low" : rangeKm <= 400 ? "Half tank" : "Plenty of fuel"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={800}
                      step={10}
                      value={rangeKm}
                      onChange={(e) => onRangeChange(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[9px] font-mono text-[var(--muted)]">
                    <span>E</span><span>¼</span><span>½</span><span>¾</span><span>F</span>
                  </div>
                </>
              )}

              {expanded === "brands" && (
                <SidebarBrandListInline
                  availableBrands={availableBrands}
                  selectedBrands={selectedBrands}
                  onBrandsChange={onBrandsChange}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileFloatingButtons({ onRecentre, mapCentre }: { onRecentre?: () => void; mapCentre?: { lat: number; lng: number } }) {
  const userLocation = useFuelStore((s) => s.userLocation);
  const searchOrigin = useFuelStore((s) => s.searchOrigin);
  const setSearchOrigin = useFuelStore((s) => s.setSearchOrigin);
  const tripMode = useFuelStore((s) => s.tripMode);

  const showSearch = tripMode === "nearby" && userLocation && mapCentre && (() => {
    const effectiveOrigin = searchOrigin ?? userLocation;
    return haversineDistance(effectiveOrigin.lat, effectiveOrigin.lng, mapCentre.lat, mapCentre.lng) > 2;
  })();

  return (
    <>
      {/* Search pill — centred above sheet */}
      {/* Floating buttons row — sits in flow above sheet, moves with it */}
      <div className="md:hidden flex items-center justify-end gap-2 px-3 mb-2 shrink-0">
        <AnimatePresence>
          {showSearch && mapCentre && (
            <motion.button
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
              onClick={() => setSearchOrigin(mapCentre)}
              className="inline-flex items-center gap-1 bg-[var(--card)] border border-[var(--subtle-border)] text-[var(--foreground)] px-3 py-1.5 rounded-full text-[11px] font-medium shadow-xl hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer mr-auto"
            >
              <Search className="h-3 w-3" strokeWidth={2.5} />
              Search here
            </motion.button>
          )}
        </AnimatePresence>
        {onRecentre && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.5 }}
            whileTap={{ scale: 0.9 }}
            onClick={onRecentre}
            className="h-9 w-9 rounded-full bg-[var(--card)] border border-[var(--subtle-border)] shadow-xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer shrink-0"
            title="Centre on my location"
          >
            <LocateFixed className="h-4 w-4" strokeWidth={2} />
          </motion.button>
        )}
      </div>
    </>
  );
}

export default function FillStrategy({ stations, selectedFuelType, loading, onRecentre, onEditTrip, mapCentre }: FillStrategyProps) {
  const userLocation = useFuelStore((s) => s.userLocation);
  const tripMode = useFuelStore((s) => s.tripMode);
  const tripDestination = useFuelStore((s) => s.tripDestination);
  const tripOrigin = useFuelStore((s) => s.tripOrigin);
  const rangeKm = useFuelStore((s) => s.rangeKm);
  const setSelectedStation = useFuelStore((s) => s.setSelectedStation);
  const setRecommendedStations = useFuelStore((s) => s.setRecommendedStations);
  const setActiveRouteStation = useFuelStore((s) => s.setActiveRouteStation);
  const setFlyToTarget = useFuelStore((s) => s.setFlyToTarget);
  const setFitBoundsTarget = useFuelStore((s) => s.setFitBoundsTarget);
  const selectedBrands = useFuelStore((s) => s.selectedBrands);
  const setSelectedBrands = useFuelStore((s) => s.setSelectedBrands);
  const setRangeKm = useFuelStore((s) => s.setRangeKm);
  const pinClickedStationId = useFuelStore((s) => s.pinClickedStationId);
  const setPinClickedStationId = useFuelStore((s) => s.setPinClickedStationId);
  const rawSetFuelType = useFuelStore((s) => s.setSelectedFuelType);
  const setUserLocation = useFuelStore((s) => s.setUserLocation);
  const searchOrigin = useFuelStore((s) => s.searchOrigin);
  const setSearchOrigin = useFuelStore((s) => s.setSearchOrigin);
  const origin = (tripMode === "trip" && tripOrigin) ? { lat: tripOrigin.lat, lng: tripOrigin.lng } : (searchOrigin ?? userLocation);
  const timeValuePerHour = useFuelStore((s) => s.timeValuePerHour);

  // Available brands for filter
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    stations.forEach((s) => { if (s.brand?.name) brands.add(s.brand.name); });
    return [...brands].sort();
  }, [stations]);
  const [showFuelPicker, setShowFuelPicker] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null); // desktop inline expand
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null); // mobile card view
  const [tripSelectedIdx, setTripSelectedIdx] = useState(0); // which option is selected in trip summary
  const [reportingStationId, setReportingStationId] = useState<string | null>(null);
  const [reportedStationIds, setReportedStationIds] = useState<Set<string>>(new Set());
  const [showAllTrip, setShowAllTrip] = useState(false);
  const [showAllNearby, setShowAllNearby] = useState(false);
  const lastUpdated = useMemo(() => {
    if (stations.length === 0) return "";
    let latest = "";
    for (const s of stations) {
      for (const p of s.prices) {
        if (p.updatedAt && p.updatedAt > latest) latest = p.updatedAt;
      }
    }
    if (!latest) return "";
    const d = new Date(latest);
    return d.toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
  }, [stations]);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);
  const setRowRef = useCallback((i: number, el: HTMLDivElement | null) => {
    if (el) rowRefs.current.set(i, el);
    else rowRefs.current.delete(i);
  }, []);
  const [minimised, setMinimised] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : true);
  const thresholds = usePriceThresholds();

  // Reverse geocode origin (searchOrigin or userLocation) to get suburb name
  useEffect(() => {
    if (!origin) return;
    fetch(
      `/api/geocode?mode=reverse&lat=${origin.lat}&lng=${origin.lng}`
    )
      .then((r) => r.json())
      .then((data) => {
        const name = data.address?.suburb || data.address?.town || data.address?.city || null;
        if (name) setLocationName(name);
      })
      .catch(() => {});
  }, [origin?.lat, origin?.lng]);

  const setSelectedFuelType = (id: string) => {
    rawSetFuelType(id);
    try { localStorage.setItem("petrolsaver-fuel-chosen", id); } catch {}
    setShowFuelPicker(false);
  };

  const refreshLocation = () => {
    setSearchOrigin(null);
    if (!("geolocation" in navigator)) {
      setUserLocation({ lat: -37.8136, lng: 144.9631 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation({ lat: -37.8136, lng: 144.9631 }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  function isOnRoute(sLat: number, sLng: number, oLat: number, oLng: number, dLat: number, dLng: number): boolean {
    const total = haversineDistance(oLat, oLng, dLat, dLng);
    const toS = haversineDistance(oLat, oLng, sLat, sLng);
    const sToDest = haversineDistance(sLat, sLng, dLat, dLng);
    return ((toS + sToDest) - total) < Math.max(5, total * 0.15) && toS < total;
  }

  const MAIN_FUEL_IDS = ["U91", "P95", "P98", "DSL", "E10", "LPG"];
  const allFuelTypes = Object.entries(FUEL_TYPE_LABELS);
  const fuelShort = selectedFuelType === "PDSL" ? "P.Diesel" : (FUEL_TYPE_LABELS[selectedFuelType] ?? selectedFuelType).replace("Unleaded ", "U").replace("Premium ", "P");

  const formatUpdated = (iso: string, source?: "official" | "community") => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHrs = Math.floor(diffMs / 3600000);
    const prefix = source === "community" ? "Reported" : "Updated";
    if (diffHrs < 1) return `${prefix} just now`;
    if (diffHrs < 24) return `${prefix} ${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return `${prefix} yesterday`;
    return `${prefix} ${diffDays}d ago`;
  };

  const getTierColor = (price: number) => {
    const tier = getPriceTier(price, thresholds);
    switch (tier) {
      case "cheap": return "text-[var(--tier-cheap)]";
      case "mid": return "text-[var(--tier-mid)]";
      case "expensive": return "text-[var(--tier-exp)]";
      default: return "text-[var(--muted)]";
    }
  };

  const getTagStyle = (price: number) => {
    const tier = getPriceTier(price, thresholds);
    switch (tier) {
      case "cheap": return "text-[var(--tier-cheap)] bg-[var(--tier-cheap)]/15";
      case "mid": return "text-[var(--tier-mid)] bg-[var(--tier-mid)]/15";
      case "expensive": return "text-[var(--tier-exp)] bg-[var(--tier-exp)]/15";
      default: return "text-[var(--muted)] bg-[var(--muted)]/15";
    }
  };

  // Build ranked options
  const { options } = useMemo(() => {
    if (!origin || stations.length === 0) return { options: [] as RankedOption[] };

    // Filter out user-flagged stations
    const flagged = getFlaggedStations();

    // Rough bounding box pre-filter (~0.45° ≈ 50km) to avoid computing
    // haversine distance for thousands of distant stations
    const boxDeg = 0.45;
    const withDistance = stations
      .filter((s) => Math.abs(s.latitude - origin.lat) < boxDeg && Math.abs(s.longitude - origin.lng) < boxDeg)
      .filter((s) => !flagged.has(s.id))
      .filter((s) => selectedBrands.length === 0 || (s.brand?.name && selectedBrands.includes(s.brand.name)))
      .map((s) => {
        const p = s.prices.find((pr) => pr.fuelType === selectedFuelType);
        if (!p) return null;
        return { station: s, price: p.price, isStale: !!p.isStale, updatedAt: p.updatedAt, source: p.source, distance: haversineDistance(origin.lat, origin.lng, s.latitude, s.longitude) * ROAD_FACTOR };
      }).filter(Boolean) as { station: StationWithPrices; price: number; isStale: boolean; updatedAt: string; source?: "official" | "community"; distance: number }[];

    if (withDistance.length === 0) return { options: [] };

    const safeRange = rangeKm * 0.7;
    const maxRadius = Math.min(searchOrigin ? 5 : 15, safeRange);
    // Estimate fuel in tank as a proportion of full tank based on range slider
    // Range slider: 10km (empty) to 800km (full) → maps to 0% to 100% of tank
    const tankPercent = Math.min(1, rangeKm / MAX_RANGE_KM);
    const fuelInTank = DEFAULT_TANK_SIZE * tankPercent;
    const litresFillingUp = Math.max(0, DEFAULT_TANK_SIZE - fuelInTank);

    // Get candidates
    let candidates: typeof withDistance;
    if (tripMode === "trip" && tripDestination) {
      const onRoute = withDistance
        .filter((s) => isOnRoute(s.station.latitude, s.station.longitude, origin.lat, origin.lng, tripDestination.lat, tripDestination.lng))
        .filter((s) => s.distance <= safeRange);
      candidates = onRoute.length > 0 ? onRoute : withDistance.filter((s) => s.distance <= safeRange);
    } else {
      candidates = withDistance.filter((s) => s.distance <= maxRadius);
    }

    if (candidates.length === 0) candidates = [withDistance.sort((a, b) => a.distance - b.distance)[0]];

    // Build unique options: closest, cheapest, and best value (if different)
    const byDistance = [...candidates].sort((a, b) => a.distance - b.distance);
    const byPrice = [...candidates].sort((a, b) => a.price - b.price);

    const closest = byDistance[0];
    const cheapest = byPrice[0];

    // Calculate real detour for a station based on mode
    const calcDetour = (station: { station: StationWithPrices; distance: number }) => {
      if (tripMode === "trip" && tripDestination && origin) {
        // Trip mode: how much does stopping here add to your trip?
        const directRoute = haversineDistance(origin.lat, origin.lng, tripDestination.lat, tripDestination.lng) * ROAD_FACTOR;
        const viaStation = (
          haversineDistance(origin.lat, origin.lng, station.station.latitude, station.station.longitude) +
          haversineDistance(station.station.latitude, station.station.longitude, tripDestination.lat, tripDestination.lng)
        ) * ROAD_FACTOR;
        return Math.max(0, viaStation - directRoute);
      }
      // Nearby mode: round trip difference vs closest
      return Math.max(0, station.distance - closest.distance) * 2;
    };

    // Calculate true cost for each candidate: price + detour fuel cost + time cost
    const withTrueCost = candidates.map((c) => {
      const detourKm = calcDetour(c);
      const detourMins = Math.round((detourKm / AVG_CITY_SPEED) * 60);
      const fuelCost = ((detourKm / 100) * DEFAULT_CONSUMPTION * c.price) / 100;
      const timeCost = (detourMins / 60) * timeValuePerHour;
      const savings = ((closest.price - c.price) * litresFillingUp) / 100 - fuelCost - timeCost;
      // True cost per litre: price + (detour fuel + time cost) spread across litres filling
      const trueCostPerLitre = litresFillingUp > 0
        ? c.price + ((fuelCost + timeCost) / litresFillingUp) * 100
        : c.price;
      return { ...c, detourKm, detourMins, netSavings: savings, trueCostPerLitre };
    });

    let options: RankedOption[];

    // Show ALL candidates sorted by true cost, with contextual labels
    const sorted = [...withTrueCost].sort((a, b) => a.trueCostPerLitre - b.trueCostPerLitre);
    const cheapestId = byPrice[0].station.id;
    options = sorted.map((item, i) => {
      const tier = getPriceTier(item.price, thresholds);
      let tag = "";
      if (i === 0 && tier !== "expensive") tag = "Best for you";
      else if (item.price < closest.price && item.netSavings > 0 && tier !== "expensive") tag = "Good deal";
      else if (item.distance <= 2) tag = "Nearby";
      return {
        station: item.station,
        price: item.price,
        distance: item.distance,
        detourKm: item.detourKm,
        detourMins: item.detourMins,
        netSavings: item.netSavings,
        tag: item.isStale ? "" : tag,
        isStale: item.isStale,
        updatedAt: item.updatedAt,
        source: item.source,
      };
    });

    return { options };
  }, [origin, stations, selectedFuelType, tripMode, tripDestination, rangeKm, thresholds, selectedBrands]);

  const closestOpt = useMemo(() => {
    if (options.length === 0) return null;
    return [...options].sort((a, b) => a.distance - b.distance)[0];
  }, [options]);

  // Area insights: short ticker stats
  const insightStats = useMemo(() => {
    if (options.length === 0 || stations.length === 0) return [];

    const allPrices = stations
      .map((s) => s.prices.find((p) => p.fuelType === selectedFuelType)?.price)
      .filter((p): p is number => p != null && p < 500);
    if (allPrices.length === 0) return [];

    const stateAvg = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
    const localPrices = options.map((o) => o.price);
    const localBest = Math.min(...localPrices);
    const localWorst = Math.max(...localPrices);
    const spread = localWorst - localBest;
    const diff = localPrices.reduce((a, b) => a + b, 0) / localPrices.length - stateAvg;
    const tankSavings = spread > 1 ? (spread * 55) / 100 : 0;

    const stats: string[] = [];

    const r = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

    // Short, punchy stats
    stats.push(`Avg **${r(stateAvg)}c** · Best nearby **${r(localBest)}c**`);

    if (Math.abs(diff) > 0.5) {
      stats.push(diff > 0 ? `Your area is **${r(diff)}c above** average` : `Your area is **${r(Math.abs(diff))}c below** average`);
    }

    if (tankSavings > 0.5) {
      stats.push(`Save up to **$${tankSavings.toFixed(0)}** per fill nearby`);
    }

    stats.push(`**${options.length} stations** compared`);

    return stats;
  }, [options, stations, selectedFuelType]);

  const [insightIndex, setInsightIndex] = useState(0);
  useEffect(() => {
    setInsightIndex(0);
    if (insightStats.length <= 1) return;
    const interval = setInterval(() => {
      setInsightIndex((prev) => (prev + 1) % insightStats.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [insightStats.length]);

  // Store recommended stations and fit map to show them
  useEffect(() => {
    setShowAllTrip(false);
    setShowAllNearby(false);
    setExpandedIndex(null);
    setSelectedIndex(null);
    setTripSelectedIdx(0);
    listRef.current?.scrollTo({ top: 0 });
    if (options.length > 0) {
      // In trip mode only recommend top 5, in nearby mode show all
      const visibleStations = tripMode === "trip" ? options.slice(0, 5) : options;
      setRecommendedStations(visibleStations.map((o) => o.station));

      // Fit map to show origin + top stations (trip mode only — nearby mode
      // stays at the user's current zoom to avoid a jarring zoom-out on load)
      if (origin && tripMode === "trip") {
        const fitOptions = options.slice(0, 5);
        const points: [number, number][] = [
          [origin.lat, origin.lng],
          ...fitOptions.map((o) => [o.station.latitude, o.station.longitude] as [number, number]),
        ];
        if (tripDestination) {
          points.push([tripDestination.lat, tripDestination.lng]);
        }
        setFitBoundsTarget({ points });
      }
    } else {
      setRecommendedStations([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.map(o => o.station.id).join(",")]);

  // Sync expanded/selected option with route line
  // In trip mode, use tripSelectedIdx. In nearby mode, use selectedIndex/expandedIndex.
  const activeStation = tripMode === "trip" && tripDestination && options.length > 0
    ? options[tripSelectedIdx]?.station ?? options[0].station
    : selectedIndex !== null && options[selectedIndex]
    ? options[selectedIndex].station
    : expandedIndex !== null && options[expandedIndex]
    ? options[expandedIndex].station
    : null;

  const setHighlightedStationIds = useFuelStore((s) => s.setHighlightedStationIds);
  const setFocusedStationId = useFuelStore((s) => s.setFocusedStationId);

  // Control which pins are highlighted (recommended) and which is focused
  useEffect(() => {
    // Focused: the one station the user is looking at
    if (tripMode === "trip" && options.length > 0) {
      const focused = options[tripSelectedIdx]?.station ?? options[0].station;
      setFocusedStationId(focused.id);
    } else {
      const focusedIndex = selectedIndex ?? expandedIndex;
      if (focusedIndex !== null && options[focusedIndex]) {
        setFocusedStationId(options[focusedIndex].station.id);
      } else {
        setFocusedStationId(null);
      }
    }

    // Highlighted: all recommended stations (always)
    if (options.length > 0) {
      const visibleOptions = tripMode === "trip" && !showAllTrip
        ? options.slice(0, 5)
        : options;
      setHighlightedStationIds(new Set(visibleOptions.map((o) => o.station.id)));
    } else {
      setHighlightedStationIds(new Set());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, expandedIndex, showAllTrip, options.length, tripSelectedIdx, tripMode]);

  useEffect(() => {
    setActiveRouteStation(activeStation);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStation?.id]);

  // Handle pin clicks — find station in list and select it
  useEffect(() => {
    if (!pinClickedStationId) return;
    const idx = options.findIndex((o) => o.station.id === pinClickedStationId);
    if (idx !== -1) {
      const opt = options[idx];

      if (tripMode === "trip") {
        // Trip mode: update which option is selected in TripSummaryCard
        setTripSelectedIdx(idx);
        setActiveRouteStation(opt.station);
        if (origin && tripDestination) {
          setFitBoundsTarget({
            points: [
              [origin.lat, origin.lng],
              [opt.station.latitude, opt.station.longitude],
              [tripDestination.lat, tripDestination.lng],
            ],
          });
        }
      } else {
        // Nearby mode — expand list if station is beyond top 5
        if (idx >= 5 && !showAllNearby) {
          setShowAllNearby(true);
        }
        const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
        if (isMobile) {
          setSelectedIndex(idx);
          setExpandedIndex(null);
          setMinimised(false);
        } else {
          setExpandedIndex(idx);
          setSelectedIndex(null);
          setMinimised(false);
        }
        // Scroll to the station after render
        requestAnimationFrame(() => {
          setTimeout(() => {
            const row = rowRefs.current.get(idx);
            if (row) {
              row.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 100);
        });
        if (origin) {
          setFitBoundsTarget({
            points: [
              [origin.lat, origin.lng],
              [opt.station.latitude, opt.station.longitude],
            ],
          });
        }
      }
    }
    setPinClickedStationId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinClickedStationId]);

  const handleGoTo = (station: StationWithPrices) => {
    setSelectedStation(station);
    setFlyToTarget({ lat: station.latitude, lng: station.longitude, zoom: 15 });
  };

  // Mobile card view helper
  const selectedOpt = selectedIndex !== null ? options[selectedIndex] : null;

  // Render station card (used for mobile selected view and desktop expanded)
  const renderStationCard = (opt: RankedOption, showHeader = true) => {
    const tierColor = getTierColor(opt.price);
    const fillLitres = Math.max(0, DEFAULT_TANK_SIZE * (1 - Math.min(1, rangeKm / MAX_RANGE_KM)));
    const detourFuelCost = opt.detourKm > 0 ? ((opt.detourKm / 100) * DEFAULT_CONSUMPTION * opt.price) / 100 : 0;
    const rawSavings = closestOpt ? ((closestOpt.price - opt.price) * fillLitres) / 100 : 0;
    const isReporting = reportingStationId === opt.station.id;

    if (isReporting) {
      return (
        <div className="px-3 pb-3">
          <InlineReportForm
            stationId={opt.station.id}
            stationName={opt.station.name}
            currentPrice={opt.price}
            selectedFuelType={selectedFuelType}
            onClose={() => setReportingStationId(null)}
            onSuccess={() => setReportedStationIds((prev) => new Set(prev).add(opt.station.id))}
          />
        </div>
      );
    }

    return (
      <div className="px-3 pb-3 space-y-2">
        {/* Station header — mobile card only */}
        {showHeader && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex items-center gap-3 pt-1"
          >
            <BrandLogo brandName={opt.station.brand?.name ?? "?"} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[var(--foreground)] truncate">{titleCase(opt.station.name)}</span>
                {opt.tag && <span className={`text-[8px] font-medium uppercase shrink-0 px-1.5 py-0.5 rounded ${getTagStyle(opt.price)}`}>{opt.tag}</span>}
              </div>
              <div className="text-[11px] text-[var(--muted)]">
                {(opt.distance + opt.detourKm).toFixed(1)}km away
              </div>
            </div>
            <div className={`text-xl font-semibold font-mono shrink-0 ${tierColor}`}>
              {opt.price.toFixed(1)}<span className="text-xs text-[var(--muted)]">c/L</span>
            </div>
          </motion.div>
        )}

        {/* Tag explanation */}
        {opt.tag && TAG_DESCRIPTIONS[opt.tag] && (
          <div className={`text-[10px] px-2 py-1.5 rounded ${getTagStyle(opt.price)}`}>
            <span className="font-medium">{opt.tag}</span> — {TAG_DESCRIPTIONS[opt.tag]}
          </div>
        )}

        {/* Breakdown table */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-[10px] rounded border border-[var(--subtle-border)] overflow-hidden"
        >
          {opt.detourKm > 0 ? (
            <>
              <div className="flex justify-between px-2.5 py-1.5">
                <span className="text-[var(--muted)]">Detour</span>
                <span className="text-[var(--foreground)] font-mono">+{opt.detourKm.toFixed(1)}km · ~{Math.round((opt.detourKm / AVG_CITY_SPEED) * 60)}min</span>
              </div>
              <div className="flex justify-between px-2.5 py-1.5 border-t border-[var(--subtle-border)]/50">
                <span className="text-[var(--muted)]">Fuel for detour</span>
                <span className="text-[var(--tier-exp)] font-mono">-${detourFuelCost.toFixed(2)}</span>
              </div>
              {timeValuePerHour > 0 && opt.detourMins > 0 && (
                <div className="flex justify-between px-2.5 py-1.5 border-t border-[var(--subtle-border)]/50">
                  <span className="text-[var(--muted)]">Time cost ({opt.detourMins}min × ${timeValuePerHour}/hr)</span>
                  <span className="text-[var(--tier-exp)] font-mono">-${((opt.detourMins / 60) * timeValuePerHour).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between px-2.5 py-1.5 border-t border-[var(--subtle-border)]/50">
                <span className="text-[var(--muted)]">Price savings</span>
                <span className={`font-mono ${rawSavings >= 0 ? "text-[var(--tier-cheap)]" : "text-[var(--tier-exp)]"}`}>{rawSavings >= 0 ? "+" : "-"}${Math.abs(rawSavings).toFixed(2)}</span>
              </div>
              <div className="flex justify-between px-2.5 py-1.5 border-t border-[var(--subtle-border)] bg-[var(--subtle)]/50">
                <span className="text-[var(--foreground)] font-medium">{opt.netSavings >= 0 ? "Net saving" : "Extra cost"}</span>
                <span className={`font-medium font-mono ${opt.netSavings >= 0 ? "text-[var(--tier-cheap)]" : "text-[var(--tier-exp)]"}`}>{opt.netSavings >= 0 ? "" : "+"}${Math.abs(opt.netSavings).toFixed(2)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between px-2.5 py-1.5">
                <span className="text-[var(--muted)]">Distance</span>
                <span className="text-[var(--foreground)] font-mono">{opt.distance.toFixed(1)}km · ~{Math.round((opt.distance / AVG_CITY_SPEED) * 60)}min</span>
              </div>
              <div className="flex justify-between px-2.5 py-1.5 border-t border-[var(--subtle-border)]/50">
                <span className="text-[var(--muted)]">No detour needed</span>
                <span className="text-[var(--tier-cheap)] font-mono">$0.00</span>
              </div>
            </>
          )}
          {fillLitres > 0 && (
            <div className="flex justify-between px-2.5 py-1.5 border-t border-[var(--subtle-border)] bg-[var(--card)]">
              <span className="text-[var(--muted)]">Fill ~{Math.round(fillLitres)}L to full</span>
              <span className="font-medium font-mono text-[var(--foreground)]">${((fillLitres * opt.price) / 100).toFixed(2)}</span>
            </div>
          )}
        </motion.div>

        {/* Data freshness */}
        <div className="text-[9px] text-[var(--muted)]">
          {reportedStationIds.has(opt.station.id)
            ? <span className="text-[var(--tier-cheap)]">Price reported by you</span>
            : formatUpdated(opt.updatedAt, opt.source)}
        </div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col gap-1.5"
        >
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${opt.station.latitude},${opt.station.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-1.5 bg-[var(--accent)] text-[var(--accent-contrast)] px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
          >
            <Navigation className="h-3.5 w-3.5" strokeWidth={2} />
            Directions
          </a>
          <div className="flex gap-1.5">
            <button
              onClick={() => setReportingStationId(opt.station.id)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[var(--subtle)] border border-[var(--subtle-border)] text-[var(--muted)] px-3 py-2 rounded-lg text-xs font-medium hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer"
            >
              <TriangleAlert className="h-3.5 w-3.5" strokeWidth={2} />
              Report a price
            </button>
            <button
              onClick={() => setSelectedStation(opt.station)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[var(--subtle)] border border-[var(--subtle-border)] text-[var(--muted)] px-3 py-2 rounded-lg text-xs font-medium hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer"
            >
              <Info className="h-3.5 w-3.5" strokeWidth={2} />
              Details
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const handleRowClick = (i: number, opt: RankedOption) => {
    // Mobile: show card view. Desktop: inline expand
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (isMobile) {
      setSelectedIndex(selectedIndex === i ? null : i);
      setExpandedIndex(null);
    } else {
      setExpandedIndex(expandedIndex === i ? null : i);
      setSelectedIndex(null);
    }
    if (origin) {
      setFitBoundsTarget({
        points: [
          [origin.lat, origin.lng],
          [opt.station.latitude, opt.station.longitude],
        ],
      });
    }
  };

  // Trip mode: render TripSummaryCard instead
  if (tripMode === "trip" && tripDestination && options.length > 0 && onEditTrip) {
    return (
      <TripSummaryCard
        options={options}
        closestOpt={closestOpt}
        onEditTrip={onEditTrip}
        selectedIdx={tripSelectedIdx}
        onSelectIdx={(idx) => {
          setTripSelectedIdx(idx);
          const opt = options[idx];
          if (opt) {
            setActiveRouteStation(opt.station);
            if (origin && tripDestination) {
              setFitBoundsTarget({
                points: [
                  [origin.lat, origin.lng],
                  [opt.station.latitude, opt.station.longitude],
                  [tripDestination.lat, tripDestination.lng],
                ],
              });
            }
          }
        }}
      />
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] max-h-[100dvh] md:relative md:w-full md:h-full md:max-h-none flex flex-col items-stretch">
    {/* Floating buttons above the sheet */}
    <MobileFloatingButtons onRecentre={onRecentre} mapCentre={mapCentre} />

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.3 }}
      className="w-full max-h-[45vh] md:max-h-none md:flex-1 rounded-t-2xl md:rounded-none border-t md:border-t-0 md:border-r border-[var(--subtle-border)] bg-[var(--card)]/95 backdrop-blur-xl shadow-2xl md:shadow-none overflow-hidden flex flex-col"
    >

      {/* Logo — desktop only */}
      <div className="hidden md:flex items-center gap-2 px-4 py-3 shrink-0 border-b border-[var(--subtle-border)]">
        <img src="/logos/nav-icon.png" alt="PetrolSaver" className="h-6 w-6" />
        <span className="text-sm font-bold text-[var(--foreground)]">Petrol<span className="text-[#4285f4]">Saver</span></span>
        <span className="text-[10px] text-[var(--muted)] truncate ml-auto">
          {locationName || ""}
        </span>
      </div>

      {/* Handle bar — tap to expand/collapse (hidden when card is showing on mobile) */}
      {selectedOpt === null && (
        <button
          onClick={() => { if (window.innerWidth < 768) { setMinimised(!minimised); setSelectedIndex(null); } }}
          className="shrink-0 w-full cursor-pointer md:hidden"
        >
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--subtle-border)]">
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[11px] text-[var(--muted)] truncate flex items-center gap-0.5">
                <span className="truncate">
                  {tripMode === "trip" && tripDestination
                    ? `Trip to ${tripDestination.name}`
                    : searchOrigin && locationName
                    ? `Searching near ${locationName}`
                    : locationName
                    ? locationName
                    : "Near you"
                  }
                </span>
                {searchOrigin && tripMode === "nearby" && (
                  <span
                    role="button"
                    tabIndex={0}
                    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); setSearchOrigin(null); }}
                    className="shrink-0 h-4 w-4 rounded-full bg-[var(--subtle)] hover:bg-[var(--subtle-hover)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                    title="Back to my location"
                  >
                    <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                  </span>
                )}
              </div>
            </div>
            <motion.div animate={{ rotate: minimised ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-4 w-4 text-[var(--muted)]" strokeWidth={2} />
            </motion.div>
          </div>
        </button>
      )}


      {/* === MOBILE: Station card view === */}
      <AnimatePresence mode="wait">
        {selectedOpt !== null && (
          <motion.div
            key={`card-${selectedOpt.station.id}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="md:hidden flex flex-col min-h-0 flex-1 overflow-y-auto overscroll-contain"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
          >
            {/* Back button */}
            <button
              onClick={() => setSelectedIndex(null)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--accent-text)] cursor-pointer shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
              All stations
            </button>
            {renderStationCard(selectedOpt)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed preview — show #1 station on mobile when minimised */}
      <AnimatePresence>
        {minimised && selectedOpt === null && options.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={() => setSelectedIndex(0)}
            className="md:hidden px-4 py-4 cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2">
              <BrandLogo brandName={options[0].station.brand?.name ?? "?"} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[var(--foreground)] text-base truncate">{options[0].station.name}</div>
                <div className="text-xs text-[var(--muted)]">{(options[0].distance + options[0].detourKm).toFixed(1)}km away</div>
              </div>
              {options[0].tag && (
                <span className={`text-[9px] font-medium uppercase shrink-0 px-2 py-1 rounded ${getTagStyle(options[0].price)}`}>{options[0].tag}</span>
              )}
            </div>
            <div className="flex items-end justify-between">
              <div className={`text-2xl font-semibold font-mono ${options[0].isStale ? "text-[var(--muted)] opacity-50" : getTierColor(options[0].price)}`}>
                {options[0].price.toFixed(1)}<span className="text-sm text-[var(--muted)]">c</span>
              </div>
              {!options[0].isStale && closestOpt && options[0].netSavings > 0 && (
                <span className="text-xs font-medium text-[var(--tier-cheap)]">
                  Save ${options[0].netSavings.toFixed(2)} vs closest
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options list */}
      <div ref={listRef} className={`overflow-y-auto flex-1 min-h-0 overscroll-contain ${minimised || selectedOpt !== null ? "hidden" : ""}`} style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}>
          {(!origin || loading) && options.length === 0 ? (
            <div>
              {/* Welcome explainer — shows while loading */}
              <div className="px-3 pt-3 pb-2">
                <div className="rounded-xl bg-[var(--subtle)] p-3.5 space-y-2">
                  <p className="text-[12px] font-semibold text-[var(--foreground)]">Finding you the cheapest fill</p>
                  <p className="text-[10px] text-[var(--muted)] leading-relaxed">
                    We compare every station nearby — not just the price, but the real cost including detour fuel{timeValuePerHour > 0 ? " and your time" : ""}. The cheapest pump isn&apos;t always the smartest deal.
                  </p>
                  <div className="flex gap-3 text-[9px] text-[var(--muted)]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--tier-cheap)]" />Cheap</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--tier-mid)]" />Mid</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--tier-exp)]" />Expensive</span>
                  </div>
                  <div className="text-[8px] text-[var(--muted)] flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>4,000+ stations</span>
                    <span>VIC + NSW</span>
                    <span>Updated hourly</span>
                  </div>
                </div>
              </div>
              <div className="px-3 py-3 flex items-center gap-2.5">
                <div className="h-4 w-4 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin shrink-0" />
                <span className="text-xs text-[var(--muted)]">{!userLocation ? "Finding your location..." : "Loading stations..."}</span>
              </div>
            </div>
          ) : options.length === 0 ? (
            <div className="px-3 py-4 text-xs text-[var(--muted)] text-center">
              No stations found for {FUEL_TYPE_LABELS[selectedFuelType] ?? selectedFuelType} nearby
            </div>
          ) : (
            <div>
              {(showAllTrip || tripMode === "nearby" ? options : options.slice(0, 5)).slice(0, showAllNearby ? undefined : 5).map((opt, i) => {
                const tierColor = getTierColor(opt.price);
                const isFirst = i === 0;
                const isExpanded = expandedIndex === i;
                const isActive = activeStation?.id === opt.station.id;

                return (
                  <div
                    ref={(el: HTMLDivElement | null) => setRowRef(i, el)}
                    key={opt.station.id}
                    className={`${(isExpanded || isActive) ? "bg-[var(--subtle)]" : ""} ${isFirst ? "border-b border-[var(--subtle-border)]" : "border-b border-[var(--subtle-border)]/50"}`}
                  >
                    <button
                      onClick={() => handleRowClick(i, opt)}
                      className={`w-full text-left transition-colors cursor-pointer ${isFirst ? "px-4 py-3" : "px-4 py-2.5 flex items-center gap-3"} ${(isExpanded || isActive) ? "" : "hover:bg-[var(--subtle-hover)] active:bg-[var(--subtle)]"}`}
                    >
                      {isFirst ? (
                        <>
                          {/* Featured station */}
                          <div className="flex items-center gap-3 mb-1.5">
                            <BrandLogo brandName={opt.station.brand?.name ?? "?"} size="lg" />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-[var(--foreground)] text-base truncate">{opt.station.name}</div>
                              <div className="text-xs text-[var(--muted)]">{(opt.distance + opt.detourKm).toFixed(1)}km away</div>
                            </div>
                            {opt.tag && (
                              <span className={`text-[9px] font-medium uppercase shrink-0 px-2 py-1 rounded ${getTagStyle(opt.price)}`}>{opt.tag}</span>
                            )}
                          </div>
                          <div className="flex items-end justify-between">
                            <div className={`text-2xl font-semibold font-mono ${opt.isStale ? "text-[var(--muted)] opacity-50" : tierColor}`}>
                              {opt.price.toFixed(1)}<span className="text-sm text-[var(--muted)]">c</span>
                            </div>
                            {!opt.isStale && closestOpt && opt.netSavings > 0 && (
                              <span className="text-xs font-medium text-[var(--tier-cheap)]">
                                Save ${opt.netSavings.toFixed(2)} vs closest
                              </span>
                            )}
                          </div>
                          {opt.isStale && (
                            <div className="flex items-center gap-1 text-[11px] text-[var(--tier-mid)] mt-2">
                              <TriangleAlert className="h-3 w-3 shrink-0" strokeWidth={2} />
                              Price may be outdated
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {/* List row */}
                          <span className="text-[10px] font-mono text-[var(--muted)] w-4 text-right shrink-0">{i + 1}</span>
                          <BrandLogo brandName={opt.station.brand?.name ?? "?"} size="md" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-[var(--foreground)] text-xs truncate">{opt.station.name}</div>
                            <div className="text-[10px] text-[var(--muted)] mt-0.5">
                              {opt.isStale ? (
                                <span className="flex items-center gap-0.5 text-[var(--tier-mid)]">
                                  <TriangleAlert className="h-3 w-3 inline shrink-0" strokeWidth={2} />
                                  Price may be outdated
                                </span>
                              ) : (
                                <>{(opt.distance + opt.detourKm).toFixed(1)}km</>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`font-medium font-mono ${opt.isStale ? "text-[var(--muted)] opacity-50" : tierColor} text-sm`}>
                              {opt.price.toFixed(1)}c
                            </div>
                            {opt.tag && (
                              <span className={`text-[8px] font-medium uppercase ${getTagStyle(opt.price)} px-1.5 py-0.5 rounded`}>{opt.tag}</span>
                            )}
                          </div>
                        </>
                      )}
                    </button>

                    {/* Desktop: inline expand */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden hidden md:block px-4 pb-3"
                        >
                          {renderStationCard(opt, false)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Show more / Show all */}
              {tripMode === "nearby" && !showAllNearby && options.length > 5 && (
                <button
                  onClick={() => setShowAllNearby(true)}
                  className="w-full py-3 text-xs text-[var(--accent-text)] hover:text-[var(--foreground)] font-medium transition-colors cursor-pointer"
                >
                  Show all {options.length} stations
                </button>
              )}

              {tripMode === "trip" && !showAllTrip && options.length > 5 && (
                <button
                  onClick={() => { setShowAllTrip(true); setRecommendedStations(options.map((o) => o.station)); }}
                  className="w-full py-3 text-xs text-[var(--accent-text)] hover:text-[var(--foreground)] font-medium transition-colors cursor-pointer"
                >
                  Show all {options.length} stations
                </button>
              )}

              {options[0]?.distance > 5 && tripMode === "nearby" && (
                <button onClick={refreshLocation} className="w-full flex items-center justify-center gap-1.5 px-4 pb-3 text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
                  <RefreshCw className="h-3 w-3" strokeWidth={2} />
                  Doesn&apos;t look right? Refresh location
                </button>
              )}
            </div>
          )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-[var(--subtle-border)]">
        <div className="px-3 py-2 flex items-center justify-center gap-1.5">
          <a href="/how-it-works" className="text-[9px] font-mono text-[var(--muted)] hover:text-[var(--foreground)] px-2 py-0.5 rounded-full border border-[var(--subtle-border)] hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer">How it works</a>
          <a href="/terms" className="text-[9px] font-mono text-[var(--muted)] hover:text-[var(--foreground)] px-2 py-0.5 rounded-full border border-[var(--subtle-border)] hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer">Terms</a>
          <a href="/privacy" className="text-[9px] font-mono text-[var(--muted)] hover:text-[var(--foreground)] px-2 py-0.5 rounded-full border border-[var(--subtle-border)] hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer">Privacy</a>
        </div>
      </div>
    </motion.div>

    </div>
  );
}
