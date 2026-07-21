# Tbilisi Transit Route Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public-transport route planner (start→destination journeys with live arrivals) to the site, restructured into a "Getting Around" hub alongside the Tbilisi transit pass.

**Architecture:** A thin server-side proxy that calls the TTC (Tbilisi Transport Company) transit API **directly via `fetch`** — the OpenTripPlanner-style backend at `https://transit.ttc.com.ge/pis-gateway/api/v2`. (The `ttc-api` npm package that originally motivated this is broken as published — an ESM-interop bug, `c.default.create is not a function` — so we do not depend on it. Its bundled `.d.ts` and a second reference implementation, the `MCP_TTC_public_transport` Python server, gave us the exact endpoints, params, headers, and response shapes; see the data-source note below.) Three Next.js API routes (`geocode`, `plan`, `arrivals`) wrap OSM Nominatim + the TTC calls; a defensive `normalize.ts` converts the TTC `/plan` response into our typed `JourneyPlan`. The existing `/tickets` page is retitled "Getting Around" and split into two sections — **City Transportation** (transit passes + the new route planner) and **Travel from Tbilisi** (bus/rail tickets) — bucketed by `TicketOption.type`.

**Tech Stack:** Next.js 16 (App Router, `runtime = "nodejs"`), TypeScript, native `fetch` to the TTC API (no third-party transit package), OSM Nominatim, next-intl 4, `@base-ui/react` Tabs, framer-motion, Tailwind v4. Unit tests via Node's built-in `node:test` runner executed through `tsx` (already a dependency — no new test framework).

## Data source (TTC API contract)

Confirmed from the `ttc-api@2.0.0` type definitions **and** the `MCP_TTC_public_transport` reference implementation (identical base URL, header, and params):

- **Base:** `https://transit.ttc.com.ge/pis-gateway/api/v2`
- **Auth header:** `X-Api-Key` (public key baked into both reference clients: `c0a2f304-551a-4d08-b8df-2c53ecd57f9f`). Stored in env `TTC_API_KEY`, defaulting to that value.
- **Geo firewall:** TTC only serves requests originating from **Georgia**. From a non-Georgian server region calls may fail — the graceful `transit_unavailable` path (below) covers this; note it for deploy.
- `GET /plan?fromPlace={lat},{lng}&toPlace={lat},{lng}&departMode=leaveNow&modes=WALK,BUS&optimize=quick&locale={ka|en}` → `BusPlan`:
  - `{ from, to, itineraries: Itinerary[] }`
  - `Itinerary`: `{ startTime, endTime, duration /*sec*/, walkTime, walkDistance, legs: Leg[] }`
  - `Leg`: `{ from:{lat,lon,name}, to:{lat,lon,name}, duration /*sec*/, distance, mode: "WALK"|"BUS"|"SUBWAY"|"GONDOLA", route:{shortName,longName,color}|null, intermediateStops, realTime }`
- `GET /stops/1:{stopId}/arrival-times?locale={ka|en}&ignoreScheduledArrivalTimes=false` → `BusArrival[]`: `{ shortName, color, headsign, realtime, realtimeArrivalMinutes, scheduledArrivalMinutes }`
- `GET /stops?locale={ka|en}` → `BusStop[]`: `{ id, code, name, lat, lon, vehicleMode }` (not used in v1)

## Global Constraints

- Next.js 16: `params`/`searchParams` in page props are **Promises** — always `await`.
- Import `Link`, `useRouter`, `redirect`, `usePathname` from `@/i18n/navigation`, **never** `next/navigation` (except `useParams`, which the codebase uses directly in client components).
- All API routes calling the TTC API MUST declare `export const runtime = "nodejs"`.
- i18n: add every new key to **all three** message files (`messages/en.json`, `messages/ka.json`, `messages/ru.json`) together.
- The TTC API is **unofficial** and geo-firewalled to Georgia. Every TTC `fetch` is wrapped with a 5s timeout and try/catch; on any failure return a typed `{ error }` and never throw to the page.
- API key comes from `process.env.TTC_API_KEY`, falling back to the known public key. Never expose it to the browser (server-side routes only).
- Keep the `/tickets` URL. Only the page title, heading, and nav label change to "Getting Around".
- No data migration: tickets are bucketed by existing `TicketOption.type` (`"transit-pass"` → City Transportation; `"bus"`/`"rail"` → Travel from Tbilisi).
- Server-side only for the TTC API and Nominatim — never call either from the browser.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/types/transit.ts` | Typed shapes: `LatLng`, `GeocodeResult`, `JourneyLeg`, `JourneyPlan`, `Arrival`, `TransitError`. |
| `src/lib/transit/client.ts` | TTC `fetch` wrapper: base URL + `X-Api-Key`, locale mapping, 5s-timeout + try/catch helpers `planJourney`, `getArrivals`. The one swappable seam. |
| `src/lib/transit/normalize.ts` | Pure function `normalizePlan(raw): JourneyPlan[]` — defensive conversion of the TTC `/plan` (`BusPlan`) response. |
| `src/lib/transit/normalize.test.ts` | `node:test` unit tests against the fixture + defensive cases. |
| `src/lib/transit/__fixtures__/plan-sample.json` | Representative TTC `/plan` response, hand-built from the confirmed `BusPlan` shape (see Task 1). |
| `src/app/api/transit/geocode/route.ts` | `GET` Nominatim proxy, Tbilisi-biased, in-memory cache. |
| `src/app/api/transit/plan/route.ts` | `POST` → `planJourney` → `normalizePlan`. |
| `src/app/api/transit/arrivals/route.ts` | `GET` → `getArrivals`. |
| `src/components/transit/route-planner.tsx` | Client UI: two geocode search inputs, swap, Plan button, results. |
| `src/components/transit/journey-card.tsx` | One journey: leg timeline + live arrival badge. |
| `src/components/site/getting-around.tsx` | Client wrapper: two sections (City Transportation / Travel from Tbilisi), mounts `TicketsSearch` + `RoutePlanner`. |
| `src/app/[locale]/tickets/page.tsx` | Retitle "Getting Around"; render `GettingAround`. |
| `.env.local` / `.env.example` | `TTC_API_KEY` (server-only). |
| `messages/{en,ka,ru}.json` | New `gettingAround` + `transit` namespaces. |

---

## Task 1: Test script, env key, and TTC `/plan` fixture

> **Context (why no live probe):** The original plan probed `ttc.plan()` live to capture the response shape. That is not possible: the `ttc-api` package is broken as published (ESM-interop bug), and the TTC API is geo-firewalled to Georgia (unreachable from this dev/CI environment). Instead, the exact `BusPlan` response shape is already **confirmed** from two independent sources — the `ttc-api@2.0.0` TypeScript definitions and the `MCP_TTC_public_transport` Python reference implementation (see the "Data source" section at the top of this plan). This task builds a representative fixture from that confirmed shape. We do **not** install `ttc-api`.

**Files:**
- Modify: `package.json` (add `test` script — no new dependency)
- Modify: `.env.local` (add `TTC_API_KEY`); create `.env.example` entry if that file exists
- Create: `src/lib/transit/__fixtures__/plan-sample.json`

**Interfaces:**
- Produces: a JSON fixture matching the TTC `/plan` `BusPlan` shape that Task 3 (`normalize.ts`) designs and tests against.

- [ ] **Step 1: Add a test script to package.json**

In `package.json` `"scripts"`, add (no dependency install — `tsx` is already present):

```json
"test": "node --import tsx --test \"src/**/*.test.ts\""
```

- [ ] **Step 2: Add the TTC API key to env**

Append to `.env.local`:

```
TTC_API_KEY=c0a2f304-551a-4d08-b8df-2c53ecd57f9f
```

If a `.env.example` file exists in the repo, add `TTC_API_KEY=` to it too (empty value — the code falls back to the public key). If `.env.example` does not exist, do not create one.

- [ ] **Step 3: Create the fixture from the confirmed `BusPlan` shape**

Create `src/lib/transit/__fixtures__/plan-sample.json`. This mirrors a real TTC `/plan` response for a Rustaveli→Station Square trip: one itinerary, WALK → BUS → WALK. Field names/types are exactly those in the confirmed `BusPlan`/`Itinerary`/`Leg` shape (durations in **seconds**, distances in **metres**, `mode` uppercase, `route` non-null only on transit legs):

```json
{
  "from": { "lat": 41.6977, "lon": 44.8015, "name": "Origin" },
  "to": { "lat": 41.7297, "lon": 44.801, "name": "Destination" },
  "itineraries": [
    {
      "startTime": "2026-07-21T09:00:00.000Z",
      "endTime": "2026-07-21T09:34:00.000Z",
      "duration": 2040,
      "walkTime": 540,
      "walkDistance": 620,
      "legs": [
        {
          "from": { "lat": 41.6977, "lon": 44.8015, "name": "Origin" },
          "to": { "lat": 41.7005, "lon": 44.8009, "name": "Rustaveli Metro" },
          "startTime": "2026-07-21T09:00:00.000Z",
          "endTime": "2026-07-21T09:05:00.000Z",
          "duration": 300,
          "distance": 350,
          "mode": "WALK",
          "route": null,
          "intermediateStops": null,
          "realTime": false
        },
        {
          "from": { "lat": 41.7005, "lon": 44.8009, "name": "Rustaveli Metro", "stopId": "1946" },
          "to": { "lat": 41.7285, "lon": 44.8011, "name": "Station Square" },
          "startTime": "2026-07-21T09:05:00.000Z",
          "endTime": "2026-07-21T09:29:00.000Z",
          "duration": 1440,
          "distance": 3200,
          "mode": "BUS",
          "route": { "shortName": "37", "longName": "Rustaveli — Station Square", "color": "0033B4" },
          "intermediateStops": [
            { "id": "2001", "code": null, "name": "Kostava St", "lat": 41.71, "lon": 44.8, "vehicleMode": "BUS" }
          ],
          "realTime": true
        },
        {
          "from": { "lat": 41.7285, "lon": 44.8011, "name": "Station Square" },
          "to": { "lat": 41.7297, "lon": 44.801, "name": "Destination" },
          "startTime": "2026-07-21T09:29:00.000Z",
          "endTime": "2026-07-21T09:34:00.000Z",
          "duration": 300,
          "distance": 270,
          "mode": "WALK",
          "route": null,
          "intermediateStops": null,
          "realTime": false
        }
      ]
    }
  ]
}
```

> Note the boarding leg's `from.stopId` — the TTC `Leg.from` shape does not always include a stop id, so `normalizePlan` must treat `fromStopId` as optional (Task 3 handles this). This fixture includes it on the BUS leg so the arrivals path can be exercised.

- [ ] **Step 4: Validate the fixture is well-formed JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/lib/transit/__fixtures__/plan-sample.json','utf8'));console.log('valid')"`
Expected: prints `valid`.

- [ ] **Step 5: Commit**

```bash
git add package.json .env.example src/lib/transit/__fixtures__/plan-sample.json
git commit -m "chore(transit): add test script, TTC_API_KEY env, and plan fixture"
```

(`.env.local` is git-ignored and will not be committed — that is expected.)

---

## Task 2: Define transit types

**Files:**
- Create: `src/types/transit.ts`

**Interfaces:**
- Produces: `LatLng`, `GeocodeResult`, `LegMode`, `JourneyLeg`, `JourneyPlan`, `Arrival`, `TransitError` — consumed by Tasks 3, 5, 6, 7, 8.

> **Note:** These are OUR normalized shapes (not the raw TTC shapes). The exported names and required fields must stay exactly as written — Tasks 3–10 depend on them.

- [ ] **Step 1: Write the type file**

Create `src/types/transit.ts`:

```ts
// Server-normalized transit shapes. normalizePlan() maps the TTC /plan
// (BusPlan) response into these. Keep field names stable — API routes and
// UI components import these directly.

export type LatLng = [number, number]; // [latitude, longitude]

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

export type LegMode = "walk" | "bus" | "metro" | "unknown";

export interface JourneyLeg {
  mode: LegMode;
  line?: string;        // e.g. "37" for a bus/metro line
  fromStop?: string;    // boarding stop name
  toStop?: string;      // alighting stop name
  fromStopId?: string;  // used to fetch live arrivals
  durationMin?: number;
  distanceM?: number;
}

export interface JourneyPlan {
  id: string;           // stable per-plan key for React
  durationMin?: number;
  legs: JourneyLeg[];
}

export interface Arrival {
  line?: string;
  minutes?: number;     // minutes until arrival
  realtime: boolean;    // true = live prediction, false = scheduled
  destination?: string;
}

export interface TransitError {
  error: "transit_unavailable" | "bad_request";
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors introduced by this file).

- [ ] **Step 3: Commit**

```bash
git add src/types/transit.ts
git commit -m "feat(transit): add normalized transit type definitions"
```

---

## Task 3: Write the defensive `normalizePlan` function (TDD)

**Files:**
- Create: `src/lib/transit/normalize.ts`
- Test: `src/lib/transit/normalize.test.ts`
- Uses: `src/lib/transit/__fixtures__/plan-sample.json` (from Task 1)

**Interfaces:**
- Consumes: `JourneyPlan`, `JourneyLeg`, `LegMode` from `@/types/transit`.
- Produces: `normalizePlan(raw: unknown): JourneyPlan[]` — consumed by Task 6 (`plan` route).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/transit/normalize.test.ts`:

The TTC `/plan` response is a `BusPlan`: `{ from, to, itineraries: Itinerary[] }`, each itinerary `{ duration /*sec*/, legs: Leg[] }`, each leg `{ mode: "WALK"|"BUS"|"SUBWAY"|"GONDOLA", duration /*sec*/, distance /*m*/, from:{name,stopId?}, to:{name}, route:{shortName,longName,color}|null }`. `normalizePlan` maps that into `JourneyPlan[]`, converting seconds→minutes and uppercase modes→our `LegMode`.

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePlan } from "./normalize";
import sample from "./__fixtures__/plan-sample.json";

test("normalizes the BusPlan fixture into JourneyPlan[]", () => {
  const plans = normalizePlan(sample);
  assert.equal(plans.length, 1, "one itinerary → one plan");
  const first = plans[0];
  assert.equal(first.id, "plan-0");
  assert.equal(first.durationMin, 34, "2040s → 34min");
  assert.equal(first.legs.length, 3, "walk/bus/walk");
  assert.deepEqual(first.legs.map((l) => l.mode), ["walk", "bus", "walk"]);
});

test("maps the BUS leg's route, stops, and stopId", () => {
  const busLeg = normalizePlan(sample)[0].legs[1];
  assert.equal(busLeg.mode, "bus");
  assert.equal(busLeg.line, "37", "route.shortName → line");
  assert.equal(busLeg.fromStop, "Rustaveli Metro");
  assert.equal(busLeg.toStop, "Station Square");
  assert.equal(busLeg.fromStopId, "1946", "from.stopId → fromStopId");
  assert.equal(busLeg.durationMin, 24, "1440s → 24min");
  assert.equal(busLeg.distanceM, 3200);
});

test("maps SUBWAY mode to 'metro'", () => {
  const raw = { itineraries: [{ duration: 60, legs: [{ mode: "SUBWAY", duration: 60 }] }] };
  assert.equal(normalizePlan(raw)[0].legs[0].mode, "metro");
});

test("returns [] for null / non-object input without throwing", () => {
  assert.deepEqual(normalizePlan(null), []);
  assert.deepEqual(normalizePlan(undefined), []);
  assert.deepEqual(normalizePlan(42), []);
  assert.deepEqual(normalizePlan("nope"), []);
});

test("returns [] when itineraries is missing or not an array", () => {
  assert.deepEqual(normalizePlan({}), []);
  assert.deepEqual(normalizePlan({ itineraries: "no" }), []);
});

test("maps unknown leg modes to 'unknown' instead of throwing", () => {
  const raw = { itineraries: [{ duration: 10, legs: [{ mode: "TELEPORT", duration: 10 }] }] };
  const out = normalizePlan(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].legs[0].mode, "unknown");
});

test("skips malformed legs but keeps the itinerary", () => {
  const raw = { itineraries: [{ duration: 10, legs: [null, { mode: "WALK", duration: 60 }, 5] }] };
  const out = normalizePlan(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].legs.length, 1);
  assert.equal(out[0].legs[0].mode, "walk");
});

test("drops itineraries whose legs are all malformed", () => {
  const raw = { itineraries: [{ duration: 10, legs: [null, 3] }] };
  assert.deepEqual(normalizePlan(raw), []);
});

test("assigns stable ids per itinerary index", () => {
  const raw = { itineraries: [
    { duration: 10, legs: [{ mode: "WALK", duration: 10 }] },
    { duration: 20, legs: [{ mode: "BUS", duration: 20 }] },
  ] };
  const out = normalizePlan(raw);
  assert.equal(out[0].id, "plan-0");
  assert.equal(out[1].id, "plan-1");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './normalize'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/transit/normalize.ts`. This maps the confirmed `BusPlan` shape — no guessing of container keys:

```ts
import type { JourneyPlan, JourneyLeg, LegMode } from "@/types/transit";

const SECONDS_PER_MIN = 60;

function toMode(raw: unknown): LegMode {
  const s = String(raw ?? "").toUpperCase();
  if (s === "WALK") return "walk";
  if (s === "BUS") return "bus";
  if (s === "SUBWAY" || s === "METRO") return "metro";
  return "unknown"; // GONDOLA and anything unrecognized
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function secToMin(v: unknown): number | undefined {
  const n = num(v);
  return n === undefined ? undefined : Math.round(n / SECONDS_PER_MIN);
}

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function normalizeLeg(raw: unknown): JourneyLeg | null {
  const r = asObj(raw);
  if (!r) return null;
  const from = asObj(r.from);
  const to = asObj(r.to);
  const route = asObj(r.route);
  return {
    mode: toMode(r.mode),
    line: route ? str(route.shortName) : undefined,
    fromStop: from ? str(from.name) : undefined,
    toStop: to ? str(to.name) : undefined,
    fromStopId: from ? str(from.stopId) : undefined,
    durationMin: secToMin(r.duration),
    distanceM: num(r.distance),
  };
}

export function normalizePlan(raw: unknown): JourneyPlan[] {
  const root = asObj(raw);
  if (!root || !Array.isArray(root.itineraries)) return [];

  const plans: JourneyPlan[] = [];
  root.itineraries.forEach((it, i) => {
    const itin = asObj(it);
    if (!itin || !Array.isArray(itin.legs)) return;
    const legs = itin.legs
      .map(normalizeLeg)
      .filter((l): l is JourneyLeg => l !== null);
    if (legs.length === 0) return;
    plans.push({
      id: `plan-${i}`,
      durationMin: secToMin(itin.duration),
      legs,
    });
  });
  return plans;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all normalize tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/transit/normalize.ts src/lib/transit/normalize.test.ts
git commit -m "feat(transit): add defensive normalizePlan with unit tests"
```

---

## Task 4: Write the TTC `fetch` client wrapper

**Files:**
- Create: `src/lib/transit/client.ts`

**Interfaces:**
- Consumes: `LatLng`, `Arrival`, `JourneyPlan` from `@/types/transit`; `normalizePlan` from `./normalize`.
- Produces:
  - `planJourney(from: LatLng, to: LatLng, locale: string): Promise<JourneyPlan[] | null>` (null = failure)
  - `getArrivals(stopId: string, locale: string): Promise<Arrival[] | null>` (null = failure)
  - Consumed by Task 6 and Task 7.

This calls the TTC API directly via `fetch` (see the "Data source" section for the exact endpoints/params). No `ttc-api` import — that package is broken. `AbortSignal.timeout(5000)` provides the 5s guard.

- [ ] **Step 1: Write the wrapper**

Create `src/lib/transit/client.ts`:

```ts
import type { LatLng, Arrival, JourneyPlan } from "@/types/transit";
import { normalizePlan } from "./normalize";

const BASE = "https://transit.ttc.com.ge/pis-gateway/api/v2";
const API_KEY = process.env.TTC_API_KEY || "c0a2f304-551a-4d08-b8df-2c53ecd57f9f";
const TIMEOUT_MS = 5000;

function ttcLocale(locale: string): "ka" | "en" {
  return locale === "ka" ? "ka" : "en"; // ru falls back to en
}

async function ttcGet(path: string, params: Record<string, string>): Promise<unknown> {
  const url = `${BASE}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    headers: { "X-Api-Key": API_KEY },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`ttc_http_${res.status}`);
  return res.json();
}

export async function planJourney(
  from: LatLng,
  to: LatLng,
  locale: string
): Promise<JourneyPlan[] | null> {
  try {
    const raw = await ttcGet("/plan", {
      fromPlace: `${from[0]},${from[1]}`,
      toPlace: `${to[0]},${to[1]}`,
      departMode: "leaveNow",
      modes: "WALK,BUS",
      optimize: "quick",
      locale: ttcLocale(locale),
    });
    return normalizePlan(raw);
  } catch (e) {
    console.error("[transit] planJourney failed:", e);
    return null;
  }
}

function normalizeArrivals(raw: unknown): Arrival[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
    .map((a) => ({
      line: typeof a.shortName === "string" ? a.shortName : undefined,
      minutes:
        typeof a.realtimeArrivalMinutes === "number"
          ? a.realtimeArrivalMinutes
          : typeof a.scheduledArrivalMinutes === "number"
            ? a.scheduledArrivalMinutes
            : undefined,
      realtime: a.realtime === true,
      destination: typeof a.headsign === "string" ? a.headsign : undefined,
    }));
}

export async function getArrivals(
  stopId: string,
  locale: string
): Promise<Arrival[] | null> {
  try {
    const raw = await ttcGet(`/stops/1:${stopId}/arrival-times`, {
      locale: ttcLocale(locale),
      ignoreScheduledArrivalTimes: "false",
    });
    return normalizeArrivals(raw);
  } catch (e) {
    console.error("[transit] getArrivals failed:", e);
    return null;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/transit/client.ts
git commit -m "feat(transit): add timeout-guarded TTC fetch client wrapper"
```

---

## Task 5: Geocode API route (Nominatim proxy)

**Files:**
- Create: `src/app/api/transit/geocode/route.ts`

**Interfaces:**
- Produces: `GET /api/transit/geocode?q=…` → `GeocodeResult[]` (JSON). Consumed by Task 8 (`RoutePlanner`).

- [ ] **Step 1: Write the route**

Create `src/app/api/transit/geocode/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import type { GeocodeResult } from "@/types/transit";

export const runtime = "nodejs";

// Tbilisi bounding box: left,top,right,bottom (lon,lat,lon,lat)
const TBILISI_VIEWBOX = "44.60,41.85,45.00,41.60";
const cache = new Map<string, { at: number; data: GeocodeResult[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return NextResponse.json([] as GeocodeResult[]);

  const key = q.toLowerCase();
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < CACHE_TTL_MS) {
    return NextResponse.json(hit.data);
  }

  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5` +
    `&viewbox=${TBILISI_VIEWBOX}&bounded=1&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AI-Trip-Planner/1.0 (tbilisi transit planner)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return NextResponse.json([] as GeocodeResult[]);
    const raw = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    const data: GeocodeResult[] = raw.map((r) => ({
      label: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }));
    cache.set(key, { at: now, data });
    return NextResponse.json(data);
  } catch (e) {
    console.error("[transit] geocode failed:", e);
    return NextResponse.json([] as GeocodeResult[]);
  }
}
```

- [ ] **Step 2: Manual smoke test**

Run: `npm run dev`, then in another shell:
`curl "http://localhost:3000/api/transit/geocode?q=Rustaveli"`
Expected: JSON array of `{label,lat,lng}` objects within Tbilisi. Short/empty query returns `[]`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/transit/geocode/route.ts
git commit -m "feat(transit): add Tbilisi-biased Nominatim geocode proxy"
```

---

## Task 6: Plan API route

**Files:**
- Create: `src/app/api/transit/plan/route.ts`

**Interfaces:**
- Consumes: `planJourney` from `@/lib/transit/client`.
- Produces: `POST /api/transit/plan` body `{ from: LatLng, to: LatLng, locale?: string }` → `{ plans: JourneyPlan[] }` or `TransitError` with status 400/503. Consumed by Task 8.

- [ ] **Step 1: Write the route**

Create `src/app/api/transit/plan/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { planJourney } from "@/lib/transit/client";
import type { LatLng } from "@/types/transit";

export const runtime = "nodejs";

function toLatLng(v: unknown): LatLng | null {
  if (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === "number" &&
    typeof v[1] === "number"
  ) {
    return [v[0], v[1]];
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const from = toLatLng((body as Record<string, unknown>)?.from);
  const to = toLatLng((body as Record<string, unknown>)?.to);
  const locale =
    typeof (body as Record<string, unknown>)?.locale === "string"
      ? ((body as Record<string, unknown>).locale as string)
      : "en";

  if (!from || !to) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const plans = await planJourney(from, to, locale);
  if (plans === null) {
    return NextResponse.json({ error: "transit_unavailable" }, { status: 503 });
  }
  return NextResponse.json({ plans });
}
```

- [ ] **Step 2: Manual smoke test**

With `npm run dev` running:
`curl -X POST http://localhost:3000/api/transit/plan -H 'content-type: application/json' -d '{"from":[41.6977,44.8015],"to":[41.7297,44.8010],"locale":"en"}'`
Expected: `{"plans":[...]}` with normalized legs, OR `{"error":"transit_unavailable"}` (status 503) if the API is down. Missing coords → `{"error":"bad_request"}` (400).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/transit/plan/route.ts
git commit -m "feat(transit): add journey plan API route"
```

---

## Task 7: Arrivals API route

**Files:**
- Create: `src/app/api/transit/arrivals/route.ts`

**Interfaces:**
- Consumes: `getArrivals` from `@/lib/transit/client`.
- Produces: `GET /api/transit/arrivals?stopId=…` → `{ arrivals: Arrival[] }` or `TransitError`. Consumed by Task 9 (`JourneyCard`).

- [ ] **Step 1: Write the route**

Create `src/app/api/transit/arrivals/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getArrivals } from "@/lib/transit/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const stopId = req.nextUrl.searchParams.get("stopId")?.trim();
  const locale = req.nextUrl.searchParams.get("locale") ?? "en";
  if (!stopId) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const arrivals = await getArrivals(stopId, locale);
  if (arrivals === null) {
    return NextResponse.json({ error: "transit_unavailable" }, { status: 503 });
  }
  return NextResponse.json({ arrivals });
}
```

- [ ] **Step 2: Manual smoke test**

`curl "http://localhost:3000/api/transit/arrivals?stopId=1946"`
Expected: `{"arrivals":[...]}` or `{"error":"transit_unavailable"}`. No `stopId` → 400.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/transit/arrivals/route.ts
git commit -m "feat(transit): add live arrivals API route"
```

---

## Task 8: RoutePlanner component (search + plan)

**Files:**
- Create: `src/components/transit/route-planner.tsx`
- Modify: `messages/en.json`, `messages/ka.json`, `messages/ru.json` (add `transit` namespace)

**Interfaces:**
- Consumes: `GET /api/transit/geocode`, `POST /api/transit/plan`; `GeocodeResult`, `JourneyPlan` types.
- Produces: `<RoutePlanner />` (default export named `RoutePlanner`), consumed by Task 10. Renders one `<JourneyCard>` (Task 9) per plan.

- [ ] **Step 1: Add i18n keys to all three message files**

Add this `transit` object to `messages/en.json`:

```json
"transit": {
  "planTitle": "Plan a route",
  "planSubtitle": "Get public-transport directions across Tbilisi.",
  "fromPlaceholder": "From — e.g. Rustaveli Avenue",
  "toPlaceholder": "To — e.g. Freedom Square",
  "swap": "Swap",
  "plan": "Get directions",
  "planning": "Finding routes…",
  "noResults": "No routes found. Try nearby landmarks.",
  "unavailable": "Live transit data is temporarily unavailable. Try again later or use the TTC app.",
  "walk": "Walk",
  "bus": "Bus",
  "metro": "Metro",
  "transfer": "Transfer",
  "nextArrival": "Next in {min} min",
  "scheduled": "Scheduled",
  "min": "min"
}
```

Add the Georgian translation to `messages/ka.json`:

```json
"transit": {
  "planTitle": "მარშრუტის დაგეგმვა",
  "planSubtitle": "მიიღეთ საზოგადოებრივი ტრანსპორტის მიმართულებები თბილისში.",
  "fromPlaceholder": "საიდან — მაგ. რუსთაველის გამზირი",
  "toPlaceholder": "სად — მაგ. თავისუფლების მოედანი",
  "swap": "გაცვლა",
  "plan": "მარშრუტის ჩვენება",
  "planning": "მარშრუტების ძებნა…",
  "noResults": "მარშრუტი ვერ მოიძებნა. სცადეთ ახლომდებარე ღირსშესანიშნაობები.",
  "unavailable": "ტრანსპორტის მონაცემები დროებით მიუწვდომელია. სცადეთ მოგვიანებით ან გამოიყენეთ TTC-ს აპლიკაცია.",
  "walk": "ფეხით",
  "bus": "ავტობუსი",
  "metro": "მეტრო",
  "transfer": "გადაჯდომა",
  "nextArrival": "შემდეგი {min} წუთში",
  "scheduled": "განრიგით",
  "min": "წთ"
}
```

Add the Russian translation to `messages/ru.json`:

```json
"transit": {
  "planTitle": "Построить маршрут",
  "planSubtitle": "Маршруты общественного транспорта по Тбилиси.",
  "fromPlaceholder": "Откуда — напр. проспект Руставели",
  "toPlaceholder": "Куда — напр. площадь Свободы",
  "swap": "Поменять",
  "plan": "Показать маршрут",
  "planning": "Поиск маршрутов…",
  "noResults": "Маршруты не найдены. Попробуйте ближайшие ориентиры.",
  "unavailable": "Данные транспорта временно недоступны. Попробуйте позже или используйте приложение TTC.",
  "walk": "Пешком",
  "bus": "Автобус",
  "metro": "Метро",
  "transfer": "Пересадка",
  "nextArrival": "Следующий через {min} мин",
  "scheduled": "По расписанию",
  "min": "мин"
}
```

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "require('./messages/en.json');require('./messages/ka.json');require('./messages/ru.json');console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Write the component**

Create `src/components/transit/route-planner.tsx`:

```tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDownUp, MapPin, Search } from "lucide-react";
import type { GeocodeResult, JourneyPlan } from "@/types/transit";
import { JourneyCard } from "./journey-card";

type Field = "from" | "to";

function useGeocode() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const search = useCallback((q: string, cb: (r: GeocodeResult[]) => void) => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 3) {
      cb([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/transit/geocode?q=${encodeURIComponent(q)}`);
        cb(res.ok ? await res.json() : []);
      } catch {
        cb([]);
      }
    }, 400);
  }, []);
  return search;
}

export function RoutePlanner() {
  const t = useTranslations("transit");
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";

  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [fromSel, setFromSel] = useState<GeocodeResult | null>(null);
  const [toSel, setToSel] = useState<GeocodeResult | null>(null);
  const [suggestions, setSuggestions] = useState<Record<Field, GeocodeResult[]>>({ from: [], to: [] });

  const [plans, setPlans] = useState<JourneyPlan[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const geocode = useGeocode();

  function onInput(field: Field, value: string) {
    if (field === "from") { setFromText(value); setFromSel(null); }
    else { setToText(value); setToSel(null); }
    geocode(value, (r) => setSuggestions((s) => ({ ...s, [field]: r })));
  }

  function pick(field: Field, r: GeocodeResult) {
    if (field === "from") { setFromText(r.label); setFromSel(r); }
    else { setToText(r.label); setToSel(r); }
    setSuggestions((s) => ({ ...s, [field]: [] }));
  }

  function swap() {
    setFromText(toText); setToText(fromText);
    setFromSel(toSel); setToSel(fromSel);
  }

  async function plan() {
    if (!fromSel || !toSel) return;
    setLoading(true); setError(false); setPlans(null);
    try {
      const res = await fetch("/api/transit/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          from: [fromSel.lat, fromSel.lng],
          to: [toSel.lat, toSel.lng],
          locale,
        }),
      });
      if (!res.ok) { setError(true); return; }
      const data = (await res.json()) as { plans: JourneyPlan[] };
      setPlans(data.plans);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-xl px-4 py-3 text-[15px] outline-none";
  const inputStyle = {
    background: "var(--site-bg-elevated)",
    border: "1px solid var(--site-border-06)",
    color: "var(--site-text)",
  } as const;

  return (
    <div>
      <h2 className="text-2xl font-bold" style={{ color: "var(--site-text)" }}>{t("planTitle")}</h2>
      <p className="mt-1 text-[14px]" style={{ color: "var(--site-text-50)" }}>{t("planSubtitle")}</p>

      <div className="mt-6 flex flex-col gap-3">
        {(["from", "to"] as Field[]).map((field) => (
          <div key={field} className="relative">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" style={{ color: "var(--site-text-40)" }} />
              <input
                className={inputCls}
                style={inputStyle}
                placeholder={field === "from" ? t("fromPlaceholder") : t("toPlaceholder")}
                value={field === "from" ? fromText : toText}
                onChange={(e) => onInput(field, e.target.value)}
              />
            </div>
            {suggestions[field].length > 0 && (
              <ul
                className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl"
                style={{ background: "var(--site-bg-elevated)", border: "1px solid var(--site-border-06)" }}
              >
                {suggestions[field].map((r, i) => (
                  <li key={i}>
                    <button
                      className="block w-full px-4 py-2.5 text-left text-[13px] hover:opacity-80"
                      style={{ color: "var(--site-text)" }}
                      onClick={() => pick(field, r)}
                    >
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        <div className="flex items-center gap-3">
          <button
            onClick={swap}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px]"
            style={{ background: "var(--site-bg-elevated)", color: "var(--site-text-50)" }}
          >
            <ArrowDownUp className="size-3.5" /> {t("swap")}
          </button>
          <button
            onClick={plan}
            disabled={!fromSel || !toSel || loading}
            className="flex items-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-40"
            style={{ background: "#0891B2", boxShadow: "0 4px 16px rgba(8,145,178,0.25)" }}
          >
            <Search className="size-4" /> {loading ? t("planning") : t("plan")}
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {error && (
          <p className="rounded-xl p-4 text-[14px]" style={{ background: "rgba(181,39,29,0.1)", color: "#B5271D" }}>
            {t("unavailable")}
          </p>
        )}
        {plans && plans.length === 0 && !error && (
          <p className="text-[14px]" style={{ color: "var(--site-text-50)" }}>{t("noResults")}</p>
        )}
        {plans?.map((p) => <JourneyCard key={p.id} plan={p} locale={locale} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck** (JourneyCard is created in Task 9; this task will not fully typecheck until then — verify after Task 9. For now confirm no syntax errors by lint.)

Run: `npx eslint src/components/transit/route-planner.tsx`
Expected: no errors (an unresolved `./journey-card` import is resolved in Task 9).

- [ ] **Step 5: Commit**

```bash
git add src/components/transit/route-planner.tsx messages/en.json messages/ka.json messages/ru.json
git commit -m "feat(transit): add RoutePlanner UI with geocode search and i18n"
```

---

## Task 9: JourneyCard component (legs + live arrivals)

**Files:**
- Create: `src/components/transit/journey-card.tsx`

**Interfaces:**
- Consumes: `JourneyPlan`, `JourneyLeg`, `Arrival` types; `GET /api/transit/arrivals`.
- Produces: `<JourneyCard plan={JourneyPlan} locale={string} />` (named export `JourneyCard`), consumed by Task 8.

- [ ] **Step 1: Write the component**

Create `src/components/transit/journey-card.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bus, Footprints, TramFront, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { JourneyPlan, JourneyLeg, Arrival } from "@/types/transit";

function LegIcon({ mode }: { mode: JourneyLeg["mode"] }) {
  if (mode === "walk") return <Footprints className="size-4" style={{ color: "var(--site-text-50)" }} />;
  if (mode === "metro") return <TramFront className="size-4" style={{ color: "#7C3AED" }} />;
  if (mode === "bus") return <Bus className="size-4" style={{ color: "#0891B2" }} />;
  return <ArrowRight className="size-4" style={{ color: "var(--site-text-40)" }} />;
}

function useArrivals(stopId: string | undefined, locale: string) {
  const [arrivals, setArrivals] = useState<Arrival[] | null>(null);
  useEffect(() => {
    if (!stopId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/transit/arrivals?stopId=${encodeURIComponent(stopId)}&locale=${locale}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { arrivals: Arrival[] };
        if (!cancelled) setArrivals(data.arrivals);
      } catch { /* silent — arrivals are optional enrichment */ }
    })();
    return () => { cancelled = true; };
  }, [stopId, locale]);
  return arrivals;
}

export function JourneyCard({ plan, locale }: { plan: JourneyPlan; locale: string }) {
  const t = useTranslations("transit");
  const firstTransit = plan.legs.find((l) => l.mode === "bus" || l.mode === "metro");
  const arrivals = useArrivals(firstTransit?.fromStopId, locale);
  const nextMin = arrivals?.find((a) => typeof a.minutes === "number")?.minutes;

  function label(mode: JourneyLeg["mode"]) {
    if (mode === "walk") return t("walk");
    if (mode === "bus") return t("bus");
    if (mode === "metro") return t("metro");
    return t("transfer");
  }

  return (
    <motion.div
      className="rounded-2xl p-5"
      style={{ background: "var(--site-bg-elevated)", border: "1px solid var(--site-border-06)" }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold" style={{ color: "var(--site-text)" }}>
          {plan.durationMin ? `${plan.durationMin} ${t("min")}` : ""}
        </p>
        {typeof nextMin === "number" && (
          <span
            className="rounded-full px-3 py-1 text-[12px] font-semibold"
            style={{ background: "rgba(8,145,178,0.15)", color: "#0891B2" }}
          >
            {t("nextArrival", { min: nextMin })}
          </span>
        )}
      </div>

      <ol className="mt-4 flex flex-col gap-3">
        {plan.legs.map((leg, i) => (
          <li key={i} className="flex items-center gap-3">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--site-bg-base)" }}
            >
              <LegIcon mode={leg.mode} />
            </div>
            <div className="min-w-0">
              <p className="text-[14px]" style={{ color: "var(--site-text)" }}>
                {label(leg.mode)}
                {leg.line ? ` ${leg.line}` : ""}
                {leg.toStop ? ` → ${leg.toStop}` : ""}
              </p>
              {leg.durationMin ? (
                <p className="text-[12px]" style={{ color: "var(--site-text-50)" }}>
                  {leg.durationMin} {t("min")}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </motion.div>
  );
}
```

- [ ] **Step 2: Typecheck the whole transit surface (Tasks 8 + 9 together)**

Run: `npx tsc --noEmit`
Expected: PASS — `RoutePlanner`'s `./journey-card` import now resolves.

- [ ] **Step 3: Commit**

```bash
git add src/components/transit/journey-card.tsx
git commit -m "feat(transit): add JourneyCard with leg timeline and live arrivals"
```

---

## Task 10: "Getting Around" page restructure

**Files:**
- Create: `src/components/site/getting-around.tsx`
- Modify: `src/app/[locale]/tickets/page.tsx`
- Modify: `messages/en.json`, `messages/ka.json`, `messages/ru.json` (add `gettingAround` namespace + update `tickets.heading` copy if desired)
- Modify: nav/header component (find and update the "Tickets" label)

**Interfaces:**
- Consumes: `TicketsSearch` from `@/components/site/tickets-search`; `RoutePlanner` from `@/components/transit/route-planner`; `TicketOption` type.
- Produces: `<GettingAround tickets={TicketOption[]} />` (named export), rendered by the page.

- [ ] **Step 1: Add `gettingAround` i18n keys to all three files**

`messages/en.json`:

```json
"gettingAround": {
  "eyebrow": "Getting Around",
  "heading": "Getting",
  "headingEm": "Around",
  "description": "Plan public-transport routes across Tbilisi, buy transit passes, and book intercity tickets.",
  "cityTab": "City Transportation",
  "citySubtitle": "Public transport within Tbilisi — passes and route planning.",
  "fromTab": "Travel from Tbilisi",
  "fromSubtitle": "Bus and railway tickets to other Georgian cities.",
  "passes": "Transit passes"
}
```

`messages/ka.json`:

```json
"gettingAround": {
  "eyebrow": "გადაადგილება",
  "heading": "გადაადგილება",
  "headingEm": "ქალაქში",
  "description": "დაგეგმეთ საზოგადოებრივი ტრანსპორტის მარშრუტები თბილისში, იყიდეთ სამგზავრო ბარათები და დაჯავშნეთ ბილეთები.",
  "cityTab": "ქალაქის ტრანსპორტი",
  "citySubtitle": "საზოგადოებრივი ტრანსპორტი თბილისში — ბარათები და მარშრუტები.",
  "fromTab": "მგზავრობა თბილისიდან",
  "fromSubtitle": "ავტობუსისა და მატარებლის ბილეთები სხვა ქალაქებში.",
  "passes": "სამგზავრო ბარათები"
}
```

`messages/ru.json`:

```json
"gettingAround": {
  "eyebrow": "Транспорт",
  "heading": "Транспорт",
  "headingEm": "по городу",
  "description": "Планируйте маршруты общественного транспорта по Тбилиси, покупайте проездные и билеты между городами.",
  "cityTab": "Городской транспорт",
  "citySubtitle": "Общественный транспорт Тбилиси — проездные и маршруты.",
  "fromTab": "Поездки из Тбилиси",
  "fromSubtitle": "Билеты на автобусы и поезда в другие города Грузии.",
  "passes": "Проездные билеты"
}
```

- [ ] **Step 2: Verify JSON valid**

Run: `node -e "require('./messages/en.json');require('./messages/ka.json');require('./messages/ru.json');console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Write the GettingAround wrapper**

Create `src/components/site/getting-around.tsx`. Note the split: this reuses the existing `TicketsSearch` for intercity, and renders a dedicated passes list + `RoutePlanner` for city:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TicketsSearch } from "@/components/site/tickets-search";
import { RoutePlanner } from "@/components/transit/route-planner";
import type { TicketOption } from "@/types";

export function GettingAround({ tickets }: { tickets: TicketOption[] }) {
  const t = useTranslations("gettingAround");
  const intercity = tickets.filter((x) => x.type === "bus" || x.type === "rail");
  const passes = tickets.filter((x) => x.type === "transit-pass");

  return (
    <Tabs defaultValue="city" className="w-full">
      <TabsList>
        <TabsTrigger value="city">{t("cityTab")}</TabsTrigger>
        <TabsTrigger value="from">{t("fromTab")}</TabsTrigger>
      </TabsList>

      <TabsContent value="city">
        <p className="mb-8 text-[14px]" style={{ color: "var(--site-text-50)" }}>{t("citySubtitle")}</p>
        <div className="grid gap-12 lg:grid-cols-2">
          <RoutePlanner />
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--site-text)" }}>{t("passes")}</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <TicketsSearch tickets={passes} />
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="from">
        <p className="mb-8 text-[14px]" style={{ color: "var(--site-text-50)" }}>{t("fromSubtitle")}</p>
        <TicketsSearch tickets={intercity} />
      </TabsContent>
    </Tabs>
  );
}
```

> **Note on `TicketsSearch`:** it currently renders its own bus/rail/pass tabs internally. When passed only passes (city) or only bus/rail (intercity), verify its internal default tab still shows content. If its internal tabs conflict with the new outer tabs, simplify `TicketsSearch` in this step to render the passed subset directly (a passes grid, or the intercity search) rather than re-tabbing. Keep the change minimal and within this file + `tickets-search.tsx`.

- [ ] **Step 4: Update the page**

Replace `src/app/[locale]/tickets/page.tsx` body to use the new component and namespace. Full file:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { TicketModel } from "@/lib/models/ticket";
import { mockBusTickets, mockRailTickets, mockTransitPasses } from "@/lib/mock/tickets";
import { GettingAround } from "@/components/site/getting-around";
import { serializeDoc } from "@/lib/serialize";
import type { TicketOption } from "@/types";

export default async function GettingAroundPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await connectDB();
  let tickets = serializeDoc<TicketOption[]>(await TicketModel.find().lean());
  if (tickets.length === 0) {
    tickets = [...mockBusTickets, ...mockRailTickets, ...mockTransitPasses];
  }

  const t = await getTranslations({ locale, namespace: "gettingAround" });

  return (
    <div style={{ background: "var(--site-bg-base)", minHeight: "100vh" }}>
      <div className="relative flex items-end overflow-hidden" style={{ height: 360, paddingTop: 72 }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(10,10,10,0.95)), url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1800&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-12 md:px-12">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[3px]" style={{ color: "#B5271D" }}>
            {t("eyebrow")}
          </p>
          <h1 className="font-display leading-tight text-white" style={{ fontSize: "clamp(42px, 7vw, 80px)", letterSpacing: "-2px" }}>
            {t("heading")} <em className="italic" style={{ color: "#F5C842" }}>{t("headingEm")}</em>
          </h1>
          <p className="mt-3 max-w-xl text-white/60" style={{ fontSize: "clamp(14px, 1.5vw, 16px)" }}>
            {t("description")}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12 md:px-12">
        <GettingAround tickets={tickets} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update the nav label**

Find the header nav item linking to `/tickets`:

Run: `grep -rn "tickets" src/components/site --include=*.tsx | grep -iE "href|Link|nav"`

In the matched header/nav file, change the visible label from the tickets translation to `gettingAround.eyebrow` (or a new `nav.gettingAround` key added to all three message files). Keep the `href="/tickets"` unchanged.

- [ ] **Step 6: Verify build + typecheck**

Run: `npx tsc --noEmit && npm run build`
Expected: build succeeds. Visit `/en/tickets` — page titled "Getting Around", two tabs, City tab shows route planner + passes, From tab shows intercity tickets.

- [ ] **Step 7: Commit**

```bash
git add src/components/site/getting-around.tsx src/app/[locale]/tickets/page.tsx src/components/site/tickets-search.tsx messages/en.json messages/ka.json messages/ru.json
git commit -m "feat(transit): restructure tickets into Getting Around hub with route planner"
```

---

## Task 11: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Full flow smoke test**

Run `npm run dev`. In the browser at `/en/tickets`:
1. City Transportation tab is default.
2. Type "Rustaveli" in From → suggestions appear → select one.
3. Type "Freedom Square" in To → select one.
4. Click "Get directions" → journey cards render with leg timeline.
5. If a bus/metro leg has a stop id, a "Next in X min" badge appears.
6. Switch to "Travel from Tbilisi" → bus/rail intercity tickets show, Buy works as before.
7. Switch locale to `/ka/tickets` and `/ru/tickets` → all labels translated, no missing-key warnings in console.

- [ ] **Step 2: Failure-path check**

Temporarily break the plan route (e.g. set `TIMEOUT_MS = 1` in `client.ts`), reload, plan a route → the "temporarily unavailable" message shows, page does not crash. Revert the change.

- [ ] **Step 3: Final commit (if any fixture/key adjustments were made)**

```bash
git add -A
git commit -m "test(transit): end-to-end verification adjustments"
```

---

## Self-Review

**Spec coverage:**
- Goal (plan A→B + arrivals) → Tasks 3–9. ✅
- Page restructure (Getting Around, City / From sections, bucket by type, keep URL) → Task 10. ✅
- Data source: TTC API direct via fetch (ttc-api pkg dropped as broken), key in env, server-side → Tasks 1, 4. ✅
- Approach A thin proxy → Tasks 4–7. ✅
- 3 API routes (geocode/plan/arrivals) → Tasks 5, 6, 7. ✅
- `client.ts` swappable seam + 5s timeout → Task 4. ✅
- `normalize.ts` defensive + fixtures + unit tests → Tasks 1, 3. ✅
- `types/transit.ts` → Task 2. ✅
- RoutePlanner + JourneyCard components → Tasks 8, 9. ✅
- Nominatim, no key, Tbilisi bbox, cache, User-Agent, server-only → Task 5. ✅
- Error handling: 5s timeout, typed error, graceful UI, defensive normalize → Tasks 3,4,6,7,8; failure path Task 11. ✅
- i18n `transit` + `gettingAround` in all 3 files, ka/en/ru→en locale mapping → Tasks 8, 10, 4. ✅
- Testing: normalize unit tests, no live CI calls → Task 3; manual smoke Tasks 5,6,7,11. ✅
- First step = establish confirmed /plan shape + fixture (live probe impossible: broken pkg + geo firewall) → Task 1. ✅
- YAGNI cuts (no saved routes/fares/caching) → honored, none added. ✅

**Placeholder scan:** No TBD/TODO/placeholder markers. Task 1's fixture and Task 3's normalize are concrete against the confirmed `BusPlan` shape (no `// FIXTURE:` reconciliation markers remain).

**Type consistency:** `normalizePlan(raw: unknown): JourneyPlan[]`, `planJourney → JourneyPlan[] | null`, `getArrivals → Arrival[] | null`, `<JourneyCard plan={} locale={} />`, `<RoutePlanner />`, `<GettingAround tickets={} />` — names/signatures match across Tasks 2–10.
