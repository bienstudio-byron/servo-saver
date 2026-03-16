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

const DEFAULT_CONSUMPTION = 8.5; // L/100km
const DEFAULT_TANK_SIZE = 50; // litres
const ROAD_FACTOR = 1.35; // straight line → road estimate
const AVG_CITY_SPEED = 35; // km/h average for city driving
const AU_MIN_WAGE = 23.23; // AUD/hr

interface StrategyResult {
  type: "fill" | "drive";
  nearestStation: StationWithPrices;
  nearestPrice: number;
  nearestDistance: number;
  cheapestStation: StationWithPrices;
  cheapestPrice: number;
  cheapestDistance: number;
  detourKm: number; // extra km vs going to nearest
  detourMins: number; // estimated minutes for the detour
  fuelBurnedOnDetour: number; // litres burned on detour
  fuelCostOfDetour: number; // $ cost of fuel burned
  savingsPerTank: number; // $ saved on a full tank (raw)
  netSavings: number; // $ saved after fuel cost of detour
  effectiveHourlyRate: number; // $/hr — what your time is "worth"
  percentile: number;
}

function StepNumber({ n, color = "bg-white/10 text-[#9aa0a6]" }: { n: number; color?: string }) {
  return (
    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${color}`}>
      {n}
    </div>
  );
}

function StepArrow() {
  return (
    <div className="flex justify-center py-1">
      <div className="w-px h-4 bg-white/10 relative">
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-r-[3px] border-t-[4px] border-l-transparent border-r-transparent border-t-white/20" />
      </div>
    </div>
  );
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

  function isOnRoute(
    sLat: number, sLng: number,
    oLat: number, oLng: number,
    dLat: number, dLng: number
  ): boolean {
    const total = haversineDistance(oLat, oLng, dLat, dLng);
    const toS = haversineDistance(oLat, oLng, sLat, sLng);
    const sToDest = haversineDistance(sLat, sLng, dLat, dLng);
    const detour = (toS + sToDest) - total;
    return detour < Math.max(5, total * 0.15) && toS < total;
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
      const onRoute = withDistance.filter((s) =>
        isOnRoute(s.station.latitude, s.station.longitude, userLocation.lat, userLocation.lng, tripDestination.lat, tripDestination.lng)
      ).sort((a, b) => a.price - b.price);
      cheapest = onRoute[0] || [...withDistance].sort((a, b) => a.price - b.price)[0];
    } else {
      const within15km = withDistance.filter((s) => s.distance <= 15).sort((a, b) => a.price - b.price);
      cheapest = within15km[0] || [...withDistance].sort((a, b) => a.price - b.price)[0];
    }

    const allPrices = withDistance.map((s) => s.price).sort((a, b) => a - b);
    const cheaperCount = allPrices.filter((p) => p > nearest.price).length;
    const percentile = Math.round((cheaperCount / allPrices.length) * 100);

    // Detour = extra distance vs just going to nearest
    const detourKm = Math.max(0, cheapest.distance - nearest.distance);
    // Round trip detour for fuel calc (you have to drive there AND it's out of the way)
    const detourMins = Math.round((detourKm / AVG_CITY_SPEED) * 60);
    const fuelBurnedOnDetour = (detourKm / 100) * DEFAULT_CONSUMPTION;
    const fuelCostOfDetour = (fuelBurnedOnDetour * cheapest.price) / 100;
    const savingsPerTank = ((nearest.price - cheapest.price) * DEFAULT_TANK_SIZE) / 100;
    const netSavings = savingsPerTank - fuelCostOfDetour;
    // Effective hourly rate: what you "earn" per hour by making this detour
    const detourHours = detourMins / 60;
    const effectiveHourlyRate = detourHours > 0 ? netSavings / detourHours : Infinity;

    return {
      type: cheapest.station.id === nearest.station.id || netSavings < 1 || effectiveHourlyRate < 0 ? "fill" : "drive",
      nearestStation: nearest.station, nearestPrice: nearest.price, nearestDistance: nearest.distance,
      cheapestStation: cheapest.station, cheapestPrice: cheapest.price, cheapestDistance: cheapest.distance,
      detourKm, detourMins, fuelBurnedOnDetour, fuelCostOfDetour,
      savingsPerTank, netSavings, effectiveHourlyRate, percentile,
    };
  }, [userLocation, stations, selectedFuelType, tripMode, tripDestination]);

  const handleGoTo = (station: StationWithPrices) => {
    setSelectedStation(station);
    setFlyToTarget({ lat: station.latitude, lng: station.longitude, zoom: 15 });
  };

  const fuelLabel = FUEL_TYPE_LABELS[selectedFuelType] ?? selectedFuelType;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.3 }}
      className="absolute bottom-2 left-2 right-2 z-[1000] md:right-auto md:bottom-4 md:left-3 md:w-[26rem] max-h-[65vh] flex flex-col rounded-2xl border border-white/10 bg-[#1a1a1a]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
    >
      <div className="overflow-y-auto overflow-x-hidden">
        {/* Step 1: Your trip */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5 mb-2">
            <StepNumber n={1} color="bg-[#4285f4]/20 text-[#4285f4]" />
            <span className="text-[10px] font-bold text-[#9aa0a6] uppercase tracking-widest">Your trip</span>
          </div>
          <div className="ml-7 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#4285f4] shrink-0" />
            <span className="text-xs text-[#dadce0]">
              {userLocation ? "Your location" : "Detecting location..."}
            </span>
          </div>
          {tripMode === "trip" && tripDestination && (
            <>
              <div className="ml-[19px] w-px h-3 bg-white/10" />
              <div className="ml-7 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#fbbc04] shrink-0" />
                <span className="text-xs text-[#dadce0]">{tripDestination.name}</span>
              </div>
            </>
          )}
        </div>

        <StepArrow />

        {/* Step 2: Fuel type */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2.5 mb-2">
            <StepNumber n={2} color="bg-[#fbbc04]/20 text-[#fbbc04]" />
            <span className="text-[10px] font-bold text-[#9aa0a6] uppercase tracking-widest">Fuel type</span>
            <span className="text-xs font-semibold text-white ml-auto">{fuelLabel}</span>
          </div>
          <div className="ml-7 flex flex-wrap gap-1.5">
            {visibleFuelTypes.map(([id, label]) => {
              const isActive = id === selectedFuelType;
              const short = id === "PDSL" ? "P.Dsl" : label.replace("Unleaded ", "U").replace("Premium ", "P").replace("Ethanol ", "E").replace("Biodiesel ", "B");
              return (
                <button
                  key={id}
                  onClick={() => setSelectedFuelType(id)}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                    isActive
                      ? "bg-[#4285f4] text-white shadow-lg shadow-[#4285f4]/30"
                      : "bg-white/[0.06] text-[#9aa0a6] hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {short}
                </button>
              );
            })}
            {!showAllFuels && !selectedIsOther && otherFuelTypes.length > 0 && (
              <button
                onClick={() => setShowAllFuels(true)}
                className="px-2 py-1 rounded-md text-[11px] font-bold bg-white/[0.06] text-[#9aa0a6] hover:bg-white/10 hover:text-white transition-all"
              >
                &hellip;
              </button>
            )}
          </div>
        </div>

        <StepArrow />

        {/* Step 3: Recommendation */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2.5 mb-3">
            <StepNumber n={3} color="bg-emerald-500/20 text-emerald-400" />
            <span className="text-[10px] font-bold text-[#9aa0a6] uppercase tracking-widest">Where to fill</span>
          </div>

          <AnimatePresence mode="wait">
            {!userLocation ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ml-7 flex items-center gap-2 py-2">
                <div className="h-4 w-4 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin shrink-0" />
                <span className="text-xs text-[#9aa0a6]">Finding best deal...</span>
              </motion.div>
            ) : !strategy ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ml-7 text-xs text-[#9aa0a6] py-2">
                No stations found for {fuelLabel}
              </motion.div>
            ) : strategy.type === "fill" ? (
              <motion.div key="fill" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                {/* Fill up recommendation */}
                <div className="ml-7 mb-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs font-bold text-emerald-400">Fill up here!</span>
                  </div>
                </div>

                <button
                  onClick={() => handleGoTo(strategy.nearestStation)}
                  className="ml-7 w-[calc(100%-1.75rem)] flex items-center gap-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 px-3 py-2.5 hover:bg-emerald-500/10 active:bg-emerald-500/15 transition-colors text-left"
                >
                  <BrandLogo brandName={strategy.nearestStation.brand?.name ?? "?"} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white truncate">{strategy.nearestStation.name}</div>
                    <div className="text-[11px] text-[#9aa0a6]">{strategy.nearestDistance.toFixed(1)}km &middot; Beats {strategy.percentile}%</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold font-mono text-emerald-400">{strategy.nearestPrice.toFixed(1)}c</div>
                  </div>
                </button>

                {/* Directions CTA */}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${strategy.nearestStation.latitude},${strategy.nearestStation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-7 mt-2 w-[calc(100%-1.75rem)] inline-flex items-center justify-center gap-1.5 bg-[#4285f4] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#5a9bf6] active:bg-[#3367d6] transition-colors shadow-lg shadow-[#4285f4]/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Get Directions
                </a>
              </motion.div>
            ) : (
              <motion.div key="drive" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                {/* Nearest (skip) */}
                <button
                  onClick={() => handleGoTo(strategy.nearestStation)}
                  className="ml-7 w-[calc(100%-1.75rem)] flex items-center gap-2.5 rounded-xl bg-red-500/5 border border-red-500/10 px-3 py-2 hover:bg-red-500/10 transition-colors text-left opacity-60"
                >
                  <BrandLogo brandName={strategy.nearestStation.brand?.name ?? "?"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-white truncate">{strategy.nearestStation.name}</div>
                    <div className="text-[10px] text-[#9aa0a6]">{strategy.nearestDistance.toFixed(1)}km</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-bold font-mono text-red-400 line-through">{strategy.nearestPrice.toFixed(1)}c</span>
                    <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">SKIP</span>
                  </div>
                </button>

                {/* Direction arrow with detour info */}
                <div className="ml-7 flex items-center gap-2 py-1.5">
                  <div className="flex flex-col items-center">
                    <div className="w-px h-2 bg-emerald-500/30" />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    +{strategy.detourKm.toFixed(1)}km &middot; ~{strategy.detourMins} min detour
                  </span>
                </div>

                {/* Cheapest (go here) */}
                <button
                  onClick={() => handleGoTo(strategy.cheapestStation)}
                  className="ml-7 w-[calc(100%-1.75rem)] flex items-center gap-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 px-3 py-2.5 hover:bg-emerald-500/10 transition-colors text-left"
                >
                  <BrandLogo brandName={strategy.cheapestStation.brand?.name ?? "?"} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-emerald-400 font-bold uppercase">Fill up here</div>
                    <div className="text-sm font-medium text-white truncate">{strategy.cheapestStation.name}</div>
                  </div>
                  <div className="text-base font-bold font-mono text-emerald-400 shrink-0">{strategy.cheapestPrice.toFixed(1)}c</div>
                </button>

                {/* The real breakdown */}
                <div className="ml-7 mt-2.5 w-[calc(100%-1.75rem)] rounded-xl bg-white/[0.03] border border-white/5 p-3">
                  {/* Effective hourly rate — the headline metric */}
                  <div className="flex items-center justify-between mb-2.5 pb-2.5 border-b border-white/5">
                    <div>
                      <div className="text-[10px] text-[#9aa0a6] uppercase tracking-wider">Your time is worth</div>
                      <div className={`text-xl font-bold font-mono ${strategy.effectiveHourlyRate >= AU_MIN_WAGE ? "text-emerald-400" : "text-amber-400"}`}>
                        ${strategy.effectiveHourlyRate === Infinity ? "∞" : strategy.effectiveHourlyRate.toFixed(0)}/hr
                      </div>
                    </div>
                    <div className={`text-right px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                      strategy.effectiveHourlyRate >= AU_MIN_WAGE
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {strategy.effectiveHourlyRate >= AU_MIN_WAGE * 2
                        ? "Great deal"
                        : strategy.effectiveHourlyRate >= AU_MIN_WAGE
                        ? "Worth it"
                        : "Marginal"}
                    </div>
                  </div>

                  {/* Breakdown rows */}
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#9aa0a6]">Detour</span>
                      <span className="text-white font-mono">+{strategy.detourKm.toFixed(1)}km &middot; ~{strategy.detourMins} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9aa0a6]">Fuel burned on detour</span>
                      <span className="text-red-400 font-mono">-${strategy.fuelCostOfDetour.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9aa0a6]">Savings on full tank</span>
                      <span className="text-emerald-400 font-mono">+${strategy.savingsPerTank.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-white/5">
                      <span className="text-white font-semibold">Net saving</span>
                      <span className="text-emerald-400 font-bold font-mono">${strategy.netSavings.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Directions CTA */}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${strategy.cheapestStation.latitude},${strategy.cheapestStation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-7 mt-2.5 w-[calc(100%-1.75rem)] inline-flex items-center justify-center gap-1.5 bg-[#4285f4] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-[#5a9bf6] active:bg-[#3367d6] transition-colors shadow-lg shadow-[#4285f4]/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Get Directions
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Change trip */}
      {onChangeTrip && (
        <button
          onClick={onChangeTrip}
          className="px-4 py-2.5 border-t border-white/5 text-[11px] text-[#9aa0a6] hover:text-white hover:bg-white/5 transition-colors text-center shrink-0 flex items-center justify-center gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Change trip or fuel type
        </button>
      )}
    </motion.div>
  );
}
