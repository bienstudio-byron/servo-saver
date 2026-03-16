"use client";

import dynamic from "next/dynamic";
import type { StationWithPrices } from "@/types/fuel";

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-[#242424] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />
        <span className="text-sm text-[#9aa0a6]">Loading map...</span>
      </div>
    </div>
  ),
});

interface FuelMapProps {
  stations: StationWithPrices[];
  selectedFuelType: string;
  loading?: boolean;
  onOpenAlerts?: () => void;
}

export default function FuelMap({ stations, selectedFuelType, loading, onOpenAlerts }: FuelMapProps) {
  return (
    <MapInner
      stations={loading ? [] : stations}
      selectedFuelType={selectedFuelType}
      loading={loading}
      onOpenAlerts={onOpenAlerts}
    />
  );
}
