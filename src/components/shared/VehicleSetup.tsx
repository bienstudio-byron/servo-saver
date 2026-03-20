"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Car, Search, Pencil, Check } from "lucide-react";
import { useVehicleStore, type VehicleProfile } from "@/stores/vehicle-store";
import { useFuelStore } from "@/stores/fuel-store";
import { VEHICLE_DATABASE, vehicleDisplayName, type VehicleSpec } from "@/data/vehicles";

const FUEL_TYPES = ["U91", "P95", "P98", "DSL", "E10", "LPG"];

export default function VehicleSetup() {
  const { showSetup, isSetUp, setProfile, setShowSetup } = useVehicleStore();
  const setSelectedFuelType = useFuelStore((s) => s.setSelectedFuelType);

  const [step, setStep] = useState<"search" | "custom">("search");
  const [query, setQuery] = useState("");
  const [customName, setCustomName] = useState("");
  const [customTank, setCustomTank] = useState("55");
  const [customConsumption, setCustomConsumption] = useState("8.5");
  const [customFuel, setCustomFuel] = useState("U91");

  const inputRef = useRef<HTMLInputElement>(null);
  const visible = showSetup || !isSetUp;

  // Focus search on open
  useEffect(() => {
    if (visible && step === "search") {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [visible, step]);

  // Search results — fuzzy match on make + model + variant
  const results = useMemo(() => {
    if (!query.trim()) {
      // Show popular cars when empty
      const popular = ["Toyota Corolla", "Toyota HiLux", "Mazda CX-5", "Toyota RAV4", "Ford Ranger", "Hyundai i30", "Toyota Camry", "Mazda 3"];
      return VEHICLE_DATABASE.filter((v) => popular.some((p) => vehicleDisplayName(v).startsWith(p))).slice(0, 8);
    }
    const q = query.toLowerCase();
    const terms = q.split(/\s+/);
    return VEHICLE_DATABASE
      .filter((v) => {
        const name = vehicleDisplayName(v).toLowerCase();
        return terms.every((t) => name.includes(t));
      })
      .slice(0, 12);
  }, [query]);

  const handleSelect = (v: VehicleSpec) => {
    const profile: VehicleProfile = {
      name: vehicleDisplayName(v),
      tankSize: v.tankSize,
      consumption: v.consumption,
      fuelType: v.fuelType,
    };
    setProfile(profile);
    setSelectedFuelType(v.fuelType);
    try { localStorage.setItem("petrolsaver-fuel-chosen", v.fuelType); } catch {}
    setQuery("");
  };

  const handleCustomSave = () => {
    const profile: VehicleProfile = {
      name: customName || "My car",
      tankSize: parseFloat(customTank) || 55,
      consumption: parseFloat(customConsumption) || 8.5,
      fuelType: customFuel,
    };
    setProfile(profile);
    setSelectedFuelType(customFuel);
    try { localStorage.setItem("petrolsaver-fuel-chosen", customFuel); } catch {}
  };

  const handleClose = () => {
    if (isSetUp) { setShowSetup(false); setQuery(""); setStep("search"); }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[4000] flex items-end md:items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md mx-4 rounded-t-2xl md:rounded-2xl bg-[var(--card)] border border-[var(--subtle-border)] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              {!isSetUp ? "What do you drive?" : "Change vehicle"}
            </h2>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">
              Affects fuel cost calculations across both Fuel and Toll comparisons
            </p>
          </div>
          {isSetUp && (
            <button onClick={handleClose} className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-5">
          {step === "search" ? (
            <>
              {/* Search input */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)] pointer-events-none" strokeWidth={2} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search make or model..."
                  style={{ fontSize: "16px" }}
                  className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl pl-10 pr-9 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer">
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                )}
              </div>

              {!query && (
                <p className="text-[10px] text-[var(--muted)] mb-2">Popular cars</p>
              )}

              {/* Results */}
              <div className="space-y-1">
                {results.map((v, i) => (
                  <button
                    key={`${v.make}-${v.model}-${v.variant || ""}-${i}`}
                    onClick={() => handleSelect(v)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer text-left group"
                  >
                    <div className="h-9 w-9 rounded-lg bg-[var(--subtle)] flex items-center justify-center shrink-0 group-hover:bg-[var(--accent-text)]/10 transition-colors">
                      <Car className="h-4 w-4 text-[var(--muted)] group-hover:text-[var(--accent-text)]" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[var(--foreground)] truncate">{vehicleDisplayName(v)}</div>
                      <div className="text-[10px] text-[var(--muted)]">
                        {v.tankSize}L · {v.consumption}L/100km · {v.fuelType}
                      </div>
                    </div>
                  </button>
                ))}

                {query && results.length === 0 && (
                  <div className="py-6 text-center">
                    <p className="text-[12px] text-[var(--muted)]">No cars found for &quot;{query}&quot;</p>
                  </div>
                )}
              </div>

              {/* spacer so last result isn't hidden behind sticky footer */}
              <div className="h-2" />
            </>
          ) : (
            /* Custom entry */
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <button onClick={() => setStep("search")} className="text-[11px] text-[var(--accent-text)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
                &larr; Back to search
              </button>

              <div>
                <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1.5">Vehicle name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. My Hilux"
                  className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4]"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1.5">Tank size</label>
                  <div className="relative">
                    <input type="number" value={customTank} onChange={(e) => setCustomTank(e.target.value)}
                      className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl px-3 py-2.5 text-sm font-mono text-[var(--foreground)] pr-8 focus:outline-none focus:border-[#4285f4]" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">L</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1.5">Consumption</label>
                  <div className="relative">
                    <input type="number" step="0.1" value={customConsumption} onChange={(e) => setCustomConsumption(e.target.value)}
                      className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl px-3 py-2.5 text-sm font-mono text-[var(--foreground)] pr-14 focus:outline-none focus:border-[#4285f4]" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-[var(--muted)]">L/100km</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1.5">Fuel type</label>
                <div className="flex gap-1">
                  {FUEL_TYPES.map((type) => (
                    <button key={type} onClick={() => setCustomFuel(type)}
                      className={`flex-1 py-2 rounded-lg text-[11px] font-bold font-mono text-center transition-all cursor-pointer ${
                        customFuel === type ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}>
                      {type === "DSL" ? "Diesel" : type}
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleCustomSave}
                className="w-full py-2.5 rounded-xl font-bold text-sm bg-[var(--foreground)] text-[var(--card)] hover:opacity-90 shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" strokeWidth={2.5} />
                Save vehicle
              </motion.button>
            </motion.div>
          )}
        </div>

        {/* Sticky bottom — always visible */}
        {step === "search" && (
          <div className="shrink-0 border-t border-[var(--subtle-border)] px-5 py-3 bg-[var(--card)]">
            <button
              onClick={() => setStep("custom")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer text-left"
            >
              <div className="h-8 w-8 rounded-lg bg-[var(--subtle)] flex items-center justify-center shrink-0">
                <Pencil className="h-3.5 w-3.5 text-[var(--muted)]" strokeWidth={2} />
              </div>
              <div>
                <div className="text-[12px] font-semibold text-[var(--foreground)]">Can&apos;t find your car?</div>
                <div className="text-[10px] text-[var(--muted)]">Enter tank size and consumption manually</div>
              </div>
            </button>
            {!isSetUp && (
              <button
                onClick={() => handleSelect(VEHICLE_DATABASE.find((v) => v.make === "Toyota" && v.model === "Corolla" && !v.variant)!)}
                className="w-full mt-1 py-1.5 text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer text-center"
              >
                Skip — use average car (55L, 8.5L/100km)
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
