"use client";

import { usePriceThresholds } from "@/stores/price-context";
import { getPriceTier, getPriceTailwind } from "@/lib/price-utils";

interface PriceBadgeProps {
  price: number | null;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
  lg: "px-3 py-1.5 text-base",
};

export default function PriceBadge({ price, size = "md" }: PriceBadgeProps) {
  const thresholds = usePriceThresholds();

  if (price === null) return null;

  const tier = getPriceTier(price, thresholds);
  const colorClasses = getPriceTailwind(tier);

  return (
    <span
      className={`inline-flex items-center rounded-lg font-mono font-semibold ring-1 ring-inset ${colorClasses} ${sizeClasses[size]}`}
    >
      {price.toFixed(1)}&cent;
    </span>
  );
}
