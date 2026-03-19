import { NextRequest, NextResponse } from "next/server";

const ORS_KEY = process.env.ORS_API_KEY || "";
const ORS_BASE = "https://api.openrouteservice.org";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  if (!ORS_KEY) {
    return NextResponse.json({ error: "ORS API key not configured" }, { status: 500 });
  }

  // Route request
  if (action === "route") {
    const { origin, destination, avoidTolls } = body;
    if (!origin || !destination) {
      return NextResponse.json({ error: "origin and destination required" }, { status: 400 });
    }

    const orsBody: Record<string, unknown> = {
      coordinates: [
        [origin.lng, origin.lat],
        [destination.lng, destination.lat],
      ],
      radiuses: [2000, 2000],
    };

    if (avoidTolls) {
      orsBody.options = { avoid_features: ["tollways"] };
    }

    const res = await fetch(`${ORS_BASE}/v2/directions/driving-car/geojson`, {
      method: "POST",
      headers: {
        Authorization: ORS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orsBody),
    });

    if (res.status === 403 || res.status === 429) {
      return NextResponse.json({ error: "QUOTA_EXCEEDED" }, { status: 429 });
    }

    if (!res.ok) {
      const text = await res.text();
      try {
        const err = JSON.parse(text);
        if (err.error?.code === 2010) {
          return NextResponse.json({ error: "One of the locations isn't near a road. Try a more specific address." }, { status: 400 });
        }
        return NextResponse.json({ error: err.error?.message || "Routing failed" }, { status: 400 });
      } catch {
        return NextResponse.json({ error: "Routing failed" }, { status: 500 });
      }
    }

    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) {
      return NextResponse.json({ error: "No route found" }, { status: 404 });
    }

    return NextResponse.json({
      distance: Math.round(feature.properties.summary.distance / 100) / 10,
      duration: Math.round(feature.properties.summary.duration / 60),
      polyline: feature.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng })),
    });
  }

  // Geocode request
  if (action === "geocode") {
    const { query } = body;
    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const params = new URLSearchParams({
      api_key: ORS_KEY,
      text: query,
      "boundary.country": "AU",
      "boundary.rect.min_lon": "140.9",
      "boundary.rect.min_lat": "-39.2",
      "boundary.rect.max_lon": "154.0",
      "boundary.rect.max_lat": "-28.0",
      size: "5",
    });

    const res = await fetch(`${ORS_BASE}/geocode/search?${params}`);
    if (!res.ok) return NextResponse.json([]);

    const data = await res.json();
    return NextResponse.json(
      data.features.map((f: { properties: { label: string }; geometry: { coordinates: [number, number] } }) => ({
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        label: f.properties.label,
      }))
    );
  }

  // NSW toll calculation via TfNSW API
  if (action === "nsw-tolls") {
    const TFNSW_KEY = process.env.TFNSW_TOLL_API_KEY || "";
    if (!TFNSW_KEY) return NextResponse.json(null);

    const { polyline, departureTime } = body;
    if (!polyline || !Array.isArray(polyline)) return NextResponse.json(null);

    // Encode polyline to Google format
    let encoded = "";
    let prevLat = 0;
    let prevLng = 0;
    for (const p of polyline) {
      const lat = Math.round(p.lat * 1e5);
      const lng = Math.round(p.lng * 1e5);
      encoded += encodeVal(lat - prevLat) + encodeVal(lng - prevLng);
      prevLat = lat;
      prevLng = lng;
    }

    try {
      const res = await fetch("https://api.transport.nsw.gov.au/v2/roads/toll_calc/match", {
        method: "POST",
        headers: {
          Authorization: `apikey ${TFNSW_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          polyline: encoded,
          vehicleClass: "A",
          departureTime: departureTime || new Date().toISOString(),
        }),
      });

      if (!res.ok) return NextResponse.json(null);

      const data = await res.json();
      const roads: { name: string; costCents: number }[] = [];
      let totalCents = 0;

      if (data.tollCosts && Array.isArray(data.tollCosts)) {
        for (const tc of data.tollCosts) {
          const cost = Math.round((tc.tollAmount ?? 0) * 100);
          if (cost > 0) { roads.push({ name: tc.roadName ?? "NSW Toll", costCents: cost }); totalCents += cost; }
        }
      } else if (typeof data.totalCost === "number") {
        totalCents = Math.round(data.totalCost * 100);
        roads.push({ name: "NSW Tolls", costCents: totalCents });
      }

      if (totalCents === 0) return NextResponse.json(null);
      return NextResponse.json({ totalCents, roads, source: "tfnsw-api" });
    } catch {
      return NextResponse.json(null);
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

function encodeVal(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let encoded = "";
  while (v >= 0x20) { encoded += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; }
  encoded += String.fromCharCode(v + 63);
  return encoded;
}
