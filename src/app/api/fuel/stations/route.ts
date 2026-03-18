import { NextResponse } from "next/server";
import { fetchMergedStations } from "@/lib/fuel-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stations = await fetchMergedStations();

    // Strip isAvailable (always true after filtering) and truncate coordinates
    // to reduce payload size (~2.8MB → ~2.0MB)
    const slim = stations.map((s) => ({
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
    }));

    return NextResponse.json({ stations: slim });
  } catch (error) {
    console.error("Failed to fetch stations:", error);
    return NextResponse.json(
      { error: "Failed to fetch fuel data" },
      { status: 500 }
    );
  }
}
