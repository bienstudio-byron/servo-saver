"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, RefreshCw, ChevronDown, Navigation, ArrowLeft, LocateFixed, Heart, TriangleAlert, X } from "lucide-react";
import type { StationWithPrices } from "@/types/fuel";
import { haversineDistance } from "@/lib/geo";
import { useFuelStore } from "@/stores/fuel-store";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import { usePriceThresholds } from "@/stores/price-context";
import { getPriceTier } from "@/lib/price-utils";
import BrandLogo from "@/components/shared/BrandLogo";

import { getFlaggedStations } from "@/lib/flagged-stations";

interface FillStrategyProps {
  stations: StationWithPrices[];
  selectedFuelType: string;
  loading?: boolean;
  onRecentre?: () => void;
}

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
  tag: string; // "Best value" | "Cheapest" | "Good deal" | "Nearby"
  isStale: boolean;
  updatedAt: string;
}

export default function FillStrategy({ stations, selectedFuelType, loading, onRecentre }: FillStrategyProps) {
  const userLocation = useFuelStore((s) => s.userLocation);
  const tripMode = useFuelStore((s) => s.tripMode);
  const tripDestination = useFuelStore((s) => s.tripDestination);
  const rangeKm = useFuelStore((s) => s.rangeKm);
  const setSelectedStation = useFuelStore((s) => s.setSelectedStation);
  const setRecommendedStations = useFuelStore((s) => s.setRecommendedStations);
  const setActiveRouteStation = useFuelStore((s) => s.setActiveRouteStation);
  const setFlyToTarget = useFuelStore((s) => s.setFlyToTarget);
  const setFitBoundsTarget = useFuelStore((s) => s.setFitBoundsTarget);
  const selectedBrands = useFuelStore((s) => s.selectedBrands);
  const pinClickedStationId = useFuelStore((s) => s.pinClickedStationId);
  const setPinClickedStationId = useFuelStore((s) => s.setPinClickedStationId);
  const rawSetFuelType = useFuelStore((s) => s.setSelectedFuelType);
  const setUserLocation = useFuelStore((s) => s.setUserLocation);
  const searchOrigin = useFuelStore((s) => s.searchOrigin);
  const setSearchOrigin = useFuelStore((s) => s.setSearchOrigin);
  const origin = searchOrigin ?? userLocation;
  const [showFuelPicker, setShowFuelPicker] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null); // desktop inline expand
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null); // mobile card view
  const [showAllTrip, setShowAllTrip] = useState(false);
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
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${origin.lat}&lon=${origin.lng}`,
      { headers: { "User-Agent": "PetrolSaver/1.0" } }
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

  const formatUpdated = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHrs = Math.floor(diffMs / 3600000);
    if (diffHrs < 1) return "Updated just now";
    if (diffHrs < 24) return `Updated ${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return "Updated yesterday";
    return `Updated ${diffDays}d ago`;
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

  // Build ranked options
  const { options } = useMemo(() => {
    if (!origin || stations.length === 0) return { options: [] as RankedOption[] };

    // Filter out user-flagged stations
    const flagged = getFlaggedStations();

    const withDistance = stations
      .filter((s) => !flagged.has(s.id))
      .filter((s) => selectedBrands.length === 0 || (s.brand?.name && selectedBrands.includes(s.brand.name)))
      .map((s) => {
        const p = s.prices.find((pr) => pr.fuelType === selectedFuelType);
        if (!p) return null;
        return { station: s, price: p.price, isStale: !!p.isStale, updatedAt: p.updatedAt, distance: haversineDistance(origin.lat, origin.lng, s.latitude, s.longitude) * ROAD_FACTOR };
      }).filter((x): x is { station: StationWithPrices; price: number; isStale: boolean; updatedAt: string; distance: number } => x !== null);

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

    // Calculate true cost for each candidate: price + detour fuel cost
    const withTrueCost = candidates.map((c) => {
      const detourKm = calcDetour(c);
      const detourMins = Math.round((detourKm / AVG_CITY_SPEED) * 60);
      const fuelCost = ((detourKm / 100) * DEFAULT_CONSUMPTION * c.price) / 100;
      const savings = ((closest.price - c.price) * litresFillingUp) / 100 - fuelCost;
      // True cost per litre: price + detour fuel cost spread across litres filling
      const trueCostPerLitre = litresFillingUp > 0
        ? c.price + (fuelCost / litresFillingUp) * 100
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
      if (i === 0 && tier !== "expensive") tag = "Best value";
      else if (item.station.id === cheapestId && tier !== "expensive") tag = "Cheapest";
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
    stats.push(`Vic avg **${r(stateAvg)}c** · Best nearby **${r(localBest)}c**`);

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
    setExpandedIndex(null);
    setSelectedIndex(null);
    listRef.current?.scrollTo({ top: 0 });
    if (options.length > 0) {
      // In trip mode only recommend top 5, in nearby mode show all
      const visibleStations = tripMode === "trip" ? options.slice(0, 5) : options;
      setRecommendedStations(visibleStations.map((o) => o.station));

      // Fit map to show origin + top stations (+ destination in trip mode)
      if (origin) {
        const fitOptions = tripMode === "trip" ? options.slice(0, 5) : options;
        const points: [number, number][] = [
          [origin.lat, origin.lng],
          ...fitOptions.map((o) => [o.station.latitude, o.station.longitude] as [number, number]),
        ];
        if (tripMode === "trip" && tripDestination) {
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
  // In trip mode, default to #1 station. In nearby mode, only show when user selects.
  const activeStation = selectedIndex !== null && options[selectedIndex]
    ? options[selectedIndex].station
    : expandedIndex !== null && options[expandedIndex]
    ? options[expandedIndex].station
    : tripMode === "trip" && tripDestination && options.length > 0
    ? options[0].station
    : null;

  const setHighlightedStationIds = useFuelStore((s) => s.setHighlightedStationIds);
  const setFocusedStationId = useFuelStore((s) => s.setFocusedStationId);

  // Control which pins are highlighted (recommended) and which is focused
  useEffect(() => {
    const focusedIndex = selectedIndex ?? expandedIndex;

    // Focused: the one station the user is looking at
    if (focusedIndex !== null && options[focusedIndex]) {
      setFocusedStationId(options[focusedIndex].station.id);
    } else {
      setFocusedStationId(null);
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
  }, [selectedIndex, expandedIndex, showAllTrip, options.length]);

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
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      if (isMobile) {
        setSelectedIndex(idx);
        setExpandedIndex(null);
        setMinimised(false);
      } else {
        setExpandedIndex(idx);
        setSelectedIndex(null);
        setMinimised(false);
        requestAnimationFrame(() => {
          setTimeout(() => {
            const row = rowRefs.current.get(idx);
            if (row) {
              row.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 50);
        });
      }
      // Fit map to show both origin and selected station
      if (origin) {
        setFitBoundsTarget({
          points: [
            [origin.lat, origin.lng],
            [opt.station.latitude, opt.station.longitude],
          ],
        });
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
                <span className="text-sm font-semibold text-[var(--foreground)] truncate">{opt.station.name}</span>
                {opt.tag && <span className={`text-[8px] font-bold uppercase shrink-0 px-1.5 py-0.5 rounded-full border ${tierColor} border-current opacity-80`}>{opt.tag}</span>}
              </div>
              <div className="text-[11px] text-[var(--muted)]">
                {opt.distance.toFixed(1)}km away
                {opt.detourKm > 0.5 && <> · +{opt.detourKm.toFixed(1)}km detour</>}
                {" · "}{formatUpdated(opt.updatedAt)}
              </div>
            </div>
            <div className={`text-xl font-bold font-mono shrink-0 ${tierColor}`}>
              {opt.price.toFixed(1)}<span className="text-xs text-[var(--muted)]">c/L</span>
            </div>
          </motion.div>
        )}

        {/* Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-0.5 text-[10px]"
        >
          {opt.detourKm > 0 ? (
            <>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Detour</span>
                <span className="text-[var(--foreground)] font-mono">+{opt.detourKm.toFixed(1)}km · ~{Math.round((opt.detourKm / AVG_CITY_SPEED) * 60)}min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Fuel for detour</span>
                <span className="text-[var(--tier-exp)] font-mono">-${detourFuelCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Price savings</span>
                <span className={`font-mono ${rawSavings >= 0 ? "text-[var(--tier-cheap)]" : "text-[var(--tier-exp)]"}`}>{rawSavings >= 0 ? "+" : "-"}${Math.abs(rawSavings).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-0.5 border-t border-[var(--subtle-border)]">
                <span className="text-[var(--foreground)] font-medium">{opt.netSavings >= 0 ? "Net saving" : "Extra cost"}</span>
                <span className={`font-bold font-mono ${opt.netSavings >= 0 ? "text-[var(--tier-cheap)]" : "text-[var(--tier-exp)]"}`}>{opt.netSavings >= 0 ? "" : "+"}${Math.abs(opt.netSavings).toFixed(2)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Distance</span>
                <span className="text-[var(--foreground)] font-mono">{opt.distance.toFixed(1)}km · ~{Math.round((opt.distance / AVG_CITY_SPEED) * 60)}min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">No detour needed</span>
                <span className="text-[var(--tier-cheap)] font-mono">$0.00</span>
              </div>
            </>
          )}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex gap-2"
        >
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${opt.station.latitude},${opt.station.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[var(--accent)] text-[var(--accent-contrast)] px-3 py-2 rounded-lg text-xs font-bold hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
          >
            <Navigation className="h-3.5 w-3.5" strokeWidth={2} />
            Directions
          </a>
          <button
            onClick={() => setSelectedStation(opt.station)}
            className="inline-flex items-center justify-center gap-1.5 bg-[var(--subtle)] border border-[var(--subtle-border)] text-[var(--muted)] px-3 py-2 rounded-lg text-xs font-bold hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer"
          >
            <Info className="h-3.5 w-3.5" strokeWidth={2} />
            Details
          </button>
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

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] md:right-auto md:bottom-4 md:left-3 md:w-[24rem] flex flex-col items-end">
    {/* Recentre button — anchored above the sheet */}
    {onRecentre && (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.5 }}
        whileTap={{ scale: 0.9 }}
        onClick={onRecentre}
        className="md:hidden mb-2 mr-3 h-10 w-10 rounded-full bg-[var(--card)] border border-[var(--subtle-border)] shadow-xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
        title="Centre on my location"
      >
        <LocateFixed className="h-5 w-5" strokeWidth={2} />
      </motion.button>
    )}

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.3 }}
      className="w-full max-h-[45vh] md:max-h-[65vh] rounded-t-2xl md:rounded-2xl border-t md:border border-[var(--subtle-border)] bg-[var(--card)]/95 backdrop-blur-xl shadow-2xl overflow-clip flex flex-col"
    >
      {/* Handle bar — tap to expand/collapse (hidden when card is showing on mobile) */}
      {selectedOpt === null && (
        <button
          onClick={() => { setMinimised(!minimised); setSelectedIndex(null); }}
          className="shrink-0 w-full cursor-pointer"
        >
          <div className="flex items-center justify-between px-3 py-2">
            <div className="min-w-0 flex-1 text-left">
              <div className="text-sm font-bold text-[var(--foreground)] truncate flex items-center gap-1.5">
                <span className="truncate">
                  {tripMode === "trip" && tripDestination
                    ? `Trip to ${tripDestination.name}`
                    : searchOrigin && locationName
                    ? `Searching near ${locationName}`
                    : locationName
                    ? `Best deals in ${locationName}`
                    : "Best deals near you"
                  }
                </span>
                {searchOrigin && tripMode === "nearby" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSearchOrigin(null); }}
                    className="shrink-0 h-5 w-5 rounded-full bg-[var(--subtle)] hover:bg-[var(--subtle-hover)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                    title="Back to my location"
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <div className="text-[9px] text-[var(--muted)] truncate">Ranked by true cost · Live data via Service Victoria</div>
            </div>
            <motion.div animate={{ rotate: minimised ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-4 w-4 text-[var(--muted)]" strokeWidth={2} />
            </motion.div>
          </div>
        </button>
      )}

      {/* Area insight ticker */}
      {selectedOpt === null && insightStats.length > 0 && (
        <div className="px-3 py-2 border-b border-[var(--subtle-border)]">
          <div className="flex items-center gap-2 text-[11px] text-[var(--foreground)]">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--foreground)] opacity-50" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--foreground)]" />
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={insightIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                dangerouslySetInnerHTML={{
                  __html: (insightStats[insightIndex % insightStats.length] || "")
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                }}
              />
            </AnimatePresence>
          </div>
        </div>
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
            className="md:hidden flex flex-col"
          >
            {/* Back button */}
            <button
              onClick={() => setSelectedIndex(null)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[var(--accent-text)] cursor-pointer shrink-0"
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
            className="md:hidden px-3 py-3 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 mb-1">
              <BrandLogo brandName={options[0].station.brand?.name ?? "?"} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[var(--foreground)] text-sm truncate">{options[0].station.name}</span>
                  {options[0].tag && (
                    <span className={`text-[8px] font-bold uppercase shrink-0 px-1.5 py-0.5 rounded bg-[var(--subtle)] opacity-80 ${getTierColor(options[0].price)}`}>{options[0].tag}</span>
                  )}
                </div>
                <div className="text-[10px] text-[var(--muted)]">{options[0].distance.toFixed(1)}km{options[0].detourKm > 0.5 && <> · +{options[0].detourKm.toFixed(1)}km detour</>}</div>
              </div>
              <div className={`text-xl font-bold font-mono shrink-0 ${getTierColor(options[0].price)}`}>
                {options[0].price.toFixed(1)}<span className="text-xs text-[var(--muted)]">c</span>
              </div>
            </div>
            {closestOpt && options[0].netSavings > 0 && (
              <div className="text-[11px] text-[var(--tier-cheap)] font-medium">
                Saves ${options[0].netSavings.toFixed(2)} per fill vs closest station
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options list */}
      <div ref={listRef} className={`overflow-y-auto flex-1 min-h-0 overscroll-contain ${minimised || selectedOpt !== null ? "hidden" : ""}`} style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}>
          {(!origin || loading) && options.length === 0 ? (
            <div className="px-3 py-4 flex items-center gap-2.5">
              <div className="h-4 w-4 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin shrink-0" />
              <span className="text-xs text-[var(--muted)]">{!userLocation ? "Finding your location..." : "Loading stations..."}</span>
            </div>
          ) : options.length === 0 ? (
            <div className="px-3 py-4 text-xs text-[var(--muted)] text-center">
              No stations found for {FUEL_TYPE_LABELS[selectedFuelType] ?? selectedFuelType} nearby
            </div>
          ) : (
            <div>
              {(tripMode === "trip" && !showAllTrip ? options.slice(0, 5) : options).map((opt, i) => {
                const tierColor = getTierColor(opt.price);
                const isFirst = i === 0;
                const isExpanded = expandedIndex === i;
                const isActive = activeStation?.id === opt.station.id;

                return (
                  <div
                    ref={(el: HTMLDivElement | null) => setRowRef(i, el)}
                    key={opt.station.id}
                    className={`${i > 0 ? "border-t border-[var(--subtle-border)]" : ""} ${(isExpanded || isActive) ? "bg-[var(--subtle)]" : ""}`}
                  >
                    <button
                      onClick={() => handleRowClick(i, opt)}
                      className={`w-full text-left transition-colors hover:bg-[var(--subtle-hover)] active:bg-[var(--subtle)] cursor-pointer ${isFirst ? "px-3 py-3" : "px-3 py-1.5 flex items-center gap-2"}`}
                    >
                      {isFirst ? (
                        <>
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <BrandLogo brandName={opt.station.brand?.name ?? "?"} size="lg" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-[var(--foreground)] text-sm truncate">{opt.station.name}</span>
                                {opt.tag && (
                                  <span className={`text-[8px] font-bold uppercase shrink-0 px-1.5 py-0.5 rounded bg-[var(--subtle)] opacity-80 ${tierColor}`}>{opt.tag}</span>
                                )}
                              </div>
                              <div className="text-[10px] text-[var(--muted)]">{opt.distance.toFixed(1)}km{opt.detourKm > 0.5 && <> · +{opt.detourKm.toFixed(1)}km detour</>} · {formatUpdated(opt.updatedAt)}</div>
                            </div>
                            <div className={`text-xl font-bold font-mono shrink-0 ${opt.isStale ? "text-[var(--muted)] opacity-50" : tierColor}`}>
                              {opt.price.toFixed(1)}<span className="text-xs text-[var(--muted)]">c</span>
                            </div>
                          </div>
                          {opt.isStale && (
                            <div className="flex items-center gap-1 text-[10px] text-[var(--tier-mid)] mb-0.5">
                              <TriangleAlert className="h-3 w-3 shrink-0" strokeWidth={2} />
                              Price may be outdated — not updated recently
                            </div>
                          )}
                          {!opt.isStale && closestOpt && opt.netSavings > 0 && (
                            <div className="text-[11px] text-[var(--tier-cheap)] font-medium">
                              Saves ${opt.netSavings.toFixed(2)} per fill vs closest station
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] font-mono text-[var(--muted)] w-3 text-right shrink-0">{i + 1}</span>
                          <BrandLogo brandName={opt.station.brand?.name ?? "?"} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium truncate text-[var(--foreground)] text-xs">{opt.station.name}</span>
                              {opt.tag && (
                                <span className="text-[8px] font-bold uppercase shrink-0 px-1.5 py-0.5 rounded bg-[var(--subtle)] opacity-80 text-[var(--muted)]">{opt.tag}</span>
                              )}
                            </div>
                            <div className="text-[10px] text-[var(--muted)]">
                              {opt.isStale ? (
                                <span className="flex items-center gap-0.5 text-[var(--tier-mid)]">
                                  <TriangleAlert className="h-2.5 w-2.5 inline shrink-0" strokeWidth={2} />
                                  Price may be outdated
                                </span>
                              ) : (
                                <>
                                  {opt.distance.toFixed(1)}km
                                  {opt.detourKm > 0.5 && <> · +{opt.detourKm.toFixed(1)}km detour</>}
                                  {closestOpt && opt.price < closestOpt.price && opt.netSavings >= 0 && (
                                    <> · <span className="text-[var(--tier-cheap)]">saves ${opt.netSavings.toFixed(2)}</span></>
                                  )}
                                  {closestOpt && opt.price < closestOpt.price && opt.netSavings < 0 && (
                                    <> · <span className="text-[var(--tier-exp)]">${Math.abs(opt.netSavings).toFixed(2)} extra</span></>
                                  )}
                                  {" · "}{formatUpdated(opt.updatedAt)}
                                </>
                              )}
                            </div>
                          </div>
                          <div className={`font-bold font-mono shrink-0 ${opt.isStale ? "text-[var(--muted)] opacity-50" : tierColor} text-xs`}>
                            {opt.price.toFixed(1)}c
                          </div>
                        </>
                      )}
                    </button>

                    {/* Desktop only: inline expand */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden hidden md:block pl-[36px]"
                        >
                          {renderStationCard(opt, false)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {tripMode === "trip" && !showAllTrip && options.length > 5 && (
                <button
                  onClick={() => { setShowAllTrip(true); setRecommendedStations(options.map((o) => o.station)); }}
                  className="w-full py-2 text-[11px] text-[var(--accent-text)] hover:text-[var(--foreground)] font-medium transition-colors border-t border-[var(--subtle-border)]"
                >
                  Show all {options.length} stations
                </button>
              )}

              {options[0]?.distance > 5 && tripMode === "nearby" && (
                <button onClick={refreshLocation} className="w-full flex items-center justify-center gap-1.5 px-3 pb-3 text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                  <RefreshCw className="h-3 w-3" strokeWidth={2} />
                  Doesn&apos;t look right? Refresh location
                </button>
              )}
            </div>
          )}
      </div>

      {/* Support + Footer */}
      <div className={`shrink-0 border-t border-[var(--subtle-border)] ${minimised && selectedOpt === null ? "hidden" : ""}`}>
        <a
          href="https://buymeacoffee.com/petrolsaver"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-3 py-3 text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer"
        >
          <Heart className="h-3.5 w-3.5" strokeWidth={2} />
          <span>Keep PetrolSaver free — <span className="font-semibold text-[var(--foreground)]">buy us a coffee</span></span>
        </a>
        <div className="px-3 pb-2 flex items-center justify-center gap-1.5">
          <a href="/how-it-works" className="text-[9px] text-[var(--muted)] hover:text-[var(--foreground)] px-2 py-0.5 rounded-full border border-[var(--subtle-border)] hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer">How it works</a>
          <a href="/terms" className="text-[9px] text-[var(--muted)] hover:text-[var(--foreground)] px-2 py-0.5 rounded-full border border-[var(--subtle-border)] hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer">Terms</a>
          <a href="/privacy" className="text-[9px] text-[var(--muted)] hover:text-[var(--foreground)] px-2 py-0.5 rounded-full border border-[var(--subtle-border)] hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer">Privacy</a>
        </div>
      </div>
    </motion.div>
    </div>
  );
}
