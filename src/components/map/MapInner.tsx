"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

import type { StationWithPrices } from "@/types/fuel";
import { MAP_CENTER, MAP_ZOOM } from "@/lib/constants";
import { getBrandLogoUrl, getBrandColor, getBrandInitial } from "@/lib/brand-logos";
import { usePriceThresholds } from "@/stores/price-context";
import { useFuelStore } from "@/stores/fuel-store";
import { getPriceTier, type PriceTier } from "@/lib/price-utils";
import type { PriceThresholds } from "@/lib/price-utils";
import LocationButton from "./LocationButton";
import AreaPriceList from "./AreaPriceList";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;

interface MapInnerProps {
  stations: StationWithPrices[];
  selectedFuelType: string;
  loading?: boolean;
}

const MAX_VISIBLE_MARKERS = 80;
const MIN_ZOOM_FOR_PILLS = 11;

const TIER_STYLES: Record<PriceTier, { bg: string; border: string; text: string }> = {
  cheap:     { bg: "rgba(16,185,129,0.18)", border: "rgba(16,185,129,0.5)", text: "#34d399" },
  mid:       { bg: "rgba(245,158,11,0.18)", border: "rgba(245,158,11,0.5)",  text: "#fbbf24" },
  expensive: { bg: "rgba(239,68,68,0.18)",  border: "rgba(239,68,68,0.5)",   text: "#f87171" },
  unknown:   { bg: "rgba(100,116,139,0.18)", border: "rgba(100,116,139,0.5)", text: "#94a3b8" },
};

// Icon cache to avoid rebuilding identical icons
const iconCache = new Map<string, L.DivIcon>();

function getPillIcon(brandName: string, price: number, tier: PriceTier): L.DivIcon {
  const key = `${brandName}|${price.toFixed(1)}|${tier}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const s = TIER_STYLES[tier];
  const logoUrl = getBrandLogoUrl(brandName);

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" style="width:18px;height:18px;border-radius:4px;object-fit:contain;background:#fff;flex-shrink:0;" onerror="this.style.display='none';this.nextSibling.style.display='flex'" /><div style="display:none;width:18px;height:18px;border-radius:4px;background:${getBrandColor(brandName)};align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:9px;flex-shrink:0">${getBrandInitial(brandName)}</div>`
    : `<div style="width:18px;height:18px;border-radius:4px;background:${getBrandColor(brandName)};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:9px;flex-shrink:0">${getBrandInitial(brandName)}</div>`;

  const icon = L.divIcon({
    html: `<div class="fuel-pill" style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px 2px 3px;border-radius:4px;background:${s.bg};border:1.5px solid ${s.border};box-shadow:0 2px 8px rgba(0,0,0,0.4);cursor:pointer;white-space:nowrap;transform:translate(-50%,-50%);line-height:1;width:fit-content;">${logoHtml}<span style="font-size:11px;font-weight:700;font-family:ui-monospace,monospace;color:${s.text}">${price.toFixed(1)}</span></div>`,
    className: "",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

  iconCache.set(key, icon);
  return icon;
}

function AutoLocate() {
  const map = useMap();
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { map.flyTo([pos.coords.latitude, pos.coords.longitude], 13, { duration: 1.2 }); },
      () => {},
      { enableHighAccuracy: false, timeout: 5000 }
    );
  }, [map]);
  return null;
}

interface ViewportState {
  bounds: L.LatLngBounds | null;
  zoom: number;
}

function ViewportTracker({ onChange }: { onChange: (state: ViewportState) => void }) {
  const map = useMap();

  const update = useCallback(() => {
    onChange({ bounds: map.getBounds(), zoom: map.getZoom() });
  }, [map, onChange]);

  useMapEvents({ moveend: update, zoomend: update });

  useEffect(() => {
    const t = setTimeout(update, 300);
    return () => clearTimeout(t);
  }, [update]);

  return null;
}

function FlyToStation() {
  const map = useMap();
  const station = useFuelStore((s) => s.selectedStation);

  useEffect(() => {
    if (station) {
      map.flyTo([station.latitude, station.longitude], 15, { duration: 0.8 });
    }
  }, [station, map]);

  return null;
}

export default function MapInner({ stations, selectedFuelType, loading }: MapInnerProps) {
  const [viewport, setViewport] = useState<ViewportState>({ bounds: null, zoom: 9 });
  const thresholds = usePriceThresholds();
  const setSelectedStation = useFuelStore((s) => s.setSelectedStation);

  const handleViewport = useCallback((state: ViewportState) => {
    setViewport(state);
  }, []);

  // Pre-compute price per station (once per fuel type change)
  const stationsWithPrice = useMemo(() => {
    return stations
      .map((s) => {
        const entry = s.prices.find((p) => p.fuelType === selectedFuelType);
        return entry ? { station: s, price: entry.price } : null;
      })
      .filter((x): x is { station: StationWithPrices; price: number } => x !== null);
  }, [stations, selectedFuelType]);

  // Filter to viewport, cap count, sorted cheapest first
  const visibleMarkers = useMemo(() => {
    const { bounds, zoom } = viewport;
    if (!bounds || zoom < MIN_ZOOM_FOR_PILLS) return [];

    return stationsWithPrice
      .filter((x) => bounds.contains([x.station.latitude, x.station.longitude]))
      .sort((a, b) => a.price - b.price)
      .slice(0, MAX_VISIBLE_MARKERS);
  }, [stationsWithPrice, viewport]);

  // Visible stations for the area price list (all in viewport, not capped)
  const visibleStations = useMemo(() => {
    const { bounds } = viewport;
    if (!bounds) return [];
    return stations.filter((s) => bounds.contains([s.latitude, s.longitude]));
  }, [stations, viewport]);

  const showZoomPrompt = viewport.zoom < MIN_ZOOM_FOR_PILLS && !loading && stations.length > 0;

  return (
    <>
      <MapContainer
        center={MAP_CENTER}
        zoom={9}
        className="h-full w-full"
        scrollWheelZoom={true}
        zoomControl={true}
        minZoom={9}
        maxZoom={18}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <AutoLocate />
        <LocationButton />
        <FlyToStation />
        <ViewportTracker onChange={handleViewport} />

        {visibleMarkers.map(({ station, price }) => (
          <Marker
            key={station.id}
            position={[station.latitude, station.longitude]}
            icon={getPillIcon(
              station.brand?.name ?? "?",
              price,
              getPriceTier(price, thresholds)
            )}
            eventHandlers={{ click: () => setSelectedStation(station) }}
          />
        ))}
      </MapContainer>

      {/* Zoom prompt */}
      {showZoomPrompt && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#8ab4f8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
          <span className="text-sm text-[#dadce0]">Zoom in to see fuel prices</span>
        </div>
      )}

      <AreaPriceList stations={visibleStations} selectedFuelType={selectedFuelType} loading={loading} />
    </>
  );
}
