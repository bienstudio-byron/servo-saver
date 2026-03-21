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

## Roadmap (updated 2026-03-21)

### Completed (this sprint)

- [x] **Vehicle profiles** — 100+ AU cars database, custom entry, localStorage persistence. Affects all calculations.
- [x] **Manual location setting** — Location search in Settings modal + "Use GPS" fallback. Persists to localStorage.
- [x] **Station flagging (global)** — Supabase-backed. Flag reasons (wrong price, closed, wrong pin). Visible to ALL users: greyed out in list + red flag badge on map pins. 24hr auto-expiry. Rate limited.
- [x] **Fill by litres/dollars/gauge** — Three-mode input. All write to same engine. Fill intent propagates to station cards.
- [x] **Break-even verdicts** — Plain language: "No-brainer", "Worth the drive", "Borderline", "Not worth the drive". Shows break-even distance.
- [x] **ATO wear & tear mode** — 88¢/km toggle. Affects fuel + toll calculators. Persisted to localStorage.
- [x] **Detour tolerance** — 1/3/5km radius toggle for fuel trip mode + toll route fuel stops.
- [x] **Airbnb-style NavBar** — Expanding pill bar (trip/car/fill segments animate in-place). Shared across Fuel + Tolls modes.
- [x] **Floating panel layout** — Replaced sidebar with floating card (desktop: bottom-left, mobile: bottom sheet). One component for both breakpoints.
- [x] **TollSaver redesign** — Search moved to NavBar. Results as floating card with collapsible route cards, best fuel stops per route with "Go" directions, time value nudge, toll breakdown.
- [x] **Cheapest fuel on route** — Top 3 stations per route (toll + free), filtered by fuel range, with map pins + brand logos.
- [x] **Feedback system** — Feedback modal via Resend email. Combined /legal page (terms + privacy).
- [x] **Settings persistence** — Time value, brands, cost model, location all persist to localStorage across sessions.
- [x] **Bad data filtering** — Prices <50c/L or >500c/L filtered from recommendations + map. Community price reports rejected if >20% different from official.
- [x] **Tasmania + Western Australia** — TAS via NSW FuelCheck API (split by latitude). WA via FuelWatch RSS (no auth, XML parsing).
- [x] **Code refactor** — Shared types (`RankedOption`), shared utils (`station-utils.ts`), `SidebarShell`, `SidebarFooter`. Removed duplication.
- [x] **Personality overhaul** — "Top pick", "Worth it", "No-brainer" copy. Tier-colored station borders. Ranking pills. Desktop tooltips.
- [x] **Security hardening** — HTML escaping in flag/feedback APIs. Rate limiting. Input validation.

### Stage 1: Accuracy + routing (next priority)

1. **Actual road distance for trip mode** — Replace `straight_line × 1.35` with real ORS/OSRM routing for station detour calculations. Show actual routes on map. Multiple users flagged straight lines as misleading. Biggest remaining trust issue.

2. **Detour time + $/minute** — Needs real routing (#1) for accurate time. Show savings-per-minute so users can judge detour value.

3. **QLD fuel data** — Registration submitted at fuelpricesqld.com.au. Awaiting API tokens. Provider ready to build (same pattern as VIC/NSW/TAS/WA).

4. **Toll time estimates disclaimer** — ORS uses static speed limits, not real-time traffic. Peak hour toll roads are much faster IRL. Need clearer messaging or traffic-aware routing (Google Maps API, paid).

### Stage 2: Features

5. **Multi fuel type comparison** — Show P95 AND P98 side by side per station. Highlight when premium is cheaper.

6. **Intermediate destinations** — Multi-stop planner for Fuel + Tolls. Waypoints along route. Killer for road trips.

7. **Price prediction / cycle timing** — Historical prices in Supabase. Weekly cycle detection. "Wait" vs "fill now" recommendations.

8. **Skip forced onboarding** — Default to "Average car" silently. Let users change via Car segment in NavBar. Reduces friction for new users.

### Stage 3: Personalisation

9. **Loyalty / voucher discounts** — Per-brand cents-off. v2: integrate Coles/Flybuys, Shell Go+, 7-Eleven Fuel Lock APIs.

10. **Busy station wait time** — Google Places popular times or crowd-sourced. "Likely busy" warning on cheap stations.

### Known issues

- Trip mode shows straight lines on map instead of actual routes — needs ORS routing integration (ties to #1)
- Trip mode uses straight-line × 1.35 for distance — inaccurate near geographic features (ties to #1)
- ORS free tier limit (2,000 req/day) — monitor usage, may need upgrade if TollSaver + real routing both use ORS
