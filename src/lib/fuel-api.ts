import "server-only";
import { vicProvider, fetchBrands as vicFetchBrands, fetchFuelTypes as vicFetchFuelTypes } from "./providers/vic-provider";
import type { FuelBrand, FuelType, StationWithPrices } from "@/types/fuel";

// Re-export for API routes that need brands/types (VIC is the canonical source)
export async function fetchBrands(): Promise<FuelBrand[]> {
  return vicFetchBrands();
}

export async function fetchFuelTypes(): Promise<FuelType[]> {
  return vicFetchFuelTypes();
}

// Orchestrator: fetch from all enabled providers
export async function fetchMergedStations(): Promise<StationWithPrices[]> {
  const enableNsw = process.env.ENABLE_NSW === "true";

  if (!enableNsw) {
    // Fast path: VIC only
    return vicProvider.fetchStations();
  }

  // Fetch both providers in parallel — if one fails, the other still works
  const { nswProvider } = await import("./providers/nsw-provider");
  const results = await Promise.allSettled([
    vicProvider.fetchStations(),
    nswProvider.fetchStations(),
  ]);

  const stations: StationWithPrices[] = [];

  const providerNames = ["VIC", "NSW"];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      stations.push(...result.value);
    } else {
      console.error(`${providerNames[i]} provider failed:`, result.reason);
    }
  });

  if (stations.length === 0) {
    throw new Error("All fuel data providers failed");
  }

  return stations;
}
