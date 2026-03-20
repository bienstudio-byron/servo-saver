"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Fuel, Route } from "lucide-react";
import { useFuelStore, type AppMode } from "@/stores/fuel-store";
import SidebarFooter from "./SidebarFooter";

const modes: { id: AppMode; label: string; icon: typeof Fuel }[] = [
  { id: "petrol", label: "Fuel", icon: Fuel },
  { id: "tolls", label: "Tolls", icon: Route },
];

interface SidebarShellProps {
  children: ReactNode;
  /** Logo title — first word plain, second word blue. e.g. ["Petrol", "Saver"] */
  title?: [string, string];
  /** Optional text in the top-right of the logo bar (e.g. suburb name) */
  subtitle?: string;
  /** Mobile max-height class. Default: "max-h-[45vh]" */
  mobileMaxHeight?: string;
  /** How-it-works URL for footer. Default: "/how-it-works" */
  howItWorksUrl?: string;
  /** Show mode tabs (Fuel | Tolls) in the header. Default: true */
  showTabs?: boolean;
  /** Content rendered before the motion wrapper (e.g. MobileFloatingButtons) */
  above?: ReactNode;
}

export default function SidebarShell({
  children,
  title = ["Petrol", "Saver"],
  subtitle,
  mobileMaxHeight = "max-h-[45vh]",
  howItWorksUrl = "/how-it-works",
  showTabs = true,
  above,
}: SidebarShellProps) {
  const mode = useFuelStore((s) => s.mode);
  const setMode = useFuelStore((s) => s.setMode);

  return (
    <div className={`absolute bottom-0 left-0 right-0 z-[1000] max-h-[100dvh] md:bottom-4 md:left-4 md:right-auto md:w-[380px] md:max-h-[60vh] flex flex-col items-stretch`}>
      {above}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.3 }}
        className={`w-full ${mobileMaxHeight} md:max-h-[60vh] rounded-t-2xl md:rounded-2xl border-t md:border border-[var(--subtle-border)] bg-[var(--card)]/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col`}
      >
        {/* Header — desktop only: logo + inline tabs */}
        <div className="hidden md:flex items-center px-3.5 py-2 shrink-0 border-b border-[var(--subtle-border)]">
          <img src="/logos/nav-icon.png" alt={`${title[0]}${title[1]}`} className="h-5 w-5" />
          <span className="text-[13px] font-bold text-[var(--foreground)] ml-1.5">
            {title[0]}<span className="text-[#4285f4]">{title[1]}</span>
          </span>

          {showTabs && (
            <div className="flex items-center gap-0.5 ml-auto bg-[var(--background)] rounded-lg p-0.5 border border-[var(--subtle-border)]">
              {modes.map((m) => {
                const active = mode === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      active
                        ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <Icon className={`h-3 w-3 ${active ? "text-[var(--accent-text)]" : ""}`} strokeWidth={2.5} />
                    {m.label}
                  </button>
                );
              })}
            </div>
          )}

          {subtitle && !showTabs && (
            <span className="text-[10px] text-[var(--muted)] truncate ml-auto">{subtitle}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {children}
        </div>

        <SidebarFooter howItWorksUrl={howItWorksUrl} />
      </motion.div>
    </div>
  );
}
