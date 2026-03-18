import type { Metadata } from "next";
import { fetchMergedStations } from "@/lib/fuel-api";
import { extractSuburb, suburbToSlug, slugToDisplay, groupBySuburb } from "@/lib/suburbs";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import AdSlot from "@/components/shared/AdSlot";
import SuburbPageClient from "@/app/prices/[suburb]/SuburbPageClient";
import SubpageHeader from "@/components/layout/SubpageHeader";

export const revalidate = 3600;

interface Props {
  params: Promise<{ suburb: string }>;
}

function filterNswStations(stations: Awaited<ReturnType<typeof fetchMergedStations>>) {
  return stations.filter((s) => s.state === "NSW");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { suburb } = await params;
  const display = slugToDisplay(suburb);
  return {
    title: `Cheapest Petrol Prices in ${display}, NSW Today — PetrolSaver`,
    description: `Compare petrol, diesel, and LPG prices at ${display}'s fuel stations. Find the cheapest servo in ${display}, New South Wales. Updated in real-time.`,
    alternates: { canonical: `/prices/nsw/${suburb}` },
    openGraph: {
      title: `Fuel Prices in ${display}, NSW — PetrolSaver`,
      description: `Compare fuel prices at stations in ${display}, New South Wales. Updated in real-time.`,
      url: `https://petrolsaver.live/prices/nsw/${suburb}`,
    },
  };
}

export async function generateStaticParams() {
  const stations = await fetchMergedStations();
  const nswStations = filterNswStations(stations);
  const suburbMap = groupBySuburb(nswStations);
  return [...suburbMap.keys()].map((suburb) => ({
    suburb: suburbToSlug(suburb),
  }));
}

export default async function NswSuburbPage({ params }: Props) {
  const { suburb: slug } = await params;
  const display = slugToDisplay(slug);
  const stations = await fetchMergedStations();
  const nswStations = filterNswStations(stations);
  const suburbMap = groupBySuburb(nswStations);

  let suburbStations: typeof nswStations = [];
  for (const [name, stns] of suburbMap) {
    if (suburbToSlug(name) === slug) {
      suburbStations = stns;
      break;
    }
  }

  const allPricesByType = new Map<string, number[]>();
  for (const s of nswStations) {
    for (const p of s.prices) {
      const arr = allPricesByType.get(p.fuelType) || [];
      arr.push(p.price);
      allPricesByType.set(p.fuelType, arr);
    }
  }

  const fuelSummaries: {
    fuelType: string;
    label: string;
    cheapest: { name: string; brand: string; price: number } | null;
    average: number;
    stateAverage: number;
    stationCount: number;
  }[] = [];

  for (const [fuelId, label] of Object.entries(FUEL_TYPE_LABELS)) {
    const stationsWithFuel = suburbStations
      .map((s) => {
        const p = s.prices.find((pr) => pr.fuelType === fuelId);
        return p ? { name: s.name, brand: s.brand?.name ?? "Unknown", price: p.price } : null;
      })
      .filter((x): x is { name: string; brand: string; price: number } => x !== null)
      .sort((a, b) => a.price - b.price);

    if (stationsWithFuel.length === 0) continue;

    const prices = stationsWithFuel.map((s) => s.price);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const allState = allPricesByType.get(fuelId) || [];
    const stateAvg = allState.length > 0 ? allState.reduce((a, b) => a + b, 0) / allState.length : 0;

    fuelSummaries.push({
      fuelType: fuelId, label,
      cheapest: stationsWithFuel[0],
      average: Math.round(avg * 10) / 10,
      stateAverage: Math.round(stateAvg * 10) / 10,
      stationCount: stationsWithFuel.length,
    });
  }

  const totalStations = suburbStations.length;
  const cheapestU91 = fuelSummaries.find((f) => f.fuelType === "U91")?.cheapest;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <SubpageHeader />

      {/* Hero */}
      <div className="bg-gradient-to-b from-[var(--card)] to-[var(--background)]">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-10">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)] mb-2">
            Fuel Prices in {display}, NSW
          </h1>
          <p className="text-[var(--muted)] text-sm md:text-base mb-5">
            Compare prices at {totalStations} fuel station{totalStations !== 1 ? "s" : ""} in {display}, New South Wales.
            {cheapestU91 && (
              <> Cheapest Unleaded 91 is <span className="text-emerald-400 font-semibold">{cheapestU91.price.toFixed(1)}c/L</span> at {cheapestU91.name}.</>
            )}
          </p>

          <a
            href="/"
            className="inline-flex items-center gap-2 bg-[#4285f4] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#5a9bf6] active:bg-[#3367d6] transition-colors shadow-lg shadow-[#4285f4]/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Find cheapest near you
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <AdSlot slot="suburb-page" format="horizontal" />
        </div>

        {/* Fuel type cards */}
        <div className="flex gap-3 overflow-x-auto pb-2 mb-8 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 md:overflow-visible scrollbar-hide">
          {fuelSummaries.map((fuel) => {
            const diff = fuel.stateAverage - fuel.average;
            const isCheaper = diff > 0;
            return (
              <div key={fuel.fuelType} className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] p-4 min-w-[260px] md:min-w-0 snap-start shrink-0 md:shrink">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">{fuel.label}</h2>
                  <span className="text-[10px] text-[var(--muted)]">{fuel.stationCount} station{fuel.stationCount !== 1 ? "s" : ""}</span>
                </div>
                {fuel.cheapest && (
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-[10px] text-[var(--muted)] mb-0.5">Cheapest</div>
                      <div className="text-2xl font-bold font-mono text-emerald-400">
                        {fuel.cheapest.price.toFixed(1)}<span className="text-sm text-[var(--muted)]">c/L</span>
                      </div>
                      <div className="text-[11px] text-[var(--muted)] mt-0.5">{fuel.cheapest.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[var(--muted)] mb-0.5">vs NSW Avg</div>
                      <div className={`text-lg font-bold font-mono ${isCheaper ? "text-emerald-400" : "text-red-400"}`}>
                        {isCheaper ? "-" : "+"}{Math.abs(diff).toFixed(1)}c
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <div className="flex-1 rounded-lg bg-[var(--subtle)] px-2.5 py-1.5 text-center">
                    <div className="text-[9px] text-[var(--muted)]">Suburb Avg</div>
                    <div className="text-xs font-bold text-[var(--foreground)] font-mono">{fuel.average.toFixed(1)}c</div>
                  </div>
                  <div className="flex-1 rounded-lg bg-[var(--subtle)] px-2.5 py-1.5 text-center">
                    <div className="text-[9px] text-[var(--muted)]">NSW Avg</div>
                    <div className="text-xs font-bold text-[var(--foreground)] font-mono">{fuel.stateAverage.toFixed(1)}c</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* All stations */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider mb-3">
            All Stations in {display}
          </h2>
          <SuburbPageClient stations={suburbStations} />
        </div>

        {/* SEO content */}
        <div className="border-t border-[var(--subtle-border)] pt-6 mb-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-[var(--foreground)] mb-2">
              Cheapest Petrol in {display}, NSW Today
            </h2>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              Looking for cheap fuel in {display}? PetrolSaver compares petrol prices
              at {totalStations} fuel station{totalStations !== 1 ? "s" : ""} in {display}, New South Wales —
              updated in real-time from Transport for NSW.
              {cheapestU91 && (
                <> The cheapest Unleaded 91 in {display} right now is{" "}
                <strong className="text-emerald-400">{cheapestU91.price.toFixed(1)}c/L</strong> at{" "}
                {cheapestU91.name}.</>
              )}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-[var(--foreground)] mb-1">
              How to Find the Best Fuel Prices Near {display}
            </h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              Use the <a href="/" className="text-[var(--accent-text)] hover:text-[var(--foreground)]">PetrolSaver map</a> to
              find the cheapest servo near you. Unlike other fuel comparison apps, PetrolSaver calculates
              the <strong className="text-[var(--foreground)]">true cost</strong> of filling up — factoring in the fuel
              you&apos;d burn driving to a cheaper station, so you know if the trip is actually worth it.
              Filter by Unleaded 91, Premium 95, Premium 98, Diesel, E10, or LPG.
            </p>
          </div>
        </div>

        {/* Bottom ad */}
        <div className="mb-6">
          <AdSlot slot="suburb-page-bottom" format="horizontal" />
        </div>

        {/* Attribution */}
        <div className="pb-8 text-center text-[10px] text-[var(--muted)]">
          Data from{" "}
          <a href="https://www.transport.nsw.gov.au" className="text-[var(--accent-text)]" target="_blank" rel="noopener noreferrer">
            Transport for NSW
          </a>
          {" "}&middot; Real-time pricing
        </div>
      </div>
    </div>
  );
}
