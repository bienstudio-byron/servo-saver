import "server-only";
import { z } from "zod";
import type { StationWithPrices } from "@/types/fuel";
import type { FuelDataProvider } from "./types";

// TAS uses the same FuelCheck API as NSW
// v2 endpoint serves both NSW and TAS combined
const TAS_API_BASE = "https://api.onegov.nsw.gov.au/FuelCheckApp/v2/fuel";
const TAS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Fuel type mapping (same as NSW)
const FUEL_TYPE_MAP: Record<string, string> = {
  E10: "E10", U91: "U91", P95: "P95", P98: "P98",
  DL: "DSL", PDL: "PDSL", LPG: "LPG", B20: "B20", E85: "E85",
};

function mapFuelType(code: string): string | null {
  if (code === "EV") return null;
  return FUEL_TYPE_MAP[code] ?? null;
}

const MAJOR_BRANDS = new Set([
  "BP", "Shell", "Ampol", "Caltex", "United", "Puma", "Liberty", "Mobil",
]);

function mapBrand(brandName: string): { id: string; name: string; type: "major" | "independent" } {
  const id = brandName.toLowerCase().replace(/\s+/g, "-");
  const type = MAJOR_BRANDS.has(brandName) ? "major" : "independent";
  return { id, name: brandName, type };
}

function parseDate(dateStr: string): Date {
  const [datePart, timePart] = dateStr.split(" ");
  if (!datePart || !timePart) return new Date(dateStr);
  const [day, month, year] = datePart.split("/");
  const monthNum = parseInt(month, 10);
  const offset = (monthNum >= 4 && monthNum <= 9) ? "+10:00" : "+11:00";
  return new Date(`${year}-${month}-${day}T${timePart}${offset}`);
}

const stationSchema = z.object({
  code: z.string(),
  name: z.string(),
  brand: z.string(),
  address: z.string().default(""),
  location: z.object({ latitude: z.number(), longitude: z.number() }),
  state: z.string().optional(),
});

const priceSchema = z.object({
  stationcode: z.string(),
  fueltype: z.string(),
  price: z.number(),
  lastupdated: z.string(),
});

const fullResponseSchema = z.object({
  stations: z.array(stationSchema),
  prices: z.array(priceSchema),
});

interface CacheEntry { data: StationWithPrices[]; timestamp: number; }
let tasCache: CacheEntry | null = null;

function formatTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// Tasmania is roughly lat -40 to -44
function isTasStation(lat: number): boolean {
  return lat < -39.5;
}

export const tasProvider: FuelDataProvider = {
  id: "tas",

  async fetchStations(): Promise<StationWithPrices[]> {
    if (tasCache && Date.now() - tasCache.timestamp < TAS_CACHE_TTL_MS) {
      return tasCache.data;
    }

    try {
      // Try v2 first (includes TAS), fall back to v1
      let res = await fetch(`${TAS_API_BASE}/prices`, {
        headers: { "Content-Type": "application/json", requesttimestamp: formatTimestamp() },
      });

      // If v2 fails, try v1 (which might still have TAS data)
      if (!res.ok) {
        res = await fetch("https://api.onegov.nsw.gov.au/FuelCheckApp/v1/fuel/prices", {
          headers: { "Content-Type": "application/json", requesttimestamp: formatTimestamp() },
        });
      }

      if (!res.ok) throw new Error(`TAS Fuel API error: ${res.status}`);

      const raw = await res.json();
      const parsed = fullResponseSchema.parse(raw);

      const stationMap = new Map<string, z.infer<typeof stationSchema>>();
      for (const s of parsed.stations) stationMap.set(s.code, s);

      const pricesByStation = new Map<string, z.infer<typeof priceSchema>[]>();
      for (const p of parsed.prices) {
        const arr = pricesByStation.get(p.stationcode) || [];
        arr.push(p);
        pricesByStation.set(p.stationcode, arr);
      }

      const results: StationWithPrices[] = [];

      for (const [code, station] of stationMap) {
        // Only include TAS stations (filter by latitude or state field)
        const isTas = station.state?.toUpperCase() === "TAS" || isTasStation(station.location.latitude);
        if (!isTas) continue;

        const rawPrices = pricesByStation.get(code) || [];
        const prices = rawPrices
          .map((p) => {
            const mappedType = mapFuelType(p.fueltype);
            if (!mappedType || p.price <= 0 || p.price >= 500) return null;
            const parsedDate = parseDate(p.lastupdated);
            return {
              fuelType: mappedType,
              price: p.price,
              isAvailable: true as const,
              updatedAt: parsedDate.toISOString(),
              isStale: Date.now() - parsedDate.getTime() > 14 * 24 * 60 * 60 * 1000,
              source: "official" as const,
            };
          })
          .filter((p): p is NonNullable<typeof p> => p !== null);

        if (prices.length === 0) continue;

        const brand = mapBrand(station.brand);
        results.push({
          id: `tas:${code}`,
          name: station.name,
          address: station.address,
          brandId: brand.id,
          latitude: station.location.latitude,
          longitude: station.location.longitude,
          state: "TAS",
          brand,
          prices,
        });
      }

      tasCache = { data: results, timestamp: Date.now() };
      console.log(`TAS provider: ${results.length} stations loaded`);
      return results;
    } catch (error) {
      if (tasCache) {
        console.warn("TAS Fuel API failed, serving stale cache:", error);
        return tasCache.data;
      }
      console.error("TAS provider failed:", error);
      return []; // Don't throw — let other providers still work
    }
  },
};
