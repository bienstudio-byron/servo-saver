import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

let trendCache: Record<string, { data: unknown; ts: number }> = {};
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET(req: NextRequest) {
  const fuelType = req.nextUrl.searchParams.get("fuelType") || "U91";

  // Check cache
  const cached = trendCache[fuelType];
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const supabase = getSupabase();

    // Use raw SQL for efficiency — aggregate in the database, not in JS
    const { data: dailyAvgs, error } = await supabase.rpc("get_daily_price_averages", {
      p_fuel_type: fuelType,
      p_days: 7,
    });

    let days: { day: string; avg_price: number }[];

    if (error) {
      console.error("RPC get_daily_price_averages failed:", error.message);

      // Fallback: query with limit and aggregate in JS
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: rawData, error: rawError } = await supabase
        .from("price_snapshots")
        .select("price, captured_at")
        .eq("fuel_type", fuelType)
        .gte("captured_at", sevenDaysAgo)
        .limit(50000); // Safety limit

      if (rawError) {
        console.error("Fallback query failed:", rawError.message);
        return NextResponse.json({ error: "Database error", details: rawError.message }, { status: 500 });
      }

      if (!rawData || rawData.length === 0) {
        return NextResponse.json({ error: "No price data available yet" }, { status: 200 });
      }

      // Group by day
      const byDay = new Map<string, number[]>();
      for (const row of rawData) {
        const day = row.captured_at.slice(0, 10);
        const arr = byDay.get(day) || [];
        arr.push(Number(row.price));
        byDay.set(day, arr);
      }

      days = [...byDay.entries()]
        .map(([day, prices]) => ({
          day,
          avg_price: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 10) / 10,
        }))
        .sort((a, b) => a.day.localeCompare(b.day));
    } else {
      days = (dailyAvgs || []).map((d: { day: string; avg_price: number }) => ({
        day: d.day,
        avg_price: Math.round(Number(d.avg_price) * 10) / 10,
      }));
    }

    if (days.length < 2) {
      return NextResponse.json({ error: "Not enough data — need at least 2 days of snapshots" }, { status: 200 });
    }

    const today = days[days.length - 1];
    const yesterday = days[days.length - 2];
    const weekAgo = days[0];
    const weekAvg = Math.round((days.reduce((s, d) => s + d.avg_price, 0) / days.length) * 10) / 10;

    const changeFromYesterday = Math.round((today.avg_price - yesterday.avg_price) * 10) / 10;
    const changeFromWeekAgo = Math.round((today.avg_price - weekAgo.avg_price) * 10) / 10;

    // Direction from last 3 days
    const recent = days.slice(-3);
    const isRising = recent.length >= 2 && recent[recent.length - 1].avg_price > recent[0].avg_price + 1;
    const isFalling = recent.length >= 2 && recent[recent.length - 1].avg_price < recent[0].avg_price - 1;
    const direction = isRising ? "rising" : isFalling ? "falling" : "stable";

    const diffFromAvg = today.avg_price - weekAvg;
    let urgency: "fill-now" | "wait" | "neutral";
    let message: string;

    if (direction === "rising") {
      urgency = "fill-now";
      message = `Prices rising — fill soon. Up ${Math.abs(changeFromYesterday).toFixed(1)}c since yesterday, ${Math.abs(changeFromWeekAgo).toFixed(1)}c this week.`;
    } else if (direction === "falling") {
      urgency = "wait";
      message = `Prices dropping — wait if you can. Down ${Math.abs(changeFromYesterday).toFixed(1)}c since yesterday.`;
    } else if (diffFromAvg < -3) {
      urgency = "fill-now";
      message = `Prices below average — good time to fill. ${Math.abs(diffFromAvg).toFixed(1)}c below the weekly average.`;
    } else if (diffFromAvg > 3) {
      urgency = "wait";
      message = `Prices above average — wait if you can. ${diffFromAvg.toFixed(1)}c above the weekly average.`;
    } else {
      urgency = "neutral";
      message = "Prices are steady. No strong trend right now.";
    }

    const result = {
      fuelType,
      today: today.avg_price,
      yesterday: yesterday.avg_price,
      weekAgo: weekAgo.avg_price,
      weekAvg,
      dailyAvgs: days,
      direction,
      changeFromYesterday,
      changeFromWeekAgo,
      message,
      urgency,
    };

    trendCache[fuelType] = { data: result, ts: Date.now() };
    return NextResponse.json(result);
  } catch (err) {
    console.error("Price trend error:", err);
    return NextResponse.json({ error: "Failed to compute trend" }, { status: 500 });
  }
}
