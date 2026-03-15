"use client";

import dynamic from "next/dynamic";

interface MiniMapProps {
  latitude: number;
  longitude: number;
  name: string;
}

function MiniMapInner({ latitude, longitude, name }: MiniMapProps) {
  const L = require("leaflet") as typeof import("leaflet");
  const { MapContainer, TileLayer, Marker, Popup } = require("react-leaflet");
  require("leaflet/dist/leaflet.css");

  delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      scrollWheelZoom={false}
      className="h-64 w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <Marker position={[latitude, longitude]}>
        <Popup>{name}</Popup>
      </Marker>
    </MapContainer>
  );
}

export default dynamic(() => Promise.resolve(MiniMapInner), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center bg-[#242424] text-[#9aa0a6] text-sm">
      Loading map...
    </div>
  ),
});
