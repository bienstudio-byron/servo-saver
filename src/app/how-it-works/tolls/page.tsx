import type { Metadata } from "next";
import SubpageHeader from "@/components/layout/SubpageHeader";

export const metadata: Metadata = {
  title: "How TollSaver Works — PetrolSaver",
  description:
    "Learn how TollSaver compares toll vs free routes. Our transparent model factors in distance, fuel cost, toll fees, and time to show you the true cost of each route.",
  alternates: { canonical: "/how-it-works/tolls" },
};

export default function TollHowItWorksPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <SubpageHeader />

      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-3">How TollSaver Works</h1>
        <p className="text-[var(--muted)] text-base mb-10 leading-relaxed">
          No black boxes. Here&apos;s exactly how we calculate whether the toll road is worth it for your trip.
        </p>

        {/* Step 1 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">1</span>
            Two routes, one question
          </h2>
          <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] p-5 space-y-3 text-sm text-[var(--muted)] leading-relaxed">
            <p>
              For every trip, we calculate <strong className="text-[var(--foreground)]">two routes</strong> using{" "}
              <a href="https://openrouteservice.org" className="text-[var(--accent-text)] hover:text-[var(--foreground)]" target="_blank" rel="noopener noreferrer">OpenRouteService</a>:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-1">
              <li><strong className="text-[var(--foreground)]">Default route</strong> — the fastest route, which may use toll roads</li>
              <li><strong className="text-[var(--foreground)]">Toll-free route</strong> — the fastest route that avoids all toll-tagged roads</li>
            </ul>
            <p>
              Both routes come from the same routing engine with the same speed/distance data.
              The only difference is whether toll roads are allowed.
            </p>
          </div>
        </section>

        {/* Step 2 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">2</span>
            The cost formula
          </h2>
          <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] p-5 space-y-4 text-sm text-[var(--muted)] leading-relaxed">
            <p>For each route, the <strong className="text-[var(--foreground)]">true cost</strong> is:</p>
            <div className="bg-[var(--background)] rounded-lg p-4 font-mono text-sm text-[var(--foreground)] space-y-1">
              <p>true_cost = fuel_cost + toll_fees + time_cost</p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="font-semibold text-[var(--foreground)] mb-1">Driving cost</p>
                <div className="bg-[var(--background)] rounded-lg p-3 font-mono text-xs text-[var(--foreground)] space-y-1">
                  <div>fuel_only = (distance_km / 100) &times; consumption_L &times; price_per_L</div>
                  <div className="text-[var(--muted)]">— or —</div>
                  <div>full_cost = distance_km &times; $0.88 <span className="text-[var(--muted)]">(ATO rate)</span></div>
                </div>
                <p className="mt-1.5 text-xs">
                  Same formula for both routes. Choose &ldquo;Fuel only&rdquo; to count just petrol, or &ldquo;Full cost (ATO 88¢/km)&rdquo; to include tyres, servicing, and depreciation. Toggle this in the More filter. The distance difference between routes IS the cost difference.
                </p>
              </div>

              <div>
                <p className="font-semibold text-[var(--foreground)] mb-1">Toll fees</p>
                <p className="text-xs">
                  Detected by comparing the two route polylines. We identify where the toll route diverges from the free route, then match those sections against our database of 20 toll roads across Melbourne, Sydney, and Brisbane.
                  For NSW, we use the <strong className="text-[var(--foreground)]">Transport for NSW Toll Calculator API</strong> for live pricing.
                </p>
              </div>

              <div>
                <p className="font-semibold text-[var(--foreground)] mb-1">Time cost (optional)</p>
                <div className="bg-[var(--background)] rounded-lg p-3 font-mono text-xs text-[var(--foreground)]">
                  time_cost = (duration_min / 60) &times; $/hr
                </div>
                <p className="mt-1.5 text-xs">
                  Only included if you set a time value. If you earn $50/hr, a 30-minute time saving is worth $25 — which might make the toll worth it even when the raw cost says otherwise.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Step 3 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">3</span>
            Toll detection
          </h2>
          <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] p-5 space-y-3 text-sm text-[var(--muted)] leading-relaxed">
            <p>We don&apos;t just check if a route goes near a toll road — that causes false positives. Instead:</p>
            <ol className="list-decimal list-inside space-y-2 ml-1">
              <li><strong className="text-[var(--foreground)]">Compare polylines</strong> — find points on the toll route that are &gt;300m from any point on the free route. These &quot;divergent points&quot; are where the driver is actually on a different road.</li>
              <li><strong className="text-[var(--foreground)]">Match to corridors</strong> — check if those divergent points fall within 1km of a toll road&apos;s gantry locations. Need at least 10% of divergent points near the road to count it.</li>
              <li><strong className="text-[var(--foreground)]">Look up price</strong> — for the matched toll road, find the correct segment and pricing tier.</li>
            </ol>
            <p>
              If less than 5% of the route diverges, we assume both routes are essentially the same — no toll road is involved.
            </p>
          </div>
        </section>

        {/* Step 4 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">4</span>
            Where toll prices come from
          </h2>
          <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] p-5 space-y-3 text-sm text-[var(--muted)] leading-relaxed">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[var(--foreground)] text-left border-b border-[var(--subtle-border)]">
                    <th className="py-2 pr-3 font-semibold">State</th>
                    <th className="py-2 pr-3 font-semibold">Source</th>
                    <th className="py-2 font-semibold">Roads</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--muted)]">
                  <tr className="border-b border-[var(--subtle-border)]/50">
                    <td className="py-2.5 pr-3 font-medium text-[var(--foreground)]">NSW</td>
                    <td className="py-2.5 pr-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--tier-cheap)]" />
                        TfNSW Toll Calculator API (live)
                      </span>
                    </td>
                    <td className="py-2.5">11 roads (Harbour Bridge, M2, M4, M5, M7, M8, NorthConnex, etc.)</td>
                  </tr>
                  <tr className="border-b border-[var(--subtle-border)]/50">
                    <td className="py-2.5 pr-3 font-medium text-[var(--foreground)]">VIC</td>
                    <td className="py-2.5 pr-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--tier-mid)]" />
                        Static data, verified quarterly
                      </span>
                    </td>
                    <td className="py-2.5">CityLink, EastLink</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-medium text-[var(--foreground)]">QLD</td>
                    <td className="py-2.5 pr-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--tier-mid)]" />
                        Static data, verified annually
                      </span>
                    </td>
                    <td className="py-2.5">Gateway, Clem7, Legacy Way, AirportlinkM7, Go Between Bridge, Logan, Toowoomba Bypass</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs">
              Fuel prices are pulled live from PetrolSaver&apos;s station data — the average price for your selected fuel type at stations within 15km of your starting point.
            </p>
          </div>
        </section>

        {/* Step 5 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">5</span>
            Default assumptions
          </h2>
          <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[var(--foreground)] text-left border-b border-[var(--subtle-border)]">
                    <th className="py-2 pr-3 font-semibold">Setting</th>
                    <th className="py-2 pr-3 font-semibold">Default</th>
                    <th className="py-2 font-semibold">Why</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--muted)]">
                  <tr className="border-b border-[var(--subtle-border)]/50">
                    <td className="py-2 pr-3 text-[var(--foreground)]">Vehicle</td>
                    <td className="py-2 pr-3 font-mono">Car (8.5 L/100km)</td>
                    <td className="py-2">Average Australian passenger car</td>
                  </tr>
                  <tr className="border-b border-[var(--subtle-border)]/50">
                    <td className="py-2 pr-3 text-[var(--foreground)]">Fuel price</td>
                    <td className="py-2 pr-3 font-mono">Live from PetrolSaver</td>
                    <td className="py-2">Average of nearby stations for your fuel type</td>
                  </tr>
                  <tr className="border-b border-[var(--subtle-border)]/50">
                    <td className="py-2 pr-3 text-[var(--foreground)]">Travel time</td>
                    <td className="py-2 pr-3 font-mono">Auto-detected</td>
                    <td className="py-2">Based on current day/time</td>
                  </tr>
                  <tr className="border-b border-[var(--subtle-border)]/50">
                    <td className="py-2 pr-3 text-[var(--foreground)]">Time value</td>
                    <td className="py-2 pr-3 font-mono">$0/hr (ignored)</td>
                    <td className="py-2">Opt-in — set it if time matters to you</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 text-[var(--foreground)]">Trip frequency</td>
                    <td className="py-2 pr-3 font-mono">One-off</td>
                    <td className="py-2">Set trips/week to see annual projections</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Limitations */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3">Limitations &amp; honest caveats</h2>
          <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] p-5 space-y-2 text-sm text-[var(--muted)] leading-relaxed">
            <ul className="list-disc list-inside space-y-2 ml-1">
              <li><strong className="text-[var(--foreground)]">Travel times don&apos;t include live traffic.</strong> We use the routing engine&apos;s estimate based on speed limits and road types. Real peak-hour times will be longer, especially on free suburban routes.</li>
              <li><strong className="text-[var(--foreground)]">Distance-based toll roads (M7, WestConnex)</strong> use the maximum cap price, not the exact per-km rate. If you only use part of the road, the actual toll may be lower.</li>
              <li><strong className="text-[var(--foreground)]">VIC and QLD toll prices are static.</strong> We update them when operators publish new rates (quarterly for CityLink, annually for most others). NSW prices are live.</li>
              <li><strong className="text-[var(--foreground)]">Fuel consumption is a constant.</strong> We don&apos;t adjust for highway vs city driving within the same route. The distance difference between routes is what drives the fuel cost difference.</li>
            </ul>
          </div>
        </section>

        {/* Attribution */}
        <div className="text-xs text-[var(--muted)] border-t border-[var(--subtle-border)] pt-6">
          <p>
            Routing powered by <a href="https://openrouteservice.org" className="text-[var(--accent-text)]" target="_blank" rel="noopener noreferrer">OpenRouteService</a>.
            NSW toll pricing via <a href="https://opendata.transport.nsw.gov.au" className="text-[var(--accent-text)]" target="_blank" rel="noopener noreferrer">Transport for NSW Open Data</a>.
            VIC toll pricing sourced from <a href="https://www.linkt.com.au" className="text-[var(--accent-text)]" target="_blank" rel="noopener noreferrer">Linkt</a> and <a href="https://www.eastlink.com.au" className="text-[var(--accent-text)]" target="_blank" rel="noopener noreferrer">EastLink</a>.
            QLD toll pricing sourced from <a href="https://www.linkt.com.au" className="text-[var(--accent-text)]" target="_blank" rel="noopener noreferrer">Linkt</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
