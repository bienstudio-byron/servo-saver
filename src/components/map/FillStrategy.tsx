"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Info, RefreshCw, ChevronDown, Navigation, ArrowLeft, LocateFixed, Heart, TriangleAlert, X, Search, Send, Check, Zap, Droplets, Gauge, Store, Fuel, Flag, DollarSign, Ban, Clock, MapPinOff, SlidersHorizontal } from "lucide-react";
import InlineReportForm from "@/components/shared/InlineReportForm";
import PriceHistory from "@/components/shared/PriceHistory";
import type { StationWithPrices, RankedOption } from "@/types/fuel";
import { haversineDistance } from "@/lib/geo";
import { useFuelStore } from "@/stores/fuel-store";
import { useVehicleStore } from "@/stores/vehicle-store";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import { usePriceThresholds } from "@/stores/price-context";
import { getPriceTier } from "@/lib/price-utils";
import { titleCase, TAG_DESCRIPTIONS, formatUpdated, getTierColor, getTagStyle } from "@/lib/station-utils";
import BrandLogo from "@/components/shared/BrandLogo";
import { getFlaggedStations, flagStation, isStationFlagged } from "@/lib/flagged-stations";

function getDeviceId(): string {
  const key = "petrolsaver-device-id";
  let id = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  if (!id) { id = crypto.randomUUID(); try { localStorage.setItem(key, id); } catch {} }
  return id;
}
import SidebarFooter from "@/components/shared/SidebarFooter";

/** Desktop hover tooltip — fixed positioning, clamped to viewport edges */
function Tip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLSpanElement>(null);
  const tooltipWidth = 208; // w-52 = 13rem = 208px
  const padding = 8;

  const handleEnter = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      const centred = rect.left + rect.width / 2;
      const clamped = Math.max(padding + tooltipWidth / 2, Math.min(centred, window.innerWidth - padding - tooltipWidth / 2));
      setPos({ top: rect.top - 4, left: clamped });
    }
    setShow(true);
  };

  return (
    <span
      ref={iconRef}
      className="hidden md:inline-flex ml-0.5"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      <Info className={`h-3 w-3 text-[var(--muted)] transition-opacity cursor-help ${show ? "opacity-100" : "opacity-40"}`} strokeWidth={2} />
      {show && typeof document !== "undefined" && createPortal(
        <span
          className="fixed z-[9999] px-2.5 py-1.5 rounded-lg bg-[var(--foreground)] text-[var(--card)] text-[9px] leading-tight w-52 text-center shadow-lg pointer-events-none"
          style={{ top: pos.top, left: pos.left, transform: "translate(-50%, -100%)" }}
        >
          {text}
        </span>,
        document.body
      )}
    </span>
  );
}

import TripSummaryCard from "./TripSummaryCard";
import PriceTrendBanner from "@/components/shared/PriceTrendBanner";
function DesktopHeader({ locationName, searchOrigin }: { locationName: string | null; searchOrigin: { lat: number; lng: number } | null }) {
  const tripMode = useFuelStore((s) => s.tripMode);
  const tripDestination = useFuelStore((s) => s.tripDestination);
  const label = tripMode === "trip" && tripDestination
    ? `Trip to ${tripDestination.name}`
    : searchOrigin && locationName
    ? `Searching near ${locationName}`
    : locationName || "Near you";
  return (
    <div className="hidden md:flex items-center px-3.5 py-2.5 shrink-0 border-b border-[var(--subtle-border)]">
      <span className="text-[12px] font-semibold text-[var(--foreground)] truncate">{label}</span>
    </div>
  );
}

export type { RankedOption };

interface FillStrategyProps {
  stations: StationWithPrices[];
  selectedFuelType: string;
  loading?: boolean;
  onRecentre?: () => void;
  onEditTrip?: () => void;
  mapCentre?: { lat: number; lng: number };
}

const MAX_RANGE_KM = 800; // slider max — represents a full tank
const ROAD_FACTOR = 1.35;
const AVG_CITY_SPEED = 35;


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
  const setFiltersOpen = useFuelStore((s) => s.setFiltersOpen);
  const userLocation = useFuelStore((s) => s.userLocation);
  const searchOrigin = useFuelStore((s) => s.searchOrigin);
  const setSearchOrigin = useFuelStore((s) => s.setSearchOrigin);
  const tripMode = useFuelStore((s) => s.tripMode);
  const costModelActive = useVehicleStore((s) => s.costModel) === "fullCost";
  const brandsActive = useFuelStore((s) => s.selectedBrands).length > 0;
  const timeActive = useFuelStore((s) => s.timeValuePerHour) > 0;
  const hasActiveFilters = costModelActive || brandsActive || timeActive;

  const showSearch = tripMode === "nearby" && userLocation && mapCentre && (() => {
    const effectiveOrigin = searchOrigin ?? userLocation;
    return haversineDistance(effectiveOrigin.lat, effectiveOrigin.lng, mapCentre.lat, mapCentre.lng) > 2;
  })();

  const floatingBtnClass = "inline-flex items-center justify-center gap-1.5 bg-[var(--card)] border border-[var(--subtle-border)] text-[var(--muted)] px-3 h-9 rounded-full text-[11px] font-medium shadow-lg hover:text-[var(--foreground)] transition-colors cursor-pointer";

  return (
    <div className="md:hidden flex items-center justify-between px-3 mb-2 shrink-0">
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.3 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setFiltersOpen(true)}
        className={`${floatingBtnClass} ${hasActiveFilters ? "!bg-[var(--foreground)] !text-[var(--card)] !border-[var(--foreground)]" : ""}`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
        Settings{hasActiveFilters ? ` (${(costModelActive ? 1 : 0) + (brandsActive ? 1 : 0) + (timeActive ? 1 : 0)})` : ""}
      </motion.button>

      {onRecentre && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.5 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRecentre}
          className={`${floatingBtnClass} !px-0 w-9`}
        >
          <LocateFixed className="h-3.5 w-3.5" strokeWidth={2} />
        </motion.button>
      )}
    </div>
  );
}

export default function FillStrategy({ stations, selectedFuelType, loading, onRecentre, onEditTrip, mapCentre }: FillStrategyProps) {
  const vehicleProfile = useVehicleStore((s) => s.profile);
  const costModel = useVehicleStore((s) => s.costModel);
  const getCostPerKm = useVehicleStore((s) => s.getCostPerKm);
  const TANK_SIZE = vehicleProfile.tankSize;
  const CONSUMPTION = vehicleProfile.consumption;

  const fillLabel = useFuelStore((s) => s.fillLabel);
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
  const [flaggingStationId, setFlaggingStationId] = useState<string | null>(null);
  const [flaggedStationIds, setFlaggedStationIds] = useState<Set<string>>(new Set());
  const [globalFlags, setGlobalFlags] = useState<Record<string, { count: number; reasons: string[] }>>({});
  const [showAllTrip, setShowAllTrip] = useState(false);
  const [showAllNearby, setShowAllNearby] = useState(false);
  const [detourTolerance, setDetourTolerance] = useState<1 | 3 | 5>(3);
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

  // Fetch globally flagged stations
  useEffect(() => {
    fetch("/api/flag")
      .then((r) => r.json())
      .then((data) => { if (data.flags) setGlobalFlags(data.flags); })
      .catch(() => {});
  }, []);

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
    // Detour tolerance: how far off the direct route the station can be
    return ((toS + sToDest) - total) < detourTolerance && toS < total;
  }

  const MAIN_FUEL_IDS = ["U91", "P95", "P98", "DSL", "E10", "LPG"];
  const allFuelTypes = Object.entries(FUEL_TYPE_LABELS);
  const fuelShort = selectedFuelType === "PDSL" ? "P.Diesel" : (FUEL_TYPE_LABELS[selectedFuelType] ?? selectedFuelType).replace("Unleaded ", "U").replace("Premium ", "P");

  // Convenience wrappers that bind thresholds
  const tierColor = (price: number) => getTierColor(price, thresholds);
  const tagStyle = (price: number) => getTagStyle(price, thresholds);

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
        if (!p || p.price < 50 || p.price > 500) return null; // Filter bad data: <50c or >500c/L
        return { station: s, price: p.price, isStale: !!p.isStale, updatedAt: p.updatedAt, source: p.source, distance: haversineDistance(origin.lat, origin.lng, s.latitude, s.longitude) * ROAD_FACTOR };
      }).filter(Boolean) as { station: StationWithPrices; price: number; isStale: boolean; updatedAt: string; source?: "official" | "community"; distance: number }[];

    if (withDistance.length === 0) return { options: [] };

    const safeRange = rangeKm * 0.7;
    const maxRadius = Math.min(searchOrigin ? 5 : 15, safeRange);
    // Estimate fuel in tank as a proportion of full tank based on range slider
    // Range slider: 10km (empty) to 800km (full) → maps to 0% to 100% of tank
    const tankPercent = Math.min(1, rangeKm / MAX_RANGE_KM);
    const fuelInTank = TANK_SIZE * tankPercent;
    const litresFillingUp = Math.max(0, TANK_SIZE - fuelInTank);

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

    // Calculate true cost for each candidate: price + detour cost + time cost
    // In "fullCost" (ATO) mode, detour cost = ATO rate × km instead of fuel-only cost
    const withTrueCost = candidates.map((c) => {
      const detourKm = calcDetour(c);
      const detourMins = Math.round((detourKm / AVG_CITY_SPEED) * 60);
      const detourCost = detourKm * getCostPerKm(c.price);
      const timeCost = (detourMins / 60) * timeValuePerHour;
      const savings = ((closest.price - c.price) * litresFillingUp) / 100 - detourCost - timeCost;
      // True cost per litre: price + (detour + time cost) spread across litres filling
      const trueCostPerLitre = litresFillingUp > 0
        ? c.price + ((detourCost + timeCost) / litresFillingUp) * 100
        : c.price;
      return { ...c, detourKm, detourMins, detourCost, netSavings: savings, trueCostPerLitre };
    });

    let options: RankedOption[];

    // Show ALL candidates sorted by true cost, with contextual labels
    const sorted = [...withTrueCost].sort((a, b) => a.trueCostPerLitre - b.trueCostPerLitre);
    const cheapestId = byPrice[0].station.id;
    options = sorted.map((item, i) => {
      const tier = getPriceTier(item.price, thresholds);
      let tag = "";
      if (i === 0 && tier !== "expensive") tag = "Top pick";
      else if (item.price < closest.price && item.netSavings > 0 && tier !== "expensive") tag = "Worth it";
      else if (item.distance <= 2) tag = "Closest";
      return {
        station: item.station,
        price: item.price,
        distance: item.distance,
        detourKm: item.detourKm,
        detourMins: item.detourMins,
        detourCost: item.detourCost,
        netSavings: item.netSavings,
        tag: item.isStale ? "" : tag,
        isStale: item.isStale,
        updatedAt: item.updatedAt,
        source: item.source,
      };
    });

    return { options };
  }, [origin, stations, selectedFuelType, tripMode, tripDestination, rangeKm, thresholds, selectedBrands, costModel, getCostPerKm, detourTolerance]);

  const closestOpt = useMemo(() => {
    if (options.length === 0) return null;
    return [...options].sort((a, b) => a.distance - b.distance)[0];
  }, [options]);

  // Price ranking: percentile + rank for each station vs all stations with this fuel type
  const priceRankings = useMemo(() => {
    const allPrices = stations
      .map((s) => s.prices.find((p) => p.fuelType === selectedFuelType)?.price)
      .filter((p): p is number => p != null && p < 500)
      .sort((a, b) => a - b);
    if (allPrices.length === 0) return new Map<string, { percentile: number; rank: number; total: number }>();
    const map = new Map<string, { percentile: number; rank: number; total: number }>();
    for (const opt of options) {
      const cheaperCount = allPrices.filter((p) => p > opt.price).length;
      const percentile = Math.round((cheaperCount / allPrices.length) * 100);
      const rank = allPrices.filter((p) => p < opt.price).length + 1;
      map.set(opt.station.id, { percentile, rank, total: allPrices.length });
    }
    return map;
  }, [stations, selectedFuelType, options]);

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
    const tankSavings = spread > 1 ? (spread * TANK_SIZE) / 100 : 0;

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
    const optTierColor = tierColor(opt.price);
    const fillLitres = Math.max(0, TANK_SIZE * (1 - Math.min(1, rangeKm / MAX_RANGE_KM)));
    const detourCostDisplay = opt.detourCost ?? (opt.detourKm > 0 ? ((opt.detourKm / 100) * CONSUMPTION * opt.price) / 100 : 0);
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
                {opt.tag && <span className={`text-[8px] font-medium uppercase shrink-0 px-1.5 py-0.5 rounded ${tagStyle(opt.price)}`}>{opt.tag}</span>}
              </div>
              <div className="text-[11px] text-[var(--muted)]">
                {(opt.distance + opt.detourKm).toFixed(1)}km away
              </div>
            </div>
            <div className={`text-xl font-semibold font-mono shrink-0 ${optTierColor}`}>
              {opt.price.toFixed(1)}<span className="text-xs text-[var(--muted)]">c/L</span>
            </div>
          </motion.div>
        )}

        {/* Tag explanation */}
        {opt.tag && TAG_DESCRIPTIONS[opt.tag] && (
          <div className={`text-[10px] px-2 py-1.5 rounded ${tagStyle(opt.price)}`}>
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
                <span className="text-[var(--muted)] flex items-center">Detour<Tip text="Extra distance compared to the closest station. Estimated at 1.35× straight-line distance." /></span>
                <span className="text-[var(--foreground)] font-mono">+{opt.detourKm.toFixed(1)}km · ~{Math.round((opt.detourKm / AVG_CITY_SPEED) * 60)}min</span>
              </div>
              <div className="flex justify-between px-2.5 py-1.5 border-t border-[var(--subtle-border)]/50">
                <span className="text-[var(--muted)] flex items-center">
                  {costModel === "fullCost" ? "Detour cost (ATO)" : "Fuel for detour"}
                  <Tip text={costModel === "fullCost"
                    ? "Full vehicle cost at ATO rate of 88c/km — includes fuel, tyres, servicing, depreciation."
                    : "Extra fuel burned driving to this station and back, based on your car's consumption rate."
                  } />
                </span>
                <span className="text-[var(--tier-exp)] font-mono">-${detourCostDisplay.toFixed(2)}</span>
              </div>
              {timeValuePerHour > 0 && opt.detourMins > 0 && (
                <div className="flex justify-between px-2.5 py-1.5 border-t border-[var(--subtle-border)]/50">
                  <span className="text-[var(--muted)] flex items-center">Time cost ({opt.detourMins}min × ${timeValuePerHour}/hr)<Tip text="What your time is worth. Set this in the More filter to factor it into recommendations." /></span>
                  <span className="text-[var(--tier-exp)] font-mono">-${((opt.detourMins / 60) * timeValuePerHour).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between px-2.5 py-1.5 border-t border-[var(--subtle-border)]/50">
                <span className="text-[var(--muted)] flex items-center">Price savings<Tip text="How much you save from the cheaper price alone, based on how many litres you're filling." /></span>
                <span className={`font-mono ${rawSavings >= 0 ? "text-[var(--tier-cheap)]" : "text-[var(--tier-exp)]"}`}>{rawSavings >= 0 ? "+" : "-"}${Math.abs(rawSavings).toFixed(2)}</span>
              </div>
              <div className={`flex justify-between px-2.5 py-1.5 border-t border-[var(--subtle-border)] ${opt.netSavings >= 5 ? "bg-[var(--tier-cheap)]/8 animate-pulse-once" : "bg-[var(--subtle)]/50"}`}>
                <span className="text-[var(--foreground)] font-medium flex items-center">{opt.netSavings >= 0 ? "You save" : "Extra cost"}<Tip text="Price savings minus detour costs. Positive = you save money. Negative = the detour costs more than the cheaper price saves." /></span>
                <span className={`font-medium font-mono ${opt.netSavings >= 0 ? "text-[var(--tier-cheap)]" : "text-[var(--tier-exp)]"}`}>{opt.netSavings >= 0 ? "" : "+"}${Math.abs(opt.netSavings).toFixed(2)}</span>
              </div>
              {/* Detour verdict — plain language explanation */}
              {closestOpt && fillLitres > 0 && opt.detourKm > 0 && (() => {
                const priceDiffCents = closestOpt.price - opt.price;
                const costPerKm = getCostPerKm(opt.price);
                const breakEvenKm = priceDiffCents > 0 && costPerKm > 0
                  ? ((priceDiffCents / 100) * fillLitres) / costPerKm
                  : 0;
                const headroomRatio = breakEvenKm > 0 ? breakEvenKm / opt.detourKm : 0;

                if (priceDiffCents <= 0) {
                  return (
                    <div className="px-2.5 py-2 border-t border-[var(--subtle-border)]/50 rounded-b bg-[var(--tier-exp)]/5">
                      <div className="text-[10px] font-semibold text-[var(--tier-exp)]">Skip it</div>
                      <div className="text-[9px] text-[var(--muted)]">Same price or dearer than closest — no saving here</div>
                    </div>
                  );
                }

                if (opt.netSavings <= 0) {
                  return (
                    <div className="px-2.5 py-2 border-t border-[var(--subtle-border)]/50 rounded-b bg-[var(--tier-exp)]/5">
                      <div className="text-[10px] font-semibold text-[var(--tier-exp)]">Not worth the drive</div>
                      <div className="text-[9px] text-[var(--muted)]">{priceDiffCents.toFixed(1)}c/L cheaper, but the {opt.detourKm.toFixed(1)}km drive wipes out the saving. Break-even at {breakEvenKm.toFixed(0)}km.</div>
                    </div>
                  );
                }

                // Worth it — show how comfortably
                return (
                  <div className={`px-2.5 py-2 border-t border-[var(--subtle-border)]/50 rounded-b ${headroomRatio > 2 ? "bg-[var(--tier-cheap)]/5" : "bg-[var(--tier-mid)]/5"}`}>
                    <div className={`text-[10px] font-semibold ${headroomRatio > 2 ? "text-[var(--tier-cheap)]" : "text-[var(--tier-mid)]"}`}>
                      {headroomRatio > 5 ? "No-brainer" : headroomRatio > 2 ? "Worth the drive" : "Borderline — just worth it"}
                    </div>
                    <div className="text-[9px] text-[var(--muted)]">
                      {priceDiffCents.toFixed(1)}c/L cheaper · {opt.detourKm.toFixed(1)}km detour is well under the {breakEvenKm.toFixed(0)}km where you&apos;d stop saving
                    </div>
                  </div>
                );
              })()}
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
              <span className="text-[var(--muted)] flex items-center">Estimated cost{fillLabel && fillLabel.startsWith("$") ? ` (${fillLabel} · ~${Math.round(fillLitres)}L)` : ` (full tank · ~${Math.round(fillLitres)}L)`}<Tip text="Total cost to fill based on your fuel level setting. Change it via the Fill chip above." /></span>
              <span className="font-medium font-mono text-[var(--foreground)]">${((fillLitres * opt.price) / 100).toFixed(2)}</span>
            </div>
          )}
        </motion.div>

        {/* Price ranking pill */}
        {(() => {
          const ranking = priceRankings.get(opt.station.id);
          if (!ranking) return null;
          const bg = ranking.percentile >= 90 ? "bg-[var(--tier-cheap)]/10 text-[var(--tier-cheap)] border-[var(--tier-cheap)]/20" : ranking.percentile >= 50 ? "bg-[var(--tier-mid)]/10 text-[var(--tier-mid)] border-[var(--tier-mid)]/20" : "bg-[var(--tier-exp)]/10 text-[var(--tier-exp)] border-[var(--tier-exp)]/20";
          return (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold ${bg}`}
            >
              <span className="font-bold font-mono">#{ranking.rank}</span>
              <span className="opacity-50 font-mono">/{ranking.total}</span>
              <span className="hidden md:inline">·</span>
              <span className="hidden md:inline">
                {ranking.percentile >= 90 ? `Top ${100 - ranking.percentile}%` : ranking.percentile >= 50 ? `Top ${100 - ranking.percentile}%` : `Bottom ${100 - ranking.percentile}%`}
              </span>
            </motion.div>
          );
        })()}

        {/* Price history sparkline */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="rounded-lg border border-[var(--subtle-border)] p-2"
        >
          <PriceHistory stationId={opt.station.id} fuelType={selectedFuelType} />
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
          transition={{ delay: 0.16 }}
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
              <Fuel className="h-3.5 w-3.5" strokeWidth={2} />
              Update price
            </button>
            <button
              onClick={() => setFlaggingStationId(flaggingStationId === opt.station.id ? null : opt.station.id)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 border px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                flaggedStationIds.has(opt.station.id)
                  ? "bg-red-500/10 border-red-500/20 text-[var(--tier-exp)]"
                  : "bg-[var(--subtle)] border-[var(--subtle-border)] text-[var(--muted)] hover:bg-[var(--subtle-hover)]"
              }`}
            >
              <Flag className="h-3.5 w-3.5" fill={flaggedStationIds.has(opt.station.id) ? "currentColor" : "none"} strokeWidth={2} />
              {flaggedStationIds.has(opt.station.id) ? "Flagged" : "Flag issue"}
            </button>
          </div>

          {/* Flag reason picker */}
          <AnimatePresence>
            {flaggingStationId === opt.station.id && !flaggedStationIds.has(opt.station.id) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg border border-[var(--subtle-border)] bg-[var(--subtle)] p-2">
                  <div className="text-[10px] text-[var(--muted)] font-semibold mb-1.5">What&apos;s wrong?</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { reason: "Wrong price", label: "Wrong price", icon: <DollarSign className="h-3.5 w-3.5" strokeWidth={2} />, color: "text-[var(--tier-mid)]" },
                      { reason: "Closed permanently", label: "Closed down", icon: <Ban className="h-3.5 w-3.5" strokeWidth={2} />, color: "text-[var(--tier-exp)]" },
                      { reason: "Temporarily closed", label: "Temp. closed", icon: <Clock className="h-3.5 w-3.5" strokeWidth={2} />, color: "text-orange-400" },
                      { reason: "Wrong location", label: "Wrong pin", icon: <MapPinOff className="h-3.5 w-3.5" strokeWidth={2} />, color: "text-blue-400" },
                    ].map(({ reason, label, icon, color }) => (
                      <button
                        key={reason}
                        onClick={() => {
                          flagStation(opt.station.id);
                          setFlaggedStationIds((prev) => new Set(prev).add(opt.station.id));
                          setFlaggingStationId(null);
                          fetch("/api/flag", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ stationName: opt.station.name, stationId: opt.station.id, reason, deviceId: getDeviceId() }),
                          }).catch(() => {});
                        }}
                        className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg border border-[var(--subtle-border)] hover:bg-[var(--card)] transition-colors !cursor-pointer"
                      >
                        <span className={color}>{icon}</span>
                        <span className="text-[10px] font-medium text-[var(--foreground)]">{label}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setFlaggingStationId(null)}
                    className="w-full text-center mt-1.5 py-1 text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Flagged confirmation */}
          {flaggedStationIds.has(opt.station.id) && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 flex items-center gap-2">
              <Flag className="h-3 w-3 text-[var(--tier-exp)] shrink-0" fill="currentColor" strokeWidth={1} />
              <span className="text-[10px] text-[var(--tier-exp)]">Flagged — hidden from future recommendations</span>
            </div>
          )}
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
    <div className="absolute bottom-0 left-0 right-0 z-[1000] max-h-[100dvh] md:bottom-4 md:left-4 md:right-auto md:w-[380px] md:max-h-[80vh] flex flex-col items-stretch">
    {/* Floating buttons above the sheet */}
    <MobileFloatingButtons onRecentre={onRecentre} mapCentre={mapCentre} />

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.3 }}
      className="w-full rounded-t-2xl md:rounded-2xl border-t md:border border-[var(--subtle-border)] bg-[var(--card)]/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col"
      style={{ maxHeight: !minimised && expandedIndex !== null ? "80vh" : minimised ? "45vh" : "60vh", transition: "max-height 0.3s ease" }}
    >

      {/* Header — desktop only */}
      <DesktopHeader locationName={locationName} searchOrigin={searchOrigin} />

      {/* Price trend banner */}
      <PriceTrendBanner />

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
                <span className={`text-[9px] font-medium uppercase shrink-0 px-2 py-1 rounded ${tagStyle(options[0].price)}`}>{options[0].tag}</span>
              )}
            </div>
            <div className="flex items-end justify-between">
              <div className={`text-2xl font-semibold font-mono ${options[0].isStale ? "text-[var(--muted)] opacity-50" : tierColor(options[0].price)}`}>
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

      {/* Detour tolerance — trip mode only */}
      {tripMode === "trip" && tripDestination && !minimised && selectedOpt === null && (
        <div className="shrink-0 px-3 py-2 border-b border-[var(--subtle-border)] flex items-center justify-between">
          <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Detour tolerance</span>
          <div className="flex gap-0.5 bg-[var(--background)] rounded-md p-0.5 border border-[var(--subtle-border)]">
            {([1, 3, 5] as const).map((r) => (
              <button key={r} onClick={() => setDetourTolerance(r)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${detourTolerance === r ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)]"}`}>
                {r}km
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Options list */}
      <div ref={listRef} className={`overflow-y-auto flex-1 min-h-0 overscroll-contain ${minimised || selectedOpt !== null ? "hidden" : ""}`} style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}>
          {(!origin || loading) && options.length === 0 ? (
            <div className="px-3 py-4 flex items-center gap-2.5">
              <div className="h-4 w-4 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin shrink-0" />
              <span className="text-xs text-[var(--muted)]">{!userLocation ? "Finding you..." : "Scanning 4,000+ servos..."}</span>
            </div>
          ) : options.length === 0 ? (
            <div className="px-3 py-4 text-xs text-[var(--muted)] text-center">
              No stations found for {FUEL_TYPE_LABELS[selectedFuelType] ?? selectedFuelType} nearby
            </div>
          ) : (
            <div>
              {(showAllTrip || tripMode === "nearby" ? options : options.slice(0, 5)).slice(0, showAllNearby ? undefined : 5).map((opt, i) => {
                const optTierColor = tierColor(opt.price);
                const isFirst = i === 0;
                const isExpanded = expandedIndex === i;
                const isActive = activeStation?.id === opt.station.id;
                const globalFlag = globalFlags[opt.station.id];
                const isGloballyFlagged = globalFlag && globalFlag.count >= 1;

                return (
                  <div
                    ref={(el: HTMLDivElement | null) => setRowRef(i, el)}
                    key={opt.station.id}
                    className={`${isGloballyFlagged ? "opacity-50" : ""} ${(isExpanded || isActive) ? "bg-[var(--subtle)]" : ""} ${isFirst ? "border-b border-[var(--subtle-border)]" : "border-b border-[var(--subtle-border)]/50"} border-l-2 ${
                      isGloballyFlagged ? "border-l-[var(--tier-exp)]" : getPriceTier(opt.price, thresholds) === "cheap" ? "border-l-[var(--tier-cheap)]" : getPriceTier(opt.price, thresholds) === "mid" ? "border-l-[var(--tier-mid)]" : getPriceTier(opt.price, thresholds) === "expensive" ? "border-l-[var(--tier-exp)]" : "border-l-transparent"
                    }`}
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
                              <span className={`text-[9px] font-medium uppercase shrink-0 px-2 py-1 rounded ${tagStyle(opt.price)}`}>{opt.tag}</span>
                            )}
                          </div>
                          <div className="flex items-end justify-between">
                            <div className={`text-2xl font-semibold font-mono ${opt.isStale ? "text-[var(--muted)] opacity-50" : optTierColor}`}>
                              {opt.price.toFixed(1)}<span className="text-sm text-[var(--muted)]">c</span>
                            </div>
                            {!opt.isStale && closestOpt && opt.netSavings > 0 && (
                              <span className="text-xs font-medium text-[var(--tier-cheap)]">
                                Save ${opt.netSavings.toFixed(2)} vs closest
                              </span>
                            )}
                          </div>
                          {isGloballyFlagged && (
                            <div className="flex items-center gap-1 text-[11px] text-[var(--tier-exp)] mt-2">
                              <Flag className="h-3 w-3 shrink-0" fill="currentColor" strokeWidth={1} />
                              Flagged: {globalFlag.reasons[0]} · {globalFlag.count} report{globalFlag.count > 1 ? "s" : ""}
                            </div>
                          )}
                          {opt.isStale && !isGloballyFlagged && (
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
                              {isGloballyFlagged ? (
                                <span className="flex items-center gap-0.5 text-[var(--tier-exp)]">
                                  <Flag className="h-3 w-3 inline shrink-0" fill="currentColor" strokeWidth={1} />
                                  {globalFlag.reasons[0]}
                                </span>
                              ) : opt.isStale ? (
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
                              <span className={`text-[8px] font-medium uppercase ${tagStyle(opt.price)} px-1.5 py-0.5 rounded`}>{opt.tag}</span>
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

      <SidebarFooter />
    </motion.div>

    </div>
  );
}
