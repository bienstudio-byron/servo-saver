"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import FeedbackModal from "./FeedbackModal";

const linkClass = "text-[9px] font-mono text-[var(--muted)] hover:text-[var(--foreground)] px-2 py-0.5 rounded-full border border-[var(--subtle-border)] hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer";

export default function SidebarFooter({ howItWorksUrl = "/how-it-works" }: { howItWorksUrl?: string }) {
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <>
      <div className="shrink-0 border-t border-[var(--subtle-border)]">
        <div className="px-3 py-2 flex items-center justify-center gap-1.5">
          <a href={howItWorksUrl} className={linkClass}>How it works</a>
          <a href="/legal" className={linkClass}>Legal</a>
          <button onClick={() => setShowFeedback(true)} className={linkClass}>Feedback</button>
        </div>
      </div>

      {showFeedback && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          <FeedbackModal onClose={() => setShowFeedback(false)} />
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
