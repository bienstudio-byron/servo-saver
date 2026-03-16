"use client";

import { useEffect, useState, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import FuelMap from "@/components/map/FuelMap";
import StationModal from "@/components/shared/StationModal";
import FuelPickerOverlay from "@/components/shared/FuelPickerOverlay";
import AdSlot from "@/components/shared/AdSlot";
import AlertSignup from "@/components/shared/AlertSignup";
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
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { selectedFuelType, setSelectedFuelType, selectedStation, setSelectedStation, setAllStations } = useFuelStore();
  const setRangeKm = useFuelStore((s) => s.setRangeKm);
  const setFlyToTarget = useFuelStore((s) => s.setFlyToTarget);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSelectedFuelType(stored);
    }

    // If coming from a station page with ?station=ID, skip onboarding and fly to station
    const params = new URLSearchParams(window.location.search);
    const stationParam = params.get("station");
    if (stationParam) {
      // Don't show onboarding — go straight to map
      setMounted(true);
      return;
    }

    // Only show onboarding once per session
    if (!sessionStorage.getItem("petrolsaver-onboarded")) {
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

        // If ?station=ID in URL, fly to that station and open modal
        const params = new URLSearchParams(window.location.search);
        const stationParam = params.get("station");
        if (stationParam) {
          const target = data.stations.find((s: { id: string }) => s.id === stationParam);
          if (target) {
            setSelectedStation(target);
            setFlyToTarget({ lat: target.latitude, lng: target.longitude, zoom: 15 });
          }
          // Clean up URL
          window.history.replaceState({}, "", "/");
        }
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Auto-show alert signup after 15s if not already signed up or dismissed
  useEffect(() => {
    const alreadySignedUp = localStorage.getItem("petrolsaver-alert-signed-up");
    const alreadyDismissed = sessionStorage.getItem("petrolsaver-alert-dismissed");
    if (alreadySignedUp || alreadyDismissed) return;
    const timer = setTimeout(() => {
      setShowAlerts(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  const filteredStations = useMemo(
    () => stations.filter((s) => s.prices.some((p) => p.fuelType === selectedFuelType)),
    [stations, selectedFuelType]
  );

  function handleOnboardingComplete(result: {
    fuelType: string;
    rangeKm: number;
  }) {
    setSelectedFuelType(result.fuelType);
    localStorage.setItem(STORAGE_KEY, result.fuelType);
    setRangeKm(result.rangeKm);
    setShowPicker(false);
    sessionStorage.setItem("petrolsaver-onboarded", "1");

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
            <AlertCircle className="h-6 w-6 text-red-400" strokeWidth={2} />
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
        <FuelPickerOverlay onComplete={handleOnboardingComplete} />
      )}

      {/* Alert signup */}
      <AnimatePresence>
        {showAlerts && (
          <AlertSignup
            selectedFuelType={selectedFuelType}
            onClose={() => { setShowAlerts(false); sessionStorage.setItem("petrolsaver-alert-dismissed", "1"); }}
          />
        )}
      </AnimatePresence>

      {/* Interstitial ad */}
      {showInterstitial && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-lg mx-4 rounded-2xl bg-[var(--card)] border border-[var(--subtle-border)] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--subtle-border)]">
              <span className="text-[11px] text-[var(--muted)] uppercase tracking-wider">Sponsored</span>
              <button
                onClick={() => setShowInterstitial(false)}
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
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
