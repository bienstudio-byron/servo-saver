import type { StationWithPrices } from "@/types/fuel";

export interface FuelDataProvider {
  id: string;
  fetchStations(): Promise<StationWithPrices[]>;
}
