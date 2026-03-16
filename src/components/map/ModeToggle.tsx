"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFuelStore } from "@/stores/fuel-store";

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function ModeToggle() {
  const tripMode = useFuelStore((s) => s.tripMode);
  const setTripMode = useFuelStore((s) => s.setTripMode);
  const tripDestination = useFuelStore((s) => s.tripDestination);
  const setTripDestination = useFuelStore((s) => s.setTripDestination);
  const rangeKm = useFuelStore((s) => s.rangeKm);
  const setRangeKm = useFuelStore((s) => s.setRangeKm);

  const [destQuery, setDestQuery] = useState(tripDestination?.name || "");
  const [destResults, setDestResults] = useState<SearchResult[]>([]);
  const [destLoading, setDestLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  const handleSelectDest = (result: SearchResult) => {
    const name = result.display_name.split(",")[0];
    setTripDestination({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      name,
    });
    setDestQuery(name);
    setDestResults([]);
  };

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-2 w-[calc(100%-6rem)] md:w-auto max-w-sm">
      {/* Pill toggle + settings */}
      <div className="flex items-center gap-2">
      <div className="relative flex bg-[#242424] rounded-full p-1 border border-white/10 shadow-xl">
        {/* Sliding background */}
        <motion.div
          className="absolute top-1 bottom-1 rounded-full bg-white"
          initial={false}
          animate={{
            left: tripMode === "nearby" ? "4px" : "50%",
            width: "calc(50% - 4px)",
          }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        />

        <button
          onClick={() => { setTripMode("nearby"); setTripDestination(null); setDestQuery(""); setDestResults([]); }}
          className={`relative z-10 px-5 md:px-8 py-1.5 text-xs font-bold rounded-full transition-colors cursor-pointer ${
            tripMode === "nearby" ? "text-[#1a1a1a]" : "text-[#5f6368]"
          }`}
        >
          Nearby
        </button>
        <button
          onClick={() => { setTripMode("trip"); setDestQuery(""); }}
          className={`relative z-10 px-5 md:px-8 py-1.5 text-xs font-bold rounded-full transition-colors cursor-pointer ${
            tripMode === "trip" ? "text-[#1a1a1a]" : "text-[#5f6368]"
          }`}
        >
          Trip
        </button>
      </div>

      </div>

      {/* Trip destination search */}
      <AnimatePresence>
        {tripMode === "trip" && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-xs"
          >
            <div className="bg-[#1a1a1a]/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl">
              {/* Destination search */}
              <div className="px-2 pt-2 pb-1.5 relative">
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9aa0a6] z-10 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={destQuery}
                    onChange={(e) => handleDestInput(e.target.value)}
                    placeholder="Where are you going?"
                    autoFocus
                    style={{ fontSize: "16px" }}
                    className="w-full rounded-lg border border-white/10 bg-white/5 pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-[#5f6368] focus:border-[#4285f4] focus:outline-none focus:ring-1 focus:ring-[#4285f4]/30 transition-all"
                  />
                  {destLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />
                  )}
                </div>
              </div>

              {/* Compact fuel gauge */}
              <div className="px-2 pb-2 flex items-center gap-2">
                <span className="text-[9px] text-[#5f6368] shrink-0">⛽</span>
                <div className="flex-1 h-2 rounded-full bg-[#1a1a1a] border border-white/10 overflow-hidden relative">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    animate={{ width: `${Math.min(100, (rangeKm / 800) * 100)}%` }}
                    transition={{ type: "spring", damping: 20, stiffness: 200 }}
                    style={{
                      background: rangeKm <= 50 ? "#ef4444" : rangeKm <= 200 ? "#f59e0b" : "#4285f4",
                    }}
                  />
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
                <span className="text-[9px] text-[#5f6368] font-mono shrink-0 w-8 text-right">~{rangeKm}km</span>
              </div>
            </div>

            {/* Results dropdown */}
            {destResults.length > 0 && (
              <div className="mt-1 rounded-xl border border-white/10 bg-[#242424] shadow-2xl overflow-hidden">
                {destResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectDest(r)}
                    className="w-full text-left px-3 py-2.5 text-sm text-[#dadce0] hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/5 last:border-0 truncate cursor-pointer"
                  >
                    {r.display_name}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
