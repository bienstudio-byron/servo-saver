"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation, Info, ChevronDown, Pencil, X, Heart } from "lucide-react";
import type { StationWithPrices } from "@/types/fuel";
import { haversineDistance } from "@/lib/geo";
import { useFuelStore } from "@/stores/fuel-store";
import { usePriceThresholds } from "@/stores/price-context";
import { getPriceTier } from "@/lib/price-utils";
import BrandLogo from "@/components/shared/BrandLogo";

export interface RankedOption {
  station: StationWithPrices;
  price: number;
  distance: number;
  detourKm: number;
  detourMins: number;
  netSavings: number;
  tag: string;
  isStale: boolean;
  updatedAt: string;
}

interface TripSummaryCardProps {
  options: RankedOption[];
  closestOpt: RankedOption | null;
  onEditTrip: () => void;
  selectedIdx: number;
  onSelectIdx: (idx: number) => void;
}

const DEFAULT_CONSUMPTION = 8.5;
const DEFAULT_TANK_SIZE = 55;
const MAX_RANGE_KM = 800;
const ROAD_FACTOR = 1.35;

export default function TripSummaryCard({ options, closestOpt, onEditTrip, selectedIdx, onSelectIdx }: TripSummaryCardProps) {
  const tripDestination = useFuelStore((s) => s.tripDestination);
  const tripOrigin = useFuelStore((s) => s.tripOrigin);
  const userLocation = useFuelStore((s) => s.userLocation);
  const rangeKm = useFuelStore((s) => s.rangeKm);
  const setTripMode = useFuelStore((s) => s.setTripMode);
  const setTripDestination = useFuelStore((s) => s.setTripDestination);
  const setTripOrigin = useFuelStore((s) => s.setTripOrigin);
  const setSelectedStation = useFuelStore((s) => s.setSelectedStation);
  const thresholds = usePriceThresholds();

  const [showMore, setShowMore] = useState(false);

  if (!tripDestination || options.length === 0) return null;

  const origin = tripOrigin ?? userLocation;
  const selected = options[selectedIdx] ?? options[0];
  const tripDistance = origin
    ? haversineDistance(origin.lat, origin.lng, tripDestination.lat, tripDestination.lng) * ROAD_FACTOR
    : 0;
  const litresFillingUp = Math.max(0, DEFAULT_TANK_SIZE * (1 - Math.min(1, rangeKm / MAX_RANGE_KM)));
  const tripCost = (tripDistance / 100) * DEFAULT_CONSUMPTION * selected.price / 100;
  const saving = selected.netSavings;

  const originName = tripOrigin?.name || "Your location";

  const getTierColor = (price: number) => {
    const tier = getPriceTier(price, thresholds);
    switch (tier) {
      case "cheap": return "text-[var(--tier-cheap)]";
      case "mid": return "text-[var(--tier-mid)]";
      case "expensive": return "text-[var(--tier-exp)]";
      default: return "text-[var(--muted)]";
    }
  };

  const formatUpdated = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffHrs = Math.floor((now.getTime() - d.getTime()) / 3600000);
    if (diffHrs < 1) return "Updated just now";
    if (diffHrs < 24) return `Updated ${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return "Updated yesterday";
    return `Updated ${diffDays}d ago`;
  };

  const handleClearTrip = () => {
    setTripMode("nearby");
    setTripDestination(null);
    setTripOrigin(null);
  };

  const otherOptions = options.filter((_, i) => i !== selectedIdx);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] md:right-auto md:bottom-4 md:left-3 md:w-[24rem] flex flex-col items-end">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.3 }}
        className="w-full max-h-[55vh] md:max-h-[70vh] rounded-t-2xl md:rounded-2xl border-t md:border border-[var(--subtle-border)] bg-[var(--card)]/95 backdrop-blur-xl shadow-2xl overflow-clip flex flex-col"
      >
        {/* Trip header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-[var(--foreground)] truncate">
              Trip to {tripDestination.name}
            </div>
            <div className="text-[11px] text-[var(--muted)]">
              From {originName} · ~{Math.round(tripDistance)}km
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onEditTrip}
              className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              title="Edit trip"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <button
              onClick={handleClearTrip}
              className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              title="End trip"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="px-4 pb-3 grid grid-cols-3 gap-2">
          <div className="bg-[var(--subtle)] rounded-xl p-2.5 text-center">
            <div className="text-[9px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-0.5">Trip cost</div>
            <div className="text-base font-bold font-mono text-[var(--foreground)]">${tripCost.toFixed(2)}</div>
          </div>
          <div className="bg-[var(--subtle)] rounded-xl p-2.5 text-center">
            <div className="text-[9px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-0.5">Saving</div>
            <div className={`text-base font-bold font-mono ${saving > 0 ? "text-[var(--tier-cheap)]" : "text-[var(--muted)]"}`}>
              {saving > 0 ? `$${saving.toFixed(2)}` : "$0"}
            </div>
          </div>
          <div className="bg-[var(--subtle)] rounded-xl p-2.5 text-center">
            <div className="text-[9px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-0.5">Fill up</div>
            <div className="text-base font-bold font-mono text-[var(--foreground)]">{Math.round(litresFillingUp)}L</div>
          </div>
        </div>

        {/* Selected stop */}
        <div className="px-4 pb-3">
          <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
            {selectedIdx === 0 ? "Recommended stop" : `Option ${selectedIdx + 1}`}
          </div>
          <div className="flex items-center gap-3">
            <BrandLogo brandName={selected.station.brand?.name ?? "?"} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[var(--foreground)] text-sm truncate">{selected.station.name}</span>
                {selected.tag && (
                  <span className={`text-[8px] font-bold uppercase shrink-0 px-1.5 py-0.5 rounded-full border ${getTierColor(selected.price)} border-current opacity-80`}>
                    {selected.tag}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[var(--muted)]">
                {selected.distance.toFixed(1)}km
                {selected.detourKm < 0.5 ? " · no detour" : ` · +${selected.detourKm.toFixed(1)}km detour`}
                {" · "}{formatUpdated(selected.updatedAt)}
              </div>
            </div>
            <div className={`text-xl font-bold font-mono shrink-0 ${getTierColor(selected.price)}`}>
              {selected.price.toFixed(1)}<span className="text-xs text-[var(--muted)]">c</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selected.station.latitude},${selected.station.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[var(--accent)] text-[var(--accent-contrast)] px-3 py-2 rounded-lg text-xs font-bold hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
            >
              <Navigation className="h-3.5 w-3.5" strokeWidth={2} />
              Directions
            </a>
            <button
              onClick={() => setSelectedStation(selected.station)}
              className="inline-flex items-center justify-center gap-1.5 bg-[var(--subtle)] border border-[var(--subtle-border)] text-[var(--muted)] px-3 py-2 rounded-lg text-xs font-bold hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer"
            >
              <Info className="h-3.5 w-3.5" strokeWidth={2} />
              Details
            </button>
          </div>
        </div>

        {/* Other options */}
        {otherOptions.length > 0 && (
          <div className="border-t border-[var(--subtle-border)] overflow-y-auto flex-1 min-h-0">
            <button
              onClick={() => setShowMore(!showMore)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            >
              <span>{otherOptions.length} more option{otherOptions.length !== 1 ? "s" : ""}</span>
              <motion.div animate={{ rotate: showMore ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
              </motion.div>
            </button>

            <AnimatePresence>
              {showMore && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {options.map((opt, i) => {
                    if (i === selectedIdx) return null;
                    const isRecommended = i === 0;
                    return (
                      <button
                        key={opt.station.id}
                        onClick={() => onSelectIdx(i)}
                        className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer border-t border-[var(--subtle-border)]"
                      >
                        <span className="text-[10px] font-mono text-[var(--muted)] w-3 text-right shrink-0">{i + 1}</span>
                        <BrandLogo brandName={opt.station.brand?.name ?? "?"} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium truncate text-[var(--foreground)] text-xs">{opt.station.name}</span>
                            {isRecommended && selectedIdx !== 0 && (
                              <span className="text-[8px] font-bold uppercase shrink-0 px-1.5 py-0.5 rounded bg-[var(--subtle)] text-[var(--tier-cheap)]">Best</span>
                            )}
                          </div>
                          <div className="text-[10px] text-[var(--muted)]">
                            {opt.distance.toFixed(1)}km
                            {opt.detourKm > 0.5 && <> · +{opt.detourKm.toFixed(1)}km</>}
                            {closestOpt && opt.netSavings > 0 && (
                              <> · <span className="text-[var(--tier-cheap)]">saves ${opt.netSavings.toFixed(2)}</span></>
                            )}
                          </div>
                        </div>
                        <div className={`font-bold font-mono shrink-0 text-xs ${getTierColor(opt.price)}`}>
                          {opt.price.toFixed(1)}c
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Support footer */}
        <div className="shrink-0 border-t border-[var(--subtle-border)]">
          <a
            href="https://buymeacoffee.com/petrolsaver"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-3 text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer"
          >
            <Heart className="h-3.5 w-3.5" strokeWidth={2} />
            <span>Keep PetrolSaver free — <span className="font-semibold text-[var(--foreground)]">buy us a coffee</span></span>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
