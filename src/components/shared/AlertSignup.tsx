"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FUEL_TYPE_LABELS } from "@/lib/constants";

interface AlertSignupProps {
  selectedFuelType: string;
  onClose: () => void;
}

const MAIN_FUELS = ["U91", "P95", "P98", "DSL", "E10", "LPG"];

export default function AlertSignup({ selectedFuelType, onClose }: AlertSignupProps) {
  const [email, setEmail] = useState("");
  const [suburb, setSuburb] = useState("");
  const [fuelType, setFuelType] = useState(selectedFuelType);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  // Try to auto-detect suburb from reverse geocoding
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
            { headers: { "User-Agent": "PetrolSaver/1.0" } }
          );
          const data = await res.json();
          const sub = data.address?.suburb || data.address?.town || data.address?.city || "";
          if (sub) setSuburb(sub);
        } catch {}
      },
      () => {},
      { timeout: 3000 }
    );
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fuelType, suburb }),
      });

      if (res.ok) {
        setStatus("success");
        localStorage.setItem("petrolsaver-alert-signed-up", "1");
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
                We&apos;ll email you when {FUEL_TYPE_LABELS[fuelType] ?? fuelType} prices drop{suburb ? ` in ${suburb}` : ""}.
              </p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Header */}
              <div className="px-5 pt-5 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-bold text-white">Never miss a price drop</h3>
                  <button onClick={onClose} className="p-1 text-[#5f6368] hover:text-white transition-colors cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-[#9aa0a6]">Get notified when fuel prices change in your area</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="px-5 pb-5">
                {/* Email */}
                <div className="mb-3">
                  <label className="block text-[10px] font-semibold text-[#9aa0a6] uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    style={{ fontSize: "16px" }}
                    className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-2.5 text-white placeholder:text-[#5f6368] focus:border-[#4285f4] focus:outline-none focus:ring-1 focus:ring-[#4285f4]/30 transition-all"
                  />
                </div>

                {/* Suburb */}
                <div className="mb-3">
                  <label className="block text-[10px] font-semibold text-[#9aa0a6] uppercase tracking-wider mb-1">Suburb (optional)</label>
                  <input
                    type="text"
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    placeholder="e.g. Richmond"
                    style={{ fontSize: "16px" }}
                    className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-2.5 text-white placeholder:text-[#5f6368] focus:border-[#4285f4] focus:outline-none focus:ring-1 focus:ring-[#4285f4]/30 transition-all"
                  />
                </div>

                {/* Fuel type */}
                <div className="mb-4">
                  <label className="block text-[10px] font-semibold text-[#9aa0a6] uppercase tracking-wider mb-1.5">Fuel type</label>
                  <div className="flex gap-1.5">
                    {MAIN_FUELS.map((id) => {
                      const short = id === "DSL" ? "Diesel" : id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setFuelType(id)}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold text-center transition-all cursor-pointer ${
                            fuelType === id
                              ? "bg-[#4285f4] text-white"
                              : "bg-white/[0.04] text-[#5f6368] hover:text-[#9aa0a6]"
                          }`}
                        >
                          {short}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full py-3 rounded-xl bg-[#fbbc04] text-[#1a1a1a] font-bold text-sm hover:bg-[#fdd835] active:bg-[#f9a825] transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {status === "loading" ? (
                    <div className="h-4 w-4 rounded-full border-2 border-[#1a1a1a] border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      Get notified
                    </>
                  )}
                </button>

                {status === "error" && (
                  <p className="text-xs text-red-400 text-center mt-2">Something went wrong. Try again.</p>
                )}

                <p className="text-[9px] text-[#5f6368] text-center mt-3">
                  No spam, ever. Unsubscribe anytime.
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
