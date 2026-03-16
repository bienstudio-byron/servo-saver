"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StationWithPrices } from "@/types/fuel";
import { haversineDistance } from "@/lib/geo";
import { useFuelStore } from "@/stores/fuel-store";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import BrandLogo from "@/components/shared/BrandLogo";

interface FillStrategyProps {
  stations: StationWithPrices[];
  selectedFuelType: string;
  onChangeTrip?: () => void;
}

const DEFAULT_CONSUMPTION = 8.5;
const DEFAULT_TANK_SIZE = 50;
const ROAD_FACTOR = 1.35;

interface StrategyResult {
  type: "fill" | "drive";
  nearestStation: StationWithPrices;
  nearestPrice: number;
  nearestDistance: number;
  cheapestStation: StationWithPrices;
  cheapestPrice: number;
  cheapestDistance: number;
  savingsPerTank: number;
  fuelToGetThere: number;
  dollarToGetThere: number;
  netSavings: number;
  percentile: number;
}

export default function FillStrategy({ stations, selectedFuelType, onChangeTrip }: FillStrategyProps) {
  const userLocation = useFuelStore((s) => s.userLocation);
  const tripMode = useFuelStore((s) => s.tripMode);
  const tripDestination = useFuelStore((s) => s.tripDestination);
  const setSelectedStation = useFuelStore((s) => s.setSelectedStation);
  const setFlyToTarget = useFuelStore((s) => s.setFlyToTarget);
  const rawSetFuelType = useFuelStore((s) => s.setSelectedFuelType);
  const [showAllFuels, setShowAllFuels] = useState(false);

  const setSelectedFuelType = (id: string) => {
    rawSetFuelType(id);
    try { localStorage.setItem("petrolsaver-fuel-chosen", id); } catch {}
  };

  const MAIN_FUEL_IDS = ["U91", "P95", "P98", "DSL", "E10", "LPG"];
  const allFuelTypes = Object.entries(FUEL_TYPE_LABELS);
  const mainFuelTypes = allFuelTypes.filter(([id]) => MAIN_FUEL_IDS.includes(id));
  const otherFuelTypes = allFuelTypes.filter(([id]) => !MAIN_FUEL_IDS.includes(id));
  const selectedIsOther = otherFuelTypes.some(([id]) => id === selectedFuelType);
  const visibleFuelTypes = showAllFuels || selectedIsOther ? allFuelTypes : mainFuelTypes;

  // Check if a station is roughly "on the way" between two points
  // Uses a corridor: station must be within 5km of the straight line between origin and destination
  // and must be between origin and destination (not behind or past)
  function isOnRoute(
    stationLat: number, stationLng: number,
    originLat: number, originLng: number,
    destLat: number, destLng: number
  ): boolean {
    const totalDist = haversineDistance(originLat, originLng, destLat, destLng);
    const toStation = haversineDistance(originLat, originLng, stationLat, stationLng);
    const stationToDest = haversineDistance(stationLat, stationLng, destLat, destLng);
    // Station should be roughly on the path (not a big detour)
    const detour = (toStation + stationToDest) - totalDist;
    const corridorWidth = Math.max(5, totalDist * 0.15); // 15% of trip or 5km min
    return detour < corridorWidth && toStation < totalDist;
  }

  const strategy = useMemo((): StrategyResult | null => {
    if (!userLocation || stations.length === 0) return null;

    const withDistance = stations
      .map((s) => {
        const p = s.prices.find((pr) => pr.fuelType === selectedFuelType);
        if (!p) return null;
        const dist = haversineDistance(userLocation.lat, userLocation.lng, s.latitude, s.longitude) * ROAD_FACTOR;
        return { station: s, price: p.price, distance: dist };
      })
      .filter((x): x is { station: StationWithPrices; price: number; distance: number } => x !== null);

    if (withDistance.length === 0) return null;

    const byDistance = [...withDistance].sort((a, b) => a.distance - b.distance);
    const nearest = byDistance[0];

    let cheapest: typeof withDistance[0];

    if (tripMode === "trip" && tripDestination) {
      // Filter to stations on the route
      const onRoute = withDistance.filter((s) =>
        isOnRoute(
          s.station.latitude, s.station.longitude,
          userLocation.lat, userLocation.lng,
          tripDestination.lat, tripDestination.lng
        )
      ).sort((a, b) => a.price - b.price);

      cheapest = onRoute[0] || [...withDistance].sort((a, b) => a.price - b.price)[0];
    } else {
      const within15km = withDistance.filter((s) => s.distance <= 15).sort((a, b) => a.price - b.price);
      cheapest = within15km[0] || [...withDistance].sort((a, b) => a.price - b.price)[0];
    }

    const allPrices = withDistance.map((s) => s.price).sort((a, b) => a - b);
    const cheaperCount = allPrices.filter((p) => p > nearest.price).length;
    const percentile = Math.round((cheaperCount / allPrices.length) * 100);

    const fuelToGetThere = (cheapest.distance / 100) * DEFAULT_CONSUMPTION;
    const dollarToGetThere = (fuelToGetThere * cheapest.price) / 100;
    const savingsPerTank = ((nearest.price - cheapest.price) * DEFAULT_TANK_SIZE) / 100;
    const netSavings = savingsPerTank - dollarToGetThere;

    return {
      type: cheapest.station.id === nearest.station.id || netSavings < 1 ? "fill" : "drive",
      nearestStation: nearest.station,
      nearestPrice: nearest.price,
      nearestDistance: nearest.distance,
      cheapestStation: cheapest.station,
      cheapestPrice: cheapest.price,
      cheapestDistance: cheapest.distance,
      savingsPerTank,
      fuelToGetThere,
      dollarToGetThere,
      netSavings,
      percentile,
    };
  }, [userLocation, stations, selectedFuelType, tripMode, tripDestination]);

  const handleGoTo = (station: StationWithPrices) => {
    setSelectedStation(station);
    setFlyToTarget({ lat: station.latitude, lng: station.longitude, zoom: 15 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.3 }}
      className="absolute bottom-2 left-2 right-2 z-[1000] md:right-auto md:bottom-4 md:left-3 md:w-[26rem] max-h-[60vh] flex flex-col rounded-2xl border border-white/10 bg-[#1a1a1a]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
    >
      {/* Trip mode banner */}
      {tripMode === "trip" && tripDestination && (
        <div className="px-3 pt-3 pb-2 border-b border-[#4285f4]/20 bg-[#4285f4]/5 shrink-0">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#4285f4] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <div className="min-w-0">
              <div className="text-[10px] text-[#8ab4f8] uppercase tracking-wider">Trip to</div>
              <div className="text-sm font-semibold text-white truncate">{tripDestination.name}</div>
            </div>
          </div>
        </div>
      )}

      {/* Fuel type selector */}
      <div className="px-3 pt-3 pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-1.5 mb-2 px-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-[#fbbc04] shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
          </svg>
          <span className="text-xs font-bold text-white uppercase tracking-wide">
            Select fuel type
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {visibleFuelTypes.map(([id, label]) => {
            const isActive = id === selectedFuelType;
            const short = id === "PDSL" ? "P.Diesel" : label.replace("Unleaded ", "U").replace("Premium ", "P").replace("Ethanol ", "E").replace("Biodiesel ", "B");
            return (
              <button
                key={id}
                onClick={() => setSelectedFuelType(id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#4285f4] text-white shadow-lg shadow-[#4285f4]/30 ring-2 ring-[#4285f4]/50"
                    : "bg-white/[0.08] text-[#dadce0] hover:bg-white/15 hover:text-white"
                }`}
              >
                {short}
              </button>
            );
          })}
          {!showAllFuels && !selectedIsOther && otherFuelTypes.length > 0 && (
            <button
              onClick={() => setShowAllFuels(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/[0.08] text-[#dadce0] hover:bg-white/15 hover:text-white transition-all"
            >
              &hellip;
            </button>
          )}
        </div>
      </div>

      {/* Strategy card */}
      <div className="overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait">
          {!userLocation ? (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-5 flex items-center gap-3"
            >
              <div className="h-5 w-5 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin shrink-0" />
              <div>
                <div className="text-sm font-medium text-white">Finding your location...</div>
                <div className="text-[11px] text-[#9aa0a6]">Allow location access for personalised advice</div>
              </div>
            </motion.div>
          ) : !strategy ? (
            <motion.div
              key="no-data"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-5 text-center text-xs text-[#9aa0a6]"
            >
              No stations found for this fuel type nearby
            </motion.div>
          ) : strategy.type === "fill" ? (
            <motion.div
              key="fill"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-400">Fill up now!</div>
                  <div className="text-[11px] text-[#9aa0a6]">You&apos;re near the best price in your area</div>
                </div>
              </div>

              <button
                onClick={() => handleGoTo(strategy.nearestStation)}
                className="w-full flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 hover:bg-white/10 active:bg-white/15 transition-colors text-left"
              >
                <BrandLogo brandName={strategy.nearestStation.brand?.name ?? "?"} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white truncate">{strategy.nearestStation.name}</div>
                  <div className="text-[11px] text-[#9aa0a6]">{strategy.nearestDistance.toFixed(1)}km away</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold font-mono text-emerald-400">{strategy.nearestPrice.toFixed(1)}c</div>
                  <div className="text-[10px] text-[#9aa0a6]">Beats {strategy.percentile}%</div>
                </div>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="drive"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-amber-400">Don&apos;t fill up here</div>
                  <div className="text-[11px] text-[#9aa0a6]">A better deal is {strategy.cheapestDistance.toFixed(1)}km away</div>
                </div>
              </div>

              {/* Nearest (expensive) */}
              <button
                onClick={() => handleGoTo(strategy.nearestStation)}
                className="w-full flex items-center gap-3 rounded-xl bg-red-500/5 border border-red-500/10 px-3 py-2 mb-1.5 hover:bg-red-500/10 transition-colors text-left"
              >
                <BrandLogo brandName={strategy.nearestStation.brand?.name ?? "?"} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-[#9aa0a6] uppercase">Nearest</div>
                  <div className="text-sm text-white truncate">{strategy.nearestStation.name}</div>
                </div>
                <div className="text-sm font-bold font-mono text-red-400 shrink-0">{strategy.nearestPrice.toFixed(1)}c</div>
              </button>

              {/* Arrow */}
              <div className="flex justify-center py-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#5f6368]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>

              {/* Cheapest (recommended) */}
              <button
                onClick={() => handleGoTo(strategy.cheapestStation)}
                className="w-full flex items-center gap-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 px-3 py-2 mb-3 hover:bg-emerald-500/10 transition-colors text-left"
              >
                <BrandLogo brandName={strategy.cheapestStation.brand?.name ?? "?"} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase">Drive here instead</div>
                  <div className="text-sm text-white truncate">{strategy.cheapestStation.name}</div>
                </div>
                <div className="text-sm font-bold font-mono text-emerald-400 shrink-0">{strategy.cheapestPrice.toFixed(1)}c</div>
              </button>

              {/* Savings breakdown */}
              <div className="flex gap-2 text-center">
                <div className="flex-1 rounded-lg bg-white/5 px-2 py-1.5">
                  <div className="text-[10px] text-[#9aa0a6]">Put in just</div>
                  <div className="text-xs font-bold text-white font-mono">${strategy.dollarToGetThere.toFixed(0)}</div>
                  <div className="text-[10px] text-[#5f6368]">to get there</div>
                </div>
                <div className="flex-1 rounded-lg bg-white/5 px-2 py-1.5">
                  <div className="text-[10px] text-[#9aa0a6]">Save</div>
                  <div className="text-xs font-bold text-emerald-400 font-mono">${strategy.savingsPerTank.toFixed(2)}</div>
                  <div className="text-[10px] text-[#5f6368]">per tank</div>
                </div>
                <div className="flex-1 rounded-lg bg-white/5 px-2 py-1.5">
                  <div className="text-[10px] text-[#9aa0a6]">Net saving</div>
                  <div className="text-xs font-bold text-emerald-400 font-mono">${strategy.netSavings.toFixed(2)}</div>
                  <div className="text-[10px] text-[#5f6368]">after trip</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Change trip button */}
      {onChangeTrip && strategy && (
        <button
          onClick={onChangeTrip}
          className="px-4 py-2 border-t border-white/5 text-xs text-[#9aa0a6] hover:text-white hover:bg-white/5 transition-colors text-center shrink-0"
        >
          {tripMode === "trip" ? "Change destination" : "Set a destination"} &middot; Change fuel type
        </button>
      )}
    </motion.div>
  );
}
