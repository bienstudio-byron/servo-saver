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
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-6rem)] md:w-auto">
      {/* Toggle + input container */}
      <div className="bg-[#1a1a1a]/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
        {/* Tabs */}
        <div className="flex">
          <button
            onClick={() => { setTripMode("nearby"); setTripDestination(null); setDestQuery(""); setDestResults([]); }}
            className={`flex-1 md:px-6 px-4 py-2 text-xs font-bold transition-all cursor-pointer rounded-tl-2xl ${
              tripMode === "nearby"
                ? "bg-white/10 text-white"
                : "text-[#5f6368] hover:text-[#9aa0a6]"
            }`}
          >
            Nearby
          </button>
          <button
            onClick={() => { setTripMode("trip"); setDestQuery(""); }}
            className={`flex-1 md:px-6 px-4 py-2 text-xs font-bold transition-all cursor-pointer rounded-tr-2xl ${
              tripMode === "trip"
                ? "bg-white/10 text-white"
                : "text-[#5f6368] hover:text-[#9aa0a6]"
            }`}
          >
            Trip
          </button>
        </div>

        {/* Search input — only in trip mode */}
        <AnimatePresence>
          {tripMode === "trip" && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="px-2 pb-2 pt-1">
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9aa0a6] z-10 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={destQuery}
                    onChange={(e) => handleDestInput(e.target.value)}
                    placeholder="Where are you going?"
                    style={{ fontSize: "16px" }}
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-8 pr-3 py-2 text-sm text-white placeholder:text-[#5f6368] focus:border-[#4285f4] focus:outline-none focus:ring-1 focus:ring-[#4285f4]/30 transition-all"
                  />
                  {destLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results dropdown — outside the container so it's not clipped */}
      {destResults.length > 0 && (
        <div className="mt-1 rounded-xl border border-white/10 bg-[#242424] shadow-2xl overflow-hidden z-[2000] relative">
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
    </div>
  );
}
