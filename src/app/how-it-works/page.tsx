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
                    the fuel you&apos;d burn on the detour using your vehicle&apos;s consumption rate.
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
              <div><span className="text-amber-400">fuel_cost</span> = (detour_km ÷ 100) × your_consumption × station_price</div>
              <div className="text-[var(--muted)] mt-3">// How many litres you&apos;re filling (set via gauge, litres, or $)</div>
              <div><span className="text-[#4285f4]">litres_filling</span> = your_fill_amount</div>
              <div className="text-[var(--muted)] mt-3">// Raw savings vs nearest station</div>
              <div><span className="text-emerald-400">price_savings</span> = (nearest_price - station_price) × litres_filling</div>
              <div className="text-[var(--muted)] mt-3">// What you actually save</div>
              <div><span className="text-emerald-400 font-bold">net_savings</span> = price_savings - fuel_cost</div>
            </div>

            <p>
              We then rank stations by <strong className="text-[var(--foreground)]">net savings</strong> — the amount you actually
              save after accounting for the fuel cost of getting there.
            </p>

            <div className="text-[var(--muted)] mt-3">
              <div className="text-[var(--foreground)] font-semibold mb-1.5">Break-even distance</div>
              <p className="text-xs leading-relaxed mb-2">
                For every recommendation with a detour, we show you the <strong className="text-[var(--foreground)]">break-even distance</strong> —
                the maximum detour where the cheaper price still saves you money. If the station is within this distance, the detour pays off. If not, you&apos;re better off filling up closer.
              </p>
            </div>

            <div className="rounded-lg bg-[var(--background)] p-4 font-mono text-xs space-y-2">
              <div className="text-[var(--muted)]">// Maximum worthwhile detour distance</div>
              <div><span className="text-emerald-400">break_even_km</span> = (price_diff_per_litre × litres_filling) ÷ fuel_cost_per_km</div>
              <div className="text-[var(--muted)] mt-3">// Example: 20c cheaper, filling 40L, car uses 8.5L/100km at $2/L</div>
              <div><span className="text-emerald-400">break_even</span> = ($0.20 × 40) ÷ ($0.17/km) = <span className="text-[var(--foreground)]">47km</span></div>
              <div className="text-[var(--muted)] mt-3">// At ATO rates (88c/km) the picture changes dramatically</div>
              <div><span className="text-amber-400">break_even</span> = ($0.20 × 40) ÷ ($0.88/km) = <span className="text-[var(--foreground)]">9.1km</span></div>
            </div>

            <p className="text-[var(--muted)] text-xs mt-3">
              This is why a 20c saving doesn&apos;t always justify driving across town. The break-even
              metric helps you decide at a glance whether a detour is truly worth it for your situation.
            </p>

            <div className="text-[var(--muted)] mt-4">
              <div className="text-[var(--foreground)] font-semibold mb-1.5">What you see on each station card</div>
              <p className="text-xs leading-relaxed mb-3">
                When you expand a station, you see a full breakdown table. Here&apos;s what each row means:
              </p>
            </div>

            <div className="rounded-lg border border-[var(--subtle-border)] overflow-hidden text-xs">
              <div className="flex justify-between px-3 py-2 bg-[var(--background)]">
                <span className="text-[var(--foreground)] font-semibold">Row</span>
                <span className="text-[var(--foreground)] font-semibold">What it means</span>
              </div>
              <div className="flex justify-between px-3 py-2 border-t border-[var(--subtle-border)]">
                <span className="text-[var(--muted)]">Detour</span>
                <span className="text-[var(--muted)] text-right max-w-[60%]">Extra km vs the closest station, estimated at 1.35× straight-line</span>
              </div>
              <div className="flex justify-between px-3 py-2 border-t border-[var(--subtle-border)]">
                <span className="text-[var(--muted)]">Fuel for detour</span>
                <span className="text-[var(--muted)] text-right max-w-[60%]">Fuel burned on the extra drive, using your car&apos;s consumption</span>
              </div>
              <div className="flex justify-between px-3 py-2 border-t border-[var(--subtle-border)]">
                <span className="text-[var(--muted)]">Time cost</span>
                <span className="text-[var(--muted)] text-right max-w-[60%]">Optional — your hourly rate × detour time. Set via the More filter.</span>
              </div>
              <div className="flex justify-between px-3 py-2 border-t border-[var(--subtle-border)]">
                <span className="text-[var(--muted)]">Price savings</span>
                <span className="text-[var(--muted)] text-right max-w-[60%]">Cheaper price × litres you&apos;re filling. The raw saving before costs.</span>
              </div>
              <div className="flex justify-between px-3 py-2 border-t border-[var(--subtle-border)] bg-[var(--subtle)]/30">
                <span className="text-[var(--foreground)] font-medium">Net saving</span>
                <span className="text-[var(--muted)] text-right max-w-[60%]">Price savings minus all costs. Positive = you save. Negative = detour costs more.</span>
              </div>
              <div className="flex justify-between px-3 py-2 border-t border-[var(--subtle-border)]">
                <span className="text-[var(--muted)]">Verdict</span>
                <span className="text-[var(--muted)] text-right max-w-[60%]">&ldquo;No-brainer&rdquo;, &ldquo;Worth the drive&rdquo;, &ldquo;Borderline&rdquo;, or &ldquo;Not worth the drive&rdquo; — plain language with break-even distance.</span>
              </div>
              <div className="flex justify-between px-3 py-2 border-t border-[var(--subtle-border)]">
                <span className="text-[var(--muted)]">Estimated cost</span>
                <span className="text-[var(--muted)] text-right max-w-[60%]">Total cost to fill at this station&apos;s price, based on your fill setting (gauge, litres, or $).</span>
              </div>
            </div>

            <p className="text-[var(--muted)] text-xs mt-3">
              On desktop, hover the <strong className="text-[var(--foreground)]">ⓘ</strong> icon next to any row for a quick explanation.
            </p>
          </div>
        </section>

        {/* Cost Models */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">4</span>
            Detour cost: fuel only vs full cost
          </h2>
          <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] p-5 space-y-4 text-sm text-[var(--muted)] leading-relaxed">
            <p>
              When we calculate how much a detour costs, you can choose between two models
              via the <strong className="text-[var(--foreground)]">More</strong> filter chip:
            </p>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#4285f4]/10 flex items-center justify-center shrink-0">
                  <span className="text-[#4285f4] text-sm font-bold">⛽</span>
                </div>
                <div>
                  <div className="text-[var(--foreground)] font-semibold mb-0.5">Fuel only (default)</div>
                  <p className="text-[var(--muted)] text-xs">
                    Only counts the petrol burned on the detour. Cheapest interpretation — a 5km
                    detour at $2/L costs about $0.85. Best if you only care about out-of-pocket fuel cost.
                  </p>
                  <div className="rounded-lg bg-[var(--background)] p-2 font-mono text-[10px] mt-1.5">
                    cost = (detour_km ÷ 100) × your_consumption × fuel_price
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <span className="text-amber-400 text-sm font-bold">$</span>
                </div>
                <div>
                  <div className="text-[var(--foreground)] font-semibold mb-0.5">Full cost (ATO 88¢/km)</div>
                  <p className="text-[var(--muted)] text-xs">
                    Uses the Australian Tax Office&apos;s cents-per-kilometre rate, which covers fuel <em>plus</em> tyres,
                    servicing, insurance, registration, and depreciation. The same 5km detour now costs $4.40.
                    This dramatically changes whether a detour is worth it.
                  </p>
                  <div className="rounded-lg bg-[var(--background)] p-2 font-mono text-[10px] mt-1.5">
                    cost = detour_km × $0.88
                  </div>
                  <p className="text-[var(--muted)] text-[10px] mt-1.5">
                    Rate: 88c/km for 2025-26.{" "}
                    <a href="https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/income-and-deductions-for-business/deductions/deductions-for-motor-vehicle-expenses/cents-per-kilometre-method" className="text-[var(--accent-text)] hover:text-[var(--foreground)]" target="_blank" rel="noopener noreferrer">ATO source</a>
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
              <p className="text-xs text-[var(--foreground)]">
                <strong>Why it matters:</strong> A 20c/L price saving on a 40L fill is $8.
                At fuel-only rates, that saving justifies a 47km detour.
                At ATO rates, it only justifies 9km. Most people underestimate
                the true cost of driving — the ATO mode gives you the honest picture.
              </p>
            </div>
          </div>
        </section>

        {/* The Rankings */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">5</span>
            What the labels mean
          </h2>
          <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] p-5 space-y-4 text-sm text-[var(--muted)] leading-relaxed">
            <div className="flex gap-3">
              <span className="text-[var(--tier-cheap)] font-bold text-xs bg-[var(--tier-cheap)]/15 px-2 py-1 rounded shrink-0 h-fit uppercase">Top pick</span>
              <p className="text-[var(--muted)] text-xs">Best value after factoring in the drive. The top-ranked station — best balance of price, distance, and your fill amount.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-[var(--tier-cheap)] font-bold text-xs bg-[var(--tier-cheap)]/15 px-2 py-1 rounded shrink-0 h-fit uppercase">Worth it</span>
              <p className="text-[var(--muted)] text-xs">Solid saving — the detour pays off. Cheaper than the closest station with positive net savings after detour.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-[var(--muted)] font-bold text-xs bg-[var(--muted)]/15 px-2 py-1 rounded shrink-0 h-fit uppercase">Closest</span>
              <p className="text-[var(--muted)] text-xs">Nearest servo to you. Shown for convenience — useful when you&apos;re running on fumes or short on time.</p>
            </div>
            <p className="text-xs">
              Label colours match the station&apos;s price tier — <span className="text-[var(--tier-cheap)]">green</span> for cheap,
              <span className="text-[var(--tier-mid)]"> amber</span> for mid-range,
              <span className="text-[var(--tier-exp)]"> red</span> for expensive.
              Stations are ranked by true cost (price + detour), not just raw price.
            </p>
          </div>
        </section>

        {/* Traffic Light System */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">6</span>
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
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">7</span>
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
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">8</span>
            Assumptions we make
          </h2>
          <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] p-5 text-sm text-[var(--muted)] leading-relaxed">
            <div className="space-y-2">
              <div className="flex justify-between py-1.5 border-b border-[var(--subtle-border)]">
                <span className="text-[var(--muted)]">Tank size</span>
                <span className="text-[var(--foreground)] font-mono">From your vehicle profile</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--subtle-border)]">
                <span className="text-[var(--muted)]">Fuel consumption</span>
                <span className="text-[var(--foreground)] font-mono">From your vehicle profile</span>
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
                <span className="text-[var(--muted)]">Detour cost model</span>
                <span className="text-[var(--foreground)] font-mono">Fuel only or ATO 88¢/km</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--muted)]">Fill amount</span>
                <span className="text-[var(--foreground)] font-mono">Set via gauge, litres, or $</span>
              </div>
            </div>
            <p className="text-[var(--muted)] text-xs mt-4">
              Tank size and fuel consumption come from your vehicle profile (set via the Car chip).
              If you haven&apos;t set your vehicle, we default to a Toyota Corolla Hatch (50L tank, 6.8L/100km).
              Road distance is estimated at 1.35× straight-line distance — actual routes may differ.
            </p>
          </div>
        </section>

        {/* Price Trends */}
        <section className="mb-10" id="price-trends">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">9</span>
            Price trends — &ldquo;Fill now&rdquo; vs &ldquo;Wait&rdquo;
          </h2>
          <div className="rounded-xl border border-[var(--subtle-border)] bg-[var(--card)] p-5 space-y-4 text-sm text-[var(--muted)] leading-relaxed">
            <p>
              At the top of your station list, you&apos;ll sometimes see a banner telling you whether to
              <strong className="text-[var(--foreground)]"> fill now</strong> or
              <strong className="text-[var(--foreground)]"> wait</strong>. Here&apos;s how we work that out.
            </p>

            <div className="text-[var(--foreground)] font-semibold">What we measure</div>
            <p className="text-xs">
              Every day, we snapshot the price at every station in our database. We then compute the
              daily average across all stations for your selected fuel type. With 7+ days of data,
              we can detect whether prices are trending up, down, or sideways.
            </p>

            <div className="space-y-3 mt-3">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <span className="text-red-400 text-sm font-bold">&uarr;</span>
                </div>
                <div>
                  <div className="text-[var(--foreground)] font-semibold mb-0.5">Fill now (prices rising)</div>
                  <p className="text-[var(--muted)] text-xs">
                    The last 3 days show an upward trend of more than 1c/L. Today&apos;s average is higher than
                    yesterday&apos;s. Prices are likely to keep climbing — fill up sooner to avoid paying more.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <span className="text-emerald-400 text-sm font-bold">&darr;</span>
                </div>
                <div>
                  <div className="text-[var(--foreground)] font-semibold mb-0.5">Wait (prices falling)</div>
                  <p className="text-[var(--muted)] text-xs">
                    The last 3 days show a downward trend of more than 1c/L. If you can wait a day or two,
                    you&apos;ll likely pay less. Australian fuel prices often follow weekly cycles — they spike
                    early in the week and bottom out mid-week.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-[var(--subtle)] flex items-center justify-center shrink-0">
                  <span className="text-[var(--muted)] text-sm font-bold">&minus;</span>
                </div>
                <div>
                  <div className="text-[var(--foreground)] font-semibold mb-0.5">No rush (stable)</div>
                  <p className="text-[var(--muted)] text-xs">
                    Prices are within 1c of the weekly average. No strong trend either way — fill when convenient.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-[var(--background)] p-4 font-mono text-xs space-y-2">
              <div className="text-[var(--muted)]">// How we detect the trend</div>
              <div><span className="text-[#4285f4]">daily_avg</span> = average price across all stations for fuel type</div>
              <div><span className="text-[#4285f4]">direction</span> = compare last 3 days (rising if +1c, falling if -1c)</div>
              <div><span className="text-[#4285f4]">vs_yesterday</span> = today&apos;s avg - yesterday&apos;s avg</div>
              <div><span className="text-[#4285f4]">vs_week_avg</span> = today&apos;s avg - 7-day average</div>
              <div className="text-[var(--muted)] mt-2">// Urgency</div>
              <div>if rising OR today &lt; week_avg - 3c → <span className="text-red-400 font-bold">fill now</span></div>
              <div>if falling OR today &gt; week_avg + 3c → <span className="text-emerald-400 font-bold">wait</span></div>
              <div>else → <span className="text-[var(--muted)]">no rush</span></div>
            </div>

            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
              <p className="text-xs text-[var(--foreground)]">
                <strong>Important:</strong> This is based on historical averages, not a crystal ball.
                External events (oil price changes, public holidays, supply disruptions) can override
                normal patterns. Use it as a guide, not a guarantee.
              </p>
            </div>

            <p className="text-xs">
              Tap the trend banner to expand it and see the daily breakdown — today&apos;s price,
              yesterday&apos;s, the 7-day average, and a sparkline showing the trend visually.
            </p>
          </div>
        </section>

        {/* No Affiliation */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-[#4285f4]/15 flex items-center justify-center text-sm">10</span>
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
