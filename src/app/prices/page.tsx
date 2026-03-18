import type { Metadata } from "next";
import { fetchMergedStations } from "@/lib/fuel-api";
import { groupBySuburb, suburbToSlug } from "@/lib/suburbs";
import AdSlot from "@/components/shared/AdSlot";
import SubpageHeader from "@/components/layout/SubpageHeader";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Fuel Prices by Suburb — PetrolSaver",
  description:
    "Browse fuel prices across Victoria and New South Wales, Australia. Find the cheapest petrol station in your suburb.",
  alternates: { canonical: "/prices" },
};

interface SuburbEntry {
  name: string;
  slug: string;
  count: number;
  cheapestU91: number | null;
  state: "VIC" | "NSW";
}

function buildSuburbList(stations: Awaited<ReturnType<typeof fetchMergedStations>>, state: "VIC" | "NSW"): SuburbEntry[] {
  const filtered = stations.filter((s) => (s.state ?? "VIC") === state);
  const suburbMap = groupBySuburb(filtered);

  return [...suburbMap.entries()]
    .map(([name, stns]) => ({
      name,
      slug: suburbToSlug(name),
      count: stns.length,
      cheapestU91: stns
        .map((s) => s.prices.find((p) => p.fuelType === "U91")?.price)
        .filter((p): p is number => p != null)
        .sort((a, b) => a - b)[0] ?? null,
      state,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function groupByLetter(suburbs: SuburbEntry[]) {
  const grouped = new Map<string, SuburbEntry[]>();
  for (const sub of suburbs) {
    const letter = sub.name.charAt(0).toUpperCase();
    const arr = grouped.get(letter) || [];
    arr.push(sub);
    grouped.set(letter, arr);
  }
  return grouped;
}

function SuburbSection({ title, suburbs, urlPrefix }: { title: string; suburbs: SuburbEntry[]; urlPrefix: string }) {
  const grouped = groupByLetter(suburbs);

  return (
    <div className="mb-12">
      <h2 className="text-xl font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
        {title}
        <span className="text-xs font-normal text-[var(--muted)]">({suburbs.length} suburbs)</span>
      </h2>

      {/* Letter quick nav */}
      <div className="pb-4 border-b border-[var(--subtle-border)] mb-4">
        <div className="flex flex-wrap gap-1">
          {[...grouped.keys()].map((letter) => (
            <a
              key={`${title}-${letter}`}
              href={`#${title}-${letter}`}
              className="w-8 h-8 rounded-lg bg-[var(--subtle)] flex items-center justify-center text-xs font-bold text-[var(--foreground)] hover:bg-[#4285f4] hover:text-white transition-all"
            >
              {letter}
            </a>
          ))}
        </div>
      </div>

      {[...grouped.entries()].map(([letter, subs]) => (
        <div key={`${title}-${letter}`} id={`${title}-${letter}`} className="mb-8">
          <h3 className="text-lg font-bold text-[var(--foreground)] mb-3 sticky top-0 bg-[var(--background)] py-2 z-10 border-b border-[var(--subtle-border)]">
            {letter}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
            {subs.map((sub) => (
              <a
                key={sub.slug}
                href={`${urlPrefix}${sub.slug}`}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-[var(--subtle)] transition-colors group"
              >
                <div>
                  <div className="text-sm text-[var(--foreground)] group-hover:text-[var(--foreground)] transition-colors">
                    {sub.name.split(" ").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")}
                  </div>
                  <div className="text-[10px] text-[var(--muted)]">
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
    </div>
  );
}

export default async function PricesIndexPage() {
  const stations = await fetchMergedStations();
  const vicSuburbs = buildSuburbList(stations, "VIC");
  const nswSuburbs = buildSuburbList(stations, "NSW");
  const totalSuburbs = vicSuburbs.length + nswSuburbs.length;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <SubpageHeader />

      {/* Hero */}
      <div className="bg-gradient-to-b from-[var(--card)] to-[var(--background)]">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-10">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)] mb-2">
            Fuel Prices by Suburb
          </h1>
          <p className="text-[var(--muted)] text-sm md:text-base mb-5">
            Browse fuel prices across {totalSuburbs} suburbs in Victoria and New South Wales.
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

      <div className="max-w-4xl mx-auto px-4 py-6">
        {vicSuburbs.length > 0 && (
          <SuburbSection title="Victoria" suburbs={vicSuburbs} urlPrefix="/prices/" />
        )}

        {nswSuburbs.length > 0 && (
          <SuburbSection title="New South Wales" suburbs={nswSuburbs} urlPrefix="/prices/nsw/" />
        )}

        {/* Attribution */}
        <div className="mt-8 pb-8 text-center text-[10px] text-[var(--muted)]">
          Data from{" "}
          <a href="https://www.service.vic.gov.au" className="text-[var(--accent-text)]" target="_blank" rel="noopener noreferrer">
            Service Victoria
          </a>
          {" and "}
          <a href="https://www.transport.nsw.gov.au" className="text-[var(--accent-text)]" target="_blank" rel="noopener noreferrer">
            Transport for NSW
          </a>
        </div>
      </div>
    </div>
  );
}
