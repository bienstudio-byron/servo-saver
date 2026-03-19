import type { TollSegment, LatLng } from "@/types/toll";
import { haversineDistance } from "@/lib/geo";

// Melbourne
import citylink from "@/data/tolls/melbourne/citylink.json";
import eastlink from "@/data/tolls/melbourne/eastlink.json";
import westGateTunnel from "@/data/tolls/melbourne/west-gate-tunnel.json";

// Sydney
import harbourBridge from "@/data/tolls/sydney/harbour-bridge-tunnel.json";
import m2Hills from "@/data/tolls/sydney/m2-hills.json";
import laneCove from "@/data/tolls/sydney/lane-cove-tunnel.json";
import easternDist from "@/data/tolls/sydney/eastern-distributor.json";
import crossCity from "@/data/tolls/sydney/cross-city-tunnel.json";
import m5SouthWest from "@/data/tolls/sydney/m5-south-west.json";
import westconnexM4 from "@/data/tolls/sydney/westconnex-m4.json";
import westconnexM4M5 from "@/data/tolls/sydney/westconnex-m4-m5-link.json";
import westconnexM8 from "@/data/tolls/sydney/westconnex-m8.json";
import m7Westlink from "@/data/tolls/sydney/m7-westlink.json";
import northconnex from "@/data/tolls/sydney/northconnex.json";

// Brisbane
import gateway from "@/data/tolls/brisbane/gateway-motorway.json";
import clem7 from "@/data/tolls/brisbane/clem7.json";
import legacyWay from "@/data/tolls/brisbane/legacy-way.json";
import goBetween from "@/data/tolls/brisbane/go-between-bridge.json";
import airportLink from "@/data/tolls/brisbane/airportlink-m7.json";
import logan from "@/data/tolls/brisbane/logan-motorway.json";
import toowoomba from "@/data/tolls/brisbane/toowoomba-bypass.json";

interface Gantry {
  id: string;
  name: string;
  position: { lat: number; lng: number };
}

interface TollRoadData {
  id: string;
  name: string;
  gantries: Gantry[];
  segments: TollSegment[];
  tripCap?: { day: number; night: number };
}

const tollRoads: TollRoadData[] = [
  citylink, eastlink, westGateTunnel,
  harbourBridge, m2Hills, laneCove, easternDist, crossCity,
  m5SouthWest, westconnexM4, westconnexM4M5, westconnexM8, m7Westlink, northconnex,
  gateway, clem7, legacyWay, goBetween, airportLink, logan, toowoomba,
] as unknown as TollRoadData[];

/**
 * Core idea: find points on the toll route that are NOT near the free route.
 * These "toll-only" points are the sections where the driver is on a toll road.
 * Then check which toll road corridors those points fall within.
 */

const DIVERGENCE_THRESHOLD_KM = 0.3; // Point is "toll-only" if >300m from any free route point
const CORRIDOR_THRESHOLD_KM = 1.0; // Point is "on" a toll road if within 1km of any of its gantries

function findTollOnlyPoints(tollPolyline: LatLng[], freePolyline: LatLng[]): LatLng[] {
  // For performance, sample the free route into a grid
  const tollOnly: LatLng[] = [];

  for (const tp of tollPolyline) {
    let nearFree = false;
    for (const fp of freePolyline) {
      if (haversineDistance(tp.lat, tp.lng, fp.lat, fp.lng) < DIVERGENCE_THRESHOLD_KM) {
        nearFree = true;
        break;
      }
    }
    if (!nearFree) {
      tollOnly.push(tp);
    }
  }

  return tollOnly;
}

function pointsNearRoad(points: LatLng[], road: TollRoadData): number {
  let count = 0;
  for (const point of points) {
    for (const gantry of road.gantries) {
      if (haversineDistance(point.lat, point.lng, gantry.position.lat, gantry.position.lng) < CORRIDOR_THRESHOLD_KM) {
        count++;
        break; // Count each point once
      }
    }
  }
  return count;
}

export function detectTollSegments(
  tollPolyline: LatLng[],
  freePolyline?: LatLng[]
): TollSegment[] {
  // If no free route provided, fall back to simple gantry detection
  if (!freePolyline || freePolyline.length === 0) {
    return detectByGantryProximity(tollPolyline);
  }

  // Step 1: Find points that are on the toll route but NOT on the free route
  const tollOnlyPoints = findTollOnlyPoints(tollPolyline, freePolyline);

  // If less than 5% of the toll route diverges, routes are essentially identical — no tolls
  const divergenceRatio = tollOnlyPoints.length / tollPolyline.length;
  if (tollOnlyPoints.length === 0 || divergenceRatio < 0.05) {
    return [];
  }

  // Step 2: Check which toll road corridors those toll-only points fall within
  const detectedRoads: { road: TollRoadData; pointCount: number }[] = [];

  for (const road of tollRoads) {
    const count = pointsNearRoad(tollOnlyPoints, road);
    // Need at least 15% of divergent points near the road AND minimum 6 points.
    const minPoints = Math.max(6, Math.round(tollOnlyPoints.length * 0.15));
    if (count >= minPoints) {
      detectedRoads.push({ road, pointCount: count });
    }
  }

  // Step 3: For each detected road, pick the best matching segment
  const result: TollSegment[] = [];

  for (const { road } of detectedRoads) {
    if (road.tripCap) {
      // For trip-cap roads (CityLink): pick the segment with highest price
      // that the route actually matches (both gantries near toll-only points)
      let bestSegment: TollSegment | null = null;
      let bestPrice = 0;

      for (const segment of road.segments) {
        const entry = road.gantries.find((g) => g.id === segment.entryGantry);
        const exit = road.gantries.find((g) => g.id === segment.exitGantry);
        if (!entry || !exit) continue;

        const entryNear = tollOnlyPoints.some(
          (p) => haversineDistance(p.lat, p.lng, entry.position.lat, entry.position.lng) < CORRIDOR_THRESHOLD_KM
        );
        const exitNear = tollOnlyPoints.some(
          (p) => haversineDistance(p.lat, p.lng, exit.position.lat, exit.position.lng) < CORRIDOR_THRESHOLD_KM
        );

        if (entryNear && exitNear) {
          const price = (segment as TollSegment).pricing.peak ?? 0;
          if (price > bestPrice) {
            bestPrice = price;
            bestSegment = segment as TollSegment;
          }
        }
      }

      if (bestSegment) {
        result.push(bestSegment);
      } else {
        // Couldn't match specific segment — use first segment as fallback
        result.push(road.segments[0] as TollSegment);
      }
    } else {
      // For non-trip-cap roads: include all matching segments
      for (const segment of road.segments) {
        const entry = road.gantries.find((g) => g.id === segment.entryGantry);
        const exit = road.gantries.find((g) => g.id === segment.exitGantry);
        if (!entry || !exit) continue;

        const entryNear = tollOnlyPoints.some(
          (p) => haversineDistance(p.lat, p.lng, entry.position.lat, entry.position.lng) < CORRIDOR_THRESHOLD_KM
        );
        const exitNear = tollOnlyPoints.some(
          (p) => haversineDistance(p.lat, p.lng, exit.position.lat, exit.position.lng) < CORRIDOR_THRESHOLD_KM
        );

        if (entryNear && exitNear) {
          result.push(segment as TollSegment);
        }
      }
    }
  }

  return result;
}

/** Simple fallback: check if route passes near gantry pairs */
function detectByGantryProximity(polyline: LatLng[]): TollSegment[] {
  const hitSegments: TollSegment[] = [];

  for (const road of tollRoads) {
    const roadSegments: TollSegment[] = [];

    for (const segment of road.segments) {
      const entry = road.gantries.find((g) => g.id === segment.entryGantry);
      const exit = road.gantries.find((g) => g.id === segment.exitGantry);
      if (!entry || !exit) continue;

      const entryHit = polyline.some(
        (p) => haversineDistance(p.lat, p.lng, entry.position.lat, entry.position.lng) < 0.5
      );
      const exitHit = polyline.some(
        (p) => haversineDistance(p.lat, p.lng, exit.position.lat, exit.position.lng) < 0.5
      );

      if (entryHit && exitHit) {
        roadSegments.push(segment as TollSegment);
      }
    }

    if (road.tripCap && roadSegments.length > 0) {
      const best = roadSegments.reduce((a, b) =>
        (a.pricing.peak ?? 0) > (b.pricing.peak ?? 0) ? a : b
      );
      hitSegments.push(best);
    } else {
      hitSegments.push(...roadSegments);
    }
  }

  return hitSegments;
}

// --- Map marker helpers ---

export interface DetectedTollGantry {
  id: string;
  name: string;
  position: { lat: number; lng: number };
  segmentName: string;
  tollCents: number;
}

/**
 * Returns map markers placed on the toll route where it diverges from the free route.
 * This ensures the price tag appears on the actual toll road section, not at some gantry midpoint.
 */
export function getMarkersForSegments(
  segments: TollSegment[],
  timePeriod: "peak" | "offPeak" | "weekend",
  tollPolyline?: LatLng[],
  freePolyline?: LatLng[]
): DetectedTollGantry[] {
  if (segments.length === 0) return [];

  // If we have both polylines, place markers on the divergent section of the toll route
  if (tollPolyline && freePolyline && tollPolyline.length > 0 && freePolyline.length > 0) {
    // Find toll-only points (on toll route but not near free route)
    const tollOnlyPoints: LatLng[] = [];
    for (const tp of tollPolyline) {
      let nearFree = false;
      for (const fp of freePolyline) {
        if (haversineDistance(tp.lat, tp.lng, fp.lat, fp.lng) < 0.3) {
          nearFree = true;
          break;
        }
      }
      if (!nearFree) tollOnlyPoints.push(tp);
    }

    if (tollOnlyPoints.length > 0) {
      // Place one marker per segment at the midpoint of the divergent section
      // For simplicity, if we have one segment, put it at the middle of the divergent points
      // For multiple segments, spread them evenly
      const markers: DetectedTollGantry[] = [];
      const step = Math.max(1, Math.floor(tollOnlyPoints.length / (segments.length + 1)));

      for (let i = 0; i < segments.length; i++) {
        const pointIndex = Math.min(step * (i + 1), tollOnlyPoints.length - 1);
        const point = tollOnlyPoints[pointIndex];
        const cost = segments[i].pricing[timePeriod] ?? segments[i].pricing.peak ?? 0;

        markers.push({
          id: segments[i].id,
          name: segments[i].name,
          position: { lat: point.lat, lng: point.lng },
          segmentName: segments[i].name,
          tollCents: cost,
        });
      }

      return markers;
    }
  }

  // Fallback: place at gantry midpoints
  const markers: DetectedTollGantry[] = [];
  for (const segment of segments) {
    let entryPos: { lat: number; lng: number } | null = null;
    let exitPos: { lat: number; lng: number } | null = null;

    for (const road of tollRoads) {
      if (!entryPos) { const g = road.gantries.find((g) => g.id === segment.entryGantry); if (g) entryPos = g.position; }
      if (!exitPos) { const g = road.gantries.find((g) => g.id === segment.exitGantry); if (g) exitPos = g.position; }
    }

    const cost = segment.pricing[timePeriod] ?? segment.pricing.peak ?? 0;
    if (entryPos && exitPos) {
      markers.push({
        id: segment.id,
        name: segment.name,
        position: { lat: (entryPos.lat + exitPos.lat) / 2, lng: (entryPos.lng + exitPos.lng) / 2 },
        segmentName: segment.name,
        tollCents: cost,
      });
    }
  }
  return markers;
}
