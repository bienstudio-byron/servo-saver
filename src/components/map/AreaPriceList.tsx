"use client";

import { useState } from "react";
import type { StationWithPrices } from "@/types/fuel";
import BrandLogo from "@/components/shared/BrandLogo";
import PriceBadge from "@/components/shared/PriceBadge";
import { useFuelStore } from "@/stores/fuel-store";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import AdSlot from "@/components/shared/AdSlot";

interface AreaPriceListProps {
  stations: StationWithPrices[];
  selectedFuelType: string;
  loading?: boolean;
}

const MAX_ITEMS = 8;
const MAX_ITEMS_MOBILE = 4;

export default function AreaPriceList({
  stations,
  selectedFuelType,
  loading,
}: AreaPriceListProps) {
  const [collapsed, setCollapsed] = useState(false);
  const setSelectedStation = useFuelStore((s) => s.setSelectedStation);
  const rawSetFuelType = useFuelStore((s) => s.setSelectedFuelType);
  const setSelectedFuelType = (id: string) => {
    rawSetFuelType(id);
    try { localStorage.setItem("petrolsaver-fuel-chosen", id); } catch {}
  };

  const sorted = stations
    .map((s) => {
      const p = s.prices.find((p) => p.fuelType === selectedFuelType);
      return p ? { station: s, price: p.price } : null;
    })
    .filter((x): x is { station: StationWithPrices; price: number } => x !== null)
    .sort((a, b) => a.price - b.price);

  const cheapest = sorted[0]?.price ?? null;
  const mostExpensive = sorted[Math.min(sorted.length - 1, MAX_ITEMS - 1)]?.price ?? null;
  const spread = cheapest && mostExpensive ? (mostExpensive - cheapest).toFixed(1) : null;

  const [showAllFuels, setShowAllFuels] = useState(false);

  const MAIN_FUEL_IDS = ["U91", "P95", "P98", "DSL", "E10", "LPG"];
  const allFuelTypes = Object.entries(FUEL_TYPE_LABELS);
  const mainFuelTypes = allFuelTypes.filter(([id]) => MAIN_FUEL_IDS.includes(id));
  const otherFuelTypes = allFuelTypes.filter(([id]) => !MAIN_FUEL_IDS.includes(id));
  const selectedIsOther = otherFuelTypes.some(([id]) => id === selectedFuelType);
  const visibleFuelTypes = showAllFuels || selectedIsOther ? allFuelTypes : mainFuelTypes;

  return (
    <div
      className={`
        absolute z-[1000] flex flex-col rounded-2xl border border-white/10
        bg-[#1a1a1a]/95 backdrop-blur-xl shadow-2xl transition-all

        /* Mobile: bottom sheet, full width with margins */
        bottom-2 left-2 right-2
        max-h-[55vh]

        /* Desktop: left panel, fixed width */
        md:right-auto md:bottom-4 md:left-3
        md:w-[26rem] md:max-h-[calc(100%-2rem)]
      `}
    >
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

      {/* Best prices header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0"
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider">
            Best prices nearby
          </span>
        </div>
        <div className="flex items-center gap-2">
          {spread && (
            <span className="text-[10px] text-[#9aa0a6] font-mono hidden sm:inline">{spread}c spread</span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 text-[#9aa0a6] transition-transform shrink-0 ${collapsed ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Station list */}
      {!collapsed && (
        <div className="overflow-y-auto overflow-x-hidden overscroll-contain">
          {loading ? (
            <div className="px-4 py-4 flex flex-col items-center gap-2">
              <div className="h-5 w-5 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />
              <span className="text-xs text-[#9aa0a6]">Loading prices...</span>
            </div>
          ) : sorted.length === 0 ? (
            <div className="px-4 py-4 text-center text-xs text-[#9aa0a6]">
              Zoom in to see prices in this area
            </div>
          ) : (
            <div className="py-1">
              {/* Show fewer items on mobile */}
              {sorted.slice(0, MAX_ITEMS).map(({ station, price }, i) => (
                <button
                  key={station.id}
                  onClick={() => setSelectedStation(station)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors hover:bg-white/5 active:bg-white/10 group text-left ${
                    i >= MAX_ITEMS_MOBILE ? "hidden md:flex" : "flex"
                  }`}
                >
                  <span className={`text-[10px] font-bold w-4 text-center shrink-0 ${
                    i === 0 ? "text-emerald-400" : "text-[#5f6368]"
                  }`}>
                    {i + 1}
                  </span>
                  <BrandLogo brandName={station.brand?.name ?? "?"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[#e8e6e3] truncate group-hover:text-white transition-colors">
                      {station.name}
                    </div>
                    <div className="text-[11px] text-[#9aa0a6] truncate">
                      {station.brand?.name ?? "Unknown"}
                    </div>
                  </div>
                  <PriceBadge price={price} size="sm" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ad at bottom of panel — desktop only */}
      {!collapsed && sorted.length > 0 && (
        <div className="hidden md:block px-3 pb-3 pt-1 border-t border-white/5">
          <AdSlot slot="panel-bottom" format="fluid" />
        </div>
      )}
    </div>
  );
}
