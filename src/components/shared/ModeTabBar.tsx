"use client";

import { Fuel, Route } from "lucide-react";
import { useFuelStore, type AppMode } from "@/stores/fuel-store";

const tabs: { id: AppMode; label: string; sub: string; icon: typeof Fuel }[] = [
  { id: "petrol", label: "Fuel", sub: "Cheapest fill near you", icon: Fuel },
  { id: "tolls", label: "Tolls", sub: "Is the toll worth it?", icon: Route },
];

export default function ModeTabBar() {
  const mode = useFuelStore((s) => s.mode);
  const setMode = useFuelStore((s) => s.setMode);

  return (
    <div className="flex bg-[var(--card)] border-b border-[var(--subtle-border)] shrink-0">
      {tabs.map((tab) => {
        const active = mode === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 md:py-2 transition-colors relative cursor-pointer ${
              active
                ? "text-[var(--foreground)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Icon className={`h-4 w-4 md:h-3.5 md:w-3.5 shrink-0 ${active ? "text-[var(--accent-text)]" : ""}`} strokeWidth={2} />
            <div className="text-left">
              <div className={`text-[12px] md:text-[11px] font-bold tracking-wide ${active ? "" : "font-semibold"}`}>
                {tab.label}
              </div>
              <div className="text-[9px] text-[var(--muted)] hidden md:block">{tab.sub}</div>
            </div>
            {active && (
              <div className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-[var(--accent-text)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
