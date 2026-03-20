import { getPriceTier, type PriceThresholds } from "@/lib/price-utils";

export const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export const TAG_DESCRIPTIONS: Record<string, string> = {
  "Top pick": "Best value after factoring in the drive",
  "Worth it": "Solid saving — the detour pays off",
  "Closest": "Nearest to you, not the cheapest",
};

export function formatUpdated(iso: string, source?: "official" | "community") {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHrs = Math.floor(diffMs / 3600000);
  const prefix = source === "community" ? "Reported" : "Updated";
  if (diffHrs < 1) return `${prefix} just now`;
  if (diffHrs < 24) return `${prefix} ${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return `${prefix} yesterday`;
  return `${prefix} ${diffDays}d ago`;
}

export function getTierColor(price: number, thresholds: PriceThresholds) {
  const tier = getPriceTier(price, thresholds);
  switch (tier) {
    case "cheap": return "text-[var(--tier-cheap)]";
    case "mid": return "text-[var(--tier-mid)]";
    case "expensive": return "text-[var(--tier-exp)]";
    default: return "text-[var(--muted)]";
  }
}

export function getTagStyle(price: number, thresholds: PriceThresholds) {
  const tier = getPriceTier(price, thresholds);
  switch (tier) {
    case "cheap": return "text-[var(--tier-cheap)] bg-[var(--tier-cheap)]/15";
    case "mid": return "text-[var(--tier-mid)] bg-[var(--tier-mid)]/15";
    case "expensive": return "text-[var(--tier-exp)] bg-[var(--tier-exp)]/15";
    default: return "text-[var(--muted)] bg-[var(--muted)]/15";
  }
}
