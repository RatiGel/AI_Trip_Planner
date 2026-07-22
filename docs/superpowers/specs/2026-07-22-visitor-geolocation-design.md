# Visitor Geolocation & Live Tracking — Design

**Date:** 2026-07-22
**Status:** Approved (pending spec review)

## Goal

Let the site locate the visitor and show it on the map. Two use cases:

1. **One-shot locate** — on the POI map (`/map`), a "Near me" button shows the
   visitor's position (blue dot + accuracy circle) and ranks places by real distance.
2. **Live tracking** — on the transit route planner, a "Follow me" toggle
   continuously updates the visitor's position on the map as they move along a
   planned route.

Both share one reusable hook.

## Non-goals (YAGNI)

- No bearing/heading arrow on the dot.
- No route-progress percentage or off-route detection.
- No background/service-worker tracking.
- No persistence of last location across sessions.
- No reverse geocoding (address from coords).
- No auto-locate on page load — always user-triggered (privacy).

## Components

### 1. `src/hooks/use-geolocation.ts` (new)

Wraps the browser Geolocation API into React state. Knows nothing about maps or UI.

```ts
type Coords = { lat: number; lng: number; accuracy: number };

type GeolocationState = {
  coords: Coords | null;
  loading: boolean;       // one-shot request in flight
  error: string | null;   // i18n message KEY (not the translated string)
  tracking: boolean;      // watchPosition active
};

function useGeolocation(): GeolocationState & {
  locate: () => void;   // one-shot: getCurrentPosition
  watch: () => void;    // continuous: watchPosition, updates coords each tick
  stop: () => void;     // clearWatch; coords stays at last known value
};
```

Behavior:

- `locate()` — sets `loading:true`, calls `getCurrentPosition`. On success sets
  `coords`, clears loading. On error sets `error` key, clears loading.
- `watch()` — starts `watchPosition`, stores the watch id in a ref, sets
  `tracking:true`. Each tick updates `coords`. Errors set `error` and stop
  tracking.
- `stop()` — `clearWatch(id)`, `tracking:false`. `coords` is left untouched
  (marker freezes at last position).
- Cleanup on unmount: clear any active watch.
- Options: `enableHighAccuracy:true`, `timeout:10000`. `maximumAge:0` for watch
  (always fresh); one-shot may allow a small `maximumAge` for speed.
- If `navigator.geolocation` is missing, `error` = `geoUnavailable`.

Error code → key mapping:
- `PERMISSION_DENIED (1)` → `geoDenied`
- `POSITION_UNAVAILABLE (2)` → `geoUnavailable`
- `TIMEOUT (3)` → `geoTimeout`

**Interface contract:** consumer calls `locate`/`watch`/`stop`, reads `coords`,
translates `error` via `t(error)` when non-null, renders as it sees fit.

### 2. `src/lib/geo.ts` (new)

```ts
haversine(a: {lat:number;lng:number}, b: {lat:number;lng:number}): number  // meters
formatDistance(meters: number): { value: string; unit: "km" | "m" }        // 1.2 / 450
```

Replaces the current `Math.hypot(a.geo.lat - lat, ...)` in `map-explorer.tsx`,
which mixes degrees of lat and lng and gives wrong distances.

`formatDistance` returns parts so the caller builds the i18n string
(`kmAway` / `mAway`) — no English baked into the util.

### 3. `map-explorer.tsx` (edit) — one-shot locate

- Replace `nearMe()` internals with the hook's `locate()`.
- Pass new `userCoords: Coords | null` prop into `MapboxMap` / `LeafletMap`.
  - Mapbox: blue dot marker + a `circle`/GeoJSON accuracy circle sized to
    `accuracy` (meters). Fly to the dot when coords first arrive.
  - Leaflet: `L.circleMarker` (dot) + `L.circle` (accuracy radius). `flyTo` on
    first fix.
- Sidebar list: when `userCoords` set, show a distance badge per place using
  `haversine` + `formatDistance`, and sort the list nearest-first.
- On `error` change → `toast.error(t(error))` (sonner already wired in layout).
- Button label: `t("locating")` while `loading`, else `t("nearMe")`.

### 4. `journey-map.tsx` (edit) — live tracking

- New props: `userCoords: Coords | null`, `tracking: boolean`.
- **Separate `useEffect` keyed on `userCoords`** updates only the visitor
  marker — must NOT re-run the plan-redraw effect (keyed on `plan`). This keeps
  the route lines stable while the dot moves.
- Visitor marker: pulsing blue dot (CSS animation). Reuses accuracy-circle
  approach from the explorer.
- Camera: **manual recenter only.** The map never auto-pans on a position
  update. A "Recenter" button (shown only while `tracking`) `easeTo`s the map to
  the current dot. User keeps full pan/zoom control.
- On `stop`, marker stays frozen at last `coords`.

### 5. `route-planner.tsx` (edit) — owns the hook for tracking

- Calls `useGeolocation()`, renders a "Follow me" / "Stop following" toggle
  (calls `watch()` / `stop()`).
- Passes `coords` + `tracking` down to `JourneyMap`.
- `toast.error(t(error))` on error.

## i18n

Add to all three message files (`messages/en.json`, `ka.json`, `ru.json`):

The three `geo*` error keys live ONLY in the `map` namespace to avoid
duplication. Both consumers read them the same way:
`useTranslations("map")` → `t("geoDenied")`. The route planner already uses
`transit` for its own labels but can call a second `useTranslations("map")` for
the shared error keys.

- `map` namespace: `locating`, `yourLocation`, `kmAway` (`"{value} km away"`),
  `mAway` (`"{value} m away"`), `geoDenied`, `geoUnavailable`, `geoTimeout`.
- `transit` namespace: `followMe`, `stopFollowing`, `recenter`.

## Data flow

```
navigator.geolocation
      │  (getCurrentPosition | watchPosition)
      ▼
useGeolocation()  ── coords / error / tracking ──┐
      │                                          │
      ├── map-explorer (locate)                  ├── route-planner (watch/stop)
      │     ├── userCoords → MapImpl (dot+circle)│     └── coords,tracking → JourneyMap
      │     ├── haversine → distance badges      │            ├── userCoords → moving dot
      │     └── toast.error(t(error))            │            └── Recenter button → easeTo
```

## Error handling

- All geolocation failures surface as a sonner toast with a translated message.
- Missing API (old browser / insecure origin) → `geoUnavailable` toast; buttons
  still render but the toast explains why nothing happened.
- **HTTPS note:** `navigator.geolocation` only works on secure origins
  (https or localhost). Prod must be https (Vercel is). No code change needed,
  but worth a one-line comment in the hook.

## Testing

- Unit test `src/lib/geo.ts`: `haversine` against known Tbilisi coordinate pairs
  (compare to a reference value, tolerance a few meters); `formatDistance`
  boundaries (999 m → m, 1000 m → km, rounding).
- The hook and map DOM effects are integration-level; no test harness for those
  yet in this repo — cover manually (deny permission, grant, simulate movement
  via browser devtools sensors).

## Files

| File | Change |
|------|--------|
| `src/hooks/use-geolocation.ts` | NEW — hook |
| `src/lib/geo.ts` | NEW — haversine + formatDistance |
| `src/lib/geo.test.ts` | NEW — unit tests |
| `src/components/map/map-explorer.tsx` | EDIT — dot, circle, distances, toast, replace nearMe |
| `src/components/transit/journey-map.tsx` | EDIT — live dot, recenter button |
| `src/components/transit/route-planner.tsx` | EDIT — own hook, follow-me toggle |
| `messages/en.json`, `ka.json`, `ru.json` | EDIT — new keys |
