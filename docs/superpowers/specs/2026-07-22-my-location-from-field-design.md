# "My Location" → From Field — Design

**Date:** 2026-07-22
**Status:** Approved (pending spec review)

## Goal

In the transit route planner, let the user fill the **From** field with their
current location by tapping a locate icon inside the field. The coordinates are
reverse-geocoded to a human-readable street/place label via Nominatim (the same
provider the forward geocoder already uses).

## Non-goals (YAGNI)

- No "My location" for the To field (From only — that's the natural start point).
- No persistence of the last location.
- No reuse of the live-tracking hook's `watch` stream — this is a one-shot fill.
- No new geocoding provider — reuse Nominatim.

## Approach

### 1. `src/lib/transit/geocode.ts` — add `reverseGeocode`

```ts
reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null>
```

- Calls Nominatim `/reverse?format=jsonv2&lat=<lat>&lon=<lng>`.
- Same `User-Agent` header and 5 s `AbortSignal.timeout` as `geocodeTbilisi`.
- In-process cache keyed on coords rounded to 5 decimals (`${lat.toFixed(5)},${lng.toFixed(5)}`), same 5-minute TTL as forward.
- Returns `{ label: display_name, lat, lng }` — **uses the passed lat/lng** (not the ones Nominatim echoes back, which may snap to a road centroid) so planning uses the real device position.
- Never throws: network/parse failure or empty response → `null`.

### 2. `src/app/api/transit/geocode/route.ts` — reverse branch

- If `lat` and `lng` query params are both present and parse as finite numbers:
  call `reverseGeocode(lat, lng)`; return the single `GeocodeResult` as JSON, or
  `null` (HTTP 200 with `null` body) when reverse fails.
- Otherwise keep the existing `?q=` forward path unchanged.

### 3. `src/components/transit/route-planner.tsx` — locate icon in From field

- A one-shot browser geolocation call **local to the button**, independent of
  the existing tracking hook (`watch`/`stop`). Rationale: the tracking hook's
  `coords` state feeds the live map dot; coupling the from-fill to it would
  conflate two features' state. The from-fill needs a single fix, once.
  - Local state: `fromLocating: boolean`.
  - On click: `navigator.geolocation.getCurrentPosition(...)` with
    `{ enableHighAccuracy: true, timeout: 10000 }`.
  - On success: `fetch("/api/transit/geocode?lat=<lat>&lng=<lng>")`. If it
    returns a result, set `fromSel` + `fromText` to it. If it returns `null`
    (reverse failed), still set `fromSel = { label: t("myLocation"), lat, lng }`
    and `fromText = t("myLocation")` so planning works with a synthetic label.
  - On geolocation error: `toast.error(tMap(errorKey))` reusing the same
    `map` error keys (`geoDenied` / `geoUnavailable` / `geoTimeout`). The
    `route-planner` already has `tMap = useTranslations("map")` from the
    tracking feature.
  - `fromLocating` shows a spinner in the icon slot and disables the icon while
    in flight.
- **Placement:** a locate icon (`LocateFixed` from lucide, already imported)
  right-aligned *inside* the From input, before the input's right padding. The
  existing swap button is `absolute right-3 top-1/2 -translate-y-1/2` spanning
  the vertical gap between the two fields; the locate icon sits inside the From
  field's own row at its right edge, and the From input gets extra right padding
  (`pr-10`) so text doesn't run under the icon. Verify in the browser that the
  locate icon and the swap button do not visually collide.

### 4. i18n

Add to all three files (`messages/en.json`, `ka.json`, `ru.json`), `transit`
namespace:

- `myLocation`:
  - en: `"My location"`
  - ka: `"ჩემი მდებარეობა"`
  - ru: `"Моё местоположение"`

The three `geo*` error keys already exist in the `map` namespace (from the
prior geolocation feature) and are reused — no new error keys.

## Data flow

```
locate icon click
   → getCurrentPosition (one-shot, local to button)
       success → fetch /api/transit/geocode?lat=&lng=
                    → reverseGeocode (Nominatim /reverse)
                    → GeocodeResult | null
                 set fromSel + fromText (result, or {myLocation, lat, lng} fallback)
       error   → toast.error(tMap(geoErrorKey))
```

## Error handling

- Geolocation denied/unavailable/timeout → toast via existing `map` error keys.
- Reverse geocode failure → silent fallback to a `"My location"` label with the
  real coords; the user can still plan. (Planning only needs lat/lng; the label
  is cosmetic.)
- Secure-origin caveat is inherited (https/localhost only) — no new handling.

## Testing

- No pure-logic unit test: `reverseGeocode` is a network call to Nominatim, and
  the repo has no HTTP-mock harness (the existing `geocode.ts` has no test for
  the same reason). Verify manually in the browser (Task-6-style): grant
  location, click the icon, confirm the From field fills with an address and a
  route can be planned; deny, confirm the toast.

## Files

| File | Change |
|------|--------|
| `src/lib/transit/geocode.ts` | EDIT — add `reverseGeocode` |
| `src/app/api/transit/geocode/route.ts` | EDIT — reverse branch on `lat`/`lng` |
| `src/components/transit/route-planner.tsx` | EDIT — locate icon + one-shot fill |
| `messages/en.json`, `ka.json`, `ru.json` | EDIT — `transit.myLocation` |
