import { FUEL_TYPE_LABELS } from "@/lib/constants";
import PriceBadge from "@/components/shared/PriceBadge";

interface PriceTableProps {
  prices: { fuelType: string; price: number; updatedAt: string }[];
}

export default function PriceTable({ prices }: PriceTableProps) {
  if (prices.length === 0) {
    return (
      <p className="text-sm text-[#9aa0a6] italic">No price data available.</p>
    );
  }

  return (
    <div className="space-y-2">
      {prices.map((entry) => (
        <div
          key={entry.fuelType}
          className="flex items-center justify-between py-1.5"
        >
          <span className="text-sm text-[#dadce0]">
            {FUEL_TYPE_LABELS[entry.fuelType] ?? entry.fuelType}
          </span>
          <PriceBadge price={entry.price} size="sm" />
        </div>
      ))}
    </div>
  );
}
