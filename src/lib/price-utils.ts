import { PRICE_COLORS } from "./constants";

export interface PriceThresholds {
  q1: number;
  q3: number;
}

/** Compute quartile boundaries from an array of prices */
export function computeThresholds(prices: number[]): PriceThresholds {
  if (prices.length === 0) return { q1: 0, q3: 0 };
  const sorted = [...prices].sort((a, b) => a - b);
  return {
    q1: sorted[Math.floor(sorted.length * 0.25)],
    q3: sorted[Math.floor(sorted.length * 0.75)],
  };
}

export type PriceTier = "cheap" | "mid" | "expensive" | "unknown";

/** Classify a price into a tier based on quartile thresholds */
export function getPriceTier(
  price: number | null,
  thresholds: PriceThresholds
): PriceTier {
  if (price == null || thresholds.q1 === 0) return "unknown";
  if (price <= thresholds.q1) return "cheap";
  if (price >= thresholds.q3) return "expensive";
  return "mid";
}

/** Get hex color for a price tier (used by map markers) */
export function getPriceHex(tier: PriceTier): string {
  return PRICE_COLORS[tier];
}

/** Get Tailwind classes for a price tier (used by PriceBadge) */
export function getPriceTailwind(tier: PriceTier): string {
  switch (tier) {
    case "cheap":
      return "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20";
    case "mid":
      return "bg-amber-500/15 text-amber-400 ring-amber-500/20";
    case "expensive":
      return "bg-red-500/15 text-red-400 ring-red-500/20";
    case "unknown":
      return "bg-slate-500/15 text-slate-400 ring-slate-500/20";
  }
}
