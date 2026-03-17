"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flag, X, Navigation, ChevronDown } from "lucide-react";
import type { StationWithPrices } from "@/types/fuel";
import { nearestStations } from "@/lib/geo";
import BrandLogo from "./BrandLogo";
import PriceBadge from "./PriceBadge";
import AdSlot from "./AdSlot";
import ShareButton from "./ShareButton";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import { flagStation, isStationFlagged } from "@/lib/flagged-stations";
import PriceHistory from "./PriceHistory";

interface StationModalProps {
  station: StationWithPrices;
  allStations: StationWithPrices[];
  selectedFuelType: string;
  onClose: () => void;
  onSelectStation: (station: StationWithPrices) => void;
}

export default function StationModal({
  station,
  allStations,
  selectedFuelType,
  onClose,
  onSelectStation,
}: StationModalProps) {
  const [showAllPrices, setShowAllPrices] = useState(false);
  const [flagged, setFlagged] = useState(false);
  useEffect(() => {
    setFlagged(isStationFlagged(station.id));
  }, [station.id]);

  const nearby = nearestStations(
    allStations.filter((s) => s.id !== station.id),
    station.latitude,
    station.longitude,
    5
  );

  const currentPrice = station.prices.find((p) => p.fuelType === selectedFuelType);

  const priceInsight = useMemo(() => {
    if (!currentPrice) return null;
    const allPrices = allStations
      .map((s) => s.prices.find((p) => p.fuelType === selectedFuelType)?.price)
      .filter((p): p is number => p != null)
      .sort((a, b) => a - b);
    if (allPrices.length === 0) return null;
    const cheaperCount = allPrices.filter((p) => p > currentPrice.price).length;
    const percentile = Math.round((cheaperCount / allPrices.length) * 100);
    const cheapest = allPrices[0];
    const average = Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length * 10) / 10;
    const rank = allPrices.filter((p) => p < currentPrice.price).length + 1;
    return { percentile, cheapest, average, rank, total: allPrices.length };
  }, [currentPrice, allStations, selectedFuelType]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const verdictColor = !priceInsight ? "text-[var(--muted)]"
    : priceInsight.percentile >= 90 ? "text-[var(--tier-cheap)]"
    : priceInsight.percentile >= 50 ? "text-[var(--tier-mid)]"
    : "text-[var(--tier-exp)]";

  const fuelLabel = FUEL_TYPE_LABELS[selectedFuelType] ?? selectedFuelType;

  return (
    <>
      {/* Subtle backdrop — doesn't black out the map */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2000] bg-black/30"
        onClick={onClose}
      />

      {/* Card — bottom sheet on mobile, floating panel on desktop */}
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-[2001] max-h-[75vh] rounded-t-2xl border-t border-[var(--subtle-border)] bg-[var(--card)] shadow-2xl md:inset-x-auto md:bottom-4 md:right-4 md:left-auto md:w-[380px] md:rounded-2xl md:border flex flex-col"
      >

        {/* Actions: flag + share + close */}
        <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
          <button
            onClick={() => {
              flagStation(station.id);
              setFlagged(true);
              fetch("/api/flag", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stationName: station.name, stationId: station.id, reason: "User flagged via modal" }),
              }).catch(() => {});
            }}
            className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              flagged ? "text-[var(--tier-exp)] bg-red-500/10" : "text-[var(--muted)] hover:text-[var(--tier-exp)] hover:bg-[var(--subtle-hover)]"
            }`}
            title={flagged ? "Station flagged" : "Report incorrect data"}
          >
            <Flag className="h-3.5 w-3.5" fill={flagged ? "currentColor" : "none"} strokeWidth={2} />
          </button>
          <ShareButton station={station} selectedFuelType={selectedFuelType} size="sm" />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--subtle-hover)] transition-colors"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {/* Flagged banner */}
          {flagged && (
            <div className="mb-3 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 flex items-center gap-2">
              <Flag className="h-4 w-4 text-[var(--tier-exp)] shrink-0" fill="currentColor" strokeWidth={1} />
              <span className="text-xs text-[var(--tier-exp)]">
                Flagged as potentially incorrect. This station will be hidden from your recommendations.
              </span>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center gap-3 mb-3 pr-8">
            {station.brand && <BrandLogo brandName={station.brand.name} size="lg" />}
            <div className="min-w-0">
              <a href={`/station/${encodeURIComponent(station.id)}`} className="text-base font-bold text-[var(--foreground)] truncate block hover:text-[var(--accent-text)] transition-colors">{station.name}</a>
              {station.brand && (
                <p className="text-[11px] text-[var(--muted)]">
                  {station.brand.name} &middot; <span className="capitalize">{station.brand.type}</span>
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-[var(--muted)] mb-3">{station.address}</p>

          {/* Featured price + insight */}
          {currentPrice && priceInsight && (
            <div className="rounded-xl bg-[var(--subtle)] border border-[var(--subtle-border)] p-3.5 mb-3">
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-0.5">{fuelLabel}</div>
                  <div className="text-2xl font-bold font-mono text-[var(--foreground)]">
                    {currentPrice.price.toFixed(1)}<span className="text-sm text-[var(--muted)]">c/L</span>
                  </div>
                  <div className="text-[9px] text-[var(--muted)]">
                    {(() => {
                      const d = new Date(currentPrice.updatedAt);
                      const hrs = Math.floor((Date.now() - d.getTime()) / 3600000);
                      if (hrs < 1) return "Updated just now";
                      if (hrs < 24) return `Updated ${hrs}h ago`;
                      const days = Math.floor(hrs / 24);
                      return days === 1 ? "Updated yesterday" : `Updated ${days}d ago`;
                    })()}
                  </div>
                </div>
                <div className="text-right">
                  {priceInsight.percentile >= 90 ? (
                    <div className="text-[var(--tier-cheap)]">
                      <div className="text-[9px] uppercase tracking-wider opacity-80">Cheaper than</div>
                      <div className="text-xl font-bold font-mono">{priceInsight.percentile}%</div>
                      <div className="text-[9px] uppercase tracking-wider opacity-80">of stations</div>
                    </div>
                  ) : priceInsight.percentile >= 50 ? (
                    <div className="text-[var(--tier-mid)]">
                      <div className="text-[9px] uppercase tracking-wider opacity-80">Cheaper than</div>
                      <div className="text-xl font-bold font-mono">{priceInsight.percentile}%</div>
                      <div className="text-[9px] uppercase tracking-wider opacity-80">of stations</div>
                    </div>
                  ) : (
                    <div className="text-[var(--tier-exp)]">
                      <div className="text-[9px] uppercase tracking-wider opacity-80">More expensive than</div>
                      <div className="text-xl font-bold font-mono">{100 - priceInsight.percentile}%</div>
                      <div className="text-[9px] uppercase tracking-wider opacity-80">of stations</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-1.5">
                <div className="flex-1 rounded-lg bg-[var(--subtle)] px-2 py-1 text-center">
                  <div className="text-[9px] text-[var(--muted)]">Rank</div>
                  <div className="text-[11px] font-bold text-[var(--foreground)] font-mono">#{priceInsight.rank}<span className="text-[var(--muted)]">/{priceInsight.total}</span></div>
                </div>
                <div className="flex-1 rounded-lg bg-[var(--subtle)] px-2 py-1 text-center">
                  <div className="text-[9px] text-[var(--muted)]">Cheapest</div>
                  <div className="text-[11px] font-bold text-[var(--tier-cheap)] font-mono">{priceInsight.cheapest.toFixed(1)}c</div>
                </div>
                <div className="flex-1 rounded-lg bg-[var(--subtle)] px-2 py-1 text-center">
                  <div className="text-[9px] text-[var(--muted)]">Average</div>
                  <div className="text-[11px] font-bold text-[var(--foreground)] font-mono">{priceInsight.average.toFixed(1)}c</div>
                </div>
                <div className="flex-1 rounded-lg bg-[var(--subtle)] px-2 py-1 text-center">
                  <div className="text-[9px] text-[var(--muted)]">vs Avg</div>
                  <div className={`text-[11px] font-bold font-mono ${priceInsight.average > currentPrice.price ? "text-[var(--tier-cheap)]" : "text-[var(--tier-exp)]"}`}>
                    {priceInsight.average > currentPrice.price ? "-" : "+"}{Math.abs(currentPrice.price - priceInsight.average).toFixed(1)}c
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Price history */}
          {currentPrice && (
            <div className="mb-3 rounded-xl bg-[var(--subtle)] border border-[var(--subtle-border)] p-3">
              <PriceHistory stationId={station.id} fuelType={selectedFuelType} />
            </div>
          )}

          {/* Directions */}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`}
            target="_blank" rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-1.5 bg-[var(--accent)] text-[var(--accent-contrast)] px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-[var(--accent-hover)] transition-colors mb-3"
          >
            <Navigation className="h-4 w-4" strokeWidth={2} />
            Get Directions
          </a>

          {/* All fuel prices — collapsed */}
          {station.prices.length > 1 && (
            <>
              <button
                onClick={() => setShowAllPrices(!showAllPrices)}
                className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] text-[var(--muted)] hover:text-[var(--muted)] transition-colors"
              >
                {showAllPrices ? "Hide" : "All"} fuel prices
                <ChevronDown className={`h-3 w-3 transition-transform ${showAllPrices ? "rotate-180" : ""}`} strokeWidth={2} />
              </button>
              {showAllPrices && (
                <div className="space-y-1 mb-3">
                  {station.prices.map((p) => (
                    <div key={p.fuelType} className={`flex items-center justify-between rounded-lg px-3 py-1.5 ${p.fuelType === selectedFuelType ? "bg-[var(--accent)]/10" : "bg-[var(--subtle)]"}`}>
                      <span className="text-xs text-[var(--muted)]">{FUEL_TYPE_LABELS[p.fuelType] ?? p.fuelType}</span>
                      <span className="text-xs font-mono font-bold text-[var(--foreground)]">{p.price.toFixed(1)}c</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Ad */}
          <div className="mb-3">
            <AdSlot slot="station-modal" format="fluid" />
          </div>

          {/* Nearby stations */}
          {nearby.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Nearby</div>
              <div className="space-y-1">
                {nearby.map((s) => {
                  const price = s.prices.find((p) => p.fuelType === selectedFuelType);
                  return (
                    <button
                      key={s.id}
                      onClick={() => onSelectStation(s)}
                      className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-[var(--subtle)] text-left"
                    >
                      <BrandLogo brandName={s.brand?.name ?? "?"} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-[var(--foreground)] truncate">{s.name}</div>
                        <div className="text-[10px] text-[var(--muted)]">{s.distance.toFixed(1)}km</div>
                      </div>
                      {price && <PriceBadge price={price.price} size="sm" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
