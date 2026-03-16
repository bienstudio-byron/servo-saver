"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StationWithPrices } from "@/types/fuel";
import { haversineDistance } from "@/lib/geo";
import { useFuelStore } from "@/stores/fuel-store";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import { usePriceThresholds } from "@/stores/price-context";
import { getPriceTier } from "@/lib/price-utils";
import BrandLogo from "@/components/shared/BrandLogo";

interface FillStrategyProps {
  stations: StationWithPrices[];
  selectedFuelType: string;
  onChangeTrip?: () => void;
}

const DEFAULT_CONSUMPTION = 8.5;
const DEFAULT_TANK_SIZE = 50;
const ROAD_FACTOR = 1.35;
const AVG_CITY_SPEED = 35;

interface RankedOption {
  station: StationWithPrices;
  price: number;
  distance: number;
  detourKm: number;
  detourMins: number;
  netSavings: number; // vs nearest station
  tag: string; // "Closest" | "Best value" | "Cheapest"
}

export default function FillStrategy({ stations, selectedFuelType, onChangeTrip }: FillStrategyProps) {
  const userLocation = useFuelStore((s) => s.userLocation);
  const tripMode = useFuelStore((s) => s.tripMode);
  const tripDestination = useFuelStore((s) => s.tripDestination);
  const rangeKm = useFuelStore((s) => s.rangeKm);
  const setSelectedStation = useFuelStore((s) => s.setSelectedStation);
  const setRecommendedStations = useFuelStore((s) => s.setRecommendedStations);
  const setFlyToTarget = useFuelStore((s) => s.setFlyToTarget);
  const rawSetFuelType = useFuelStore((s) => s.setSelectedFuelType);
  const setUserLocation = useFuelStore((s) => s.setUserLocation);
  const [showFuelPicker, setShowFuelPicker] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const thresholds = usePriceThresholds();

  const setSelectedFuelType = (id: string) => {
    rawSetFuelType(id);
    try { localStorage.setItem("petrolsaver-fuel-chosen", id); } catch {}
    setShowFuelPicker(false);
  };

  const refreshLocation = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
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

  const getTierColor = (price: number) => {
    const tier = getPriceTier(price, thresholds);
    switch (tier) {
      case "cheap": return "text-emerald-400";
      case "mid": return "text-amber-400";
      case "expensive": return "text-red-400";
      default: return "text-[#9aa0a6]";
    }
  };

  // Build ranked options
  const { options, isUrgent } = useMemo(() => {
    if (!userLocation || stations.length === 0) return { options: [] as RankedOption[], isUrgent: false };

    const withDistance = stations.map((s) => {
      const p = s.prices.find((pr) => pr.fuelType === selectedFuelType);
      if (!p) return null;
      return { station: s, price: p.price, distance: haversineDistance(userLocation.lat, userLocation.lng, s.latitude, s.longitude) * ROAD_FACTOR };
    }).filter((x): x is { station: StationWithPrices; price: number; distance: number } => x !== null);

    if (withDistance.length === 0) return { options: [], isUrgent: false };

    const safeRange = rangeKm * 0.7;
    const maxRadius = Math.min(15, safeRange);
    const fuelInTank = (rangeKm / 100) * DEFAULT_CONSUMPTION;
    const litresFillingUp = Math.max(0, DEFAULT_TANK_SIZE - fuelInTank);

    // Get candidates
    let candidates: typeof withDistance;
    if (tripMode === "trip" && tripDestination) {
      const onRoute = withDistance
        .filter((s) => isOnRoute(s.station.latitude, s.station.longitude, userLocation.lat, userLocation.lng, tripDestination.lat, tripDestination.lng))
        .filter((s) => s.distance <= safeRange);
      candidates = onRoute.length > 0 ? onRoute : withDistance.filter((s) => s.distance <= safeRange);
    } else {
      candidates = withDistance.filter((s) => s.distance <= maxRadius);
    }

    if (candidates.length === 0) candidates = [withDistance.sort((a, b) => a.distance - b.distance)[0]];

    const nearest = [...withDistance].sort((a, b) => a.distance - b.distance)[0];
    const isUrgent = nearest.distance > rangeKm * 0.8;

    // Build unique options: closest, cheapest, and best value (if different)
    const byDistance = [...candidates].sort((a, b) => a.distance - b.distance);
    const byPrice = [...candidates].sort((a, b) => a.price - b.price);

    const closest = byDistance[0];
    const cheapest = byPrice[0];

    // Best value: best net savings considering detour cost
    const withSavings = candidates.map((c) => {
      const extraKm = Math.max(0, c.distance - closest.distance) * 2;
      const fuelCost = ((extraKm / 100) * DEFAULT_CONSUMPTION * c.price) / 100;
      const savings = ((closest.price - c.price) * litresFillingUp) / 100;
      return { ...c, netSavings: savings - fuelCost, detourKm: extraKm };
    }).sort((a, b) => b.netSavings - a.netSavings);

    const bestValue = withSavings[0];

    // Deduplicate and build options list
    const seen = new Set<string>();
    const options: RankedOption[] = [];

    const addOption = (item: typeof closest, tag: string) => {
      if (seen.has(item.station.id)) return;
      seen.add(item.station.id);
      const extraKm = Math.max(0, item.distance - closest.distance) * 2;
      const detourMins = Math.round((extraKm / AVG_CITY_SPEED) * 60);
      const fuelCost = ((extraKm / 100) * DEFAULT_CONSUMPTION * item.price) / 100;
      const savings = ((closest.price - item.price) * litresFillingUp) / 100 - fuelCost;
      options.push({
        station: item.station, price: item.price, distance: item.distance,
        detourKm: extraKm, detourMins, netSavings: savings, tag,
      });
    };

    // Always show closest first
    addOption(closest, "Closest");
    // Show best value if it's meaningfully different
    if (bestValue && bestValue.netSavings > 1 && bestValue.station.id !== closest.station.id) {
      addOption(bestValue, "Best value");
    }
    // Show cheapest if different from both
    if (cheapest.station.id !== closest.station.id && cheapest.price < closest.price) {
      addOption(cheapest, "Cheapest");
    }

    // Show most expensive nearby as contrast — "this is what you'd pay"
    const mostExpensive = [...candidates].filter((c) => c.price < 500).sort((a, b) => b.price - a.price)[0];
    if (mostExpensive && !seen.has(mostExpensive.station.id) && mostExpensive.price > closest.price && mostExpensive.price - closest.price > 2) {
      const extraKm = Math.max(0, mostExpensive.distance - closest.distance) * 2;
      const priceDiff = ((mostExpensive.price - (cheapest?.price ?? closest.price)) * litresFillingUp) / 100;
      options.push({
        station: mostExpensive.station, price: mostExpensive.price, distance: mostExpensive.distance,
        detourKm: extraKm, detourMins: 0, netSavings: -priceDiff, tag: "Avoid",
      });
    }

    return { options, isUrgent };
  }, [userLocation, stations, selectedFuelType, tripMode, tripDestination, rangeKm, thresholds]);

  // Store all recommended stations
  useEffect(() => {
    if (options.length > 0) {
      setRecommendedStations(options.map((o) => o.station));

      if (tripMode === "trip" && tripDestination && userLocation) {
        const allPoints = options.map((o) => o.station);
        const lats = [userLocation.lat, ...allPoints.map((s) => s.latitude), tripDestination.lat];
        const lngs = [userLocation.lng, ...allPoints.map((s) => s.longitude), tripDestination.lng];
        const latSpan = Math.max(...lats) - Math.min(...lats) + 0.04;
        const zoom = latSpan > 2 ? 9 : latSpan > 1 ? 10 : latSpan > 0.5 ? 11 : latSpan > 0.2 ? 12 : 13;
        setFlyToTarget({ lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2, zoom });
      }
    } else {
      setRecommendedStations([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.map(o => o.station.id).join(",")]);

  const handleGoTo = (station: StationWithPrices) => {
    setSelectedStation(station);
    setFlyToTarget({ lat: station.latitude, lng: station.longitude, zoom: 15 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.3 }}
      className="absolute bottom-0 left-0 right-0 z-[1000] md:right-auto md:bottom-4 md:left-3 md:w-[24rem] rounded-t-2xl md:rounded-2xl border-t md:border border-white/10 bg-[#1a1a1a]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Fuel type dropdown — dark */}
        <button
          onClick={() => setShowFuelPicker(!showFuelPicker)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.08] text-white text-[11px] font-bold shrink-0 hover:bg-white/15 transition-colors"
        >
          <span>⛽</span>
          {fuelShort}
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 text-[#9aa0a6] transition-transform ${showFuelPicker ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Fuel gauge with label */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-10 h-3 rounded-sm bg-[#1a1a1a] border border-white/10 overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 rounded-sm transition-all" style={{ width: `${Math.min(100, (rangeKm / 150) * 100)}%`, background: rangeKm <= 10 ? "#ef4444" : rangeKm <= 30 ? "#f59e0b" : "#4285f4" }} />
          </div>
          <span className="text-[9px] text-[#5f6368] font-mono">{rangeKm >= 150 ? "100+" : `~${rangeKm}`}km</span>
        </div>

        {/* Trip info */}
        {tripMode === "trip" && tripDestination ? (
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-[#4285f4] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span className="text-[11px] text-[#9aa0a6] truncate">to {tripDestination.name}</span>
          </div>
        ) : (
          <span className="flex-1" />
        )}

        {/* Edit button — clear text instead of settings icon */}
        {onChangeTrip && (
          <button onClick={onChangeTrip} className="text-[10px] text-[#8ab4f8] hover:text-white font-semibold transition-colors shrink-0">
            Edit
          </button>
        )}
      </div>

      {/* Fuel picker dropdown */}
      <AnimatePresence>
        {showFuelPicker && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden border-t border-white/5">
            <div className="px-3 py-2.5 flex flex-wrap gap-1.5">
              {allFuelTypes.filter(([id]) => MAIN_FUEL_IDS.includes(id)).map(([id, label]) => {
                const short = id === "PDSL" ? "P.Dsl" : label.replace("Unleaded ", "U").replace("Premium ", "P").replace("Ethanol ", "E").replace("Biodiesel ", "B");
                return (
                  <button key={id} onClick={() => setSelectedFuelType(id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${id === selectedFuelType ? "bg-[#4285f4] text-white" : "bg-white/[0.06] text-[#9aa0a6] hover:bg-white/10 hover:text-white"}`}
                  >{short}</button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options list */}
      <div className="border-t border-white/5">
        <AnimatePresence mode="wait">
          {!userLocation ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-3 py-4 flex items-center gap-2.5">
              <div className="h-4 w-4 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin shrink-0" />
              <span className="text-xs text-[#9aa0a6]">Finding best deals...</span>
            </motion.div>
          ) : options.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-3 py-4 text-xs text-[#9aa0a6] text-center">
              No stations found nearby
            </motion.div>
          ) : isUrgent ? (
            <motion.div key="urgent" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <button onClick={() => handleGoTo(options[0].station)} className="w-full flex items-center gap-3 px-3 py-3 hover:bg-white/5 active:bg-white/10 transition-colors text-left">
                <BrandLogo brandName={options[0].station.brand?.name ?? "?"} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-red-400">Go now — fuel is low</span>
                    <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-bold">URGENT</span>
                  </div>
                  <div className="text-sm font-medium text-white truncate">{options[0].station.name}</div>
                  <div className="text-[10px] text-[#9aa0a6]">{options[0].distance.toFixed(1)}km — closest station</div>
                </div>
                <div className="text-lg font-bold font-mono text-white shrink-0">{options[0].price.toFixed(1)}c</div>
              </button>
              <div className="px-3 pb-3">
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${options[0].station.latitude},${options[0].station.longitude}`} target="_blank" rel="noopener noreferrer" className="w-full inline-flex items-center justify-center gap-1.5 bg-red-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-400 transition-colors">
                  Get Directions Now
                </a>
              </div>
            </motion.div>
          ) : (
            <motion.div key="options" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {options.map((opt, i) => {
                const tierColor = getTierColor(opt.price);
                const isFirst = i === 0;
                const isAvoid = opt.tag === "Avoid";
                const isExpanded = expandedIndex === i;
                return (
                  <div key={opt.station.id} className={i > 0 ? "border-t border-white/5" : ""}>
                    {/* Separator before Avoid */}
                    {isAvoid && (
                      <div className="px-3 py-1.5 text-center">
                        <span className="text-[9px] text-[#5f6368]">· · ·</span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (!isAvoid) {
                          setExpandedIndex(isExpanded ? null : i);
                          handleGoTo(opt.station);
                        }
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                        isAvoid ? "opacity-40 cursor-default" : "hover:bg-white/5 active:bg-white/10"
                      }`}
                    >
                      <span className={`text-[11px] font-bold w-4 text-center shrink-0 ${isAvoid ? "text-red-400" : isFirst ? tierColor : "text-[#5f6368]"}`}>
                        {isAvoid ? "✕" : i + 1}
                      </span>
                      <BrandLogo brandName={opt.station.brand?.name ?? "?"} size={isFirst ? "md" : "sm"} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold uppercase ${isAvoid ? "text-red-400" : isFirst ? tierColor : "text-[#5f6368]"}`}>{opt.tag}</span>
                          {isAvoid && opt.netSavings < -0.5 && (
                            <span className="text-[9px] bg-red-500/10 text-red-400 px-1 py-0.5 rounded font-bold">
                              Costs +${Math.abs(opt.netSavings).toFixed(2)} more
                            </span>
                          )}
                          {!isAvoid && opt.netSavings > 0.5 && opt.tag !== "Closest" && (
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1 py-0.5 rounded font-bold">
                              Saves ${opt.netSavings.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className={`font-medium truncate ${isAvoid ? "text-[#5f6368] line-through text-xs" : isFirst ? "text-white text-sm" : "text-white text-xs"}`}>{opt.station.name}</div>
                        <div className="text-[10px] text-[#5f6368]">
                          {opt.distance.toFixed(1)}km
                        </div>
                      </div>
                      <div className={`font-bold font-mono shrink-0 ${isAvoid ? "text-red-400 text-sm" : `${tierColor} ${isFirst ? "text-lg" : "text-sm"}`}`}>
                        {opt.price.toFixed(1)}c
                      </div>
                    </button>

                    {/* Expanded state */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 pl-10">
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${opt.station.latitude},${opt.station.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full inline-flex items-center justify-center gap-1.5 bg-[#4285f4] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#5a9bf6] active:bg-[#3367d6] transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              Get Directions
                            </a>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Location refresh */}
              {options[0]?.distance > 5 && tripMode === "nearby" && (
                <button onClick={refreshLocation} className="w-full flex items-center justify-center gap-1.5 px-3 pb-3 text-[10px] text-[#5f6368] hover:text-[#9aa0a6] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Doesn&apos;t look right? Refresh location
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
