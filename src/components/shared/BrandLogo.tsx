"use client";

import { useState } from "react";
import { getBrandLogoUrl, getBrandColor, getBrandInitial } from "@/lib/brand-logos";

interface BrandLogoProps {
  brandName: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

export default function BrandLogo({ brandName, size = "md" }: BrandLogoProps) {
  const logoUrl = getBrandLogoUrl(brandName);
  const [imgError, setImgError] = useState(false);

  const fallback = (
    <div
      className={`${sizeClasses[size]} rounded-lg flex items-center justify-center font-bold text-white shrink-0`}
      style={{ backgroundColor: getBrandColor(brandName) }}
    >
      {getBrandInitial(brandName)}
    </div>
  );

  if (!logoUrl || imgError) return fallback;

  return (
    <img
      src={logoUrl}
      alt={brandName}
      className={`${sizeClasses[size]} rounded-lg object-contain bg-white shrink-0`}
      onError={() => setImgError(true)}
    />
  );
}
