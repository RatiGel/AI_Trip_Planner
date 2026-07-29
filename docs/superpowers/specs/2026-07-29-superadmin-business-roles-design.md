# Superadmin / Business Role Split — Design

**Date:** 2026-07-29
**Status:** Approved, ready for implementation plan

## Problem

Three overlapping panels exist (`/admin`, `/superadmin`, `/business`) with no clear ownership boundary:

1. **Privilege leak** — `/admin` layout allows `role: "admin"`, granting business owners access to Theme, CMS, Database, Users, and Pricing pages.
2. **No entry point** — a superadmin signing in lands on the homepage with no visible link to `/superadmin`.
3. **Superadmin cannot edit business content** — `/business/listings/[id]/edit` hard-blocks any non-owner, so a superadmin cannot open the "Cafe Stamba" editor even though the PATCH API already permits it.
4. **CMS saves are inert** — `/admin/cms` writes header, footer, and per-page hero config to MongoDB, but no public component reads it back. Theme (colors, fonts) does apply; CMS does not.
5. **Duplicated authorization** — each API route re-implements its own role check inline, so gaps are invisible.

## Goals

- One staff panel (`/superadmin`), superadmin-only, containing everything.
- Business owners (`role: "business"`) confined to `/business`, scoped to their own listings, with full control over those listings.
- Superadmin can edit any business's content through the same editor the owner uses.
- CMS edits visibly change the live site.
- Authorization centralized in one auditable module.

## Non-Goals

- Click-to-edit inline text on public pages. Deferred; a floating edit-affordance bar ships instead.
- `componentOrder` section reordering (field exists in the schema, stays unimplemented).
- Google OAuth changes, new payment flows, or new business features beyond auditing existing ones.

---

## 1. Role model and permissions core

### Roles

| Role | Access |
|---|---|
| `tourist` | Public site; own trips and reservations |
| `business` | `/business` — own listings only |
| `admin` | Deprecated. Existing accounts migrate to `business`. Enum value retained so old documents still validate, but no route grants it access |
| `superadmin` | Everything, including any listing, theme, CMS, and the database browser |

`SUPERADMIN_EMAILS` in `src/lib/auth.ts` already contains `ratige12@gmail.com` and `ninikusradze@gmail.com`, and the `signIn`/`jwt`/`session` callbacks force `role: "superadmin"` on every login for those addresses. No change and no migration needed for superadmin identity.

### New module: `src/lib/permissions.ts`

Single source of truth for authorization. Pure logic given a session, so it is unit-testable.

```ts
type Role = "tourist" | "business" | "admin" | "superadmin";
type Actor = { id: string; email: string; role: Role };

getActor(): Promise<Actor | null>                 // wraps auth()
isSuperadmin(actor: Actor | null): boolean

// Guards — return an Actor on success, or a 403/401 Response on failure.
requireSuperadmin(): Promise<Actor | Response>
requireBusiness(): Promise<Actor | Response>      // business | superadmin

// Listing-scoped guard. Owner OR superadmin passes.
requireListingAccess(placeId: string): Promise<
  | { actor: Actor; place: PlaceDoc; asSuperadmin: boolean }
  | Response
>
```

`requireListingAccess` is the linchpin. It returns `asSuperadmin` so callers widen the writable-field set only for staff. Callers distinguish success from failure with `instanceof Response`.

**Field-write policy**

- Owner-writable (existing allowlist): `name`, `nameKa`, `citySlug`, `description`, `descriptionKa`, `categories`, `priceLevel`, `phone`, `email`, `website`, `socials`, `openingHours`, `reservable`, `geo`, `images`, `services`, `reservationPriceGEL`
- Owner status transitions (existing, correct): `draft|rejected → pending`, `pending → draft`. Nothing else.
- Superadmin-only: `status` to any value, `featured`, `paid`, `ownerId` (reassignment), `rating`

Every route under `/api/admin/*`, `/api/superadmin/*`, and `/api/business/*` is audited against these guards. Any route currently missing a check gets one.

---

## 2. Panel merge

`/superadmin` becomes the single staff panel. All thirteen `/admin` pages move under it. `/admin/*` permanently redirects to `/superadmin/*`.

```
/superadmin                      superadmin ONLY
  Overview
  ── Platform ──   Users · Businesses · Reports · Security
  ── Content ──    Places · Cities · Moderation · Media · Notifications
  ── Commerce ──   Reservations · Orders · Pricing
  ── Design ──     Theme · CMS
  ── System ──     Database

/business                        business owners (superadmin may also enter)
  Overview · Listings · Reviews · Media · Analytics · Billing

/admin/*  →  redirect to /superadmin/*
```

### Mechanics

- `git mv` the page files from `src/app/[locale]/admin/` to `src/app/[locale]/superadmin/`.
- Leave components in `src/components/admin/` — no rename churn, they are still admin-panel components.
- Rewrite the `/superadmin` layout sidebar with the grouped sections above, reusing the collapse-and-persist behavior from `src/components/admin/sidebar.tsx` (localStorage key `admin-sidebar-collapsed`).
- Delete `src/app/[locale]/admin/layout.tsx`.
- Add a catch-all redirect at `src/app/[locale]/admin/[[...rest]]/page.tsx` that forwards to the matching `/superadmin` path.
- Rewrite hardcoded `/admin` links. Known locations: `src/components/site/site-header.tsx`, `src/components/admin/sidebar.tsx`, `src/app/[locale]/admin/places/page.tsx`, `src/app/robots.ts`.

### Stray duplicate files

`src/app/[locale]/admin/notifications/page 2.tsx` and `page 3.tsx` are untracked editor-duplicate artifacts. Delete them rather than move them. The same `* 2.ts` pattern appears across `src/lib/` and `src/components/` in the working tree; leave those alone — out of scope.

---

## 3. Superadmin edits any content

### Unblock the shared editor

`src/app/[locale]/business/listings/[id]/edit/page.tsx` redirects when `place.ownerId !== userId`. Replace that check with `requireListingAccess(id)`.

When the actor is a superadmin who does not own the listing, render a banner above the form:

> Editing as superadmin — owner: {name} ({email})

The PATCH handler in `src/app/api/business/listings/[id]/route.ts` already permits superadmin writes, so the base edit path needs no API change. It is refactored to call `requireListingAccess` for consistency, and superadmin-only fields are added to the allowlist under `asSuperadmin`.

Listing-adjacent routes (`/api/business/reviews/[id]/reply`, media, vouchers) get the same treatment.

### Edit-affordance bar

New client component `src/components/superadmin/edit-bar.tsx`, mounted in the locale layout, rendering only when `session.user.role === "superadmin"`. Floating bottom-right, collapsible, with state persisted to localStorage. Contextual links derived from `usePathname()`:

```
┌─ ⚡ Superadmin ──────────┐
│ ✎ Edit this listing     │   only on /places/[slug]
│ ✎ Page content          │   → /superadmin/cms
│ ✎ Theme                 │   → /superadmin/theme
│ ⚙ Panel                 │   → /superadmin
└─────────────────────────┘
```

"Edit this listing" needs a place id, which the pathname only carries as a slug. The place detail page passes an explicit `editHref` into the bar via a context provider; pages that set nothing omit that row. It must not overlap the existing `AiChatFab` — offset vertically.

Additionally, each row of `/superadmin/places` gets an inline Edit action linking to the same editor.

---

## 4. Wire CMS into the live site

`getSiteConfig()` is currently read only by its own editor page. Three consumers start reading it.

| Consumer | Fields |
|---|---|
| `SiteHeader` | `header.logoText`, `header.logoImageUrl`, `header.navLinks` |
| `SiteFooter` | `footer.copyrightText`, `footer.columns`, `footer.socialLinks` |
| Homepage | `pages.home.heroTitle`, `heroSubtitle`, `heroImageUrl`, `showCategories`, `showFeaturedPlaces` |

**Fallback rule:** every field falls back to its current hardcoded value when absent or empty. An unconfigured or empty database must render exactly what the site renders today — a blank `navLinks` array must not blank the navigation.

**One fetch:** `getSiteConfig()` is called once in the locale layout (alongside the existing `getAdminConfig()` call) and passed down as props to `SiteHeader` and `SiteFooter`. The homepage fetches its own `pages.home` slice since it is a separate route segment.

---

## 5. Business owner capability audit

Audit each capability against a `role: "business"` account and fix gaps found.

| Capability | Location | Check |
|---|---|---|
| Create / edit own listing | `/business/listings` | Field coverage vs the Place schema |
| Upload / reorder images | `/business/media` | Images attach to an owned listing; query is owner-scoped |
| Services and prices | `ListingForm` | `services[]` is editable |
| Deals / vouchers | voucher model | Owner can create, scoped to their own listing |
| Reply to reviews | `/api/business/reviews/[id]/reply` | Owner-scoped |
| Submit for approval | PATCH `status` | Already correct: owner limited to draft↔pending |
| **Cannot** edit others' listings | all business APIs | Enforced by `requireListingAccess` |
| **Cannot** reach staff panel | `/superadmin` layout | Already redirects when `role !== "superadmin"` |

Findings are reported; anything broken or missing is fixed within the owner-writable field policy from §1.

---

## 6. Login redirect

The login page's post-`signIn` handler resolves the destination:

1. An explicit `callbackUrl` search param wins.
2. Otherwise by role: `superadmin → /superadmin`, `business → /business`, `tourist → /`.

Sessions are JWT, so the role is available on the session immediately after `signIn` resolves — no extra round trip. Google OAuth sign-in follows the same path since the role is set in the `signIn`/`jwt` callbacks before the redirect.

---

## Testing and verification

No test suite is configured in this project. Verification is therefore:

- **Unit tests for `src/lib/permissions.ts`** — the one piece worth locking down, since it is pure logic over a session object and a place document. Covers: superadmin passes every guard; owner passes `requireListingAccess` for their own listing; owner is refused another owner's listing; `tourist` and `admin` are refused every staff guard; `asSuperadmin` is false for an owner and true for staff.
- **Manual role matrix** — one account per role, walking every panel route and confirming allow/deny.
- `npm run build` and `npm run lint` clean.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Moving thirteen pages breaks hardcoded `/admin` links | Grep and rewrite all four known files; the catch-all redirect catches anything missed |
| CMS wiring blanks the header or footer when config is empty | Fallback-to-hardcoded on every field (§4), verified against an empty database |
| Existing `role: "admin"` accounts lose staff access | Intentional. A migration script flips them to `business`; the affected count is reported before the script runs |
| `requireListingAccess` refactor regresses an owner path | Unit tests plus the manual matrix cover owner and superadmin separately |

## Out of scope / follow-ups

- Click-to-edit inline text editing on public pages — needs its own spec.
- `componentOrder`-driven homepage section reordering.
- Cleaning up the `* 2.ts` / `* 3.tsx` duplicate files elsewhere in the working tree.
