import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Rate limiter: max 10 flags per minute per IP
const flagTimes = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60_000;

// In-memory cache of active flags (refreshed every 5 min)
let flagCache: { stationIds: Record<string, { count: number; reasons: string[] }>; ts: number } = { stationIds: {}, ts: 0 };
const CACHE_TTL = 5 * 60 * 1000;

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function hashDevice(deviceId: string): string {
  return createHash("sha256").update(deviceId).digest("hex").slice(0, 16);
}

// GET: Return all actively flagged stations (flags from last 24 hours, aggregated)
export async function GET() {
  const now = Date.now();

  // Return cached if fresh
  if (now - flagCache.ts < CACHE_TTL) {
    return NextResponse.json({ flags: flagCache.stationIds });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("station_flags")
      .select("station_id, reason")
      .gt("expires_at", new Date().toISOString());

    if (error) throw error;

    // Aggregate: count flags per station + collect reasons
    const agg: Record<string, { count: number; reasons: string[] }> = {};
    for (const row of data || []) {
      if (!agg[row.station_id]) agg[row.station_id] = { count: 0, reasons: [] };
      agg[row.station_id].count++;
      if (!agg[row.station_id].reasons.includes(row.reason)) {
        agg[row.station_id].reasons.push(row.reason);
      }
    }

    flagCache = { stationIds: agg, ts: now };
    return NextResponse.json({ flags: agg });
  } catch (err) {
    console.error("Flag fetch error:", err);
    return NextResponse.json({ flags: {} });
  }
}

// POST: Submit a flag
export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();
    const times = flagTimes.get(ip) || [];
    const recent = times.filter((t) => now - t < RATE_WINDOW);
    if (recent.length >= RATE_LIMIT) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    recent.push(now);
    flagTimes.set(ip, recent);

    const { stationName, stationId, reason, deviceId } = await req.json();

    if (!stationName || !stationId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const deviceHash = deviceId ? hashDevice(deviceId) : hashDevice(ip);

    // Write to Supabase
    const supabase = getSupabase();

    // Check if this device already flagged this station (prevent duplicates)
    const { data: existing } = await supabase
      .from("station_flags")
      .select("id")
      .eq("station_id", stationId)
      .eq("device_hash", deviceHash)
      .gt("expires_at", new Date().toISOString())
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabase.from("station_flags").insert({
        station_id: stationId,
        station_name: stationName,
        reason: reason || "Not specified",
        device_hash: deviceHash,
      });

      // Invalidate cache
      flagCache.ts = 0;
    }

    // Also send email notification
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "PetrolSaver <alerts@petrolsaver.live>",
        to: "petrolsaver.live@gmail.com",
        subject: `🚩 ${esc(reason || "Flagged")}: ${esc(stationName)}`,
        html: `
          <div style="font-family: -apple-system, sans-serif; padding: 20px;">
            <h2>Station Flagged</h2>
            <p><strong>Station:</strong> ${esc(stationName)}</p>
            <p><strong>ID:</strong> <code>${esc(stationId)}</code></p>
            <p><strong>Reason:</strong> ${esc(reason || "Not specified")}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          </div>
        `,
      });
    } catch {
      // Email is best-effort, don't fail the request
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Flag error:", error);
    return NextResponse.json({ success: true }); // Don't block the user
  }
}
