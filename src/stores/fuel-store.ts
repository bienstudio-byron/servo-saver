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
}));
