# PetrolSaver

Fuel price comparison app for Victoria and New South Wales, Australia.
Live at [petrolsaver.live](https://petrolsaver.live).

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4 (warm dark theme, #1a1a1a base)
- **Maps:** Leaflet + react-leaflet (CartoDB dark tiles)
- **State:** Zustand (fuel-store.ts)
- **Animations:** Framer Motion
- **Hosting:** Vercel (auto-deploy from GitHub)
- **Ads:** Google AdSense (ca-pub-4918791662575228, pending approval)

## Data Sources

### Victoria (Service Victoria)

- **Base URL:** `https://api.fuel.service.vic.gov.au/open-data/v1`
- **Auth:** `x-consumer-id` header (env var `FUEL_API_CONSUMER_ID`)
- **Rate limit:** 10 requests per 60 seconds
- **Data delay:** ~24 hours (not real-time)
- **Refresh:** In-memory cache with 1hr TTL + stale-while-revalidate
- **Terms:** Must attribute Service Victoria. Must not modify data. API key must stay server-side.
- **~1,600 stations** across Victoria
- **Station IDs:** Prefixed with `vic:` for global uniqueness

#### API Response Structure

The `/fuel/prices` endpoint returns `fuelPriceDetails[]` with embedded station + prices (not separate endpoints). Key fields:
- `fuelStation.id` — base64-encoded hash (contains +, /, = characters)
- `fuelPrices[].price` — can be null (filter out)
- `fuelStation.openingHours` — can be object, not just string (use z.unknown() in Zod)
- Response is >2MB — too large for Next.js data cache

### New South Wales (Transport for NSW)

- **Base URL:** `https://api.onegov.nsw.gov.au/FuelCheckApp/v1/fuel`
- **Auth:** None required (public API, only needs `requesttimestamp` header)
- **Data delay:** Real-time
- **Refresh:** In-memory cache with 30min TTL + stale-while-revalidate
- **Terms:** CC-BY-SA. Must attribute Transport for NSW.
- **~2,400 stations** across NSW (3,200+ total including EV-only stations which are filtered out)
- **Station IDs:** Prefixed with `nsw:` for global uniqueness
- **Feature flag:** `ENABLE_NSW` env var (set to `"true"` to enable)
- **Date format:** `DD/MM/YYYY HH:MM:SS` (parsed in nsw-provider.ts)

### Provider Architecture

Data fetching is abstracted via `src/lib/providers/`:
- `types.ts` — `FuelDataProvider` interface
- `vic-provider.ts` — VIC-specific fetch/cache/merge logic
- `nsw-provider.ts` — NSW-specific OAuth, fetch, fuel type mapping, cache
- `fuel-api.ts` — Orchestrator: calls enabled providers via `Promise.allSettled()`

## Recommendation Engine

Located in `src/components/map/FillStrategy.tsx`.

### Algorithm

For each station within the user's safe range (70% of reported remaining fuel):

1. **Detour calculation:**
   - Nearby mode: `(distance_to_station - distance_to_nearest) × 2` (round trip)
   - Trip mode: `(you → station → dest) - (you → nearest → dest)`
   - Road distance = straight-line × 1.35

2. **Litres to fill:** Range slider (10–800km) maps to tank percentage. `tank_percent = range_km / 800`. `litres_filling = 55 × (1 - tank_percent)`. At 200km range (quarter tank), filling ~41L. At 600km (three quarter), filling ~14L.

3. **Net savings:** `(nearest_price - station_price) × litres_filling - fuel_cost_of_detour`

4. **Ranking:** Best Value (highest net savings) → Cheapest (lowest raw price) → Closest (nearest) → Avoid (most expensive, shown as contrast)

### Assumptions

| Parameter | Value |
|---|---|
| Tank size | 55 litres |
| Full tank range | 800 km (slider max) |
| Fuel consumption | 8.5 L/100km |
| Road factor | 1.35× straight line |
| City speed | 35 km/h |
| Safe detour | 70% of remaining range |
| Max search radius | 15 km |
| Min meaningful savings | $1 |
| Bad data filter | Prices > 500c/L excluded |
| Stale data filter | Prices > 48hrs old excluded |
| Default range | 200 km (quarter tank) |

### Traffic Light System

Percentile-based, relative to all visible stations for the selected fuel type:
- **Green (cheap):** Top 10% (`price <= p10`)
- **Amber (mid):** Top 10–50% (`price <= p50`)
- **Red (expensive):** Bottom 50% (`price > p50`)

Thresholds computed in `src/lib/price-utils.ts`, provided via React context (`src/stores/price-context.tsx`).

## Key Files

```
src/
  app/
    page.tsx                    # Home — map + strategy card + onboarding
    how-it-works/page.tsx       # Transparency/algorithm explanation
    prices/page.tsx             # Suburb index (SEO)
    prices/[suburb]/page.tsx    # Per-suburb prices — VIC (652 pages, ISR)
    prices/nsw/[suburb]/page.tsx # Per-suburb prices — NSW (ISR)
    api/fuel/stations/route.ts  # Merged station+price+brand data
    api/fuel/brands/route.ts    # Brand list
    api/fuel/types/route.ts     # Fuel type list
  components/
    map/
      MapInner.tsx              # Leaflet map with pill markers
      FillStrategy.tsx          # Recommendation engine + ranked options UI
      FuelMap.tsx               # Dynamic import wrapper (ssr: false)
      LocationButton.tsx        # "Near me" geolocation button
    shared/
      StationModal.tsx          # Station detail modal (from pin clicks)
      FuelPickerOverlay.tsx     # Onboarding: fuel gauge + fuel type + mode
      BrandLogo.tsx             # Brand logo with fallback initial
      PriceBadge.tsx            # Colour-coded price badge
      AdSlot.tsx                # Google AdSense slot with placeholder
  lib/
    fuel-api.ts                 # Orchestrator: calls VIC + NSW providers
    providers/
      types.ts                  # FuelDataProvider interface
      vic-provider.ts           # VIC data provider
      nsw-provider.ts           # NSW data provider (OAuth, fuel type mapping)
    price-utils.ts              # Percentile thresholds, tier classification
    brand-logos.ts              # Brand → local logo path mapping
    suburbs.ts                  # Extract suburb from address, slug helpers
    geo.ts                      # Haversine distance
    constants.ts                # Map defaults, fuel type labels
    validation.ts               # Zod schemas for API responses
  stores/
    fuel-store.ts               # Zustand: fuel type, location, trip mode, range
    price-context.tsx           # React context for price thresholds
  types/fuel.ts                 # TypeScript interfaces
```

## TollSaver

Toll vs free route comparison, integrated as a "Tolls" tab alongside Fuel. Lives at petrolsaver.live (same app).

### Core Concept

For any trip, we calculate two routes (toll allowed vs toll-free) and show the true cost of each: fuel + tolls + time. The user sees which route actually saves money, with full transparency on the math.

### Routing

- **OpenRouteService** for routing — two requests per comparison (default + `avoid_features=tollways`)
- All routing goes through `/api/toll` server-side proxy (API key in `ORS_API_KEY` env var)
- Geocoding also via ORS through the same proxy
- Snap radius: 2000m (handles airports, parks)

### Toll Detection (first-principles approach)

NOT gantry proximity. Instead:
1. Compare both route polylines — find "toll-only" points (>300m from free route)
2. If <5% of route diverges → no tolls (routes are basically the same)
3. Match toll-only points against toll road gantry corridors (1km radius, need ≥10% match)
4. For trip-cap roads (CityLink): pick best matching entry-exit segment, capped at max

This eliminates false positives from routes that pass near but don't use toll roads.

### Toll Data

| State | Source | Roads |
|---|---|---|
| NSW | TfNSW Toll Calculator API (live, `TFNSW_TOLL_API_KEY` env var) | 11 (Harbour Bridge, M2, M4, M5, M7, M8, NorthConnex, etc.) |
| VIC | Static JSON, verified quarterly | CityLink (entry-exit matrix + $12.38 trip cap), EastLink |
| QLD | Static JSON, verified annually | Gateway, Clem7, Legacy Way, AirportlinkM7, Go Between, Logan, Toowoomba |

Static data in `src/data/tolls/{melbourne,sydney,brisbane}/`. CityLink pricing from Linkt quarterly PDF.

### Cost Formula

```
true_cost = fuel_cost + toll_fees + time_cost
fuel_cost = (distance_km / 100) × consumption × price_per_litre
time_cost = (duration_min / 60) × $/hr  (optional, default $0)
```

**No consumption multipliers.** Same formula for both routes. The distance difference IS the cost difference. Previous 0.9x/1.2x highway/suburban multipliers were removed — they were applied to entire routes when only a small section diverges, creating false cost advantages.

### Fuel Price

Auto-populated from PetrolSaver's live station data — average price for selected fuel type at stations within 15km of origin. Updates when user changes fuel type or origin location.

### UI Architecture

- `ModeTabBar` — Fuel | Tolls tab switcher in page.tsx
- Two-step sidebar: Step 1 = search (destination + GPS origin), Step 2 = results with editable settings chips
- Settings chips (vehicle, time period, fuel type + price, frequency, time value) appear in results — tap to change and recalculate
- Map: toll route = red, free route = blue, recommended = solid + glow, alternative = dashed
- Toll price tags placed on the divergent section of the toll route polyline
- User location pulsing blue dot (same as fuel map)
- Quota exceeded banner when ORS daily limit hit (2,000 req/day free tier)
- `/how-it-works/tolls` — full algorithm transparency page

### Key Files

```
src/
  components/tolls/
    TollMode.tsx              # Layout: sidebar + map + mobile sheet
    TollSidebar.tsx           # Desktop: search + settings + results
    TollMobileSheet.tsx       # Mobile: bottom sheet version
    TollMapView.tsx           # Leaflet map with dual routes + price tags
  components/shared/
    ModeTabBar.tsx            # Fuel | Tolls tab switcher
  app/
    api/toll/route.ts         # Server-side proxy: ORS routing/geocoding + TfNSW tolls
    api/geocode/route.ts      # Nominatim proxy with 1hr cache + rate limiting
    how-it-works/tolls/page.tsx # Algorithm transparency
  lib/
    openroute.ts              # Client: calls /api/toll for routing + geocoding
    tfnsw-toll.ts             # Client: calls /api/toll for NSW toll calculation
    toll-calculator.ts        # Core cost math (fuel + tolls + time)
    toll-detector.ts          # Polyline comparison + toll road matching
  stores/
    toll-store.ts             # Zustand: search state, routes, comparison, settings
  data/tolls/
    melbourne/                # CityLink, EastLink JSON
    sydney/                   # 11 toll road JSON files
    brisbane/                 # 7 toll road JSON files
  types/toll.ts               # TypeScript interfaces
```

### Env Vars (Vercel)

- `ORS_API_KEY` — OpenRouteService routing + geocoding
- `TFNSW_TOLL_API_KEY` — Transport for NSW toll calculator

## GitHub & Deployment

- **Repo:** github.com/bienstudio-byron/servo-saver
- **Auth:** GitHub CLI authenticated as `bienstudio-byron`
- **Git remote uses:** `https://bienstudio-byron@github.com/...`
- **Vercel:** Auto-deploys on push to `main`
- **Domain:** petrolsaver.live (Namecheap DNS → Vercel)
- **Env vars (Vercel):** `FUEL_API_CONSUMER_ID`, `NEXT_PUBLIC_ADSENSE_PUB_ID`, `ENABLE_NSW`, `ORS_API_KEY`, `TFNSW_TOLL_API_KEY`

## Design Principles

- Mobile-first, full-screen map experience
- No navbar — logo watermark + strategy card only
- Warm dark palette (#1a1a1a, #242424, Google blue #4285f4)
- Answers first, details on demand (dropdowns)
- Transparent algorithm — /how-it-works page
- Brand logos stored locally in /public/logos/
- Attribution required: "Data sourced from Service Victoria and Transport for NSW"
- TollSaver: show the working, not just the answer — every cost line has an icon + formula
- Toll route = red (danger/cost), free route = blue (safe) on map
- No fake multipliers — same fuel formula for both routes, distance difference IS the cost difference
- All API keys server-side via `/api/toll` and `/api/geocode` proxies

## Roadmap (from user feedback, updated 2026-03-20)

### Recently completed

- [x] **Vehicle profiles** — Zustand store (`vehicle-store.ts`) with localStorage persistence. 100+ AU cars in `vehicles.ts` database (Small, Medium, SUV, Ute, Van, Large, Performance, Hybrid categories). Full-screen setup modal (`VehicleSetup.tsx`) with search + custom entry. Integrated into FillStrategy (replaces hardcoded 55L/8.5L), ModeToggle (vehicle chip), TollSidebar + TollMobileSheet (fuel cost calc uses profile consumption). Auto-sets fuel type on vehicle selection. Skip defaults to average car. First-run onboarding forces setup before app use.
- [x] **Manual location setting** — Location chip in filter row with geocoding search dropdown. Persists to localStorage. Skips GPS auto-detect when manual location is saved. "Use my GPS" button to clear override. Works for both Fuel and Tolls. Fixes VPN users getting wrong location.
- [x] **Station reporting / flagging** — Flag button with reason picker (wrong price, closed down, temp closed, wrong pin) as 2×2 icon grid in both FillStrategy cards and StationModal. Sends reason to /api/flag email. Unflag with undo in StationModal. Price ranking + 30-day price history sparkline surfaced inline in station cards (no longer hidden behind Details button).
- [x] **Fuel level by litres + dollars + gauge** — Three-mode fill input (Gauge/Litres/$) via segmented toggle in tank chip dropdown. Litres mode: number input + quick-picks (10/20/30/40/Full). Dollar mode: budget input + quick-picks ($20/$40/$50/$80/Full), back-calculates litres from avg local price. All modes write to same rangeKm engine input. Fill intent label propagates to station cards ("Fill ~27L ($50 worth)" vs "Fill ~27L to full"). Slider text removed from inside gauge bar for readability.
- [x] **Break-even distance metric** — Shows max worthwhile detour distance in station card breakdown table. Formula: `(price_diff_per_litre × litres_filling) / fuel_cost_per_km`. Plain-language verdicts: "Easy win", "Worth the detour", "Marginal", "Detour eats the saving". Also added to /how-it-works page with worked examples. Desktop hover tooltips on all breakdown rows.
- [x] **ATO wear & tear mode** — "Fuel only" vs "Full cost (ATO 88¢/km)" toggle in More filter chip. Persisted to localStorage. Affects: FillStrategy detour cost + break-even + verdicts, TollSaver route cost comparison (toll-calculator.ts), TollSidebar display labels. Both how-it-works pages updated with dual formula explanations. When ATO mode is on, More chip shows "ATO" badge. ATO rate covers fuel + tyres + servicing + insurance + depreciation — dramatically shrinks break-even distances (47km → 9km for same scenario).

### Stage 1: Fix trust-breaking issues

1. **Actual road distance + route display for trip mode** — Replace `straight_line × 1.35` with real road distance from ORS/OSRM routing for station detour calculations. Show actual road routes on map instead of crow-flies straight lines between origin→station→destination. Current straight lines are confusing and misleading — users can't tell if the detour is highway-convenient or requires 15min of back-roads. Fixes inaccuracies near lakes, rivers, bridges. Multiple users have flagged this.

2. **Detour time + $/minute savings** — Show estimated detour time cost alongside dollar savings. Display savings-per-minute so users can judge if a detour is worth their time. e.g., "Save $3.71, +12 min detour ($0.31/min)". Relates to #1 (needs real routing for accurate time estimates).

### Stage 2: Better UX + expansion

5. **Multi fuel type comparison** — Show P95 AND P98 prices side by side per station. Highlight when premium is cheaper than regular (happens at independents). Change FillStrategy to accept `string[]` for fuel types.

6. **TollSaver: $/hr total cost metric** — Show total trip cost divided by time as an explicit $/hr metric. Helps users compare routes on a cost-efficiency basis beyond just toll vs free.

7. **QLD fuel data** — Add Queensland as third provider. QLD OESR fuel API or equivalent. Same provider pattern as VIC/NSW. Brisbane TollSaver already has toll data — need fuel prices to match.

### Stage 3: Multi-stop + prediction

8. **Intermediate destinations (Fuel + Tolls)** — Multi-stop planner for both modes. For Fuel: given current fuel level + route with waypoints, find optimal refuel stops considering price + remaining range. For Tolls: recalculate toll vs free for multi-leg journey. Shared waypoint infrastructure. Multiple users requested this. Killer feature for road trips.

9. **Price prediction / cycle timing** — Track historical prices in Supabase. Detect weekly fuel price cycles (VIC/NSW follow predictable patterns). Show "prices likely dropping tomorrow — wait" or "fill now, spike coming." Needs: daily price snapshot cron, cycle detection algorithm, confidence thresholds. A user confirmed they've been 20-50c under average for years using a Python script for this — validates the concept.

### Stage 4: Personalisation

10. **Loyalty / voucher discounts** — "My discounts" settings. Simple v1: per-brand cents-off (e.g., "I get 4c off at Coles"). Complex v2: integrate Coles/Flybuys, Shell Go+, 7-Eleven Fuel Lock APIs. Apply discounts to recommendation engine — a Coles station at 195c becomes 191c for a Flybuys user.

11. **Busy station wait time estimate** — Factor in estimated busyness/wait times at popular cheap stations. If there's a 20min queue, the savings may not be worth it. Could use Google Places popular times data or crowd-sourced reports. Display as "likely busy" warning on recommendations. A user pointed out that 20+ mins queued on a main road makes cheap fuel not worth it unless you have time to kill.

### Known issues to fix

- Closed stations showing stale prices — need better staleness filtering or user flagging
- Trip mode shows straight lines on map instead of actual routes — confusing and misleading (ties to #1)
- Trip mode uses straight-line × 1.35 for distance — inaccurate near geographic features (ties to #1)
- ORS free tier limit (2,000 req/day) — may need upgrade or OSRM self-hosting if TollSaver usage grows, especially with real routing for fuel trip mode (#1)
