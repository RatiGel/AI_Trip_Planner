# Business owner capability audit

Task 10 of `2026-07-29-superadmin-business-roles`. Audits §5 of
`docs/superpowers/specs/2026-07-29-superadmin-business-roles-design.md`
against the actual code, and fixes what is small and in scope.

Requirement under test (verbatim): *"admin is the person who has registered
their business. admin can be able to edit/moderate their business/businesses
only. they can do anything with their business, make deals, add pictures."*

## Findings

| Capability | Location | Status | Notes |
|---|---|---|---|
| Create / edit own listing | `/business/listings` | **WORKS** | `requireListingAccess` scopes every read/write to `ownerId === actor.id` (or superadmin). Verified in `src/lib/permissions.ts` and covered by `src/lib/permissions.test.ts`. |
| Upload / reorder images | `/business/media`, `ListingForm` | **FIXED** | `ListingForm` had no field for `images` at all — an owner could not add pictures despite the PATCH endpoint already accepting the field. Added a repeatable URL-input list (add / remove / reorder via up-down buttons) to `src/components/business/listing-form.tsx`. `src/app/[locale]/business/media/page.tsx` rewritten from a static placeholder into a real, owner-scoped list of the caller's listings with their current image count/cover thumbnail and a link into each listing's editor, where the new controls live. True file upload is **MISSING** — see below. |
| Services and prices | `ListingForm` | **FIXED** | No `services[]` editor existed. Added repeatable rows (name, nameKa, description, priceGEL) to `ListingForm`, matching `ServiceSchema` in `src/lib/models/place.ts` field-for-field. Also added a single `reservationPriceGEL` number input (the booking fee/deposit), which likewise had no form control before this task. |
| Deals / vouchers | voucher model | **MISSING** — needs its own spec | See "Deals question" below. `services[]` (now editable) covers "a business offering priced items" but does not cover the `/deals` page's actual model: `DealOption` (`src/types/index.ts`) has `priceOriginal`, `discountPct`, `validUntil`, `badge`, and issues a redeemable `VoucherModel` document via the Flitt payment callback (`src/app/api/flitt/callback/route.ts`). `/deals` currently renders `mockDeals` from `src/lib/mock/deals.ts`, not the database, and there is no owner-facing API or UI to create a deal at all. Building that is a new subsystem (new Deal model, owner CRUD UI, `/deals` migrated off mock data, checkout wiring) — out of scope for this plan per the brief. |
| Reply to reviews | `/api/business/reviews/[id]/reply` | **WORKS** | Confirmed by reading `src/app/api/business/reviews/[id]/reply/route.ts`: it calls `requireListingAccess(String(review.placeId))` after loading the review, so a reply is rejected (403) unless the caller owns the review's listing or is superadmin. No change needed. |
| Submit for approval | PATCH `status` | **WORKS** | `src/app/api/business/listings/[id]/route.ts` calls `resolveOwnerStatusTransition` for non-superadmin callers, which only permits `draft/rejected → pending` and `pending → draft`. An owner cannot self-approve. Unchanged. |
| **Cannot** edit others' listings | all business APIs | **WORKS** | `requireListingAccess` → `canEditListing` in `src/lib/permissions-core.ts` requires `String(place.ownerId) === String(actor.id)` unless the actor is superadmin. Covered by `src/lib/permissions.test.ts`. |
| **Cannot** reach staff panel | `/superadmin` layout | **WORKS** | `canAccessStaffPanel` (`permissions-core.ts`) requires `role === "superadmin"`; the legacy `admin` role is explicitly refused. Unit-tested. Not re-verified live in a browser this session (see Step 5 below). |

## New fields added and their round trip

Three fields were added to `ListingForm` that did not exist before. Each is
reasoned through form state → request body → PATCH allowlist → Mongoose
schema, all four stages checked by reading the code (not by exercising the
UI in a browser):

- **`images`**: form state is `string[]`; on save, empty/whitespace URLs are
  trimmed and filtered out, sent as `images: string[]`. `writableListingFields`
  includes `"images"`. The PATCH handler copies `body.images` straight into
  the Mongoose update. Schema: `images: [String]`. All four stages agree.
- **`services`**: form state is an array of `{name, nameKa, description,
  priceGEL: string}` rows; on save, rows missing `name` are dropped, and
  `priceGEL` is converted to a real number via `parseFloat` before being
  sent. The resulting shape `{name, nameKa, description, priceGEL: number}`
  matches `ServiceSchema` in `src/lib/models/place.ts` field-for-field
  (`name` required, `priceGEL` required number min 0). `writableListingFields`
  includes `"services"`. This holds **for well-formed input only** — see
  "FIXED" entries below for what was wrong and what changed.
- **`reservationPriceGEL`**: form state is a string (empty = unset); on save,
  an empty string is now sent as an explicit `null`, otherwise `parseFloat`.
  See "FIXED" entries below — this used to send `undefined` (dropped by
  `JSON.stringify`, so the key was absent and the field could never be
  cleared). It does **not** mirror `phone`/`website`: those are read via
  `fd.get(...)`, which returns `""` for an empty input, so the key IS present
  in the body and the PATCH route's `if (key in body)` guard writes `""` —
  clearing the value on first save. `reservationPriceGEL` had no such path.

## Findings from independent review — FIXED

An independent review of this task's diff found three defects in the
round-trip claims above. All three are now fixed.

- **`services[].priceGEL` could write invalid data silently — FIXED.** The
  client filter only checked `s.priceGEL.trim() !== ""`, so a non-numeric
  entry like `"abc"` became `parseFloat("abc")` = `NaN`, which
  `JSON.stringify` serializes to `null`. The PATCH route's
  `findByIdAndUpdate` had no `runValidators: true`, so `ServiceSchema`'s
  `required`/`min: 0` constraints on `priceGEL` never ran — a `null` or
  negative price could land in MongoDB and the public page would render
  `null ₾`. Fixed in `src/components/business/listing-form.tsx` (blocks
  submit with a toast when a named service row has a non-finite or negative
  price, instead of silently dropping the row) and
  `src/app/api/business/listings/[id]/route.ts` (added
  `runValidators: true` as a schema-level backstop).
- **Owner-supplied image URLs could crash the public page — FIXED.**
  `next.config.ts` restricts `next/image` `remotePatterns` to three CDNs
  (`images.unsplash.com`, `source.unsplash.com`, `upload.wikimedia.org`),
  but owners can paste any image URL into `ListingForm`. Every place that
  rendered an owner-supplied `place.images[...]` through `next/image` would
  throw at render time for a non-allow-listed host. Switched to a plain
  `<img>` (same pattern already used for admin-supplied logos in
  `site-header.tsx` and for listing thumbnails in `business/media/page.tsx`)
  in: `src/app/[locale]/places/[slug]/page.tsx` (cover + gallery images),
  `src/components/site/place-card.tsx`, `src/components/map/map-explorer.tsx`
  (selected-place preview), and `src/app/[locale]/reserve/[placeId]/page.tsx`.
  `src/components/site/home/featured-places.tsx` and
  `src/app/[locale]/discover/page.tsx` were checked and left unchanged —
  both currently render `mockPlaces`, not owner-controlled DB data, so they
  are not exposed today.
- **A booking fee could be set but never removed — FIXED.** Blanking
  `reservationPriceGEL` sent `undefined`, which `JSON.stringify` drops from
  the request body entirely, so the PATCH route's `if (key in body)` guard
  never saw the key and never cleared the field — only an overwrite with
  another positive number was possible. `ListingForm` now sends an explicit
  `null` when the field is blank, and the PATCH route
  (`src/app/api/business/listings/[id]/route.ts`) translates a `null` value
  for any writable field into `$unset` instead of `$set`, so blanking the
  field actually removes it.

## Deals question — recommendation

**The new `services[]` editor does NOT satisfy "make deals."** They are
different concepts:

- `Place.services` (this task) is a plain price list attached to a listing —
  no discount, no expiry, no voucher/redemption flow.
- `DealOption` / `VoucherModel` is a time-bound **discounted offer**
  (`priceOriginal`, `priceGEL`, `discountPct`, `validUntil`, `badge`) that,
  once bought, becomes a redeemable voucher issued through the Flitt payment
  callback — a fundamentally different lifecycle (browse deal → pay → voucher
  issued → redeemed in person) with no owner-authoring path today.

**Recommendation:** treat "deals" as a separate, real subsystem and write its
own spec. It needs: a `Deal` model (or an extension of `VoucherModel`) with
`ownerId`, owner-facing CRUD API gated by `requireListingAccess`, an
owner-facing UI (likely a new `/business/deals` panel following this task's
form patterns), and migrating `/deals` off `mockDeals` onto the new model.
Do not fold this into the services editor — it would either under-serve deals
(no discount/expiry semantics) or overload services with fields that don't
belong on a static price list.

## File upload — recorded as MISSING

There is no blob/storage provider wired into this project (no `@vercel/blob`
in `package.json`, no S3/Cloudinary client, nothing under `src/lib` for
uploads). The image and media-page fixes in this task are URL-input only, per
the brief's explicit instruction not to build file upload. Adding real
uploads needs: a storage provider decision, an upload API route, and
presigned-URL or direct-upload wiring in the form — a new subsystem, out of
scope here.

## `nameRu` / `descriptionRu` / `tags`

Confirmed **MISSING**, intentionally not added. `ListingForm` has no
Russian-locale section at all (only EN/KA throughout — name, description,
category labels are English-only UI strings too). Bolting on a lone
`nameRu`/`descriptionRu` pair without the rest of the Russian-locale
authoring experience (and without the surrounding UI copy translated) would
be a partial, confusing feature. `tags` has no UI concept elsewhere in the
business panel either (no tag picker, no chip input pattern to follow) and
was left out for the same reason. Both are legitimately writable via the API
today (present in `writableListingFields`) — a future task should decide
whether they need a UI at all or are meant to be superadmin/import-only.

## Step 5 — cross-owner isolation (reasoned, not executed)

Per the brief, I did not have a business-owner browser session available and
did not start a second dev server. The five checks below are answered by
reading the guard code and its existing unit tests
(`src/lib/permissions.test.ts`, part of the 46 passing tests), not by
clicking through the UI:

1. `/en/business/listings` shows only the caller's listings — **reasoned
   WORKS**: the page queries `PlaceModel.find({ ownerId: userId })` where
   `userId` comes from the session, not from any client input.
2. Opening owner B's listing editor by URL as owner A — **reasoned WORKS
   (redirect)**: `edit/page.tsx` calls `requireListingAccess(id)`; on denial
   it `redirect`s to `/business/listings` rather than rendering the form.
3. `curl` PATCH to owner B's listing with owner A's session cookie — **reasoned
   WORKS (403)**: the PATCH route calls the same `requireListingAccess`,
   which returns a `403 Forbidden` `Response` before any update is
   constructed, for any actor that is neither the owner nor superadmin.
4. `/en/superadmin` as a business owner — **reasoned WORKS (redirect)**:
   gated by `canAccessStaffPanel`, `role === "superadmin"` only; not
   independently re-verified live this session (out of scope for Task 10,
   already covered by earlier tasks' verification).
5. `/en/superadmin/theme` as a business owner — **reasoned WORKS (redirect)**:
   same guard, same reasoning as (4).

None of these five were exercised in an actual browser this session; this is
stated explicitly per the brief's instruction not to claim UI verification
that was not performed.

## Build / lint / test

- `npm run build`: **PASS**, no new errors.
- `npm run lint`: **78 errors / 188 warnings**, identical to the measured
  baseline before this task's changes — no new lint issues in touched files.
- `npm test`: **46 passing / 0 failing**.
