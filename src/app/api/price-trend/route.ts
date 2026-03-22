import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Cache the trend data for 1 hour
let trendCache: { data: TrendData; ts: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000;

interface DayAvg {
  day: string;
  avg_price: number;
}

interface TrendData {
  fuelType: string;
  today: number;
  yesterday: number;
  weekAgo: number;
  weekAvg: number;
  dailyAvgs: DayAvg[];
  direction: "rising" | "falling" | "stable";
  changeFromYesterday: number;
  changeFromWeekAgo: number;
  message: string;
  urgency: "fill-now" | "wait" | "neutral";
}

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET(req: NextRequest) {
  const fuelType = req.nextUrl.searchParams.get("fuelType") || "U91";

  const cacheKey = `trend-${fuelType}`;
  if (trendCache && trendCache.ts > Date.now() - CACHE_TTL) {
    return NextResponse.json(trendCache.data);
  }

  try {
    const supabase = getSupabase();

    const { data, error } = await supabase.rpc("get_price_trend", {
      p_fuel_type: fuelType,
    });

    // If RPC doesn't exist yet, fall back to raw query approach
    if (error) {
      console.error("get_price_trend RPC error:", error.message);

      // Fallback: direct table query
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: rawData, error: rawError } = await supabase
        .from("price_snapshots")
        .select("price, captured_at")
        .eq("fuel_type", fuelType)
        .gte("captured_at", sevenDaysAgo)
        .order("captured_at", { ascending: true });

      if (rawError || !rawData || rawData.length === 0) {
        return NextResponse.json({ error: "No data" }, { status: 404 });
      }

      // Group by day
      const byDay = new Map<string, number[]>();
      for (const row of rawData) {
        const day = row.captured_at.slice(0, 10);
        const arr = byDay.get(day) || [];
        arr.push(Number(row.price));
        byDay.set(day, arr);
      }

      const dailyAvgs: DayAvg[] = [...byDay.entries()]
        .map(([day, prices]) => ({
          day,
          avg_price: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 10) / 10,
        }))
        .sort((a, b) => a.day.localeCompare(b.day));

      if (dailyAvgs.length < 2) {
        return NextResponse.json({ error: "Not enough data" }, { status: 404 });
      }

      const today = dailyAvgs[dailyAvgs.length - 1];
      const yesterday = dailyAvgs[dailyAvgs.length - 2];
      const weekAgo = dailyAvgs[0];
      const weekAvg = Math.round((dailyAvgs.reduce((s, d) => s + d.avg_price, 0) / dailyAvgs.length) * 10) / 10;

      const changeFromYesterday = Math.round((today.avg_price - yesterday.avg_price) * 10) / 10;
      const changeFromWeekAgo = Math.round((today.avg_price - weekAgo.avg_price) * 10) / 10;

      // Detect direction from last 3 days
      const recent = dailyAvgs.slice(-3);
      const isRising = recent.length >= 2 && recent[recent.length - 1].avg_price > recent[0].avg_price + 1;
      const isFalling = recent.length >= 2 && recent[recent.length - 1].avg_price < recent[0].avg_price - 1;

      const direction: "rising" | "falling" | "stable" = isRising ? "rising" : isFalling ? "falling" : "stable";

      // Today vs week average
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
        message = `Prices are average. No strong trend right now.`;
      }

      const result: TrendData = {
        fuelType,
        today: today.avg_price,
        yesterday: yesterday.avg_price,
        weekAgo: weekAgo.avg_price,
        weekAvg,
        dailyAvgs,
        direction,
        changeFromYesterday,
        changeFromWeekAgo,
        message,
        urgency,
      };

      trendCache = { data: result, ts: Date.now() };
      return NextResponse.json(result);
    }

    // RPC returned data directly
    trendCache = { data: data as TrendData, ts: Date.now() };
    return NextResponse.json(data);
  } catch (err) {
    console.error("Price trend error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
