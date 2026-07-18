# My Trips: Open / Edit / Delete — Design

**Date:** 2026-07-19
**Route:** `/[locale]/trips`, `/[locale]/trips/[id]/edit`
**Status:** Approved, ready for implementation

## Problem

`/trips` ("My Trips") lists saved itineraries but is read-only: no expand to see stop details cleanly (days render fully flat, no collapse), no way to rename a trip, edit its days/stops, or delete it. Users who save a trip from AI chat have no way to manage it afterward.

## Goal

- Collapsed-by-default day rows per trip card that expand to show stops (matches existing screenshot mock).
- Edit button per trip → dedicated page to rename the trip and edit days/stops (add/remove days, add/remove/edit stops within a day, pick new stops from existing places).
- Delete button per trip → confirm dialog → optimistic remove, matching the existing `ListingsTable` delete pattern.

## Non-Goals (YAGNI)

- No public/shareable trip links.
- No drag-to-reorder days/stops (remove + re-add is enough for now).
- No route re-optimization (recomputing travel times/distances) on edit — edited stops just carry the time/notes the user types; no automatic schedule recalculation.
- No soft-delete/undo — delete is permanent (same as `PlaceModel.findByIdAndDelete` pattern elsewhere).

## Architecture

### API routes

**`src/app/api/trips/[id]/route.ts`** (new) — mirrors `src/app/api/business/listings/[id]/route.ts` auth pattern:
- `GET` — `auth()` required (401 if none). `ItineraryModel.findById(id)`. 404 if missing. 403 if `trip.userId !== session.user.id`. Returns `trip.toObject()`.
- `PATCH` — same auth/ownership checks. Body: `{ title: string, days: ItineraryDay[] }`. Validates `title` non-empty (400 otherwise). `ItineraryModel.findByIdAndUpdate(id, { title, days }, { new: true })`. Returns updated doc.
- `DELETE` — same auth/ownership checks. `ItineraryModel.findByIdAndDelete(id)`. Returns 204.

**`src/app/api/places/search/route.ts`** (new) — minimal place picker backend for the edit form's stop-adding combobox:
- `GET ?q=<string>` — `connectDB()`, `PlaceModel.find({ name: { $regex: q, $options: "i" } }).select("_id name category").limit(20).lean()`. Returns `{id, name, category}[]`. No auth requirement (place data is already public elsewhere on the site).

### Schema change

`src/lib/models/itinerary.ts`: remove `_id: false` from `ItineraryItemSchema` and the day schema. Subdocuments get default auto `_id`, giving the edit form a stable key to target specific items for edit/remove without relying on array index. Existing saved trips (created before this change) get `_id`s backfilled by Mongoose the next time they're saved via PATCH; until then their subdocuments have no `_id`, so the edit form falls back to array index as key when `_id` is absent (`item._id ?? \`idx-${i}\``).

### Pages / components

**`src/app/[locale]/trips/page.tsx`** (modify) — server component keeps its current data fetch (`auth()`, `connectDB()`, `ItineraryModel.find({ userId })`, places join). Rendering delegates to new client component instead of the inline `TripsContent` function.

**`src/components/trips/trips-list.tsx`** (new, client) — mirrors `src/components/business/listings-table.tsx`:
- Receives `trips` (with joined place data) as props, holds in local state for optimistic updates.
- Each trip renders as a card: title, created date, "N days" badge, edit (`Pencil`, `router.push(\`/trips/${id}/edit\`)`) and delete (`Trash2`) icon buttons.
- Days render via `Accordion` / `AccordionItem` (`src/components/ui/accordion.tsx`), collapsed by default, one `AccordionTrigger` per day showing the date, `AccordionContent` showing that day's stop list (existing item rendering logic moves here unchanged).
- `deleteTrip(id, title)`: `confirm()` → `fetch(\`/api/trips/${id}\`, { method: "DELETE" })` → on success, filter from local state + `toast.success`; on failure, `toast.error`, no state change.

**`src/app/[locale]/trips/[id]/edit/page.tsx`** (new, server) — mirrors `src/app/[locale]/business/listings/[id]/edit/page.tsx`:
- `auth()`, redirect to sign-in if none. `connectDB()`, `ItineraryModel.findById(id).lean()`. Redirect to `/trips` if not found or `trip.userId !== session.user.id`.
- Renders `<TripForm tripId={id} defaultValues={trip} />`.

**`src/components/trips/trip-form.tsx`** (new, client) — mirrors `src/components/business/listing-form.tsx` shape, adapted for nested days/items:
- Title text input.
- Per day: date display, "remove day" button, list of stop rows (place combobox result name shown read-only once picked, time input, notes input, "remove stop" button), "add stop" button opening the place combobox (calls `/api/places/search?q=` as user types, debounced).
- "Add day" button appends a new day (prompts for a date via a date input).
- On submit: `fetch(\`/api/trips/${tripId}\`, { method: "PATCH", body: JSON.stringify({ title, days }) })` → on success `router.push("/trips")` + `toast.success`; on failure `toast.error`, stay on page.

## Error handling

- API: 401 (no session) / 403 (not owner) / 404 (id not found) / 400 (missing/empty title) — consistent JSON `{ error: string }` bodies matching existing `/api/trips` and `/api/business/listings/[id]` conventions.
- Edit page: not-found or not-owner → redirect to `/trips` (no error flash, same as listings edit page behavior).
- Delete: optimistic with rollback-by-refetch-on-failure (toast only, per confirmed UX choice — no custom modal, native `confirm()`).

## Testing

No test suite configured in this repo (per `CLAUDE.md`). Verify manually per `superpowers:verify` skill: sign in, expand/collapse a trip's days, edit title + add/remove a stop + save, confirm change persists after reload, delete a trip and confirm it disappears and is gone from DB.
