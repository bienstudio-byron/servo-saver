import "server-only";
import type { StationWithPrices } from "@/types/fuel";

const API_URL = "https://supercharge.info/service/supercharge/allSites";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour (Tesla data changes slowly)

// Tesla pricing ranges (AU, as of 2026)
// Flat rate sites: median ~$0.49/kWh
// ToU sites: $0.35-$0.69/kWh depending on time
const TESLA_DEFAULT_PRICE = 0.55; // conservative middle estimate

interface CacheEntry {
  data: StationWithPrices[];
  timestamp: number;
}

let cache: CacheEntry | null = null;

function mapState(state: string | null): string {
  if (!state) return "";
  const s = state.toUpperCase().trim();
  if (s.includes("VICTORIA") || s === "VIC") return "VIC";
  if (s.includes("NEW SOUTH") || s === "NSW") return "NSW";
  if (s.includes("QUEENSLAND") || s === "QLD") return "QLD";
  if (s.includes("WESTERN") || s === "WA") return "WA";
  if (s.includes("SOUTH AUSTRALIA") || s === "SA") return "SA";
  if (s.includes("TASMANIA") || s === "TAS") return "TAS";
  if (s.includes("NORTHERN") || s === "NT") return "NT";
  if (s.includes("CAPITAL") || s === "ACT") return "ACT";
  return s;
}

export async function fetchTeslaStations(): Promise<StationWithPrices[]> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const res = await fetch(API_URL, {
      headers: { "User-Agent": "ChargeSaver/1.0" },
    });

    if (!res.ok) throw new Error(`Tesla API error: ${res.status}`);

    const allSites: TeslaSite[] = await res.json();
    const auSites = allSites.filter(
      (s) => s.address?.country === "Australia" && s.status === "OPEN"
    );

    const stations: StationWithPrices[] = auSites.map((site) => {
      const speed = (site.powerKilowatt ?? 0) >= 200 ? "ULTRA" : "DC";
      const state = mapState(site.address?.state ?? null);

      return {
        id: `tesla:${site.id}`,
        name: site.name,
        address: [site.address?.street, site.address?.city, state].filter(Boolean).join(", "),
        brandId: "tesla",
        latitude: site.gps.latitude,
        longitude: site.gps.longitude,
        state,
        brand: { id: "tesla", name: "Tesla", type: "major" },
        prices: [{
          fuelType: speed,
          price: TESLA_DEFAULT_PRICE,
          isAvailable: true,
          updatedAt: new Date().toISOString(),
          isStale: false,
          source: "official" as const,
        }],
        connections: [{
          type: site.plugs?.includes("CCS") ? "CCS2" : "Tesla",
          powerKW: site.powerKilowatt ?? 250,
          quantity: site.stallCount ?? 0,
        }],
      };
    });

    cache = { data: stations, timestamp: Date.now() };
    console.log(`Tesla: ${stations.length} AU Superchargers cached`);
    return stations;
  } catch (error) {
    if (cache) {
      console.warn("Tesla fetch failed, serving stale cache:", error);
      return cache.data;
    }
    throw error;
  }
}

interface TeslaSite {
  id: number;
  locationId: number;
  name: string;
  status: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  gps: { latitude: number; longitude: number };
  stallCount?: number;
  powerKilowatt?: number;
  plugs?: string[];
  otherEVs?: boolean;
}
