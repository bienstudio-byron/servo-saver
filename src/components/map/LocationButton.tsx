"use client";

import { useState } from "react";
import { useMap } from "react-leaflet";

export default function LocationButton() {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  function handleClick() {
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.flyTo([position.coords.latitude, position.coords.longitude], 13, { duration: 1.5 });
        setLocating(false);
      },
      () => {
        alert("Unable to retrieve your location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={locating}
      title="Near me"
      className="absolute right-3 top-3 z-[1000] flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a1a1a]/90 border border-white/10 shadow-lg backdrop-blur-sm transition-all hover:bg-[#242424] hover:border-white/20 disabled:opacity-50"
      aria-label="Centre map on my location"
    >
      {locating ? (
        <div className="h-4 w-4 rounded-full border-2 border-[#8ab4f8] border-t-transparent animate-spin" />
      ) : (
        <svg className="h-4 w-4 text-[#8ab4f8]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <circle cx="12" cy="12" r="3" />
          <path strokeLinecap="round" d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
        </svg>
      )}
    </button>
  );
}
