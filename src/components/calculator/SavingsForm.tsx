"use client";

import { useState } from "react";
import {
  DEFAULT_TANK_SIZE,
  DEFAULT_FUEL_CONSUMPTION,
  WEEKS_PER_YEAR,
} from "@/lib/constants";
import SavingsResult from "./SavingsResult";

interface SavingsFormProps {
  prefilledPrice?: number;
}

export default function SavingsForm({ prefilledPrice }: SavingsFormProps) {
  const [currentPrice, setCurrentPrice] = useState<number>(prefilledPrice ?? 0);
  const [cheapestPrice, setCheapestPrice] = useState<number>(0);
  const [tankSize, setTankSize] = useState<number>(DEFAULT_TANK_SIZE);
  const [distance, setDistance] = useState<number>(0);
  const [fuelConsumption, setFuelConsumption] = useState<number>(DEFAULT_FUEL_CONSUMPTION);

  const priceDiff = currentPrice - cheapestPrice;
  const savingsPerFill = priceDiff * tankSize;
  const roundTripKm = distance * 2;
  const litresForTrip = (roundTripKm / 100) * fuelConsumption;
  const tripCost = litresForTrip * cheapestPrice;
  const netSavings = savingsPerFill - tripCost;
  const annualSavings = netSavings * WEEKS_PER_YEAR;

  const hasInput = currentPrice > 0 && cheapestPrice > 0 && distance > 0;

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-[#242424] px-3 py-2.5 text-sm text-white shadow-sm transition-all placeholder:text-[#9aa0a6] hover:border-white/20 focus:border-[#4285f4] focus:outline-none focus:ring-2 focus:ring-[#4285f4]/20 font-mono";
  const labelClass = "block text-xs font-medium text-[#9aa0a6] mb-1.5 uppercase tracking-wider";

  return (
    <div>
      <div className="rounded-xl border border-white/10 bg-[#242424]/50 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Current price (c/L)</span>
            <input
              type="number" min={0} step={0.1}
              value={currentPrice || ""}
              onChange={(e) => setCurrentPrice(Number(e.target.value))}
              className={inputClass}
              placeholder="e.g. 239.8"
            />
          </label>
          <label className="block">
            <span className={labelClass}>Cheapest price (c/L)</span>
            <input
              type="number" min={0} step={0.1}
              value={cheapestPrice || ""}
              onChange={(e) => setCheapestPrice(Number(e.target.value))}
              className={inputClass}
              placeholder="e.g. 205.9"
            />
          </label>
          <label className="block">
            <span className={labelClass}>Tank size (L)</span>
            <input
              type="number" min={1} step={1}
              value={tankSize}
              onChange={(e) => setTankSize(Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Distance to station (km)</span>
            <input
              type="number" min={0} step={0.1}
              value={distance || ""}
              onChange={(e) => setDistance(Number(e.target.value))}
              className={inputClass}
              placeholder="e.g. 5.2"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelClass}>Fuel consumption (L/100km)</span>
            <input
              type="number" min={0.1} step={0.1}
              value={fuelConsumption}
              onChange={(e) => setFuelConsumption(Number(e.target.value))}
              className={inputClass}
            />
          </label>
        </div>
      </div>

      {hasInput && (
        <SavingsResult
          savingsPerFill={savingsPerFill}
          annualSavings={annualSavings}
          tripCost={tripCost}
          netSavings={netSavings}
        />
      )}
    </div>
  );
}
