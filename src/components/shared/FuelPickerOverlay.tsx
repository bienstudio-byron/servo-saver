"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { FUEL_TYPE_LABELS } from "@/lib/constants";

interface FuelPickerOverlayProps {
  onComplete: (result: {
    fuelType: string;
    mode: "nearby" | "trip";
    rangeKm: number;
    destination?: { lat: number; lng: number; name: string };
  }) => void;
  initialStep?: 1 | 2 | 3;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

const RANGE_OPTIONS = [
  { km: 10, label: "Under 10km", icon: "🔴", desc: "Fuel light on" },
  { km: 30, label: "~30km", icon: "🟡", desc: "Getting low" },
  { km: 75, label: "~75km", icon: "🟢", desc: "Some left" },
  { km: 150, label: "100km+", icon: "🔵", desc: "Plenty" },
];

const MAIN_FUELS = ["U91", "P95", "P98", "DSL", "E10", "LPG"];

export default function FuelPickerOverlay({ onComplete }: FuelPickerOverlayProps) {
  const [rangeKm, setRangeKm] = useState(200);
  const [selectedFuel, setSelectedFuel] = useState(
    typeof window !== "undefined" ? localStorage.getItem("petrolsaver-fuel-chosen") || "U91" : "U91"
  );
  const [showTrip, setShowTrip] = useState(false);
  const [destQuery, setDestQuery] = useState("");
  const [destResults, setDestResults] = useState<SearchResult[]>([]);
  const [destLoading, setDestLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleFindNearby = () => {
    // Request location silently
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 1 });
    }
    onComplete({ fuelType: selectedFuel, mode: "nearby", rangeKm });
  };

  const searchDest = useCallback((q: string) => {
    if (q.length < 2) { setDestResults([]); return; }
    setDestLoading(true);
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=au&q=${encodeURIComponent(q + ", Victoria")}&limit=4`,
      { headers: { "User-Agent": "PetrolSaver/1.0" } }
    )
      .then((r) => r.json())
      .then((data: SearchResult[]) => { setDestResults(data); setDestLoading(false); })
      .catch(() => setDestLoading(false));
  }, []);

  const handleDestInput = (value: string) => {
    setDestQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchDest(value), 300);
  };

  const handleTripSelect = (result: SearchResult) => {
    onComplete({
      fuelType: selectedFuel,
      mode: "trip",
      rangeKm,
      destination: {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        name: result.display_name.split(",")[0],
      },
    });
  };

  const fuelLabel = FUEL_TYPE_LABELS[selectedFuel] ?? selectedFuel;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/70 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300, delay: 0.1 }}
        className="w-full max-w-sm mx-4 rounded-2xl bg-[#242424] border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 pt-6 pb-3 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15, stiffness: 400, delay: 0.2 }}
            className="text-3xl mb-2"
          >
            ⛽
          </motion.div>
          <h2 className="text-lg font-bold text-white">Find cheap fuel</h2>
        </div>

        {/* Fuel gauge */}
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wider">How much fuel have you got?</span>
            <span className="text-sm font-bold font-mono text-white">
              ~{rangeKm}km
            </span>
          </div>

          {/* Gauge track */}
          <div className="relative mb-2">
            <div className="h-8 rounded-lg bg-[#1a1a1a] border border-white/10 overflow-hidden relative">
              {/* Fill level */}
              <motion.div
                className="absolute inset-y-0 left-0 rounded-lg"
                animate={{ width: `${Math.min(100, (rangeKm / 800) * 100)}%` }}
                transition={{ type: "spring", damping: 20, stiffness: 200 }}
                style={{
                  background: rangeKm <= 50
                    ? "linear-gradient(90deg, #ef4444, #f87171)"
                    : rangeKm <= 200
                    ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                    : "linear-gradient(90deg, #4285f4, #8ab4f8)",
                }}
              />
              {/* Gauge label inside */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white/80">
                  {rangeKm <= 50 ? "⚠ Almost empty" : rangeKm <= 200 ? "Getting low" : rangeKm <= 400 ? "Half tank" : "Plenty of fuel"}
                </span>
              </div>
            </div>

            {/* Slider input overlaid on gauge */}
            <input
              type="range"
              min={10}
              max={800}
              step={10}
              value={rangeKm}
              onChange={(e) => setRangeKm(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Scale labels */}
          <div className="flex justify-between px-1 text-[9px] text-[#5f6368]">
            <span>E</span>
            <span>¼</span>
            <span>½</span>
            <span>¾</span>
            <span>F</span>
          </div>
        </div>

        {/* Fuel type — compact inline selector */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wider">Fuel type</span>
            <span className="text-[11px] text-[#5f6368]">{fuelLabel}</span>
          </div>
          <div className="flex gap-1.5">
            {MAIN_FUELS.map((id) => {
              const short = id === "DSL" ? "Diesel" : id;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedFuel(id)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold text-center transition-all ${
                    selectedFuel === id
                      ? "bg-[#4285f4] text-white"
                      : "bg-white/[0.04] text-[#5f6368] hover:text-[#9aa0a6]"
                  }`}
                >
                  {short}
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary CTA */}
        <div className="px-5 pb-2">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleFindNearby}
            className="w-full py-3.5 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Find cheapest nearby
          </motion.button>
          <p className="text-[9px] text-[#5f6368] text-center mt-2 flex items-center justify-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            We&apos;ll ask for your location to find stations near you. Never stored or shared.
          </p>
        </div>

        {/* Divider */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] text-[#5f6368] uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
        </div>

        {/* Secondary: Trip planner */}
        <div className="px-5 pb-5">
          {!showTrip ? (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowTrip(true)}
              className="w-full py-3.5 rounded-xl border border-white/10 text-[#5f6368] font-bold text-sm hover:border-[#9aa0a6] hover:text-[#9aa0a6] hover:bg-white/5 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Plan a trip
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden"
            >
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9aa0a6] z-10 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={destQuery}
                  onChange={(e) => handleDestInput(e.target.value)}
                  placeholder="Where are you headed?"
                  autoFocus
                  style={{ fontSize: "16px" }}
                  className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] pl-10 pr-3 py-2.5 text-white placeholder:text-[#5f6368] focus:border-[#4285f4] focus:outline-none focus:ring-1 focus:ring-[#4285f4]/30 transition-all"
                />
                {destLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />
                )}
              </div>

              {destResults.length > 0 && (
                <div className="mt-1.5 rounded-xl border border-white/10 bg-[#1a1a1a] overflow-hidden">
                  {destResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => handleTripSelect(r)}
                      className="w-full text-left px-3 py-2.5 text-sm text-[#dadce0] hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/5 last:border-0 truncate"
                    >
                      {r.display_name}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
