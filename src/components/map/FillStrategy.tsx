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
const AVG_CITY_SPEED = 35;
const AU_MIN_WAGE = 23.23;

interface StrategyResult {
  type: "fill" | "drive";
  nearestStation: StationWithPrices;
  nearestPrice: number;
  nearestDistance: number;
  cheapestStation: StationWithPrices;
  cheapestPrice: number;
  cheapestDistance: number;
  detourKm: number;
  detourMins: number;
  fuelCostOfDetour: number;
  savingsPerTank: number;
  netSavings: number;
  effectiveHourlyRate: number;
  percentile: number;
}

export default function FillStrategy({ stations, selectedFuelType, onChangeTrip }: FillStrategyProps) {
  const userLocation = useFuelStore((s) => s.userLocation);
  const tripMode = useFuelStore((s) => s.tripMode);
  const tripDestination = useFuelStore((s) => s.tripDestination);
  const setSelectedStation = useFuelStore((s) => s.setSelectedStation);
  const setFlyToTarget = useFuelStore((s) => s.setFlyToTarget);
  const rawSetFuelType = useFuelStore((s) => s.setSelectedFuelType);
  const [showDetails, setShowDetails] = useState(false);
  const [showFuelPicker, setShowFuelPicker] = useState(false);

  const setSelectedFuelType = (id: string) => {
    rawSetFuelType(id);
    try { localStorage.setItem("petrolsaver-fuel-chosen", id); } catch {}
    setShowFuelPicker(false);
  };

  const MAIN_FUEL_IDS = ["U91", "P95", "P98", "DSL", "E10", "LPG"];
  const allFuelTypes = Object.entries(FUEL_TYPE_LABELS);

  function isOnRoute(sLat: number, sLng: number, oLat: number, oLng: number, dLat: number, dLng: number): boolean {
    const total = haversineDistance(oLat, oLng, dLat, dLng);
    const toS = haversineDistance(oLat, oLng, sLat, sLng);
    const sToDest = haversineDistance(sLat, sLng, dLat, dLng);
    return ((toS + sToDest) - total) < Math.max(5, total * 0.15) && toS < total;
  }

  const strategy = useMemo((): StrategyResult | null => {
    if (!userLocation || stations.length === 0) return null;
    const withDistance = stations.map((s) => {
      const p = s.prices.find((pr) => pr.fuelType === selectedFuelType);
      if (!p) return null;
      return { station: s, price: p.price, distance: haversineDistance(userLocation.lat, userLocation.lng, s.latitude, s.longitude) * ROAD_FACTOR };
    }).filter((x): x is { station: StationWithPrices; price: number; distance: number } => x !== null);
    if (withDistance.length === 0) return null;

    const nearest = [...withDistance].sort((a, b) => a.distance - b.distance)[0];
    let cheapest: typeof nearest;
    if (tripMode === "trip" && tripDestination) {
      const onRoute = withDistance.filter((s) => isOnRoute(s.station.latitude, s.station.longitude, userLocation.lat, userLocation.lng, tripDestination.lat, tripDestination.lng)).sort((a, b) => a.price - b.price);
      cheapest = onRoute[0] || [...withDistance].sort((a, b) => a.price - b.price)[0];
    } else {
      const near = withDistance.filter((s) => s.distance <= 15).sort((a, b) => a.price - b.price);
      cheapest = near[0] || [...withDistance].sort((a, b) => a.price - b.price)[0];
    }

    const allPrices = withDistance.map((s) => s.price);
    const percentile = Math.round((allPrices.filter((p) => p > nearest.price).length / allPrices.length) * 100);
    const detourKm = Math.max(0, cheapest.distance - nearest.distance);
    const detourMins = Math.round((detourKm / AVG_CITY_SPEED) * 60);
    const fuelCostOfDetour = ((detourKm / 100) * DEFAULT_CONSUMPTION * cheapest.price) / 100;
    const savingsPerTank = ((nearest.price - cheapest.price) * DEFAULT_TANK_SIZE) / 100;
    const netSavings = savingsPerTank - fuelCostOfDetour;
    const effectiveHourlyRate = detourMins > 0 ? netSavings / (detourMins / 60) : Infinity;

    return {
      type: cheapest.station.id === nearest.station.id || netSavings < 1 || effectiveHourlyRate < 0 ? "fill" : "drive",
      nearestStation: nearest.station, nearestPrice: nearest.price, nearestDistance: nearest.distance,
      cheapestStation: cheapest.station, cheapestPrice: cheapest.price, cheapestDistance: cheapest.distance,
      detourKm, detourMins, fuelCostOfDetour, savingsPerTank, netSavings, effectiveHourlyRate, percentile,
    };
  }, [userLocation, stations, selectedFuelType, tripMode, tripDestination]);

  const handleGoTo = (station: StationWithPrices) => {
    setSelectedStation(station);
    setFlyToTarget({ lat: station.latitude, lng: station.longitude, zoom: 15 });
  };

  const fuelShort = selectedFuelType === "PDSL" ? "P.Diesel" : (FUEL_TYPE_LABELS[selectedFuelType] ?? selectedFuelType).replace("Unleaded ", "U").replace("Premium ", "P");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.3 }}
      className="absolute bottom-2 left-2 right-2 z-[1000] md:right-auto md:bottom-4 md:left-3 md:w-[24rem] rounded-2xl border border-white/10 bg-[#1a1a1a]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
    >
      {/* Compact header bar — always visible */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Fuel type toggle */}
        <button
          onClick={() => setShowFuelPicker(!showFuelPicker)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#4285f4] text-white text-[11px] font-bold shrink-0"
        >
          {fuelShort}
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${showFuelPicker ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Trip info */}
        {tripMode === "trip" && tripDestination ? (
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-[#4285f4] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span className="text-[11px] text-[#9aa0a6] truncate">to {tripDestination.name}</span>
          </div>
        ) : (
          <span className="text-[11px] text-[#9aa0a6] flex-1">Near you</span>
        )}

        {/* Settings */}
        {onChangeTrip && (
          <button onClick={onChangeTrip} className="p-1 text-[#5f6368] hover:text-white transition-colors shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* Fuel type dropdown */}
      <AnimatePresence>
        {showFuelPicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-white/5"
          >
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

      {/* Main recommendation */}
      <div className="border-t border-white/5">
        <AnimatePresence mode="wait">
          {!userLocation ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="px-3 py-4 flex items-center gap-2.5"
            >
              <div className="h-4 w-4 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin shrink-0" />
              <span className="text-xs text-[#9aa0a6]">Finding best deal...</span>
            </motion.div>
          ) : !strategy ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="px-3 py-4 text-xs text-[#9aa0a6] text-center"
            >No stations found nearby</motion.div>
          ) : strategy.type === "fill" ? (
            <motion.div key="fill" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Fill up — simple card */}
              <button
                onClick={() => handleGoTo(strategy.nearestStation)}
                className="w-full flex items-center gap-3 px-3 py-3 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
              >
                <BrandLogo brandName={strategy.nearestStation.brand?.name ?? "?"} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-400">Fill up here</span>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold">BEST</span>
                  </div>
                  <div className="text-sm font-medium text-white truncate">{strategy.nearestStation.name}</div>
                  <div className="text-[10px] text-[#9aa0a6]">{strategy.nearestDistance.toFixed(1)}km &middot; Beats {strategy.percentile}%</div>
                </div>
                <div className="text-lg font-bold font-mono text-emerald-400 shrink-0">{strategy.nearestPrice.toFixed(1)}c</div>
              </button>

              {/* Directions */}
              <div className="px-3 pb-3">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${strategy.nearestStation.latitude},${strategy.nearestStation.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-[#4285f4] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#5a9bf6] active:bg-[#3367d6] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  Get Directions
                </a>
              </div>
            </motion.div>
          ) : (
            <motion.div key="drive" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Skip station — compact */}
              <div className="px-3 pt-2.5">
                <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] opacity-50">
                  <BrandLogo brandName={strategy.nearestStation.brand?.name ?? "?"} size="sm" />
                  <span className="text-xs text-white truncate flex-1">{strategy.nearestStation.name}</span>
                  <span className="text-xs font-mono text-red-400 line-through shrink-0">{strategy.nearestPrice.toFixed(1)}c</span>
                  <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded shrink-0">SKIP</span>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center gap-1.5 py-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="text-[10px] text-emerald-400/70">+{strategy.detourKm.toFixed(1)}km · ~{strategy.detourMins}min</span>
              </div>

              {/* Recommended station */}
              <button
                onClick={() => handleGoTo(strategy.cheapestStation)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
              >
                <BrandLogo brandName={strategy.cheapestStation.brand?.name ?? "?"} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-400">Fill up here</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      strategy.effectiveHourlyRate >= AU_MIN_WAGE * 2
                        ? "bg-emerald-500/10 text-emerald-400"
                        : strategy.effectiveHourlyRate >= AU_MIN_WAGE
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {strategy.effectiveHourlyRate >= AU_MIN_WAGE * 2 ? "GREAT DEAL" : strategy.effectiveHourlyRate >= AU_MIN_WAGE ? "WORTH IT" : "MARGINAL"}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-white truncate">{strategy.cheapestStation.name}</div>
                  <div className="text-[10px] text-[#9aa0a6]">
                    Save <span className="text-emerald-400 font-semibold">${strategy.netSavings.toFixed(2)}</span> per tank
                  </div>
                </div>
                <div className="text-lg font-bold font-mono text-emerald-400 shrink-0">{strategy.cheapestPrice.toFixed(1)}c</div>
              </button>

              {/* Show details toggle */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] text-[#5f6368] hover:text-[#9aa0a6] transition-colors"
              >
                {showDetails ? "Hide" : "Show"} breakdown
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${showDetails ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expandable breakdown */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3">
                      <div className="rounded-xl bg-white/[0.03] border border-white/5 p-2.5 space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-[#9aa0a6]">Your time is worth</span>
                          <span className={`font-bold font-mono ${strategy.effectiveHourlyRate >= AU_MIN_WAGE ? "text-emerald-400" : "text-amber-400"}`}>
                            ${strategy.effectiveHourlyRate === Infinity ? "∞" : strategy.effectiveHourlyRate.toFixed(0)}/hr
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#9aa0a6]">Detour</span>
                          <span className="text-white font-mono">+{strategy.detourKm.toFixed(1)}km · ~{strategy.detourMins}min</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#9aa0a6]">Fuel burned</span>
                          <span className="text-red-400 font-mono">-${strategy.fuelCostOfDetour.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#9aa0a6]">Tank savings</span>
                          <span className="text-emerald-400 font-mono">+${strategy.savingsPerTank.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-white/5">
                          <span className="text-white font-semibold">Net saving</span>
                          <span className="text-emerald-400 font-bold font-mono">${strategy.netSavings.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Directions */}
              <div className="px-3 pb-3">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${strategy.cheapestStation.latitude},${strategy.cheapestStation.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-[#4285f4] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-[#5a9bf6] active:bg-[#3367d6] transition-colors"
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
    </motion.div>
  );
}
