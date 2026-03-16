"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import type { StationWithPrices } from "@/types/fuel";
import { FUEL_TYPE_LABELS } from "@/lib/constants";

interface ShareButtonProps {
  station: StationWithPrices;
  selectedFuelType: string;
  size?: "sm" | "md";
}

export default function ShareButton({ station, selectedFuelType, size = "md" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const price = station.prices.find((p) => p.fuelType === selectedFuelType);
  const fuelLabel = FUEL_TYPE_LABELS[selectedFuelType] ?? selectedFuelType;
  const shareText = price
    ? `${fuelLabel} at ${station.name} is ${price.price.toFixed(1)}c/L — found on PetrolSaver`
    : `Check out ${station.name} on PetrolSaver`;
  const shareUrl = "https://petrolsaver.live";

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "PetrolSaver",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  const sizeClasses = size === "sm"
    ? "h-7 w-7 rounded-lg"
    : "px-3 py-2 rounded-xl gap-1.5";

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer ${sizeClasses}`}
      title="Share this station"
    >
      {copied ? (
        <>
          <Check className={`${iconSize} text-[var(--tier-cheap)]`} strokeWidth={2.5} />
          {size !== "sm" && <span className="text-xs font-semibold text-[var(--tier-cheap)]">Copied!</span>}
        </>
      ) : (
        <>
          <Share2 className={iconSize} strokeWidth={2} />
          {size !== "sm" && <span className="text-xs font-semibold">Share</span>}
        </>
      )}
    </button>
  );
}
