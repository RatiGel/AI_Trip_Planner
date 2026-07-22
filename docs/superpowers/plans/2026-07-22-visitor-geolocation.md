# Visitor Geolocation & Live Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the site locate the visitor (blue dot + accuracy + real distances) on the POI map, and continuously track them on the transit route planner.

**Architecture:** One reusable `useGeolocation()` hook wraps the browser Geolocation API (one-shot `locate()` + continuous `watch()`/`stop()`). A pure `src/lib/geo.ts` computes haversine distance. The POI map explorer consumes the hook for one-shot "Near me"; the transit route planner consumes it for live "Follow me" tracking with a manual recenter button. Errors surface as sonner toasts.

**Tech Stack:** Next.js 16, React, next-intl 4, Mapbox GL JS (primary) + Leaflet (fallback), sonner (toasts), `node --test` + tsx (tests).

## Global Constraints

- **Distance math:** Use haversine (meters), never `Math.hypot` on lat/lng degrees.
- **Privacy:** Never auto-request location on page load. Always user-triggered.
- **i18n:** Add every new key to all three files — `messages/en.json`, `messages/ka.json`, `messages/ru.json` — together. The three `geo*` error keys live ONLY in the `map` namespace.
- **Secure origin:** `navigator.geolocation` works only on https or localhost. No code change; note it in the hook.
- **Types:** Coords is `{ lat: number; lng: number; accuracy: number }`. Existing `LatLng` in `src/types/transit.ts` is a `[lat, lng]` tuple — do not conflate.
- **i18n imports:** `Link`, `useRouter` etc. come from `@/i18n/navigation`, never `next/navigation` (not needed in these files, but the rule holds).
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Test command:** `npm test` runs `node --import tsx --test "src/**/*.test.ts"`. Tests use `node:test` + `node:assert/strict`.

---

### Task 1: `src/lib/geo.ts` — haversine + formatDistance

**Files:**
- Create: `src/lib/geo.ts`
- Test: `src/lib/geo.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number` — meters, floating point.
  - `formatDistance(meters: number): { value: string; unit: "km" | "m" }` — `< 1000` → `{ value: "<rounded m>", unit: "m" }`; `>= 1000` → `{ value: "<km to 1 decimal>", unit: "km" }`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/geo.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { haversine, formatDistance } from "./geo";

test("haversine returns ~0 for identical points", () => {
  const p = { lat: 41.7151, lng: 44.8271 };
  assert.ok(haversine(p, p) < 0.001);
});

test("haversine matches a known Tbilisi distance", () => {
  // Freedom Square → Rustaveli Metro, ~1.5 km apart.
  const a = { lat: 41.6934, lng: 44.8015 };
  const b = { lat: 41.7064, lng: 44.7997 };
  const d = haversine(a, b);
  assert.ok(d > 1300 && d < 1700, `expected ~1450m, got ${d}`);
});

test("haversine is symmetric", () => {
  const a = { lat: 41.70, lng: 44.80 };
  const b = { lat: 41.72, lng: 44.79 };
  assert.ok(Math.abs(haversine(a, b) - haversine(b, a)) < 0.001);
});

test("formatDistance uses meters below 1000", () => {
  assert.deepEqual(formatDistance(450), { value: "450", unit: "m" });
  assert.deepEqual(formatDistance(999), { value: "999", unit: "m" });
});

test("formatDistance rounds meters to a whole number", () => {
  assert.deepEqual(formatDistance(450.7), { value: "451", unit: "m" });
});

test("formatDistance switches to km at 1000 with one decimal", () => {
  assert.deepEqual(formatDistance(1000), { value: "1.0", unit: "km" });
  assert.deepEqual(formatDistance(1234), { value: "1.2", unit: "km" });
  assert.deepEqual(formatDistance(15800), { value: "15.8", unit: "km" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './geo'` (or export undefined).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/geo.ts`:

```ts
type Point = { lat: number; lng: number };

const R = 6_371_000; // Earth radius, meters
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two lat/lng points, in meters. */
export function haversine(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Split a meter distance into a display value + unit. Caller builds the i18n string. */
export function formatDistance(meters: number): { value: string; unit: "km" | "m" } {
  if (meters < 1000) return { value: String(Math.round(meters)), unit: "m" };
  return { value: (meters / 1000).toFixed(1), unit: "km" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (all geo tests green; the existing normalize tests stay green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/geo.ts src/lib/geo.test.ts
git commit -m "feat(geo): haversine distance + formatDistance util

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `src/hooks/use-geolocation.ts` — the shared hook

**Files:**
- Create: `src/hooks/use-geolocation.ts`

**Interfaces:**
- Consumes: nothing (browser `navigator.geolocation`).
- Produces:
  ```ts
  type Coords = { lat: number; lng: number; accuracy: number };
  function useGeolocation(): {
    coords: Coords | null;
    loading: boolean;
    error: string | null;   // i18n KEY in the `map` namespace, or null
    tracking: boolean;
    locate: () => void;
    watch: () => void;
    stop: () => void;
  };
  ```
  `error` is one of `"geoUnavailable" | "geoDenied" | "geoTimeout"`.

**No test:** this is a thin browser-API wrapper with no Node-testable pure logic (the repo has no jsdom/RTL harness). Verify manually in Task 6.

- [ ] **Step 1: Write the hook**

Create `src/hooks/use-geolocation.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Coords = { lat: number; lng: number; accuracy: number };

// NOTE: navigator.geolocation only resolves on secure origins (https or
// localhost). On plain http it silently never fires — nothing to handle here.

/** Maps a GeolocationPositionError code to an i18n key in the `map` namespace. */
function errorKey(code: number): string {
  if (code === 1) return "geoDenied";        // PERMISSION_DENIED
  if (code === 3) return "geoTimeout";        // TIMEOUT
  return "geoUnavailable";                     // POSITION_UNAVAILABLE (2) + fallback
}

const OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
};

export function useGeolocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const watchId = useRef<number | null>(null);

  const onPosition = useCallback((pos: GeolocationPosition) => {
    setCoords({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    });
    setError(null);
  }, []);

  const clearWatch = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("geoUnavailable");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPosition(pos);
        setLoading(false);
      },
      (err) => {
        setError(errorKey(err.code));
        setLoading(false);
      },
      OPTIONS,
    );
  }, [onPosition]);

  const watch = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("geoUnavailable");
      return;
    }
    clearWatch();
    setTracking(true);
    watchId.current = navigator.geolocation.watchPosition(
      onPosition,
      (err) => {
        setError(errorKey(err.code));
        clearWatch();
        setTracking(false);
      },
      OPTIONS,
    );
  }, [clearWatch, onPosition]);

  const stop = useCallback(() => {
    clearWatch();
    setTracking(false);
    // coords intentionally left as-is so the marker freezes at last position.
  }, [clearWatch]);

  // Clean up any active watch on unmount.
  useEffect(() => clearWatch, [clearWatch]);

  return { coords, loading, error, tracking, locate, watch, stop };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from `src/hooks/use-geolocation.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-geolocation.ts
git commit -m "feat(geo): useGeolocation hook (one-shot + live watch)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: i18n keys

**Files:**
- Modify: `messages/en.json`, `messages/ka.json`, `messages/ru.json`

**Interfaces:**
- Produces (all read via `useTranslations`):
  - `map`: `locating`, `yourLocation`, `kmAway`, `mAway`, `geoDenied`, `geoUnavailable`, `geoTimeout`.
  - `transit`: `followMe`, `stopFollowing`, `recenter`.

- [ ] **Step 1: Add keys to `messages/en.json`**

In the `"map"` object add:

```json
    "locating": "Locating…",
    "yourLocation": "Your location",
    "kmAway": "{value} km away",
    "mAway": "{value} m away",
    "geoDenied": "Location permission denied. Enable it in your browser to use this.",
    "geoUnavailable": "Location is unavailable on this device or connection.",
    "geoTimeout": "Locating timed out. Try again."
```

In the `"transit"` object add:

```json
    "followMe": "Follow me",
    "stopFollowing": "Stop following",
    "recenter": "Recenter"
```

- [ ] **Step 2: Add keys to `messages/ka.json`**

In `"map"`:

```json
    "locating": "მდებარეობის დადგენა…",
    "yourLocation": "თქვენი მდებარეობა",
    "kmAway": "{value} კმ მოშორებით",
    "mAway": "{value} მ მოშორებით",
    "geoDenied": "მდებარეობაზე წვდომა უარყოფილია. ჩართეთ ბრაუზერში.",
    "geoUnavailable": "მდებარეობა მიუწვდომელია ამ მოწყობილობაზე ან კავშირზე.",
    "geoTimeout": "მდებარეობის დადგენას დრო გაუვიდა. სცადეთ თავიდან."
```

In `"transit"`:

```json
    "followMe": "გამომყევი",
    "stopFollowing": "გაჩერება",
    "recenter": "ცენტრში დაბრუნება"
```

- [ ] **Step 3: Add keys to `messages/ru.json`**

In `"map"`:

```json
    "locating": "Определение местоположения…",
    "yourLocation": "Ваше местоположение",
    "kmAway": "{value} км",
    "mAway": "{value} м",
    "geoDenied": "Доступ к местоположению запрещён. Включите его в браузере.",
    "geoUnavailable": "Местоположение недоступно на этом устройстве или соединении.",
    "geoTimeout": "Время определения местоположения истекло. Попробуйте снова."
```

In `"transit"`:

```json
    "followMe": "Следовать за мной",
    "stopFollowing": "Остановить",
    "recenter": "Центрировать"
```

- [ ] **Step 4: Verify all three files are valid JSON with the new keys**

Run:
```bash
node -e "for (const l of ['en','ka','ru']) { const m=require('./messages/'+l+'.json'); for (const k of ['locating','yourLocation','kmAway','mAway','geoDenied','geoUnavailable','geoTimeout']) if(!m.map[k]) throw new Error(l+' map.'+k+' missing'); for (const k of ['followMe','stopFollowing','recenter']) if(!m.transit[k]) throw new Error(l+' transit.'+k+' missing'); } console.log('all keys present')"
```
Expected: `all keys present`

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/ka.json messages/ru.json
git commit -m "i18n(geo): location + live-tracking strings (en/ka/ru)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: POI map explorer — one-shot locate, dot, circle, distances

**Files:**
- Modify: `src/components/map/map-explorer.tsx`

**Interfaces:**
- Consumes: `useGeolocation` (Task 2), `haversine` + `formatDistance` (Task 1), `map` i18n keys (Task 3), `toast` from `sonner`.
- Produces: `MapboxMap` / `LeafletMap` gain a `userCoords: Coords | null` prop.

This task modifies three regions of the file: the two map subcomponents (add a user marker + accuracy circle) and the `MapExplorer` body (hook wiring, distances, toast). Each step shows the full replacement code for the region it touches.

- [ ] **Step 1: Add imports**

At the top of the file, add to the existing imports:

```ts
import { toast } from "sonner";
import { useGeolocation, type Coords } from "@/hooks/use-geolocation";
import { haversine, formatDistance } from "@/lib/geo";
```

- [ ] **Step 2: Add a `userCoords` prop + blue dot + accuracy circle to `MapboxMap`**

Change the `MapboxMap` signature to accept `userCoords`:

```ts
function MapboxMap({
  places,
  selectedId,
  onSelect,
  userCoords,
}: {
  places: Place[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  userCoords: Coords | null;
}) {
```

Add a ref beside the existing `markersRef`:

```ts
  const userMarkerRef = useRef<import("mapbox-gl").Marker | null>(null);
```

Add this effect after the selection effect (before the unmount cleanup effect). It draws/moves the blue dot and an accuracy circle, and flies to the dot the first time coords arrive:

```ts
  // Visitor location: blue dot + accuracy circle. Separate effect so moving
  // the dot never rebuilds the place markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userCoords) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !mapRef.current) return;
      const m = mapRef.current;

      const paint = () => {
        // Blue dot marker.
        if (!userMarkerRef.current) {
          const el = document.createElement("div");
          el.style.cssText =
            "width:16px;height:16px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 2px rgba(37,99,235,.4);";
          userMarkerRef.current = new mapboxgl.Marker({ element: el });
        }
        userMarkerRef.current.setLngLat([userCoords.lng, userCoords.lat]).addTo(m);

        // Accuracy circle as a GeoJSON source/layer.
        const data = {
          type: "Feature" as const,
          properties: {},
          geometry: { type: "Point" as const, coordinates: [userCoords.lng, userCoords.lat] },
        };
        const src = m.getSource("user-accuracy") as import("mapbox-gl").GeoJSONSource | undefined;
        if (src) {
          src.setData(data);
        } else {
          m.addSource("user-accuracy", { type: "geojson", data });
          m.addLayer({
            id: "user-accuracy",
            type: "circle",
            source: "user-accuracy",
            paint: {
              "circle-color": "#2563eb",
              "circle-opacity": 0.12,
              // Radius (px) = accuracy(m) / meters-per-pixel at this latitude/zoom.
              "circle-radius": [
                "interpolate", ["exponential", 2], ["zoom"],
                0, 0,
                22, ["/", userCoords.accuracy, ["/", 156543.03 * Math.cos(userCoords.lat * Math.PI / 180), ["^", 2, ["zoom"]]]],
              ],
            },
          });
        }
        m.flyTo({ center: [userCoords.lng, userCoords.lat], zoom: 15, speed: 1.2 });
      };

      if (m.loaded() && m.isStyleLoaded()) paint();
      else m.once("load", paint);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCoords]);
```

> Note: the `circle-radius` expression scales the circle with zoom so it tracks the real accuracy radius. If it proves fiddly, a fixed `"circle-radius": 40` is an acceptable fallback — but try the scaled version first.

- [ ] **Step 3: Add the same to `LeafletMap`**

Change `LeafletMap` signature the same way (add `userCoords: Coords | null`).

Add refs beside `markersRef`:

```ts
  const userLayerRef = useRef<import("leaflet").Layer[]>([]);
```

Add this effect after the selection effect:

```ts
  // Visitor location: dot + accuracy circle (Leaflet).
  useEffect(() => {
    if (!mapRef.current || !userCoords) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      const map = mapRef.current;
      userLayerRef.current.forEach((l) => l.remove());
      userLayerRef.current = [];

      const circle = L.circle([userCoords.lat, userCoords.lng], {
        radius: userCoords.accuracy,
        color: "#2563eb",
        weight: 1,
        fillColor: "#2563eb",
        fillOpacity: 0.12,
      }).addTo(map);
      const dot = L.circleMarker([userCoords.lat, userCoords.lng], {
        radius: 7,
        color: "#fff",
        weight: 3,
        fillColor: "#2563eb",
        fillOpacity: 1,
      }).addTo(map);
      userLayerRef.current.push(circle, dot);
      map.flyTo([userCoords.lat, userCoords.lng], 15, { duration: 0.8 });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCoords]);
```

- [ ] **Step 4: Wire the hook into `MapExplorer` and replace `nearMe`**

In `MapExplorer`, replace the `nearMeLoading` state and the whole `nearMe` function with the hook. Delete these lines:

```ts
  const [nearMeLoading, setNearMeLoading] = useState(false);
```

and the entire `function nearMe() { ... }` block.

Add after the other hooks near the top of `MapExplorer`:

```ts
  const { coords: userCoords, loading: locating, error: geoError, locate } = useGeolocation();

  // Surface geolocation errors as a toast.
  useEffect(() => {
    if (geoError) toast.error(t(geoError));
  }, [geoError, t]);
```

- [ ] **Step 5: Update the "Near me" button**

Replace the button's `onClick`, `disabled`, and label to use the hook:

```tsx
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={locate}
          disabled={locating}
        >
          <Crosshair className="size-4" />
          {locating ? t("locating") : t("nearMe")}
        </Button>
```

- [ ] **Step 6: Sort places by distance + show a distance badge**

Add a distance-sorted list derived from `filtered` + `userCoords`. After the `filtered` useMemo, add:

```ts
  // When we know the visitor's location, rank places nearest-first and attach
  // a formatted distance for display.
  const withDistance = useMemo(() => {
    if (!userCoords) return filtered.map((p) => ({ place: p, meters: null as number | null }));
    return filtered
      .map((p) => ({ place: p, meters: haversine(userCoords, p.geo) }))
      .sort((a, b) => (a.meters ?? 0) - (b.meters ?? 0));
  }, [filtered, userCoords]);
```

Then in the sidebar list, change the `filtered.map((p) => {` loop to iterate `withDistance`:

```tsx
        {withDistance.map(({ place: p, meters }) => {
          const isSel = p.id === selectedId;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedId(isSel ? null : p.id)}
              className={`flex w-full items-start gap-3 border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-accent ${
                isSel ? "bg-accent" : ""
              }`}
            >
              <span className="mt-0.5 shrink-0 text-base">{placeEmoji(p)}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{localName(p)}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                  {meters !== null && (
                    <span className="text-xs text-muted-foreground">
                      {(() => {
                        const d = formatDistance(meters);
                        return t(d.unit === "km" ? "kmAway" : "mAway", { value: d.value });
                      })()}
                    </span>
                  )}
                  {p.rating > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-500">
                      <Star className="size-2.5 fill-current" />
                      {p.rating.toFixed(1)}
                    </span>
                  )}
                  {p.categories.slice(0, 2).map((c) => (
                    <Badge key={c} variant="outline" className="text-[10px]">
                      {tCat(c as CategorySlug)}
                    </Badge>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
```

- [ ] **Step 7: Pass `userCoords` into the map**

Find the `<MapImpl ... />` render and add the prop:

```tsx
        <MapImpl
          places={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
          userCoords={userCoords}
        />
```

- [ ] **Step 8: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors in `map-explorer.tsx`. (If lint flags the two `eslint-disable-next-line react-hooks/exhaustive-deps` comments as unused, remove them; otherwise keep.)

- [ ] **Step 9: Commit**

```bash
git add src/components/map/map-explorer.tsx
git commit -m "feat(map): visitor blue dot, accuracy circle, real distances

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Transit route planner — live tracking + recenter

**Files:**
- Modify: `src/components/transit/journey-map.tsx`
- Modify: `src/components/transit/route-planner.tsx`

**Interfaces:**
- Consumes: `useGeolocation` (Task 2), `map` + `transit` i18n keys (Task 3), `toast` from `sonner`, `Coords` type.
- Produces: `JourneyMap` gains props `userCoords: Coords | null`, `tracking: boolean`, `onRecenter?: () => void`. `MapboxJourney` / `LeafletJourney` gain a `userCoords` prop and expose an imperative recenter via a ref forwarded from `JourneyMap`.

Simplification vs the spec's "easeTo the map": recenter is triggered by re-running a small effect. To avoid ref-forwarding complexity, `JourneyMap` owns a `recenterTick` counter passed to the impl; the impl `easeTo`s to `userCoords` whenever the tick changes.

- [ ] **Step 1: Add imports + a moving dot to `MapboxJourney`**

At the top of `journey-map.tsx` add:

```ts
import { useState } from "react";
import type { Coords } from "@/hooks/use-geolocation";
```

(Merge `useState` into the existing `react` import rather than duplicating.)

Change `MapboxJourney` signature:

```ts
function MapboxJourney({
  plan,
  userCoords,
  recenterTick,
}: {
  plan: JourneyPlan | null;
  userCoords: Coords | null;
  recenterTick: number;
}) {
```

Add a ref beside `mapRef`:

```ts
  const userMarkerRef = useRef<import("mapbox-gl").Marker | null>(null);
```

Add this effect after the existing `[plan]` effect (moving the dot must NOT re-run the plan redraw):

```ts
  // Live visitor dot — updates in place as coords change, without redrawing the route.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userCoords) return;
    let cancelled = false;
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !mapRef.current) return;
      if (!userMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "journey-user-dot";
        el.style.cssText =
          "width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,.25);";
        userMarkerRef.current = new mapboxgl.Marker({ element: el });
      }
      userMarkerRef.current.setLngLat([userCoords.lng, userCoords.lat]).addTo(mapRef.current);
    })();
    return () => { cancelled = true; };
  }, [userCoords]);

  // Manual recenter: pan to the dot only when the tick changes (button press).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userCoords || recenterTick === 0) return;
    map.easeTo({ center: [userCoords.lng, userCoords.lat], zoom: 15, duration: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterTick]);
```

- [ ] **Step 2: Add the moving dot + recenter to `LeafletJourney`**

Change `LeafletJourney` signature the same way (add `userCoords`, `recenterTick`).

Add a ref beside `layersRef`:

```ts
  const userLayerRef = useRef<import("leaflet").Layer | null>(null);
```

Add after the `[plan]` effect:

```ts
  useEffect(() => {
    if (!mapRef.current || !userCoords) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      if (userLayerRef.current) userLayerRef.current.remove();
      userLayerRef.current = L.circleMarker([userCoords.lat, userCoords.lng], {
        radius: 8,
        color: "#fff",
        weight: 3,
        fillColor: "#2563eb",
        fillOpacity: 1,
      }).addTo(mapRef.current);
    })();
    return () => { cancelled = true; };
  }, [userCoords]);

  // Leaflet has no easeTo — setView with animate is the pan-to equivalent.
  useEffect(() => {
    if (!mapRef.current || !userCoords || recenterTick === 0) return;
    mapRef.current.setView([userCoords.lat, userCoords.lng], 15, { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterTick]);
```

- [ ] **Step 3: Thread props through the `Impl` alias and `JourneyMap`**

The `Impl` alias already picks Mapbox or Leaflet. Update `JourneyMap` to own the recenter tick and forward everything:

```tsx
export function JourneyMap({
  plan,
  userCoords = null,
  tracking = false,
  recenterTick = 0,
}: {
  plan: JourneyPlan | null;
  userCoords?: Coords | null;
  tracking?: boolean;
  recenterTick?: number;
}) {
  const t = useTranslations("transit");
  const hasRoute = !!plan && planPoints(plan).length >= 2;

  return (
    <div
      className="relative h-full min-h-[320px] overflow-hidden rounded-2xl"
      style={{ border: "1px solid var(--site-border-06)" }}
    >
      <Impl plan={hasRoute ? plan : null} userCoords={userCoords} recenterTick={recenterTick} />

      {!hasRoute && !tracking && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
          <span
            className="rounded-full px-4 py-2 text-[13px] font-medium shadow-lg backdrop-blur"
            style={{ background: "var(--site-header-bg)", border: "1px solid var(--site-border-10)", color: "var(--site-text-65)" }}
          >
            {t("mapHint")}
          </span>
        </div>
      )}
    </div>
  );
}
```

(The `tracking` prop only gates the idle hint here; the recenter button lives in the route planner so it can sit near the "Follow me" toggle.)

- [ ] **Step 4: Wire the hook + toggle + recenter into `RoutePlanner`**

In `route-planner.tsx`, add imports:

```ts
import { toast } from "sonner";
import { useTranslations } from "next-intl"; // already imported — do not duplicate
import { useGeolocation } from "@/hooks/use-geolocation";
import { Crosshair, LocateFixed } from "lucide-react"; // merge into existing lucide import
```

Add a second translations hook for the shared `map` error keys, and the geolocation hook, inside `RoutePlanner`:

```ts
  const tMap = useTranslations("map");
  const { coords: userCoords, tracking, error: geoError, watch, stop } = useGeolocation();
  const [recenterTick, setRecenterTick] = useState(0);

  useEffect(() => {
    if (geoError) toast.error(tMap(geoError));
  }, [geoError, tMap]);
```

(Add `useEffect` to the React import at the top.)

- [ ] **Step 5: Render the Follow-me toggle + Recenter button over the map**

Replace the right-column map block:

```tsx
      {/* ── Right: map (sticky on desktop) ── */}
      <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="relative h-[420px] lg:h-[calc(100vh-8rem)]">
          <JourneyMap
            plan={selectedPlan}
            userCoords={userCoords}
            tracking={tracking}
            recenterTick={recenterTick}
          />
          <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
            <button
              type="button"
              onClick={tracking ? stop : watch}
              className="flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium shadow-lg backdrop-blur transition-colors"
              style={{
                background: tracking ? "#0891B2" : "var(--site-header-bg)",
                border: "1px solid var(--site-border-10)",
                color: tracking ? "#fff" : "var(--site-text-65)",
              }}
            >
              <Crosshair className="size-3.5" />
              {tracking ? t("stopFollowing") : t("followMe")}
            </button>
            {tracking && userCoords && (
              <button
                type="button"
                onClick={() => setRecenterTick((n) => n + 1)}
                className="flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium shadow-lg backdrop-blur transition-colors"
                style={{ background: "var(--site-header-bg)", border: "1px solid var(--site-border-10)", color: "var(--site-text-65)" }}
              >
                <LocateFixed className="size-3.5" />
                {t("recenter")}
              </button>
            )}
          </div>
        </div>
      </div>
```

- [ ] **Step 6: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors in `journey-map.tsx` or `route-planner.tsx`.

- [ ] **Step 7: Commit**

```bash
git add src/components/transit/journey-map.tsx src/components/transit/route-planner.tsx
git commit -m "feat(transit): live location tracking with follow-me + recenter

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Manual verification + build

**Files:** none (verification only).

- [ ] **Step 1: Full test + build**

Run: `npm test && npm run build`
Expected: tests pass; production build succeeds with no type errors.

- [ ] **Step 2: Manual smoke test — POI map**

Run `npm run dev`, open `/en/map` (must be `localhost`, a secure origin). Then:
- Click "Find near me" → browser prompts for permission.
- **Grant** → blue dot + accuracy circle appear, map flies to it, sidebar re-sorts nearest-first with distance badges.
- Reload, click again, **Deny** → red toast with the denied message; no dot.
- Devtools → Sensors → override location to another Tbilisi point → re-locate → dot moves, distances update.

- [ ] **Step 3: Manual smoke test — transit tracking**

Open `/en/tickets` (renders `RoutePlanner` via `getting-around.tsx`). Plan a route, then:
- Click "Follow me" → button turns cyan, blue dot appears, "Recenter" button shows.
- Devtools Sensors → move the location a few times → dot moves; the route lines stay put; the camera does NOT auto-follow.
- Click "Recenter" → map pans to the dot.
- Click "Stop following" → dot freezes at last position; Recenter button hides.
- Deny permission on a fresh load → red toast.

- [ ] **Step 4: Commit (only if any fix was needed)**

If verification surfaced a fix, commit it:

```bash
git add -A
git commit -m "fix(geo): address issues found in manual verification

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** hook (Task 2), geo util (Task 1), map dot/circle/distances/toast (Task 4), live tracking + recenter (Task 5), i18n (Task 3), tests + manual verify (Tasks 1, 6). All spec sections covered.
- **`geo*` keys** live only in `map` namespace; route planner reads them via a second `useTranslations("map")` (`tMap`) — consistent with the spec.
- **Type consistency:** `Coords` defined in Task 2, imported everywhere. `haversine`/`formatDistance` signatures match between Task 1 definition and Task 4 use. `Place.geo` is `{ lat, lng }` (plus optional address) — compatible with `haversine`'s `{lat,lng}` param.
- **Distance math:** haversine only; the old `Math.hypot` sort is deleted in Task 4 Step 4.
