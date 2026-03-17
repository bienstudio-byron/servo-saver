"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Send, Check, AlertCircle } from "lucide-react";
import { FUEL_TYPE_LABELS } from "@/lib/constants";

interface ReportPriceModalProps {
  stationId: string;
  stationName: string;
  selectedFuelType: string;
  currentPrice?: number;
  onClose: () => void;
}

const FUEL_OPTIONS = ["U91", "P95", "P98", "DSL", "E10", "LPG"];

function getDeviceId(): string {
  const key = "petrolsaver-device-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function ReportPriceModal({
  stationId,
  stationName,
  selectedFuelType,
  currentPrice,
  onClose,
}: ReportPriceModalProps) {
  const [fuelType, setFuelType] = useState(selectedFuelType);
  const [priceInput, setPriceInput] = useState(currentPrice ? currentPrice.toFixed(1) : "");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error" | "rate-limited">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = async () => {
    const price = parseFloat(priceInput);
    if (isNaN(price) || price <= 0 || price >= 500) {
      setErrorMsg("Enter a valid price (e.g. 175.9)");
      setStatus("error");
      return;
    }

    // Outlier check: if we have an official price, reject >20% deviation
    if (currentPrice && Math.abs(price - currentPrice) / currentPrice > 0.2) {
      setErrorMsg(`That's more than 20% different from the official price (${currentPrice.toFixed(1)}c). Are you sure?`);
      // Allow submission on second attempt
      if (status === "error" && errorMsg.includes("20%")) {
        // User confirmed — proceed
      } else {
        setStatus("error");
        return;
      }
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/community-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId,
          fuelType,
          price,
          deviceId: getDeviceId(),
        }),
      });

      if (res.status === 429) {
        setStatus("rate-limited");
        return;
      }

      if (!res.ok) {
        setStatus("error");
        setErrorMsg("Something went wrong. Try again.");
        return;
      }

      setStatus("success");
      setTimeout(onClose, 1500);
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Check your connection.");
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[3000] bg-black/40"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-[3001] mx-auto max-w-sm md:bottom-auto md:top-1/2 md:-translate-y-1/2 rounded-t-2xl md:rounded-2xl bg-[var(--card)] border border-[var(--subtle-border)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h3 className="text-sm font-bold text-[var(--foreground)]">Report a price</h3>
            <p className="text-[11px] text-[var(--muted)] truncate max-w-[250px]">{stationName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="px-4 pb-5 space-y-4">
          {/* Fuel type selector */}
          <div>
            <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5 block">Fuel type</label>
            <div className="flex gap-1">
              {FUEL_OPTIONS.map((id) => {
                const short = id === "DSL" ? "Diesel" : id;
                return (
                  <button
                    key={id}
                    onClick={() => setFuelType(id)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer ${
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
          </div>

          {/* Price input */}
          <div>
            <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5 block">
              Price you see (c/L)
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={priceInput}
                onChange={(e) => { setPriceInput(e.target.value); setStatus("idle"); setErrorMsg(""); }}
                placeholder="e.g. 175.9"
                style={{ fontSize: "16px" }}
                className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl px-4 py-3 text-lg font-bold font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)] font-mono">c/L</span>
            </div>
            {currentPrice && (
              <p className="text-[10px] text-[var(--muted)] mt-1">
                Official price: {currentPrice.toFixed(1)}c/L ({FUEL_TYPE_LABELS[fuelType] ?? fuelType})
              </p>
            )}
          </div>

          {/* Status messages */}
          {status === "error" && errorMsg && (
            <div className="flex items-center gap-2 text-xs text-[var(--tier-exp)]">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              {errorMsg}
            </div>
          )}

          {status === "rate-limited" && (
            <div className="flex items-center gap-2 text-xs text-[var(--tier-mid)]">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              You already reported this station recently. Try again in an hour.
            </div>
          )}

          {status === "success" && (
            <div className="flex items-center gap-2 text-xs text-[var(--tier-cheap)]">
              <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
              Thanks! Your price has been submitted.
            </div>
          )}

          {/* Submit button */}
          {status !== "success" && (
            <button
              onClick={handleSubmit}
              disabled={status === "submitting" || status === "rate-limited" || !priceInput}
              className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                status === "submitting" || status === "rate-limited" || !priceInput
                  ? "bg-[var(--subtle)] text-[var(--muted)] cursor-not-allowed"
                  : "bg-[var(--foreground)] text-[var(--card)] hover:opacity-90"
              }`}
            >
              {status === "submitting" ? (
                <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" strokeWidth={2.5} />
              )}
              {status === "error" && errorMsg.includes("20%") ? "Submit anyway" : "Submit price"}
            </button>
          )}

          <p className="text-[9px] text-[var(--muted)] text-center">
            This will update the price shown to all PetrolSaver users. Valid until next official update.
          </p>
        </div>
      </motion.div>
    </>
  );
}
