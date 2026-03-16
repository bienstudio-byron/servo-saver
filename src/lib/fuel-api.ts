import "server-only";
import { v4 as uuidv4 } from "uuid";
import { FUEL_API_BASE_URL, CACHE_TTL_MS } from "./constants";
import {
  pricesResponseSchema,
  brandsResponseSchema,
  fuelTypesResponseSchema,
} from "./validation";
import type {
  FuelBrand,
  FuelType,
  StationWithPrices,
} from "@/types/fuel";

// In-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache: {
  brands?: CacheEntry<FuelBrand[]>;
  fuelTypes?: CacheEntry<FuelType[]>;
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
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Fuel API error: ${res.status} ${res.statusText} for ${path}`);
  }

  return res.json();
}

export async function fetchBrands(): Promise<FuelBrand[]> {
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

export async function fetchFuelTypes(): Promise<FuelType[]> {
  if (isFresh(cache.fuelTypes)) return cache.fuelTypes.data;

  const raw = await apiFetch<unknown>("/fuel/reference-data/types");
  const parsed = fuelTypesResponseSchema.parse(raw);
  const fuelTypes: FuelType[] = parsed.fuelTypes.map((ft) => ({
    id: ft.id,
    name: ft.name,
  }));

  cache.fuelTypes = { data: fuelTypes, timestamp: Date.now() };
  return fuelTypes;
}

export async function fetchMergedStations(): Promise<StationWithPrices[]> {
  if (isFresh(cache.merged)) return cache.merged.data;

  try {
    // The prices endpoint returns station data embedded with prices — one call gets everything
    const [pricesRaw, brands] = await Promise.all([
      apiFetch<unknown>("/fuel/prices"),
      fetchBrands(),
    ]);

    const parsed = pricesResponseSchema.parse(pricesRaw);
    const brandMap = new Map(brands.map((b) => [b.id, b]));

    const merged: StationWithPrices[] = parsed.fuelPriceDetails.map((detail) => ({
      id: detail.fuelStation.id,
      name: detail.fuelStation.name,
      address: detail.fuelStation.address,
      brandId: detail.fuelStation.brandId,
      latitude: detail.fuelStation.location.latitude,
      longitude: detail.fuelStation.location.longitude,
      brand: brandMap.get(detail.fuelStation.brandId) || null,
      prices: detail.fuelPrices
        .filter((p) => p.isAvailable && p.price != null && p.price > 0 && p.price < 500)
        .map((p) => ({
          fuelType: p.fuelType,
          price: p.price as number,
          isAvailable: p.isAvailable,
          updatedAt: p.updatedAt,
        })),
    }));

    cache.merged = { data: merged, timestamp: Date.now() };
    return merged;
  } catch (error) {
    // Stale-while-revalidate: serve last cache if API fails
    if (isStale(cache.merged)) {
      console.warn("Fuel API failed, serving stale cache:", error);
      return cache.merged.data;
    }
    throw error;
  }
}
