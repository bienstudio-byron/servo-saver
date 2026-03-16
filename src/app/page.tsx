"use client";

import { useEffect, useState, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import FuelMap from "@/components/map/FuelMap";
import StationModal from "@/components/shared/StationModal";
import FuelPickerOverlay from "@/components/shared/FuelPickerOverlay";
import AdSlot from "@/components/shared/AdSlot";
import { useFuelStore } from "@/stores/fuel-store";
import { PriceThresholdsProvider } from "@/stores/price-context";
import type { StationWithPrices } from "@/types/fuel";

const STORAGE_KEY = "petrolsaver-fuel-chosen";
const INTERSTITIAL_KEY = "petrolsaver-interstitial-seen";

export default function HomePage() {
  const [stations, setStations] = useState<StationWithPrices[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerStep, setPickerStep] = useState<1 | 2 | 3>(1);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { selectedFuelType, setSelectedFuelType, selectedStation, setSelectedStation, setAllStations } = useFuelStore();
  const setTripMode = useFuelStore((s) => s.setTripMode);
  const setTripDestination = useFuelStore((s) => s.setTripDestination);
  const setRangeKm = useFuelStore((s) => s.setRangeKm);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSelectedFuelType(stored);
      setPickerStep(3);
      setShowPicker(true);
    } else {
      setPickerStep(1);
      setShowPicker(true);
    }
    setMounted(true);
  }, [setSelectedFuelType]);

  useEffect(() => {
    fetch("/api/fuel/stations")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch stations");
        return res.json();
      })
      .then((data) => {
        setStations(data.stations);
        setAllStations(data.stations);
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

  function handleOnboardingComplete(result: {
    fuelType: string;
    mode: "nearby" | "trip";
    rangeKm: number;
    destination?: { lat: number; lng: number; name: string };
  }) {
    setSelectedFuelType(result.fuelType);
    localStorage.setItem(STORAGE_KEY, result.fuelType);
    setTripMode(result.mode);
    setRangeKm(result.rangeKm);
    if (result.destination) {
      setTripDestination(result.destination);
    }
    setShowPicker(false);

    const seen = sessionStorage.getItem(INTERSTITIAL_KEY);
    if (!seen) {
      setShowInterstitial(true);
      sessionStorage.setItem(INTERSTITIAL_KEY, "1");
      setTimeout(() => setShowInterstitial(false), 5000);
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1a1a]">
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
      {/* Everything is fixed — nothing in document flow */}
      <div className="fixed inset-0 flex flex-col" style={{ zIndex: 0 }}>
        {/* Map fills available space */}
        <div className="relative flex-1 min-h-0">
          <FuelMap
            stations={mounted ? filteredStations : []}
            selectedFuelType={selectedFuelType}
            loading={loading || !mounted}
            onChangeTrip={() => { setPickerStep(2); setShowPicker(true); }}
          />
        </div>

      </div>

      {/* Station modal */}
      <AnimatePresence>
        {selectedStation && (
          <StationModal
            station={selectedStation}
            allStations={stations}
            selectedFuelType={selectedFuelType}
            onClose={() => setSelectedStation(null)}
            onSelectStation={setSelectedStation}
          />
        )}
      </AnimatePresence>

      {/* Onboarding */}
      {showPicker && (
        <FuelPickerOverlay
          onComplete={handleOnboardingComplete}
          initialStep={pickerStep}
        />
      )}

      {/* Interstitial ad */}
      {showInterstitial && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-lg mx-4 rounded-2xl bg-[#242424] border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-[11px] text-[#5f6368] uppercase tracking-wider">Sponsored</span>
              <button
                onClick={() => setShowInterstitial(false)}
                className="text-xs text-[#9aa0a6] hover:text-white transition-colors"
              >
                Skip
              </button>
            </div>
            <div className="p-4">
              <AdSlot slot="interstitial" format="rectangle" />
            </div>
          </div>
        </div>
      )}
    </PriceThresholdsProvider>
  );
}
