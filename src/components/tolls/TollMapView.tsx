"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { MAP_CENTER } from "@/lib/constants";
import { useTollStore } from "@/stores/toll-store";
import { useFuelStore } from "@/stores/fuel-store";
import { useTheme } from "@/lib/theme";
import { getMarkersForSegments } from "@/lib/toll-detector";
import type { LatLng } from "@/types/toll";
import "leaflet/dist/leaflet.css";

function toLeaflet(points: LatLng[]): [number, number][] {
  return points.map((p) => [p.lat, p.lng]);
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

function FitRoutes() {
  const map = useMap();
  const tollRoute = useTollStore((s) => s.tollRouteData);
  const freeRoute = useTollStore((s) => s.freeRouteData);

  useEffect(() => {
    if (!tollRoute && !freeRoute) return;
    const allPoints = [
      ...(tollRoute?.polyline ?? []),
      ...(freeRoute?.polyline ?? []),
    ];
    if (allPoints.length < 2) return;
    const bounds = L.latLngBounds(allPoints.map((p) => L.latLng(p.lat, p.lng)));
    const isMobile = window.innerWidth < 768;
    map.fitBounds(bounds, {
      paddingTopLeft: isMobile ? [20, 60] : [40, 40],
      paddingBottomRight: isMobile ? [20, Math.round(window.innerHeight * 0.45)] : [40, 40],
      maxZoom: 14,
      animate: true,
      duration: 0.8,
    });
  }, [tollRoute, freeRoute, map]);

  return null;
}

function TollPriceTag({ position, price, name }: { position: { lat: number; lng: number }; price: number; name: string }) {
  const icon = useMemo(() => L.divIcon({
    html: `<div style="display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border-radius:4px;background:rgba(239,68,68,0.15);border:1.5px solid rgba(239,68,68,0.5);box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:default;white-space:nowrap;transform:translate(-50%,-50%);width:fit-content;">
      <span style="font-size:10px;font-weight:700;font-family:ui-monospace,monospace;color:#ef4444">$${(price / 100).toFixed(2)}</span>
    </div>`,
    className: "",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  }), [price]);

  return (
    <Marker position={[position.lat, position.lng]} icon={icon} interactive={true}>
      <Tooltip direction="top" offset={[0, -12]}>
        {name}
      </Tooltip>
    </Marker>
  );
}

export default function TollMapView() {
  const tollRoute = useTollStore((s) => s.tollRouteData);
  const freeRoute = useTollStore((s) => s.freeRouteData);
  const origin = useTollStore((s) => s.origin);
  const destination = useTollStore((s) => s.destination);
  const comparison = useTollStore((s) => s.comparison);
  const settings = useTollStore((s) => s.settings);
  const userLocation = useFuelStore((s) => s.userLocation);
  const { theme } = useTheme();
  const tileUrl = theme === "light"
    ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

  // Get toll price markers from the detected segments (not re-detecting)
  const tollMarkers = useMemo(() => {
    if (!comparison || comparison.tollBreakdown.length === 0) return [];
    return getMarkersForSegments(
      comparison.tollBreakdown,
      settings.timePeriod,
      tollRoute?.polyline,
      freeRoute?.polyline
    );
  }, [comparison, settings.timePeriod, tollRoute, freeRoute]);

  // Toll = red, Free = blue. Recommended gets solid + glow, other gets dashed.
  const hasTolls = comparison && comparison.tollBreakdown.length > 0;
  const freeIsBetter = !comparison || comparison.savings > 0;

  const TOLL_COLOR = "#ef4444"; // red
  const FREE_COLOR = "#4285f4"; // blue

  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={11}
      className="h-full w-full"
      zoomControl={false}
      minZoom={6}
      maxZoom={18}
    >
      <TileLayer
        key={theme}
        url={tileUrl}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <FitRoutes />

      {/* Toll route — always red */}
      {tollRoute && (
        freeIsBetter ? (
          // Toll is NOT recommended → dashed
          <>
            <Polyline positions={toLeaflet(tollRoute.polyline)} color={TOLL_COLOR} weight={5} opacity={0.1} />
            <Polyline positions={toLeaflet(tollRoute.polyline)} color={TOLL_COLOR} weight={3} opacity={0.5} dashArray="8 8" />
          </>
        ) : (
          // Toll IS recommended → solid with glow
          <>
            <Polyline positions={toLeaflet(tollRoute.polyline)} color={TOLL_COLOR} weight={8} opacity={0.15} />
            <Polyline positions={toLeaflet(tollRoute.polyline)} color={TOLL_COLOR} weight={4} opacity={0.85} />
          </>
        )
      )}

      {/* Free route — always blue */}
      {freeRoute && (
        freeIsBetter ? (
          // Free IS recommended → solid with glow
          <>
            <Polyline positions={toLeaflet(freeRoute.polyline)} color={FREE_COLOR} weight={8} opacity={0.15} />
            <Polyline positions={toLeaflet(freeRoute.polyline)} color={FREE_COLOR} weight={4} opacity={0.85} />
          </>
        ) : (
          // Free is NOT recommended → dashed
          <>
            <Polyline positions={toLeaflet(freeRoute.polyline)} color={FREE_COLOR} weight={5} opacity={0.1} />
            <Polyline positions={toLeaflet(freeRoute.polyline)} color={FREE_COLOR} weight={3} opacity={0.5} dashArray="8 8" />
          </>
        )
      )}

      {/* Toll price tags along the toll route */}
      {tollMarkers.map((m) => (
        <TollPriceTag key={m.id} position={m.position} price={m.tollCents} name={m.segmentName} />
      ))}

      {/* Origin marker */}
      {origin && (
        <CircleMarker
          center={[origin.lat, origin.lng]}
          radius={8}
          fillColor="#22c55e"
          fillOpacity={1}
          color="#fff"
          weight={2}
        >
          <Tooltip permanent direction="top" offset={[0, -10]}>
            <span style={{ fontWeight: 600, fontSize: 11 }}>Start</span>
          </Tooltip>
        </CircleMarker>
      )}

      {/* Destination marker */}
      {destination && (
        <CircleMarker
          center={[destination.lat, destination.lng]}
          radius={8}
          fillColor="#ef4444"
          fillOpacity={1}
          color="#fff"
          weight={2}
        >
          <Tooltip permanent direction="top" offset={[0, -10]}>
            <span style={{ fontWeight: 600, fontSize: 11 }}>End</span>
          </Tooltip>
        </CircleMarker>
      )}

      {/* User location pulsing blue dot */}
      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={userLocationIcon}
          interactive={false}
          zIndexOffset={2000}
        />
      )}
    </MapContainer>
  );
}
