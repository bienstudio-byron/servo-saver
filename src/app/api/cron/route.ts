import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchMergedStations } from "@/lib/fuel-api";

export const maxDuration = 60;

export async function GET(req: Request) {
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

    const rows = stations.flatMap((s) =>
      s.prices.map((p) => ({
        station_id: s.id,
        fuel_type: p.fuelType,
        price: p.price,
      }))
    );

    // Insert via RPC in batches of 500
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { data, error } = await supabase.rpc("insert_price_snapshots_batch", {
        p_data: batch,
      });
      if (error) {
        console.error("Batch insert error:", error);
      } else {
        inserted += (data as number) || batch.length;
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
