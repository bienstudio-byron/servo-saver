import { create } from "zustand";
import type {
  ComparisonResult,
  TimePeriod,
  UserSettings,
  RouteData,
} from "@/types/toll";
import { getCurrentTimePeriod, compareRoutes } from "@/lib/toll-calculator";
import { getRoute, geocode, type GeocodingResult, type ORSRoute } from "@/lib/openroute";
import { detectTollSegments } from "@/lib/toll-detector";
import { calculateNSWTolls } from "@/lib/tfnsw-toll";

interface TollStore {
  // Origin / destination
  originQuery: string;
  destQuery: string;
  originResults: GeocodingResult[];
  destResults: GeocodingResult[];
  origin: GeocodingResult | null;
  destination: GeocodingResult | null;

  // Routing state
  loading: boolean;
  error: string | null;
  quotaExceeded: boolean;
  tollRouteData: RouteData | null;
  freeRouteData: RouteData | null;

  // Settings
  settings: UserSettings;
  comparison: ComparisonResult | null;

  // Actions
  setOriginQuery: (q: string) => void;
  setDestQuery: (q: string) => void;
  searchOrigin: () => Promise<void>;
  searchDest: () => Promise<void>;
  selectOrigin: (result: GeocodingResult) => void;
  selectDest: (result: GeocodingResult) => void;
  compare: () => Promise<void>;
  updateSettings: (partial: Partial<UserSettings>) => void;
}

function orsToRouteData(ors: ORSRoute, isToll: boolean): RouteData {
  return {
    distance: ors.distance,
    duration: ors.duration,
    polyline: ors.polyline,
    isTollRoute: isToll,
  };
}

export const useTollStore = create<TollStore>((set, get) => ({
  originQuery: "",
  destQuery: "",
  originResults: [],
  destResults: [],
  origin: null,
  destination: null,
  loading: false,
  error: null,
  quotaExceeded: false,
  tollRouteData: null,
  freeRouteData: null,
  settings: {
    fuelConsumption: 8.5,
    fuelPriceCentsPerLitre: 175,
    timeValuePerHour: 0,
    tripsPerWeek: 0,
    timePeriod: getCurrentTimePeriod(),
  },
  comparison: null,

  setOriginQuery: (q) => set({ originQuery: q }),
  setDestQuery: (q) => set({ destQuery: q }),

  searchOrigin: async () => {
    const q = get().originQuery.trim();
    if (q.length < 3) return;
    const results = await geocode(q);
    set({ originResults: results });
  },

  searchDest: async () => {
    const q = get().destQuery.trim();
    if (q.length < 3) return;
    const results = await geocode(q);
    set({ destResults: results });
  },

  selectOrigin: (result) => {
    set({ origin: result, originQuery: result.label, originResults: [] });
    if (get().destination) get().compare();
  },

  selectDest: (result) => {
    set({ destination: result, destQuery: result.label, destResults: [] });
    if (get().origin) get().compare();
  },

  compare: async () => {
    const { origin, destination, settings } = get();
    if (!origin || !destination) return;

    set({ loading: true, error: null });

    try {
      const [tollOrs, freeOrs] = await Promise.all([
        getRoute(origin, destination, false),
        getRoute(origin, destination, true),
      ]);

      const tollRoute = orsToRouteData(tollOrs, true);
      const freeRoute = orsToRouteData(freeOrs, false);

      // Try TfNSW API for NSW routes (live, always accurate)
      const nswTolls = await calculateNSWTolls(tollRoute.polyline);

      let segments;
      let tollSource: "tfnsw-live" | "static" = "static";

      if (nswTolls && nswTolls.totalCents > 0) {
        // Use live NSW data — convert to TollSegment format
        tollSource = "tfnsw-live";
        segments = nswTolls.roads.map((road, i) => ({
          id: `nsw-live-${i}`,
          name: road.name,
          entryGantry: "",
          exitGantry: "",
          pricing: {
            peak: road.costCents,
            offPeak: road.costCents,
            weekend: road.costCents,
          },
        }));
      } else {
        // Compare both routes to find toll road usage (VIC, QLD, or NSW if API fails)
        segments = detectTollSegments(tollRoute.polyline, freeRoute.polyline);
      }

      const comparison = compareRoutes(tollRoute, freeRoute, segments, settings, tollSource);

      set({
        tollRouteData: tollRoute,
        freeRouteData: freeRoute,
        comparison,
        loading: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Routing failed";
      if (msg === "QUOTA_EXCEEDED") {
        set({ error: null, quotaExceeded: true, loading: false });
      } else {
        set({ error: msg, loading: false });
      }
    }
  },

  updateSettings: (partial) => {
    set((state) => ({ settings: { ...state.settings, ...partial } }));
    // Recalculate using existing toll breakdown (preserves live NSW data)
    const { tollRouteData, freeRouteData, comparison: prev } = get();
    if (tollRouteData && freeRouteData && prev) {
      const settings = get().settings;
      const comparison = compareRoutes(tollRouteData, freeRouteData, prev.tollBreakdown, settings);
      set({ comparison });
    }
  },
}));
