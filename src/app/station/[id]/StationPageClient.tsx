"use client";

import { useState } from "react";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import PriceHistory from "@/components/shared/PriceHistory";

interface Props {
  stationId: string;
  prices: { fuelType: string; price: number }[];
}

export default function StationPageClient({ stationId, prices }: Props) {
  const [fuelType, setFuelType] = useState(prices[0]?.fuelType || "U91");

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {prices.map((p) => {
          const label = FUEL_TYPE_LABELS[p.fuelType] ?? p.fuelType;
          const short = p.fuelType === "PDSL" ? "P.Diesel" : label.replace("Unleaded ", "U").replace("Premium ", "P").replace("Ethanol ", "E").replace("Biodiesel ", "B");
          return (
            <button
              key={p.fuelType}
              onClick={() => setFuelType(p.fuelType)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                p.fuelType === fuelType
                  ? "bg-[#4285f4] text-white"
                  : "bg-white/[0.06] text-[#9aa0a6] hover:bg-white/10 hover:text-white"
              }`}
            >
              {short}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#242424] p-4">
        <PriceHistory stationId={stationId} fuelType={fuelType} />
      </div>
    </div>
  );
}
