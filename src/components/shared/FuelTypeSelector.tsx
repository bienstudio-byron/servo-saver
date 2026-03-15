"use client";

import { FUEL_TYPE_LABELS } from "@/lib/constants";

interface FuelTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function FuelTypeSelector({
  value,
  onChange,
}: FuelTypeSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-white/10 bg-[#242424] px-3 py-2 text-sm
        text-white shadow-sm transition-all
        hover:border-white/20 focus:border-[#4285f4] focus:outline-none
        focus:ring-2 focus:ring-[#4285f4]/20 cursor-pointer"
    >
      {Object.entries(FUEL_TYPE_LABELS).map(([id, label]) => (
        <option key={id} value={id}>
          {label}
        </option>
      ))}
    </select>
  );
}
