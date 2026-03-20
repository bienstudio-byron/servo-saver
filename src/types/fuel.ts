// Fuel data types (VIC + NSW)

export interface FuelPrice {
  fuelType: string;
  price: number; // cents per litre
  isAvailable: boolean;
  updatedAt: string; // ISO datetime
  isStale?: boolean; // true if price hasn't been updated in 3+ days
  source?: "official" | "community"; // where this price came from
}

export interface FuelStation {
  id: string;
  name: string;
  brandId: string;
  address: string;
  latitude: number;
  longitude: number;
  state?: string;
}

export interface FuelBrand {
  id: string;
  name: string;
  type: "major" | "independent";
}

export interface FuelType {
  id: string;
  name: string;
}

// Merged station with prices and brand info
export interface StationWithPrices extends FuelStation {
  brand: FuelBrand | null;
  prices: FuelPrice[];
  connections?: {
    type: string;
    powerKW: number;
    quantity: number;
  }[];
}

// Raw API response: /fuel/prices
export interface ApiFuelPriceDetail {
  fuelStation: {
    id: string;
    name: string;
    address: string;
    brandId: string;
    contactPhone: string | null;
    location: {
      latitude: number;
      longitude: number;
    };
    openingHours: string | null;
  };
  fuelPrices: Array<{
    fuelType: string;
    isAvailable: boolean;
    price: number;
    updatedAt: string;
  }>;
  updatedAt: string;
}

export interface ApiPricesResponse {
  fuelPriceDetails: ApiFuelPriceDetail[];
}

// Raw API response: /fuel/reference-data/stations
export interface ApiStationsResponse {
  fuelStations: Array<{
    id: string;
    name: string;
    brandId: string;
    address: string;
    contactPhone: string | null;
    updatedAt: string;
    location: {
      latitude: number;
      longitude: number;
    };
    openingHours: string | null;
  }>;
}

// Raw API response: /fuel/reference-data/brands
export interface ApiBrandResponse {
  brands: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

// Raw API response: /fuel/reference-data/types
export interface ApiFuelTypeResponse {
  fuelTypes: Array<{
    id: string;
    name: string;
  }>;
}

// Ranked station option — used in FillStrategy + TripSummaryCard
export interface RankedOption {
  station: StationWithPrices;
  price: number;
  distance: number;
  detourKm: number;
  detourMins: number;
  detourCost: number; // $ cost of the detour (fuel-only or ATO rate)
  netSavings: number; // vs nearest station
  tag: string; // "Best for you" | "Good deal" | "Nearby"
  isStale: boolean;
  updatedAt: string;
  source?: "official" | "community";
}

// Client-side enriched types
export interface StationListItem {
  id: string;
  name: string;
  brandName: string;
  brandType: string;
  address: string;
  latitude: number;
  longitude: number;
  price: number | null;
  updatedAt: string | null;
  distance: number | null;
}
