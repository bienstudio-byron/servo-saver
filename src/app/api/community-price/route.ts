import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/** GET — fetch fresh community prices for a station */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get("stationId");

  if (!stationId) {
    return NextResponse.json({ error: "stationId required" }, { status: 400 });
  }

  const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(); // 4hrs

  const { data, error } = await supabase()
    .from("community_prices")
    .select("fuel_type, price, reported_at, confidence")
    .eq("station_id", stationId)
    .eq("expired", false)
    .gte("reported_at", cutoff)
    .order("reported_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }

  // Deduplicate: latest report per fuel type, sum confidence from recent similar reports
  const byFuel = new Map<string, { price: number; reported_at: string; confidence: number }>();
  for (const row of data ?? []) {
    const existing = byFuel.get(row.fuel_type);
    if (!existing) {
      byFuel.set(row.fuel_type, {
        price: Number(row.price),
        reported_at: row.reported_at,
        confidence: row.confidence,
      });
    } else {
      // If another report has a similar price (within 2c), boost confidence
      if (Math.abs(Number(row.price) - existing.price) <= 2) {
        existing.confidence += row.confidence;
      }
    }
  }

  const prices = Array.from(byFuel.entries()).map(([fuelType, v]) => ({
    fuelType,
    price: v.price,
    reportedAt: v.reported_at,
    confidence: v.confidence,
  }));

  return NextResponse.json({ prices });
}

/** POST — submit a community price report */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { stationId, fuelType, price, deviceId } = body;

    // Validate
    if (!stationId || !fuelType || !price || !deviceId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0 || numPrice >= 500) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    // Hash device ID for privacy
    const deviceHash = crypto.createHash("sha256").update(String(deviceId)).digest("hex").slice(0, 16);

    // Rate limit: check if this device already reported this station+fuel in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase()
      .from("community_prices")
      .select("id")
      .eq("device_hash", deviceHash)
      .eq("station_id", stationId)
      .eq("fuel_type", fuelType)
      .gte("reported_at", oneHourAgo)
      .limit(1);

    if (recent && recent.length > 0) {
      return NextResponse.json({ error: "Already reported recently" }, { status: 429 });
    }

    // Insert
    const db = supabase();
    const { error } = await db
      .from("community_prices")
      .insert({
        station_id: stationId,
        fuel_type: fuelType,
        price: numPrice,
        device_hash: deviceHash,
      });

    if (error) {
      console.error("Community price insert error:", error.message);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
