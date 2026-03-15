import type { Metadata } from "next";
import { fetchMergedStations } from "@/lib/fuel-api";
import { extractSuburb, suburbToSlug, slugToDisplay, groupBySuburb } from "@/lib/suburbs";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import SuburbPageClient from "./SuburbPageClient";

export const revalidate = 3600;

interface Props {
  params: Promise<{ suburb: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { suburb } = await params;
  const display = slugToDisplay(suburb);
  return {
    title: `Cheapest Fuel Prices in ${display} — PetrolSaver`,
    description: `Compare petrol, diesel, and LPG prices at fuel stations in ${display}, Victoria. Find the cheapest servo near you today.`,
    alternates: {
      canonical: `/prices/${suburb}`,
    },
    openGraph: {
      title: `Fuel Prices in ${display} — PetrolSaver`,
      description: `Compare fuel prices at stations in ${display}, Victoria. Updated hourly.`,
      url: `https://petrolsaver.live/prices/${suburb}`,
    },
  };
}

export async function generateStaticParams() {
  const stations = await fetchMergedStations();
  const suburbMap = groupBySuburb(stations);
  return [...suburbMap.keys()].map((suburb) => ({
    suburb: suburbToSlug(suburb),
  }));
}

export default async function SuburbPage({ params }: Props) {
  const { suburb: slug } = await params;
  const display = slugToDisplay(slug);
  const stations = await fetchMergedStations();
  const suburbMap = groupBySuburb(stations);

  // Find the matching suburb (case-insensitive slug match)
  let suburbStations: typeof stations = [];
  for (const [name, stns] of suburbMap) {
    if (suburbToSlug(name) === slug) {
      suburbStations = stns;
      break;
    }
  }

  // Compute stats per fuel type
  const allPricesByType = new Map<string, number[]>();
  for (const s of stations) {
    for (const p of s.prices) {
      const arr = allPricesByType.get(p.fuelType) || [];
      arr.push(p.price);
      allPricesByType.set(p.fuelType, arr);
    }
  }

  // Build fuel type summaries for this suburb
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
      fuelType: fuelId,
      label,
      cheapest: stationsWithFuel[0],
      average: Math.round(avg * 10) / 10,
      stateAverage: Math.round(stateAvg * 10) / 10,
      stationCount: stationsWithFuel.length,
    });
  }

  const totalStations = suburbStations.length;
  const cheapestU91 = fuelSummaries.find((f) => f.fuelType === "U91")?.cheapest;

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Hero */}
      <div className="bg-gradient-to-b from-[#242424] to-[#1a1a1a] border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
          <nav className="mb-4">
            <a href="/" className="text-[#8ab4f8] hover:text-[#aecbfa] text-sm transition-colors">
              &larr; Back to map
            </a>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Fuel Prices in {display}
          </h1>
          <p className="text-[#9aa0a6] text-sm md:text-base">
            Compare prices at {totalStations} fuel station{totalStations !== 1 ? "s" : ""} in {display}, Victoria.
            {cheapestU91 && (
              <> Cheapest Unleaded 91 is <span className="text-emerald-400 font-semibold">{cheapestU91.price.toFixed(1)}c/L</span> at {cheapestU91.name}.</>
            )}
          </p>
        </div>
      </div>

      {/* Fuel type cards */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid gap-4 md:grid-cols-2">
          {fuelSummaries.map((fuel) => {
            const diff = fuel.stateAverage - fuel.average;
            const isCheaper = diff > 0;
            return (
              <div
                key={fuel.fuelType}
                className="rounded-xl border border-white/10 bg-[#242424] p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    {fuel.label}
                  </h2>
                  <span className="text-xs text-[#9aa0a6]">
                    {fuel.stationCount} station{fuel.stationCount !== 1 ? "s" : ""}
                  </span>
                </div>

                {fuel.cheapest && (
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs text-[#9aa0a6] mb-0.5">Cheapest</div>
                      <div className="text-2xl font-bold font-mono text-emerald-400">
                        {fuel.cheapest.price.toFixed(1)}<span className="text-sm text-[#9aa0a6]">c/L</span>
                      </div>
                      <div className="text-xs text-[#9aa0a6] mt-0.5">
                        {fuel.cheapest.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#9aa0a6] mb-0.5">vs State Avg</div>
                      <div className={`text-lg font-bold font-mono ${isCheaper ? "text-emerald-400" : "text-red-400"}`}>
                        {isCheaper ? "-" : "+"}{Math.abs(diff).toFixed(1)}c
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <div className="flex-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-center">
                    <div className="text-[10px] text-[#9aa0a6]">Suburb Avg</div>
                    <div className="text-xs font-bold text-white font-mono">{fuel.average.toFixed(1)}c</div>
                  </div>
                  <div className="flex-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-center">
                    <div className="text-[10px] text-[#9aa0a6]">State Avg</div>
                    <div className="text-xs font-bold text-white font-mono">{fuel.stateAverage.toFixed(1)}c</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* All stations table */}
        <div className="mt-8">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
            All Stations in {display}
          </h2>
          <SuburbPageClient stations={suburbStations} />
        </div>

        {/* SEO content */}
        <div className="mt-10 border-t border-white/5 pt-6">
          <h2 className="text-base font-bold text-white mb-2">
            About Fuel Prices in {display}
          </h2>
          <p className="text-sm text-[#9aa0a6] leading-relaxed mb-3">
            PetrolSaver tracks fuel prices at {totalStations} petrol stations in {display}, Victoria.
            Prices are updated daily via the Victorian Government&apos;s Fair Fuel API and typically
            reflect prices from the last 24 hours.
          </p>
          <p className="text-sm text-[#9aa0a6] leading-relaxed">
            To find the cheapest fuel near you, visit the <a href="/" className="text-[#8ab4f8] hover:text-[#aecbfa]">PetrolSaver map</a> and
            zoom into {display}. You can filter by fuel type including Unleaded 91, Premium 95,
            Premium 98, Diesel, E10, and LPG.
          </p>
        </div>

        {/* Attribution */}
        <div className="mt-8 pb-8 text-center text-xs text-[#5f6368]">
          Data sourced from{" "}
          <a href="https://www.service.vic.gov.au" className="text-[#8ab4f8] hover:text-[#aecbfa]" target="_blank" rel="noopener noreferrer">
            Service Victoria
          </a>
          {" "}&middot; Prices are delayed ~24 hours
        </div>
      </div>
    </div>
  );
}
