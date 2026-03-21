"use client";

import { useEffect, useState, useMemo, useCallback, startTransition } from "react";
import { AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import FuelMap from "@/components/map/FuelMap";
import StationModal from "@/components/shared/StationModal";
import FuelPickerOverlay from "@/components/shared/FuelPickerOverlay";
import AdSlot from "@/components/shared/AdSlot";
import AlertSignup from "@/components/shared/AlertSignup";
import InsightBanner from "@/components/shared/InsightBanner";
import ModeTabBar from "@/components/shared/ModeTabBar";
import NavBar from "@/components/shared/NavBar";
import VehicleSetup from "@/components/shared/VehicleSetup";
import InstallPrompt from "@/components/shared/InstallPrompt";
import TollMode from "@/components/tolls/TollMode";
import { useFuelStore } from "@/stores/fuel-store";
import { useVehicleStore } from "@/stores/vehicle-store";
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
  const { selectedFuelType, setSelectedFuelType, selectedStation, setSelectedStation, setAllStations, mode } = useFuelStore();

  const setRangeKm = useFuelStore((s) => s.setRangeKm);
  const setFlyToTarget = useFuelStore((s) => s.setFlyToTarget);

  useEffect(() => {
    // Hydrate vehicle store from localStorage (SSR-safe)
    useVehicleStore.getState().hydrate();

    // Register service worker for PWA
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Hydrate persisted filters
    try {
      const tv = localStorage.getItem("petrolsaver-time-value");
      if (tv) useFuelStore.getState().setTimeValuePerHour(Number(tv));
      const br = localStorage.getItem("petrolsaver-brands");
      if (br) useFuelStore.getState().setSelectedBrands(JSON.parse(br));
    } catch {}

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSelectedFuelType(stored);
    }

    // If coming from a station page with ?station=ID, skip onboarding and fly to station
    const params = new URLSearchParams(window.location.search);
    const stationParam = params.get("station");
    if (stationParam) {
      setMounted(true);
      return;
    }

    setMounted(true);
  }, [setSelectedFuelType]);

  const fetchStations = useCallback((isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    Promise.all([
      fetch("/api/fuel/stations").then((r) => {
        if (!r.ok) throw new Error("Failed to fetch stations");
        return r.json();
      }),
      fetch("/api/community-price/all").then((r) => r.json()).catch(() => ({ prices: [] })),
    ])
      .then(([stationData, communityData]) => {
        let merged: StationWithPrices[] = stationData.stations;

        // Overlay community prices where they're newer than the official price
        if (communityData.prices?.length > 0) {
          const communityMap = new Map<string, { fuelType: string; price: number; reportedAt: string }[]>();
          for (const cp of communityData.prices) {
            const key = cp.stationId;
            if (!communityMap.has(key)) communityMap.set(key, []);
            communityMap.get(key)!.push(cp);
          }

          merged = merged.map((station) => {
            const reports = communityMap.get(station.id);
            if (!reports) return station;
            const updatedPrices = station.prices.map((p) => {
              const report = reports.find((r) => r.fuelType === p.fuelType);
              if (report && new Date(report.reportedAt) > new Date(p.updatedAt)) {
                return { ...p, price: report.price, updatedAt: report.reportedAt, source: "community" as const, isStale: false };
              }
              return p;
            });
            return { ...station, prices: updatedPrices };
          });
        }

        startTransition(() => {
          setStations(merged);
          setAllStations(merged);
          setLoading(false);
        });

        // If ?station=ID in URL, fly to that station and open modal
        if (!isRefresh) {
          const params = new URLSearchParams(window.location.search);
          const stationParam = params.get("station");
          if (stationParam) {
            const target = merged.find((s: { id: string }) => s.id === stationParam);
            if (target) {
              setSelectedStation(target);
              setFlyToTarget({ lat: target.latitude, lng: target.longitude, zoom: 15 });
            }
            window.history.replaceState({}, "", "/");
          }
        }
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Initial fetch
  useEffect(() => { fetchStations(); }, [fetchStations]);

  // Refetch when tab becomes visible (if data is >15min old)
  useEffect(() => {
    let lastFetch = Date.now();
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFetch > 15 * 60 * 1000) {
        lastFetch = Date.now();
        fetchStations(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchStations]);

  // Alert signup disabled for launch
  // useEffect(() => {
  //   const alreadySignedUp = localStorage.getItem("petrolsaver-alert-signed-up");
  //   const alreadyDismissed = sessionStorage.getItem("petrolsaver-alert-dismissed");
  //   if (alreadySignedUp || alreadyDismissed) return;
  //   const timer = setTimeout(() => {
  //     setShowAlerts(true);
  //   }, 15000);
  //   return () => clearTimeout(timer);
  // }, []);

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

    // Interstitial ad disabled until AdSense approval
    // const seen = sessionStorage.getItem(INTERSTITIAL_KEY);
    // if (!seen) {
    //   setShowInterstitial(true);
    //   sessionStorage.setItem(INTERSTITIAL_KEY, "1");
    //   setTimeout(() => setShowInterstitial(false), 5000);
    // }
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
      <div className="fixed inset-0" style={{ zIndex: 0 }}>
        <div className="relative w-full h-full">
          {/* NavBar — shared across both modes */}
          <NavBar />
          {mode === "tolls" ? (
            <TollMode />
          ) : (
            <FuelMap
              stations={mounted ? filteredStations : []}
              selectedFuelType={selectedFuelType}
              loading={loading || !mounted}
            />
          )}
        </div>
      </div>

      {/* Station modal — fuel mode only */}
      <AnimatePresence>
        {mode !== "tolls" && selectedStation && (
          <StationModal
            station={selectedStation}
            allStations={stations}
            selectedFuelType={selectedFuelType}
            onClose={() => setSelectedStation(null)}
            onSelectStation={setSelectedStation}
          />
        )}
      </AnimatePresence>


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
      {/* Vehicle setup modal */}
      <VehicleSetup />
      {/* PWA install prompt */}
      <InstallPrompt />
    </PriceThresholdsProvider>
  );
}
