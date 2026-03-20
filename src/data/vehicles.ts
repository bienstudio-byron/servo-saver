export interface VehicleSpec {
  make: string;
  model: string;
  variant?: string;
  tankSize: number; // litres
  consumption: number; // L/100km combined
  fuelType: string; // U91, P95, P98, DSL, E10, LPG
  category: "Small" | "Medium" | "SUV" | "Ute" | "Van" | "Performance" | "Hybrid" | "Large";
}

// Top-selling cars in Australia with verified specs
// Sources: Green Vehicle Guide, manufacturer specs, carsguide.com.au
export const VEHICLE_DATABASE: VehicleSpec[] = [
  // ─── Small ───
  { make: "Toyota", model: "Corolla", variant: "Hatch", tankSize: 50, consumption: 6.8, fuelType: "U91", category: "Small" },
  { make: "Toyota", model: "Yaris", tankSize: 42, consumption: 5.6, fuelType: "U91", category: "Small" },
  { make: "Toyota", model: "Yaris Cross", tankSize: 36, consumption: 5.3, fuelType: "U91", category: "Small" },
  { make: "Mazda", model: "2", tankSize: 44, consumption: 5.8, fuelType: "U91", category: "Small" },
  { make: "Mazda", model: "3", tankSize: 51, consumption: 6.5, fuelType: "U91", category: "Small" },
  { make: "Hyundai", model: "i20", tankSize: 40, consumption: 5.5, fuelType: "U91", category: "Small" },
  { make: "Hyundai", model: "i30", tankSize: 50, consumption: 6.5, fuelType: "U91", category: "Small" },
  { make: "Hyundai", model: "i30 N", tankSize: 50, consumption: 8.1, fuelType: "P95", category: "Small" },
  { make: "Kia", model: "Cerato", tankSize: 50, consumption: 6.8, fuelType: "U91", category: "Small" },
  { make: "Kia", model: "Rio", tankSize: 45, consumption: 5.8, fuelType: "U91", category: "Small" },
  { make: "Suzuki", model: "Swift", tankSize: 37, consumption: 5.1, fuelType: "U91", category: "Small" },
  { make: "Suzuki", model: "Baleno", tankSize: 37, consumption: 5.3, fuelType: "U91", category: "Small" },
  { make: "Honda", model: "Civic", tankSize: 47, consumption: 6.8, fuelType: "U91", category: "Small" },
  { make: "Honda", model: "Jazz", tankSize: 40, consumption: 5.8, fuelType: "U91", category: "Small" },
  { make: "Volkswagen", model: "Polo", tankSize: 40, consumption: 5.5, fuelType: "P95", category: "Small" },
  { make: "Volkswagen", model: "Golf", tankSize: 50, consumption: 6.4, fuelType: "P95", category: "Small" },
  { make: "MG", model: "3", tankSize: 45, consumption: 6.3, fuelType: "U91", category: "Small" },
  { make: "Nissan", model: "Juke", tankSize: 46, consumption: 6.1, fuelType: "U91", category: "Small" },

  // ─── Medium ───
  { make: "Toyota", model: "Camry", tankSize: 60, consumption: 7.8, fuelType: "U91", category: "Medium" },
  { make: "Toyota", model: "Corolla Sedan", tankSize: 50, consumption: 6.8, fuelType: "U91", category: "Medium" },
  { make: "Mazda", model: "6", tankSize: 62, consumption: 7.1, fuelType: "U91", category: "Medium" },
  { make: "Hyundai", model: "Sonata", tankSize: 60, consumption: 7.5, fuelType: "U91", category: "Medium" },
  { make: "Kia", model: "K5", tankSize: 60, consumption: 7.4, fuelType: "U91", category: "Medium" },
  { make: "Skoda", model: "Octavia", tankSize: 50, consumption: 6.1, fuelType: "P95", category: "Medium" },
  { make: "Subaru", model: "Impreza", tankSize: 50, consumption: 6.9, fuelType: "U91", category: "Medium" },

  // ─── SUV ───
  { make: "Toyota", model: "RAV4", tankSize: 55, consumption: 7.8, fuelType: "U91", category: "SUV" },
  { make: "Toyota", model: "Kluger", tankSize: 72, consumption: 9.5, fuelType: "U91", category: "SUV" },
  { make: "Toyota", model: "Prado", variant: "Diesel", tankSize: 150, consumption: 11.5, fuelType: "DSL", category: "SUV" },
  { make: "Toyota", model: "LandCruiser 300", variant: "Diesel", tankSize: 110, consumption: 10.6, fuelType: "DSL", category: "SUV" },
  { make: "Toyota", model: "LandCruiser 300", variant: "Petrol", tankSize: 110, consumption: 14.1, fuelType: "P95", category: "SUV" },
  { make: "Toyota", model: "Fortuner", variant: "Diesel", tankSize: 80, consumption: 8.6, fuelType: "DSL", category: "SUV" },
  { make: "Toyota", model: "C-HR", tankSize: 50, consumption: 6.8, fuelType: "U91", category: "SUV" },
  { make: "Mazda", model: "CX-3", tankSize: 48, consumption: 6.3, fuelType: "U91", category: "SUV" },
  { make: "Mazda", model: "CX-5", tankSize: 56, consumption: 7.4, fuelType: "U91", category: "SUV" },
  { make: "Mazda", model: "CX-8", tankSize: 56, consumption: 7.9, fuelType: "U91", category: "SUV" },
  { make: "Mazda", model: "CX-9", tankSize: 74, consumption: 9.3, fuelType: "U91", category: "SUV" },
  { make: "Mazda", model: "CX-30", tankSize: 48, consumption: 6.5, fuelType: "U91", category: "SUV" },
  { make: "Mazda", model: "CX-60", variant: "Diesel", tankSize: 58, consumption: 6.4, fuelType: "DSL", category: "SUV" },
  { make: "Hyundai", model: "Tucson", tankSize: 54, consumption: 7.9, fuelType: "U91", category: "SUV" },
  { make: "Hyundai", model: "Santa Fe", tankSize: 67, consumption: 9.3, fuelType: "U91", category: "SUV" },
  { make: "Hyundai", model: "Kona", tankSize: 45, consumption: 6.4, fuelType: "U91", category: "SUV" },
  { make: "Hyundai", model: "Venue", tankSize: 45, consumption: 6.7, fuelType: "U91", category: "SUV" },
  { make: "Kia", model: "Sportage", tankSize: 54, consumption: 7.8, fuelType: "U91", category: "SUV" },
  { make: "Kia", model: "Sorento", variant: "Diesel", tankSize: 67, consumption: 7.2, fuelType: "DSL", category: "SUV" },
  { make: "Kia", model: "Seltos", tankSize: 50, consumption: 7.0, fuelType: "U91", category: "SUV" },
  { make: "Kia", model: "Stonic", tankSize: 45, consumption: 6.1, fuelType: "U91", category: "SUV" },
  { make: "Mitsubishi", model: "Outlander", tankSize: 60, consumption: 8.1, fuelType: "U91", category: "SUV" },
  { make: "Mitsubishi", model: "ASX", tankSize: 60, consumption: 7.7, fuelType: "U91", category: "SUV" },
  { make: "Mitsubishi", model: "Eclipse Cross", tankSize: 60, consumption: 7.7, fuelType: "U91", category: "SUV" },
  { make: "Mitsubishi", model: "Pajero Sport", variant: "Diesel", tankSize: 68, consumption: 8.0, fuelType: "DSL", category: "SUV" },
  { make: "Subaru", model: "Forester", tankSize: 48, consumption: 7.4, fuelType: "U91", category: "SUV" },
  { make: "Subaru", model: "Outback", tankSize: 63, consumption: 7.3, fuelType: "U91", category: "SUV" },
  { make: "Subaru", model: "XV", tankSize: 48, consumption: 7.0, fuelType: "U91", category: "SUV" },
  { make: "Nissan", model: "X-Trail", tankSize: 55, consumption: 7.8, fuelType: "U91", category: "SUV" },
  { make: "Nissan", model: "Qashqai", tankSize: 55, consumption: 7.1, fuelType: "U91", category: "SUV" },
  { make: "Nissan", model: "Pathfinder", tankSize: 73, consumption: 9.8, fuelType: "U91", category: "SUV" },
  { make: "Nissan", model: "Patrol", variant: "V8", tankSize: 140, consumption: 15.8, fuelType: "P95", category: "SUV" },
  { make: "Honda", model: "CR-V", tankSize: 53, consumption: 7.3, fuelType: "U91", category: "SUV" },
  { make: "Honda", model: "HR-V", tankSize: 40, consumption: 6.6, fuelType: "U91", category: "SUV" },
  { make: "Volkswagen", model: "Tiguan", tankSize: 60, consumption: 7.6, fuelType: "P95", category: "SUV" },
  { make: "Volkswagen", model: "T-Cross", tankSize: 40, consumption: 5.8, fuelType: "P95", category: "SUV" },
  { make: "Volkswagen", model: "T-Roc", tankSize: 50, consumption: 6.6, fuelType: "P95", category: "SUV" },
  { make: "Isuzu", model: "MU-X", variant: "Diesel", tankSize: 80, consumption: 9.0, fuelType: "DSL", category: "SUV" },
  { make: "Ford", model: "Everest", variant: "Diesel", tankSize: 80, consumption: 8.6, fuelType: "DSL", category: "SUV" },
  { make: "MG", model: "HS", tankSize: 55, consumption: 8.1, fuelType: "U91", category: "SUV" },
  { make: "MG", model: "ZS", tankSize: 45, consumption: 6.9, fuelType: "U91", category: "SUV" },
  { make: "GWM", model: "Haval H6", tankSize: 58, consumption: 8.5, fuelType: "U91", category: "SUV" },
  { make: "GWM", model: "Haval Jolion", tankSize: 55, consumption: 7.6, fuelType: "U91", category: "SUV" },
  { make: "Skoda", model: "Kodiaq", tankSize: 58, consumption: 7.7, fuelType: "P95", category: "SUV" },
  { make: "Skoda", model: "Karoq", tankSize: 50, consumption: 6.6, fuelType: "P95", category: "SUV" },

  // ─── Ute ───
  { make: "Toyota", model: "HiLux", variant: "Diesel", tankSize: 80, consumption: 10.5, fuelType: "DSL", category: "Ute" },
  { make: "Toyota", model: "HiLux", variant: "Petrol", tankSize: 80, consumption: 11.8, fuelType: "U91", category: "Ute" },
  { make: "Ford", model: "Ranger", variant: "Diesel", tankSize: 80, consumption: 10.0, fuelType: "DSL", category: "Ute" },
  { make: "Ford", model: "Ranger", variant: "V6 Diesel", tankSize: 80, consumption: 10.8, fuelType: "DSL", category: "Ute" },
  { make: "Ford", model: "Ranger Raptor", tankSize: 80, consumption: 11.5, fuelType: "DSL", category: "Ute" },
  { make: "Mitsubishi", model: "Triton", variant: "Diesel", tankSize: 75, consumption: 9.5, fuelType: "DSL", category: "Ute" },
  { make: "Isuzu", model: "D-Max", variant: "Diesel", tankSize: 76, consumption: 9.2, fuelType: "DSL", category: "Ute" },
  { make: "Nissan", model: "Navara", variant: "Diesel", tankSize: 80, consumption: 9.4, fuelType: "DSL", category: "Ute" },
  { make: "Mazda", model: "BT-50", variant: "Diesel", tankSize: 76, consumption: 9.0, fuelType: "DSL", category: "Ute" },
  { make: "Volkswagen", model: "Amarok", variant: "V6 Diesel", tankSize: 80, consumption: 10.4, fuelType: "DSL", category: "Ute" },
  { make: "GWM", model: "Ute Cannon", variant: "Diesel", tankSize: 70, consumption: 9.5, fuelType: "DSL", category: "Ute" },
  { make: "LDV", model: "T60", variant: "Diesel", tankSize: 73, consumption: 9.6, fuelType: "DSL", category: "Ute" },
  { make: "RAM", model: "1500", variant: "V8", tankSize: 98, consumption: 14.9, fuelType: "P98", category: "Ute" },

  // ─── Van ───
  { make: "Toyota", model: "HiAce", variant: "Diesel", tankSize: 70, consumption: 9.5, fuelType: "DSL", category: "Van" },
  { make: "Toyota", model: "HiAce", variant: "Petrol", tankSize: 60, consumption: 11.0, fuelType: "U91", category: "Van" },
  { make: "Hyundai", model: "Staria", tankSize: 75, consumption: 9.6, fuelType: "DSL", category: "Van" },
  { make: "Volkswagen", model: "Transporter", tankSize: 70, consumption: 8.8, fuelType: "DSL", category: "Van" },
  { make: "Ford", model: "Transit Custom", variant: "Diesel", tankSize: 70, consumption: 8.1, fuelType: "DSL", category: "Van" },

  // ─── Large / Prestige ───
  { make: "Tesla", model: "Model 3", tankSize: 0, consumption: 0, fuelType: "EV", category: "Large" },
  { make: "Tesla", model: "Model Y", tankSize: 0, consumption: 0, fuelType: "EV", category: "Large" },
  { make: "BMW", model: "3 Series", tankSize: 59, consumption: 7.4, fuelType: "P95", category: "Large" },
  { make: "BMW", model: "X3", tankSize: 65, consumption: 8.5, fuelType: "P95", category: "Large" },
  { make: "BMW", model: "X5", tankSize: 80, consumption: 10.5, fuelType: "P95", category: "Large" },
  { make: "Mercedes-Benz", model: "C-Class", tankSize: 66, consumption: 7.4, fuelType: "P95", category: "Large" },
  { make: "Mercedes-Benz", model: "GLC", tankSize: 62, consumption: 8.3, fuelType: "P95", category: "Large" },
  { make: "Audi", model: "A3", tankSize: 40, consumption: 5.8, fuelType: "P95", category: "Large" },
  { make: "Audi", model: "Q5", tankSize: 65, consumption: 8.0, fuelType: "P95", category: "Large" },
  { make: "Volvo", model: "XC40", tankSize: 54, consumption: 7.2, fuelType: "P95", category: "Large" },
  { make: "Volvo", model: "XC60", tankSize: 71, consumption: 8.2, fuelType: "P95", category: "Large" },
  { make: "Lexus", model: "NX", tankSize: 55, consumption: 8.1, fuelType: "P95", category: "Large" },
  { make: "Lexus", model: "RX", tankSize: 65, consumption: 9.5, fuelType: "P95", category: "Large" },

  // ─── Performance ───
  { make: "Volkswagen", model: "Golf GTI", tankSize: 50, consumption: 7.1, fuelType: "P95", category: "Performance" },
  { make: "Volkswagen", model: "Golf R", tankSize: 50, consumption: 8.0, fuelType: "P98", category: "Performance" },
  { make: "Ford", model: "Mustang", variant: "V8", tankSize: 61, consumption: 13.1, fuelType: "P95", category: "Performance" },
  { make: "Toyota", model: "GR86", tankSize: 50, consumption: 8.9, fuelType: "P98", category: "Performance" },
  { make: "Subaru", model: "BRZ", tankSize: 50, consumption: 8.9, fuelType: "P98", category: "Performance" },
  { make: "Subaru", model: "WRX", tankSize: 63, consumption: 9.0, fuelType: "P98", category: "Performance" },
  { make: "BMW", model: "M3", tankSize: 59, consumption: 10.2, fuelType: "P98", category: "Performance" },
  { make: "Mercedes-AMG", model: "A45", tankSize: 51, consumption: 9.1, fuelType: "P98", category: "Performance" },

  // ─── Hybrid ───
  { make: "Toyota", model: "Corolla Hybrid", tankSize: 43, consumption: 4.2, fuelType: "U91", category: "Hybrid" },
  { make: "Toyota", model: "Camry Hybrid", tankSize: 50, consumption: 4.9, fuelType: "U91", category: "Hybrid" },
  { make: "Toyota", model: "RAV4 Hybrid", tankSize: 55, consumption: 4.8, fuelType: "U91", category: "Hybrid" },
  { make: "Toyota", model: "Kluger Hybrid", tankSize: 55, consumption: 5.6, fuelType: "U91", category: "Hybrid" },
  { make: "Toyota", model: "Yaris Cross Hybrid", tankSize: 36, consumption: 3.8, fuelType: "U91", category: "Hybrid" },
  { make: "Toyota", model: "C-HR Hybrid", tankSize: 43, consumption: 4.3, fuelType: "U91", category: "Hybrid" },
  { make: "Mazda", model: "CX-60 PHEV", tankSize: 50, consumption: 1.5, fuelType: "P95", category: "Hybrid" },
  { make: "Mitsubishi", model: "Outlander PHEV", tankSize: 45, consumption: 1.5, fuelType: "U91", category: "Hybrid" },
  { make: "MG", model: "HS PHEV", tankSize: 55, consumption: 1.7, fuelType: "P95", category: "Hybrid" },
  { make: "Hyundai", model: "Ioniq Hybrid", tankSize: 45, consumption: 3.9, fuelType: "U91", category: "Hybrid" },
  { make: "Kia", model: "Niro Hybrid", tankSize: 42, consumption: 4.4, fuelType: "U91", category: "Hybrid" },
  { make: "Honda", model: "CR-V Hybrid", tankSize: 57, consumption: 6.0, fuelType: "U91", category: "Hybrid" },
  { make: "Ford", model: "Escape PHEV", tankSize: 51, consumption: 2.5, fuelType: "U91", category: "Hybrid" },
  { make: "Subaru", model: "Forester Hybrid", tankSize: 48, consumption: 6.7, fuelType: "U91", category: "Hybrid" },
];

/** Get display name for a vehicle */
export function vehicleDisplayName(v: VehicleSpec): string {
  return v.variant ? `${v.make} ${v.model} ${v.variant}` : `${v.make} ${v.model}`;
}
