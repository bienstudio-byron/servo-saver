"use client";

import { useState } from "react";
import type { StationWithPrices } from "@/types/fuel";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import BrandLogo from "@/components/shared/BrandLogo";

interface Props {
  stations: StationWithPrices[];
}

export default function SuburbPageClient({ stations }: Props) {
  const [fuelType, setFuelType] = useState("U91");

  const sorted = stations
    .map((s) => {
      const p = s.prices.find((pr) => pr.fuelType === fuelType);
      return p ? { station: s, price: p.price } : null;
    })
    .filter((x): x is { station: typeof stations[0]; price: number } => x !== null)
    .sort((a, b) => a.price - b.price);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {Object.entries(FUEL_TYPE_LABELS)
          .filter(([id]) => stations.some((s) => s.prices.some((p) => p.fuelType === id)))
          .map(([id, label]) => {
            const short = id === "PDSL" ? "P.Diesel" : label.replace("Unleaded ", "U").replace("Premium ", "P").replace("Ethanol ", "E").replace("Biodiesel ", "B");
            return (
              <button
                key={id}
                onClick={() => setFuelType(id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  id === fuelType
                    ? "bg-[#4285f4] text-white shadow-lg shadow-[#4285f4]/30"
                    : "bg-white/[0.08] text-[#dadce0] hover:bg-white/15 hover:text-white"
                }`}
              >
                {short}
              </button>
            );
          })}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#242424] overflow-hidden">
        {sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[#9aa0a6]">
            No stations sell {FUEL_TYPE_LABELS[fuelType] ?? fuelType} in this suburb.
          </div>
        ) : (
          sorted.map(({ station, price }, i) => (
            <a
              key={station.id}
              href="/"
              className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5 ${
                i > 0 ? "border-t border-white/5" : ""
              }`}
            >
              <span className={`text-xs font-bold w-5 text-center shrink-0 ${
                i === 0 ? "text-emerald-400" : "text-[#5f6368]"
              }`}>
                {i + 1}
              </span>
              <BrandLogo brandName={station.brand?.name ?? "?"} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white truncate">{station.name}</div>
                <div className="text-[11px] text-[#9aa0a6] truncate">
                  {station.brand?.name ?? "Unknown"} &middot; {station.address}
                </div>
              </div>
              <div className={`text-sm font-bold font-mono shrink-0 ${
                i === 0 ? "text-emerald-400" : "text-white"
              }`}>
                {price.toFixed(1)}c
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
