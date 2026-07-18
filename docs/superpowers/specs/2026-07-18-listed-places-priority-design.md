# Listed-Places Priority in AI Chat — Design

## Context

Chat/itinerary system (`src/app/api/chat/route.ts`, `src/lib/ai/route-planner.ts`, `src/lib/places/candidates.ts`) already sources 100% of its candidate places from MongoDB (`PlaceModel`, published/active only) via `getCandidatePlaces()`. There is currently no non-DB place source anywhere in the pipeline. The live map (`MapExplorer`) also only plots DB places. `CLAUDE.md`'s description of chat as "mock replies with setTimeout" and map as "Phase 5 placeholder" is stale — both are real, working features.

## Motivation

Not a bug fix. Business driver: being able to tell prospective business listers "AI itinerary chat prioritizes registered/listed places over anything else" is a registration incentive. The system already does this by construction (DB is the only source), but there's no explicit ranking tier or seam for a future second source (e.g. Google Places / Foursquare) — so if/when one is added, listed places must still win by design, not by accident.

## Decisions (from brainstorming)

- **Priority tier:** any approved/active DB listing (paid or not) outranks any future external/map-sourced place. No featured/paid boost beyond existing rating-based sort *within* the listed tier — out of scope for this change.
- **Other-places source:** none exists today. Design must leave a clean seam for adding an external source (e.g. Google Places API) later, without needing to touch ranking logic again when that happens.
- **UX visibility:** none. No two-step chat turns, no "our picks" vs "nearby" badges. Single preview response as today. This is a ranking/architecture change, not a UI change.

## Changes

### 1. Tag candidates with `source`

In `src/lib/places/candidates.ts`, `getCandidatePlaces()` (and the `toAICandidate()` mapping it feeds) gains a `source: "listed"` field on every candidate — all current candidates are DB-sourced, so this is a no-op tag today, not a behavior change.

### 2. Seam for future external candidates

Add `getExternalCandidates()` (same file, or new `src/lib/places/external.ts`) — same candidate shape, tagged `source: "external"`, returns `[]` unconditionally today (no provider wired, no API key). `getCandidatePlaces()` composes as:

```
[...listedCandidates, ...(await getExternalCandidates())]
```

capped at the existing max candidate count. Listed candidates are never displaced by external ones — concatenation order is the priority order. Because `getExternalCandidates()` is a no-op, LLM-visible behavior and existing candidate ordering are unchanged today.

### 3. Type update

Extend the candidate type (wherever `toAICandidate`'s return type is declared, near `src/lib/places/candidates.ts` / `src/types/index.ts`) with `source: "listed" | "external"`. Gives future work (business dashboard messaging, analytics, badges) a concrete field to reference instead of re-deriving it.

### 4. Docs correction

Update `CLAUDE.md`'s chat/map sections to reflect actual state (real streaming LLM chat with tool-use, real Mapbox/Leaflet map over DB places) instead of the stale "mock/Phase 4-5 upcoming" language, since this work touches exactly that area.

## Out of scope

- No UI badges or labeling of listed vs. external places.
- No two-turn chat flow ("here's our listings" → "want more?").
- No actual external provider integration (Google Places, Foursquare, etc.) — stub only.
- No featured/paid weighting change — existing `popularityScore()`-based sort within the listed tier is unchanged.

## Files touched

- `src/lib/places/candidates.ts` — add `source` tagging, add `getExternalCandidates()` stub, compose in `getCandidatePlaces()`.
- Candidate/type declaration (in `candidates.ts` or `src/types/index.ts`) — add `source` field.
- `CLAUDE.md` — correct stale chat/map status description.
