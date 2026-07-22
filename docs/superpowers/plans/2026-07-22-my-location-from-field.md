# "My Location" From-Field Autofill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A locate icon inside the transit planner's From field fills it with the user's reverse-geocoded current location.

**Architecture:** Add a `reverseGeocode` helper (Nominatim `/reverse`) beside the existing forward geocoder; extend the geocode API route with a `lat`/`lng` reverse branch; add a one-shot locate icon to the From field in `route-planner.tsx` that calls `getCurrentPosition`, reverse-geocodes, and fills `fromSel`/`fromText`.

**Tech Stack:** Next.js 16 route handler, React client component, Nominatim (OpenStreetMap) geocoding, next-intl, sonner, lucide-react.

## Global Constraints

- **Provider:** reuse Nominatim only. `User-Agent: "AI-Trip-Planner/1.0 (tbilisi transit planner)"`, `AbortSignal.timeout(5000)` — match `geocodeTbilisi` exactly.
- **Never throw:** `reverseGeocode` returns `null` on any network/parse failure or empty result (mirrors `geocodeTbilisi` returning `[]`).
- **Real coords win:** the returned `GeocodeResult` uses the **passed** lat/lng, not the coords Nominatim echoes back.
- **Independent of tracking:** the From-fill uses its own one-shot `getCurrentPosition`, NOT the `useGeolocation` tracking hook's `watch`/`coords`. Do not touch the tracking wiring added earlier.
- **Reuse error keys:** geolocation errors use the existing `map` namespace keys (`geoDenied`/`geoUnavailable`/`geoTimeout`) via the `tMap = useTranslations("map")` already present in `route-planner.tsx`. Error-code mapping: `1 → geoDenied`, `3 → geoTimeout`, else `geoUnavailable`.
- **i18n:** add `transit.myLocation` to all three files (`messages/en.json`, `ka.json`, `ru.json`) together.
- **`GeocodeResult`** = `{ label: string; lat: number; lng: number }` (from `@/types/transit`).
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Test command:** `npm test` = `node --import tsx --test "src/**/*.test.ts"`. Type/lint gate: `npx tsc --noEmit && npm run lint` (pre-existing `.next/types` errors are unrelated — ignore).

---

### Task 1: `reverseGeocode` in geocode.ts + API reverse branch

**Files:**
- Modify: `src/lib/transit/geocode.ts`
- Modify: `src/app/api/transit/geocode/route.ts`

**Interfaces:**
- Consumes: `GeocodeResult` from `@/types/transit`.
- Produces:
  - `reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null>` — exported from `src/lib/transit/geocode.ts`.
  - `GET /api/transit/geocode?lat=<n>&lng=<n>` → `GeocodeResult | null` (JSON). Existing `?q=` behavior unchanged.

No unit test: `reverseGeocode` is a live Nominatim call and the repo has no HTTP-mock harness (the existing `geocodeTbilisi` in the same file has no test for the same reason). Gate is tsc + lint; behavior verified in the browser in Task 3.

- [ ] **Step 1: Add `reverseGeocode` to `src/lib/transit/geocode.ts`**

Append after the existing `geocodeTbilisi` function (reuse the module-level `cache`, `CACHE_TTL_MS`; add a separate cache map for reverse so keys don't collide with forward queries):

```ts
const reverseCache = new Map<string, { at: number; data: GeocodeResult | null }>();

/**
 * Reverse-geocode a coordinate to a single labeled result via Nominatim.
 * The returned lat/lng are the PASSED coordinates (the real device position),
 * not Nominatim's snapped echo — only the label comes from the response.
 * Never throws: network/parse failure or no match yields null. Cached
 * in-process for 5 minutes, keyed on coords rounded to 5 decimals.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const now = Date.now();
  const hit = reverseCache.get(key);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.data;

  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${lat}&lon=${lng}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AI-Trip-Planner/1.0 (tbilisi transit planner)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as { display_name?: string } | null;
    const data: GeocodeResult | null = raw?.display_name
      ? { label: raw.display_name, lat, lng }
      : null;
    reverseCache.set(key, { at: now, data });
    return data;
  } catch (e) {
    console.error("[transit] reverse geocode failed:", e);
    return null;
  }
}
```

- [ ] **Step 2: Add the reverse branch to `src/app/api/transit/geocode/route.ts`**

Replace the file contents with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { geocodeTbilisi, reverseGeocode } from "@/lib/transit/geocode";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const latRaw = params.get("lat");
  const lngRaw = params.get("lng");

  // Reverse geocode when both coords are present and finite.
  if (latRaw !== null && lngRaw !== null) {
    const lat = parseFloat(latRaw);
    const lng = parseFloat(lngRaw);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const result = await reverseGeocode(lat, lng);
      return NextResponse.json(result);
    }
  }

  // Forward geocode (existing behavior).
  const q = params.get("q")?.trim() ?? "";
  const data = await geocodeTbilisi(q);
  return NextResponse.json(data);
}
```

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors in `geocode.ts` or the route file.

- [ ] **Step 4: Smoke the reverse endpoint against the running dev server**

If a dev server is up on :3000 (start one with `npm run dev` in the background if not), run:
```bash
curl -s "http://localhost:3000/api/transit/geocode?lat=41.6934&lng=44.8015"
```
Expected: a JSON object `{"label":"…","lat":41.6934,"lng":44.8015}` (a Tbilisi address near Freedom Square), or `null` if Nominatim is unreachable. Either is acceptable — the point is confirming the branch runs and the forward `?q=` path still works:
```bash
curl -s "http://localhost:3000/api/transit/geocode?q=Rustaveli"
```
Expected: a JSON array of results (forward path intact).

- [ ] **Step 5: Commit**

```bash
git add src/lib/transit/geocode.ts src/app/api/transit/geocode/route.ts
git commit -m "feat(transit): reverseGeocode helper + reverse branch on geocode API

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: i18n key `transit.myLocation`

**Files:**
- Modify: `messages/en.json`, `messages/ka.json`, `messages/ru.json`

**Interfaces:**
- Produces: `transit.myLocation`, read via `useTranslations("transit")`.

- [ ] **Step 1: Add the key to all three files**

In `messages/en.json`, `"transit"` object, add:
```json
    "myLocation": "My location"
```
In `messages/ka.json`, `"transit"`:
```json
    "myLocation": "ჩემი მდებარეობა"
```
In `messages/ru.json`, `"transit"`:
```json
    "myLocation": "Моё местоположение"
```

- [ ] **Step 2: Verify all three parse and contain the key**

Run:
```bash
node -e "for (const l of ['en','ka','ru']) { const m=require('./messages/'+l+'.json'); if(!m.transit.myLocation) throw new Error(l+' transit.myLocation missing'); } console.log('myLocation present in all three')"
```
Expected: `myLocation present in all three`

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/ka.json messages/ru.json
git commit -m "i18n(transit): add myLocation label (en/ka/ru)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Locate icon in the From field

**Files:**
- Modify: `src/components/transit/route-planner.tsx`

**Interfaces:**
- Consumes: `reverseGeocode` via `fetch("/api/transit/geocode?lat=&lng=")` (Task 1), `transit.myLocation` (Task 2), the existing `tMap = useTranslations("map")`, `toast` (sonner), `LocateFixed` + `Loader2` (lucide — already imported), `GeocodeResult` type.
- Produces: no new exports; adds a `fillFromWithMyLocation` handler and a locate icon rendered inside the From field.

Context: `route-planner.tsx` already imports `toast`, `LocateFixed`, `Loader2`, `useGeolocation`, and has `const t = useTranslations("transit")` and `const tMap = useTranslations("map")`. The From/To fields render via a shared `renderField(field: Field)` function; the From field is `field === "from"`. Do NOT alter the tracking hook wiring (`watch`/`stop`/`recenterTick`).

- [ ] **Step 1: Add from-locating state + the fill handler**

Inside `RoutePlanner`, after the existing state declarations (near `const [error, setError] = useState(false);`), add:

```ts
  const [fromLocating, setFromLocating] = useState(false);
```

Then add this handler (place it near the other handlers like `pick`/`swap`, before `renderField`):

```ts
  // One-shot: fill the From field from the device location, reverse-geocoded.
  // Independent of the live-tracking hook — this needs a single fix, once.
  function fillFromWithMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error(tMap("geoUnavailable"));
      return;
    }
    setFromLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let result: GeocodeResult | null = null;
        try {
          const res = await fetch(`/api/transit/geocode?lat=${lat}&lng=${lng}`);
          if (res.ok) result = (await res.json()) as GeocodeResult | null;
        } catch {
          result = null;
        }
        const filled: GeocodeResult = result ?? { label: t("myLocation"), lat, lng };
        setFromText(filled.label);
        setFromSel(filled);
        setSuggestions((s) => ({ ...s, from: [] }));
        setFromLocating(false);
      },
      (err) => {
        const key = err.code === 1 ? "geoDenied" : err.code === 3 ? "geoTimeout" : "geoUnavailable";
        toast.error(tMap(key));
        setFromLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }
```

- [ ] **Step 2: Render the locate icon inside the From input**

In `renderField`, the input is wrapped in a `<div className="flex items-center gap-3 rounded-xl px-3 …">`. Add the locate button as the last child of that flex row, rendered only for the From field. Also add right padding to the input so text clears the icon.

Change the `<input … />` className for the From field to include `pr-1` room (the flex gap already separates it), and after the `<input>`, before the closing `</div>` of the flex row, add:

```tsx
          {field === "from" && (
            <button
              type="button"
              onClick={fillFromWithMyLocation}
              disabled={fromLocating}
              aria-label={t("myLocation")}
              title={t("myLocation")}
              className="grid size-7 shrink-0 place-items-center rounded-md transition-colors hover:bg-[var(--site-surface-08)] disabled:opacity-50"
              style={{ color: "var(--site-text-50)" }}
            >
              {fromLocating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LocateFixed className="size-4" />
              )}
            </button>
          )}
```

> The existing swap button is `absolute right-3 top-1/2 -translate-y-1/2` and sits over the vertical gap between the two fields. The locate button lives *inside* the From flex row as a normal (non-absolute) child, so it flows to the right of the input within that row. Confirm in the browser (Step 4) that the two do not overlap; if they do, nudge the locate button with a right margin (e.g. `mr-6`) to clear the swap control.

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors in `route-planner.tsx`.

- [ ] **Step 4: Browser verification**

With the dev server on :3000, drive a headless Chromium (Playwright is in `node_modules`; write a throwaway script in the repo root and delete it after) granting geolocation, or manually:
- Open `/en/tickets`, grant location, click the locate icon in the From field.
- Expected: From field fills with an address (or "My location" if Nominatim is down); the locate icon and swap button do not overlap.
- Deny location on a fresh load, click the icon → red error toast.
- After filling From, pick a To and confirm a route still plans.

- [ ] **Step 5: Commit**

```bash
git add src/components/transit/route-planner.tsx
git commit -m "feat(transit): My-location icon fills From field via reverse geocode

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** reverseGeocode (Task 1), API reverse branch (Task 1), locate icon + one-shot fill + fallback label + error toast (Task 3), i18n (Task 2), browser verify (Task 3 Step 4). All spec sections covered.
- **Independence from tracking:** Task 3 uses a local `getCurrentPosition`, not the `useGeolocation` hook — satisfies the constraint; tracking wiring untouched.
- **Type consistency:** `reverseGeocode` returns `GeocodeResult | null` (Task 1) and Task 3 consumes exactly that shape from the fetch. Error-code mapping (1/3/else) matches the hook's existing `errorKey` semantics.
- **Real coords:** reverseGeocode uses passed lat/lng in the result; the API echoes that through; Task 3's fallback also uses the raw coords.
- **Handler naming:** the fill handler is named `fillFromWithMyLocation` (a plain event handler, not a React hook) specifically to avoid a `use*` prefix that would trip `react-hooks/rules-of-hooks` lint.
```
