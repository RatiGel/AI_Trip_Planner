# Transit in AI Chat — Design

**Date:** 2026-07-22
**Status:** Approved

## Goal

When a user asks the AI chat a "how do I get from X to Y" question about travel
*within* a city (e.g. "how do I get from Rustaveli to the airport?"), the AI
calls a transit tool. The server geocodes both endpoints, plans a journey via
the existing TTC client, and streams inline `JourneyCard`s back into the chat —
the same cards the `/tickets` route planner renders, including live arrivals.

Intercity travel (bus/rail between cities) stays out of scope — that is the
tickets page, not this tool.

## Architecture

Builds on the completed transit stack (geocode + plan + arrivals APIs,
`RoutePlanner`, `JourneyCard`) and the existing chat SSE pipeline.

### 1. New AI tool — `plan_transit`

Added to the chat route alongside `create_trip_plan`.

Schema:

```jsonc
{
  "name": "plan_transit",
  "parameters": {
    "from": "string",  // place name, e.g. "Rustaveli metro"
    "to":   "string"   // place name, e.g. "Tbilisi airport"
  },
  "required": ["from", "to"]
}
```

System prompt gains a rule: when the user asks how to travel between two places
within a city, call `plan_transit` with the two place names. Do not use it for
intercity travel.

One tool call per turn — same shape as the current handler, which accumulates
`toolName` / `toolInputJson` during the stream and branches after it ends. We
add a second branch for `plan_transit`.

### 2. Server tool handler (chat route)

Reuses existing logic, no HTTP round-trip:

- Extract `geocodeTbilisi(q)` from the geocode route into
  `src/lib/transit/geocode.ts`. Both the route handler and the tool import it.
  Returns the geocode hits; the tool takes the top hit.
- Call `planJourney(fromLatLng, toLatLng, locale)` directly (already a lib fn).
- On success: emit `sse({ type: "journey", plans, from, to })`.
- On failure (either geocode empty, or `planJourney` returns null): emit a
  `done` event with fallback text ("I couldn't find a route for that — try the
  route planner on the Getting Around page.").

### 3. Client — ChatUI

- New SSE event type: `{ type: "journey"; plans: JourneyPlan[]; from: string; to: string }`.
- On receipt, push an assistant message `{ type: "journey", plans, from, to }`
  (mirrors the existing `place-selection` message pattern).
- Render branch `m.type === "journey"`: a header ("Getting from {from} to
  {to}") followed by `plans.map(p => <JourneyCard plan={p} locale={locale} />)`.
- `JourneyCard` already self-fetches live arrivals — no change there.

### 4. i18n

Add keys to `messages/{en,ka,ru}.json`:
- chat journey header ("Getting from {from} to {to}")
- fallback message text

Existing `transit` namespace keys (used by `JourneyCard`) are unchanged.

## Data Flow

```
user msg → chat route (LLM stream)
  → LLM emits tool_call plan_transit{from,to}
  → after stream: geocodeTbilisi(from) top hit, geocodeTbilisi(to) top hit
  → planJourney(fromLL, toLL, locale) → JourneyPlan[]
  → sse{ type:"journey", plans, from, to }
ChatUI → push message{type:"journey"} → render JourneyCard[] (each fetches arrivals)
```

## Error Handling

| Case | Behavior |
|------|----------|
| Geocode empty for from or to | fallback `done` text, no card |
| `planJourney` returns null (TTC down) | fallback `done` text |
| Mock mode (no LLM key) | transit tool never fires; mock path unchanged |
| Same from/to | TTC returns trivial/empty plan → empty card list → fallback text |

## Files

- `src/lib/transit/geocode.ts` — NEW, extracted `geocodeTbilisi()`
- `src/app/api/transit/geocode/route.ts` — use extracted fn
- `src/app/api/chat/route.ts` — add tool + handler branch
- `src/components/chat/chat-ui.tsx` — SSE event + message type + render branch
- `messages/{en,ka,ru}.json` — journey header + fallback keys

## Testing

No test suite configured. `src/lib/transit/normalize.test.ts` exists. Optionally
add a small test asserting `geocodeTbilisi` maps Nominatim rows to
`GeocodeResult` shape.

## Out of Scope

- Intercity travel (tickets page).
- Multi-turn agentic tool loop — single tool call per turn is sufficient.
- Map rendering of journey legs (possible future work).
