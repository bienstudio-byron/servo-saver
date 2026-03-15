"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useFuelStore } from "@/stores/fuel-store";
import BrandLogo from "@/components/shared/BrandLogo";

export default function HeaderSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const allStations = useFuelStore((s) => s.allStations);
  const setFlyToTarget = useFuelStore((s) => s.setFlyToTarget);
  const setSelectedStation = useFuelStore((s) => s.setSelectedStation);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const results = useMemo(() => {
    if (query.length < 2 || allStations.length === 0) return [];
    const q = query.toLowerCase();
    return allStations
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          (s.brand?.name ?? "").toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [query, allStations]);

  function handleInput(value: string) {
    setQuery(value);
    setOpen(value.length >= 2);
  }

  function handleSelect(station: (typeof allStations)[0]) {
    setSelectedStation(station);
    setFlyToTarget({ lat: station.latitude, lng: station.longitude, zoom: 15 });
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9aa0a6] z-10 pointer-events-none"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => query.length >= 2 && setOpen(true)}
        placeholder="Search station or suburb..."
        autoComplete="off"
        style={{ fontSize: "16px" }}
        className="w-full rounded-xl border border-white/10 bg-white/[0.06] pl-10 pr-3 py-1.5 text-white placeholder:text-[#5f6368] hover:border-white/20 focus:border-[#4285f4] focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-[#4285f4]/30 transition-all"
      />

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-white/10 bg-[#242424] shadow-2xl overflow-hidden z-[2000]">
          {results.map((station) => (
            <button
              key={station.id}
              onClick={() => handleSelect(station)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/5 last:border-0"
            >
              <BrandLogo brandName={station.brand?.name ?? "?"} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white truncate">{station.name}</div>
                <div className="text-[11px] text-[#9aa0a6] truncate">{station.address}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-white/10 bg-[#242424] shadow-2xl overflow-hidden z-[2000] px-3 py-3 text-xs text-[#9aa0a6] text-center">
          No stations found
        </div>
      )}
    </div>
  );
}
