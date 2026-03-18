import "server-only";
import type { StationWithPrices } from "@/types/fuel";

const PAGE_URL = "https://joltcharge.com/au/find-a-charger/";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// JOLT pricing: free first 7kWh/day (+$1.99 service fee), then ~$0.46/kWh
const JOLT_PRICE_PER_KWH = 0.46;

interface CacheEntry {
  data: StationWithPrices[];
  timestamp: number;
}

let cache: CacheEntry | null = null;

export async function fetchJoltStations(): Promise<StationWithPrices[]> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const res = await fetch(PAGE_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
    });

    if (!res.ok) throw new Error(`JOLT page fetch error: ${res.status}`);

    const html = await res.text();

    // Extract station data from inline JSON — pattern: {id:N,name:"...",lat:N,lng:N,...}
    const stationRegex = /\{"id":\d+,"name":"[^"]*","description":"[^"]*","address":"[^"]*","image":"[^"]*","lat":-?[\d.]+,"lng":-?[\d.]+,"status":"[^"]*","networkStatus":"[^"]*","evseStatus":"[^"]*"\}/g;
    const matches = html.match(stationRegex);

    if (!matches || matches.length === 0) {
      console.warn("JOLT: No station data found in page HTML");
      if (cache) return cache.data;
      return [];
    }

    const stations: StationWithPrices[] = [];

    for (const match of matches) {
      try {
        const s: JoltStation = JSON.parse(match);
        if (s.status !== "active") continue;

        // Extract state from address (e.g. "123 St, Suburb VIC 3000")
        const stateMatch = s.address.match(/\b(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\b/i);
        const state = stateMatch ? stateMatch[1].toUpperCase() : "";

        const isAvailable = s.evseStatus === "available" || s.networkStatus === "available";

        stations.push({
          id: `jolt:${s.id}`,
          name: s.description || s.name,
          address: s.address,
          brandId: "jolt",
          latitude: s.lat,
          longitude: s.lng,
          state,
          brand: { id: "jolt", name: "JOLT", type: "major" },
          prices: [{
            fuelType: "DC",
            price: JOLT_PRICE_PER_KWH,
            isAvailable,
            updatedAt: new Date().toISOString(),
            isStale: false,
            source: "official" as const,
          }],
          connections: [{
            type: "CCS2",
            powerKW: 50,
            quantity: 1,
          }],
        });
      } catch {
        // Skip malformed entries
      }
    }

    cache = { data: stations, timestamp: Date.now() };
    console.log(`JOLT: ${stations.length} stations cached`);
    return stations;
  } catch (error) {
    if (cache) {
      console.warn("JOLT fetch failed, serving stale cache:", error);
      return cache.data;
    }
    throw error;
  }
}

interface JoltStation {
  id: number;
  name: string;
  description: string;
  address: string;
  image: string;
  lat: number;
  lng: number;
  status: string;
  networkStatus: string;
  evseStatus: string;
}
