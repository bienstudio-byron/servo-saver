"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AlertSignupProps {
  selectedFuelType: string;
  onClose: () => void;
}

export default function AlertSignup({ selectedFuelType, onClose }: AlertSignupProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fuelType: selectedFuelType }),
      });

      if (res.ok) {
        setStatus("success");
        setTimeout(onClose, 2500);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-sm mx-4 rounded-2xl bg-[#242424] border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          {status === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 text-center"
            >
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-lg font-bold text-white mb-1">You&apos;re in!</h3>
              <p className="text-sm text-[#9aa0a6]">
                We&apos;ll email you when prices drop.
              </p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Get price alerts</h3>
                    <p className="text-xs text-[#9aa0a6]">We&apos;ll email you when fuel gets cheaper</p>
                  </div>
                  <button onClick={onClose} className="p-1 text-[#5f6368] hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    style={{ fontSize: "16px" }}
                    className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white placeholder:text-[#5f6368] focus:border-[#4285f4] focus:outline-none focus:ring-1 focus:ring-[#4285f4]/30 transition-all mb-3"
                  />

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="w-full py-3 rounded-xl bg-[#4285f4] text-white font-bold text-sm hover:bg-[#5a9bf6] active:bg-[#3367d6] transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {status === "loading" ? (
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        Notify me
                      </>
                    )}
                  </button>

                  {status === "error" && (
                    <p className="text-xs text-red-400 text-center mt-2">Something went wrong. Try again.</p>
                  )}
                </form>

                <p className="text-[9px] text-[#5f6368] text-center mt-3">
                  No spam. Unsubscribe anytime. We only send when prices change significantly.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
