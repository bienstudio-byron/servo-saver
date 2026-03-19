import { NextRequest, NextResponse } from "next/server";

// In-memory cache: query → { results, timestamp }
const cache = new Map<string, { results: unknown[]; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_SIZE = 2000;

// Rate limiter: track last request time to respect Nominatim's 1 req/sec
let lastRequestTime = 0;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const mode = request.nextUrl.searchParams.get("mode"); // "search" or "reverse"
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");

  if (mode === "reverse") {
    if (!lat || !lng) {
      return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
    }

    const cacheKey = `rev:${parseFloat(lat).toFixed(3)},${parseFloat(lng).toFixed(3)}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.results);
    }

    // Rate limit: wait if needed
    const now = Date.now();
    const wait = Math.max(0, 1100 - (now - lastRequestTime));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestTime = Date.now();

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { "User-Agent": "PetrolSaver/1.0 (petrolsaver.live)" } }
      );
      if (!res.ok) throw new Error(`Nominatim ${res.status}`);
      const data = await res.json();

      // Cache it
      if (cache.size >= MAX_CACHE_SIZE) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
      }
      cache.set(cacheKey, { results: data, ts: Date.now() });

      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
    }
  }

  // Search mode
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const cacheKey = `s:${q.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.results);
  }

  // Rate limit
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastRequestTime));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestTime = Date.now();

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=au&q=${encodeURIComponent(q + ", Australia")}&limit=5`,
      { headers: { "User-Agent": "PetrolSaver/1.0 (petrolsaver.live)" } }
    );
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const data = await res.json();

    if (cache.size >= MAX_CACHE_SIZE) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    cache.set(cacheKey, { results: data, ts: Date.now() });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
  }
}
