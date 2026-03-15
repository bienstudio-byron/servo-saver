"use client";

import { motion } from "framer-motion";
import { FUEL_TYPE_LABELS } from "@/lib/constants";

interface FuelPickerOverlayProps {
  onSelect: (fuelType: string) => void;
}

const MAIN_FUELS = [
  { id: "U91", label: "Unleaded 91", desc: "Most common", icon: "⛽" },
  { id: "P95", label: "Premium 95", desc: "Mid-grade", icon: "⛽" },
  { id: "P98", label: "Premium 98", desc: "High-performance", icon: "🏎" },
  { id: "DSL", label: "Diesel", desc: "Trucks & SUVs", icon: "🛻" },
  { id: "E10", label: "Ethanol E10", desc: "Budget option", icon: "🌿" },
  { id: "LPG", label: "LPG", desc: "Gas vehicles", icon: "💨" },
];

const OTHER_FUELS = Object.entries(FUEL_TYPE_LABELS).filter(
  ([id]) => !MAIN_FUELS.some((m) => m.id === id)
);

export default function FuelPickerOverlay({ onSelect }: FuelPickerOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/70 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300, delay: 0.1 }}
        className="w-full max-w-md mx-4 rounded-2xl bg-[#242424] border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="px-6 pt-6 pb-4 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15, stiffness: 400, delay: 0.3 }}
            className="h-12 w-12 mx-auto mb-3 rounded-xl bg-[#4285f4]/15 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#4285f4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl font-bold text-white mb-1"
          >
            What fuel do you use?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-[#9aa0a6]"
          >
            We&apos;ll show you the best prices nearby
          </motion.p>
        </div>

        <div className="px-4 pb-2 grid grid-cols-2 gap-2">
          {MAIN_FUELS.map((fuel, i) => (
            <motion.button
              key={fuel.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.05 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(fuel.id)}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-colors bg-white/[0.04] hover:bg-[#4285f4]/15 hover:ring-1 hover:ring-[#4285f4]/30 group"
            >
              <span className="text-xl">{fuel.icon}</span>
              <div>
                <div className="text-sm font-semibold text-white group-hover:text-[#8ab4f8] transition-colors">
                  {fuel.label}
                </div>
                <div className="text-[11px] text-[#9aa0a6]">{fuel.desc}</div>
              </div>
            </motion.button>
          ))}
        </div>

        {OTHER_FUELS.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="px-4 pb-4 pt-2"
          >
            <div className="flex flex-wrap gap-1.5">
              {OTHER_FUELS.map(([id, label]) => (
                <motion.button
                  key={id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSelect(id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] text-[#9aa0a6] hover:bg-white/10 hover:text-white transition-all"
                >
                  {label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="px-6 py-3 border-t border-white/5 text-center"
        >
          <p className="text-[11px] text-[#5f6368]">You can change this anytime from the map</p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
