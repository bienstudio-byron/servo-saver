"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Check } from "lucide-react";
import { FUEL_TYPE_LABELS } from "@/lib/constants";

function getDeviceId(): string {
  const key = "petrolsaver-device-id";
  let id = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  if (!id) {
    id = crypto.randomUUID();
    try { localStorage.setItem(key, id); } catch {}
  }
  return id;
}

interface InlineReportFormProps {
  stationId: string;
  stationName: string;
  currentPrice: number;
  selectedFuelType: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function InlineReportForm({
  stationId,
  stationName,
  currentPrice,
  selectedFuelType,
  onClose,
  onSuccess,
}: InlineReportFormProps) {
  const [priceInput, setPriceInput] = useState(currentPrice ? currentPrice.toFixed(1) : "");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error" | "rate-limited">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollInputIntoView = () => {
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  };

  const handleSubmit = async () => {
    const price = parseFloat(priceInput);
    if (isNaN(price) || price <= 0 || price >= 500) {
      setErrorMsg("Enter a valid price");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/api/community-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId, fuelType: selectedFuelType, price, deviceId: getDeviceId() }),
      });
      if (res.status === 429) { setStatus("rate-limited"); return; }
      if (!res.ok) { setStatus("error"); setErrorMsg("Something went wrong"); return; }
      setStatus("success");
      onSuccess?.();
      setTimeout(onClose, 1200);
    } catch {
      setStatus("error");
      setErrorMsg("Network error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="space-y-2.5 pt-1"
    >
      <div className="flex items-center gap-2">
        <button onClick={onClose} className="p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-[var(--foreground)] truncate">Update {FUEL_TYPE_LABELS[selectedFuelType] ?? selectedFuelType} price</div>
          <div className="text-[10px] text-[var(--muted)] truncate">{stationName}</div>
        </div>
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          step="0.1"
          value={priceInput}
          onChange={(e) => { setPriceInput(e.target.value); setStatus("idle"); setErrorMsg(""); }}
          onFocus={scrollInputIntoView}
          placeholder="e.g. 175.9"
          style={{ fontSize: "16px" }}
          className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-lg px-3 py-2 text-sm font-bold font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
          autoFocus
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--muted)] font-mono">c/L</span>
      </div>

      {status === "error" && <p className="text-[10px] text-[var(--tier-exp)]">{errorMsg}</p>}
      {status === "rate-limited" && <p className="text-[10px] text-[var(--tier-mid)]">Already reported recently. Try again in an hour.</p>}
      {status === "success" && (
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--tier-cheap)] font-medium">
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          Thanks! Price submitted.
        </div>
      )}

      {status !== "success" && (
        <button
          onClick={handleSubmit}
          disabled={status === "submitting" || status === "rate-limited" || !priceInput}
          className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            status === "submitting" || !priceInput
              ? "bg-[var(--subtle)] text-[var(--muted)] cursor-not-allowed"
              : "bg-[var(--foreground)] text-[var(--card)] hover:opacity-90"
          }`}
        >
          {status === "submitting" ? (
            <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" strokeWidth={2.5} />
          )}
          Submit
        </button>
      )}

      <p className="text-[8px] text-[var(--muted)] text-center">Valid until next official update</p>
    </motion.div>
  );
}
