import "server-only";
import type { StationWithPrices } from "@/types/fuel";
import type { FuelDataProvider } from "./types";

const OCM_API_BASE = "https://api.openchargemap.io/v3/poi/";
const OCM_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Map OCM connection types to our charger speed categories
function mapChargerSpeed(powerKW: number | null): string | null {
  if (!powerKW || powerKW <= 0) return null;
  if (powerKW <= 22) return "AC";
  if (powerKW <= 150) return "DC";
  return "ULTRA";
}

// Map OCM operator names to canonical brand names
const OPERATOR_MAP: Record<string, string> = {
  "Chargefox Pty Ltd": "Chargefox",
  "Tesla (Destination)": "Tesla",
  "Tesla (Supercharger)": "Tesla",
  "Evie Networks": "Evie",
  "JOLT Charge": "JOLT",
  "AmpCharge (AGL)": "AmpCharge",
  "Ausgrid": "Ausgrid",
  "ChargePoint": "ChargePoint",
  "BP Pulse": "BP Pulse",
  "Shell Recharge": "Shell Recharge",
  "NRMA": "NRMA",
};

const MAJOR_NETWORKS = new Set([
  "Chargefox", "Tesla", "Evie", "JOLT", "AmpCharge",
  "ChargePoint", "BP Pulse", "Shell Recharge", "NRMA",
]);

function mapOperator(name: string): { id: string; name: string; type: "major" | "independent" } {
  const canonical = OPERATOR_MAP[name] ?? name;
  const id = canonical.toLowerCase().replace(/\s+/g, "-");
  const type = MAJOR_NETWORKS.has(canonical) ? "major" : "independent";
  return { id, name: canonical, type };
}

// Parse usage cost string into $/kWh
function parseUsageCost(cost: string | null): number | null {
  if (!cost) return null;
  // Common patterns: "$0.45/kWh", "0.45 per kWh", "$0.45", "Free"
  if (cost.toLowerCase().includes("free")) return 0;
  const match = cost.match(/\$?([\d.]+)\s*(?:\/?\s*kwh|per\s*kwh)?/i);
  if (match) {
    const val = parseFloat(match[1]);
    if (val >= 0 && val < 5) return val; // sanity check
  }
  return null;
}

// Cache
interface CacheEntry {
  data: StationWithPrices[];
  timestamp: number;
}

let cache: CacheEntry | null = null;

export const evProvider: FuelDataProvider = {
  id: "ev",

  async fetchStations(): Promise<StationWithPrices[]> {
    if (cache && Date.now() - cache.timestamp < OCM_CACHE_TTL_MS) {
      return cache.data;
    }

    const apiKey = process.env.OCM_API_KEY;
    if (!apiKey) {
      console.warn("OCM_API_KEY not set — returning empty stations");
      return [];
    }

    try {
      // Fetch AU stations — OCM allows max 10,000 per request
      const res = await fetch(
        `${OCM_API_BASE}?output=json&countrycode=AU&maxresults=10000&compact=true&verbose=false&key=${apiKey}`,
        { headers: { "User-Agent": "ChargeSaver/1.0" } }
      );

      if (!res.ok) {
        throw new Error(`OCM API error: ${res.status} ${res.statusText}`);
      }

      const raw: OCMStation[] = await res.json();
      const results: StationWithPrices[] = [];

      for (const station of raw) {
        const addr = station.AddressInfo;
        if (!addr?.Latitude || !addr?.Longitude) continue;

        // Skip non-operational stations
        const status = station.StatusType?.Title?.toLowerCase() ?? "";
        if (status.includes("removed") || status.includes("not operational")) continue;

        const operator = mapOperator(station.OperatorInfo?.Title ?? "Unknown");
        const usageCost = parseUsageCost(station.UsageCost ?? null);

        // Build prices from connections
        const pricesBySpeed = new Map<string, { price: number; count: number; powerKW: number }>();

        for (const conn of station.Connections ?? []) {
          const speed = mapChargerSpeed(conn.PowerKW ?? null);
          if (!speed) continue;

          const price = usageCost ?? estimatePrice(speed, operator.name);
          const existing = pricesBySpeed.get(speed);
          if (!existing || (conn.PowerKW ?? 0) > existing.powerKW) {
            pricesBySpeed.set(speed, {
              price,
              count: (existing?.count ?? 0) + (conn.Quantity ?? 1),
              powerKW: conn.PowerKW ?? 0,
            });
          }
        }

        if (pricesBySpeed.size === 0) continue;

        const prices = [...pricesBySpeed.entries()].map(([speed, info]) => ({
          fuelType: speed,
          price: Math.round(info.price * 100) / 100, // round to 2dp
          isAvailable: true as const,
          updatedAt: station.DateLastStatusUpdate ?? new Date().toISOString(),
          isStale: false,
          source: usageCost !== null ? "official" as const : "community" as const,
        }));

        const state = addr.StateOrProvince?.toUpperCase().replace(/\s/g, "") ?? "";
        const stateShort = state.includes("VICTORIA") || state === "VIC" ? "VIC"
          : state.includes("NEWSOUTHWALES") || state === "NSW" ? "NSW"
          : state.includes("QUEENSLAND") || state === "QLD" ? "QLD"
          : state.includes("WESTERNAUSTRALIA") || state === "WA" ? "WA"
          : state.includes("SOUTHAUSTRALIA") || state === "SA" ? "SA"
          : state.includes("TASMANIA") || state === "TAS" ? "TAS"
          : state.includes("NORTHERNTERRITORY") || state === "NT" ? "NT"
          : state.includes("AUSTRALIANCAPITALTERRITORY") || state === "ACT" ? "ACT"
          : state;

        results.push({
          id: `ocm:${station.ID}`,
          name: addr.Title || operator.name,
          address: [addr.AddressLine1, addr.Town, stateShort].filter(Boolean).join(", "),
          brandId: operator.id,
          latitude: addr.Latitude,
          longitude: addr.Longitude,
          state: stateShort,
          brand: operator,
          prices,
          connections: (station.Connections ?? [])
            .filter((c) => c.PowerKW && c.PowerKW > 0)
            .map((c) => ({
              type: c.ConnectionType?.Title ?? "Unknown",
              powerKW: c.PowerKW ?? 0,
              quantity: c.Quantity ?? 1,
            })),
        });
      }

      cache = { data: results, timestamp: Date.now() };
      return results;
    } catch (error) {
      if (cache) {
        console.warn("OCM API failed, serving stale cache:", error);
        return cache.data;
      }
      throw error;
    }
  },
};

// Estimated prices when not provided by the station
function estimatePrice(speed: string, network: string): number {
  // Based on typical AU pricing as of 2026
  const estimates: Record<string, Record<string, number>> = {
    JOLT: { AC: 0, DC: 0, ULTRA: 0 }, // JOLT is often free
    Tesla: { AC: 0.35, DC: 0.45, ULTRA: 0.55 },
    Chargefox: { AC: 0.30, DC: 0.40, ULTRA: 0.60 },
    Evie: { AC: 0.30, DC: 0.45, ULTRA: 0.55 },
  };
  const networkPrices = estimates[network];
  if (networkPrices?.[speed] !== undefined) return networkPrices[speed];

  // Generic fallback
  if (speed === "AC") return 0.30;
  if (speed === "DC") return 0.45;
  return 0.55; // ULTRA
}

// OCM API response types (minimal)
interface OCMStation {
  ID: number;
  AddressInfo: {
    Title?: string;
    AddressLine1?: string;
    Town?: string;
    StateOrProvince?: string;
    Latitude: number;
    Longitude: number;
  };
  Connections?: {
    ConnectionType?: { Title?: string };
    PowerKW?: number;
    Quantity?: number;
    StatusType?: { Title?: string };
  }[];
  OperatorInfo?: { Title?: string };
  UsageCost?: string;
  StatusType?: { Title?: string };
  DateLastStatusUpdate?: string;
}
