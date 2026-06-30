# Admin Panel Redesign — Site Owner + Business Owner

**Date:** 2026-06-30
**Status:** Approved design, ready for implementation plan

## Goal

Restructure the admin experience around **two roles** instead of four:

1. **Site owner / moderator** (`admin`) — full control over the site: catalog, moderation, business requests, listing fees, landing page, deals, pricing, platform settings, users, audit.
2. **Business owner** (`business`) — existing business panel at `/business`, **not redesigned** in this work (one small addition: propose-deal form).

The site owner must be able to:
- Edit the landing page (content of all sections, reorder, show/hide, choose featured places).
- Review business listing requests: accept, decline, or **exempt from the listing fee**.
- Change the listing fee (globally) and override it per request.
- Create and manage **deals**, and approve **business-submitted deals**.

## Decisions (locked)

| Topic | Decision |
|-------|----------|
| Roles | Collapse `admin + superadmin` → single `admin`. Enum: `tourist \| business \| admin`. |
| Panel | One unified `/admin`, sidebar grouped into 6 **collapsible** groups. Delete `/superadmin`. |
| Stubs | Leave mock-data admin pages (places/cities/reservations/orders) as stubs this work. |
| Listing fee | Global default in DB (replaces hardcoded 5000 tetri) + per-request override + exempt. Charged **per listing**. |
| Fee UI | Global setting on `/admin/pricing` (Marketing). Override/exempt controls on each business request. |
| Landing | Edit all 7 sections' content + reorder (**up/down buttons**) + show/hide + pick featured places. Empty fields fall back to current hardcoded defaults. |
| Deals | New `DealModel`, full owner CRUD + **business-submitted** deals with approval queue. Minimal propose-deal form in business panel. |
| Sequencing | **Phased** implementation, one spec. 4 phases, each shippable + reviewable. |

## Architecture

Existing stack (unchanged): Next.js 16 App Router, next-intl (`en/ka/ru`), MongoDB/Mongoose, NextAuth v5 JWT, Tailwind v4 + shadcn (base-ui), Flitt payments.

Reuse existing models where possible — **`SiteConfigModel`** holds global listing fee + landing config. **`BusinessRequestModel`** gains fee-override fields. **`PlaceModel`** gains resolved-fee field. One new model: **`DealModel`**.

---

## Phase 1 — Role merge + unified grouped panel

### Role model & auth

- `UserModel` role enum: drop `superadmin` → `tourist | business | admin`. Migration: existing `superadmin` users → `admin`.
- `src/lib/auth.ts`: rename `SUPERADMIN_EMAILS` → `OWNER_EMAILS` (same two emails); bootstrap those to `admin`. JWT callback maps any legacy `superadmin` token → `admin` on read (stale tokens keep working).
- `src/types/next-auth.d.ts`: narrow role type.
- Gates: `/admin/layout.tsx` allows `["admin"]`. `/business/layout.tsx` allows `["business","admin"]`.
- `src/lib/require-admin.ts`: check `role === "admin"`.

### Panel unification

- Move all `/superadmin` pages into `/admin`; delete `/superadmin` dir.
- Move `/api/superadmin/*` → `/api/admin/*`; update auth checks + all callers.
- Move `src/components/superadmin/*` → `src/components/admin/`; drop `SuperAdmin`/`superadmin` prefixes (e.g. `SuperAdminUsersTable` → `UsersTable`).
- **Dedupe users:** `/admin/users` and `/superadmin/users` share `SuperAdminUsersTable` → keep single Users page (Platform group).
- **Dashboard merge:** combine admin business KPIs (users, trips, revenue, plans) + platform KPIs (listings, pending requests, pending reports) into one Overview with existing charts.

### Sidebar — 6 collapsible groups

| Group | Items |
|-------|-------|
| Overview | Dashboard (merged) |
| Catalog | Places, Cities |
| Moderation | Listing approvals, Content reports, Reservations, Ticket orders |
| Businesses | Business requests (with fee override/exempt) |
| Marketing | Landing editor *(P3)*, Deals *(P4)*, Pricing plans (+ global listing fee *(P2)*) |
| Platform | Users, Security/audit, Theme, CMS, Media, Database |

Active group auto-expands.

---

## Phase 2 — Listing fee config + per-request override

- Remove hardcoded `LISTING_FEE_TETRI = 5000` (`src/app/api/flitt/checkout/route.ts:10`).
- `SiteConfigModel`: add `listingFeeTetri: number` (default 5000). Edit on `/admin/pricing`.
- `BusinessRequestModel`: add `feeOverrideTetri?: number` (null = global) and `feeExempt: boolean` (default false).
- `PlaceModel`: add `listingFeeTetri?: number` (resolved fee for this listing). Reuse `paid`.
- Approve flow `/api/admin/businesses/[id]/approve`: site owner chooses **global fee / custom fee / exempt**. Persist on request; propagate resolved fee to the owner's place(s). Exempt → set `paid=true`, skip Flitt.
- `/api/flitt/checkout`: resolve fee from place → request override → global, instead of constant. Reject if already paid/exempt.
- UI: business-approval component gains fee controls (radio: global / custom GEL / exempt).

Fee is **per listing** (tied to `place.paid`); override/exempt applies per business but charges on each listing.

---

## Phase 3 — Landing page editor

- `SiteConfigModel`: add `homeSections: [{ key, enabled, order }]` for the 7 sections (hero, stats, categories, featured, neighborhoods, aiCta, listBusiness), plus per-section content fields and `featuredPlaceIds: string[]`.
- `src/app/[locale]/page.tsx`: read config, render **enabled** sections in `order`, pass content props.
- Section components (`src/components/site/home/*`): accept content props with **safe defaults = current hardcoded values** (empty config → unchanged homepage).
- Featured places: replace `mockPlaces.slice(0,4)` with query of `PlaceModel` by `featuredPlaceIds` (fall back to mock if empty).
- Admin UI: Marketing → Landing editor. Per section: enable toggle + ↑↓ reorder + content fields. Featured-places multi-select picker (from active places).

---

## Phase 4 — Deals system

- New **`DealModel`** mirroring `DealOption` (`src/types/index.ts:290`): title, description, priceOriginal, priceGEL, discountPct, category, validUntil, image, badge — plus `ownerId?`, `status: pending|approved|rejected`, `placeId?`, `active: boolean`, `rejectionReason?`, timestamps.
  - Owner-created → start `approved`. Business-submitted → start `pending`.
- Public `/deals` page: query `DealModel` where `approved` + `active` + `validUntil` future. Drop mock.
- Admin (Marketing → Deals): full CRUD + approval queue for business-submitted (approve/reject).
- Business panel: **minimal** propose-deal form → creates `pending` deal. (Only addition to business panel.)
- Payment: `deal` purpose already in `PaymentModel`; wire checkout to deal price.

---

## i18n

Every new admin label + landing field added to `messages/en.json`, `messages/ka.json`, `messages/ru.json` together.

## Testing

No test suite configured. Manual verification per phase:
- P1: log in as owner email → `/admin` loads, all groups present, `/superadmin` 404s, business panel still gated, stale superadmin token still works.
- P2: change global fee → reflected at checkout; exempt a request → listing publishes free; custom fee → checkout charges that amount.
- P3: empty config → homepage identical to today; toggle/reorder/feature-pick → reflected on `/`.
- P4: owner creates deal → shows on `/deals`; business proposes → appears in queue as pending → approve → shows on `/deals`.

## Risks

- **Import churn (P1):** moving pages/components/APIs touches many imports. Mechanical — grep callers, update paths.
- **Stale JWTs (P1):** mitigated by JWT callback mapping `superadmin → admin` on read.
- **Section prop-ifying (P3):** components currently take few props; add props with defaults carefully, section by section, so empty config never breaks the homepage.
