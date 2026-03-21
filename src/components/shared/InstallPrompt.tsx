"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or already installed
    if (localStorage.getItem("petrolsaver-install-dismissed")) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after 30 seconds of use
      setTimeout(() => setShow(true), 30000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("petrolsaver-install-dismissed", "1");
  };

  if (dismissed || !show || !deferredPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:w-[320px] z-[3000] bg-[var(--card)] border border-[var(--subtle-border)] rounded-2xl shadow-2xl p-4"
      >
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--accent-text)]/10 flex items-center justify-center shrink-0">
            <img src="/logos/nav-icon.png" alt="" className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-[var(--foreground)]">Add PetrolSaver to Home Screen</div>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">Quick access to cheap fuel — works offline too</p>
          </div>
          <button onClick={handleDismiss} className="p-1 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer shrink-0">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleDismiss} className="flex-1 py-2 rounded-xl text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
            Not now
          </button>
          <button onClick={handleInstall} className="flex-1 py-2 rounded-xl text-[12px] font-bold bg-[var(--foreground)] text-[var(--card)] hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-1.5">
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
            Install
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
