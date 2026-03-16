"use client";

import { useEffect, useRef } from "react";

// Replace with your real AdSense publisher ID
const ADSENSE_PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID || "";

interface AdSlotProps {
  slot: string; // AdSense ad slot ID
  format?: "horizontal" | "rectangle" | "vertical" | "fluid";
  className?: string;
}

export default function AdSlot({ slot, format = "horizontal", className = "" }: AdSlotProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!ADSENSE_PUB_ID || pushed.current) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adsbygoogle = (window as any).adsbygoogle || [];
      adsbygoogle.push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded
    }
  }, []);

  // Hide entirely if no AdSense ID configured — no placeholder
  if (!ADSENSE_PUB_ID) {
    return null;
    );
  }

  const styles: Record<string, { width: string; height: string }> = {
    horizontal: { width: "100%", height: "90px" },
    rectangle: { width: "100%", height: "250px" },
    vertical: { width: "100%", height: "600px" },
    fluid: { width: "100%", height: "auto" },
  };

  return (
    <div ref={adRef} className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: "block", ...styles[format] }}
        data-ad-client={ADSENSE_PUB_ID}
        data-ad-slot={slot}
        data-ad-format={format === "fluid" ? "fluid" : "auto"}
        data-full-width-responsive="true"
      />
    </div>
  );
}
