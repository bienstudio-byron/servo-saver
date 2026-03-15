"use client";

import Link from "next/link";
import type { StationWithPrices } from "@/types/fuel";
import PriceBadge from "@/components/shared/PriceBadge";
import BrandLogo from "@/components/shared/BrandLogo";

interface NearbyStationsProps {
  stations: (StationWithPrices & { distance: number })[];
  selectedFuelType: string;
}

export default function NearbyStations({
  stations,
  selectedFuelType,
}: NearbyStationsProps) {
  const nearby = stations.slice(0, 5);

  if (nearby.length === 0) {
    return <p className="text-sm text-[#9aa0a6] italic">No nearby stations found.</p>;
  }

  return (
    <div className="space-y-2">
      {nearby.map((station) => {
        const priceEntry = station.prices.find((p) => p.fuelType === selectedFuelType);
        const price = priceEntry?.price ?? null;

        return (
          <Link
            key={station.id}
            href={`/station/${encodeURIComponent(station.id)}`}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#242424]/50 px-4 py-3 transition-all hover:bg-white/5 hover:border-white/20"
          >
            <BrandLogo brandName={station.brand?.name ?? "Unknown"} size="md" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white truncate">{station.name}</div>
              <div className="text-xs text-[#9aa0a6]">
                {station.brand?.name ?? "Unknown"} &middot; {station.distance.toFixed(1)} km
              </div>
            </div>
            <PriceBadge price={price} size="sm" />
          </Link>
        );
      })}
    </div>
  );
}
