import type { Metadata } from "next";
import SubpageHeader from "@/components/layout/SubpageHeader";

export const metadata: Metadata = {
  title: "How It Works — PetrolSaver",
  description:
    "Learn how PetrolSaver recommends fuel stations. Our transparent algorithm considers price, distance, detour cost, and your fuel level to find the smartest deal.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <SubpageHeader />

      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-3">How PetrolSaver Works</h1>
        <p className="text-[var(--muted)] text-base mb-10 leading-relaxed">
          We believe you deserve to know exactly how we recommend fuel stations. No black boxes.
          Here&apos;s the complete breakdown of our recommendation engine.
        </p>

        {/* Data Source */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">1</span>
            Where our data comes from
          </h2>
          <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] p-5 space-y-3 text-sm text-[var(--muted)] leading-relaxed">
            <p>
              Our fuel price data comes from two government sources:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-1">
              <li>
                <strong className="text-[var(--foreground)]">Victoria:</strong> The{" "}
                <a href="https://www.service.vic.gov.au" className="text-[var(--accent-text)] hover:text-[var(--foreground)]" target="_blank" rel="noopener noreferrer">Victorian Government&apos;s Fair Fuel Open Data API</a>.
                Prices are delayed ~24 hours.
              </li>
              <li>
                <strong className="text-[var(--foreground)]">New South Wales:</strong> The{" "}
                <a href="https://www.transport.nsw.gov.au" className="text-[var(--accent-text)] hover:text-[var(--foreground)]" target="_blank" rel="noopener noreferrer">NSW FuelCheck API</a> via Transport for NSW.
                Prices are updated in real-time.
              </li>
            </ul>
            <p>
              Fuel retailers in both states are required to submit their prices to these systems.
              We refresh our data regularly and do not modify the prices in any way.
              What you see is exactly what the government publishes.
            </p>
            <p className="text-[var(--muted)] text-xs">
              We currently track approximately 4,000+ fuel stations across Victoria and New South Wales.
            </p>
          </div>
        </section>

        {/* How Recommendations Work */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">2</span>
            How we rank stations
          </h2>
          <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] p-5 space-y-3 text-sm text-[var(--muted)] leading-relaxed">
            <p>
              We don&apos;t just show the cheapest station. We calculate the <strong className="text-[var(--foreground)]">true cost</strong> of
              filling up at each station, factoring in the real cost of getting there.
            </p>
            <p>Our algorithm considers three factors:</p>
            <div className="space-y-4 mt-4">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <span className="text-emerald-400 text-sm font-bold">$</span>
                </div>
                <div>
                  <div className="text-[var(--foreground)] font-semibold mb-0.5">Price per litre</div>
                  <p className="text-[var(--muted)] text-xs">The raw price at the pump, as reported by the retailer.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <span className="text-amber-400 text-sm font-bold">↗</span>
                </div>
                <div>
                  <div className="text-[var(--foreground)] font-semibold mb-0.5">Detour distance</div>
                  <p className="text-[var(--muted)] text-xs">
                    How much further you&apos;d need to drive compared to the nearest station.
                    We estimate road distance at 1.35× the straight-line distance and calculate
                    the fuel you&apos;d burn on the detour (assuming 8.5L/100km average consumption).
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#4285f4]/10 flex items-center justify-center shrink-0">
                  <span className="text-[#4285f4] text-sm font-bold">⛽</span>
                </div>
                <div>
                  <div className="text-[var(--foreground)] font-semibold mb-0.5">Your fuel level</div>
                  <p className="text-[var(--muted)] text-xs">
                    How much fuel you told us you have. This affects two things: how far we&apos;ll
                    recommend you drive (we cap the search radius at 70% of your remaining range for safety),
                    and how many litres you&apos;ll actually fill (which determines your real dollar savings).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Formula */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">3</span>
            The maths
          </h2>
          <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] p-5 space-y-4 text-sm text-[var(--muted)] leading-relaxed">
            <p>For each station within your range, we calculate:</p>

            <div className="rounded-lg bg-[var(--background)] p-4 font-mono text-xs space-y-2">
              <div className="text-[var(--muted)]">// How much extra you&apos;d drive (nearby mode)</div>
              <div><span className="text-[#4285f4]">detour_km</span> = (distance_to_station - distance_to_nearest) × 2</div>
              <div className="text-[var(--muted)] mt-3">// How much extra you&apos;d drive (trip mode)</div>
              <div><span className="text-[#4285f4]">detour_km</span> = (you → station → dest) - (you → dest)</div>
              <div className="text-[var(--muted)] mt-3">// Fuel burned on the detour</div>
              <div><span className="text-amber-400">fuel_cost</span> = (detour_km ÷ 100) × 8.5 × station_price</div>
              <div className="text-[var(--muted)] mt-3">// How full is your tank (based on range slider)</div>
              <div><span className="text-[#4285f4]">tank_percent</span> = your_range_km ÷ 800</div>
              <div className="text-[var(--muted)] mt-3">// How many litres you&apos;re filling</div>
              <div><span className="text-[#4285f4]">litres_filling</span> = tank_size × (1 - tank_percent)</div>
              <div className="text-[var(--muted)] mt-3">// Raw savings vs nearest station</div>
              <div><span className="text-emerald-400">price_savings</span> = (nearest_price - station_price) × litres_filling</div>
              <div className="text-[var(--muted)] mt-3">// What you actually save</div>
              <div><span className="text-emerald-400 font-bold">net_savings</span> = price_savings - fuel_cost</div>
            </div>

            <p>
              We then rank stations by <strong className="text-[var(--foreground)]">net savings</strong> — the amount you actually
              save after accounting for the fuel cost of getting there.
            </p>
          </div>
        </section>

        {/* The Rankings */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">4</span>
            What the labels mean
          </h2>
          <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] p-5 space-y-4 text-sm text-[var(--muted)] leading-relaxed">
            <div className="flex gap-3">
              <span className="text-emerald-400 font-bold text-xs bg-emerald-500/10 px-2 py-1 rounded shrink-0 h-fit">BEST VALUE</span>
              <p className="text-[var(--muted)] text-xs">Highest net savings after detour cost. The smartest pick — balances price vs distance.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-[#4285f4] font-bold text-xs bg-[#4285f4]/10 px-2 py-1 rounded shrink-0 h-fit">CHEAPEST</span>
              <p className="text-[var(--muted)] text-xs">Lowest raw price per litre within your range. Might be further away but has the biggest price drop.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-[var(--muted)] font-bold text-xs bg-[var(--subtle)] px-2 py-1 rounded shrink-0 h-fit">CLOSEST</span>
              <p className="text-[var(--muted)] text-xs">The nearest station to you. Shown for convenience — useful when you&apos;re low on fuel or in a rush.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-red-400 font-bold text-xs bg-red-500/10 px-2 py-1 rounded shrink-0 h-fit">AVOID</span>
              <p className="text-[var(--muted)] text-xs">The most expensive option nearby. Shown as contrast so you can see what you&apos;d waste. Not clickable.</p>
            </div>
          </div>
        </section>

        {/* Traffic Light System */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">5</span>
            Price colours explained
          </h2>
          <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] p-5 space-y-3 text-sm text-[var(--muted)] leading-relaxed">
            <p>
              Prices are colour-coded relative to <strong className="text-[var(--foreground)]">all visible stations</strong> for your selected fuel type,
              not against fixed thresholds. This means the colours adjust as market prices change.
            </p>
            <div className="space-y-2 mt-3">
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-bold font-mono text-sm bg-emerald-500/15 px-2.5 py-1 rounded-lg ring-1 ring-inset ring-emerald-500/20">219.9¢</span>
                <span className="text-[var(--muted)] text-xs">Top 10% cheapest — great price</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-amber-400 font-bold font-mono text-sm bg-amber-500/15 px-2.5 py-1 rounded-lg ring-1 ring-inset ring-amber-500/20">239.9¢</span>
                <span className="text-[var(--muted)] text-xs">Top 10–50% — average price</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-red-400 font-bold font-mono text-sm bg-red-500/15 px-2.5 py-1 rounded-lg ring-1 ring-inset ring-red-500/20">269.9¢</span>
                <span className="text-[var(--muted)] text-xs">Bottom 50% — above average</span>
              </div>
            </div>
          </div>
        </section>

        {/* Trip Mode */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">6</span>
            Trip mode
          </h2>
          <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] p-5 space-y-3 text-sm text-[var(--muted)] leading-relaxed">
            <p>
              When you set a destination, we filter stations to those roughly <strong className="text-[var(--foreground)]">along your route</strong> — not just
              the closest by distance.
            </p>
            <p>
              We define &ldquo;along your route&rdquo; as any station where the total distance
              (you → station → destination) adds no more than 15% to the direct distance, with a minimum
              corridor of 5km. This prevents recommending stations that are cheap but in completely the wrong direction.
            </p>
            <p>
              The detour calculation in trip mode is:
            </p>
            <div className="rounded-lg bg-[var(--background)] p-3 font-mono text-xs">
              <span className="text-[#4285f4]">detour</span> = (you → station → destination) - (you → nearest → destination)
            </div>
          </div>
        </section>

        {/* Assumptions */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">7</span>
            Assumptions we make
          </h2>
          <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] p-5 text-sm text-[var(--muted)] leading-relaxed">
            <div className="space-y-2">
              <div className="flex justify-between py-1.5 border-b border-[var(--subtle-border)]">
                <span className="text-[var(--muted)]">Tank size</span>
                <span className="text-[var(--foreground)] font-mono">55 litres</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--subtle-border)]">
                <span className="text-[var(--muted)]">Fuel consumption</span>
                <span className="text-[var(--foreground)] font-mono">8.5 L/100km</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--subtle-border)]">
                <span className="text-[var(--muted)]">Road distance factor</span>
                <span className="text-[var(--foreground)] font-mono">1.35× straight line</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--subtle-border)]">
                <span className="text-[var(--muted)]">Average city speed</span>
                <span className="text-[var(--foreground)] font-mono">35 km/h</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--subtle-border)]">
                <span className="text-[var(--muted)]">Safe detour range</span>
                <span className="text-[var(--foreground)] font-mono">70% of remaining fuel</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--subtle-border)]">
                <span className="text-[var(--muted)]">Max search radius</span>
                <span className="text-[var(--foreground)] font-mono">15 km</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--subtle-border)]">
                <span className="text-[var(--muted)]">Full tank range</span>
                <span className="text-[var(--foreground)] font-mono">800 km</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--muted)]">Litres to fill</span>
                <span className="text-[var(--foreground)] font-mono">tank × (1 - range/800)</span>
              </div>
            </div>
            <p className="text-[var(--muted)] text-xs mt-4">
              These are averages for a typical passenger car in metropolitan Melbourne.
              Your actual savings may vary based on your vehicle&apos;s fuel efficiency, traffic conditions,
              and the actual road route taken.
            </p>
          </div>
        </section>

        {/* No Affiliation */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">8</span>
            Independence
          </h2>
          <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] p-5 space-y-3 text-sm text-[var(--muted)] leading-relaxed">
            <p>
              PetrolSaver is <strong className="text-[var(--foreground)]">not affiliated with any fuel retailer or brand</strong>.
              We do not receive payments or incentives from any fuel company to promote their stations.
            </p>
            <p>
              Our recommendations are based purely on the algorithm described above.
              The only revenue we earn is through advertising displayed on the site.
            </p>
            <p>
              The price data is published by the Victorian and NSW governments and we are required by the
              API terms of use to display it without modification.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center mb-10">
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-[#4285f4] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#5a9bf6] active:bg-[#3367d6] transition-colors shadow-lg shadow-[#4285f4]/20 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            Find cheapest fuel near you
          </a>
        </div>

        {/* Attribution */}
        <div className="pb-8 text-center text-[10px] text-[var(--muted)]">
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
