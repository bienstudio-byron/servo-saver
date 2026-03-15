"use client";

import { useEffect } from "react";
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

  // Lock body scroll & handle escape key
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-[2001] max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#1a1a1a] shadow-2xl md:inset-x-auto md:inset-y-4 md:right-4 md:left-auto md:w-[420px] md:rounded-2xl md:border">
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-2 pb-0 md:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Close button */}
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

          <p className="text-sm text-[#9aa0a6] mb-5">{station.address}</p>

          {/* Featured price */}
          {currentPrice && (
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-5 flex items-center justify-between">
              <div>
                <div className="text-xs text-[#9aa0a6] uppercase tracking-wider mb-1">
                  {FUEL_TYPE_LABELS[selectedFuelType] ?? selectedFuelType}
                </div>
                <div className="text-3xl font-bold font-mono text-white">
                  {currentPrice.price.toFixed(1)}<span className="text-lg text-[#9aa0a6]">c/L</span>
                </div>
              </div>
              <PriceBadge price={currentPrice.price} size="lg" />
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
