"use client";

import { useEffect, useRef, useState } from "react";

const ADSENSE_PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID || "";

interface AdSlotProps {
  slot: string;
  format?: "horizontal" | "rectangle" | "vertical" | "fluid";
  className?: string;
}

export default function AdSlot({ slot, format = "horizontal", className = "" }: AdSlotProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!ADSENSE_PUB_ID || pushed.current) return;

    const timer = setTimeout(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).adsbygoogle) {
          (window as any).adsbygoogle.push({});
          pushed.current = true;
        }
      } catch {
        setHidden(true);
      }

      // Check if ad actually filled after a delay
      setTimeout(() => {
        const container = adRef.current;
        if (!container) return;
        const ins = container.querySelector("ins.adsbygoogle");
        if (!ins) { setHidden(true); return; }

        // AdSense sets data-ad-status="unfilled" when no ad is available
        const status = ins.getAttribute("data-ad-status");
        const height = ins.clientHeight;
        if (status === "unfilled" || height === 0) {
          setHidden(true);
        }
      }, 3000);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!ADSENSE_PUB_ID || hidden) return null;

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
