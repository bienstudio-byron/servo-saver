"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Send, Check } from "lucide-react";

interface FeedbackModalProps {
  onClose: () => void;
}

export default function FeedbackModal({ onClose }: FeedbackModalProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: text.trim() }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
      setTimeout(onClose, 1500);
    } catch {
      setError("Failed to send — try again");
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-end md:items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md mx-4 rounded-t-2xl md:rounded-2xl bg-[var(--card)] border border-[var(--subtle-border)] shadow-2xl overflow-hidden"
      >
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Leave feedback</h2>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">
              Bug reports, feature requests, or just tell us what you think
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="px-5 pb-5">
          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center"
            >
              <div className="h-10 w-10 rounded-full bg-[var(--tier-cheap)]/15 flex items-center justify-center mx-auto mb-3">
                <Check className="h-5 w-5 text-[var(--tier-cheap)]" strokeWidth={2.5} />
              </div>
              <div className="text-sm font-semibold text-[var(--foreground)]">Thanks for the feedback!</div>
              <div className="text-[11px] text-[var(--muted)] mt-1">We read every message.</div>
            </motion.div>
          ) : (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What's on your mind?"
                rows={4}
                style={{ fontSize: "16px" }}
                className="w-full bg-[var(--subtle)] border border-[var(--subtle-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[#4285f4] transition-colors resize-none"
              />
              {error && (
                <div className="text-[11px] text-[var(--tier-exp)] mt-1.5">{error}</div>
              )}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!text.trim() || sending}
                className={`w-full mt-3 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  text.trim() && !sending
                    ? "bg-[var(--foreground)] text-[var(--card)] hover:opacity-90 shadow-lg"
                    : "bg-[var(--subtle)] text-[var(--muted)] cursor-not-allowed"
                }`}
              >
                {sending ? (
                  <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : (
                  <Send className="h-4 w-4" strokeWidth={2} />
                )}
                {sending ? "Sending..." : "Send feedback"}
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
