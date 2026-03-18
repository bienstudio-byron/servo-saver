import "server-only";
import type { StationWithPrices } from "@/types/fuel";

const GRAPHQL_URL = "https://app.chargefox.com/graphql";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Chargefox speed categories → our unified types
function mapSpeed(speed: string): string {
  if (speed === "ultra_rapid") return "ULTRA";
  if (speed === "fast") return "DC";
  return "AC";
}

// Parse price from Chargefox energyDescription like "$0.55 - $0.67/kWh" or "free"
function parsePrice(desc: string | null): number | null {
  if (!desc) return null;
  if (desc.toLowerCase().includes("free")) return 0;
  // Take the first price found
  const match = desc.match(/\$?([\d.]+)/);
  if (match) {
    const val = parseFloat(match[1]);
    if (val >= 0 && val < 5) return val;
  }
  return null;
}

// Cache
interface CacheEntry {
  data: StationWithPrices[];
  timestamp: number;
}

let listCache: CacheEntry | null = null;

// Step 1: Fetch all station locations + speeds
async function fetchAllLocations(): Promise<CFLocation[]> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "ChargeSaver/1.0" },
    body: JSON.stringify({
      variables: {
        ne: { lat: -0.69, lng: 166.74 },
        sw: { lat: -51.66, lng: 100.09 },
      },
      query: `query Locations($sw: GeoLocationInput!, $ne: GeoLocationInput!) {
        locationsByBounds(sw: $sw, ne: $ne) {
          id lat lng chargingSpeed planned chargeStations {
            connectors { status }
          }
        }
      }`,
    }),
  });

  if (!res.ok) throw new Error(`Chargefox list API error: ${res.status}`);
  const data = await res.json();
  return (data.data?.locationsByBounds ?? []).filter((l: CFLocation) => !l.planned);
}

// Step 2: Fetch detail for a single station (pricing, name, connectors)
async function fetchLocationDetail(locationId: string): Promise<CFDetail | null> {
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "ChargeSaver/1.0" },
      body: JSON.stringify({
        variables: { locationId },
        query: `query Location($locationId: ID!) {
          location(id: $locationId) {
            name brandingLogoUrl maxPower address city state
            tetheredConnectors untetheredConnectors
            chargeStations {
              connectors {
                status plug { typeName iconUrl }
              }
            }
            priceRange { timeDescription energyDescription }
          }
        }`,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.location ?? null;
  } catch {
    return null;
  }
}

// Batch fetch details with rate limiting (max 5 concurrent)
async function fetchDetailsInBatches(
  locations: CFLocation[],
  batchSize = 5,
  delayMs = 200
): Promise<Map<string, CFDetail>> {
  const details = new Map<string, CFDetail>();

  for (let i = 0; i < locations.length; i += batchSize) {
    const batch = locations.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((loc) => fetchLocationDetail(loc.id))
    );

    results.forEach((result, idx) => {
      if (result.status === "fulfilled" && result.value) {
        details.set(batch[idx].id, result.value);
      }
    });

    // Small delay between batches to be respectful
    if (i + batchSize < locations.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return details;
}

// Map Australian state names
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

export async function fetchChargefoxStations(): Promise<StationWithPrices[]> {
  // Check cache
  if (listCache && Date.now() - listCache.timestamp < CACHE_TTL_MS) {
    return listCache.data;
  }

  try {
    console.log("Fetching Chargefox stations...");
    const locations = await fetchAllLocations();
    console.log(`Chargefox: ${locations.length} locations found, fetching details...`);

    const details = await fetchDetailsInBatches(locations, 10, 100);
    console.log(`Chargefox: ${details.size} details fetched`);

    const stations: StationWithPrices[] = [];

    for (const loc of locations) {
      const detail = details.get(loc.id);
      const speed = mapSpeed(loc.chargingSpeed);

      // Count available/total connectors
      const allConnectors = loc.chargeStations?.flatMap((cs) => cs.connectors) ?? [];
      const available = allConnectors.filter((c) => c.status === "available").length;
      const total = allConnectors.length;

      // Parse pricing from detail
      const priceStr = detail?.priceRange?.energyDescription ?? null;
      const price = parsePrice(priceStr);

      // Build connector list from detail
      const connectorTypes = new Map<string, { count: number; available: number }>();
      if (detail?.chargeStations) {
        for (const cs of detail.chargeStations) {
          for (const conn of cs.connectors) {
            const typeName = conn.plug?.typeName ?? "unknown";
            const existing = connectorTypes.get(typeName) ?? { count: 0, available: 0 };
            existing.count++;
            if (conn.status === "available") existing.available++;
            connectorTypes.set(typeName, existing);
          }
        }
      }

      const address = detail
        ? [detail.address, detail.city, mapState(detail.state)].filter(Boolean).join(", ")
        : "";

      stations.push({
        id: `cf:${loc.id}`,
        name: detail?.name ?? `Chargefox ${speed}`,
        address,
        brandId: "chargefox",
        latitude: loc.lat,
        longitude: loc.lng,
        state: detail ? mapState(detail.state) : "",
        brand: { id: "chargefox", name: "Chargefox", type: "major" },
        prices: price !== null
          ? [{
              fuelType: speed,
              price,
              isAvailable: available > 0,
              updatedAt: new Date().toISOString(),
              isStale: false,
              source: "official" as const,
            }]
          : [],
        connections: [...connectorTypes.entries()].map(([type, counts]) => ({
          type,
          powerKW: detail?.maxPower ?? 0,
          quantity: counts.count,
        })),
      });
    }

    const filtered = stations.filter((s) => s.prices.length > 0);
    listCache = { data: filtered, timestamp: Date.now() };
    console.log(`Chargefox: ${filtered.length} stations with pricing cached`);
    return filtered;
  } catch (error) {
    if (listCache) {
      console.warn("Chargefox fetch failed, serving stale cache:", error);
      return listCache.data;
    }
    throw error;
  }
}

// Types
interface CFLocation {
  id: string;
  lat: number;
  lng: number;
  chargingSpeed: string;
  planned: boolean;
  chargeStations: {
    connectors: { status: string }[];
  }[];
}

interface CFDetail {
  name: string;
  brandingLogoUrl: string | null;
  maxPower: number;
  address: string | null;
  city: string | null;
  state: string | null;
  tetheredConnectors: string[] | null;
  untetheredConnectors: string[] | null;
  chargeStations: {
    connectors: {
      status: string;
      plug: { typeName: string; iconUrl: string | null };
    }[];
  }[];
  priceRange: {
    timeDescription: string | null;
    energyDescription: string | null;
  } | null;
}
