"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation, Info, ChevronDown, Pencil, X, Heart, Droplets, Gauge, TriangleAlert, Car } from "lucide-react";
import type { RankedOption } from "@/types/fuel";
import { haversineDistance } from "@/lib/geo";
import { useFuelStore } from "@/stores/fuel-store";
import { useVehicleStore } from "@/stores/vehicle-store";
import { usePriceThresholds } from "@/stores/price-context";
import BrandLogo from "@/components/shared/BrandLogo";
import InlineReportForm from "@/components/shared/InlineReportForm";
import SidebarShell from "@/components/shared/SidebarShell";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import { titleCase, TAG_DESCRIPTIONS, formatUpdated, getTierColor, getTagStyle } from "@/lib/station-utils";

export type { RankedOption };

interface TripSummaryCardProps {
  options: RankedOption[];
  closestOpt: RankedOption | null;
  onEditTrip: () => void;
  selectedIdx: number;
  onSelectIdx: (idx: number) => void;
}

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
  const selectedFuelType = useFuelStore((s) => s.selectedFuelType);
  const fillLabel = useFuelStore((s) => s.fillLabel);
  const fillMode = useFuelStore((s) => s.fillMode);
  const vehicleProfile = useVehicleStore((s) => s.profile);
  const thresholds = usePriceThresholds();

  const [showMore, setShowMore] = useState(false);
  const [reportingStationId, setReportingStationId] = useState<string | null>(null);

  if (!tripDestination || options.length === 0) return null;

  const origin = tripOrigin ?? userLocation;
  const selected = options[selectedIdx] ?? options[0];
  const tripDistance = origin
    ? haversineDistance(origin.lat, origin.lng, tripDestination.lat, tripDestination.lng) * ROAD_FACTOR
    : 0;
  const tankSize = vehicleProfile.tankSize;
  const litresFillingUp = Math.max(0, tankSize * (1 - Math.min(1, rangeKm / MAX_RANGE_KM)));
  const fillCost = litresFillingUp * selected.price / 100;
  const saving = selected.netSavings;

  const originName = tripOrigin?.name || "Your location";

  const tierColor = (price: number) => getTierColor(price, thresholds);
  const tagStyle = (price: number) => getTagStyle(price, thresholds);

  const handleClearTrip = () => {
    setTripMode("nearby");
    setTripDestination(null);
    setTripOrigin(null);
  };

  const otherOptions = options.filter((_, i) => i !== selectedIdx);

  return (
    <SidebarShell mobileMaxHeight="max-h-[55vh]">

        {/* Trip header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
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

        {/* Settings */}
        <div className="px-4 pb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--muted)]">
          <span className="inline-flex items-center gap-1">
            <Car className="h-3 w-3" strokeWidth={2} />
            {vehicleProfile.name}
          </span>
          <span className="text-[var(--subtle-border)]">·</span>
          <span className="inline-flex items-center gap-1">
            <Droplets className="h-3 w-3" strokeWidth={2} />
            {FUEL_TYPE_LABELS[selectedFuelType] ?? selectedFuelType}
          </span>
          <span className="text-[var(--subtle-border)]">·</span>
          <span className="inline-flex items-center gap-1">
            <Gauge className="h-3 w-3" strokeWidth={2} />
            {fillLabel ? fillLabel : `~${Math.round(litresFillingUp)}L to fill`}
          </span>
        </div>

        {/* Recommendation explanation */}
        <div className="px-4 pb-3">
          <div className="rounded-xl bg-[var(--subtle)] border border-[var(--subtle-border)] px-3 py-2.5 text-[11px] text-[var(--foreground)] leading-relaxed">
            {saving > 0 ? (
              <>
                Stop at <span className="font-bold">{titleCase(selected.station.name)}</span> at <span className="font-bold font-mono">{selected.price.toFixed(1)}c/L</span>.
                {" "}You&apos;ll save <span className="font-bold font-mono text-[var(--tier-cheap)]">${saving.toFixed(2)}</span> vs the closest station
                {selected.detourKm >= 0.5 && <>, even with the {selected.detourKm.toFixed(1)}km detour</>}.
              </>
            ) : (
              <>
                Stop at <span className="font-bold">{titleCase(selected.station.name)}</span> at <span className="font-bold font-mono">{selected.price.toFixed(1)}c/L</span>.
                {" "}Best option{selected.detourKm < 0.5 ? " — no detour needed" : " on your route"}.
              </>
            )}
          </div>
        </div>

        {/* Selected stop */}
        <div className="px-4 pb-3">
          {reportingStationId === selected.station.id ? (
            <InlineReportForm
              stationId={selected.station.id}
              stationName={selected.station.name}
              currentPrice={selected.price}
              selectedFuelType={selectedFuelType}
              onClose={() => setReportingStationId(null)}
            />
          ) : (
            <>
              <div className="flex items-center gap-3">
                <BrandLogo brandName={selected.station.brand?.name ?? "?"} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[var(--foreground)] text-sm truncate">{titleCase(selected.station.name)}</span>
                    {selected.tag && (
                      <span className={`text-[8px] font-medium uppercase shrink-0 px-1.5 py-0.5 rounded ${tagStyle(selected.price)}`}>
                        {selected.tag}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--muted)]">
                    {(selected.distance + selected.detourKm).toFixed(1)}km · {formatUpdated(selected.updatedAt, selected.source)}
                  </div>
                </div>
                <div className={`text-xl font-semibold font-mono shrink-0 ${tierColor(selected.price)}`}>
                  {selected.price.toFixed(1)}<span className="text-xs text-[var(--muted)]">c</span>
                </div>
              </div>

              {/* Tag explanation */}
              {selected.tag && TAG_DESCRIPTIONS[selected.tag] && (
                <div className={`text-[10px] px-2 py-1.5 rounded mt-2 ${tagStyle(selected.price)}`}>
                  <span className="font-medium">{selected.tag}</span> — {TAG_DESCRIPTIONS[selected.tag]}
                </div>
              )}

              {/* Fill cost estimate */}
              {litresFillingUp > 0 && (
                <div className="flex items-center justify-between bg-[var(--subtle)] rounded px-2.5 py-2 mt-2">
                  <div className="text-[10px] text-[var(--muted)]">
                    Estimated cost{fillLabel && fillLabel.startsWith("$") ? ` (${fillLabel} · ~${Math.round(litresFillingUp)}L)` : ` (full tank · ~${Math.round(litresFillingUp)}L)`}
                  </div>
                  <div className="text-sm font-semibold font-mono text-[var(--foreground)]">
                    ${fillCost.toFixed(2)}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-1.5 mt-3">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selected.station.latitude},${selected.station.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-[var(--accent)] text-[var(--accent-contrast)] px-3 py-2 rounded-lg text-xs font-bold hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
                >
                  <Navigation className="h-3.5 w-3.5" strokeWidth={2} />
                  Directions
                </a>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setReportingStationId(selected.station.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[var(--subtle)] border border-[var(--subtle-border)] text-[var(--muted)] px-3 py-2 rounded-lg text-xs font-bold hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer"
                  >
                    <TriangleAlert className="h-3.5 w-3.5" strokeWidth={2} />
                    Update price
                  </button>
                  <button
                    onClick={() => setSelectedStation(selected.station)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[var(--subtle)] border border-[var(--subtle-border)] text-[var(--muted)] px-3 py-2 rounded-lg text-xs font-bold hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer"
                  >
                    <Info className="h-3.5 w-3.5" strokeWidth={2} />
                    Details
                  </button>
                </div>
              </div>
            </>
          )}
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
                            <span className="font-medium truncate text-[var(--foreground)] text-xs">{titleCase(opt.station.name)}</span>
                            {isRecommended && selectedIdx !== 0 && (
                              <span className="text-[8px] font-medium uppercase shrink-0 px-1.5 py-0.5 rounded text-[var(--tier-cheap)] bg-[var(--tier-cheap)]/15">Best</span>
                            )}
                          </div>
                          <div className="text-[10px] text-[var(--muted)]">
                            {(opt.distance + opt.detourKm).toFixed(1)}km
                            {closestOpt && opt.netSavings > 0 && (
                              <> · <span className="text-[var(--tier-cheap)]">saves ${opt.netSavings.toFixed(2)}</span></>
                            )}
                          </div>
                        </div>
                        <div className={`font-bold font-mono shrink-0 text-xs ${tierColor(opt.price)}`}>
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

    </SidebarShell>
  );
}
