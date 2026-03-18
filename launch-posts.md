# PetrolSaver Launch Posts

## Posting Schedule

| Platform | Subreddit/Site | When | Why |
|---|---|---|---|
| Reddit | r/australia | Day 1, 10-11am AEDT (Tue-Thu) | Biggest AU audience, fuel is a universal gripe |
| Reddit | r/melbourne | Day 1, 12pm AEDT | Core VIC audience, post after r/australia is live |
| Reddit | r/sydney | Day 2, 10am AEDT | NSW coverage, don't flood Day 1 |
| Reddit | r/AusFinance | Day 3, 10am AEDT | Money-saving crowd, more analytical |
| Reddit | r/SideProject | Day 3, anytime | Dev/builder community, good for feedback |
| OzBargain | Deal post | Day 4-5 | Let Reddit momentum build first |

**Rules:**
- Reply to every comment, especially negative ones
- Don't cross-post — write each one fresh
- If one blows up, hold off on the others and ride the wave
- Never say "we" — say "I", it's more authentic

---

## r/australia

**Title:** `I got sick of driving past cheaper petrol, so I built a free tool that calculates if the detour is actually worth it`

Like everyone else I've been watching fuel prices bounce around and wondering whether it's worth driving an extra few km to save a few cents. Turns out the answer is more nuanced than just "go to the cheapest one." So I built a thing.

**petrolsaver.live** — free map showing ~4,000 stations across VIC and NSW. What makes it different:

- **It calculates net savings, not just price.** A station might be 5c/L cheaper but 8km away. It works out the fuel cost of the detour and tells you whether you'd actually save money. Sometimes the closest station IS the best deal.
- **Colour-coded prices** — every pin on the map is green (top 10% cheapest), amber (mid), or red (bottom 50%), relative to what's around you. Not arbitrary cutoffs — percentile-based.
- **Fill cost estimate** — set your tank level and it tells you what a fill-up will actually cost at each station.
- **Trip planner** — driving somewhere? It finds the cheapest station along your route, not just near your house.
- **Transparent algorithm** — there's a full breakdown showing the maths: detour distance, fuel for detour, price savings, net result. No black box.

Data comes from Service Victoria (VIC, updated daily) and Transport for NSW (real-time). And because VIC data can lag, **anyone can report a live price** at any station — community reports override the official price when they're newer. No account needed to report.

No ads, works on mobile. Planning to add QLD and WA next.

Just me building this so genuinely keen for feedback — what's broken, what's missing, what would make you actually use it over what you use now?

---

## r/melbourne

**Title:** `Built a free fuel price tool for Melbourne — it tells you if driving to the cheaper servo is actually worth it`

Melbourne fuel prices are cooked at the moment so I built something to help.

**petrolsaver.live** — shows ~1,600 stations across Victoria with colour-coded prices on a map. The bit that's different: it doesn't just show you the cheapest servo. It calculates whether driving there actually saves you money after the fuel you'd burn on the detour.

Set your fuel type (U91, P95, P98, diesel, LPG), set how full your tank is, and it ranks every station by *true cost* — factoring in distance, detour fuel, and your fill-up amount.

Quick example: say there's a servo 3km further that's 8c/L cheaper. Sounds like a no-brainer? The app works it out — you'd burn about $0.40 in fuel getting there, but save $3.20 on a half-tank fill. Net saving: $2.80. Worth it. But sometimes the maths goes the other way, and the closest servo actually wins.

Also has a trip planner — heading to Geelong or the Mornington Peninsula? It'll find the cheapest stop along the way.

Data is from the Service Victoria fuel price API (updated daily, not real-time — that's a VIC government limitation unfortunately). To handle the lag, **you can report a live price** at any station — it takes 5 seconds and overrides the official data when it's newer. No account needed.

No ads, no sign-up, works on your phone.

Keen to hear what you think, especially if something's broken or you want it to do something it doesn't.

---

## r/sydney

**Title:** `Free fuel price map for Sydney/NSW — calculates if the cheaper servo is actually worth the drive`

Fuel prices in Sydney are all over the place so I built a tool that does more than just show you the cheapest station.

**petrolsaver.live** — maps ~2,400 stations across NSW with real-time pricing from Transport for NSW. Every station is colour-coded: green (cheapest 10%), amber (middle), red (most expensive). All relative to your area, not arbitrary numbers.

The key feature: it calculates **net savings**. A station 5km away might be 6c/L cheaper, but is it worth the drive? The app factors in the fuel you'd burn on the detour and tells you the actual dollar amount you'd save (or lose). Sometimes the closest station wins.

Other bits:
- Set your fuel type and tank level — it estimates your fill-up cost at each station
- Trip planner for longer drives — finds the cheapest stop on your route
- Full breakdown of the maths — detour distance, fuel cost, price savings, net result
- No account needed, no ads, mobile-friendly

NSW data is real-time (within 30 minutes of the bowser changing). Also covers Victoria (~1,600 stations, daily updates). Because VIC data can lag, **you can report a live price** at any station — takes 5 seconds, no account needed, and it overrides the official data when it's newer.

Adding QLD and WA soon. Built this on my own so genuinely want feedback — what would make you switch from whatever you use now?

---

## r/AusFinance

**Title:** `I built a fuel comparison tool that calculates whether driving to a cheaper servo actually saves you money after detour costs`

Quick back-of-envelope maths that prompted this: at 8.5L/100km and $2.50/L, every extra kilometre of driving costs you about 21 cents in fuel. So a 5km detour each way (10km round trip) costs ~$2.13. If you're filling 40L at a station that's 6c/L cheaper, you save $2.40. Net saving: 27 cents. Barely worth the time.

But these calculations change dramatically depending on how much fuel you're putting in, how far the detour is, and what the price difference actually is. So I built a tool that does this automatically.

**petrolsaver.live** — ~4,000 stations across VIC and NSW. For each station it calculates:

1. Detour distance from your location (straight-line × 1.35 road factor)
2. Fuel cost of that detour (at 8.5L/100km × the station's own price)
3. Price savings vs closest station (price difference × litres you're filling)
4. Net saving = price savings minus detour fuel cost

Stations are ranked by net saving, not raw price. So the #1 recommendation is genuinely the cheapest option *for you* from where you are right now.

It also estimates your fill-up cost based on a tank level slider (55L tank assumption), and has a trip planner that finds the cheapest stop along a route.

The price tiers on the map are percentile-based: green = top 10%, amber = 10-50%, red = bottom 50%. Relative to visible stations, not fixed thresholds, so they adjust as you move around.

Data sources: Service Victoria API (daily updates, ~24hr delay) and Transport for NSW (real-time). Both government open data. Community price reporting lets users override stale prices in real-time.

No sign-up, no ads. Adding QLD (fuelpricesqld.com.au API) and WA (FuelWatch RSS) next.

Happy to answer questions about the methodology. Full algorithm explanation at petrolsaver.live/how-it-works.

---

## r/SideProject

**Title:** `PetrolSaver — fuel price comparison that ranks stations by true cost, not just cheapest price`

Built a fuel price comparison tool for Australia that goes beyond just showing the cheapest station.

**The problem:** existing apps show you the cheapest price per litre, but a station 8km away that's 5c cheaper might actually cost you more in fuel to get there than you'd save. The "cheapest" station isn't always the best deal.

**The solution:** petrolsaver.live ranks stations by net savings — factoring in detour distance, fuel burned getting there, and how much you're filling up.

**Stack:**
- Next.js 16 (App Router, TypeScript)
- Leaflet + react-leaflet for maps
- Zustand for state management
- Framer Motion for animations
- Vercel hosting
- Government open data APIs (Service Victoria + Transport for NSW)

**What I learned:**
- Government APIs are wildly inconsistent — VIC is 24hr delayed batch data, NSW is real-time
- Leaflet with ~4,000 custom pill markers needs careful performance work (startTransition, marker clustering)
- The recommendation algorithm is surprisingly nuanced — detour calculation changes completely between "nearby" and "trip" modes
- In-memory caching with stale-while-revalidate is the right pattern when your upstream API has rate limits

~4,000 stations across 2 states. Adding more states soon — QLD and WA both have public fuel price APIs.

Would love technical feedback. Code is closed-source for now but happy to discuss architecture.

---

## OzBargain

**Title:** `[Free] PetrolSaver — Fuel Price Map for VIC & NSW That Calculates If the Cheaper Servo Is Worth the Drive`

**Description:**

Free web app (no sign-up, no ads) that shows fuel prices for ~4,000 stations across VIC and NSW.

Unlike other fuel apps, it calculates whether driving to a cheaper station actually saves you money after factoring in the detour fuel cost. Set your fuel type, tank level, and it ranks stations by net savings.

**Features:**
- Colour-coded map (green = cheapest 10%, amber = mid, red = expensive)
- Net savings calculator (detour cost vs price savings)
- Fill-up cost estimate based on your tank level
- Trip planner — cheapest station along your route
- All fuel types: U91, P95, P98, Diesel, E10, LPG
- Community price reporting — anyone can update a price in 5 seconds, no account needed

**Data sources:** Service Victoria (daily), Transport for NSW (real-time). Community reports override stale data.

**Link:** https://petrolsaver.live

Free, mobile-friendly, no app download needed. Built by one person, feedback welcome.

---

## Prepared Responses

### "Why not just use FuelMap/PetrolSpy/7-Eleven app?"

> Those show the cheapest price, which is great. The difference is PetrolSaver calculates whether driving to that cheaper station actually saves you money. A station that's 8c cheaper but 10km away might cost you more in fuel getting there than you save. Sometimes the closest station is genuinely the best option, and PetrolSaver will tell you that.

### "VIC data is a day old, that's useless"

> Yeah, that's a Service Victoria limitation — they batch-process prices daily, not real-time. NSW is real-time though (within 30 minutes). The good news is most stations don't change prices daily, so yesterday's data is still accurate for the majority. I'm pushing for the VIC government to move to real-time reporting like NSW already has.

### "Only VIC and NSW?"

> QLD and WA are next — both have government fuel price APIs ready to go. SA uses the same system as QLD so that should follow quickly. Hoping to have all major states by mid-year.

### "How do you make money?"

> I don't, currently. There's a Buy Me a Coffee link if people find it useful. Might add non-intrusive ads eventually but want to get the product right first.

### "Is this open source?"

> Not at the moment, but the algorithm is fully transparent — you can see the exact calculation for every recommendation at petrolsaver.live/how-it-works, and every station card shows the breakdown.

### "The prices are wrong"

> The prices come directly from government APIs (Service Victoria and Transport for NSW). If a price looks wrong, it's likely the station hasn't reported an update yet. You can tap "Report a price" on any station to flag it — community reports override the official price when they're newer.
