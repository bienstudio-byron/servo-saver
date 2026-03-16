"use client";

import { useState } from "react";
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
    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "PetrolSaver",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or API failed — fall through to copy
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard failed
    }
  }

  const sizeClasses = size === "sm"
    ? "h-7 w-7 rounded-lg"
    : "px-3 py-2 rounded-xl gap-1.5";

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center justify-center text-[#9aa0a6] hover:text-white hover:bg-white/10 transition-colors cursor-pointer ${sizeClasses}`}
      title="Share this station"
    >
      {copied ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className={size === "sm" ? "h-3.5 w-3.5 text-emerald-400" : "h-4 w-4 text-emerald-400"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {size !== "sm" && <span className="text-xs font-semibold text-emerald-400">Copied!</span>}
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          {size !== "sm" && <span className="text-xs font-semibold">Share</span>}
        </>
      )}
    </button>
  );
}
