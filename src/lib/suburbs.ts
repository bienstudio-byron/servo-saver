import type { StationWithPrices } from "@/types/fuel";

/**
 * Extract suburb from address.
 * VIC format: "123 Street, SUBURB, 3000" → pick second-to-last segment
 * NSW format: "123 Street, SUBURB NSW 2000" → pick last segment, strip state + postcode
 */
export function extractSuburb(address: string): string {
  const parts = address.split(",").map((s) => s.trim());

  if (parts.length >= 3) {
    // VIC-style: "street, SUBURB, postcode"
    return parts[parts.length - 2];
  }

  if (parts.length === 2) {
    // NSW-style: "street, SUBURB NSW 2000"
    const last = parts[1];
    // Strip trailing state abbreviation + postcode (e.g. " NSW 2000", " VIC 3000")
    const match = last.match(/^(.+?)\s+(?:NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\s+\d{4}$/i);
    if (match) return match[1].trim();
    return last;
  }

  return address;
}

/** Convert suburb name to URL slug: "SOUTH YARRA" → "south-yarra" */
export function suburbToSlug(suburb: string): string {
  return suburb
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Convert URL slug back to display name: "south-yarra" → "South Yarra" */
export function slugToDisplay(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Group stations by suburb — normalised to uppercase to prevent duplicates */
export function groupBySuburb(
  stations: StationWithPrices[]
): Map<string, StationWithPrices[]> {
  const map = new Map<string, StationWithPrices[]>();
  for (const station of stations) {
    const raw = extractSuburb(station.address);
    if (!raw) continue;
    const normalised = raw.toUpperCase();
    const existing = map.get(normalised) || [];
    existing.push(station);
    map.set(normalised, existing);
  }
  return map;
}

/** Get all unique suburb slugs */
export function getAllSuburbSlugs(stations: StationWithPrices[]): string[] {
  const suburbs = new Set<string>();
  for (const station of stations) {
    const suburb = extractSuburb(station.address);
    if (suburb) suburbs.add(suburbToSlug(suburb));
  }
  return [...suburbs].sort();
}
