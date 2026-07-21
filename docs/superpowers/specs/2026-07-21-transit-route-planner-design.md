# Tbilisi Transit Route Planner — Design

**Date:** 2026-07-21
**Status:** Approved. **Amended during implementation** — see note below.

> **Implementation amendment (2026-07-21):** The `ttc-api` npm package referenced
> below turned out to be broken as published (ESM-interop bug,
> `c.default.create is not a function`). We therefore do **not** depend on it and
> instead call the TTC API **directly via `fetch`** at
> `https://transit.ttc.com.ge/pis-gateway/api/v2` with an `X-Api-Key` header. The
> exact endpoints and the `BusPlan`/`BusArrival` response shapes were confirmed
> from the `ttc-api` type definitions and the `MCP_TTC_public_transport` Python
> reference implementation. The TTC API is geo-firewalled to Georgia. The
> authoritative, up-to-date design is the implementation plan
> (`docs/superpowers/plans/2026-07-21-transit-route-planner.md`); this spec's
> "Data source" and client sections below are kept for historical context.

## Goal

Let a site visitor plan a public-transport journey in Tbilisi: enter a start and
destination, get journey options (walk / bus / metro legs) with live next-bus
arrival times. Mirrors what the official TTC phone app does, delivered on our
site.

Delivered as part of a restructure of the existing `/tickets` page into a
**"Getting Around"** hub, so the route planner lives next to the Tbilisi transit
pass. See "Page restructure" below.

## Page restructure

Rename the existing `/tickets` page to **"Getting Around"** (keep the `/tickets`
URL to avoid breaking links; only the title/heading + nav label change). The
page splits into two sections:

1. **City Transportation** — in-city transit: transit passes (buy) + **Plan a Route** (the new route planner).
2. **Travel from Tbilisi** — intercity tickets: bus + rail.

Existing ticket data is re-bucketed **by `TicketOption.type`**, no data
migration:

- `type: "transit-pass"` → **City Transportation**
- `type: "bus"` / `type: "rail"` → **Travel from Tbilisi**

Sections rendered as two tabs (or two stacked sections) on the page. The route
planner is a sub-view within the City Transportation section.

## Data source

npm package [`ttc-api`](https://github.com/sxnney/ttc-api) — a typed TypeScript
wrapper around Tbilisi Transport Company's **undocumented internal backend**.

- No official API, **no API key / auth required**.
- Relevant functions:
  - `ttc.plan({ from:[lat,lng], to:[lat,lng], locale })` — A→B journey routing (return shape undocumented).
  - `ttc.arrivalTimes({ stopId, locale })` — real-time + scheduled arrivals.
  - `ttc.stops()`, `ttc.stop(id)`, `ttc.routes()`, `ttc.locations(busId)` — available, not all used in v1.
  - `ttc.setLocale("ka" | "en")`.
- Uses a Node HTTP client → **must run server-side only**.

**Risk:** unofficial API, may change or rate-limit without notice. Design must
degrade gracefully, never crash the page, and isolate the dependency behind one
wrapper module so it can be swapped or disabled.

## Approach

**Thin proxy (Approach A).** TTC does the hard routing; we present it. Our API
routes wrap `ttc.plan()` / `ttc.arrivalTimes()`, normalize the undocumented
response into our own typed shape, and the client renders it. Caching of
stops/routes deferred (evolve to hybrid later if traffic warrants).

## Architecture

```
Browser — RoutePlanner tab (client component)
  │  "From"/"To" search box → geocode → [lat,lng]
  │  POST /api/transit/plan { from, to, locale }
  ▼
Next.js API routes (server-only)
  ├─ GET  /api/transit/geocode?q=…        → Nominatim proxy (Tbilisi bbox, debounced/cached)
  ├─ POST /api/transit/plan               → ttc.plan()  → normalized JourneyPlan[]
  └─ GET  /api/transit/arrivals?stopId=…  → ttc.arrivalTimes() → Arrival[]
  ▼
lib/transit/client.ts  → ttc-api npm pkg → TTC internal backend (unofficial, no key)
```

Server-side rationale: `ttc-api` needs Node; keeps unofficial calls off the
browser; single place to normalize/guard the undocumented `plan()` shape.

## Components / files

| File | Purpose |
|------|---------|
| `src/lib/transit/client.ts` | Singleton `ttc` import, `setLocale`, all calls wrapped in try/catch + timeout. The one swappable seam. |
| `src/lib/transit/normalize.ts` | Convert undocumented `plan()` result → typed `JourneyPlan`. Defensive: unknown leg types → generic step, missing fields → skip, never throw. |
| `src/types/transit.ts` | `JourneyPlan`, `JourneyLeg`, `TransitStop`, `Arrival`. |
| `src/app/api/transit/geocode/route.ts` | Nominatim proxy handler. |
| `src/app/api/transit/plan/route.ts` | Wraps `ttc.plan`, returns normalized journeys or `{ error }`. |
| `src/app/api/transit/arrivals/route.ts` | Wraps `ttc.arrivalTimes`. |
| `src/components/transit/route-planner.tsx` | Client tab UI: two geocode search inputs, swap button, Plan button, journey results list. |
| `src/components/transit/journey-card.tsx` | One journey: leg timeline (walk→bus 37→walk) + live arrival badge on boarding stop. |
| `src/app/[locale]/tickets/page.tsx` | Retitle to "Getting Around"; render two sections (City Transportation / Travel from Tbilisi); bucket tickets by `type`; mount route planner inside City Transportation. |
| Nav / header | Update the menu label `Tickets` → `Getting Around`. |
| `messages/{en,ka,ru}.json` | New `transit` namespace keys. |

Optional (v1 stretch): draw the journey polyline on a mini Leaflet map
(no Mapbox token present → Leaflet/OSM fallback, matching existing MapExplorer).

## Data flow

1. Type in "From" → debounce 400ms → `GET /api/transit/geocode?q=…` → suggestion dropdown → select sets `[lat,lng]`.
2. Both endpoints set + click **Plan** → `POST /api/transit/plan`.
3. Render each returned journey's legs. For the first bus/metro leg, fire `GET /api/transit/arrivals?stopId=…` → show "next in 4 min".

## Geocoding

**OSM Nominatim**, no key.

- Proxied server-side (never called from browser) so we control the `User-Agent`
  header and bias results to the Tbilisi bounding box (`viewbox` + `bounded=1`).
- Respect Nominatim usage policy: debounce input, in-memory cache of identical
  queries with short TTL, single request at a time.

## Error handling (critical — unofficial API)

- Every TTC call wrapped with a **5s timeout**; on failure/timeout return
  `{ error: "transit_unavailable" }`.
- UI shows a graceful "Live transit data temporarily unavailable" message with a
  link to the TTC app. The tickets page never crashes.
- `normalize.ts` is fully defensive — malformed/unknown data degrades, never throws.
- Geocode failures → empty suggestion list, not an error page.

## i18n

- Add a `transit` namespace to `messages/en.json`, `messages/ka.json`,
  `messages/ru.json` together.
- `ttc.setLocale` per request locale: `ka` and `en` pass through; `ru` → fallback `en`.

## Testing

- Unit: `normalize.ts` against captured real `plan()` JSON fixtures.
- API route smoke tests with a mocked `ttc` client.
- No live-API calls in CI (flaky, unofficial).

## First implementation step (open item)

`plan()` return shape is undocumented. Before writing `normalize.ts` /
`types/transit.ts`, **call `ttc.plan()` live once via a throwaway script,
capture the real JSON**, save it as a test fixture, and design the typed shape
from actual data.

## Scope cut (YAGNI, not in v1)

Saved routes, user accounts tie-in, fare calculation, metro-only mode,
stops/routes caching in MongoDB, live bus position map animation.
