"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
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
import ModeToggle from "./ModeToggle";
import AreaPriceList from "./AreaPriceList";
import FillStrategy from "./FillStrategy";
import { useTheme } from "@/lib/theme";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;

interface MapInnerProps {
  stations: StationWithPrices[];
  selectedFuelType: string;
  loading?: boolean;
  onOpenAlerts?: () => void;
  onOpenSettings?: () => void;
}

const MAX_VISIBLE_MARKERS = 80;
const MIN_ZOOM_FOR_PILLS = 11;

function getTierStyles(): Record<PriceTier, { bg: string; border: string; text: string }> {
  const root = typeof document !== "undefined" ? getComputedStyle(document.documentElement) : null;
  const v = (name: string, fallback: string) => root?.getPropertyValue(name).trim() || fallback;
  return {
    cheap:     { bg: v("--pill-bg-cheap", "rgba(16,185,129,0.18)"), border: v("--pill-border-cheap", "rgba(16,185,129,0.5)"), text: v("--pill-text-cheap", "#34d399") },
    mid:       { bg: v("--pill-bg-mid", "rgba(245,158,11,0.18)"), border: v("--pill-border-mid", "rgba(245,158,11,0.5)"),  text: v("--pill-text-mid", "#fbbf24") },
    expensive: { bg: v("--pill-bg-exp", "rgba(239,68,68,0.18)"),  border: v("--pill-border-exp", "rgba(239,68,68,0.5)"),   text: v("--pill-text-exp", "#f87171") },
    unknown:   { bg: v("--pill-bg-unk", "rgba(100,116,139,0.18)"), border: v("--pill-border-unk", "rgba(100,116,139,0.5)"), text: v("--pill-text-unk", "#94a3b8") },
  };
}

// Icon cache to avoid rebuilding identical icons
const iconCache = new Map<string, L.DivIcon>();

function getPillIcon(brandName: string, price: number, tier: PriceTier, active = false, themeKey = "dark"): L.DivIcon {
  const key = `${themeKey}|${brandName}|${price.toFixed(1)}|${tier}|${active}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const s = getTierStyles()[tier];
  const logoUrl = getBrandLogoUrl(brandName);
  const pillClass = active ? "fuel-pill fuel-pill-active" : "fuel-pill";

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" style="width:18px;height:18px;border-radius:4px;object-fit:contain;background:#fff;flex-shrink:0;" onerror="this.style.display='none';this.nextSibling.style.display='flex'" /><div style="display:none;width:18px;height:18px;border-radius:4px;background:${getBrandColor(brandName)};align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:9px;flex-shrink:0">${getBrandInitial(brandName)}</div>`
    : `<div style="width:18px;height:18px;border-radius:4px;background:${getBrandColor(brandName)};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:9px;flex-shrink:0">${getBrandInitial(brandName)}</div>`;

  const icon = L.divIcon({
    html: `<div class="${pillClass}" style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px 2px 3px;border-radius:4px;background:${s.bg};border:1.5px solid ${s.border};box-shadow:0 2px 8px var(--shadow,rgba(0,0,0,0.4));cursor:pointer;white-space:nowrap;transform:translate(-50%,-50%);line-height:1;width:fit-content;">${logoHtml}<span style="font-size:11px;font-weight:700;font-family:ui-monospace,monospace;color:${s.text}">${price.toFixed(1)}</span></div>`,
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
  const userLocation = useFuelStore((s) => s.userLocation);

  const requestLocation = useCallback(() => {
    const safelyFlyTo = (latlng: [number, number], zoom: number) => {
      try {
        if (!map || !map.getContainer()) return;
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
          const targetPoint = map.project(latlng, zoom);
          targetPoint.y += 120;
          const offsetLatLng = map.unproject(targetPoint, zoom);
          map.flyTo(offsetLatLng, zoom, { duration: 1.2 });
        } else {
          map.flyTo(latlng, zoom, { duration: 1.2 });
        }
      } catch {
        // Map not ready yet
      }
    };

    if (!("geolocation" in navigator)) {
      setUserLocation({ lat: -37.8136, lng: 144.9631 });
      safelyFlyTo([-37.8136, 144.9631], 13);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(latlng);
        setUserLocation({ lat: latlng[0], lng: latlng[1] });
        safelyFlyTo(latlng, 13);
      },
      () => {
        if (!position) {
          setUserLocation({ lat: -37.8136, lng: 144.9631 });
          safelyFlyTo([-37.8136, 144.9631], 13);
        }
      },
      { enableHighAccuracy: false, timeout: 15000 }
    );
  }, [map, setUserLocation, position]);

  // Initial request
  useEffect(() => {
    requestLocation();
  }, []);

  // Retry after 3s if we still don't have a real position (permission prompt may have delayed)
  useEffect(() => {
    if (position) return;
    const retry = setTimeout(() => {
      if (!position) requestLocation();
    }, 3000);
    return () => clearTimeout(retry);
  }, [position]);

  // Retry again after 8s as final attempt
  useEffect(() => {
    if (position) return;
    const retry = setTimeout(() => {
      if (!position) requestLocation();
    }, 8000);
    return () => clearTimeout(retry);
  }, [position]);

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

/** Fly to a point, offset upward on mobile so pin isn't behind the bottom card */
function useSafelyFlyTo() {
  const map = useMap();
  return useCallback((lat: number, lng: number, zoom: number, duration = 1) => {
    try {
      if (!map || !map.getContainer()) return;
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        const targetPoint = map.project([lat, lng], zoom);
        targetPoint.y += 100; // offset so pin sits above the bottom card
        const offsetLatLng = map.unproject(targetPoint, zoom);
        map.flyTo(offsetLatLng, zoom, { duration });
      } else {
        map.flyTo([lat, lng], zoom, { duration });
      }
    } catch {
      // Map not ready
    }
  }, [map]);
}

function FlyToStation() {
  const station = useFuelStore((s) => s.selectedStation);
  const flyTo = useSafelyFlyTo();

  useEffect(() => {
    if (station) {
      flyTo(station.latitude, station.longitude, 15, 0.8);
    }
  }, [station, flyTo]);

  return null;
}

function FlyToTarget() {
  const target = useFuelStore((s) => s.flyToTarget);
  const setFlyToTarget = useFuelStore((s) => s.setFlyToTarget);
  const flyTo = useSafelyFlyTo();

  useEffect(() => {
    if (target) {
      flyTo(target.lat, target.lng, target.zoom, 1);
      setFlyToTarget(null);
    }
  }, [target, flyTo, setFlyToTarget]);

  return null;
}

function MapResizeFix() {
  const map = useMap();
  const selected = useFuelStore((s) => s.selectedStation);
  useEffect(() => {
    // On mount + when modal opens/closes, Leaflet may need to recalculate
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    const t3 = setTimeout(() => map.invalidateSize(), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
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

export default function MapInner({ stations, selectedFuelType, loading, onOpenAlerts, onOpenSettings }: MapInnerProps) {
  const [viewport, setViewport] = useState<ViewportState>({ bounds: null, zoom: 9 });
  const thresholds = usePriceThresholds();
  const { theme, toggle: toggleTheme, currentTime } = useTheme();
  const tileUrl = theme === "light"
    ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
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
  const userLocation = useFuelStore((s) => s.userLocation);
  const recommendedStations = useFuelStore((s) => s.recommendedStations);
  const activeRouteStation = useFuelStore((s) => s.activeRouteStation);

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
          key={theme}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={tileUrl}
        />
        <MapResizeFix />
        <PinFader />
        <UserLocationMarker />
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
                isActive,
                theme
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

        {/* Show recommended station pins — always visible, highlighted, with rank */}
        {recommendedStations
          .filter((rs) => !visibleMarkers.some((m) => m.station.id === rs.id))
          .map((rs, i) => {
            const price = rs.prices.find((p) => p.fuelType === selectedFuelType)?.price;
            return (
              <Marker
                key={`rec-${rs.id}`}
                position={[rs.latitude, rs.longitude]}
                icon={getPillIcon(rs.brand?.name ?? "?", price ?? 0, price ? getPriceTier(price, thresholds) : "unknown", true, theme)}
                zIndexOffset={1000}
                eventHandlers={{ click: () => setSelectedStation(rs) }}
              />
            );
          })
        }

        {/* Route line: user → active station (→ destination in trip mode) */}
        {userLocation && activeRouteStation && (() => {
          const points: [number, number][] = [
            [userLocation.lat, userLocation.lng],
            [activeRouteStation.latitude, activeRouteStation.longitude],
            ...(tripMode === "trip" && tripDestination
              ? [[tripDestination.lat, tripDestination.lng] as [number, number]]
              : []),
          ];
          return (
            <>
              {/* Glow line underneath */}
              <Polyline
                positions={points}
                pathOptions={{
                  color: "#4285f4",
                  weight: 6,
                  opacity: 0.15,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
              {/* Main dashed line */}
              <Polyline
                positions={points}
                pathOptions={{
                  color: "#4285f4",
                  weight: 2.5,
                  opacity: 0.6,
                  dashArray: "8, 8",
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            </>
          );
        })()}
      </MapContainer>

      {/* Mode toggle */}
      <ModeToggle />

      {/* Logo — desktop only */}
      <div className="hidden md:flex absolute top-3 left-3 z-[1000] items-center gap-2">
        <div className="flex items-center gap-1.5 bg-[var(--card)] rounded-full p-1 border border-[var(--subtle-border)] shadow-xl">
          <div className="h-6 w-6 rounded-full bg-[#4285f4] flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xs font-bold text-[var(--foreground)] pr-2">PetrolSaver</span>
        </div>
      </div>

      {/* Theme toggle with clock — top right */}
      <button
        onClick={toggleTheme}
        className="absolute top-3 right-3 z-[1000] rounded-full bg-[var(--card)] border border-[var(--subtle-border)] shadow-xl flex items-center gap-1.5 px-2.5 py-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark" ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
        {currentTime && <span className="text-[11px] font-semibold font-mono">{currentTime}</span>}
      </button>


      <FillStrategy stations={stations} selectedFuelType={selectedFuelType} onOpenSettings={onOpenSettings} loading={loading} />
    </>
  );
}
