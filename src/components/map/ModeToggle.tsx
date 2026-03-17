"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, Droplets, Gauge, ChevronDown, Store, Check, MapPin, Pencil } from "lucide-react";
import { useFuelStore } from "@/stores/fuel-store";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import BrandLogo from "@/components/shared/BrandLogo";

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

const FUEL_OPTIONS = ["U91", "P95", "P98", "DSL", "E10", "LPG"];

export default function ModeToggle({ themeToggle }: { themeToggle?: React.ReactNode }) {
  const tripMode = useFuelStore((s) => s.tripMode);
  const tripDestination = useFuelStore((s) => s.tripDestination);
  const setTripMode = useFuelStore((s) => s.setTripMode);
  const setTripDestination = useFuelStore((s) => s.setTripDestination);
  const tripOrigin = useFuelStore((s) => s.tripOrigin);
  const setTripOrigin = useFuelStore((s) => s.setTripOrigin);
  const userLocation = useFuelStore((s) => s.userLocation);
  const selectedFuelType = useFuelStore((s) => s.selectedFuelType);
  const setSelectedFuelType = useFuelStore((s) => s.setSelectedFuelType);
  const rangeKm = useFuelStore((s) => s.rangeKm);
  const setRangeKm = useFuelStore((s) => s.setRangeKm);
  const allStations = useFuelStore((s) => s.allStations);
  const selectedBrands = useFuelStore((s) => s.selectedBrands);
  const setSelectedBrands = useFuelStore((s) => s.setSelectedBrands);
  const tripPlannerOpen = useFuelStore((s) => s.tripPlannerOpen);
  const setTripPlannerOpen = useFuelStore((s) => s.setTripPlannerOpen);

  // Destination search
  const [destQuery, setDestQuery] = useState(tripDestination?.name || "");
  const [destResults, setDestResults] = useState<SearchResult[]>([]);
  const [destLoading, setDestLoading] = useState(false);
  const [localDest, setLocalDest] = useState(tripDestination);

  // Origin editing
  const [editingOrigin, setEditingOrigin] = useState(false);
  const [originQuery, setOriginQuery] = useState("");
  const [originResults, setOriginResults] = useState<SearchResult[]>([]);
  const [originLoading, setOriginLoading] = useState(false);
  const [localOrigin, setLocalOrigin] = useState(tripOrigin);

  // GPS suburb name
  const [gpsSuburb, setGpsSuburb] = useState<string | null>(null);

  const destInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const originDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Reverse geocode GPS for "From" display
  useEffect(() => {
    if (!userLocation) return;
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}`,
      { headers: { "User-Agent": "PetrolSaver/1.0" } }
    )
      .then((r) => r.json())
      .then((data) => {
        const name = data.address?.suburb || data.address?.town || data.address?.city || null;
        if (name) setGpsSuburb(name);
      })
      .catch(() => {});
  }, [userLocation?.lat, userLocation?.lng]);

  // Sync local state when store changes (e.g. re-open pre-filled)
  useEffect(() => {
    if (tripPlannerOpen) {
      setLocalDest(tripDestination);
      setDestQuery(tripDestination?.name || "");
      setLocalOrigin(tripOrigin);
      setEditingOrigin(false);
      setOriginQuery("");
      setDestResults([]);
      setOriginResults([]);
      setTimeout(() => destInputRef.current?.focus(), 100);
    }
  }, [tripPlannerOpen]);

  // Close on click outside
  useEffect(() => {
    if (!tripPlannerOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setTripPlannerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [tripPlannerOpen, setTripPlannerOpen]);

  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    allStations.forEach((s) => { if (s.brand?.name) brands.add(s.brand.name); });
    return [...brands].sort();
  }, [allStations]);

  // Destination search
  const searchDest = useCallback((q: string) => {
    if (q.length < 2) { setDestResults([]); return; }
    setDestLoading(true);
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=au&q=${encodeURIComponent(q + ", Australia")}&limit=4`,
      { headers: { "User-Agent": "PetrolSaver/1.0" } }
    )
      .then((r) => r.json())
      .then((data: SearchResult[]) => { setDestResults(data); setDestLoading(false); })
      .catch(() => setDestLoading(false));
  }, []);

  const handleDestInput = (value: string) => {
    setDestQuery(value);
    setLocalDest(null);
    clearTimeout(debounceRef.current);
    if (value.length === 0) { setDestResults([]); return; }
    debounceRef.current = setTimeout(() => searchDest(value), 300);
  };

  const handleSelectDest = (result: SearchResult) => {
    const name = result.display_name.split(",").slice(0, 2).join(",").trim();
    setLocalDest({ lat: parseFloat(result.lat), lng: parseFloat(result.lon), name });
    setDestQuery(name);
    setDestResults([]);
  };

  // Origin search
  const searchOriginFn = useCallback((q: string) => {
    if (q.length < 2) { setOriginResults([]); return; }
    setOriginLoading(true);
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=au&q=${encodeURIComponent(q + ", Australia")}&limit=4`,
      { headers: { "User-Agent": "PetrolSaver/1.0" } }
    )
      .then((r) => r.json())
      .then((data: SearchResult[]) => { setOriginResults(data); setOriginLoading(false); })
      .catch(() => setOriginLoading(false));
  }, []);

  const handleOriginInput = (value: string) => {
    setOriginQuery(value);
    clearTimeout(originDebounceRef.current);
    if (value.length === 0) { setOriginResults([]); return; }
    originDebounceRef.current = setTimeout(() => searchOriginFn(value), 300);
  };

  const handleSelectOrigin = (result: SearchResult) => {
    const name = result.display_name.split(",").slice(0, 2).join(",").trim();
    setLocalOrigin({ lat: parseFloat(result.lat), lng: parseFloat(result.lon), name });
    setOriginQuery(name);
    setOriginResults([]);
    setEditingOrigin(false);
  };

  const toggleBrand = (brand: string) => {
    if (selectedBrands.includes(brand)) {
      setSelectedBrands(selectedBrands.filter((b) => b !== brand));
    } else {
      setSelectedBrands([...selectedBrands, brand]);
    }
  };

  const handleSearchBarClick = () => {
    setTripPlannerOpen(true);
  };

  const handleClearTrip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTripMode("nearby");
    setTripDestination(null);
    setTripOrigin(null);
  };

  const handleGo = () => {
    if (!localDest) return;
    setTripDestination(localDest);
    if (localOrigin) setTripOrigin(localOrigin);
    else setTripOrigin(null);
    setTripMode("trip");
    setTripPlannerOpen(false);
  };

  const isTripActive = tripMode === "trip" && tripDestination;
  const originDisplayName = localOrigin?.name || gpsSuburb || "Your location";

  return (
    <div ref={panelRef} className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-1.5rem)] md:translate-x-0 md:left-3 md:right-3 md:w-auto">
      {/* Search bar */}
      <div className="md:w-[360px]">
      {!tripPlannerOpen ? (
        <button
          onClick={handleSearchBarClick}
          className="relative w-full bg-[var(--card)] rounded-full border shadow-md transition-colors border-[var(--subtle-border)] cursor-pointer text-left"
        >
          <div className="relative flex items-center">
            {isTripActive ? (
              <MapPin className="absolute left-3.5 h-4 w-4 text-[#4285f4] pointer-events-none" strokeWidth={2} />
            ) : (
              <Search className="absolute left-3.5 h-4 w-4 text-[var(--muted)] pointer-events-none" strokeWidth={2} />
            )}
            <div className="w-full pl-10 pr-9 py-2.5 text-sm" style={{ fontSize: "16px" }}>
              {isTripActive ? (
                <span className="text-[var(--foreground)] font-medium">{tripDestination.name}</span>
              ) : (
                <span className="text-[var(--muted)]">Plan a trip...</span>
              )}
            </div>
            {isTripActive && (
              <button
                onClick={handleClearTrip}
                className="absolute right-2.5 p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
          </div>
        </button>
      ) : (
        /* Expanded trip planner — drops down from search bar position */
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ type: "spring", damping: 28, stiffness: 400 }}
          className="rounded-2xl bg-[var(--card)] border border-[var(--subtle-border)] shadow-2xl overflow-hidden"
        >
          {/* Destination input (required) */}
          <div className="px-4 pt-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)] pointer-events-none" strokeWidth={2} />
              <input
                ref={destInputRef}
                type="text"
                value={destQuery}
                onChange={(e) => handleDestInput(e.target.value)}
                placeholder="Where are you going?"
                style={{ fontSize: "16px" }}
                className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl pl-10 pr-9 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors"
              />
              {destLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />
              )}
              {destQuery && !destLoading && (
                <button
                  onClick={() => { setDestQuery(""); setLocalDest(null); setDestResults([]); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              )}
            </div>

            {/* Search results */}
            <AnimatePresence>
              {destResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-1.5 rounded-xl border border-[var(--subtle-border)] bg-[var(--background)] overflow-hidden"
                >
                  {destResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectDest(r)}
                      className="w-full text-left px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--subtle-hover)] transition-colors border-b border-[var(--subtle-border)] last:border-0 truncate cursor-pointer"
                    >
                      {r.display_name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Starting point (optional — defaults to GPS) */}
          <div className="px-4 pb-4">
            {editingOrigin ? (
              <div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-[#4285f4]" />
                  <input
                    type="text"
                    value={originQuery}
                    onChange={(e) => handleOriginInput(e.target.value)}
                    placeholder="Starting from..."
                    autoFocus
                    style={{ fontSize: "16px" }}
                    className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl pl-8 pr-9 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors"
                  />
                  {originLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />
                  )}
                </div>
                <AnimatePresence>
                  {originResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="mt-1.5 rounded-xl border border-[var(--subtle-border)] bg-[var(--background)] overflow-hidden"
                    >
                      {originResults.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => handleSelectOrigin(r)}
                          className="w-full text-left px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--subtle-hover)] transition-colors border-b border-[var(--subtle-border)] last:border-0 truncate cursor-pointer"
                        >
                          {r.display_name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                <button
                  onClick={() => { setEditingOrigin(false); setLocalOrigin(null); setOriginQuery(""); setOriginResults([]); }}
                  className="mt-1.5 text-[10px] text-[var(--accent-text)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                >
                  Use GPS location
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingOrigin(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[var(--muted)] hover:bg-[var(--subtle)] transition-colors cursor-pointer text-left"
              >
                <div className="h-2 w-2 rounded-full bg-[#4285f4] shrink-0" />
                <span className="text-xs flex-1 truncate">From {originDisplayName}</span>
                <Pencil className="h-3 w-3 shrink-0" strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-[var(--subtle-border)]" />

          {/* Fuel gauge (optional) */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Fuel level</span>
              <span className="text-xs font-bold font-mono text-[var(--foreground)]">~{rangeKm}km</span>
            </div>
            <div className="relative h-6 rounded-lg bg-[var(--background)] border border-[var(--subtle-border)] overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-lg"
                animate={{ width: `${Math.min(100, (rangeKm / 800) * 100)}%` }}
                transition={{ type: "spring", damping: 20, stiffness: 200 }}
                style={{
                  background: rangeKm <= 50
                    ? "linear-gradient(90deg, #dc2626, #ef4444)"
                    : rangeKm <= 200
                    ? "linear-gradient(90deg, #ea580c, #f59e0b)"
                    : rangeKm <= 400
                    ? "linear-gradient(90deg, #f59e0b, #84cc16)"
                    : "linear-gradient(90deg, #22c55e, #4ade80)",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] font-bold text-white">
                  {rangeKm <= 50 ? "Almost empty" : rangeKm <= 200 ? "Getting low" : rangeKm <= 400 ? "Half tank" : "Plenty of fuel"}
                </span>
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
          </div>

          {/* Fuel type (optional) */}
          <div className="px-4 pb-4">
            <div className="flex gap-1">
              {FUEL_OPTIONS.map((id) => {
                const short = id === "DSL" ? "Diesel" : id;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setSelectedFuelType(id);
                      try { localStorage.setItem("petrolsaver-fuel-chosen", id); } catch {}
                    }}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer ${
                      selectedFuelType === id
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

          {/* Brand filter (optional) */}
          <div className="px-4 pb-4">
            <PlannerBrandFilter
              availableBrands={availableBrands}
              selectedBrands={selectedBrands}
              setSelectedBrands={setSelectedBrands}
              toggleBrand={toggleBrand}
            />
          </div>

          {/* CTA */}
          <div className="px-4 pb-4">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleGo}
              disabled={!localDest}
              className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                localDest
                  ? "bg-[var(--foreground)] text-[var(--card)] hover:opacity-90 shadow-lg"
                  : "bg-[var(--subtle)] text-[var(--muted)] cursor-not-allowed"
              }`}
            >
              <Search className="h-4 w-4" strokeWidth={2.5} />
              Find cheapest fuel
            </motion.button>
          </div>
        </motion.div>
      )}

      </div>

      {/* Filter chips + theme toggle — below search on mobile, top-right on desktop */}
      {!tripPlannerOpen && !isTripActive && (
        <div className="flex gap-1.5 mt-2 md:absolute md:top-0 md:right-0 md:mt-0">
          <ChipDropdown
            icon={<Droplets className="h-3.5 w-3.5" strokeWidth={2} />}
            label={selectedFuelType === "DSL" ? "Diesel" : selectedFuelType === "PDSL" ? "P.Diesel" : selectedFuelType}
          >
            {(close) => (
              <>
                {FUEL_OPTIONS.concat(["PDSL"]).map((id) => {
                  const label = id === "DSL" ? "Diesel" : id === "PDSL" ? "Premium Diesel" : (FUEL_TYPE_LABELS[id] ?? id);
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setSelectedFuelType(id);
                        try { localStorage.setItem("petrolsaver-fuel-chosen", id); } catch {}
                        close();
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer ${
                        selectedFuelType === id
                          ? "bg-[var(--subtle)] text-[var(--foreground)] font-semibold"
                          : "text-[var(--foreground)] hover:bg-[var(--subtle-hover)]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </>
            )}
          </ChipDropdown>

          <ChipDropdown
            icon={<Gauge className="h-3.5 w-3.5" strokeWidth={2} />}
            label={rangeKm <= 50 ? "Empty" : rangeKm <= 200 ? "¼" : rangeKm <= 400 ? "½" : rangeKm <= 600 ? "¾" : "Full"}
          >
            {() => (
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Fuel range</span>
                  <span className="text-xs font-bold font-mono text-[var(--foreground)]">~{rangeKm}km</span>
                </div>
                <div className="relative h-6 rounded-full bg-[var(--background)] border border-[var(--subtle-border)] overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (rangeKm / 800) * 100)}%`,
                      background: rangeKm <= 50 ? "#dc2626" : rangeKm <= 200 ? "#ea580c" : rangeKm <= 400 ? "#f59e0b" : "#22c55e",
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
                  <span>E</span><span>¼</span><span>½</span><span>¾</span><span>F</span>
                </div>
              </div>
            )}
          </ChipDropdown>

          <BrandChipDropdown
            availableBrands={availableBrands}
            selectedBrands={selectedBrands}
            setSelectedBrands={setSelectedBrands}
            toggleBrand={toggleBrand}
          />
          {themeToggle}
        </div>
      )}
    </div>
  );
}

/* --- Planner brand filter with search --- */

function PlannerBrandFilter({
  availableBrands,
  selectedBrands,
  setSelectedBrands,
  toggleBrand,
}: {
  availableBrands: string[];
  selectedBrands: string[];
  setSelectedBrands: (brands: string[]) => void;
  toggleBrand: (brand: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? availableBrands.filter((b) => b.toLowerCase().includes(query.toLowerCase()))
    : availableBrands;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Brands</span>
        {selectedBrands.length > 0 && (
          <button
            onClick={() => setSelectedBrands([])}
            className="text-[10px] font-semibold text-[var(--accent-text)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          >
            Clear ({selectedBrands.length})
          </button>
        )}
      </div>

      {!expanded ? (
        <button
          onClick={() => { setExpanded(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--subtle)] border border-[var(--subtle-border)] text-left cursor-pointer hover:bg-[var(--subtle-hover)] transition-colors"
        >
          <Search className="h-3.5 w-3.5 text-[var(--muted)] shrink-0" strokeWidth={2} />
          <span className="text-xs text-[var(--muted)] flex-1">
            {selectedBrands.length === 0
              ? "All brands"
              : selectedBrands.length <= 2
              ? selectedBrands.join(", ")
              : `${selectedBrands.length} brands selected`}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-[var(--muted)] shrink-0" strokeWidth={2} />
        </button>
      ) : (
        <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--subtle)] overflow-hidden">
          <div className="relative px-2.5 pt-2.5 pb-1.5">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)] pointer-events-none" strokeWidth={2} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brands..."
              style={{ fontSize: "16px" }}
              className="w-full bg-[var(--background)] border border-[var(--subtle-border)] rounded-lg pl-8 pr-8 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors"
            />
            <button
              onClick={() => { setExpanded(false); setQuery(""); }}
              className="absolute right-5 top-1/2 -translate-y-1/2 p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
          <div className="max-h-[160px] overflow-y-auto">
            {filtered.map((brand) => {
              const isSelected = selectedBrands.includes(brand);
              return (
                <button
                  key={brand}
                  onClick={() => toggleBrand(brand)}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? "bg-[var(--background)] text-[var(--foreground)] font-semibold"
                      : "text-[var(--foreground)] hover:bg-[var(--subtle-hover)]"
                  }`}
                >
                  <BrandLogo brandName={brand} size="sm" />
                  <span className="flex-1 truncate">{brand}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-[var(--tier-cheap)] shrink-0" strokeWidth={2.5} />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-[var(--muted)] text-center">No brands found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* --- Brand chip filter with search --- */

function BrandChipDropdown({
  availableBrands,
  selectedBrands,
  setSelectedBrands,
  toggleBrand,
}: {
  availableBrands: string[];
  selectedBrands: string[];
  setSelectedBrands: (brands: string[]) => void;
  toggleBrand: (brand: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = query
    ? availableBrands.filter((b) => b.toLowerCase().includes(query.toLowerCase()))
    : availableBrands;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[var(--card)] border border-[var(--subtle-border)] shadow-xl text-[11px] font-semibold font-mono transition-colors cursor-pointer ${
          open || selectedBrands.length > 0 ? "text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
      >
        <Store className="h-3.5 w-3.5" strokeWidth={2} />
        {selectedBrands.length === 0 ? "All" : selectedBrands.length === 1 ? selectedBrands[0] : `${selectedBrands.length}`}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full left-0 mt-2 min-w-[220px] rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] shadow-2xl overflow-hidden z-10"
          >
            <div className="px-2.5 pt-2.5 pb-1.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)] pointer-events-none" strokeWidth={2} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search brands..."
                  style={{ fontSize: "16px" }}
                  className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors"
                />
              </div>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {selectedBrands.length > 0 && !query && (
                <button
                  onClick={() => setSelectedBrands([])}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-[var(--accent-text)] hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer border-b border-[var(--subtle-border)]"
                >
                  Clear all
                </button>
              )}
              {filtered.map((brand) => {
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
                    {isSelected && <Check className="h-3.5 w-3.5 text-[var(--tier-cheap)]" strokeWidth={2.5} />}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-4 py-3 text-xs text-[var(--muted)] text-center">No brands found</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --- Chip Dropdown helper --- */

function ChipDropdown({
  icon,
  label,
  active,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[var(--card)] border border-[var(--subtle-border)] shadow-xl text-[11px] font-semibold font-mono transition-colors cursor-pointer ${
          open || active ? "text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
      >
        {icon}
        {label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full left-0 mt-2 min-w-[200px] rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] shadow-2xl overflow-hidden z-10"
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
