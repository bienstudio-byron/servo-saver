import { create } from "zustand";

export type CostModel = "fuelOnly" | "fullCost";

/** ATO cents-per-km rate for 2025-26. Reference: ato.gov.au */
export const ATO_RATE_PER_KM = 0.88; // $0.88/km

export interface VehicleProfile {
  name: string;
  tankSize: number; // litres
  consumption: number; // L/100km
  fuelType: string; // U91, P95, P98, DSL, E10, LPG
}

const STORAGE_KEY = "petrolsaver-vehicle";
const COST_MODEL_KEY = "petrolsaver-cost-model";

const DEFAULT_VEHICLE: VehicleProfile = {
  name: "Average car",
  tankSize: 55,
  consumption: 8.5,
  fuelType: "U91",
};

interface VehicleStore {
  profile: VehicleProfile;
  isSetUp: boolean;
  showSetup: boolean;
  costModel: CostModel;
  setProfile: (profile: VehicleProfile) => void;
  setShowSetup: (show: boolean) => void;
  setCostModel: (model: CostModel) => void;
  /** Get cost per km in dollars based on current cost model */
  getCostPerKm: (fuelPriceCentsPerLitre: number) => number;
  reset: () => void;
}

function loadFromStorage(): { profile: VehicleProfile; isSetUp: boolean } {
  if (typeof window === "undefined") return { profile: DEFAULT_VEHICLE, isSetUp: false };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { profile: parsed, isSetUp: true };
    }
  } catch {}
  return { profile: DEFAULT_VEHICLE, isSetUp: false };
}

function loadCostModel(): CostModel {
  if (typeof window === "undefined") return "fuelOnly";
  try {
    const stored = localStorage.getItem(COST_MODEL_KEY);
    if (stored === "fullCost") return "fullCost";
  } catch {}
  return "fuelOnly";
}

export const useVehicleStore = create<VehicleStore>((set, get) => {
  const { profile, isSetUp } = loadFromStorage();
  return {
    profile,
    isSetUp,
    showSetup: false,
    costModel: loadCostModel(),
    setProfile: (profile) => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch {}
      set({ profile, isSetUp: true, showSetup: false });
    },
    setShowSetup: (show) => set({ showSetup: show }),
    setCostModel: (model) => {
      try { localStorage.setItem(COST_MODEL_KEY, model); } catch {}
      set({ costModel: model });
    },
    getCostPerKm: (fuelPriceCentsPerLitre: number) => {
      const { costModel, profile } = get();
      if (costModel === "fullCost") return ATO_RATE_PER_KM;
      // Fuel-only: (L/100km / 100) * price_per_litre_in_dollars
      return (profile.consumption / 100) * (fuelPriceCentsPerLitre / 100);
    },
    reset: () => {
      try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(COST_MODEL_KEY); } catch {}
      set({ profile: DEFAULT_VEHICLE, isSetUp: false, costModel: "fuelOnly" });
    },
  };
});
