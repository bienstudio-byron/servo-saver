import type { LatLng } from "@/types/toll";

export interface TfNSWTollResult {
  totalCents: number;
  roads: { name: string; costCents: number }[];
  source: "tfnsw-api";
}

/**
 * Calculate NSW toll costs via our server-side API route.
 * Returns null if the route is not in NSW or the API fails.
 */
export async function calculateNSWTolls(
  polyline: LatLng[],
  departureTime?: Date
): Promise<TfNSWTollResult | null> {
  // Quick check: is this route in NSW?
  const firstPoint = polyline[0];
  const lastPoint = polyline[polyline.length - 1];
  const isNSW =
    (firstPoint.lat > -37.6 && firstPoint.lat < -28 && firstPoint.lng > 140 && firstPoint.lng < 154) ||
    (lastPoint.lat > -37.6 && lastPoint.lat < -28 && lastPoint.lng > 140 && lastPoint.lng < 154);

  if (!isNSW) return null;

  try {
    const res = await fetch("/api/toll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "nsw-tolls",
        polyline,
        departureTime: (departureTime ?? new Date()).toISOString(),
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.totalCents || data.totalCents === 0) return null;
    return data;
  } catch {
    return null;
  }
}
