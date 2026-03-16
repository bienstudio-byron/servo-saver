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
import FillStrategy from "./FillStrategy";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;

interface MapInnerProps {
  stations: StationWithPrices[];
  selectedFuelType: string;
  loading?: boolean;
  onChangeTrip?: () => void;
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

function getPillIcon(brandName: string, price: number, tier: PriceTier, active = false): L.DivIcon {
  const key = `${brandName}|${price.toFixed(1)}|${tier}|${active}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const s = TIER_STYLES[tier];
  const logoUrl = getBrandLogoUrl(brandName);
  const pillClass = active ? "fuel-pill fuel-pill-active" : "fuel-pill";

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" style="width:18px;height:18px;border-radius:4px;object-fit:contain;background:#fff;flex-shrink:0;" onerror="this.style.display='none';this.nextSibling.style.display='flex'" /><div style="display:none;width:18px;height:18px;border-radius:4px;background:${getBrandColor(brandName)};align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:9px;flex-shrink:0">${getBrandInitial(brandName)}</div>`
    : `<div style="width:18px;height:18px;border-radius:4px;background:${getBrandColor(brandName)};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:9px;flex-shrink:0">${getBrandInitial(brandName)}</div>`;

  const icon = L.divIcon({
    html: `<div class="${pillClass}" style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px 2px 3px;border-radius:4px;background:${s.bg};border:1.5px solid ${s.border};box-shadow:0 2px 8px rgba(0,0,0,0.4);cursor:pointer;white-space:nowrap;transform:translate(-50%,-50%);line-height:1;width:fit-content;">${logoHtml}<span style="font-size:11px;font-weight:700;font-family:ui-monospace,monospace;color:${s.text}">${price.toFixed(1)}</span></div>`,
    className: "",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

  iconCache.set(key, icon);
  return icon;
}

const userLocationIcon = L.divIcon({
  html: `<div style="position:relative;width:28px;height:28px;transform:translate(-50%,-50%)">
    <div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(66,133,244,0.25);animation:pulse-ring 1.5s ease-out infinite"></div>
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(66,133,244,0.12)"></div>
    <div style="position:absolute;top:6px;left:6px;width:16px;height:16px;border-radius:50%;background:#4285f4;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.5)"></div>
  </div>`,
  className: "",
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

function UserLocationMarker() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMap();
  const setUserLocation = useFuelStore((s) => s.setUserLocation);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(latlng);
        setUserLocation({ lat: latlng[0], lng: latlng[1] });
        // Offset center upward on mobile so dot isn't behind the panel
        const isMobile = window.innerWidth < 768;
        const targetZoom = 13;
        if (isMobile) {
          const targetPoint = map.project(latlng, targetZoom);
          targetPoint.y += 120; // shift down so map center is above the panel
          const offsetLatLng = map.unproject(targetPoint, targetZoom);
          map.flyTo(offsetLatLng, targetZoom, { duration: 1.2 });
        } else {
          map.flyTo(latlng, targetZoom, { duration: 1.2 });
        }
      },
      () => {},
      { enableHighAccuracy: false, timeout: 5000 }
    );
  }, [map]);

  if (!position) return null;
  return <Marker position={position} icon={userLocationIcon} interactive={false} zIndexOffset={2000} />;
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

function FlyToTarget() {
  const map = useMap();
  const target = useFuelStore((s) => s.flyToTarget);
  const setFlyToTarget = useFuelStore((s) => s.setFlyToTarget);

  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], target.zoom, { duration: 1 });
      setFlyToTarget(null);
    }
  }, [target, map, setFlyToTarget]);

  return null;
}

function MapResizeFix() {
  const map = useMap();
  const selected = useFuelStore((s) => s.selectedStation);
  useEffect(() => {
    // When modal opens/closes, Leaflet may need to recalculate
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [selected, map]);
  return null;
}

function PinFader() {
  const map = useMap();
  const selected = useFuelStore((s) => s.selectedStation);
  const recommended = useFuelStore((s) => s.recommendedStations);

  useEffect(() => {
    const container = map.getContainer();
    if (selected || recommended.length > 0) {
      container.classList.add("pins-faded");
    } else {
      container.classList.remove("pins-faded");
    }
    return () => container.classList.remove("pins-faded");
  }, [selected, recommended, map]);

  return null;
}

export default function MapInner({ stations, selectedFuelType, loading, onChangeTrip }: MapInnerProps) {
  const [viewport, setViewport] = useState<ViewportState>({ bounds: null, zoom: 9 });
  const thresholds = usePriceThresholds();
  const setSelectedStation = useFuelStore((s) => s.setSelectedStation);
  const selectedStation = useFuelStore((s) => s.selectedStation);
  const tripMode = useFuelStore((s) => s.tripMode);

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

  const tripDestination = useFuelStore((s) => s.tripDestination);
  const recommendedStations = useFuelStore((s) => s.recommendedStations);

  // Nearby mode: show all pins when zoomed in. Trip mode: only show recommended + destination
  const showPins = tripMode === "nearby" && viewport.zoom >= MIN_ZOOM_FOR_PILLS;

  // Filter to viewport, cap count, sorted cheapest first
  const visibleMarkers = useMemo(() => {
    if (!showPins) return [];
    const { bounds } = viewport;
    if (!bounds) return [];

    return stationsWithPrice
      .filter((x) => bounds.contains([x.station.latitude, x.station.longitude]))
      .sort((a, b) => a.price - b.price)
      .slice(0, MAX_VISIBLE_MARKERS);
  }, [stationsWithPrice, viewport, showPins]);

  return (
    <>
      <MapContainer
        center={MAP_CENTER}
        zoom={9}
        className="h-full w-full"
        scrollWheelZoom={true}
        zoomControl={false}
        minZoom={9}
        maxZoom={18}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapResizeFix />
        <PinFader />
        <UserLocationMarker />
        <LocationButton />
        <FlyToStation />
        <FlyToTarget />
        <ViewportTracker onChange={handleViewport} />

        {/* Nearby mode: show all visible pins */}
        {visibleMarkers.map(({ station, price }) => {
          const isActive = selectedStation?.id === station.id || recommendedStations.some((r) => r.id === station.id);
          return (
            <Marker
              key={station.id}
              position={[station.latitude, station.longitude]}
              icon={getPillIcon(
                station.brand?.name ?? "?",
                price,
                getPriceTier(price, thresholds),
                isActive
              )}
              zIndexOffset={isActive ? 1000 : 0}
              eventHandlers={{ click: () => setSelectedStation(station) }}
            />
          );
        })}

        {/* Trip mode: show destination pin */}
        {tripMode === "trip" && tripDestination && (
          <Marker
            position={[tripDestination.lat, tripDestination.lng]}
            icon={L.divIcon({
              html: `<div style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px 3px 4px;border-radius:4px;background:rgba(251,188,4,0.2);border:1.5px solid rgba(251,188,4,0.5);backdrop-filter:blur(8px);box-shadow:0 2px 8px rgba(0,0,0,0.4);cursor:default;white-space:nowrap;transform:translate(-50%,-50%);width:fit-content;">
                <div style="width:8px;height:8px;border-radius:50%;background:#fbbc04;flex-shrink:0"></div>
                <span style="font-size:11px;font-weight:700;color:#fbbc04;line-height:1">${tripDestination.name}</span>
              </div>`,
              className: "",
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            })}
            interactive={false}
          />
        )}

        {/* Show recommended station pins — always visible, highlighted */}
        {recommendedStations
          .filter((rs) => !visibleMarkers.some((m) => m.station.id === rs.id))
          .map((rs) => {
            const price = rs.prices.find((p) => p.fuelType === selectedFuelType)?.price;
            return (
              <Marker
                key={`rec-${rs.id}`}
                position={[rs.latitude, rs.longitude]}
                icon={getPillIcon(rs.brand?.name ?? "?", price ?? 0, price ? getPriceTier(price, thresholds) : "unknown", true)}
                zIndexOffset={1000}
                eventHandlers={{ click: () => setSelectedStation(rs) }}
              />
            );
          })
        }
      </MapContainer>

      {/* Logo watermark */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5 shadow-lg">
        <div className="h-5 w-5 rounded-md bg-[#4285f4] flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="text-xs font-bold text-[#1a1a1a] hidden sm:inline">PetrolSaver</span>
      </div>


      <FillStrategy stations={stations} selectedFuelType={selectedFuelType} onChangeTrip={onChangeTrip} />
    </>
  );
}
