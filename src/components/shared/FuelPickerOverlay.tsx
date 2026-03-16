"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FUEL_TYPE_LABELS } from "@/lib/constants";

interface FuelPickerOverlayProps {
  onComplete: (result: { fuelType: string; rangeKm: number }) => void;
}

const MAIN_FUELS = ["U91", "P95", "P98", "DSL", "E10", "LPG"];

export default function FuelPickerOverlay({ onComplete }: FuelPickerOverlayProps) {
  const [rangeKm, setRangeKm] = useState(200);
  const [selectedFuel, setSelectedFuel] = useState(
    typeof window !== "undefined" ? localStorage.getItem("petrolsaver-fuel-chosen") || "U91" : "U91"
  );

  const fuelLabel = FUEL_TYPE_LABELS[selectedFuel] ?? selectedFuel;

  const handleGo = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 1 });
    }
    onComplete({ fuelType: selectedFuel, rangeKm });
  };

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
        className="w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-[#242424] border border-white/10 shadow-2xl"
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

          <div className="relative mb-2">
            <div className="h-8 rounded-lg bg-[#1a1a1a] border border-white/10 overflow-hidden relative">
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
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white/80">
                  {rangeKm <= 50 ? "⚠ Almost empty" : rangeKm <= 200 ? "Getting low" : rangeKm <= 400 ? "Half tank" : "Plenty of fuel"}
                </span>
              </div>
            </div>
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

          <div className="flex justify-between px-1 text-[9px] text-[#5f6368]">
            <span>E</span>
            <span>¼</span>
            <span>½</span>
            <span>¾</span>
            <span>F</span>
          </div>
        </div>

        {/* Fuel type */}
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
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold text-center transition-all cursor-pointer ${
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

        {/* CTA */}
        <div className="px-5 pb-3">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGo}
            className="w-full py-3.5 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            Let&apos;s go
          </motion.button>
          <p className="text-[9px] text-[#5f6368] text-center mt-2 flex items-center justify-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            We&apos;ll ask for your location to find stations near you. Never stored or shared.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
