import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchMergedStations } from "@/lib/fuel-api";

export const maxDuration = 60;

export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const stations = await fetchMergedStations();

    // Build snapshot rows — one per station per fuel type
    const rows = stations.flatMap((s) =>
      s.prices.map((p) => ({
        station_id: s.id,
        fuel_type: p.fuelType,
        price: p.price,
        captured_at: new Date().toISOString(),
      }))
    );

    // Insert in batches of 1000
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 1000) {
      const batch = rows.slice(i, i + 1000);
      const { error } = await supabase.from("price_snapshots").insert(batch);
      if (error) {
        console.error("Supabase insert error:", error);
      } else {
        inserted += batch.length;
      }
    }

    return NextResponse.json({
      success: true,
      stations: stations.length,
      prices: inserted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
