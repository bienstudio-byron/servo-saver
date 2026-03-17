import { create } from "zustand";
import { DEFAULT_FUEL_TYPE } from "@/lib/constants";
import type { StationWithPrices } from "@/types/fuel";

interface FuelStore {
  selectedFuelType: string;
  setSelectedFuelType: (type: string) => void;
  selectedBrands: string[];
  setSelectedBrands: (brands: string[]) => void;
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (location: { lat: number; lng: number } | null) => void;
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
}

export const useFuelStore = create<FuelStore>((set) => ({
  selectedFuelType: DEFAULT_FUEL_TYPE,
  setSelectedFuelType: (type) => set({ selectedFuelType: type }),
  selectedBrands: [],
  setSelectedBrands: (brands) => set({ selectedBrands: brands }),
  userLocation: null,
  setUserLocation: (location) => set({ userLocation: location }),
  selectedStation: null,
  setSelectedStation: (station) => set({ selectedStation: station }),
  flyToTarget: null,
  setFlyToTarget: (target) => set({ flyToTarget: target }),
  allStations: [],
  setAllStations: (stations) => set({ allStations: stations }),
  tripMode: "nearby",
  setTripMode: (mode) => set({ tripMode: mode, searchOrigin: null }),
  tripDestination: null,
  setTripDestination: (dest) => set({ tripDestination: dest }),
  rangeKm: 200,
  setRangeKm: (km) => set({ rangeKm: km }),
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
}));
