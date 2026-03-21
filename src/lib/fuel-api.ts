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
  const enableTas = process.env.ENABLE_TAS !== "false"; // on by default if NSW is on
  const enableWa = process.env.ENABLE_WA !== "false"; // on by default

  const providers: { name: string; fetch: () => Promise<StationWithPrices[]> }[] = [
    { name: "VIC", fetch: () => vicProvider.fetchStations() },
  ];

  if (enableNsw) {
    providers.push({
      name: "NSW+TAS",
      fetch: async () => {
        const { nswProvider } = await import("./providers/nsw-provider");
        const allStations = await nswProvider.fetchStations();

        if (enableTas) {
          // Split NSW results: stations below -39.5° latitude are TAS
          return allStations.map((s) => {
            if (s.latitude < -39.5) {
              return { ...s, id: s.id.replace("nsw:", "tas:"), state: "TAS" };
            }
            return s;
          });
        }

        return allStations;
      },
    });
  }

  if (enableWa) {
    providers.push({
      name: "WA",
      fetch: async () => {
        const { waProvider } = await import("./providers/wa-provider");
        return waProvider.fetchStations();
      },
    });
  }

  if (providers.length === 1) {
    // Fast path: VIC only
    return vicProvider.fetchStations();
  }

  // Fetch all providers in parallel — if one fails, the others still work
  const results = await Promise.allSettled(providers.map((p) => p.fetch()));

  const stations: StationWithPrices[] = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      stations.push(...result.value);
    } else {
      console.error(`${providers[i].name} provider failed:`, result.reason);
    }
  });

  if (stations.length === 0) {
    throw new Error("All fuel data providers failed");
  }

  console.log(`Loaded ${stations.length} stations from ${providers.map((p) => p.name).join(", ")}`);
  return stations;
}
