"use client";

import { useEffect, useState, useMemo } from "react";
import FuelMap from "@/components/map/FuelMap";
import StationModal from "@/components/shared/StationModal";
import FuelPickerOverlay from "@/components/shared/FuelPickerOverlay";
import { useFuelStore } from "@/stores/fuel-store";
import { PriceThresholdsProvider } from "@/stores/price-context";
import type { StationWithPrices } from "@/types/fuel";

const STORAGE_KEY = "servosaver-fuel-chosen";

export default function HomePage() {
  const [stations, setStations] = useState<StationWithPrices[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const { selectedFuelType, setSelectedFuelType, selectedStation, setSelectedStation } = useFuelStore();

  // Check localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSelectedFuelType(stored);
    } else {
      setShowPicker(true);
    }
  }, [setSelectedFuelType]);

  useEffect(() => {
    fetch("/api/fuel/stations")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch stations");
        return res.json();
      })
      .then((data) => {
        setStations(data.stations);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filteredStations = useMemo(
    () => stations.filter((s) => s.prices.some((p) => p.fuelType === selectedFuelType)),
    [stations, selectedFuelType]
  );

  function handleFuelPick(fuelType: string) {
    setSelectedFuelType(fuelType);
    localStorage.setItem(STORAGE_KEY, fuelType);
    setShowPicker(false);
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">Failed to load fuel data</h2>
          <p className="text-[#9aa0a6] text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <PriceThresholdsProvider stations={stations} selectedFuelType={selectedFuelType}>
      <div className="relative h-[calc(100vh-7.5rem)]">
        <FuelMap
          stations={filteredStations}
          selectedFuelType={selectedFuelType}
          loading={loading}
        />
      </div>

      {selectedStation && (
        <StationModal
          station={selectedStation}
          allStations={stations}
          selectedFuelType={selectedFuelType}
          onClose={() => setSelectedStation(null)}
          onSelectStation={setSelectedStation}
        />
      )}

      {showPicker && <FuelPickerOverlay onSelect={handleFuelPick} />}
    </PriceThresholdsProvider>
  );
}
