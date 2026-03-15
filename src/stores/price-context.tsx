"use client";

import { createContext, useContext, useMemo } from "react";
import type { StationWithPrices } from "@/types/fuel";
import { computeThresholds, type PriceThresholds } from "@/lib/price-utils";

const PriceThresholdsContext = createContext<PriceThresholds>({ q1: 0, q3: 0 });

export function PriceThresholdsProvider({
  stations,
  selectedFuelType,
  children,
}: {
  stations: StationWithPrices[];
  selectedFuelType: string;
  children: React.ReactNode;
}) {
  const thresholds = useMemo(() => {
    const prices = stations
      .map((s) => s.prices.find((p) => p.fuelType === selectedFuelType)?.price ?? null)
      .filter((p): p is number => p != null);
    return computeThresholds(prices);
  }, [stations, selectedFuelType]);

  return (
    <PriceThresholdsContext.Provider value={thresholds}>
      {children}
    </PriceThresholdsContext.Provider>
  );
}

export function usePriceThresholds(): PriceThresholds {
  return useContext(PriceThresholdsContext);
}
