"use client";

// Ads disabled until AdSense approval — component returns null but all
// placements remain in the codebase so we can re-enable with one change.

interface AdSlotProps {
  slot: string;
  format?: "horizontal" | "rectangle" | "vertical" | "fluid";
  className?: string;
}

export default function AdSlot(_props: AdSlotProps) {
  return null;
}
