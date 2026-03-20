import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const flagTimes = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60_000;

let flagCache: { stationIds: Record<string, { count: number; reasons: string[] }>; ts: number } = { stationIds: {}, ts: 0 };
const CACHE_TTL = 5 * 60 * 1000;

function hashDevice(deviceId: string): string {
  return createHash("sha256").update(deviceId).digest("hex").slice(0, 16);
}

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// GET: Return all actively flagged stations
export async function GET() {
  const now = Date.now();
  if (now - flagCache.ts < CACHE_TTL) {
    return NextResponse.json({ flags: flagCache.stationIds });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("get_active_flags");

    if (error) {
      console.error("get_active_flags error:", error.message);
      return NextResponse.json({ flags: {} });
    }

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
    try {
      const supabase = getSupabase();
      const { error: insertError } = await supabase.rpc("insert_station_flag", {
        p_station_id: stationId,
        p_station_name: stationName,
        p_reason: reason || "Not specified",
        p_device_hash: deviceHash,
      });
      if (insertError) console.error("insert_station_flag error:", insertError.message);
      else flagCache.ts = 0;
    } catch (dbErr) {
      console.error("Supabase flag write failed:", dbErr);
    }

    // Email notification (best-effort)
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "PetrolSaver <alerts@petrolsaver.live>",
        to: "petrolsaver.live@gmail.com",
        subject: `🚩 ${esc(reason || "Flagged")}: ${esc(stationName)}`,
        html: `<div style="font-family:-apple-system,sans-serif;padding:20px;"><h2>Station Flagged</h2><p><strong>Station:</strong> ${esc(stationName)}</p><p><strong>ID:</strong> <code>${esc(stationId)}</code></p><p><strong>Reason:</strong> ${esc(reason || "Not specified")}</p><p><strong>Time:</strong> ${new Date().toISOString()}</p></div>`,
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Flag error:", error);
    return NextResponse.json({ success: true });
  }
}
