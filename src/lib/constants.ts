// Map defaults
export const MAP_CENTER: [number, number] = [-37.8136, 144.9631]; // Melbourne
export const MAP_ZOOM = 8;
export const MAP_MIN_ZOOM = 6;
export const MAP_MAX_ZOOM = 18;

// Victoria bounding box
export const VICTORIA_BOUNDS: [[number, number], [number, number]] = [
  [-34.0, 140.9], // NW corner
  [-39.2, 150.0], // SE corner
];

// Fuel type display labels
export const FUEL_TYPE_LABELS: Record<string, string> = {
  U91: "Unleaded 91",
  P95: "Premium 95",
  P98: "Premium 98",
  DSL: "Diesel",
  PDSL: "Premium Diesel",
  E10: "Ethanol E10",
  E85: "Ethanol E85",
  B20: "Biodiesel B20",
  LPG: "LPG",
  LNG: "LNG",
  CNG: "CNG",
};

export const DEFAULT_FUEL_TYPE = "U91";

// Price quartile colors (for map markers)
export const PRICE_COLORS = {
  cheap: "#22c55e", // green-500
  mid: "#f59e0b", // amber-500
  expensive: "#ef4444", // red-500
  unknown: "#6b7280", // gray-500
} as const;

// API
export const FUEL_API_BASE_URL =
  "https://api.fuel.service.vic.gov.au/open-data/v1";
export const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Calculator defaults
export const DEFAULT_TANK_SIZE = 50; // litres
export const DEFAULT_FUEL_CONSUMPTION = 8.5; // L/100km
export const WEEKS_PER_YEAR = 52;
