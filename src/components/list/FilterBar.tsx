"use client";

import FuelTypeSelector from "@/components/shared/FuelTypeSelector";

interface FilterBarProps {
  onFuelTypeChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  brands: { id: string; name: string }[];
  selectedFuelType: string;
  selectedBrand: string;
  searchQuery: string;
}

export default function FilterBar({
  onFuelTypeChange,
  onBrandChange,
  onSearchChange,
  brands,
  selectedFuelType,
  selectedBrand,
  searchQuery,
}: FilterBarProps) {
  const selectClass =
    "rounded-lg border border-white/10 bg-[#242424] px-3 py-2 text-sm text-white shadow-sm transition-all hover:border-white/20 focus:border-[#4285f4] focus:outline-none focus:ring-2 focus:ring-[#4285f4]/20 cursor-pointer";

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <FuelTypeSelector value={selectedFuelType} onChange={onFuelTypeChange} />

      <select
        value={selectedBrand}
        onChange={(e) => onBrandChange(e.target.value)}
        className={selectClass}
      >
        <option value="">All Brands</option>
        {brands.map((brand) => (
          <option key={brand.id} value={brand.name}>
            {brand.name}
          </option>
        ))}
      </select>

      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9aa0a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search station or suburb..."
          className="w-56 rounded-lg border border-white/10 bg-[#242424] pl-9 pr-3 py-2 text-sm
            text-white shadow-sm transition-all placeholder:text-[#9aa0a6]
            hover:border-white/20 focus:border-[#4285f4] focus:outline-none
            focus:ring-2 focus:ring-[#4285f4]/20"
        />
      </div>
    </div>
  );
}
