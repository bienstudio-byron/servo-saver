import {
  RouteData,
  UserSettings,
  RouteCost,
  ComparisonResult,
  TollSegment,
} from "@/types/toll";

const WEEKS_PER_YEAR = 52;

export function getCurrentTimePeriod(): "peak" | "offPeak" | "weekend" {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  if (day === 0 || day === 6) return "weekend";
  if ((hour >= 7 && hour < 9) || (hour >= 16 && hour < 19)) return "peak";
  return "offPeak";
}

/**
 * Fuel cost: simple and honest.
 * distance × consumption × price. No route-type multiplier.
 * The distance difference between routes IS the cost difference.
 */
function calculateFuelCost(
  distanceKm: number,
  consumptionL100: number,
  fuelPriceCents: number
): number {
  const litres = (distanceKm / 100) * consumptionL100;
  return (litres * fuelPriceCents) / 100;
}

/**
 * Travel time: use ORS duration directly.
 * ORS already factors in road types and speed limits.
 * No artificial multipliers — we show the routing engine's estimate as-is.
 */
export function calculateRouteCost(
  route: RouteData,
  tollCents: number,
  settings: UserSettings
): RouteCost {
  const fuelCost = calculateFuelCost(
    route.distance,
    settings.fuelConsumption,
    settings.fuelPriceCentsPerLitre
  );
  const tollCost = tollCents / 100;
  const timeCost = (route.duration / 60) * settings.timeValuePerHour;
  const totalCost = fuelCost + tollCost + timeCost;

  return {
    fuelCost: Math.round(fuelCost * 100) / 100,
    tollCost: Math.round(tollCost * 100) / 100,
    timeCost: Math.round(timeCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    adjustedDuration: route.duration,
  };
}

export function compareRoutes(
  tollRoute: RouteData,
  freeRoute: RouteData,
  tollSegments: TollSegment[],
  settings: UserSettings,
  tollSource: "tfnsw-live" | "static" = "static"
): ComparisonResult {
  const totalTollCents = tollSegments.reduce(
    (sum, seg) => sum + (seg.pricing[settings.timePeriod] ?? seg.pricing.peak ?? 0),
    0
  );

  const tollCost = calculateRouteCost(tollRoute, totalTollCents, settings);
  const freeCost = calculateRouteCost(freeRoute, 0, settings);
  const savings = tollCost.totalCost - freeCost.totalCost;
  const timeDifference = freeCost.adjustedDuration - tollCost.adjustedDuration;
  const annualSavings =
    settings.tripsPerWeek > 0
      ? Math.round(savings * settings.tripsPerWeek * WEEKS_PER_YEAR * 100) / 100
      : null;

  return {
    tollRoute,
    freeRoute,
    tollCost,
    freeCost,
    savings: Math.round(savings * 100) / 100,
    timeDifference: Math.round(timeDifference),
    annualSavings,
    tollBreakdown: tollSegments,
    tollSource,
  };
}
