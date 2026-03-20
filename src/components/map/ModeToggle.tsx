"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, Droplets, Gauge, ChevronDown, Store, Check, MapPin, Pencil, Clock, Car, LocateFixed } from "lucide-react";
import { useFuelStore } from "@/stores/fuel-store";
import { useVehicleStore } from "@/stores/vehicle-store";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import BrandLogo from "@/components/shared/BrandLogo";

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

const FUEL_OPTIONS = ["U91", "P95", "P98", "DSL", "E10", "LPG"];

export default function ModeToggle({ themeToggle }: { themeToggle?: React.ReactNode }) {
  const appMode = useFuelStore((s) => s.mode);
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
    fetch(`/api/geocode?mode=reverse&lat=${userLocation.lat}&lng=${userLocation.lng}`)
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
    fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
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
    fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
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
      {/* Search bar — fuel mode only (tolls has its own search in TollSidebar) */}
      {appMode !== "tolls" && <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", damping: 20 }}
        className="md:w-[460px]"
      >
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
                <span className="text-[var(--muted)] font-medium">Plan a trip...</span>
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
            <div className="relative h-5 rounded-lg bg-[var(--background)] border border-[var(--subtle-border)] overflow-hidden">
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
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold font-mono text-center transition-all cursor-pointer ${
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

      </motion.div>}

      <div className="h-1 md:h-1.5" />

      {/* Filter chips — shared across both modes */}
      {(appMode === "tolls" || (!tripPlannerOpen && !isTripActive)) && (
        <MobileFilterChips
          selectedFuelType={selectedFuelType}
          setSelectedFuelType={(id) => { setSelectedFuelType(id); try { localStorage.setItem("petrolsaver-fuel-chosen", id); } catch {} }}
          rangeKm={rangeKm}
          setRangeKm={setRangeKm}
          availableBrands={availableBrands}
          selectedBrands={selectedBrands}
          setSelectedBrands={setSelectedBrands}
          toggleBrand={toggleBrand}
        />
      )}

      {/* Theme toggle + locate — desktop only, top-right */}
      <div className="hidden md:flex gap-1.5 absolute top-0 right-0">
        {themeToggle}
      </div>
    </div>
  );
}

/* --- Mobile filter chips with inline dropdowns --- */

function MobileFilterChips({
  selectedFuelType, setSelectedFuelType,
  rangeKm, setRangeKm,
  availableBrands, selectedBrands, setSelectedBrands, toggleBrand,
}: {
  selectedFuelType: string; setSelectedFuelType: (id: string) => void;
  rangeKm: number; setRangeKm: (km: number) => void;
  availableBrands: string[]; selectedBrands: string[]; setSelectedBrands: (b: string[]) => void; toggleBrand: (b: string) => void;
}) {
  const [open, setOpen] = useState<"fuel" | "tank" | "brands" | "time" | "more" | "location" | null>(null);
  const timeValuePerHour = useFuelStore((s) => s.timeValuePerHour);
  const setTimeValuePerHour = useFuelStore((s) => s.setTimeValuePerHour);
  const vehicleProfile = useVehicleStore((s) => s.profile);
  const setShowVehicleSetup = useVehicleStore((s) => s.setShowSetup);
  const costModel = useVehicleStore((s) => s.costModel);
  const setCostModel = useVehicleStore((s) => s.setCostModel);
  const locationName = useFuelStore((s) => s.locationName);
  const locationSource = useFuelStore((s) => s.locationSource);
  const setManualLocation = useFuelStore((s) => s.setManualLocation);
  const clearManualLocation = useFuelStore((s) => s.clearManualLocation);
  const setUserLocation = useFuelStore((s) => s.setUserLocation);
  const setFlyToTarget = useFuelStore((s) => s.setFlyToTarget);
  const [brandQuery, setBrandQuery] = useState("");
  const [locQuery, setLocQuery] = useState("");
  const [locResults, setLocResults] = useState<SearchResult[]>([]);
  const [locLoading, setLocLoading] = useState(false);
  const locDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const locInputRef = useRef<HTMLInputElement>(null);
  const brandInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Click-outside removed — modal backdrop handles closing now

  useEffect(() => {
    if (open === "brands") {
      setBrandQuery("");
      setTimeout(() => brandInputRef.current?.focus(), 50);
    }
    if (open === "location") {
      setLocQuery("");
      setLocResults([]);
      setTimeout(() => locInputRef.current?.focus(), 50);
    }
  }, [open]);

  const searchLocation = useCallback((q: string) => {
    if (q.length < 2) { setLocResults([]); return; }
    setLocLoading(true);
    fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data: SearchResult[]) => { setLocResults(data); setLocLoading(false); })
      .catch(() => setLocLoading(false));
  }, []);

  const handleLocInput = (value: string) => {
    setLocQuery(value);
    clearTimeout(locDebounceRef.current);
    if (value.length === 0) { setLocResults([]); return; }
    locDebounceRef.current = setTimeout(() => searchLocation(value), 300);
  };

  const handleSelectLocation = (result: SearchResult) => {
    const name = result.display_name.split(",").slice(0, 2).join(",").trim();
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setManualLocation({ lat, lng }, name);
    setFlyToTarget({ lat, lng, zoom: 13 });
    setLocQuery("");
    setLocResults([]);
    setOpen(null);
  };

  const handleUseGps = () => {
    clearManualLocation();
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          setFlyToTarget({ ...loc, zoom: 13 });
        },
        () => {
          // GPS denied — fall back to Melbourne
          setUserLocation({ lat: -37.8136, lng: 144.9631 });
          setFlyToTarget({ lat: -37.8136, lng: 144.9631, zoom: 13 });
        },
        { enableHighAccuracy: false, timeout: 15000 }
      );
    }
    setOpen(null);
  };

  // Fill mode: gauge (default slider), litres, or dollars
  const fillMode = useFuelStore((s) => s.fillMode);
  const setFillIntent = useFuelStore((s) => s.setFillIntent);
  const setFillMode = (mode: "gauge" | "litres" | "dollars") => {
    setFillIntent(mode, mode === "gauge" ? null : fillMode === mode ? useFuelStore.getState().fillLabel : null);
  };
  const [fillLitresInput, setFillLitresInput] = useState("");
  const [fillDollarsInput, setFillDollarsInput] = useState("");

  const tankSize = vehicleProfile.tankSize;
  const tankPercent = Math.min(1, rangeKm / 800);
  const fuelInTank = tankSize * tankPercent;
  const litresFillingUp = Math.max(0, tankSize - fuelInTank);

  // Average price for dollar mode
  const storeStations = useFuelStore((s) => s.allStations);
  const avgPrice = useMemo(() => {
    const prices = storeStations
      .map((s: { prices: { fuelType: string; price: number }[] }) => s.prices.find((p) => p.fuelType === selectedFuelType)?.price)
      .filter((p: number | undefined): p is number => p != null && p < 500);
    if (prices.length === 0) return 180; // fallback
    return prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
  }, [storeStations, selectedFuelType]);

  // Convert litres to fill → rangeKm
  const litrestoRangeKm = (litres: number) => {
    const pct = Math.max(0, Math.min(1, 1 - litres / tankSize));
    return Math.round(pct * 800);
  };

  // Convert dollars to fill → litres → rangeKm
  const dollarsToRangeKm = (dollars: number) => {
    const litres = (dollars / (avgPrice / 100)); // avgPrice is c/L, convert to $/L
    return litrestoRangeKm(litres);
  };

  const fuelLabel = selectedFuelType === "DSL" ? "Diesel" : selectedFuelType === "PDSL" ? "P.Diesel" : selectedFuelType;
  const tankLabel = fillMode === "litres" && fillLitresInput
    ? `${fillLitresInput}L`
    : fillMode === "dollars" && fillDollarsInput
    ? `$${fillDollarsInput}`
    : rangeKm <= 50 ? "Empty" : rangeKm <= 200 ? "¼" : rangeKm <= 400 ? "½" : rangeKm <= 600 ? "¾" : "Full";
  const brandsLabel = selectedBrands.length === 0 ? "All" : selectedBrands.length === 1 ? selectedBrands[0] : `${selectedBrands.length}`;

  const filteredBrands = brandQuery
    ? availableBrands.filter((b) => b.toLowerCase().includes(brandQuery.toLowerCase()))
    : availableBrands;

  const [hasInteracted, setHasInteracted] = useState(() => {
    try { return !!localStorage.getItem("petrolsaver-filters-used"); } catch { return false; }
  });
  const [showNudge, setShowNudge] = useState(false);

  // Nudge after 4s if user has never interacted with filters
  useEffect(() => {
    if (hasInteracted) { setShowNudge(false); return; }
    const timer = setTimeout(() => setShowNudge(true), 4000);
    return () => clearTimeout(timer);
  }, [hasInteracted]);

  const handleOpen = (key: "fuel" | "tank" | "brands" | "time" | "more" | "location") => {
    setHasInteracted(true);
    try { localStorage.setItem("petrolsaver-filters-used", "1"); } catch {}
    setOpen(open === key ? null : key);
  };

  const chipClass = (isOpen: boolean, isActive: boolean) =>
    `flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border shadow-xl text-[11px] font-semibold font-mono whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
      isOpen
        ? "bg-[var(--foreground)] text-[var(--card)] border-[var(--foreground)]"
        : isActive
        ? "bg-[var(--card)] border-[#4285f4] text-[var(--foreground)]"
        : "bg-[var(--card)] border-[var(--subtle-border)] text-[var(--muted)] hover:text-[var(--foreground)]"
    }`;

  const hasActiveFilters = selectedBrands.length > 0 || timeValuePerHour > 0 || costModel === "fullCost";
  const moreLabel = hasActiveFilters
    ? `More${costModel === "fullCost" ? " · ATO" : ""}${selectedBrands.length > 0 ? ` · ${brandsLabel}` : ""}${timeValuePerHour > 0 ? ` · $${timeValuePerHour}/hr` : ""}`
    : "More";

  return (
    <div ref={wrapperRef}>
      {/* Pills row — Location, Car, Tank, More */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {/* Location chip */}
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, type: "spring", damping: 20 }}
          onClick={() => handleOpen("location")}
          className={chipClass(open === "location", locationSource === "manual")}
        >
          <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
          {locationSource === "manual" && locationName
            ? locationName.split(",")[0].trim()
            : "Location"}
        </motion.button>

        {/* Car profile chip */}
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, type: "spring", damping: 20 }}
          onClick={() => setShowVehicleSetup(true)}
          className={`${chipClass(false, true)} ${showNudge && !open ? "animate-pill-nudge" : ""}`}
        >
          <Car className="h-3.5 w-3.5" strokeWidth={2} />
          {vehicleProfile.name.split(" ").pop()} ·{fuelLabel}
        </motion.button>

        {/* Tank chip */}
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, type: "spring", damping: 20 }}
          onClick={() => handleOpen("tank")}
          className={chipClass(open === "tank", false)}
        >
          <Gauge className="h-3.5 w-3.5" strokeWidth={2} />
          Fill ·{tankLabel}
          <ChevronDown className={`h-3 w-3 transition-transform ${open === "tank" ? "rotate-180" : ""}`} strokeWidth={2} />
        </motion.button>

        {/* More chip — opens combined panel with Fuel type, Brands, Time */}
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, type: "spring", damping: 20 }}
          onClick={() => handleOpen("more")}
          className={chipClass(open === "more", hasActiveFilters)}
        >
          {moreLabel}
          <ChevronDown className={`h-3 w-3 transition-transform ${open === "more" ? "rotate-180" : ""}`} strokeWidth={2} />
        </motion.button>
      </div>


      {/* Filter modals — rendered via portal to escape overflow/z-index issues */}
      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[4000] flex items-end md:items-center justify-center" onClick={() => setOpen(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            key={open}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative z-10 w-full max-w-md mx-4 rounded-t-2xl md:rounded-2xl bg-[var(--card)] border border-[var(--subtle-border)] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-[var(--foreground)]">
                {open === "location" ? "Set location" : open === "tank" ? "How much to fill?" : "Filters"}
              </h2>
              <button onClick={() => setOpen(null)} className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0">
            {open === "location" && (
              <div className="p-3">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)] pointer-events-none" strokeWidth={2} />
                  <input
                    ref={locInputRef}
                    type="text"
                    value={locQuery}
                    onChange={(e) => handleLocInput(e.target.value)}
                    placeholder="Search suburb or address..."
                    style={{ fontSize: "16px" }}
                    className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl pl-9 pr-9 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors"
                  />
                  {locLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-[#4285f4] border-t-transparent animate-spin" />
                  )}
                  {locQuery && !locLoading && (
                    <button
                      onClick={() => { setLocQuery(""); setLocResults([]); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  )}
                </div>

                {locResults.length > 0 && (
                  <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--background)] overflow-hidden mb-2">
                    {locResults.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectLocation(r)}
                        className="w-full text-left px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--subtle-hover)] transition-colors border-b border-[var(--subtle-border)] last:border-0 truncate cursor-pointer"
                      >
                        {r.display_name}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleUseGps}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[var(--muted)] hover:bg-[var(--subtle)] transition-colors cursor-pointer text-left"
                >
                  <LocateFixed className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  <span className="text-xs">Use my GPS location</span>
                </button>
              </div>
            )}

            {open === "tank" && (
              <div className="p-3">
                {/* Mode toggle */}
                <div className="flex gap-1 mb-3 p-0.5 rounded-lg bg-[var(--background)] border border-[var(--subtle-border)]">
                  {([
                    { id: "gauge" as const, label: "Gauge" },
                    { id: "litres" as const, label: "Litres" },
                    { id: "dollars" as const, label: "$" },
                  ]).map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setFillMode(id)}
                      className={`flex-1 py-1.5 rounded-md text-[10px] font-bold text-center transition-all cursor-pointer ${
                        fillMode === id
                          ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {fillMode === "gauge" && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Fuel level</span>
                      <span className="text-xs font-bold font-mono text-[var(--foreground)]">~{Math.round(litresFillingUp)}L to fill</span>
                    </div>
                    <div className="relative h-5 rounded-lg bg-[var(--background)] border border-[var(--subtle-border)] overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-lg transition-all"
                        style={{
                          width: `${Math.min(100, tankPercent * 100)}%`,
                          background: rangeKm <= 50 ? "#dc2626" : rangeKm <= 200 ? "#ea580c" : rangeKm <= 400 ? "#f59e0b" : "#22c55e",
                        }}
                      />
                      <input
                        type="range"
                        min={10}
                        max={800}
                        step={10}
                        value={rangeKm}
                        onChange={(e) => { setRangeKm(Number(e.target.value)); setFillIntent("gauge", null); }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-[var(--muted)]">
                      <span>E</span><span>¼</span><span>½</span><span>¾</span><span>F</span>
                    </div>
                    <div className="text-[9px] text-[var(--muted)] text-center mt-1.5">
                      {Math.round(fuelInTank)}L in tank · {tankSize}L total
                    </div>
                  </>
                )}

                {fillMode === "litres" && (
                  <>
                    <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">How many litres to fill?</div>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={fillLitresInput}
                        onChange={(e) => {
                          setFillLitresInput(e.target.value);
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            const clamped = Math.min(val, tankSize);
                            setRangeKm(litrestoRangeKm(clamped));
                            setFillIntent("litres", clamped >= tankSize ? null : `${Math.round(clamped)}L`);
                          }
                        }}
                        placeholder={`e.g. ${Math.round(tankSize / 2)}`}
                        style={{ fontSize: "16px" }}
                        className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl px-3 py-2.5 text-sm font-mono text-[var(--foreground)] pr-8 focus:outline-none focus:border-[#4285f4] transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] font-mono">L</span>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      {[10, 20, 30, 40].map((n) => (
                        <button
                          key={n}
                          onClick={() => {
                            setFillLitresInput(String(n));
                            setRangeKm(litrestoRangeKm(Math.min(n, tankSize)));
                            setFillIntent("litres", `${n}L`);
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold font-mono text-center transition-all cursor-pointer ${
                            fillLitresInput === String(n)
                              ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                              : "bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"
                          }`}
                        >
                          {n}L
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setFillLitresInput(String(tankSize));
                          setRangeKm(litrestoRangeKm(tankSize));
                          setFillIntent("litres", null);
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold font-mono text-center transition-all cursor-pointer ${
                          fillLitresInput === String(tankSize)
                            ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                            : "bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        Full
                      </button>
                    </div>
                    {fillLitresInput && !isNaN(parseFloat(fillLitresInput)) && (
                      <div className="text-[9px] text-[var(--muted)] text-center mt-2">
                        ~${((parseFloat(fillLitresInput) * avgPrice) / 100).toFixed(0)} at avg {avgPrice.toFixed(1)}c/L
                      </div>
                    )}
                  </>
                )}

                {fillMode === "dollars" && (
                  <>
                    <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">How much to spend?</div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] font-mono">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={fillDollarsInput}
                        onChange={(e) => {
                          setFillDollarsInput(e.target.value);
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            const maxDollars = (tankSize * avgPrice) / 100;
                            const clamped = Math.min(val, maxDollars);
                            setRangeKm(dollarsToRangeKm(clamped));
                            setFillIntent("dollars", clamped >= maxDollars * 0.95 ? null : `$${Math.round(clamped)}`);
                          }
                        }}
                        placeholder="e.g. 50"
                        style={{ fontSize: "16px" }}
                        className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl pl-7 pr-3 py-2.5 text-sm font-mono text-[var(--foreground)] focus:outline-none focus:border-[#4285f4] transition-colors"
                      />
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      {[20, 40, 50, 80].map((n) => (
                        <button
                          key={n}
                          onClick={() => {
                            setFillDollarsInput(String(n));
                            setRangeKm(dollarsToRangeKm(Math.min(n, (tankSize * avgPrice) / 100)));
                            setFillIntent("dollars", `$${n}`);
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold font-mono text-center transition-all cursor-pointer ${
                            fillDollarsInput === String(n)
                              ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                              : "bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"
                          }`}
                        >
                          ${n}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          const fullCost = Math.round((tankSize * avgPrice) / 100);
                          setFillDollarsInput(String(fullCost));
                          setRangeKm(litrestoRangeKm(tankSize));
                          setFillIntent("dollars", null);
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold font-mono text-center transition-all cursor-pointer bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)]`}
                      >
                        Full
                      </button>
                    </div>
                    {fillDollarsInput && !isNaN(parseFloat(fillDollarsInput)) && (
                      <div className="text-[9px] text-[var(--muted)] text-center mt-2">
                        ~{((parseFloat(fillDollarsInput) / (avgPrice / 100))).toFixed(0)}L at avg {avgPrice.toFixed(1)}c/L
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {open === "more" && (
              <div className="max-h-[70vh] overflow-y-auto">
                {/* Fuel type */}
                <div className="border-b border-[var(--subtle-border)]">
                  <div className="px-4 py-2 text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Fuel type</div>
                  {FUEL_OPTIONS.concat(["PDSL"]).map((id) => {
                    const label = id === "DSL" ? "Diesel" : id === "PDSL" ? "Premium Diesel" : (FUEL_TYPE_LABELS[id] ?? id);
                    return (
                      <button
                        key={id}
                        onClick={() => { setSelectedFuelType(id); try { localStorage.setItem("petrolsaver-fuel-chosen", id); } catch {} }}
                        className={`w-full text-left px-4 py-2 text-xs font-mono transition-colors cursor-pointer ${
                          selectedFuelType === id
                            ? "bg-[var(--subtle)] text-[var(--foreground)] font-semibold"
                            : "text-[var(--foreground)] hover:bg-[var(--subtle-hover)]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Brands */}
                <div className="border-b border-[var(--subtle-border)]">
                  <div className="px-4 py-2 text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider flex justify-between">
                    <span>Brands</span>
                    {selectedBrands.length > 0 && (
                      <button onClick={() => setSelectedBrands([])} className="text-[var(--accent-text)] cursor-pointer">Clear ({selectedBrands.length})</button>
                    )}
                  </div>
                  <div className="px-2.5 pb-1.5">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)] pointer-events-none" strokeWidth={2} />
                      <input
                        ref={brandInputRef}
                        type="text"
                        value={brandQuery}
                        onChange={(e) => setBrandQuery(e.target.value)}
                        placeholder="Search brands..."
                        className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors"
                      />
                    </div>
                  </div>
                  <div className="max-h-[160px] overflow-y-auto">
                    {filteredBrands.map((brand) => {
                      const isSelected = selectedBrands.includes(brand);
                      return (
                        <button
                          key={brand}
                          onClick={() => toggleBrand(brand)}
                          className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors cursor-pointer flex items-center gap-2.5 ${
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
                  </div>
                </div>

                {/* Detour cost model */}
                <div className="border-b border-[var(--subtle-border)]">
                  <div className="px-4 py-2 text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Detour cost</div>
                  <div className="px-4 pb-1 text-[9px] text-[var(--muted)]">How we calculate the cost of driving to a station</div>
                  <button
                    onClick={() => setCostModel("fuelOnly")}
                    className={`w-full text-left px-4 py-2 text-xs transition-colors cursor-pointer ${
                      costModel === "fuelOnly"
                        ? "bg-[var(--subtle)] text-[var(--foreground)] font-semibold"
                        : "text-[var(--foreground)] hover:bg-[var(--subtle-hover)]"
                    }`}
                  >
                    Fuel only
                    <span className="block text-[9px] text-[var(--muted)] font-normal mt-0.5">Just the petrol burned on the detour</span>
                  </button>
                  <button
                    onClick={() => setCostModel("fullCost")}
                    className={`w-full text-left px-4 py-2 text-xs transition-colors cursor-pointer ${
                      costModel === "fullCost"
                        ? "bg-[var(--subtle)] text-[var(--foreground)] font-semibold"
                        : "text-[var(--foreground)] hover:bg-[var(--subtle-hover)]"
                    }`}
                  >
                    Full cost (ATO 88¢/km)
                    <span className="block text-[9px] text-[var(--muted)] font-normal mt-0.5">Includes fuel, tyres, servicing, depreciation</span>
                  </button>
                </div>

                {/* Time value */}
                <div>
                  <div className="px-4 py-2 text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Time value</div>
                  <div className="px-4 pb-1 text-[9px] text-[var(--muted)]">Factors detour time into recommendations</div>
                  {[0, 20, 30, 40, 50, 75, 100].map((n) => (
                    <button
                      key={n}
                      onClick={() => { setTimeValuePerHour(n); }}
                      className={`w-full text-left px-4 py-2 text-xs transition-colors cursor-pointer ${
                        timeValuePerHour === n
                          ? "bg-[var(--subtle)] text-[var(--foreground)] font-semibold"
                          : "text-[var(--foreground)] hover:bg-[var(--subtle-hover)]"
                      }`}
                    >
                      {n === 0 ? "Ignore time cost" : `$${n}/hr`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            </div>
          </motion.div>
        </div>,
        document.body
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
              className="w-full bg-[var(--background)] border border-[var(--subtle-border)] rounded-lg pl-8 pr-8 py-1.5 text-[11px] font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors"
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
                  className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer flex items-center gap-2 ${
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
  containerRef,
}: {
  availableBrands: string[];
  selectedBrands: string[];
  setSelectedBrands: (brands: string[]) => void;
  toggleBrand: (brand: string) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 250 });

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

  const handleOpen = () => {
    const btn = btnRef.current;
    const container = containerRef?.current;
    if (btn) {
      const bRect = btn.getBoundingClientRect();
      const cRect = container?.getBoundingClientRect();
      setPos({
        top: bRect.bottom + 4,
        left: cRect ? cRect.left : bRect.left,
        width: cRect ? cRect.width : Math.min(300, window.innerWidth - 24),
      });
    }
    setOpen(!open);
  };

  const filtered = query
    ? availableBrands.filter((b) => b.toLowerCase().includes(query.toLowerCase()))
    : availableBrands;

  return (
    <div ref={ref} className="shrink-0">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border shadow-xl text-[11px] font-semibold font-mono whitespace-nowrap transition-colors cursor-pointer ${
          open
            ? "bg-[var(--foreground)] text-[var(--card)] border-[var(--foreground)]"
            : selectedBrands.length > 0
            ? "bg-[var(--card)] border-[#4285f4] text-[var(--foreground)]"
            : "bg-[var(--card)] border-[var(--subtle-border)] text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
      >
        <Store className="h-3.5 w-3.5" strokeWidth={2} />
        {`Brands ·${selectedBrands.length === 0 ? "All" : selectedBrands.length === 1 ? selectedBrands[0] : selectedBrands.length}`}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="fixed rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] shadow-2xl overflow-hidden z-[1100]"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
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
                  className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors"
                />
              </div>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {selectedBrands.length > 0 && !query && (
                <button
                  onClick={() => setSelectedBrands([])}
                  className="w-full text-left px-4 py-2 text-xs font-semibold font-mono text-[var(--accent-text)] hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer border-b border-[var(--subtle-border)]"
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
                    className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors cursor-pointer flex items-center gap-2.5 ${
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
  containerRef,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  children: (close: () => void) => React.ReactNode;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 250 });

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleOpen = () => {
    const btn = btnRef.current;
    const container = containerRef?.current;
    if (btn) {
      const bRect = btn.getBoundingClientRect();
      const cRect = container?.getBoundingClientRect();
      setPos({
        top: bRect.bottom + 4,
        left: cRect ? cRect.left : bRect.left,
        width: cRect ? cRect.width : Math.min(300, window.innerWidth - 24),
      });
    }
    setOpen(!open);
  };

  return (
    <div ref={ref} className="shrink-0">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border shadow-xl text-[11px] font-semibold font-mono whitespace-nowrap transition-colors cursor-pointer ${
          open
            ? "bg-[var(--foreground)] text-[var(--card)] border-[var(--foreground)]"
            : active
            ? "bg-[var(--card)] border-[#4285f4] text-[var(--foreground)]"
            : "bg-[var(--card)] border-[var(--subtle-border)] text-[var(--muted)] hover:text-[var(--foreground)]"
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
            className="fixed rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] shadow-2xl overflow-hidden z-[1100]"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
