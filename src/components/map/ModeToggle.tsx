"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, Droplets, Gauge, ChevronDown, Store, Check } from "lucide-react";
import { useFuelStore } from "@/stores/fuel-store";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import BrandLogo from "@/components/shared/BrandLogo";

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

const FUEL_OPTIONS = ["U91", "P95", "P98", "DSL", "E10", "LPG"];

export default function ModeToggle() {
  const setTripMode = useFuelStore((s) => s.setTripMode);
  const tripDestination = useFuelStore((s) => s.tripDestination);
  const setTripDestination = useFuelStore((s) => s.setTripDestination);
  const selectedFuelType = useFuelStore((s) => s.selectedFuelType);
  const setSelectedFuelType = useFuelStore((s) => s.setSelectedFuelType);
  const rangeKm = useFuelStore((s) => s.rangeKm);
  const setRangeKm = useFuelStore((s) => s.setRangeKm);
  const allStations = useFuelStore((s) => s.allStations);
  const selectedBrands = useFuelStore((s) => s.selectedBrands);
  const setSelectedBrands = useFuelStore((s) => s.setSelectedBrands);

  const [destQuery, setDestQuery] = useState(tripDestination?.name || "");
  const [destResults, setDestResults] = useState<SearchResult[]>([]);
  const [destLoading, setDestLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [showFuelDropdown, setShowFuelDropdown] = useState(false);
  const [showRangeDropdown, setShowRangeDropdown] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const chipsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const anyOpen = showFuelDropdown || showRangeDropdown || showBrandDropdown;
    if (!anyOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (chipsRef.current && !chipsRef.current.contains(e.target as Node)) {
        setShowFuelDropdown(false);
        setShowRangeDropdown(false);
        setShowBrandDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showFuelDropdown, showRangeDropdown, showBrandDropdown]);

  // Get unique brand names sorted alphabetically
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    allStations.forEach((s) => { if (s.brand?.name) brands.add(s.brand.name); });
    return [...brands].sort();
  }, [allStations]);

  const toggleBrand = (brand: string) => {
    if (selectedBrands.includes(brand)) {
      setSelectedBrands(selectedBrands.filter((b) => b !== brand));
    } else {
      setSelectedBrands([...selectedBrands, brand]);
    }
  };
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

  const handleInput = (value: string) => {
    setDestQuery(value);
    clearTimeout(debounceRef.current);
    if (value.length === 0) {
      setTripMode("nearby");
      setTripDestination(null);
      setDestResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => searchDest(value), 300);
  };

  const handleSelectDest = (result: SearchResult) => {
    const name = result.display_name.split(",")[0];
    setTripDestination({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      name,
    });
    setTripMode("trip");
    setDestQuery(name);
    setDestResults([]);
    setFocused(false);
  };

  const handleClear = () => {
    setDestQuery("");
    setTripMode("nearby");
    setTripDestination(null);
    setDestResults([]);
  };

  const fuelShort = selectedFuelType === "DSL" ? "Diesel" : selectedFuelType;
  const rangeLabel = rangeKm <= 50 ? "Empty" : rangeKm <= 200 ? "¼" : rangeKm <= 400 ? "½" : rangeKm <= 600 ? "¾" : "Full";
  const brandLabel = selectedBrands.length === 0 ? "All" : selectedBrands.length === 1 ? selectedBrands[0] : `${selectedBrands.length}`;
  const closeAllDropdowns = () => { setShowFuelDropdown(false); setShowRangeDropdown(false); setShowBrandDropdown(false); };
  const isSearching = focused || destResults.length > 0;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-1.5rem)] md:w-[450px]">
      {/* Search bar */}
      <div className={`relative bg-[var(--card)] rounded-full border shadow-md transition-colors ${focused ? "border-[#4285f4]" : "border-[var(--subtle-border)]"}`}>
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-[var(--muted)] pointer-events-none" strokeWidth={2} />
          <input
            type="text"
            value={destQuery}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="Search destination for trip..."
            style={{ fontSize: "16px" }}
            className="w-full bg-transparent pl-10 pr-9 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none rounded-full"
          />
          {destLoading && (
            <div className="absolute right-3.5 h-4 w-4 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />
          )}
          {destQuery && !destLoading && (
            <button
              onClick={handleClear}
              className="absolute right-2.5 p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </div>

      </div>

      {/* Filter chips — hide when searching */}
      {!isSearching && (
        <div ref={chipsRef}>
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => { const next = !showFuelDropdown; closeAllDropdowns(); setShowFuelDropdown(next); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[var(--card)] border border-[var(--subtle-border)] shadow-xl text-[11px] font-semibold font-mono transition-colors cursor-pointer ${
                showFuelDropdown ? "text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Droplets className="h-3.5 w-3.5" strokeWidth={2} />
              {fuelShort}
              <ChevronDown className={`h-3 w-3 transition-transform ${showFuelDropdown ? "rotate-180" : ""}`} strokeWidth={2} />
            </button>

            <button
              onClick={() => { const next = !showRangeDropdown; closeAllDropdowns(); setShowRangeDropdown(next); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[var(--card)] border border-[var(--subtle-border)] shadow-xl text-[11px] font-semibold font-mono transition-colors cursor-pointer ${
                showRangeDropdown ? "text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Gauge className="h-3.5 w-3.5" strokeWidth={2} />
              {rangeLabel}
              <ChevronDown className={`h-3 w-3 transition-transform ${showRangeDropdown ? "rotate-180" : ""}`} strokeWidth={2} />
            </button>

            <button
              onClick={() => { const next = !showBrandDropdown; closeAllDropdowns(); setShowBrandDropdown(next); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[var(--card)] border border-[var(--subtle-border)] shadow-xl text-[11px] font-semibold font-mono transition-colors cursor-pointer ${
                showBrandDropdown || selectedBrands.length > 0 ? "text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Store className="h-3.5 w-3.5" strokeWidth={2} />
              {brandLabel}
              <ChevronDown className={`h-3 w-3 transition-transform ${showBrandDropdown ? "rotate-180" : ""}`} strokeWidth={2} />
            </button>
          </div>

          {/* Dropdowns — full width below chips */}
          <AnimatePresence>
            {showFuelDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.1 }}
                className="mt-2.5 rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] shadow-2xl overflow-hidden"
              >
                <div className="grid grid-cols-3 gap-0">
                  {FUEL_OPTIONS.map((id) => {
                    const label = id === "DSL" ? "Diesel" : (FUEL_TYPE_LABELS[id] ?? id);
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          setSelectedFuelType(id);
                          try { localStorage.setItem("petrolsaver-fuel-chosen", id); } catch {}
                          setShowFuelDropdown(false);
                        }}
                        className={`px-4 py-2.5 text-sm text-center transition-colors cursor-pointer border-b border-r border-[var(--subtle-border)] last:border-r-0 ${
                          selectedFuelType === id
                            ? "bg-[var(--foreground)] text-[var(--card)] font-semibold"
                            : "text-[var(--foreground)] hover:bg-[var(--subtle-hover)]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {showRangeDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.1 }}
                className="mt-2.5 rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] shadow-2xl overflow-hidden p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Fuel range</span>
                  <span className="text-xs font-bold font-mono text-[var(--foreground)]">~{rangeKm}km</span>
                </div>
                <div className="relative h-6 rounded-full bg-[var(--background)] border border-[var(--subtle-border)] overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (rangeKm / 800) * 100)}%`,
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
                <div className="flex justify-between mt-1 text-[9px] text-[var(--muted)]">
                  <span>E</span>
                  <span>¼</span>
                  <span>½</span>
                  <span>¾</span>
                  <span>F</span>
                </div>
              </motion.div>
            )}

            {showBrandDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.1 }}
                className="mt-2.5 rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] shadow-2xl overflow-hidden max-h-[240px] overflow-y-auto"
              >
                {selectedBrands.length > 0 && (
                  <button
                    onClick={() => setSelectedBrands([])}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-[var(--accent-text)] hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer border-b border-[var(--subtle-border)]"
                  >
                    Clear all
                  </button>
                )}
                {availableBrands.map((brand) => {
                  const isSelected = selectedBrands.includes(brand);
                  return (
                    <button
                      key={brand}
                      onClick={() => toggleBrand(brand)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer flex items-center gap-2.5 ${
                        isSelected
                          ? "bg-[var(--subtle)] text-[var(--foreground)] font-semibold"
                          : "text-[var(--foreground)] hover:bg-[var(--subtle-hover)]"
                      }`}
                    >
                      <BrandLogo brandName={brand} size="sm" />
                      <span className="flex-1">{brand}</span>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-[var(--tier-cheap)]" strokeWidth={2.5} />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Search results dropdown */}
      <AnimatePresence>
        {destResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="mt-1 rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] shadow-2xl overflow-hidden"
          >
            {destResults.map((r, i) => (
              <button
                key={i}
                onClick={() => handleSelectDest(r)}
                className="w-full text-left px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--subtle-hover)] active:bg-[var(--subtle)] transition-colors border-b border-[var(--subtle-border)] last:border-0 truncate cursor-pointer"
              >
                {r.display_name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
