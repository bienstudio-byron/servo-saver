export interface LatLng {
  lat: number;
  lng: number;
}

export interface Gantry {
  id: string;
  name: string;
  position: LatLng;
}

export interface TollSegment {
  id: string;
  name: string;
  entryGantry: string;
  exitGantry: string;
  pricing: TollPricing;
}

export interface TollPricing {
  peak: number; // cents
  offPeak: number;
  weekend: number;
}

export interface TollRoad {
  id: string;
  name: string;
  operator: string;
  gantries: Gantry[];
  segments: TollSegment[];
}

export interface RouteData {
  distance: number; // km
  duration: number; // minutes (free-flow)
  polyline: LatLng[];
  isTollRoute: boolean;
}

export interface TollDetectionResult {
  segments: TollSegment[];
  totalTollCents: number;
}

export type TimePeriod = "peak" | "offPeak" | "weekend";
export type DayType = "weekday" | "weekend";
export type TimeSlot = "peak" | "shoulder" | "offPeak";

export interface UserSettings {
  fuelConsumption: number; // L/100km
  fuelPriceCentsPerLitre: number;
  timeValuePerHour: number; // $/hr, 0 = don't count
  tripsPerWeek: number; // 0 = one-off
  timePeriod: TimePeriod;
  costModel?: "fuelOnly" | "fullCost"; // "fullCost" = ATO 88c/km rate
}

export interface RouteCost {
  fuelCost: number; // $
  tollCost: number; // $
  timeCost: number; // $
  totalCost: number; // $
  adjustedDuration: number; // minutes (after traffic multiplier)
}

export interface ComparisonResult {
  tollRoute: RouteData;
  freeRoute: RouteData;
  tollCost: RouteCost;
  freeCost: RouteCost;
  savings: number; // $ per trip (positive = free is cheaper)
  timeDifference: number; // minutes (positive = free is slower)
  annualSavings: number | null; // $ if commuter mode
  tollBreakdown: TollSegment[];
  tollSource: "tfnsw-live" | "static"; // how toll was calculated
}

export interface MockRoute {
  id: string;
  name: string;
  origin: LatLng;
  destination: LatLng;
  tollRoute: RouteData;
  freeRoute: RouteData;
  tollSegmentIds: string[];
}
