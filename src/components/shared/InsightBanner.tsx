"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { useFuelStore } from "@/stores/fuel-store";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import { haversineDistance } from "@/lib/geo";

function useTypewriter(text: string, speed = 40) {
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState<"typing" | "done" | "deleting" | "deleted">("typing");

  useEffect(() => {
    setDisplayed("");
    setPhase("typing");
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setPhase("done");
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayed, phase, startDelete: () => setPhase("deleting") };
}

export default function InsightBanner() {
  const stations = useFuelStore((s) => s.allStations);
  const selectedFuelType = useFuelStore((s) => s.selectedFuelType);
  const userLocation = useFuelStore((s) => s.userLocation);
  const searchOrigin = useFuelStore((s) => s.searchOrigin);
  const [locationName, setLocationName] = useState<string | null>(null);

  const origin = searchOrigin ?? userLocation;

  useEffect(() => {
    if (!origin) return;
    setLocationName(null);
    const controller = new AbortController();
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${origin.lat}&lon=${origin.lng}`,
      { headers: { "User-Agent": "PetrolSaver/1.0" }, signal: controller.signal }
    )
      .then((r) => r.json())
      .then((data) => {
        const name = data.address?.suburb || data.address?.town || data.address?.city || null;
        if (name) setLocationName(name);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [origin?.lat, origin?.lng]);

  const insights = useMemo(() => {
    if (!origin || stations.length === 0) return [];

    const allPrices = stations
      .map((s) => s.prices.find((p) => p.fuelType === selectedFuelType)?.price)
      .filter((p): p is number => p != null && p < 500);
    if (allPrices.length === 0) return [];

    const nearby = stations
      .map((s) => {
        const price = s.prices.find((p) => p.fuelType === selectedFuelType)?.price;
        if (!price || price >= 500) return null;
        const dist = haversineDistance(origin.lat, origin.lng, s.latitude, s.longitude);
        if (dist > 15) return null;
        return { price, dist, name: s.name };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => a.price - b.price);

    if (nearby.length === 0) return [];

    const stateAvg = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
    const localPrices = nearby.map((s) => s.price);
    const localBest = Math.min(...localPrices);
    const localAvg = localPrices.reduce((a, b) => a + b, 0) / localPrices.length;
    const spread = Math.max(...localPrices) - localBest;
    const diff = localAvg - stateAvg;
    const tankSavings = spread > 1 ? (spread * 55) / 100 : 0;
    const fuel = FUEL_TYPE_LABELS[selectedFuelType] ?? selectedFuelType;
    const loc = locationName ?? "nearby";

    const r = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

    const stats: string[] = [];

    // First insight always leads with location
    if (nearby[0]) {
      stats.push(`${loc}: cheapest ${fuel} is ${r(nearby[0].price)}c at ${nearby[0].name}`);
    }

    if (Math.abs(diff) > 0.5) {
      stats.push(
        diff > 0
          ? `${loc}: ${fuel} is ${r(diff)}c above state avg`
          : `${loc}: ${fuel} is ${r(Math.abs(diff))}c below state avg`
      );
    }

    if (tankSavings > 0.5) {
      stats.push(`${loc}: save up to $${tankSavings.toFixed(0)} per fill nearby`);
    }

    stats.push(`${loc}: comparing ${nearby.length} stations for ${fuel}`);

    return stats;
  }, [origin, stations, selectedFuelType, locationName]);

  const [index, setIndex] = useState(0);
  const currentText = insights[index % insights.length] || "";
  const { displayed, phase, startDelete } = useTypewriter(currentText, 40);
  const [showText, setShowText] = useState("");

  // Handle delete phase — backspace faster than typing
  useEffect(() => {
    if (phase === "deleting") {
      if (showText.length === 0) {
        setIndex((prev) => (prev + 1) % insights.length);
        return;
      }
      const timer = setTimeout(() => {
        setShowText((prev) => prev.slice(0, -1));
      }, 15);
      return () => clearTimeout(timer);
    }
  }, [phase, showText, insights.length]);

  // Sync displayed text from typewriter
  useEffect(() => {
    if (phase === "typing" || phase === "done") {
      setShowText(displayed);
    }
  }, [displayed, phase]);

  // After done typing, wait then start deleting
  useEffect(() => {
    if (phase !== "done" || insights.length <= 1) return;
    const timer = setTimeout(startDelete, 3000);
    return () => clearTimeout(timer);
  }, [phase, startDelete, insights.length]);

  // Reset on new insights
  useEffect(() => {
    setIndex(0);
  }, [insights.length]);

  if (insights.length === 0) return null;

  const isTyping = phase === "typing" || phase === "deleting";

  return (
    <div className="bg-[#1a1a1a] shrink-0 overflow-hidden">
      <div className="flex items-center justify-center gap-2 px-4 py-1.5 text-white text-[11px] md:text-xs min-h-[28px]">
        <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2} />
        <span className="font-medium truncate">
          {showText}
          {isTyping && <span className="animate-pulse">|</span>}
        </span>
      </div>
    </div>
  );
}
