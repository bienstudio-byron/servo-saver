import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");
  const fuelType = searchParams.get("fuelType") || "U91";
  const days = parseInt(searchParams.get("days") || "30", 10);

  if (!stationId) {
    return NextResponse.json({ error: "stationId required" }, { status: 400 });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("price_snapshots")
      .select("price, captured_at")
      .eq("station_id", stationId)
      .eq("fuel_type", fuelType)
      .gte("captured_at", since)
      .order("captured_at", { ascending: true });

    if (error) {
      console.error("History query error:", error);
      return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }

    return NextResponse.json({ history: data || [] });
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
