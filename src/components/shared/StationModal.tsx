"use client";

import { useEffect, useMemo } from "react";
import type { StationWithPrices } from "@/types/fuel";
import { nearestStations } from "@/lib/geo";
import BrandLogo from "./BrandLogo";
import PriceBadge from "./PriceBadge";
import AdSlot from "./AdSlot";
import { FUEL_TYPE_LABELS } from "@/lib/constants";

interface StationModalProps {
  station: StationWithPrices;
  allStations: StationWithPrices[];
  selectedFuelType: string;
  onClose: () => void;
  onSelectStation: (station: StationWithPrices) => void;
}

export default function StationModal({
  station,
  allStations,
  selectedFuelType,
  onClose,
  onSelectStation,
}: StationModalProps) {
  const nearby = nearestStations(
    allStations.filter((s) => s.id !== station.id),
    station.latitude,
    station.longitude,
    5
  );

  const currentPrice = station.prices.find((p) => p.fuelType === selectedFuelType);

  // Compute percentile and stats for this fuel type across all stations
  const priceInsight = useMemo(() => {
    if (!currentPrice) return null;

    const allPrices = allStations
      .map((s) => s.prices.find((p) => p.fuelType === selectedFuelType)?.price)
      .filter((p): p is number => p != null)
      .sort((a, b) => a - b);

    if (allPrices.length === 0) return null;

    const cheaperCount = allPrices.filter((p) => p > currentPrice.price).length;
    const percentile = Math.round((cheaperCount / allPrices.length) * 100);
    const cheapest = allPrices[0];
    const average = Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length * 10) / 10;
    const rank = allPrices.filter((p) => p < currentPrice.price).length + 1;

    return { percentile, cheapest, average, rank, total: allPrices.length };
  }, [currentPrice, allStations, selectedFuelType]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed inset-x-0 bottom-0 z-[2001] max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#1a1a1a] shadow-2xl md:inset-x-auto md:inset-y-4 md:right-4 md:left-auto md:w-[420px] md:rounded-2xl md:border">
        <div className="flex justify-center pt-2 pb-0 md:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-[#9aa0a6] hover:text-white hover:bg-white/10 transition-colors z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4 pr-8">
            {station.brand && <BrandLogo brandName={station.brand.name} size="lg" />}
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{station.name}</h2>
              {station.brand && (
                <p className="text-sm text-[#9aa0a6]">
                  {station.brand.name} &middot;{" "}
                  <span className="capitalize">{station.brand.type}</span>
                </p>
              )}
            </div>
          </div>

          <p className="text-sm text-[#9aa0a6] mb-3">{station.address}</p>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-[#4285f4] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-[#5a9bf6] active:bg-[#3367d6] transition-colors shadow-lg shadow-[#4285f4]/20 mb-5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Get Directions
          </a>

          {/* Featured price with insight */}
          {currentPrice && priceInsight && (
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-[#9aa0a6] uppercase tracking-wider mb-1">
                    {FUEL_TYPE_LABELS[selectedFuelType] ?? selectedFuelType}
                  </div>
                  <div className="text-3xl font-bold font-mono text-white">
                    {currentPrice.price.toFixed(1)}<span className="text-lg text-[#9aa0a6]">c/L</span>
                  </div>
                </div>
                <div className="text-right">
                  {priceInsight.percentile >= 90 ? (
                    <div className="text-emerald-400">
                      <div className="text-[10px] uppercase tracking-wider opacity-80 mb-0.5">Cheaper than</div>
                      <div className="text-2xl font-bold font-mono">{priceInsight.percentile}%</div>
                      <div className="text-[10px] uppercase tracking-wider opacity-80">of stations</div>
                    </div>
                  ) : priceInsight.percentile >= 50 ? (
                    <div className="text-amber-400">
                      <div className="text-[10px] uppercase tracking-wider opacity-80 mb-0.5">Cheaper than</div>
                      <div className="text-2xl font-bold font-mono">{priceInsight.percentile}%</div>
                      <div className="text-[10px] uppercase tracking-wider opacity-80">of stations</div>
                    </div>
                  ) : (
                    <div className="text-red-400">
                      <div className="text-[10px] uppercase tracking-wider opacity-80 mb-0.5">More expensive than</div>
                      <div className="text-2xl font-bold font-mono">{100 - priceInsight.percentile}%</div>
                      <div className="text-[10px] uppercase tracking-wider opacity-80">of stations</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-center">
                  <div className="text-[10px] text-[#9aa0a6] mb-0.5">Rank</div>
                  <div className="text-xs font-bold text-white font-mono">#{priceInsight.rank}<span className="text-[#5f6368]">/{priceInsight.total}</span></div>
                </div>
                <div className="flex-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-center">
                  <div className="text-[10px] text-[#9aa0a6] mb-0.5">Cheapest</div>
                  <div className="text-xs font-bold text-emerald-400 font-mono">{priceInsight.cheapest.toFixed(1)}c</div>
                </div>
                <div className="flex-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-center">
                  <div className="text-[10px] text-[#9aa0a6] mb-0.5">Average</div>
                  <div className="text-xs font-bold text-white font-mono">{priceInsight.average.toFixed(1)}c</div>
                </div>
                <div className="flex-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-center">
                  <div className="text-[10px] text-[#9aa0a6] mb-0.5">You save</div>
                  <div className={`text-xs font-bold font-mono ${priceInsight.average > currentPrice.price ? "text-emerald-400" : "text-red-400"}`}>
                    {priceInsight.average > currentPrice.price ? "" : "+"}{(currentPrice.price - priceInsight.average).toFixed(1)}c
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All prices */}
          {station.prices.length > 1 && (
            <div className="mb-5">
              <h3 className="text-xs font-semibold text-[#9aa0a6] uppercase tracking-wider mb-2">
                All Fuel Types
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {station.prices.map((p) => (
                  <div
                    key={p.fuelType}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                      p.fuelType === selectedFuelType
                        ? "bg-[#4285f4]/10 border border-[#4285f4]/20"
                        : "bg-white/5"
                    }`}
                  >
                    <span className="text-xs text-[#9aa0a6]">
                      {FUEL_TYPE_LABELS[p.fuelType] ?? p.fuelType}
                    </span>
                    <span className="text-sm font-mono font-semibold text-white">
                      {p.price.toFixed(1)}c
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ad in modal */}
          <div className="mb-5">
            <AdSlot slot="station-modal" format="rectangle" />
          </div>

          {/* Nearby stations */}
          {nearby.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#9aa0a6] uppercase tracking-wider mb-2">
                Nearby Stations
              </h3>
              <div className="space-y-1.5">
                {nearby.map((s) => {
                  const price = s.prices.find((p) => p.fuelType === selectedFuelType);
                  return (
                    <button
                      key={s.id}
                      onClick={() => onSelectStation(s)}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5 text-left"
                    >
                      <BrandLogo brandName={s.brand?.name ?? "?"} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-[#e8e6e3] truncate">{s.name}</div>
                        <div className="text-[11px] text-[#9aa0a6]">
                          {s.brand?.name ?? "Unknown"} &middot; {s.distance.toFixed(1)} km
                        </div>
                      </div>
                      {price && <PriceBadge price={price.price} size="sm" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
