const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine distance between two lat/lng points in kilometres */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Sort stations by distance from a point, return nearest N */
export function nearestStations<T extends { latitude: number; longitude: number }>(
  stations: T[],
  lat: number,
  lng: number,
  count: number
): (T & { distance: number })[] {
  return stations
    .map((s) => ({
      ...s,
      distance: haversineDistance(lat, lng, s.latitude, s.longitude),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}
