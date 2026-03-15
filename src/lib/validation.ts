import { z } from "zod";

export const fuelPriceSchema = z.object({
  fuelType: z.string(),
  isAvailable: z.boolean(),
  price: z.number().nullable(),
  updatedAt: z.string(),
});

export const fuelStationInPriceSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  brandId: z.string(),
  contactPhone: z.string().nullable(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  openingHours: z.unknown(),
});

export const fuelPriceDetailSchema = z.object({
  fuelStation: fuelStationInPriceSchema,
  fuelPrices: z.array(fuelPriceSchema),
  updatedAt: z.string(),
});

export const pricesResponseSchema = z.object({
  fuelPriceDetails: z.array(fuelPriceDetailSchema),
});

export const stationSchema = z.object({
  id: z.string(),
  name: z.string(),
  brandId: z.string(),
  address: z.string(),
  contactPhone: z.string().nullable(),
  updatedAt: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  openingHours: z.unknown(),
});

export const stationsResponseSchema = z.object({
  fuelStations: z.array(stationSchema),
});

export const brandSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
});

export const brandsResponseSchema = z.object({
  brands: z.array(brandSchema),
});

export const fuelTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const fuelTypesResponseSchema = z.object({
  fuelTypes: z.array(fuelTypeSchema),
});
