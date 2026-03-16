"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FUEL_TYPE_LABELS } from "@/lib/constants";

interface FuelPickerOverlayProps {
  onComplete: (result: {
    fuelType: string;
    mode: "nearby" | "trip";
    destination?: { lat: number; lng: number; name: string };
  }) => void;
  initialStep?: 1 | 2 | 3;
}

const MAIN_FUELS = [
  { id: "U91", label: "Unleaded 91", desc: "Most common", icon: "⛽" },
  { id: "P95", label: "Premium 95", desc: "Mid-grade", icon: "⛽" },
  { id: "P98", label: "Premium 98", desc: "High-performance", icon: "🏎" },
  { id: "DSL", label: "Diesel", desc: "Trucks & SUVs", icon: "🛻" },
  { id: "E10", label: "Ethanol E10", desc: "Budget option", icon: "🌿" },
  { id: "LPG", label: "LPG", desc: "Gas vehicles", icon: "💨" },
];

const OTHER_FUELS = Object.entries(FUEL_TYPE_LABELS).filter(
  ([id]) => !MAIN_FUELS.some((m) => m.id === id)
);

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function FuelPickerOverlay({ onComplete, initialStep = 1 }: FuelPickerOverlayProps) {
  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [locationStatus, setLocationStatus] = useState<"waiting" | "granted" | "denied">(
    initialStep >= 2 ? "granted" : "waiting"
  );
  // For returning users starting at step 3, read fuel type from localStorage
  const [selectedFuel, setSelectedFuel] = useState<string | null>(
    initialStep === 3 ? (typeof window !== "undefined" ? localStorage.getItem("petrolsaver-fuel-chosen") : null) : null
  );
  const [destQuery, setDestQuery] = useState("");
  const [destResults, setDestResults] = useState<SearchResult[]>([]);
  const [destLoading, setDestLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Step 1: Request location
  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("denied");
      setStep(2);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationStatus("granted");
        setStep(2);
      },
      () => {
        setLocationStatus("denied");
        setStep(2);
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  // Step 2: Select fuel type
  const handleFuelSelect = (id: string) => {
    setSelectedFuel(id);
    setStep(3);
  };

  // Step 3: Choose mode
  const handleNearby = () => {
    if (!selectedFuel) return;
    onComplete({ fuelType: selectedFuel, mode: "nearby" });
  };

  const handleTripSelect = (result: SearchResult) => {
    if (!selectedFuel) return;
    onComplete({
      fuelType: selectedFuel,
      mode: "trip",
      destination: {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        name: result.display_name.split(",")[0],
      },
    });
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

  const slideVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/70 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300, delay: 0.1 }}
        className="w-full max-w-md mx-4 rounded-2xl bg-[#242424] border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Progress bar */}
        <div className="flex gap-1 px-6 pt-5 pb-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                s <= step ? "bg-[#4285f4]" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Location */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="px-6 pt-4 pb-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15, stiffness: 400, delay: 0.2 }}
                className="h-14 w-14 mx-auto mb-4 rounded-2xl bg-[#4285f4]/15 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-[#4285f4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </motion.div>
              <h2 className="text-xl font-bold text-white text-center mb-1">Where are you?</h2>
              <p className="text-sm text-[#9aa0a6] text-center mb-5">
                We need your location to find the best fuel deals
              </p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={requestLocation}
                className="w-full py-3 rounded-xl bg-[#4285f4] text-white font-bold text-sm hover:bg-[#5a9bf6] transition-colors shadow-lg shadow-[#4285f4]/20 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="3" />
                  <path strokeLinecap="round" d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
                </svg>
                Use my location
              </motion.button>

              <button
                onClick={() => { setLocationStatus("denied"); setStep(2); }}
                className="w-full mt-2 py-2 text-xs text-[#9aa0a6] hover:text-white transition-colors"
              >
                Skip — I&apos;ll browse the map
              </button>
            </motion.div>
          )}

          {/* Step 2: Fuel type */}
          {step === 2 && (
            <motion.div
              key="step2"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="px-6 pt-4 pb-6"
            >
              <h2 className="text-xl font-bold text-white text-center mb-1">What fuel do you use?</h2>
              <p className="text-sm text-[#9aa0a6] text-center mb-4">
                We&apos;ll show you the best prices
              </p>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {MAIN_FUELS.map((fuel, i) => (
                  <motion.button
                    key={fuel.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.04 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleFuelSelect(fuel.id)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-left bg-white/[0.04] hover:bg-[#4285f4]/15 hover:ring-1 hover:ring-[#4285f4]/30 transition-all group"
                  >
                    <span className="text-lg">{fuel.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-[#8ab4f8] transition-colors">{fuel.label}</div>
                      <div className="text-[10px] text-[#9aa0a6]">{fuel.desc}</div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {OTHER_FUELS.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {OTHER_FUELS.map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => handleFuelSelect(id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] text-[#9aa0a6] hover:bg-white/10 hover:text-white transition-all"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3: Mode selection */}
          {step === 3 && (
            <motion.div
              key="step3"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="px-6 pt-4 pb-6"
            >
              <h2 className="text-xl font-bold text-white text-center mb-1">How can we help?</h2>
              <p className="text-sm text-[#9aa0a6] text-center mb-5">
                Find the smartest place to fill up
              </p>

              {/* Option 1: Find nearby */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNearby}
                className="w-full flex items-center gap-4 rounded-xl px-4 py-4 mb-3 text-left bg-emerald-500/5 border border-emerald-500/15 hover:bg-emerald-500/10 transition-all group"
              >
                <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">Find me a deal nearby</div>
                  <div className="text-[11px] text-[#9aa0a6]">Cheapest fuel close to your current location</div>
                </div>
              </motion.button>

              {/* Option 2: Trip planner */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-xl px-4 py-4 bg-[#4285f4]/5 border border-[#4285f4]/15"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-[#4285f4]/15 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#4285f4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">I&apos;m going somewhere</div>
                    <div className="text-[11px] text-[#9aa0a6]">Find the cheapest stop on your route</div>
                  </div>
                </div>

                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9aa0a6] z-10 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={destQuery}
                    onChange={(e) => handleDestInput(e.target.value)}
                    placeholder="Where are you headed?"
                    style={{ fontSize: "16px" }}
                    className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] pl-10 pr-3 py-2.5 text-white placeholder:text-[#5f6368] focus:border-[#4285f4] focus:outline-none focus:ring-1 focus:ring-[#4285f4]/30 transition-all"
                  />
                  {destLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />
                  )}
                </div>

                {destResults.length > 0 && (
                  <div className="mt-2 rounded-xl border border-white/10 bg-[#1a1a1a] overflow-hidden">
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="px-6 py-2.5 border-t border-white/5 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => (s > 1 ? (s - 1) as 1 | 2 | 3 : s))}
              className="text-xs text-[#9aa0a6] hover:text-white transition-colors"
            >
              &larr; Back
            </button>
          ) : <span />}
          <span className="text-[11px] text-[#5f6368]">Step {step} of 3</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
