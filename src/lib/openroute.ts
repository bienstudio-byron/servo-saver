export interface ORSRoute {
  distance: number; // km
  duration: number; // minutes
  polyline: { lat: number; lng: number }[];
}

export async function getRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  avoidTolls: boolean
): Promise<ORSRoute> {
  const res = await fetch("/api/toll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "route", origin, destination, avoidTolls }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Routing failed");
  }

  return data;
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  label: string;
}

export async function geocode(query: string): Promise<GeocodingResult[]> {
  const res = await fetch("/api/toll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "geocode", query }),
  });

  if (!res.ok) return [];
  return res.json();
}
