# PetrolSaver

Fuel price comparison app for Victoria, Australia.
Live at [petrolsaver.live](https://petrolsaver.live).

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4 (warm dark theme, #1a1a1a base)
- **Maps:** Leaflet + react-leaflet (CartoDB dark tiles)
- **State:** Zustand (fuel-store.ts)
- **Animations:** Framer Motion
- **Hosting:** Vercel (auto-deploy from GitHub)
- **Ads:** Google AdSense (ca-pub-4918791662575228, pending approval)

## Data Source

Victorian Government Fair Fuel Open Data API via Service Victoria.

- **Base URL:** `https://api.fuel.service.vic.gov.au/open-data/v1`
- **Auth:** `x-consumer-id` header (env var `FUEL_API_CONSUMER_ID`)
- **Rate limit:** 10 requests per 60 seconds
- **Data delay:** ~24 hours (not real-time)
- **Refresh:** In-memory cache with 1hr TTL + stale-while-revalidate
- **Terms:** Must attribute Service Victoria. Must not modify data. API key must stay server-side.
- **~1,600 stations** across Victoria

### API Response Structure

The `/fuel/prices` endpoint returns `fuelPriceDetails[]` with embedded station + prices (not separate endpoints). Key fields:
- `fuelStation.id` — base64-encoded hash (contains +, /, = characters)
- `fuelPrices[].price` — can be null (filter out)
- `fuelStation.openingHours` — can be object, not just string (use z.unknown() in Zod)
- Response is >2MB — too large for Next.js data cache

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

Percentile-based, relative to all stations in Victoria for the selected fuel type:
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
    prices/[suburb]/page.tsx    # Per-suburb prices (652 pages, ISR)
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
    fuel-api.ts                 # Server-only: fetch, merge, cache
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

## GitHub & Deployment

- **Repo:** github.com/bienstudio-byron/servo-saver
- **Auth:** GitHub CLI authenticated as `bienstudio-byron`
- **Git remote uses:** `https://bienstudio-byron@github.com/...`
- **Vercel:** Auto-deploys on push to `main`
- **Domain:** petrolsaver.live (Namecheap DNS → Vercel)
- **Env vars (Vercel):** `FUEL_API_CONSUMER_ID`, `NEXT_PUBLIC_ADSENSE_PUB_ID`

## Design Principles

- Mobile-first, full-screen map experience
- No navbar — logo watermark + strategy card only
- Warm dark palette (#1a1a1a, #242424, Google blue #4285f4)
- Answers first, details on demand (dropdowns)
- Transparent algorithm — /how-it-works page
- Brand logos stored locally in /public/logos/
- Attribution required: "Data sourced from Service Victoria"
