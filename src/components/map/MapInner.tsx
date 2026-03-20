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
import { motion, AnimatePresence } from "framer-motion";
import { Search, LocateFixed } from "lucide-react";
import { haversineDistance } from "@/lib/geo";
import LocationButton from "./LocationButton";
import AreaPriceList from "./AreaPriceList";
import FillStrategy from "./FillStrategy";
import { useTheme } from "@/lib/theme";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;

interface MapInnerProps {
  stations: StationWithPrices[];
  selectedFuelType: string;
  loading?: boolean;
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

type PinHighlight = "focused" | "recommended" | "none";

function getPillIcon(brandName: string, price: number, tier: PriceTier, highlight: PinHighlight = "none", themeKey = "dark"): L.DivIcon {
  const key = `${themeKey}|${brandName}|${price.toFixed(1)}|${tier}|${highlight}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const s = getTierStyles()[tier];
  const logoUrl = getBrandLogoUrl(brandName);
  const pillClass = highlight === "focused"
    ? "fuel-pill fuel-pill-focused"
    : highlight === "recommended"
    ? "fuel-pill fuel-pill-recommended"
    : "fuel-pill";

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" style="width:18px;height:18px;border-radius:4px;object-fit:contain;background:#fff;flex-shrink:0;" onerror="this.style.display='none';this.nextSibling.style.display='flex'" /><div style="display:none;width:18px;height:18px;border-radius:4px;background:${getBrandColor(brandName)};align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:9px;flex-shrink:0">${getBrandInitial(brandName)}</div>`
    : `<div style="width:18px;height:18px;border-radius:4px;background:${getBrandColor(brandName)};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:9px;flex-shrink:0">${getBrandInitial(brandName)}</div>`;

  const icon = L.divIcon({
    html: `<div class="${pillClass}" style="--pill-glow:${s.text};display:inline-flex;align-items:center;gap:4px;padding:2px 7px 2px 3px;border-radius:4px;background:${s.bg};border:1.5px solid ${s.border};box-shadow:0 2px 8px var(--shadow,rgba(0,0,0,0.4));cursor:pointer;white-space:nowrap;transform:translate(-50%,-50%);line-height:1;width:fit-content;">${logoHtml}<span style="font-size:11px;font-weight:700;font-family:ui-monospace,monospace;color:${s.text}">${price.toFixed(1)}</span></div>`,
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
  const locationSource = useFuelStore((s) => s.locationSource);

  const safelyFlyTo = useCallback((latlng: [number, number], zoom: number) => {
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
  }, [map]);

  const requestLocation = useCallback(() => {
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
  }, [safelyFlyTo, setUserLocation, position]);

  // If a manual location is saved, fly to it and skip GPS entirely
  useEffect(() => {
    if (locationSource === "manual" && userLocation) {
      const latlng: [number, number] = [userLocation.lat, userLocation.lng];
      setPosition(latlng);
      safelyFlyTo(latlng, 13);
    }
  }, []); // Only on mount

  // Request GPS only if no manual location is saved
  useEffect(() => {
    if (locationSource !== "manual") {
      requestLocation();
    }
  }, []);

  // Retry after 3s if we still don't have a real position (permission prompt may have delayed)
  useEffect(() => {
    if (position || locationSource === "manual") return;
    const retry = setTimeout(() => {
      if (!position) requestLocation();
    }, 3000);
    return () => clearTimeout(retry);
  }, [position, locationSource]);

  // Retry again after 8s as final attempt
  useEffect(() => {
    if (position || locationSource === "manual") return;
    const retry = setTimeout(() => {
      if (!position) requestLocation();
    }, 8000);
    return () => clearTimeout(retry);
  }, [position, locationSource]);

  // Update position marker when userLocation changes (e.g. manual location set via chip)
  useEffect(() => {
    if (userLocation) {
      setPosition([userLocation.lat, userLocation.lng]);
    }
  }, [userLocation?.lat, userLocation?.lng]);

  if (!position) return null;
  return <Marker position={position} icon={userLocationIcon} interactive={false} zIndexOffset={2000} />;
}

interface ViewportState {
  bounds: L.LatLngBounds | null;
  zoom: number;
  centre: { lat: number; lng: number };
}

function ViewportTracker({ onChange }: { onChange: (state: ViewportState) => void }) {
  const map = useMap();

  const update = useCallback(() => {
    const c = map.getCenter();
    onChange({ bounds: map.getBounds(), zoom: map.getZoom(), centre: { lat: c.lat, lng: c.lng } });
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

function FitBoundsTarget() {
  const target = useFuelStore((s) => s.fitBoundsTarget);
  const setFitBoundsTarget = useFuelStore((s) => s.setFitBoundsTarget);
  const map = useMap();

  useEffect(() => {
    if (target && target.points.length >= 2) {
      try {
        const bounds = L.latLngBounds(target.points.map(([lat, lng]) => L.latLng(lat, lng)));
        const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
        map.fitBounds(bounds, {
          paddingTopLeft: isMobile ? [20, 80] : [40, 80],
          paddingBottomRight: isMobile ? [20, Math.round(window.innerHeight * 0.5)] : [40, 350],
          maxZoom: 14,
          animate: true,
          duration: 0.8,
        });
      } catch {}
      setFitBoundsTarget(null);
    }
  }, [target, map, setFitBoundsTarget]);

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
  const highlighted = useFuelStore((s) => s.highlightedStationIds);
  const focused = useFuelStore((s) => s.focusedStationId);

  useEffect(() => {
    const container = map.getContainer();
    const hasPins = selected || highlighted.size > 0;
    container.classList.toggle("pins-faded", !!hasPins);
    container.classList.toggle("pins-has-focus", !!focused);
    return () => {
      container.classList.remove("pins-faded", "pins-has-focus");
    };
  }, [selected, highlighted, focused, map]);

  return null;
}

function SearchAreaButton({ mapCentre }: { mapCentre: { lat: number; lng: number } }) {
  const userLocation = useFuelStore((s) => s.userLocation);
  const searchOrigin = useFuelStore((s) => s.searchOrigin);
  const setSearchOrigin = useFuelStore((s) => s.setSearchOrigin);
  const tripMode = useFuelStore((s) => s.tripMode);

  if (tripMode !== "nearby" || !userLocation) return null;

  const effectiveOrigin = searchOrigin ?? userLocation;
  const distFromOrigin = haversineDistance(effectiveOrigin.lat, effectiveOrigin.lng, mapCentre.lat, mapCentre.lng);
  const show = distFromOrigin > 2;

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.85, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 8 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          onClick={() => setSearchOrigin(mapCentre)}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1001] inline-flex items-center gap-1 bg-[var(--card)] border border-[var(--subtle-border)] text-[var(--foreground)] px-3 py-1.5 rounded-full text-[11px] font-semibold shadow-xl hover:bg-[var(--subtle-hover)] transition-colors cursor-pointer"
        >
          <Search className="h-3 w-3" strokeWidth={2.5} />
          Search here
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default function MapInner({ stations, selectedFuelType, loading }: MapInnerProps) {
  const [viewport, setViewport] = useState<ViewportState>({ bounds: null, zoom: 13, centre: { lat: MAP_CENTER[0], lng: MAP_CENTER[1] } });
  const thresholds = usePriceThresholds();
  const { theme } = useTheme();
  const tileUrl = theme === "light"
    ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const selectedStation = useFuelStore((s) => s.selectedStation);
  const tripMode = useFuelStore((s) => s.tripMode);
  const userLocation = useFuelStore((s) => s.userLocation);
  const setFlyToTarget = useFuelStore((s) => s.setFlyToTarget);
  const setSearchOrigin = useFuelStore((s) => s.setSearchOrigin);
  const searchOrigin = useFuelStore((s) => s.searchOrigin);
  const setTripPlannerOpen = useFuelStore((s) => s.setTripPlannerOpen);

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
  const tripOrigin = useFuelStore((s) => s.tripOrigin);
  const recommendedStations = useFuelStore((s) => s.recommendedStations);
  const highlightedStationIds = useFuelStore((s) => s.highlightedStationIds);
  const focusedStationId = useFuelStore((s) => s.focusedStationId);
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
    <div className="h-full w-full relative">
      <MapContainer
        center={MAP_CENTER}
        zoom={13}
        className="h-full w-full"
        scrollWheelZoom={true}
        zoomControl={false}
        minZoom={6}
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
        <FitBoundsTarget />
        <ViewportTracker onChange={handleViewport} />

        {/* Show pins — in trip mode, only show recommended stations */}
        {visibleMarkers
          .filter(({ station }) => tripMode !== "trip" || recommendedStations.some((r) => r.id === station.id))
          .map(({ station, price }) => {
          const highlight: PinHighlight =
            station.id === focusedStationId || station.id === selectedStation?.id
              ? "focused"
              : highlightedStationIds.has(station.id)
              ? "recommended"
              : "none";
          return (
            <Marker
              key={station.id}
              position={[station.latitude, station.longitude]}
              icon={getPillIcon(
                station.brand?.name ?? "?",
                price,
                getPriceTier(price, thresholds),
                highlight,
                theme
              )}
              zIndexOffset={highlight === "focused" ? 1200 : highlight === "recommended" ? 1000 : 0}
              eventHandlers={{ click: () => useFuelStore.getState().setPinClickedStationId(station.id) }}
            />
          );
        })}

        {/* Trip mode: show destination pin */}
        {tripMode === "trip" && tripDestination && (
          <Marker
            position={[tripDestination.lat, tripDestination.lng]}
            icon={L.divIcon({
              html: `<div style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px 3px 5px;border-radius:4px;background:var(--foreground);border:1.5px solid var(--foreground);box-shadow:0 2px 8px var(--shadow);cursor:default;white-space:nowrap;transform:translate(-50%,-50%);width:fit-content;">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--card)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <span style="font-size:11px;font-weight:700;color:var(--card);line-height:1">${tripDestination.name}</span>
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
          .map((rs) => {
            const price = rs.prices.find((p) => p.fuelType === selectedFuelType)?.price;
            const recHighlight: PinHighlight =
              rs.id === focusedStationId || rs.id === selectedStation?.id
                ? "focused"
                : "recommended";
            return (
              <Marker
                key={`rec-${rs.id}`}
                position={[rs.latitude, rs.longitude]}
                icon={getPillIcon(rs.brand?.name ?? "?", price ?? 0, price ? getPriceTier(price, thresholds) : "unknown", recHighlight, theme)}
                zIndexOffset={recHighlight === "focused" ? 1200 : 1000}
                eventHandlers={{ click: () => useFuelStore.getState().setPinClickedStationId(rs.id) }}
              />
            );
          })
        }

        {/* Trip mode: show custom origin pin when tripOrigin is set */}
        {tripMode === "trip" && tripOrigin && (
          <Marker
            position={[tripOrigin.lat, tripOrigin.lng]}
            icon={L.divIcon({
              html: `<div style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px 3px 5px;border-radius:4px;background:#4285f4;border:1.5px solid #4285f4;box-shadow:0 2px 8px var(--shadow,rgba(0,0,0,0.4));cursor:default;white-space:nowrap;transform:translate(-50%,-50%);width:fit-content;">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                <span style="font-size:11px;font-weight:700;color:#fff;line-height:1">${tripOrigin.name}</span>
              </div>`,
              className: "",
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            })}
            interactive={false}
            zIndexOffset={1500}
          />
        )}

        {/* Route line: origin → active station (→ destination in trip mode). Hidden when browsing a searched area. */}
        {(() => {
          const routeOrigin = tripMode === "trip" && tripOrigin
            ? tripOrigin
            : userLocation;
          if (!routeOrigin || !activeRouteStation || searchOrigin) return null;
          const points: [number, number][] = [
            [routeOrigin.lat, routeOrigin.lng],
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
              {/* Main dashed line — animated */}
              <Polyline
                positions={points}
                pathOptions={{
                  color: "#4285f4",
                  weight: 2.5,
                  opacity: 0.6,
                  dashArray: "8, 8",
                  lineCap: "round",
                  lineJoin: "round",
                  className: "animate-dash",
                }}
              />
            </>
          );
        })()}
      </MapContainer>

      {/* Recentre button — bottom right */}
      <button
        onClick={() => {
          setSearchOrigin(null);
          if (userLocation) setFlyToTarget({ lat: userLocation.lat, lng: userLocation.lng, zoom: 14 });
        }}
        className="hidden md:flex absolute bottom-4 right-4 z-[900] rounded-full bg-[var(--card)] border border-[var(--subtle-border)] shadow-xl items-center gap-1.5 px-3 py-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
        title="Centre on my location"
      >
        <LocateFixed className="h-4 w-4" strokeWidth={2} />
      </button>

      {/* Search this area button — desktop only (mobile has it in floating buttons row) */}
      <div className="hidden md:block">
        <SearchAreaButton mapCentre={viewport.centre} />
      </div>

      {/* FillStrategy — single instance, responsive (bottom sheet on mobile, floating card on desktop) */}
      <FillStrategy stations={stations} selectedFuelType={selectedFuelType} loading={loading} mapCentre={viewport.centre} onRecentre={() => {
        setSearchOrigin(null);
        if (userLocation) setFlyToTarget({ lat: userLocation.lat, lng: userLocation.lng, zoom: 14 });
      }} onEditTrip={() => setTripPlannerOpen(true)} />
    </div>
  );
}
