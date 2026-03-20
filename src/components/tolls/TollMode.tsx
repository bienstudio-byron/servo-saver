"use client";

import dynamic from "next/dynamic";
import TollResults from "./TollResults";

const TollMapView = dynamic(() => import("./TollMapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-[var(--background)] flex items-center justify-center">
      <div className="text-[var(--muted)] text-sm">Loading map...</div>
    </div>
  ),
});

export default function TollMode() {
  return (
    <div className="h-full w-full relative">
      <TollMapView />
      {/* Results — floating card, appears when comparison exists */}
      <TollResults />
    </div>
  );
}
