import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PetrolSaver — Cheapest Fuel Prices in VIC & NSW";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a1a 0%, #242424 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Lightning bolt icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "#4285f4",
            marginBottom: 24,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "white",
            marginBottom: 12,
            letterSpacing: "-0.02em",
          }}
        >
          PetrolSaver
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#9aa0a6",
            marginBottom: 40,
          }}
        >
          Cheapest Fuel Prices in VIC & NSW
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            gap: 48,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#4285f4" }}>4,000+</div>
            <div style={{ fontSize: 16, color: "#5f6368", marginTop: 4 }}>Stations</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#34a853" }}>Live</div>
            <div style={{ fontSize: 16, color: "#5f6368", marginTop: 4 }}>Prices</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#fbbc04" }}>Free</div>
            <div style={{ fontSize: 16, color: "#5f6368", marginTop: 4 }}>Forever</div>
          </div>
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            fontSize: 18,
            color: "#5f6368",
          }}
        >
          petrolsaver.live
        </div>
      </div>
    ),
    { ...size }
  );
}
