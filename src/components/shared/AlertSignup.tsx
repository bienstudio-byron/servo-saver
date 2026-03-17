"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, MessageSquare, Send, Check } from "lucide-react";
import { FUEL_TYPE_LABELS } from "@/lib/constants";

interface AlertSignupProps {
  selectedFuelType: string;
  onClose: () => void;
}

const MAIN_FUELS = ["U91", "P95", "P98", "DSL", "E10", "LPG"];

export default function AlertSignup({ selectedFuelType, onClose }: AlertSignupProps) {
  const [step, setStep] = useState<"signup" | "feedback">("signup");
  const [email, setEmail] = useState("");
  const [suburb, setSuburb] = useState("");
  const [fuelType, setFuelType] = useState(selectedFuelType);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "loading" | "success">("idle");

  // Try to auto-detect suburb
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

  async function handleSignup(e: React.FormEvent) {
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

  function handleDismissSignup() {
    setStep("feedback");
  }

  async function handleFeedback() {
    if (!feedbackText.trim()) return;
    setFeedbackStatus("loading");
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedbackText }),
      });
    } catch {}
    setFeedbackStatus("success");
    sessionStorage.setItem("petrolsaver-alert-dismissed", "1");
    setTimeout(onClose, 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed bottom-4 right-4 z-[2000] w-[340px] rounded-2xl bg-[var(--card)] border border-[var(--subtle-border)] shadow-2xl overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {/* === Step 1: Signup === */}
        {step === "signup" && status !== "success" && (
          <motion.div key="signup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}>
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[#4285f4]" strokeWidth={2} />
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Never miss a price drop</h3>
                </div>
                <button onClick={handleDismissSignup} className="p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
              <p className="text-[11px] text-[var(--muted)] ml-6">Get notified when prices change in your area</p>
            </div>

            <form onSubmit={handleSignup} className="px-4 pb-4">
              <div className="mb-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={{ fontSize: "16px" }}
                  className="w-full rounded-lg border border-[var(--subtle-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[#4285f4] focus:outline-none transition-all"
                />
              </div>

              <div className="mb-2">
                <input
                  type="text"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  placeholder="Suburb (optional)"
                  style={{ fontSize: "16px" }}
                  className="w-full rounded-lg border border-[var(--subtle-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[#4285f4] focus:outline-none transition-all"
                />
              </div>

              <div className="flex gap-1 mb-3">
                {MAIN_FUELS.map((id) => {
                  const short = id === "DSL" ? "Diesel" : id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFuelType(id)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer ${
                        fuelType === id
                          ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                          : "bg-[var(--subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {short}
                    </button>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full py-2.5 rounded-xl bg-[#4285f4] text-white font-bold text-xs hover:bg-[#5a9bf6] transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {status === "loading" ? (
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <Bell className="h-3.5 w-3.5" strokeWidth={2} />
                    Get notified
                  </>
                )}
              </button>

              {status === "error" && (
                <p className="text-[10px] text-[var(--tier-exp)] text-center mt-1.5">Something went wrong. Try again.</p>
              )}

              <p className="text-[8px] text-[var(--muted)] text-center mt-2">No spam, ever. Unsubscribe anytime.</p>
            </form>
          </motion.div>
        )}

        {/* === Signup success === */}
        {step === "signup" && status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 text-center"
          >
            <Check className="h-8 w-8 text-[var(--tier-cheap)] mx-auto mb-2" strokeWidth={2} />
            <h3 className="text-sm font-bold text-[var(--foreground)] mb-0.5">You&apos;re in!</h3>
            <p className="text-xs text-[var(--muted)]">
              We&apos;ll email you when {FUEL_TYPE_LABELS[fuelType] ?? fuelType} prices drop{suburb ? ` in ${suburb}` : ""}.
            </p>
          </motion.div>
        )}

        {/* === Step 2: Feedback === */}
        {step === "feedback" && feedbackStatus !== "success" && (
          <motion.div key="feedback" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#4285f4]" strokeWidth={2} />
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Help us improve</h3>
                </div>
                <button onClick={() => { sessionStorage.setItem("petrolsaver-alert-dismissed", "1"); onClose(); }} className="p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
              <p className="text-[11px] text-[var(--muted)] ml-6">What would make PetrolSaver better for you?</p>
            </div>

            <div className="px-4 pb-4">
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Missing a feature? Found a bug? Tell us..."
                rows={3}
                style={{ fontSize: "16px" }}
                className="w-full rounded-lg border border-[var(--subtle-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[#4285f4] focus:outline-none transition-all resize-none mb-2"
              />

              <button
                onClick={handleFeedback}
                disabled={feedbackStatus === "loading" || !feedbackText.trim()}
                className="w-full py-2.5 rounded-xl bg-[#4285f4] text-white font-bold text-xs hover:bg-[#5a9bf6] transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {feedbackStatus === "loading" ? (
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" strokeWidth={2} />
                    Send feedback
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* === Feedback success === */}
        {step === "feedback" && feedbackStatus === "success" && (
          <motion.div
            key="feedback-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 text-center"
          >
            <Check className="h-8 w-8 text-[var(--tier-cheap)] mx-auto mb-2" strokeWidth={2} />
            <h3 className="text-sm font-bold text-[var(--foreground)] mb-0.5">Thanks!</h3>
            <p className="text-xs text-[var(--muted)]">Your feedback helps us build a better PetrolSaver.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
