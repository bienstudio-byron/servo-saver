"use client";

import dynamic from "next/dynamic";
import TollSidebar from "./TollSidebar";
import TollMobileSheet from "./TollMobileSheet";

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
    <div className="h-full w-full md:flex">
      {/* Desktop sidebar — results only */}
      <div className="hidden md:flex md:w-[24rem] md:shrink-0 md:h-full">
        <TollSidebar />
      </div>
      {/* Map + planner overlay */}
      <div className="relative flex-1 h-full">
        <TollMapView />
        {/* Mobile: bottom sheet */}
        <div className="md:hidden">
          <TollMobileSheet />
        </div>
      </div>
    </div>
  );
}
