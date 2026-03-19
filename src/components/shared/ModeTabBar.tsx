"use client";

import { Fuel, Route } from "lucide-react";
import { useFuelStore, type AppMode } from "@/stores/fuel-store";

const tabs: { id: AppMode; label: string; icon: typeof Fuel }[] = [
  { id: "petrol", label: "Fuel", icon: Fuel },
  { id: "tolls", label: "Tolls", icon: Route },
];

export default function ModeTabBar() {
  const mode = useFuelStore((s) => s.mode);
  const setMode = useFuelStore((s) => s.setMode);

  return (
    <div className="flex items-center bg-[var(--card)] border-b border-[var(--subtle-border)] px-2 shrink-0">
      {tabs.map((tab) => {
        const active = mode === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors relative ${
              active
                ? "text-[var(--accent-text)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            {tab.label}
            {active && (
              <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[var(--accent-text)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
