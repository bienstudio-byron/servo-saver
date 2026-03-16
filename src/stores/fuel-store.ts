import { create } from "zustand";
import { DEFAULT_FUEL_TYPE } from "@/lib/constants";
import type { StationWithPrices } from "@/types/fuel";

interface FuelStore {
  selectedFuelType: string;
  setSelectedFuelType: (type: string) => void;
  brandFilter: string;
  setBrandFilter: (brand: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
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
}

export const useFuelStore = create<FuelStore>((set) => ({
  selectedFuelType: DEFAULT_FUEL_TYPE,
  setSelectedFuelType: (type) => set({ selectedFuelType: type }),
  brandFilter: "",
  setBrandFilter: (brand) => set({ brandFilter: brand }),
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
  userLocation: null,
  setUserLocation: (location) => set({ userLocation: location }),
  selectedStation: null,
  setSelectedStation: (station) => set({ selectedStation: station }),
  flyToTarget: null,
  setFlyToTarget: (target) => set({ flyToTarget: target }),
  allStations: [],
  setAllStations: (stations) => set({ allStations: stations }),
  tripMode: "nearby",
  setTripMode: (mode) => set({ tripMode: mode }),
  tripDestination: null,
  setTripDestination: (dest) => set({ tripDestination: dest }),
  rangeKm: 200,
  setRangeKm: (km) => set({ rangeKm: km }),
  recommendedStations: [],
  setRecommendedStations: (stations) => set({ recommendedStations: stations }),
  activeRouteStation: null,
  setActiveRouteStation: (station) => set({ activeRouteStation: station }),
}));
