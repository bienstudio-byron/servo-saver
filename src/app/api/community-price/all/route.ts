import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** GET — fetch all non-expired community prices (for client-side merge) */
export async function GET() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("community_prices")
    .select("station_id, fuel_type, price, reported_at")
    .eq("expired", false)
    .order("reported_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }

  // Deduplicate: keep only the latest report per station+fuel_type
  const seen = new Set<string>();
  const prices: { stationId: string; fuelType: string; price: number; reportedAt: string }[] = [];
  for (const row of data ?? []) {
    const key = `${row.station_id}:${row.fuel_type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    prices.push({
      stationId: row.station_id,
      fuelType: row.fuel_type,
      price: Number(row.price),
      reportedAt: row.reported_at,
    });
  }

  return NextResponse.json({ prices });
}
