import {
  RouteData,
  UserSettings,
  RouteCost,
  ComparisonResult,
  TollSegment,
} from "@/types/toll";

const CONSUMPTION_MULTIPLIER = { toll: 0.9, free: 1.2 } as const;
const TRAFFIC_MULTIPLIERS = {
  peak: { free: 1.6, toll: 1.15 },
  offPeak: { free: 1.0, toll: 1.0 },
  weekend: { free: 1.0, toll: 1.0 },
} as const;
const WEEKS_PER_YEAR = 52;

export function getCurrentTimePeriod(): "peak" | "offPeak" | "weekend" {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  if (day === 0 || day === 6) return "weekend";
  if ((hour >= 7 && hour < 9) || (hour >= 16 && hour < 19)) return "peak";
  return "offPeak";
}

function adjustDuration(
  baseDuration: number,
  period: "peak" | "offPeak" | "weekend",
  routeType: "toll" | "free"
): number {
  const multipliers = TRAFFIC_MULTIPLIERS[period];
  return Math.round(baseDuration * multipliers[routeType]);
}

function calculateFuelCost(
  distanceKm: number,
  consumptionL100: number,
  fuelPriceCents: number,
  routeType: "toll" | "free"
): number {
  const multiplier = CONSUMPTION_MULTIPLIER[routeType];
  const litres = (distanceKm / 100) * consumptionL100 * multiplier;
  return (litres * fuelPriceCents) / 100;
}

export function calculateRouteCost(
  route: RouteData,
  tollCents: number,
  settings: UserSettings
): RouteCost {
  const routeType = route.isTollRoute ? "toll" : "free";
  const adjustedDuration = adjustDuration(route.duration, settings.timePeriod, routeType);
  const fuelCost = calculateFuelCost(
    route.distance,
    settings.fuelConsumption,
    settings.fuelPriceCentsPerLitre,
    routeType
  );
  const tollCost = tollCents / 100;
  const timeCost = (adjustedDuration / 60) * settings.timeValuePerHour;
  const totalCost = fuelCost + tollCost + timeCost;

  return {
    fuelCost: Math.round(fuelCost * 100) / 100,
    tollCost: Math.round(tollCost * 100) / 100,
    timeCost: Math.round(timeCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    adjustedDuration,
  };
}

export function compareRoutes(
  tollRoute: RouteData,
  freeRoute: RouteData,
  tollSegments: TollSegment[],
  settings: UserSettings,
  tollSource: "tfnsw-live" | "static" = "static"
): ComparisonResult {
  const hasTolls = tollSegments.length > 0;
  const totalTollCents = tollSegments.reduce(
    (sum, seg) => sum + seg.pricing[settings.timePeriod],
    0
  );

  // When no tolls detected, treat both as the same route type (no consumption bias)
  const effectiveTollRoute = hasTolls ? tollRoute : { ...tollRoute, isTollRoute: false };

  const tollCost = calculateRouteCost(effectiveTollRoute, totalTollCents, settings);
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
