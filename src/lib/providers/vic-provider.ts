import "server-only";
import { v4 as uuidv4 } from "uuid";
import { FUEL_API_BASE_URL, CACHE_TTL_MS } from "../constants";
import {
  pricesResponseSchema,
  brandsResponseSchema,
} from "../validation";
import type { FuelBrand, StationWithPrices } from "@/types/fuel";
import type { FuelDataProvider } from "./types";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache: {
  brands?: CacheEntry<FuelBrand[]>;
  merged?: CacheEntry<StationWithPrices[]>;
} = {};

function isFresh<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

function isStale<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  return !!entry && !isFresh(entry);
}

const CONSUMER_ID = process.env.FUEL_API_CONSUMER_ID;

async function apiFetch<T>(path: string): Promise<T> {
  if (!CONSUMER_ID) {
    throw new Error("FUEL_API_CONSUMER_ID environment variable is not set");
  }

  const res = await fetch(`${FUEL_API_BASE_URL}${path}`, {
    headers: {
      "User-Agent": "PetrolSaver/1.0",
      "x-consumer-id": CONSUMER_ID,
      "x-transactionid": uuidv4(),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Fuel API error: ${res.status} ${res.statusText} for ${path}`);
  }

  return res.json();
}

async function fetchBrands(): Promise<FuelBrand[]> {
  if (isFresh(cache.brands)) return cache.brands.data;

  const raw = await apiFetch<unknown>("/fuel/reference-data/brands");
  const parsed = brandsResponseSchema.parse(raw);
  const brands: FuelBrand[] = parsed.brands.map((b) => ({
    id: b.id,
    name: b.name,
    type: b.type as "major" | "independent",
  }));

  cache.brands = { data: brands, timestamp: Date.now() };
  return brands;
}

export const vicProvider: FuelDataProvider = {
  id: "vic",

  async fetchStations(): Promise<StationWithPrices[]> {
    if (isFresh(cache.merged)) return cache.merged.data;

    try {
      const [pricesRaw, brands] = await Promise.all([
        apiFetch<unknown>("/fuel/prices"),
        fetchBrands(),
      ]);

      const parsed = pricesResponseSchema.parse(pricesRaw);
      const brandMap = new Map(brands.map((b) => [b.id, b]));

      const merged: StationWithPrices[] = parsed.fuelPriceDetails.map((detail) => ({
        id: `vic:${detail.fuelStation.id}`,
        name: detail.fuelStation.name,
        address: detail.fuelStation.address,
        brandId: detail.fuelStation.brandId,
        latitude: detail.fuelStation.location.latitude,
        longitude: detail.fuelStation.location.longitude,
        state: "VIC" as const,
        brand: brandMap.get(detail.fuelStation.brandId) || null,
        prices: detail.fuelPrices
          .filter((p) => {
            if (!p.isAvailable || p.price == null || p.price <= 0 || p.price >= 500) return false;
            return true;
          })
          .map((p) => {
            const ageMs = Date.now() - new Date(p.updatedAt).getTime();
            const staleMs = 3 * 24 * 60 * 60 * 1000; // 3 days
            return {
              fuelType: p.fuelType,
              price: p.price as number,
              isAvailable: p.isAvailable,
              updatedAt: p.updatedAt,
              isStale: ageMs > staleMs,
            };
          }),
      }));

      const filtered = merged.filter((s) => s.prices.length > 0);
      cache.merged = { data: filtered, timestamp: Date.now() };
      return filtered;
    } catch (error) {
      if (isStale(cache.merged)) {
        console.warn("VIC Fuel API failed, serving stale cache:", error);
        return cache.merged.data;
      }
      throw error;
    }
  },
};

// Re-export brands and fuel types for API routes that need them
export { fetchBrands };
export async function fetchFuelTypes() {
  const { fuelTypesResponseSchema } = await import("../validation");
  const raw = await apiFetch<unknown>("/fuel/reference-data/types");
  const parsed = fuelTypesResponseSchema.parse(raw);
  return parsed.fuelTypes.map((ft) => ({ id: ft.id, name: ft.name }));
}
