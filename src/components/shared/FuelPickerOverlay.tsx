"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Fuel, MapPin, Check } from "lucide-react";
import { FUEL_TYPE_LABELS } from "@/lib/constants";

interface FuelPickerOverlayProps {
  onComplete: (result: { fuelType: string; rangeKm: number }) => void;
}

const MAIN_FUELS = ["U91", "P95", "P98", "DSL", "E10", "LPG"];

export default function FuelPickerOverlay({ onComplete }: FuelPickerOverlayProps) {
  const [selectedFuel, setSelectedFuel] = useState(
    typeof window !== "undefined" ? localStorage.getItem("petrolsaver-fuel-chosen") || "U91" : "U91"
  );
  const [locationStatus, setLocationStatus] = useState<"unknown" | "granted" | "denied">("unknown");

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setLocationStatus("granted"),
      () => setLocationStatus("denied"),
      { timeout: 10000 }
    );
  }, []);

  const fuelLabel = FUEL_TYPE_LABELS[selectedFuel] ?? selectedFuel;

  const handleGo = () => {
    onComplete({ fuelType: selectedFuel, rangeKm: 200 });
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
        className="w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--card)] border border-[var(--subtle-border)] shadow-2xl"
      >
        {/* Header */}
        <div className="px-5 pt-6 pb-3 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15, stiffness: 400, delay: 0.2 }}
            className="mb-2 flex justify-center"
          >
            <div className="h-12 w-12 rounded-full bg-[var(--subtle)] flex items-center justify-center">
              <Fuel className="h-6 w-6 text-[var(--foreground)]" strokeWidth={1.5} />
            </div>
          </motion.div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Find cheap fuel</h2>
        </div>

        {/* Fuel type */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Fuel type</span>
            <span className="text-[11px] text-[var(--muted)]">{fuelLabel}</span>
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
                      ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                      : "bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {short}
                </button>
              );
            })}
          </div>
        </div>

        {/* Location */}
        <div className="px-5 pb-3">
          <button
            onClick={requestLocation}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all cursor-pointer ${
              locationStatus === "granted"
                ? "border-emerald-500/30 bg-emerald-500/5"
                : locationStatus === "denied"
                ? "border-red-500/30 bg-red-500/5"
                : "border-[var(--subtle-border)] bg-[var(--subtle)] hover:bg-[var(--subtle-hover)]"
            }`}
          >
            <div className="flex items-center gap-2">
              <MapPin className={`h-4 w-4 ${locationStatus === "granted" ? "text-emerald-400" : locationStatus === "denied" ? "text-red-400" : "text-[var(--muted)]"}`} strokeWidth={2} />
              <span className="text-xs font-semibold text-[var(--foreground)]">
                {locationStatus === "granted" ? "Location enabled" : locationStatus === "denied" ? "Location denied" : "Enable location"}
              </span>
            </div>
            {locationStatus === "granted" ? (
              <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} />
            ) : (
              <span className="text-[10px] text-[var(--muted)]">Tap to enable</span>
            )}
          </button>
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
          <p className="text-[9px] text-[var(--muted)] text-center mt-2">
            Location is never stored or shared.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
