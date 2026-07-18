# Listed-Places Priority in AI Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make DB-listed places always outrank any future external/map-sourced place in AI chat itinerary candidates, and leave a clean, typed seam for adding an external place source later — with zero behavior change today (external source is a stub returning nothing).

**Architecture:** `getCandidatePlaces()` in `src/lib/places/candidates.ts` currently queries Mongo and returns a ranked `Place[]`. It becomes: query Mongo → tag as `source: "listed"` → concatenate with a new `getExternalCandidates()` stub (tagged `source: "external"`, always `[]`) → cap at existing max. A new `PlaceCandidate` type (`Place & { source: "listed" | "external" }`) carries the tag through the pipeline without touching the widely-used base `Place` type. Consumers (`route-planner.ts`, `route.ts`) already treat candidates structurally as `Place[]`, so they keep working unchanged; only `generateItinerary`/`buildFallbackItinerary`'s parameter types get widened to `PlaceCandidate[]` where it's cheap to do so for future-proofing.

**Tech Stack:** TypeScript, Next.js 16, MongoDB/Mongoose, no new dependencies.

## Global Constraints

- No UI/badge changes — ranking/type change only, no visible chat flow change.
- No external provider (Google Places, Foursquare, etc.) is wired up — `getExternalCandidates()` must return `[]` unconditionally.
- No featured/paid weighting change — existing `popularityScore()`-based sort stays as-is within the listed tier.
- Listed candidates must never be displaced or reordered below external ones — concatenation order (`listed` first) is the priority mechanism, not a sort key.
- Do not modify the base `Place` type — it's used broadly (RouteStop, admin, DB layer); introduce a narrower `PlaceCandidate` type instead.

---

### Task 1: Add `PlaceCandidate` type

**Files:**
- Modify: `src/types/index.ts` (add after the `Place` interface, i.e. after line 109)

**Interfaces:**
- Produces: `export interface PlaceCandidate extends Place { source: "listed" | "external"; }` — consumed by Task 2 and Task 3.

- [ ] **Step 1: Add the type**

In `src/types/index.ts`, immediately after the closing brace of `Place` (line 109), add:

```ts
/** A candidate place surfaced to the itinerary pipeline, tagged by where it
 *  came from. "listed" candidates (our DB) always rank ahead of "external"
 *  ones (future map/API sources) — see lib/places/candidates.ts. */
export interface PlaceCandidate extends Place {
  source: "listed" | "external";
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (the type is additive and unused so far).

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add PlaceCandidate with source tag"
```

---

### Task 2: Tag listed candidates and add the external-source stub

**Files:**
- Modify: `src/lib/places/candidates.ts`
- Test: `src/lib/places/candidates.test.ts` (new)

**Interfaces:**
- Consumes: `PlaceCandidate` from Task 1 (`@/types`).
- Produces:
  - `getCandidatePlaces(prefs: TravelPreferences): Promise<PlaceCandidate[]>` (same name, widened return type — call sites in `route.ts` and `route-planner.ts` are unaffected since they only read `Place` fields already present on `PlaceCandidate`).
  - `getExternalCandidates(prefs: TravelPreferences): Promise<PlaceCandidate[]>` (new, exported, always resolves to `[]`).
  - `toAICandidate(place: Place)` — unchanged signature/behavior.

This project has no test suite configured yet (per `CLAUDE.md`: "No test suite is configured yet"). Rather than introduce a new test framework as a side effect of this task, verification is manual (Step 2/4 below use `tsx` one-off scripts against the real dev DB, matching how `scripts/seed.ts` is already run in this repo). Skip creating `candidates.test.ts`.

- [ ] **Step 1: Write a manual verification script**

Create `scripts/verify-candidates.ts`:

```ts
import { getCandidatePlaces, getExternalCandidates } from "@/lib/places/candidates";

async function main() {
  const prefs = { citySlug: "tbilisi", days: 3, interests: "food and history" };

  const listed = await getCandidatePlaces(prefs);
  console.log(`listed candidates: ${listed.length}`);
  console.log("all tagged 'listed':", listed.every((c) => c.source === "listed"));

  const external = await getExternalCandidates(prefs);
  console.log(`external candidates: ${external.length} (expected 0)`);

  process.exit(0);
}

main();
```

- [ ] **Step 2: Run it against current code to confirm it fails**

Run: `npx tsx --env-file=.env.local scripts/verify-candidates.ts`
Expected: TypeScript error — `getExternalCandidates` does not exist yet, and `listed.every((c) => c.source === "listed")` fails to compile since `Place` has no `source` field.

- [ ] **Step 3: Implement the tagging and stub**

Replace the full contents of `src/lib/places/candidates.ts` with:

```ts
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { popularityScore } from "@/lib/places/visit-duration";
import { PUBLISHED } from "@/lib/places/published";
import type { CategorySlug, Place, PlaceCandidate, TravelPreferences } from "@/types";

function toPlace(doc: Record<string, unknown>): Place {
  const { _id, ...rest } = doc;
  return { ...(rest as Omit<Place, "id">), id: String(_id) };
}

const MAX_CANDIDATES = 40;

/** DB-listed places — always ranked ahead of external candidates. */
async function getListedCandidates(
  prefs: TravelPreferences,
): Promise<PlaceCandidate[]> {
  await connectDB();

  // PUBLISHED carries its own $or, so AND it with the category $or rather than
  // assigning a second top-level $or (which would silently overwrite).
  const filter: Record<string, unknown> = {
    citySlug: prefs.citySlug,
    $and: [PUBLISHED],
  };

  if (prefs.categories?.length) {
    (filter.$and as Record<string, unknown>[]).push({
      $or: [{ categories: { $in: prefs.categories } }],
    });
  }

  const docs = await PlaceModel.find(filter).lean();
  const places = docs.map((d) => toPlace(d as Record<string, unknown>));

  return places
    .sort((a, b) => popularityScore(b) - popularityScore(a))
    .map((p) => ({ ...p, source: "listed" as const }));
}

/**
 * Placeholder for a future external place source (e.g. Google Places,
 * Foursquare) used to fill gaps when listed candidates are too few. Always
 * returns an empty array today — no provider is configured. When one is
 * added, its results must be appended AFTER listed candidates in
 * `getCandidatePlaces`, never interleaved or sorted above them, so DB-listed
 * places always win priority.
 */
export async function getExternalCandidates(
  _prefs: TravelPreferences,
): Promise<PlaceCandidate[]> {
  return [];
}

export async function getCandidatePlaces(
  prefs: TravelPreferences,
): Promise<PlaceCandidate[]> {
  const target = Math.min(MAX_CANDIDATES, Math.max(12, prefs.days * 8));

  const listed = await getListedCandidates(prefs);
  if (listed.length >= target) return listed.slice(0, target);

  const external = await getExternalCandidates(prefs);
  return [...listed, ...external].slice(0, target);
}

export function toAICandidate(place: Place) {
  return {
    id: place.id,
    name: place.name,
    categories: place.categories as CategorySlug[],
    tags: place.tags,
    description: place.description?.slice(0, 240) ?? "",
  };
}
```

- [ ] **Step 4: Run the verification script again**

Run: `npx tsx --env-file=.env.local scripts/verify-candidates.ts`
Expected:
```
listed candidates: <some number > 0, assuming seed data is loaded>
all tagged 'listed': true
external candidates: 0 (expected 0)
```

If `listed candidates: 0`, run the seed script first: `npx tsx --env-file=.env.local scripts/seed.ts`, then re-run verification.

- [ ] **Step 5: Delete the verification script (it was scaffolding, not a permanent test)**

```bash
rm scripts/verify-candidates.ts
```

- [ ] **Step 6: Typecheck the whole project**

Run: `npx tsc --noEmit`
Expected: no errors. This confirms `route.ts` and `route-planner.ts` still compile against the widened `PlaceCandidate[]` return type.

- [ ] **Step 7: Commit**

```bash
git add src/lib/places/candidates.ts
git commit -m "feat(candidates): tag listed places, add external-source stub

DB-listed places are now explicitly tagged source: \"listed\" and always
precede any future external-source candidates (source: \"external\"),
which getExternalCandidates() stubs out as empty for now. No behavior
change today — this locks in the priority ordering before a second
source is ever added."
```

---

### Task 3: Widen itinerary-generation types to `PlaceCandidate`

**Files:**
- Modify: `src/lib/ai/route-planner.ts`

**Interfaces:**
- Consumes: `PlaceCandidate` (Task 1), `getCandidatePlaces` returning `PlaceCandidate[]` (Task 2).
- Produces: `generateItinerary(prefs: TravelPreferences, candidates: PlaceCandidate[]): Promise<AIItinerary>` — same name/behavior, widened param type. Callers in `src/app/api/chat/route.ts` and `src/app/api/route-planner/route.ts` pass the result of `getCandidatePlaces` straight through, so no caller changes needed.

- [ ] **Step 1: Update the type imports and signatures**

In `src/lib/ai/route-planner.ts`:

Change line 4 from:
```ts
import type { AIItinerary, Place, TravelPreferences } from "@/types";
```
to:
```ts
import type { AIItinerary, PlaceCandidate, TravelPreferences } from "@/types";
```

Change line 54 from:
```ts
function buildUserMessage(prefs: TravelPreferences, candidates: Place[]): string {
```
to:
```ts
function buildUserMessage(prefs: TravelPreferences, candidates: PlaceCandidate[]): string {
```

Change line 75 from:
```ts
function buildFallbackItinerary(prefs: TravelPreferences, candidates: Place[]): AIItinerary {
```
to:
```ts
function buildFallbackItinerary(prefs: TravelPreferences, candidates: PlaceCandidate[]): AIItinerary {
```

Change line 91 from:
```ts
  candidates: Place[],
```
to:
```ts
  candidates: PlaceCandidate[],
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors — `PlaceCandidate` structurally satisfies every place field `route-planner.ts` reads (`id`, `name`, etc. via `toAICandidate`), and both call sites already pass `getCandidatePlaces()`'s output directly.

- [ ] **Step 3: Manual smoke test of the chat flow**

Run: `npm run dev`, open `http://localhost:3000/en`, open the chat, and send a message like "3 days, food and history" (or whatever gets a full preview). Confirm:
- A preview itinerary + place cards still render (same as before this change).
- No console/server errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/route-planner.ts
git commit -m "refactor(ai): widen itinerary candidate params to PlaceCandidate"
```

---

### Task 4: Correct stale CLAUDE.md chat/map description

**Files:**
- Modify: `CLAUDE.md:74-75`

- [ ] **Step 1: Replace the stale lines**

In `CLAUDE.md`, find (around line 74-75):

```
- `src/components/chat/` — chat UI (`ChatUI`) currently uses mock replies with `setTimeout`; no real API calls yet
- `src/components/map/` — map placeholder (Mapbox in Phase 5)
```

Replace with:

```
- `src/components/chat/` — chat UI (`ChatUI`) streams real SSE responses from `POST /api/chat`; falls back to a heuristic mock itinerary only when no `ANTHROPIC_API_KEY`/`OPENROUTER_API_KEY` is configured (see `hasLLM` in `src/lib/ai/client.ts`)
- `src/components/map/` — `MapExplorer` is the live map (Mapbox GL if `NEXT_PUBLIC_MAPBOX_TOKEN` is set, else Leaflet/OSM fallback), plotting real DB places from `/map`; `map-placeholder.tsx` is unused dead code
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: correct stale chat/map status in CLAUDE.md"
```

---

## Self-Review Notes

- **Spec coverage:** Tier rule (any DB listing outranks external) → Task 2's concatenation order. External seam → `getExternalCandidates` stub, Task 2. Type field → `PlaceCandidate.source`, Task 1. Docs correction → Task 4. All four spec items covered.
- **No placeholders:** every step has literal code/commands; no TBD/TODO.
- **Type consistency:** `PlaceCandidate` (Task 1) → used verbatim in `candidates.ts` (Task 2) and `route-planner.ts` (Task 3); `getExternalCandidates` name/signature matches between Task 2 definition and its doc-comment description.
