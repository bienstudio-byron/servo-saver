import "server-only";
import type { StationWithPrices } from "@/types/fuel";
import type { FuelDataProvider } from "./types";

const FUELWATCH_RSS_BASE = "https://www.fuelwatch.wa.gov.au/fuelwatch/fuelWatchRSS";
const WA_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour (prices are locked 24hrs in WA)

// FuelWatch product codes → PetrolSaver fuel types
const PRODUCT_MAP: { code: number; type: string }[] = [
  { code: 1, type: "U91" },   // Unleaded
  { code: 2, type: "P95" },   // Premium Unleaded 95
  { code: 6, type: "P98" },   // Premium Unleaded 98
  { code: 4, type: "DSL" },   // Diesel
  { code: 5, type: "LPG" },   // LPG
  { code: 11, type: "PDSL" }, // Brand Diesel
];

const MAJOR_BRANDS = new Set([
  "BP", "Shell", "Ampol", "Caltex", "United", "Puma", "Liberty", "Mobil",
  "7-Eleven", "Vibe", "Costco",
]);

function mapBrand(brandName: string): { id: string; name: string; type: "major" | "independent" } {
  const id = brandName.toLowerCase().replace(/\s+/g, "-");
  const type = MAJOR_BRANDS.has(brandName) ? "major" : "independent";
  return { id, name: brandName, type };
}

// Simple XML tag extractor (avoids needing a full XML parser)
function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function extractItems(xml: string): string[] {
  const items: string[] = [];
  const regex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    items.push(match[1]);
  }
  return items;
}

interface WaStation {
  id: string;
  name: string;
  brand: string;
  address: string;
  latitude: number;
  longitude: number;
  prices: Map<string, { price: number; date: string }>;
}

interface CacheEntry { data: StationWithPrices[]; timestamp: number; }
let waCache: CacheEntry | null = null;

export const waProvider: FuelDataProvider = {
  id: "wa",

  async fetchStations(): Promise<StationWithPrices[]> {
    if (waCache && Date.now() - waCache.timestamp < WA_CACHE_TTL_MS) {
      return waCache.data;
    }

    try {
      // Fetch all fuel types in parallel
      const fetches = PRODUCT_MAP.map(async ({ code, type }) => {
        try {
          const res = await fetch(`${FUELWATCH_RSS_BASE}?Product=${code}&Day=today`, {
            headers: { "User-Agent": "PetrolSaver/1.0 (petrolsaver.live)" },
          });
          if (!res.ok) return { type, items: [] };
          const xml = await res.text();
          return { type, items: extractItems(xml) };
        } catch {
          return { type, items: [] };
        }
      });

      const results = await Promise.all(fetches);

      // Build station map — merge prices from different fuel types
      const stationMap = new Map<string, WaStation>();

      for (const { type, items } of results) {
        for (const itemXml of items) {
          const tradingName = extractTag(itemXml, "trading-name");
          const brand = extractTag(itemXml, "brand");
          const price = parseFloat(extractTag(itemXml, "price"));
          const address = extractTag(itemXml, "address");
          const location = extractTag(itemXml, "location");
          const lat = parseFloat(extractTag(itemXml, "latitude"));
          const lng = parseFloat(extractTag(itemXml, "longitude"));
          const date = extractTag(itemXml, "date");

          if (!tradingName || isNaN(price) || price <= 0 || price >= 500) continue;
          if (isNaN(lat) || isNaN(lng)) continue;

          // Use lat+lng as a stable ID (FuelWatch doesn't provide station codes)
          const stationId = `${lat.toFixed(4)}_${lng.toFixed(4)}`;

          let station = stationMap.get(stationId);
          if (!station) {
            station = {
              id: stationId,
              name: tradingName,
              brand: brand || tradingName.split(" ")[0],
              address: `${address}, ${location}`,
              latitude: lat,
              longitude: lng,
              prices: new Map(),
            };
            stationMap.set(stationId, station);
          }

          // Price in FuelWatch is in cents per litre
          station.prices.set(type, { price, date });
        }
      }

      // Convert to StationWithPrices
      const stations: StationWithPrices[] = [];
      for (const [stationId, s] of stationMap) {
        const prices = Array.from(s.prices.entries()).map(([fuelType, { price, date }]) => ({
          fuelType,
          price,
          isAvailable: true as const,
          updatedAt: new Date(date).toISOString() || new Date().toISOString(),
          isStale: false, // WA prices are locked for 24hrs, always "fresh"
          source: "official" as const,
        }));

        if (prices.length === 0) continue;

        const brand = mapBrand(s.brand);
        stations.push({
          id: `wa:${stationId}`,
          name: s.name,
          address: s.address,
          brandId: brand.id,
          latitude: s.latitude,
          longitude: s.longitude,
          state: "WA",
          brand,
          prices,
        });
      }

      waCache = { data: stations, timestamp: Date.now() };
      console.log(`WA provider: ${stations.length} stations loaded`);
      return stations;
    } catch (error) {
      if (waCache) {
        console.warn("WA FuelWatch failed, serving stale cache:", error);
        return waCache.data;
      }
      console.error("WA provider failed:", error);
      return [];
    }
  },
};
