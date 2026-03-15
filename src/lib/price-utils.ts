import { PRICE_COLORS } from "./constants";

export interface PriceThresholds {
  p10: number; // top 10% boundary (cheap)
  p50: number; // top 50% boundary (mid)
}

/** Compute percentile boundaries from an array of prices */
export function computeThresholds(prices: number[]): PriceThresholds {
  if (prices.length === 0) return { p10: 0, p50: 0 };
  const sorted = [...prices].sort((a, b) => a - b);
  return {
    p10: sorted[Math.floor(sorted.length * 0.10)],
    p50: sorted[Math.floor(sorted.length * 0.50)],
  };
}

export type PriceTier = "cheap" | "mid" | "expensive" | "unknown";

/** Classify a price into a tier: top 10% = cheap, up to 50% = mid, rest = expensive */
export function getPriceTier(
  price: number | null,
  thresholds: PriceThresholds
): PriceTier {
  if (price == null || thresholds.p10 === 0) return "unknown";
  if (price <= thresholds.p10) return "cheap";
  if (price <= thresholds.p50) return "mid";
  return "expensive";
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
