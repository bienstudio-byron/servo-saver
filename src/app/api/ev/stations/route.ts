import { NextResponse } from "next/server";
import { evProvider } from "@/lib/providers/ev-provider";

export const revalidate = 1800; // 30 minutes

export async function GET() {
  try {
    const stations = await evProvider.fetchStations();

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
