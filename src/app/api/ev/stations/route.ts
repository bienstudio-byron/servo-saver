import { NextResponse } from "next/server";
import { fetchChargefoxStations } from "@/lib/providers/chargefox-provider";
import { fetchTeslaStations } from "@/lib/providers/tesla-provider";
import { fetchJoltStations } from "@/lib/providers/jolt-provider";
import type { StationWithPrices } from "@/types/fuel";

export const dynamic = "force-dynamic"; // always fetch fresh

export async function GET() {
  try {
    // Fetch all networks in parallel
    const results = await Promise.allSettled([
      fetchChargefoxStations(),
      fetchTeslaStations(),
      fetchJoltStations(),
    ]);

    const stations: StationWithPrices[] = [];
    const providerNames = ["Chargefox", "Tesla", "JOLT"];

    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        stations.push(...result.value);
      } else {
        console.error(`${providerNames[i]} EV provider failed:`, result.reason);
      }
    });

    if (stations.length === 0) {
      return NextResponse.json(
        { error: "All EV charging providers failed" },
        { status: 500 }
      );
    }

    // Deduplicate by proximity (stations within 50m are likely the same)
    const deduped = deduplicateStations(stations);

    const slim = deduped.map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      brandId: s.brandId,
      latitude: Math.round(s.latitude * 1e6) / 1e6,
      longitude: Math.round(s.longitude * 1e6) / 1e6,
      state: s.state,
      brand: s.brand,
      prices: s.prices.map((p) => ({
        fuelType: p.fuelType,
        price: p.price,
        updatedAt: p.updatedAt,
        isStale: p.isStale || undefined,
        source: p.source,
      })),
      connections: s.connections,
    }));

    return NextResponse.json({ stations: slim });
  } catch (error) {
    console.error("Failed to fetch EV stations:", error);
    return NextResponse.json(
      { error: "Failed to fetch EV charging data" },
      { status: 500 }
    );
  }
}

// Remove duplicate stations from different providers at the same location
function deduplicateStations(stations: StationWithPrices[]): StationWithPrices[] {
  const result: StationWithPrices[] = [];
  const used = new Set<number>();

  // Prefer Chargefox > Tesla > JOLT > OCM (by data quality)
  const priority = (id: string) => {
    if (id.startsWith("cf:")) return 0;
    if (id.startsWith("tesla:")) return 1;
    if (id.startsWith("jolt:")) return 2;
    return 3;
  };

  const sorted = [...stations].sort((a, b) => priority(a.id) - priority(b.id));

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;
    result.push(sorted[i]);

    // Mark nearby stations from other providers as duplicates
    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue;
      const dist = quickDistance(
        sorted[i].latitude, sorted[i].longitude,
        sorted[j].latitude, sorted[j].longitude
      );
      if (dist < 0.05) { // 50 meters
        used.add(j);
      }
    }
  }

  return result;
}

// Quick distance in km (good enough for dedup)
function quickDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * 111;
  const dLon = (lon2 - lon1) * 111 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}
