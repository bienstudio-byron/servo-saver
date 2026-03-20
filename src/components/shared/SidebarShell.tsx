"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import SidebarFooter from "./SidebarFooter";

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
  /** Content rendered before the motion wrapper (e.g. MobileFloatingButtons) */
  above?: ReactNode;
}

export default function SidebarShell({
  children,
  title = ["Petrol", "Saver"],
  subtitle,
  mobileMaxHeight = "max-h-[45vh]",
  howItWorksUrl = "/how-it-works",
  above,
}: SidebarShellProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] max-h-[100dvh] md:bottom-4 md:left-4 md:right-auto md:w-[380px] md:max-h-[60vh] flex flex-col items-stretch">
      {above}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.3 }}
        className={`w-full ${mobileMaxHeight} md:max-h-[60vh] rounded-t-2xl md:rounded-2xl border-t md:border border-[var(--subtle-border)] bg-[var(--card)]/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col`}
      >
        {/* Header — desktop only */}
        {subtitle && (
          <div className="hidden md:flex items-center px-3.5 py-2.5 shrink-0 border-b border-[var(--subtle-border)]">
            <span className="text-[12px] font-semibold text-[var(--foreground)] truncate">{subtitle}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {children}
        </div>

        <SidebarFooter howItWorksUrl={howItWorksUrl} />
      </motion.div>
    </div>
  );
}
