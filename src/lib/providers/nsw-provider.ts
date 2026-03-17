import "server-only";
import { z } from "zod";
import type { StationWithPrices } from "@/types/fuel";
import type { FuelDataProvider } from "./types";

const NSW_API_BASE = "https://api.onegov.nsw.gov.au/FuelCheckApp/v1/fuel";
const NSW_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// --- Fuel type mapping ---
// NSW codes → PetrolSaver unified codes

const NSW_FUEL_TYPE_MAP: Record<string, string> = {
  E10: "E10",
  U91: "U91",
  P95: "P95",
  P98: "P98",
  DL: "DSL",
  PDL: "PDSL",
  LPG: "LPG",
  B20: "B20",
  E85: "E85",
};

function mapNswFuelType(nswCode: string): string | null {
  if (nswCode === "EV") return null;
  return NSW_FUEL_TYPE_MAP[nswCode] ?? null;
}

// --- Brand mapping ---
// Map NSW brand names to canonical names used in brand-logos.ts

const BRAND_NAME_MAP: Record<string, string> = {
  "Ampol Foodary": "Ampol",
  "Ampol Breeze": "Ampol",
  "EBM Ampol": "EG Ampol",
  "Metro Fuel": "Metro Petroleum",
  "APCO": "Apco Service Stations",
  "U-Go": "United",
  "NRMA": "Ampol",
  "Enhance": "Ampol",
};

const MAJOR_BRANDS = new Set([
  "7-Eleven", "BP", "Shell", "Ampol", "Caltex", "Costco", "Mobil",
  "United", "Coles Express", "EG Ampol", "Metro Petroleum", "Liberty",
  "Speedway", "Puma", "Reddy Express", "Budget", "Lowes",
  "Apco Service Stations", "Pearl Energy",
]);

function mapNswBrand(brandName: string): { id: string; name: string; type: "major" | "independent" } {
  const canonical = BRAND_NAME_MAP[brandName] ?? brandName;
  const id = canonical.toLowerCase().replace(/\s+/g, "-");
  const type = MAJOR_BRANDS.has(canonical) ? "major" : "independent";
  return { id, name: canonical, type };
}

// --- NSW date parsing ---
// NSW returns dates like "17/03/2026 14:30:00"

function parseNswDate(dateStr: string): Date {
  const [datePart, timePart] = dateStr.split(" ");
  if (!datePart || !timePart) return new Date(dateStr);
  const [day, month, year] = datePart.split("/");
  return new Date(`${year}-${month}-${day}T${timePart}+11:00`); // AEDT
}

// --- Zod schemas ---

const nswStationSchema = z.object({
  code: z.string(),
  name: z.string(),
  brand: z.string(),
  address: z.string().default(""),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

const nswPriceSchema = z.object({
  stationcode: z.string(),
  fueltype: z.string(),
  price: z.number(),
  lastupdated: z.string(),
});

const nswFullResponseSchema = z.object({
  stations: z.array(nswStationSchema),
  prices: z.array(nswPriceSchema),
});

// --- Cache ---

interface CacheEntry {
  data: StationWithPrices[];
  timestamp: number;
}

let nswCache: CacheEntry | null = null;

// --- Provider ---

function formatTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export const nswProvider: FuelDataProvider = {
  id: "nsw",

  async fetchStations(): Promise<StationWithPrices[]> {
    if (nswCache && Date.now() - nswCache.timestamp < NSW_CACHE_TTL_MS) {
      return nswCache.data;
    }

    try {
      const res = await fetch(`${NSW_API_BASE}/prices`, {
        headers: {
          "Content-Type": "application/json",
          requesttimestamp: formatTimestamp(),
        },
      });

      if (!res.ok) {
        throw new Error(`NSW Fuel API error: ${res.status} ${res.statusText}`);
      }

      const raw = await res.json();
      const parsed = nswFullResponseSchema.parse(raw);

      // Build station map
      const stationMap = new Map<string, z.infer<typeof nswStationSchema>>();
      for (const s of parsed.stations) {
        stationMap.set(s.code, s);
      }

      // Group prices by station
      const pricesByStation = new Map<string, z.infer<typeof nswPriceSchema>[]>();
      for (const p of parsed.prices) {
        const arr = pricesByStation.get(p.stationcode) || [];
        arr.push(p);
        pricesByStation.set(p.stationcode, arr);
      }

      const results: StationWithPrices[] = [];

      for (const [stationCode, stationData] of stationMap) {
        const rawPrices = pricesByStation.get(stationCode) || [];

        const prices = rawPrices
          .map((p) => {
            const mappedType = mapNswFuelType(p.fueltype);
            if (!mappedType) return null;
            if (p.price <= 0 || p.price >= 500) return null;

            const parsedDate = parseNswDate(p.lastupdated);
            const ageMs = Date.now() - parsedDate.getTime();
            // NSW retailers submit when prices change, not on a schedule.
            // A week-old "last updated" just means the price hasn't changed — it's still accurate.
            const staleMs = 14 * 24 * 60 * 60 * 1000; // 14 days

            return {
              fuelType: mappedType,
              price: p.price,
              isAvailable: true as const,
              updatedAt: parsedDate.toISOString(),
              isStale: ageMs > staleMs,
            };
          })
          .filter((p): p is NonNullable<typeof p> => p !== null);

        if (prices.length === 0) continue;

        // Skip EV-only stations
        const brand = mapNswBrand(stationData.brand);

        results.push({
          id: `nsw:${stationCode}`,
          name: stationData.name,
          address: stationData.address,
          brandId: brand.id,
          latitude: stationData.location.latitude,
          longitude: stationData.location.longitude,
          state: "NSW",
          brand: brand,
          prices,
        });
      }

      nswCache = { data: results, timestamp: Date.now() };
      return results;
    } catch (error) {
      // Stale-while-revalidate
      if (nswCache) {
        console.warn("NSW Fuel API failed, serving stale cache:", error);
        return nswCache.data;
      }
      throw error;
    }
  },
};
