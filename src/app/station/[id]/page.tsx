import type { Metadata } from "next";
import { fetchMergedStations } from "@/lib/fuel-api";
import { nearestStations } from "@/lib/geo";
import { extractSuburb, suburbToSlug } from "@/lib/suburbs";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import BrandLogo from "@/components/shared/BrandLogo";
import AdSlot from "@/components/shared/AdSlot";
import StationPageClient from "./StationPageClient";
import SubpageHeader from "@/components/layout/SubpageHeader";

export const revalidate = 3600;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const stations = await fetchMergedStations();
  const station = stations.find((s) => s.id === decodedId);

  if (!station) {
    return { title: "Station Not Found — PetrolSaver" };
  }

  const suburb = extractSuburb(station.address);
  const u91 = station.prices.find((p) => p.fuelType === "U91");

  return {
    title: `${station.name} Fuel Prices Today | ${suburb} — PetrolSaver`,
    description: `Check today's petrol prices at ${station.name}, ${suburb}. ${u91 ? `Unleaded 91 is ${u91.price.toFixed(1)}c/L. ` : ""}Compare with nearby servos and find the cheapest fuel in ${suburb}.`,
    alternates: { canonical: `/station/${encodeURIComponent(station.id)}` },
    openGraph: {
      title: `${station.name} — Fuel Prices`,
      description: `Compare fuel prices at ${station.name}, ${suburb}. Updated hourly.`,
    },
  };
}

// Don't pre-generate station pages — generate on-demand to avoid build timeout
// Pages are cached via ISR (revalidate: 3600) after first visit
export const dynamicParams = true;

export default async function StationPage({ params }: Props) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const stations = await fetchMergedStations();
  const station = stations.find((s) => s.id === decodedId);

  if (!station) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-white mb-2">Station not found</h1>
          <a href="/" className="text-[#8ab4f8] text-sm hover:text-[#aecbfa]">&larr; Back to map</a>
        </div>
      </div>
    );
  }

  const suburb = extractSuburb(station.address);
  const suburbSlug = suburbToSlug(suburb);
  const suburbUrl = station.state === "NSW" ? `/prices/nsw/${suburbSlug}` : `/prices/${suburbSlug}`;
  const nearby = nearestStations(
    stations.filter((s) => s.id !== station.id),
    station.latitude,
    station.longitude,
    6
  );

  // Compute rank for each fuel type
  const ranks: { fuelType: string; label: string; price: number; rank: number; total: number; average: number }[] = [];
  for (const p of station.prices) {
    const allPrices = stations
      .map((s) => s.prices.find((pr) => pr.fuelType === p.fuelType)?.price)
      .filter((pr): pr is number => pr != null)
      .sort((a, b) => a - b);
    const rank = allPrices.filter((pr) => pr < p.price).length + 1;
    const avg = allPrices.length > 0 ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length * 10) / 10 : 0;
    ranks.push({
      fuelType: p.fuelType,
      label: FUEL_TYPE_LABELS[p.fuelType] ?? p.fuelType,
      price: p.price,
      rank,
      total: allPrices.length,
      average: avg,
    });
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <SubpageHeader />

      {/* Hero */}
      <div className="bg-gradient-to-b from-[#242424] to-[#1a1a1a]">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-3">
            {station.brand && <BrandLogo brandName={station.brand.name} size="lg" />}
            <div>
              <h1 className="text-2xl font-bold text-white">{station.name}</h1>
              {station.brand && (
                <p className="text-sm text-[#9aa0a6]">
                  {station.brand.name} &middot; <span className="capitalize">{station.brand.type}</span>
                </p>
              )}
            </div>
          </div>

          <p className="text-sm text-[#9aa0a6] mb-4">{station.address}</p>

          <div className="flex gap-2">
            <a
              href={`/?station=${encodeURIComponent(station.id)}`}
              className="inline-flex items-center gap-2 bg-[#4285f4] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#5a9bf6] transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              View on map
            </a>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white/[0.08] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-white/15 transition-colors cursor-pointer"
            >
              Get Directions
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Ad */}
        <div className="mb-6">
          <AdSlot slot="station-page" format="horizontal" />
        </div>

        {/* Fuel prices with ranks */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Current Prices</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {ranks.map((r) => {
              const diff = r.average - r.price;
              const isCheaper = diff > 0;
              return (
                <div key={r.fuelType} className="rounded-xl border border-white/10 bg-[#242424] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{r.label}</span>
                    <span className="text-[10px] text-[#5f6368]">#{r.rank} of {r.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold font-mono text-white">
                      {r.price.toFixed(1)}<span className="text-sm text-[#5f6368]">c/L</span>
                    </div>
                    <div className={`text-sm font-bold font-mono ${isCheaper ? "text-emerald-400" : "text-red-400"}`}>
                      {isCheaper ? "-" : "+"}{Math.abs(diff).toFixed(1)}c vs avg
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Price history — client component */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Price History</h2>
          <StationPageClient stationId={station.id} prices={station.prices} />
        </div>

        {/* Nearby stations */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Nearby Stations</h2>
          <div className="rounded-xl border border-white/10 bg-[#242424] overflow-hidden">
            {nearby.map((s, i) => {
              const u91 = s.prices.find((p) => p.fuelType === "U91");
              return (
                <a
                  key={s.id}
                  href={`/station/${encodeURIComponent(s.id)}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${i > 0 ? "border-t border-white/5" : ""}`}
                >
                  <BrandLogo brandName={s.brand?.name ?? "?"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white truncate">{s.name}</div>
                    <div className="text-[10px] text-[#5f6368]">{s.distance.toFixed(1)}km away</div>
                  </div>
                  {u91 && (
                    <span className="text-sm font-bold font-mono text-white">{u91.price.toFixed(1)}c</span>
                  )}
                </a>
              );
            })}
          </div>
        </div>

        {/* SEO content */}
        <div className="border-t border-white/5 pt-6 mb-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white mb-2">
              {station.name} Petrol Prices Today
            </h2>
            <p className="text-sm text-[#9aa0a6] leading-relaxed">
              Looking for cheap fuel at {station.name}? This {station.brand?.name ?? ""} servo is located
              at {station.address} and currently sells{" "}
              {ranks.map((r, i) => (
                <span key={r.fuelType}>
                  {i > 0 && i < ranks.length - 1 && ", "}
                  {i === ranks.length - 1 && ranks.length > 1 && " and "}
                  {r.label} at <strong className="text-white">{r.price.toFixed(1)}c/L</strong>
                </span>
              ))}.
              {ranks[0] && ranks[0].rank <= Math.ceil(ranks[0].total * 0.1) && (
                <> This is one of the <strong className="text-emerald-400">cheapest fuel prices in VIC & NSW</strong> right now.</>
              )}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white mb-1">
              Is {station.name} Cheap Compared to {suburb}?
            </h3>
            <p className="text-sm text-[#9aa0a6] leading-relaxed">
              {ranks[0] && ranks[0].average > ranks[0].price ? (
                <>
                  Yes — {station.name} is currently <strong className="text-emerald-400">
                  {(ranks[0].average - ranks[0].price).toFixed(1)}c/L cheaper</strong> than
                  the state average for {ranks[0].label}. It ranks #{ranks[0].rank} out
                  of {ranks[0].total} stations across VIC & NSW.
                </>
              ) : ranks[0] ? (
                <>
                  {station.name} is currently {(ranks[0].price - ranks[0].average).toFixed(1)}c/L
                  above the state average for {ranks[0].label}. Check{" "}
                  <a href={suburbUrl} className="text-[#8ab4f8] hover:text-[#aecbfa]">
                    other stations in {suburb}
                  </a>{" "}
                  for a better deal.
                </>
              ) : null}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white mb-1">
              Cheapest Fuel Near {suburb}
            </h3>
            <p className="text-sm text-[#9aa0a6] leading-relaxed">
              Compare petrol, diesel, and LPG prices at {nearby.length} nearby stations
              in {suburb} and surrounding suburbs. Use the{" "}
              <a href="/" className="text-[#8ab4f8] hover:text-[#aecbfa]">PetrolSaver map</a> to
              find the cheapest servo near you — our smart recommendation engine factors in
              the cost of driving to each station, so you know exactly how much you&apos;ll
              actually save. Browse all{" "}
              <a href={suburbUrl} className="text-[#8ab4f8] hover:text-[#aecbfa]">
                fuel prices in {suburb}
              </a>{" "}
              or explore{" "}
              <a href="/prices" className="text-[#8ab4f8] hover:text-[#aecbfa]">
                fuel prices by suburb
              </a>{" "}
              across VIC & NSW.
            </p>
          </div>
        </div>

        {/* Bottom ad */}
        <div className="mb-6">
          <AdSlot slot="station-page-bottom" format="horizontal" />
        </div>

        {/* Attribution */}
        <div className="pb-8 text-center text-[10px] text-[#5f6368]">
          Data from{" "}
          <a href="https://www.service.vic.gov.au" className="text-[#8ab4f8]" target="_blank" rel="noopener noreferrer">
            Service Victoria
          </a>
          {" and "}
          <a href="https://www.transport.nsw.gov.au" className="text-[#8ab4f8]" target="_blank" rel="noopener noreferrer">
            Transport for NSW
          </a>
        </div>
      </div>
    </div>
  );
}
