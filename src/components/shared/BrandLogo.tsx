"use client";

import { useState } from "react";
import { Fuel } from "lucide-react";
import { getBrandLogoUrl, getBrandColor, getBrandInitial } from "@/lib/brand-logos";

interface BrandLogoProps {
  brandName: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const iconSizes = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

const textSizes = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
};

// Generic/independent brands that should show a fuel icon instead of initial
const GENERIC_BRANDS = new Set(["Independent", "Other", "?", ""]);

export default function BrandLogo({ brandName, size = "md" }: BrandLogoProps) {
  const logoUrl = getBrandLogoUrl(brandName);
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={brandName}
        className={`${sizeClasses[size]} rounded-lg object-contain bg-white shrink-0`}
        onError={() => setImgError(true)}
      />
    );
  }

  // Generic brands get a fuel pump icon
  if (GENERIC_BRANDS.has(brandName)) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-lg flex items-center justify-center shrink-0 bg-[var(--subtle)] border border-[var(--subtle-border)]`}
      >
        <Fuel className={`${iconSizes[size]} text-[var(--muted)]`} strokeWidth={1.5} />
      </div>
    );
  }

  // Named brands without logos get a coloured initial
  return (
    <div
      className={`${sizeClasses[size]} rounded-lg flex items-center justify-center font-bold text-white shrink-0`}
      style={{ backgroundColor: getBrandColor(brandName) }}
    >
      <span className={textSizes[size]}>{getBrandInitial(brandName)}</span>
    </div>
  );
}
