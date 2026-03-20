import { create } from "zustand";
import { DEFAULT_FUEL_TYPE } from "@/lib/constants";
import type { StationWithPrices } from "@/types/fuel";

export type AppMode = "petrol" | "ev" | "tolls";
export type LocationSource = "gps" | "manual" | "default";

const LOCATION_STORAGE_KEY = "petrolsaver-location";

function loadSavedLocation(): { location: { lat: number; lng: number }; name: string; source: LocationSource } | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.lat && parsed.lng) {
        return { location: { lat: parsed.lat, lng: parsed.lng }, name: parsed.name || "", source: "manual" };
      }
    }
  } catch {}
  return null;
}

interface FuelStore {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  selectedFuelType: string;
  setSelectedFuelType: (type: string) => void;
  selectedBrands: string[];
  setSelectedBrands: (brands: string[]) => void;
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (location: { lat: number; lng: number } | null) => void;
  locationName: string | null;
  locationSource: LocationSource;
  setManualLocation: (location: { lat: number; lng: number }, name: string) => void;
  clearManualLocation: () => void;
  selectedStation: StationWithPrices | null;
  setSelectedStation: (station: StationWithPrices | null) => void;
  flyToTarget: { lat: number; lng: number; zoom: number } | null;
  setFlyToTarget: (target: { lat: number; lng: number; zoom: number } | null) => void;
  allStations: StationWithPrices[];
  setAllStations: (stations: StationWithPrices[]) => void;
  tripMode: "nearby" | "trip";
  setTripMode: (mode: "nearby" | "trip") => void;
  tripDestination: { lat: number; lng: number; name: string } | null;
  setTripDestination: (dest: { lat: number; lng: number; name: string } | null) => void;
  rangeKm: number;
  setRangeKm: (km: number) => void;
  fillMode: "gauge" | "litres" | "dollars";
  fillLabel: string | null; // e.g. "30L" or "$50" — null means "to full"
  setFillIntent: (mode: "gauge" | "litres" | "dollars", label: string | null) => void;
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
  recommendedStations: StationWithPrices[];
  setRecommendedStations: (stations: StationWithPrices[]) => void;
  activeRouteStation: StationWithPrices | null;
  setActiveRouteStation: (station: StationWithPrices | null) => void;
  fitBoundsTarget: { points: [number, number][] } | null;
  setFitBoundsTarget: (target: { points: [number, number][] } | null) => void;
  pinClickedStationId: string | null;
  setPinClickedStationId: (id: string | null) => void;
  highlightedStationIds: Set<string>;
  setHighlightedStationIds: (ids: Set<string>) => void;
  focusedStationId: string | null;
  setFocusedStationId: (id: string | null) => void;
  searchOrigin: { lat: number; lng: number } | null;
  setSearchOrigin: (origin: { lat: number; lng: number } | null) => void;
  tripPlannerOpen: boolean;
  setTripPlannerOpen: (open: boolean) => void;
  tripOrigin: { lat: number; lng: number; name: string } | null;
  setTripOrigin: (origin: { lat: number; lng: number; name: string } | null) => void;
  timeValuePerHour: number;
  setTimeValuePerHour: (value: number) => void;
}

export const useFuelStore = create<FuelStore>((set) => {
  const saved = loadSavedLocation();
  return {
  mode: "petrol" as AppMode,
  setMode: (mode) => set((state) => ({
    mode,
    // Only reset fuel-specific state when switching between petrol/ev, not tolls
    ...(mode === "tolls" ? {} : {
      selectedFuelType: mode === "ev" ? "DC" : DEFAULT_FUEL_TYPE,
      selectedBrands: [],
    }),
  })),
  selectedFuelType: DEFAULT_FUEL_TYPE,
  setSelectedFuelType: (type) => set({ selectedFuelType: type }),
  selectedBrands: [],
  setSelectedBrands: (brands) => set({ selectedBrands: brands }),
  userLocation: saved?.location ?? null,
  setUserLocation: (location) => set({ userLocation: location }),
  locationName: saved?.name ?? null,
  locationSource: saved?.source ?? "default",
  setManualLocation: (location, name) => {
    try { localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ lat: location.lat, lng: location.lng, name })); } catch {}
    set({ userLocation: location, locationName: name, locationSource: "manual" });
  },
  clearManualLocation: () => {
    try { localStorage.removeItem(LOCATION_STORAGE_KEY); } catch {}
    set({ locationName: null, locationSource: "default" });
  },
  selectedStation: null,
  setSelectedStation: (station) => set({ selectedStation: station }),
  flyToTarget: null,
  setFlyToTarget: (target) => set({ flyToTarget: target }),
  allStations: [],
  setAllStations: (stations) => set({ allStations: stations }),
  tripMode: "nearby",
  setTripMode: (mode) => set({ tripMode: mode, searchOrigin: null, ...(mode === "nearby" ? { tripOrigin: null } : {}) }),
  tripDestination: null,
  setTripDestination: (dest) => set({ tripDestination: dest }),
  rangeKm: 200,
  setRangeKm: (km) => set({ rangeKm: km }),
  fillMode: "gauge" as "gauge" | "litres" | "dollars",
  fillLabel: null as string | null,
  setFillIntent: (mode, label) => set({ fillMode: mode, fillLabel: label }),
  filtersOpen: false,
  setFiltersOpen: (open) => set({ filtersOpen: open }),
  recommendedStations: [],
  setRecommendedStations: (stations) => set({ recommendedStations: stations }),
  activeRouteStation: null,
  setActiveRouteStation: (station) => set({ activeRouteStation: station }),
  fitBoundsTarget: null,
  setFitBoundsTarget: (target) => set({ fitBoundsTarget: target }),
  pinClickedStationId: null,
  setPinClickedStationId: (id) => set({ pinClickedStationId: id }),
  highlightedStationIds: new Set<string>(),
  setHighlightedStationIds: (ids) => set({ highlightedStationIds: ids }),
  focusedStationId: null,
  setFocusedStationId: (id) => set({ focusedStationId: id }),
  searchOrigin: null,
  setSearchOrigin: (origin) => set({ searchOrigin: origin }),
  tripPlannerOpen: false,
  setTripPlannerOpen: (open) => set({ tripPlannerOpen: open }),
  tripOrigin: null,
  setTripOrigin: (origin) => set({ tripOrigin: origin }),
  timeValuePerHour: 0,
  setTimeValuePerHour: (value) => set({ timeValuePerHour: value }),
};});
