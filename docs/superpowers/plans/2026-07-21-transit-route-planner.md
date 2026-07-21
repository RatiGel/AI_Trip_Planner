# Tbilisi Transit Route Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public-transport route planner (start→destination journeys with live arrivals) to the site, restructured into a "Getting Around" hub alongside the Tbilisi transit pass.

**Architecture:** A thin server-side proxy over the unofficial `ttc-api` npm package. Three Next.js API routes (`geocode`, `plan`, `arrivals`) wrap OSM Nominatim + TTC calls; a defensive `normalize.ts` converts TTC's undocumented `plan()` output into our typed `JourneyPlan`. The existing `/tickets` page is retitled "Getting Around" and split into two sections — **City Transportation** (transit passes + the new route planner) and **Travel from Tbilisi** (bus/rail tickets) — bucketed by `TicketOption.type`.

**Tech Stack:** Next.js 16 (App Router, `runtime = "nodejs"`), TypeScript, `ttc-api`, OSM Nominatim, next-intl 4, `@base-ui/react` Tabs, framer-motion, Tailwind v4. Unit tests via Node's built-in `node:test` runner executed through `tsx` (already a dependency — no new test framework).

## Global Constraints

- Next.js 16: `params`/`searchParams` in page props are **Promises** — always `await`.
- Import `Link`, `useRouter`, `redirect`, `usePathname` from `@/i18n/navigation`, **never** `next/navigation` (except `useParams`, which the codebase uses directly in client components).
- All API routes touching `ttc-api` MUST declare `export const runtime = "nodejs"`.
- i18n: add every new key to **all three** message files (`messages/en.json`, `messages/ka.json`, `messages/ru.json`) together.
- `ttc-api` is **unofficial, no auth**. Every TTC call is wrapped with a 5s timeout and try/catch; on any failure return a typed `{ error }` and never throw to the page.
- Keep the `/tickets` URL. Only the page title, heading, and nav label change to "Getting Around".
- No data migration: tickets are bucketed by existing `TicketOption.type` (`"transit-pass"` → City Transportation; `"bus"`/`"rail"` → Travel from Tbilisi).
- Server-side only for `ttc-api` and Nominatim — never call either from the browser.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/types/transit.ts` | Typed shapes: `LatLng`, `GeocodeResult`, `JourneyLeg`, `JourneyPlan`, `Arrival`, `TransitError`. |
| `src/lib/transit/client.ts` | Singleton `ttc` wrapper: locale mapping, 5s-timeout + try/catch helpers `planJourney`, `getArrivals`. The one swappable seam. |
| `src/lib/transit/normalize.ts` | Pure function `normalizePlan(raw): JourneyPlan[]` — defensive conversion of TTC output. |
| `src/lib/transit/normalize.test.ts` | `node:test` unit tests against a captured fixture. |
| `src/lib/transit/__fixtures__/plan-sample.json` | Real captured `ttc.plan()` output (from probe script). |
| `src/app/api/transit/geocode/route.ts` | `GET` Nominatim proxy, Tbilisi-biased, in-memory cache. |
| `src/app/api/transit/plan/route.ts` | `POST` → `planJourney` → `normalizePlan`. |
| `src/app/api/transit/arrivals/route.ts` | `GET` → `getArrivals`. |
| `src/components/transit/route-planner.tsx` | Client UI: two geocode search inputs, swap, Plan button, results. |
| `src/components/transit/journey-card.tsx` | One journey: leg timeline + live arrival badge. |
| `src/components/site/getting-around.tsx` | Client wrapper: two sections (City Transportation / Travel from Tbilisi), mounts `TicketsSearch` + `RoutePlanner`. |
| `src/app/[locale]/tickets/page.tsx` | Retitle "Getting Around"; render `GettingAround`. |
| `scripts/probe-ttc-plan.ts` | Throwaway: call `ttc.plan()` live, print JSON to capture the fixture. |
| `messages/{en,ka,ru}.json` | New `gettingAround` + `transit` namespaces. |

---

## Task 1: Install dependency and probe the live TTC `plan()` shape

**Files:**
- Modify: `package.json` (add `ttc-api` dep + `test` script)
- Create: `scripts/probe-ttc-plan.ts`
- Create: `src/lib/transit/__fixtures__/plan-sample.json`

**Interfaces:**
- Produces: a captured JSON fixture that Task 3 (`normalize.ts`) and Task 4 (tests) design against.

- [ ] **Step 1: Install the package**

```bash
npm install ttc-api
```

- [ ] **Step 2: Add a test script to package.json**

In `package.json` `"scripts"`, add:

```json
"test": "node --import tsx --test \"src/**/*.test.ts\""
```

- [ ] **Step 3: Write the probe script**

Create `scripts/probe-ttc-plan.ts`:

```ts
import { ttc } from "ttc-api";

// Rustaveli area -> Station Square area, real Tbilisi coordinates.
async function main() {
  ttc.setLocale("en");
  const journey = await ttc.plan({
    from: [41.6977, 44.8015],
    to: [41.7297, 44.8010],
    locale: "en",
  });
  console.log(JSON.stringify(journey, null, 2));

  const stops = await ttc.stops();
  console.log("STOPS_SAMPLE", JSON.stringify(stops?.slice?.(0, 2), null, 2));
}

main().catch((e) => {
  console.error("PROBE_FAILED", e);
  process.exit(1);
});
```

- [ ] **Step 4: Run the probe and capture output**

Run: `npx tsx scripts/probe-ttc-plan.ts`

Expected: JSON printed to stdout showing the journey structure (legs, stops, coordinates, times) and a 2-stop sample.

- If it prints `PROBE_FAILED`, the unofficial API is down or changed. Stop and report — the rest of the plan depends on this shape. Do not fabricate a fixture.

- [ ] **Step 5: Save the captured journey JSON as the fixture**

Copy the journey object (the first JSON block, before `STOPS_SAMPLE`) into `src/lib/transit/__fixtures__/plan-sample.json`. This is real data — do not hand-edit it.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json scripts/probe-ttc-plan.ts src/lib/transit/__fixtures__/plan-sample.json
git commit -m "chore(transit): add ttc-api dep and capture live plan() fixture"
```

---

## Task 2: Define transit types

**Files:**
- Create: `src/types/transit.ts`

**Interfaces:**
- Produces: `LatLng`, `GeocodeResult`, `LegMode`, `JourneyLeg`, `JourneyPlan`, `Arrival`, `TransitError` — consumed by Tasks 3, 5, 6, 7, 8.

> **Note:** After Task 1's fixture is captured, adjust the *optional* fields below to match real data field names if they differ. The required fields and exported names must stay as written — later tasks depend on them.

- [ ] **Step 1: Write the type file**

Create `src/types/transit.ts`:

```ts
// Server-normalized transit shapes. TTC's raw plan() output is undocumented;
// normalizePlan() maps it into these. Keep field names stable — API routes and
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

Create `src/lib/transit/normalize.test.ts`. Adjust the fixture-shape assertions in the FIRST test to match the real captured JSON's top-level structure; the defensive tests below stay as written:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePlan } from "./normalize";
import sample from "./__fixtures__/plan-sample.json";

test("normalizes the real captured plan() fixture into JourneyPlan[]", () => {
  const plans = normalizePlan(sample);
  assert.ok(Array.isArray(plans), "returns an array");
  assert.ok(plans.length > 0, "produces at least one plan");
  const first = plans[0];
  assert.ok(typeof first.id === "string" && first.id.length > 0, "plan has an id");
  assert.ok(Array.isArray(first.legs) && first.legs.length > 0, "plan has legs");
  for (const leg of first.legs) {
    assert.ok(
      ["walk", "bus", "metro", "unknown"].includes(leg.mode),
      `leg mode is a known value, got ${leg.mode}`
    );
  }
});

test("returns [] for null / non-object input without throwing", () => {
  assert.deepEqual(normalizePlan(null), []);
  assert.deepEqual(normalizePlan(undefined), []);
  assert.deepEqual(normalizePlan(42), []);
  assert.deepEqual(normalizePlan("nope"), []);
});

test("maps unknown leg types to mode 'unknown' instead of throwing", () => {
  const raw = { plans: [{ legs: [{ mode: "teleport" }] }] };
  const out = normalizePlan(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].legs[0].mode, "unknown");
});

test("skips malformed legs but keeps the plan", () => {
  const raw = { plans: [{ legs: [null, { mode: "walk" }, 5] }] };
  const out = normalizePlan(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].legs.length, 1);
  assert.equal(out[0].legs[0].mode, "walk");
});

test("assigns stable ids per plan index", () => {
  const raw = { plans: [{ legs: [{ mode: "walk" }] }, { legs: [{ mode: "bus" }] }] };
  const out = normalizePlan(raw);
  assert.equal(out[0].id, "plan-0");
  assert.equal(out[1].id, "plan-1");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './normalize'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/transit/normalize.ts`. The `readPlansArray`, `readLegsArray`, and field-mapping lines marked `// FIXTURE:` must be reconciled with the real captured JSON key names from Task 1 (the raw API may use `itineraries`/`segments` etc. instead of `plans`/`legs`):

```ts
import type { JourneyPlan, JourneyLeg, LegMode } from "@/types/transit";

function toMode(raw: unknown): LegMode {
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("walk") || s.includes("foot")) return "walk";
  if (s.includes("metro") || s.includes("subway") || s.includes("rail")) return "metro";
  if (s.includes("bus")) return "bus";
  return "unknown";
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function normalizeLeg(raw: unknown): JourneyLeg | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    mode: toMode(r.mode ?? r.type ?? r.vehicleType), // FIXTURE: confirm key
    line: str(r.line ?? r.route ?? r.shortName),      // FIXTURE: confirm key
    fromStop: str(r.fromStop ?? r.from),              // FIXTURE: confirm key
    toStop: str(r.toStop ?? r.to),                    // FIXTURE: confirm key
    fromStopId: str(r.fromStopId ?? r.stopId),        // FIXTURE: confirm key
    durationMin: num(r.durationMin ?? r.duration),    // FIXTURE: confirm key
    distanceM: num(r.distanceM ?? r.distance),        // FIXTURE: confirm key
  };
}

function readPlansArray(raw: Record<string, unknown>): unknown[] {
  // FIXTURE: confirm the container key. Try common shapes, else wrap single.
  const candidates = [raw.plans, raw.itineraries, raw.routes, raw.results];
  for (const c of candidates) if (Array.isArray(c)) return c;
  return [raw]; // single plan returned bare
}

function readLegsArray(plan: Record<string, unknown>): unknown[] {
  const candidates = [plan.legs, plan.segments, plan.steps];
  for (const c of candidates) if (Array.isArray(c)) return c;
  return [];
}

export function normalizePlan(raw: unknown): JourneyPlan[] {
  if (!raw || typeof raw !== "object") return [];
  const rawPlans = readPlansArray(raw as Record<string, unknown>);

  const plans: JourneyPlan[] = [];
  rawPlans.forEach((p, i) => {
    if (!p || typeof p !== "object") return;
    const pr = p as Record<string, unknown>;
    const legs = readLegsArray(pr)
      .map(normalizeLeg)
      .filter((l): l is JourneyLeg => l !== null);
    if (legs.length === 0) return;
    plans.push({
      id: `plan-${i}`,
      durationMin: num(pr.durationMin ?? pr.duration),
      legs,
    });
  });
  return plans;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all normalize tests). If the fixture test fails on structure, fix the `// FIXTURE:` key names to match the real JSON — do not weaken the assertions.

- [ ] **Step 5: Commit**

```bash
git add src/lib/transit/normalize.ts src/lib/transit/normalize.test.ts
git commit -m "feat(transit): add defensive normalizePlan with unit tests"
```

---

## Task 4: Write the `ttc-api` client wrapper

**Files:**
- Create: `src/lib/transit/client.ts`

**Interfaces:**
- Consumes: `LatLng`, `Arrival`, `JourneyPlan` from `@/types/transit`; `normalizePlan` from `./normalize`.
- Produces:
  - `planJourney(from: LatLng, to: LatLng, locale: string): Promise<JourneyPlan[] | null>` (null = failure)
  - `getArrivals(stopId: string, locale: string): Promise<Arrival[] | null>` (null = failure)
  - Consumed by Task 6 and Task 7.

- [ ] **Step 1: Write the wrapper**

Create `src/lib/transit/client.ts`:

```ts
import { ttc } from "ttc-api";
import type { LatLng, Arrival, JourneyPlan } from "@/types/transit";
import { normalizePlan } from "./normalize";

const TIMEOUT_MS = 5000;

function ttcLocale(locale: string): "ka" | "en" {
  return locale === "ka" ? "ka" : "en"; // ru falls back to en
}

async function withTimeout<T>(p: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("ttc_timeout")), TIMEOUT_MS);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export async function planJourney(
  from: LatLng,
  to: LatLng,
  locale: string
): Promise<JourneyPlan[] | null> {
  try {
    const loc = ttcLocale(locale);
    const raw = await withTimeout(ttc.plan({ from, to, locale: loc }));
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
      line: typeof a.line === "string" ? a.line : undefined,
      minutes: typeof a.minutes === "number" ? a.minutes : undefined,
      realtime: a.realtime !== false,
      destination: typeof a.destination === "string" ? a.destination : undefined,
    }));
}

export async function getArrivals(
  stopId: string,
  locale: string
): Promise<Arrival[] | null> {
  try {
    const loc = ttcLocale(locale);
    const raw = await withTimeout(ttc.arrivalTimes({ stopId, locale: loc }));
    return normalizeArrivals(raw);
  } catch (e) {
    console.error("[transit] getArrivals failed:", e);
    return null;
  }
}
```

> **Note:** After Task 1's probe, reconcile the `normalizeArrivals` field names (`line`/`minutes`/`realtime`/`destination`) with the `arrivalTimes()` sample if they differ.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/transit/client.ts
git commit -m "feat(transit): add timeout-guarded ttc-api client wrapper"
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
- Data source `ttc-api`, no key, server-side → Tasks 1, 4. ✅
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
- First step = probe live pl() shape → Task 1. ✅
- YAGNI cuts (no saved routes/fares/caching) → honored, none added. ✅

**Placeholder scan:** `// FIXTURE:` markers are intentional reconciliation points tied to Task 1's real capture, each with concrete fallback code — not placeholders. No TBD/TODO left.

**Type consistency:** `normalizePlan(raw: unknown): JourneyPlan[]`, `planJourney → JourneyPlan[] | null`, `getArrivals → Arrival[] | null`, `<JourneyCard plan={} locale={} />`, `<RoutePlanner />`, `<GettingAround tickets={} />` — names/signatures match across Tasks 2–10.
