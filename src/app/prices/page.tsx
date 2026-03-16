import type { Metadata } from "next";
import { fetchMergedStations } from "@/lib/fuel-api";
import { groupBySuburb, suburbToSlug } from "@/lib/suburbs";
import AdSlot from "@/components/shared/AdSlot";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Fuel Prices by Suburb — PetrolSaver",
  description:
    "Browse fuel prices across 900+ suburbs in Victoria, Australia. Find the cheapest petrol station in your suburb.",
  alternates: { canonical: "/prices" },
};

export default async function PricesIndexPage() {
  const stations = await fetchMergedStations();
  const suburbMap = groupBySuburb(stations);

  const sorted = [...suburbMap.entries()]
    .map(([name, stns]) => ({
      name,
      slug: suburbToSlug(name),
      count: stns.length,
      cheapestU91: stns
        .map((s) => s.prices.find((p) => p.fuelType === "U91")?.price)
        .filter((p): p is number => p != null)
        .sort((a, b) => a - b)[0] ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const grouped = new Map<string, typeof sorted>();
  for (const sub of sorted) {
    const letter = sub.name.charAt(0).toUpperCase();
    const arr = grouped.get(letter) || [];
    arr.push(sub);
    grouped.set(letter, arr);
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#1a1a1a]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 group">
            <div className="h-7 w-7 rounded-md bg-[#4285f4] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-white group-hover:text-[#8ab4f8] transition-colors">PetrolSaver</span>
          </a>
          <a href="/" className="text-[11px] text-[#8ab4f8] hover:text-white font-semibold transition-colors">
            Open Map
          </a>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-b from-[#242424] to-[#1a1a1a]">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-10">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Fuel Prices by Suburb
          </h1>
          <p className="text-[#9aa0a6] text-sm md:text-base mb-5">
            Browse fuel prices across {sorted.length} suburbs in Victoria, Australia.
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

      {/* Ad */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <AdSlot slot="suburb-index" format="horizontal" />
      </div>

      {/* Letter quick nav */}
      <div className="max-w-4xl mx-auto px-4 pb-4 border-b border-white/5">
        <div className="flex flex-wrap gap-1">
          {[...grouped.keys()].map((letter) => (
            <a
              key={letter}
              href={`#${letter}`}
              className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-[#dadce0] hover:bg-[#4285f4] hover:text-white transition-all"
            >
              {letter}
            </a>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {[...grouped.entries()].map(([letter, suburbs]) => (
          <div key={letter} id={letter} className="mb-8">
            <h2 className="text-lg font-bold text-white mb-3 sticky top-0 bg-[#1a1a1a] py-2 z-10 border-b border-white/5">
              {letter}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
              {suburbs.map((sub) => (
                <a
                  key={sub.slug}
                  href={`/prices/${sub.slug}`}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors group"
                >
                  <div>
                    <div className="text-sm text-[#dadce0] group-hover:text-white transition-colors">
                      {sub.name.split(" ").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")}
                    </div>
                    <div className="text-[10px] text-[#5f6368]">
                      {sub.count} station{sub.count !== 1 ? "s" : ""}
                    </div>
                  </div>
                  {sub.cheapestU91 && (
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {sub.cheapestU91.toFixed(1)}c
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        ))}

        {/* Attribution */}
        <div className="mt-8 pb-8 text-center text-[10px] text-[#5f6368]">
          Data sourced from{" "}
          <a href="https://www.service.vic.gov.au" className="text-[#8ab4f8]" target="_blank" rel="noopener noreferrer">
            Service Victoria
          </a>
          {" "}&middot; Prices delayed ~24hrs
        </div>
      </div>
    </div>
  );
}
