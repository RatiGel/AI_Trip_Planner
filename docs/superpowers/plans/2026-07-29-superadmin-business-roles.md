# Superadmin / Business Role Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/superadmin` the single superadmin-only staff panel with power to edit any business's content, confine business owners to their own listings, and make CMS edits actually render on the live site.

**Architecture:** A new pure-logic `src/lib/permissions.ts` module becomes the single authorization authority; every panel layout and API route calls it instead of re-deriving role checks inline. The thirteen `/admin` pages move under `/superadmin` and `/admin/*` becomes a redirect. The existing `/business` listing editor is reused for superadmin edits by swapping its ownership check for a permission guard, and a floating edit bar gives superadmins a route into it from public pages. Separately, the already-persisted `SiteConfig` document is wired into `SiteHeader`, `SiteFooter`, and the homepage with fallback-to-hardcoded on every field.

**Tech Stack:** Next.js 16 (App Router, `params` is a Promise), React 19, next-intl 4, NextAuth v5 beta (JWT sessions), Mongoose 9 / MongoDB, Tailwind v4, shadcn/ui on `@base-ui/react`, `node --test` via tsx for unit tests.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-29-superadmin-business-roles-design.md`. Read it before starting.
- **Next.js 16:** `params` and `searchParams` in page/layout props are Promises — always `await` them.
- **i18n navigation:** import `Link`, `useRouter`, `redirect`, `usePathname` from `@/i18n/navigation`, **never** from `next/navigation`. Exception: `usePathname` from `next/navigation` is already used in `src/components/admin/sidebar.tsx` because it needs the locale-prefixed path; preserve that behavior where it already exists.
- **Server components:** call `setRequestLocale(locale)` before rendering; call `await connectDB()` before any model query.
- **i18n messages:** any new user-facing string added to `messages/en.json` must be added to `messages/ka.json` and `messages/ru.json` in the same commit.
- **Test command:** `npm test` runs `node --import tsx --test "src/**/*.test.ts"`. Only `.test.ts` files under `src/` are collected. Tests must not require a database connection.
- **Roles:** exactly `"tourist" | "business" | "admin" | "superadmin"`. `"admin"` is deprecated — no route grants it access, but the enum value stays in the schema.
- **Superadmin emails:** `SUPERADMIN_EMAILS` in `src/lib/auth.ts` already contains `ninikusradze@gmail.com` and `ratige12@gmail.com`. Do not modify this list.
- **Fallback rule:** every CMS-driven field falls back to its current hardcoded value when absent or empty. An empty database must render exactly what the site renders today.
- **Verify each task:** `npm run lint` must pass before every commit. `npm run build` must pass before the commits in Tasks 3, 8, and 11.
- **Commit style:** Conventional Commits. Do not add a Claude co-author trailer unless the repo's recent history uses one (it does not).

---

## File Structure

**Created:**
| File | Responsibility |
|---|---|
| `src/lib/permissions.ts` | Authorization authority. Role predicates and route guards. Pure logic given a session + place document. |
| `src/lib/permissions.test.ts` | Unit tests for the above. |
| `src/app/[locale]/admin/[[...rest]]/page.tsx` | Catch-all redirect `/admin/*` → `/superadmin/*`. |
| `src/components/superadmin/edit-bar.tsx` | Floating superadmin edit-affordance bar (client). |
| `src/components/superadmin/edit-target.tsx` | Context provider letting a page declare its "edit this listing" href. |
| `src/lib/site-config-defaults.ts` | Hardcoded fallbacks for header/footer/home config, shared by the resolver. |
| `scripts/migrate-admin-role.ts` | One-off: report and flip `role: "admin"` users to `"business"`. |

**Modified:**
| File | Change |
|---|---|
| `src/app/[locale]/superadmin/layout.tsx` | Grouped sidebar covering all 19 pages; collapse behavior. |
| `src/app/[locale]/business/layout.tsx` | Guard via `requireBusiness`-equivalent; drop `"admin"` from allowed roles. |
| `src/app/[locale]/business/listings/[id]/edit/page.tsx` | Replace `ownerId` check with `requireListingAccess`; superadmin banner. |
| `src/app/api/business/listings/[id]/route.ts` | Use `requireListingAccess`; add superadmin-only writable fields. |
| `src/app/api/business/listings/route.ts` | Use the shared guard. |
| `src/app/api/business/reviews/[id]/reply/route.ts` | Use the shared guard, owner-scoped. |
| `src/app/api/admin/**`, `src/app/api/superadmin/**` | Use `requireSuperadmin`. |
| `src/components/site/site-header.tsx` | Accept optional CMS config props; deprecated `/admin` link removed. |
| `src/components/site/site-footer.tsx` | Accept optional CMS config props. |
| `src/app/[locale]/layout.tsx` | Fetch site config once; pass to header/footer; mount edit bar. |
| `src/app/[locale]/page.tsx` | Read `pages.home` hero + section toggles. |
| `src/components/site/home/hero-section.tsx` | Accept optional title/subtitle/image overrides. |
| `src/components/site/auth-card.tsx` | Role-based post-sign-in redirect. |
| `src/app/[locale]/places/[slug]/page.tsx` | Declare its edit target for the edit bar. |
| `src/app/robots.ts` | Disallow `/superadmin` alongside `/admin`. |
| `messages/{en,ka,ru}.json` | New superadmin nav + edit-bar strings. |

**Moved (git mv):** the thirteen page directories under `src/app/[locale]/admin/` → `src/app/[locale]/superadmin/`. Components stay in `src/components/admin/`.

**Deleted:** `src/app/[locale]/admin/layout.tsx`, `src/app/[locale]/admin/notifications/page 2.tsx`, `src/app/[locale]/admin/notifications/page 3.tsx`.

---

## Task 1: Permissions module

**Files:**
- Create: `src/lib/permissions.ts`
- Test: `src/lib/permissions.test.ts`

**Interfaces:**
- Consumes: `auth()` from `src/lib/auth.ts`; `PlaceModel` from `src/lib/models/place.ts`; `connectDB` from `src/lib/db.ts`.
- Produces (every later task depends on these exact names):
  ```ts
  type Role = "tourist" | "business" | "admin" | "superadmin";
  type Actor = { id: string; email: string; role: Role };
  type ListingAccess = { actor: Actor; place: PlaceLike; asSuperadmin: boolean };

  // Pure — unit tested.
  function isSuperadmin(actor: Actor | null | undefined): boolean;
  function canAccessStaffPanel(actor: Actor | null | undefined): boolean;
  function canAccessBusinessPanel(actor: Actor | null | undefined): boolean;
  function canEditListing(actor: Actor | null | undefined, place: PlaceLike | null | undefined): boolean;
  function writableListingFields(asSuperadmin: boolean): string[];
  function resolveOwnerStatusTransition(current: string, next: unknown): string | null;
  function postLoginPath(role: string | null | undefined): string;

  // Session-dependent — not unit tested (needs auth()/DB).
  function getActor(): Promise<Actor | null>;
  function requireSuperadmin(): Promise<Actor | Response>;
  function requireBusiness(): Promise<Actor | Response>;
  function requireListingAccess(placeId: string): Promise<ListingAccess | Response>;
  function isDenied<T>(r: T | Response): r is Response;
  ```

Note the split: everything a route needs to *decide* is a pure function; the async guards are thin wrappers that fetch and delegate. That is what makes this testable without a database.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/permissions.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isSuperadmin,
  canAccessStaffPanel,
  canAccessBusinessPanel,
  canEditListing,
  writableListingFields,
  resolveOwnerStatusTransition,
  postLoginPath,
} from "./permissions";

const superadmin = { id: "u1", email: "boss@example.com", role: "superadmin" as const };
const owner = { id: "u2", email: "owner@example.com", role: "business" as const };
const otherOwner = { id: "u3", email: "other@example.com", role: "business" as const };
const legacyAdmin = { id: "u4", email: "legacy@example.com", role: "admin" as const };
const tourist = { id: "u5", email: "tourist@example.com", role: "tourist" as const };

const place = { _id: "p1", ownerId: "u2", status: "active" };

test("isSuperadmin recognises only the superadmin role", () => {
  assert.equal(isSuperadmin(superadmin), true);
  assert.equal(isSuperadmin(owner), false);
  assert.equal(isSuperadmin(legacyAdmin), false);
  assert.equal(isSuperadmin(null), false);
  assert.equal(isSuperadmin(undefined), false);
});

test("staff panel admits superadmin only", () => {
  assert.equal(canAccessStaffPanel(superadmin), true);
  assert.equal(canAccessStaffPanel(legacyAdmin), false, "deprecated admin role must be locked out");
  assert.equal(canAccessStaffPanel(owner), false);
  assert.equal(canAccessStaffPanel(tourist), false);
  assert.equal(canAccessStaffPanel(null), false);
});

test("business panel admits business owners and superadmins", () => {
  assert.equal(canAccessBusinessPanel(owner), true);
  assert.equal(canAccessBusinessPanel(superadmin), true);
  assert.equal(canAccessBusinessPanel(legacyAdmin), false);
  assert.equal(canAccessBusinessPanel(tourist), false);
  assert.equal(canAccessBusinessPanel(null), false);
});

test("canEditListing allows the owner and any superadmin, refuses everyone else", () => {
  assert.equal(canEditListing(owner, place), true);
  assert.equal(canEditListing(superadmin, place), true);
  assert.equal(canEditListing(otherOwner, place), false, "another owner must not edit this listing");
  assert.equal(canEditListing(tourist, place), false);
  assert.equal(canEditListing(legacyAdmin, place), false);
  assert.equal(canEditListing(null, place), false);
  assert.equal(canEditListing(owner, null), false);
});

test("canEditListing compares owner ids as strings", () => {
  const objectIdish = { toString: () => "u2" };
  assert.equal(canEditListing(owner, { _id: "p9", ownerId: objectIdish, status: "active" }), true);
});

test("superadmin gets strictly more writable fields than an owner", () => {
  const ownerFields = writableListingFields(false);
  const staffFields = writableListingFields(true);
  for (const f of ownerFields) assert.ok(staffFields.includes(f), `${f} missing for superadmin`);
  for (const f of ["featured", "paid", "ownerId", "rating"]) {
    assert.ok(staffFields.includes(f), `${f} must be superadmin-writable`);
    assert.ok(!ownerFields.includes(f), `${f} must NOT be owner-writable`);
  }
  assert.ok(ownerFields.includes("name"));
  assert.ok(ownerFields.includes("images"));
  assert.ok(ownerFields.includes("services"));
  assert.ok(!ownerFields.includes("status"), "status is governed by resolveOwnerStatusTransition");
});

test("owner status transitions: only submit and withdraw", () => {
  assert.equal(resolveOwnerStatusTransition("draft", "pending"), "pending");
  assert.equal(resolveOwnerStatusTransition("rejected", "pending"), "pending");
  assert.equal(resolveOwnerStatusTransition("pending", "draft"), "draft");
  assert.equal(resolveOwnerStatusTransition("active", "draft"), null, "cannot unpublish a live listing");
  assert.equal(resolveOwnerStatusTransition("pending", "active"), null, "cannot self-activate");
  assert.equal(resolveOwnerStatusTransition("draft", "approved"), null, "cannot self-approve");
  assert.equal(resolveOwnerStatusTransition("draft", 42), null, "non-string is ignored");
  assert.equal(resolveOwnerStatusTransition("draft", undefined), null);
});

test("postLoginPath routes each role to its home", () => {
  assert.equal(postLoginPath("superadmin"), "/superadmin");
  assert.equal(postLoginPath("business"), "/business");
  assert.equal(postLoginPath("tourist"), "/trips");
  assert.equal(postLoginPath("admin"), "/trips", "deprecated role lands on the tourist page");
  assert.equal(postLoginPath(undefined), "/trips");
  assert.equal(postLoginPath(null), "/trips");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot find module `./permissions`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/permissions.ts`:

```ts
import { auth } from "./auth";
import { connectDB } from "./db";
import { PlaceModel } from "./models/place";

export type Role = "tourist" | "business" | "admin" | "superadmin";

export type Actor = { id: string; email: string; role: Role };

/** Minimal shape of a Place needed for an access decision. */
export type PlaceLike = { _id: unknown; ownerId?: unknown; status?: string };

export type ListingAccess = {
  actor: Actor;
  place: PlaceLike & Record<string, unknown>;
  asSuperadmin: boolean;
};

/**
 * Fields a listing owner may write. Anything outside this list is dropped.
 * `status` is deliberately absent — owner transitions go through
 * resolveOwnerStatusTransition so a self-approval is impossible.
 */
const OWNER_WRITABLE = [
  "name",
  "nameKa",
  "nameRu",
  "citySlug",
  "description",
  "descriptionKa",
  "descriptionRu",
  "categories",
  "images",
  "priceLevel",
  "phone",
  "email",
  "website",
  "socials",
  "openingHours",
  "reservable",
  "geo",
  "services",
  "reservationPriceGEL",
  "averageVisitDurationMin",
  "tags",
] as const;

/** Fields only a superadmin may write. */
const SUPERADMIN_ONLY_WRITABLE = ["featured", "paid", "ownerId", "rating"] as const;

export function isSuperadmin(actor: Actor | null | undefined): boolean {
  return actor?.role === "superadmin";
}

/**
 * The staff panel (/superadmin) is superadmin-only. The legacy "admin" role is
 * deprecated and intentionally refused here — see the spec's role table.
 */
export function canAccessStaffPanel(actor: Actor | null | undefined): boolean {
  return isSuperadmin(actor);
}

export function canAccessBusinessPanel(actor: Actor | null | undefined): boolean {
  return actor?.role === "business" || isSuperadmin(actor);
}

export function canEditListing(
  actor: Actor | null | undefined,
  place: PlaceLike | null | undefined
): boolean {
  if (!actor || !place) return false;
  if (isSuperadmin(actor)) return true;
  if (actor.role !== "business") return false;
  if (place.ownerId == null) return false;
  return String(place.ownerId) === String(actor.id);
}

export function writableListingFields(asSuperadmin: boolean): string[] {
  return asSuperadmin
    ? [...OWNER_WRITABLE, ...SUPERADMIN_ONLY_WRITABLE]
    : [...OWNER_WRITABLE];
}

/**
 * The only status changes an owner may make: submit for review
 * (draft|rejected -> pending) and withdraw a submission (pending -> draft).
 * Returns the new status, or null when the transition is not permitted.
 */
export function resolveOwnerStatusTransition(
  current: string,
  next: unknown
): string | null {
  if (typeof next !== "string") return null;
  if (next === "pending" && (current === "draft" || current === "rejected")) return "pending";
  if (next === "draft" && current === "pending") return "draft";
  return null;
}

/** Where a freshly signed-in user lands, absent an explicit callbackUrl. */
export function postLoginPath(role: string | null | undefined): string {
  if (role === "superadmin") return "/superadmin";
  if (role === "business") return "/business";
  return "/trips";
}

function forbidden(message = "Forbidden") {
  return Response.json({ error: message }, { status: 403 });
}

/** True when a guard returned a rejection instead of a value. */
export function isDenied<T>(result: T | Response): result is Response {
  return result instanceof Response;
}

export async function getActor(): Promise<Actor | null> {
  const session = await auth();
  const user = session?.user as
    | { id?: string; email?: string | null; role?: string }
    | undefined;
  if (!user?.id) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    role: (user.role as Role) ?? "tourist",
  };
}

export async function requireSuperadmin(): Promise<Actor | Response> {
  const actor = await getActor();
  if (!canAccessStaffPanel(actor)) return forbidden();
  return actor!;
}

export async function requireBusiness(): Promise<Actor | Response> {
  const actor = await getActor();
  if (!canAccessBusinessPanel(actor)) return forbidden();
  return actor!;
}

/**
 * Owner-or-superadmin guard for a single listing. `asSuperadmin` tells the
 * caller whether to widen the writable-field set.
 */
export async function requireListingAccess(
  placeId: string
): Promise<ListingAccess | Response> {
  const actor = await getActor();
  if (!actor) return forbidden();

  await connectDB();
  const place = await PlaceModel.findById(placeId).lean();
  if (!place) return Response.json({ error: "Not found" }, { status: 404 });

  const placeLike = place as unknown as PlaceLike & Record<string, unknown>;
  if (!canEditListing(actor, placeLike)) return forbidden();

  return { actor, place: placeLike, asSuperadmin: isSuperadmin(actor) };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all 8 tests in `permissions.test.ts`, plus the 3 pre-existing test files still passing.

- [ ] **Step 5: Lint and commit**

```bash
npm run lint
git add src/lib/permissions.ts src/lib/permissions.test.ts
git commit -m "feat(auth): add central permissions module with role guards"
```

---

## Task 2: Delete duplicate artifacts and move admin pages

**Files:**
- Delete: `src/app/[locale]/admin/notifications/page 2.tsx`, `src/app/[locale]/admin/notifications/page 3.tsx`, `src/app/[locale]/admin/layout.tsx`
- Move: thirteen page directories from `src/app/[locale]/admin/` to `src/app/[locale]/superadmin/`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: routes `/superadmin/{cities,cms,database,media,moderation,notifications,orders,places,places/new,pricing,reservations,theme,users}` alongside the existing `/superadmin/{businesses,content,reports,security}`.

Note: `/superadmin/users` and `/admin/users` both exist today and are **different pages**. Resolve the collision explicitly in Step 3.

- [ ] **Step 1: Delete the untracked duplicate artifacts**

These are editor-duplicate files, never imported by anything.

```bash
rm "src/app/[locale]/admin/notifications/page 2.tsx" "src/app/[locale]/admin/notifications/page 3.tsx"
```

- [ ] **Step 2: Confirm which admin pages exist before moving**

Run: `ls "src/app/[locale]/admin"`
Expected: `cities cms database layout.tsx media moderation notifications orders page.tsx places pricing reservations theme users`

- [ ] **Step 3: Resolve the users-page collision**

Two different pages want `/superadmin/users`. Inspect both:

Run: `wc -l "src/app/[locale]/admin/users/page.tsx" "src/app/[locale]/superadmin/users/page.tsx"`

Keep the **existing `/superadmin/users`** page (it is the platform-wide user manager built for this panel) and delete the `/admin` one:

```bash
rm -r "src/app/[locale]/admin/users"
```

If, on reading both, the `/admin` version is clearly richer (more columns, more actions), keep that one instead by overwriting the superadmin file — but keep only one, and say which you kept in the commit body.

- [ ] **Step 4: Move the remaining twelve directories and the dashboard page**

```bash
cd "src/app/[locale]"
for d in cities cms database media moderation notifications orders places pricing reservations theme; do
  git mv "admin/$d" "superadmin/$d"
done
```

The old `/admin/page.tsx` dashboard is superseded by the existing `/superadmin/page.tsx` platform overview. Delete it:

```bash
rm "admin/page.tsx" "admin/layout.tsx"
cd -
```

- [ ] **Step 5: Verify the tree**

Run: `find "src/app/[locale]/superadmin" -name page.tsx | sort`
Expected 17 entries: businesses, cities, cms, content, database, media, moderation, notifications, orders, page.tsx (root), places, places/new, pricing, reports, reservations, security, theme, users.

Run: `ls "src/app/[locale]/admin"`
Expected: empty (or "No such file or directory").

- [ ] **Step 6: Commit**

The build is intentionally broken at this point — the moved pages reference an `AdminSidebar` layout that no longer wraps them, and internal `/admin/...` links are stale. Task 3 fixes both. Commit anyway so the move is a reviewable standalone change.

```bash
git add -A "src/app/[locale]/admin" "src/app/[locale]/superadmin"
git commit -m "refactor(admin): move admin pages under superadmin

Deletes the duplicate 'page 2/3.tsx' notification artifacts and the
superseded /admin dashboard and layout. Keeps the existing
/superadmin/users page over the /admin one."
```

---

## Task 3: Superadmin layout, sidebar, and the /admin redirect

**Files:**
- Modify: `src/app/[locale]/superadmin/layout.tsx`
- Create: `src/components/superadmin/sidebar.tsx`
- Create: `src/app/[locale]/admin/[[...rest]]/page.tsx`
- Modify: `src/components/site/site-header.tsx` (remove the `/admin` menu entry)
- Modify: `src/app/robots.ts`
- Modify: `messages/en.json`, `messages/ka.json`, `messages/ru.json`

**Interfaces:**
- Consumes: `getActor`, `canAccessStaffPanel` from `src/lib/permissions.ts` (Task 1).
- Produces: `<SuperadminSidebar />`; every staff route gated superadmin-only; `/admin/*` redirecting.

- [ ] **Step 1: Add the sidebar translation keys**

The existing `admin` namespace in `messages/en.json` already has `title`, `dashboard`, `moderation`, `places`, `cities`, `reservations`, `notifications`, `ticketOrders`, `users`, `media`, `theme`, `cms`, `database`, `pricing`. Confirm with:

Run: `node -e "const m=require('./messages/en.json'); console.log(Object.keys(m.admin))"`

Add whatever of these is missing to all three message files, under the existing `admin` namespace. Georgian and Russian values:

```
businesses  → "ბიზნესები"        / "Компании"
reports     → "ანგარიშები"       / "Отчёты"
security    → "უსაფრთხოება"      / "Безопасность"
contentMod  → "კონტენტი"          / "Контент"
groupPlatform  → "პლატფორმა"      / "Платформа"
groupContent   → "კონტენტი"       / "Контент"
groupCommerce  → "კომერცია"       / "Коммерция"
groupDesign    → "დიზაინი"        / "Дизайн"
groupSystem    → "სისტემა"         / "Система"
```

English values: `Businesses`, `Reports`, `Security`, `Content`, `Platform`, `Content`, `Commerce`, `Design`, `System`.

- [ ] **Step 2: Write the grouped sidebar**

Create `src/components/superadmin/sidebar.tsx`. This is adapted from `src/components/admin/sidebar.tsx` — same collapse-and-persist behavior, same active-link logic, plus group headings. Keep using `usePathname` from `next/navigation` here (it returns the locale-prefixed path, which the `pathname.includes(href)` check relies on).

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Database,
  Flag,
  FileText,
  Image,
  LayoutDashboard,
  LogOut,
  MapPin,
  Palette,
  Receipt,
  Shield,
  ShieldCheck,
  Tag,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; Icon: typeof Users; exact?: boolean };
type Group = { heading?: string; items: Item[] };

const GROUPS: Group[] = [
  { items: [{ href: "/superadmin", label: "dashboard", Icon: LayoutDashboard, exact: true }] },
  {
    heading: "groupPlatform",
    items: [
      { href: "/superadmin/users", label: "users", Icon: Users },
      { href: "/superadmin/businesses", label: "businesses", Icon: Building2 },
      { href: "/superadmin/reports", label: "reports", Icon: BarChart3 },
      { href: "/superadmin/security", label: "security", Icon: Shield },
    ],
  },
  {
    heading: "groupContent",
    items: [
      { href: "/superadmin/places", label: "places", Icon: MapPin },
      { href: "/superadmin/cities", label: "cities", Icon: Building2 },
      { href: "/superadmin/moderation", label: "moderation", Icon: ShieldCheck },
      { href: "/superadmin/content", label: "contentMod", Icon: Flag },
      { href: "/superadmin/media", label: "media", Icon: Image },
      { href: "/superadmin/notifications", label: "notifications", Icon: Bell },
    ],
  },
  {
    heading: "groupCommerce",
    items: [
      { href: "/superadmin/reservations", label: "reservations", Icon: CalendarCheck },
      { href: "/superadmin/orders", label: "ticketOrders", Icon: Receipt },
      { href: "/superadmin/pricing", label: "pricing", Icon: Tag },
    ],
  },
  {
    heading: "groupDesign",
    items: [
      { href: "/superadmin/theme", label: "theme", Icon: Palette },
      { href: "/superadmin/cms", label: "cms", Icon: FileText },
    ],
  },
  {
    heading: "groupSystem",
    items: [{ href: "/superadmin/database", label: "database", Icon: Database }],
  },
];

export function SuperadminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("admin");
  const { data: session } = useSession();

  useEffect(() => {
    const stored = localStorage.getItem("admin-sidebar-collapsed");
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  const toggle = () =>
    setCollapsed((c) => {
      localStorage.setItem("admin-sidebar-collapsed", String(!c));
      return !c;
    });

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col gap-2 sticky top-20 h-[calc(100vh-6rem)] transition-all duration-200 shrink-0",
        collapsed ? "w-14" : "w-[220px]"
      )}
    >
      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-2 space-y-0.5">
        {!collapsed && (
          <p className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Super Admin
          </p>
        )}
        {GROUPS.map((group, gi) => (
          <div key={group.heading ?? `g${gi}`} className={gi > 0 ? "pt-2" : undefined}>
            {group.heading && !collapsed && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {t(group.heading)}
              </p>
            )}
            {group.heading && collapsed && (
              <div className="mx-auto my-1.5 h-px w-6 bg-border" aria-hidden />
            )}
            {group.items.map(({ href, label, Icon, exact }) => {
              const isActive = exact
                ? /\/superadmin\/?$/.test(pathname)
                : pathname.includes(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? t(label) : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {!collapsed && <span className="truncate">{t(label)}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div
        className={cn(
          "rounded-2xl border border-border bg-card p-2",
          collapsed && "flex flex-col items-center"
        )}
      >
        {!collapsed && session?.user && (
          <div className="px-3 py-1 mb-1">
            <p className="text-sm font-medium truncate">{session.user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="size-4" />
          {!collapsed && "Sign out"}
        </button>
      </div>

      <button
        onClick={toggle}
        className="flex items-center justify-center rounded-xl border border-border bg-card p-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
      </button>
    </aside>
  );
}
```

- [ ] **Step 3: Rewrite the superadmin layout**

Replace `src/app/[locale]/superadmin/layout.tsx` entirely. It now uses the permissions module and the new sidebar, and keeps `AdminBreadcrumbs` (the moved pages expect it).

```tsx
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getActor, canAccessStaffPanel } from "@/lib/permissions";
import { SuperadminSidebar } from "@/components/superadmin/sidebar";
import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs";

export default async function SuperAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await getActor();
  if (!canAccessStaffPanel(actor)) {
    redirect({ href: "/", locale });
  }

  return (
    <div className="container mx-auto flex gap-6 px-4 py-8">
      <SuperadminSidebar />
      <section className="min-w-0 flex-1">
        <AdminBreadcrumbs />
        {children}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Check the breadcrumbs component for hardcoded /admin**

Run: `grep -n "admin" src/components/admin/breadcrumbs.tsx`

If it builds labels or hrefs from the literal string `"admin"`, update it to also handle `"superadmin"` so crumbs read correctly. If it derives everything from the pathname generically, leave it alone.

- [ ] **Step 5: Add the /admin catch-all redirect**

Create `src/app/[locale]/admin/[[...rest]]/page.tsx`. An optional catch-all matches `/admin` itself and every nested path.

```tsx
import { redirect } from "@/i18n/navigation";

export default async function LegacyAdminRedirect({
  params,
}: {
  params: Promise<{ locale: string; rest?: string[] }>;
}) {
  const { locale, rest } = await params;
  const suffix = rest?.length ? `/${rest.join("/")}` : "";
  redirect({ href: `/superadmin${suffix}`, locale });
}
```

- [ ] **Step 6: Remove the deprecated /admin link from the site header**

In `src/components/site/site-header.tsx` the account dropdown has an entry rendering `<Link href="/admin">` for roles `admin` and `superadmin`. Delete that entire `DropdownMenuItem` block — superadmins already have a `/superadmin` entry directly below it, and `admin` is deprecated.

Also narrow the "Manage" section heading condition from `["business", "admin", "superadmin"]` to `["business", "superadmin"]`, and drop the now-unused `admin` key from the `ROLE_LABEL` map so a legacy account shows no misleading "Admin" stamp.

Verify no `/admin` link remains outside the redirect route:

Run: `grep -rn '"/admin' src/ || echo "none"`
Expected: only `src/app/robots.ts` (handled next).

- [ ] **Step 7: Update robots.ts**

Run: `grep -n "admin" src/app/robots.ts`

Add `/superadmin/` and `/business/` to the same `disallow` array that already lists `/admin/`. Keep `/admin/` listed — the redirect route still resolves there and should not be crawled.

- [ ] **Step 8: Build and verify**

Run: `npm run build`
Expected: PASS. If a moved page fails to resolve an import, it is referencing a relative path that changed depth — all such imports should use the `@/` alias.

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(superadmin): grouped staff sidebar, superadmin-only gate, /admin redirect"
```

---

## Task 4: Business panel gate and API guard adoption

**Files:**
- Modify: `src/app/[locale]/business/layout.tsx`
- Modify: `src/app/api/business/listings/route.ts`
- Modify: `src/app/api/business/listings/[id]/route.ts`
- Modify: `src/app/api/business/reviews/[id]/reply/route.ts`
- Modify: `src/app/api/business/upgrade/route.ts`
- Modify: every route under `src/app/api/admin/` and `src/app/api/superadmin/`

**Interfaces:**
- Consumes: `getActor`, `canAccessBusinessPanel`, `requireSuperadmin`, `requireBusiness`, `requireListingAccess`, `writableListingFields`, `resolveOwnerStatusTransition`, `isDenied` from Task 1.
- Produces: no new exports. Every staff API route refuses non-superadmins; every listing-scoped route refuses non-owners.

- [ ] **Step 1: Gate the business layout**

In `src/app/[locale]/business/layout.tsx`, delete the `ALLOWED_ROLES` constant and the inline role read, and replace the guard with:

```tsx
import { getActor, canAccessBusinessPanel } from "@/lib/permissions";

// ...inside the component, replacing the existing session/role block:
  const actor = await getActor();
  if (!canAccessBusinessPanel(actor)) {
    redirect({ href: "/", locale });
  }
```

Remove the now-unused `auth` import. This drops `"admin"` from the allowed set, per the spec.

- [ ] **Step 2: Rewrite the listing PATCH/DELETE handlers**

Replace the body of `src/app/api/business/listings/[id]/route.ts`:

```ts
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import {
  requireListingAccess,
  writableListingFields,
  resolveOwnerStatusTransition,
  isDenied,
} from "@/lib/permissions";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requireListingAccess(id);
  if (isDenied(access)) return access;
  const { place, asSuperadmin } = access;

  const body = await req.json();
  const update: Record<string, unknown> = {};
  for (const key of writableListingFields(asSuperadmin)) {
    if (key in body) update[key] = body[key];
  }

  if (asSuperadmin) {
    // Staff may set any status directly from the moderation panel.
    if (typeof body.status === "string") update.status = body.status;
  } else {
    // Owners may only submit for review or withdraw a submission.
    const next = resolveOwnerStatusTransition(String(place.status ?? "draft"), body.status);
    if (next) {
      update.status = next;
      if (next === "pending") update.rejectionReason = "";
    }
  }

  await connectDB();
  const updated = await PlaceModel.findByIdAndUpdate(id, update, { new: true }).lean();
  return Response.json({ id: String((updated as { _id: unknown })._id) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requireListingAccess(id);
  if (isDenied(access)) return access;

  await connectDB();
  await PlaceModel.findByIdAndDelete(id);
  return Response.json({ ok: true });
}
```

This is a behavior change worth noting: the old allowlist omitted `images`, `services`, `reservationPriceGEL`, `nameRu`, `descriptionRu`, and `tags`, so owners could not save them. They are now owner-writable per the spec.

- [ ] **Step 3: Adopt the guard in the remaining business routes**

For each of `src/app/api/business/listings/route.ts`, `src/app/api/business/reviews/[id]/reply/route.ts`, `src/app/api/business/upgrade/route.ts`:

Read the file. Replace its local `requireBusiness`-style helper with the import from `@/lib/permissions`:

```ts
import { requireBusiness, isDenied } from "@/lib/permissions";

const actor = await requireBusiness();
if (isDenied(actor)) return actor;
// use actor.id / actor.role from here
```

For the review-reply route specifically: it must confirm the review belongs to a listing the actor may edit. If it currently only checks the role, add a `requireListingAccess(review.placeId)` call after loading the review and return its Response on denial. Record what you found in the commit body.

Delete every now-dead local helper so there is exactly one authorization implementation.

- [ ] **Step 4: Gate every staff API route**

Run: `grep -rln "role" src/app/api/admin src/app/api/superadmin`

For each route file, replace the inline role check with:

```ts
import { requireSuperadmin, isDenied } from "@/lib/permissions";

const actor = await requireSuperadmin();
if (isDenied(actor)) return actor;
```

Any route in these directories with **no** authorization check at all is a live vulnerability — add the guard and call it out explicitly in the commit body.

Also check `src/app/api/setup-admin/route.ts`: if it can promote a user to a staff role without authentication, it must either require superadmin or be deleted. Report which you chose.

- [ ] **Step 5: Verify no inline role checks remain**

Run: `grep -rn '"superadmin"' src/app/api/ | grep -v "lib/permissions"`
Expected: no results, or only `src/lib/auth.ts`-related email logic. Every remaining hit should be a deliberate exception you can justify.

- [ ] **Step 6: Test, lint, commit**

Run: `npm test` — expected PASS (permissions tests still green).
Run: `npm run lint` — expected PASS.

```bash
git add -A
git commit -m "refactor(api): route all authorization through the permissions module

Business panel no longer admits the deprecated admin role. Listing
writes use a single owner-or-superadmin guard with a shared writable
field policy; owners gain images/services/reservationPriceGEL, which
the old allowlist silently dropped."
```

---

## Task 5: Superadmin edits any listing

**Files:**
- Modify: `src/app/[locale]/business/listings/[id]/edit/page.tsx`
- Modify: `src/app/[locale]/superadmin/places/page.tsx`

**Interfaces:**
- Consumes: `requireListingAccess`, `isDenied`, `getActor` from Task 1.
- Produces: `/business/listings/[id]/edit` reachable by any superadmin for any listing.

- [ ] **Step 1: Replace the ownership check on the edit page**

In `src/app/[locale]/business/listings/[id]/edit/page.tsx`, the current guard is:

```tsx
const session = await auth();
const userId = (session!.user as { id?: string }).id!;
await connectDB();
const place = await PlaceModel.findById(id).lean() as any;
if (!place || place.ownerId !== userId) {
  redirect({ href: "/business/listings", locale });
}
```

Replace it with:

```tsx
import { requireListingAccess, isDenied } from "@/lib/permissions";
import { UserModel } from "@/lib/models/user";

// ...
const access = await requireListingAccess(id);
if (isDenied(access)) {
  redirect({ href: "/business/listings", locale });
}
const { place, actor, asSuperadmin } = access;
const editingSomeoneElse = asSuperadmin && String(place.ownerId ?? "") !== actor.id;

let ownerLabel = "";
if (editingSomeoneElse && place.ownerId) {
  const owner = await UserModel.findById(String(place.ownerId))
    .select("name email")
    .lean() as { name?: string; email?: string } | null;
  ownerLabel = owner ? `${owner.name ?? "Unknown"} (${owner.email ?? "no email"})` : "unassigned";
}
```

Note `requireListingAccess` already calls `connectDB()` and returns the lean place document, so the local `connectDB`/`findById` pair goes away. Keep the `place` field reads below unchanged.

TypeScript note: `place` is typed as `Record<string, unknown>`, so the existing `place.name ?? ""` style reads will error. Cast once right after destructuring — `const p = place as any;` — and use `p` for the form's `defaultValues`, matching the `as any` cast the file already used.

- [ ] **Step 2: Add the superadmin banner**

Above the existing `<h1>`, inside the returned JSX:

```tsx
{editingSomeoneElse && (
  <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
    <span className="font-medium">Editing as superadmin</span>
    {ownerLabel && <span className="text-muted-foreground"> — owner: {ownerLabel}</span>}
  </div>
)}
```

- [ ] **Step 3: Add an Edit action to the superadmin places list**

Read `src/app/[locale]/superadmin/places/page.tsx`. For each row, add a link to `/business/listings/{id}/edit`. If the page renders rows inline, add a cell:

```tsx
<Link
  href={`/business/listings/${p.id}/edit`}
  className="text-sm font-medium text-primary hover:underline"
>
  Edit
</Link>
```

Ensure the id is available in whatever shape the page maps documents into — add `id: p._id.toString()` to the mapper if it is missing.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`

As `ratige12@gmail.com`:
1. Open `/en/superadmin/places`, click Edit on a listing you do not own.
2. Confirm the amber "Editing as superadmin — owner: …" banner appears and the form is populated.
3. Change the name, save, and confirm the change persists after reload.

As a `role: "business"` account: open `/en/business/listings/<someone-else's-id>/edit` directly and confirm you are redirected to `/business/listings`.

- [ ] **Step 5: Lint and commit**

```bash
npm run lint
git add -A
git commit -m "feat(superadmin): edit any business listing through the owner editor"
```

---

## Task 6: Edit-affordance bar

**Files:**
- Create: `src/components/superadmin/edit-target.tsx`
- Create: `src/components/superadmin/edit-bar.tsx`
- Modify: `src/app/[locale]/layout.tsx`
- Modify: `src/app/[locale]/places/[slug]/page.tsx`
- Modify: `messages/en.json`, `messages/ka.json`, `messages/ru.json`

**Interfaces:**
- Consumes: nothing from earlier tasks (reads the role off `useSession`).
- Produces:
  ```tsx
  // edit-target.tsx
  function EditTargetProvider(props: { children: React.ReactNode }): JSX.Element;
  function DeclareEditTarget(props: { href: string; label?: string }): null; // client
  function useEditTarget(): { href: string; label?: string } | null;
  // edit-bar.tsx
  function SuperadminEditBar(): JSX.Element | null;
  ```

The bar must not overlap `AiChatFab`. Check the FAB's position first and offset the bar above it.

- [ ] **Step 1: Find the AI chat FAB's position**

Run: `grep -n "fixed\|bottom-\|right-\|z-" src/components/site/ai-chat-fab.tsx`

Record the exact `bottom-*` and `right-*` classes. The edit bar sits directly above the FAB in the same right gutter. If the FAB is at `bottom-6 right-6` and roughly `size-14`, the bar goes at `bottom-24 right-6`. Use whatever the real values imply.

- [ ] **Step 2: Add translation keys**

Add to `messages/en.json` a new top-level `superadminBar` namespace, and the same keys to `ka.json` and `ru.json`:

```json
"superadminBar": {
  "title": "Superadmin",
  "editListing": "Edit this listing",
  "pageContent": "Page content",
  "theme": "Theme",
  "panel": "Panel"
}
```

Georgian: `"სუპერადმინი"`, `"ამ ობიექტის რედაქტირება"`, `"გვერდის კონტენტი"`, `"თემა"`, `"პანელი"`.
Russian: `"Суперадмин"`, `"Редактировать объект"`, `"Контент страницы"`, `"Тема"`, `"Панель"`.

- [ ] **Step 3: Write the edit-target context**

A server page cannot pass props into a bar mounted in the layout, so the page declares its target through context. Create `src/components/superadmin/edit-target.tsx`:

```tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Target = { href: string; label?: string };
type Store = {
  target: Target | null;
  setTarget: (t: Target | null) => void;
};

const EditTargetContext = createContext<Store>({ target: null, setTarget: () => {} });

export function EditTargetProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<Target | null>(null);
  return (
    <EditTargetContext.Provider value={{ target, setTarget }}>
      {children}
    </EditTargetContext.Provider>
  );
}

export function useEditTarget() {
  return useContext(EditTargetContext).target;
}

/**
 * Rendered by a page to tell the superadmin bar what "edit this" means here.
 * Renders nothing; clears itself on unmount so the link never leaks to the
 * next route.
 */
export function DeclareEditTarget({ href, label }: Target) {
  const { setTarget } = useContext(EditTargetContext);
  useEffect(() => {
    setTarget({ href, label });
    return () => setTarget(null);
  }, [href, label, setTarget]);
  return null;
}
```

- [ ] **Step 4: Write the edit bar**

Create `src/components/superadmin/edit-bar.tsx`. Substitute the real `bottom-*`/`right-*` values from Step 1.

```tsx
"use client";

import { useEffect, useState } from "react";
import { FileText, Palette, PencilLine, Settings2, X, Zap } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEditTarget } from "./edit-target";

export function SuperadminEditBar() {
  const { data: session } = useSession();
  const t = useTranslations("superadminBar");
  const target = useEditTarget();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOpen(localStorage.getItem("superadmin-bar-open") === "true");
  }, []);

  const toggle = () =>
    setOpen((o) => {
      localStorage.setItem("superadmin-bar-open", String(!o));
      return !o;
    });

  if ((session?.user as { role?: string } | undefined)?.role !== "superadmin") return null;
  if (!mounted) return null;

  const items = [
    ...(target ? [{ href: target.href, label: target.label ?? t("editListing"), Icon: PencilLine }] : []),
    { href: "/superadmin/cms", label: t("pageContent"), Icon: FileText },
    { href: "/superadmin/theme", label: t("theme"), Icon: Palette },
    { href: "/superadmin", label: t("panel"), Icon: Settings2 },
  ];

  return (
    <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-2 print:hidden">
      {open && (
        <div className="w-56 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Zap className="size-3.5" /> {t("title")}
            </span>
            <button onClick={toggle} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          </div>
          <div className="p-1">
            {items.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {!open && (
        <button
          onClick={toggle}
          aria-label={t("title")}
          title={t("title")}
          className="flex size-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-lg transition-colors hover:text-foreground"
        >
          <Zap className="size-4" />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Mount the provider and bar in the locale layout**

In `src/app/[locale]/layout.tsx`, wrap the existing children (inside `<Providers>`, so `useSession` works) with `EditTargetProvider`, and render `<SuperadminEditBar />` next to the existing `<AiChatFab />`.

```tsx
import { EditTargetProvider } from "@/components/superadmin/edit-target";
import { SuperadminEditBar } from "@/components/superadmin/edit-bar";
```

Read the current JSX before editing — place `EditTargetProvider` so it encloses both `{children}` and the bar, since a page deep in the tree must be able to set state the bar reads.

- [ ] **Step 6: Declare the edit target on the place detail page**

In `src/app/[locale]/places/[slug]/page.tsx`, the place document is already loaded. Add near the top of the returned JSX:

```tsx
import { DeclareEditTarget } from "@/components/superadmin/edit-target";

// ...inside the JSX, alongside the existing <JsonLd /> elements:
<DeclareEditTarget href={`/business/listings/${place.id}/edit`} />
```

`serializePlace` provides `id`; confirm with `grep -n "id" src/lib/serialize.ts`. This component renders nothing for non-superadmins because the bar itself is what checks the role.

- [ ] **Step 7: Manual verification**

Run: `npm run dev`

As a superadmin: open `/en/places/<any-slug>`. Confirm a ⚡ pill sits above the AI chat FAB without overlapping it; open it and confirm all four rows appear and "Edit this listing" lands on the right editor. Navigate to `/en/discover` and confirm the listing row disappears while the other three remain.

Signed out and as a tourist: confirm nothing renders.

- [ ] **Step 8: Lint, build, commit**

Run: `npm run lint` then `npm run build` — both expected PASS.

```bash
git add -A
git commit -m "feat(superadmin): floating edit-affordance bar on public pages"
```

---

## Task 7: Site-config resolver with fallbacks

**Files:**
- Create: `src/lib/site-config-defaults.ts`
- Create: `src/lib/site-config-resolve.ts`
- Test: `src/lib/site-config-resolve.test.ts`

**Interfaces:**
- Consumes: `ISiteConfig` shape from `src/lib/models/site-config.ts`.
- Produces:
  ```ts
  type ResolvedHeader = { logoText: string; logoImageUrl: string; navLinks: Array<{ label: string; href: string }> };
  type ResolvedFooter = { copyrightText: string; columns: Array<{ heading: string; links: Array<{ label: string; href: string }> }>; socialLinks: Array<{ platform: string; url: string }> };
  type ResolvedPage = { heroTitle: string; heroSubtitle: string; heroImageUrl: string; showCategories: boolean; showFeaturedPlaces: boolean };

  function resolveHeader(raw: unknown): ResolvedHeader;
  function resolveFooter(raw: unknown): ResolvedFooter;
  function resolvePage(raw: unknown, key: string): ResolvedPage;
  ```

Splitting the resolver out from the components is what makes the fallback rule testable — it is the single riskiest part of this plan (a bug here blanks the site's navigation).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/site-config-resolve.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveHeader, resolveFooter, resolvePage } from "./site-config-resolve";
import { DEFAULT_HEADER, DEFAULT_FOOTER, DEFAULT_PAGES } from "./site-config-defaults";

test("an absent config resolves to the hardcoded defaults", () => {
  assert.deepEqual(resolveHeader(undefined), DEFAULT_HEADER);
  assert.deepEqual(resolveHeader(null), DEFAULT_HEADER);
  assert.deepEqual(resolveFooter(undefined), DEFAULT_FOOTER);
  assert.deepEqual(resolvePage(undefined, "home"), DEFAULT_PAGES.home);
});

test("empty arrays fall back rather than blanking the nav", () => {
  const h = resolveHeader({ logoText: "", logoImageUrl: "", navLinks: [] });
  assert.deepEqual(h.navLinks, DEFAULT_HEADER.navLinks, "empty navLinks must not blank the header");
  assert.equal(h.logoText, DEFAULT_HEADER.logoText);

  const f = resolveFooter({ copyrightText: "", columns: [], socialLinks: [] });
  assert.deepEqual(f.columns, DEFAULT_FOOTER.columns, "empty columns must not blank the footer");
  assert.equal(f.copyrightText, DEFAULT_FOOTER.copyrightText);
});

test("provided values win over defaults", () => {
  const h = resolveHeader({
    logoText: "MyCity",
    logoImageUrl: "/logo.png",
    navLinks: [{ label: "Eat", href: "/food" }],
  });
  assert.equal(h.logoText, "MyCity");
  assert.equal(h.logoImageUrl, "/logo.png");
  assert.deepEqual(h.navLinks, [{ label: "Eat", href: "/food" }]);
});

test("malformed nav entries are dropped, and a fully malformed list falls back", () => {
  const h = resolveHeader({
    navLinks: [
      { label: "Good", href: "/good" },
      { label: "", href: "/no-label" },
      { label: "No href", href: "" },
      "nonsense",
      null,
    ],
  });
  assert.deepEqual(h.navLinks, [{ label: "Good", href: "/good" }]);

  const allBad = resolveHeader({ navLinks: [null, "x", { label: "", href: "" }] });
  assert.deepEqual(allBad.navLinks, DEFAULT_HEADER.navLinks);
});

test("page toggles default to true and honour an explicit false", () => {
  const d = resolvePage({}, "home");
  assert.equal(d.showCategories, true);
  assert.equal(d.showFeaturedPlaces, true);

  const off = resolvePage({ showCategories: false, showFeaturedPlaces: false }, "home");
  assert.equal(off.showCategories, false);
  assert.equal(off.showFeaturedPlaces, false);
});

test("hero text falls back per field, not all-or-nothing", () => {
  const p = resolvePage({ heroTitle: "Custom title" }, "home");
  assert.equal(p.heroTitle, "Custom title");
  assert.equal(p.heroSubtitle, DEFAULT_PAGES.home.heroSubtitle);
  assert.equal(p.heroImageUrl, DEFAULT_PAGES.home.heroImageUrl);
});

test("an unknown page key resolves to neutral empty text with toggles on", () => {
  const p = resolvePage(undefined, "some-page-with-no-defaults");
  assert.equal(p.heroTitle, "");
  assert.equal(p.showCategories, true);
});

test("a Mongoose Map-shaped pages value is read correctly", () => {
  // getSiteConfig().pages may arrive as a Map when not fully lean-converted.
  const asMap = new Map([["home", { heroTitle: "From a Map" }]]);
  assert.equal(resolvePage(asMap.get("home"), "home").heroTitle, "From a Map");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot find module `./site-config-resolve`.

- [ ] **Step 3: Capture today's hardcoded values as defaults**

Create `src/lib/site-config-defaults.ts`. The `navLinks` default is **empty by design** — the header builds its nav from `useTranslations`, and hardcoding English labels here would break Georgian and Russian. So an empty configured `navLinks` means "use the translated nav", which the header handles by ignoring the resolved list when it matches the default.

Copy the footer columns verbatim from the `LINKS` object in `src/components/site/site-footer.tsx`, and the hero image from `HERO_IMAGE` in `src/components/site/home/hero-section.tsx`.

Note: this file imports its types from `site-config-resolve.ts`, which imports these constants back. That is a type-only cycle in one direction and a value cycle in the other — TypeScript and the bundler both handle it, because the type import is erased at compile time. Keep `import type` (not a plain `import`) for it to stay that way.

```ts
import type { ResolvedFooter, ResolvedHeader, ResolvedPage } from "./site-config-resolve";

/**
 * navLinks is intentionally empty: SiteHeader builds its nav from next-intl
 * translations. An empty list means "keep the translated nav" — see
 * SiteHeader's usesCmsNav check.
 */
export const DEFAULT_HEADER: ResolvedHeader = {
  logoText: "Tbilisi",
  logoImageUrl: "",
  navLinks: [],
};

export const DEFAULT_FOOTER: ResolvedFooter = {
  copyrightText: "",
  columns: [
    {
      heading: "Discover",
      links: [
        { label: "Sightseeing", href: "/discover?category=sight" },
        { label: "Museums", href: "/discover?category=museum" },
        { label: "Neighborhoods", href: "/discover" },
        { label: "Parks & Nature", href: "/discover?category=nature" },
      ],
    },
    {
      heading: "Experiences",
      links: [
        { label: "Tours & Guides", href: "/experiences" },
        { label: "Day Trips", href: "/experiences?type=daytrip" },
        { label: "Wellness", href: "/experiences?type=wellness" },
        { label: "Outdoor", href: "/experiences?type=outdoor" },
      ],
    },
    {
      heading: "Food & Drinks",
      links: [
        { label: "Restaurants", href: "/food?type=restaurant" },
        { label: "Cafes", href: "/food?type=cafe" },
        { label: "Wine Bars", href: "/food?type=wine" },
        { label: "Nightlife", href: "/food?type=nightlife" },
      ],
    },
    {
      heading: "Travel Info",
      links: [
        { label: "Getting Here", href: "/travel-info" },
        { label: "Getting Around", href: "/travel-info#transport" },
        { label: "City Card", href: "/tickets" },
        { label: "Accommodation", href: "/hotels" },
      ],
    },
    {
      heading: "For Business",
      links: [
        { label: "List your business", href: "/list-your-business" },
        { label: "Business dashboard", href: "/business" },
      ],
    },
  ],
  socialLinks: [
    { platform: "Instagram", url: "" },
    { platform: "TikTok", url: "" },
    { platform: "YouTube", url: "" },
  ],
};

export const DEFAULT_PAGES: Record<string, ResolvedPage> = {
  home: {
    heroTitle: "",
    heroSubtitle: "",
    heroImageUrl:
      "https://images.unsplash.com/photo-1565008576549-57569a49371d?w=1920&q=70",
    showCategories: true,
    showFeaturedPlaces: true,
  },
};

/** Neutral shape for a page key with no baked-in defaults. */
export const NEUTRAL_PAGE: ResolvedPage = {
  heroTitle: "",
  heroSubtitle: "",
  heroImageUrl: "",
  showCategories: true,
  showFeaturedPlaces: true,
};
```

Empty-string hero title/subtitle means "use the translated copy" — same principle as the nav.

- [ ] **Step 4: Write the resolver**

Create `src/lib/site-config-resolve.ts`:

```ts
import {
  DEFAULT_FOOTER,
  DEFAULT_HEADER,
  DEFAULT_PAGES,
  NEUTRAL_PAGE,
} from "./site-config-defaults";

export type NavLink = { label: string; href: string };
export type FooterColumn = { heading: string; links: NavLink[] };
export type SocialLink = { platform: string; url: string };

export type ResolvedHeader = {
  logoText: string;
  logoImageUrl: string;
  navLinks: NavLink[];
};
export type ResolvedFooter = {
  copyrightText: string;
  columns: FooterColumn[];
  socialLinks: SocialLink[];
};
export type ResolvedPage = {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  showCategories: boolean;
  showFeaturedPlaces: boolean;
};

function obj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

/** A non-empty trimmed string, or the fallback. */
function str(raw: unknown, fallback: string): string {
  return typeof raw === "string" && raw.trim() !== "" ? raw : fallback;
}

function bool(raw: unknown, fallback: boolean): boolean {
  return typeof raw === "boolean" ? raw : fallback;
}

function navLinks(raw: unknown): NavLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const e = obj(entry);
    const label = typeof e.label === "string" ? e.label.trim() : "";
    const href = typeof e.href === "string" ? e.href.trim() : "";
    return label && href ? [{ label, href }] : [];
  });
}

/** Falls back whenever the cleaned list is empty — never blanks a region. */
function listOrDefault<T>(cleaned: T[], fallback: T[]): T[] {
  return cleaned.length > 0 ? cleaned : fallback;
}

export function resolveHeader(raw: unknown): ResolvedHeader {
  const h = obj(raw);
  return {
    logoText: str(h.logoText, DEFAULT_HEADER.logoText),
    logoImageUrl: str(h.logoImageUrl, DEFAULT_HEADER.logoImageUrl),
    navLinks: listOrDefault(navLinks(h.navLinks), DEFAULT_HEADER.navLinks),
  };
}

export function resolveFooter(raw: unknown): ResolvedFooter {
  const f = obj(raw);

  const columns: FooterColumn[] = Array.isArray(f.columns)
    ? f.columns.flatMap((entry) => {
        const c = obj(entry);
        const heading = typeof c.heading === "string" ? c.heading.trim() : "";
        const links = navLinks(c.links);
        return heading && links.length > 0 ? [{ heading, links }] : [];
      })
    : [];

  const socialLinks: SocialLink[] = Array.isArray(f.socialLinks)
    ? f.socialLinks.flatMap((entry) => {
        const s = obj(entry);
        const platform = typeof s.platform === "string" ? s.platform.trim() : "";
        const url = typeof s.url === "string" ? s.url.trim() : "";
        return platform ? [{ platform, url }] : [];
      })
    : [];

  return {
    copyrightText: str(f.copyrightText, DEFAULT_FOOTER.copyrightText),
    columns: listOrDefault(columns, DEFAULT_FOOTER.columns),
    socialLinks: listOrDefault(socialLinks, DEFAULT_FOOTER.socialLinks),
  };
}

export function resolvePage(raw: unknown, key: string): ResolvedPage {
  const base = DEFAULT_PAGES[key] ?? NEUTRAL_PAGE;
  const p = obj(raw);
  return {
    heroTitle: str(p.heroTitle, base.heroTitle),
    heroSubtitle: str(p.heroSubtitle, base.heroSubtitle),
    heroImageUrl: str(p.heroImageUrl, base.heroImageUrl),
    showCategories: bool(p.showCategories, base.showCategories),
    showFeaturedPlaces: bool(p.showFeaturedPlaces, base.showFeaturedPlaces),
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — 8 new tests plus everything from Task 1.

- [ ] **Step 6: Lint and commit**

```bash
npm run lint
git add src/lib/site-config-defaults.ts src/lib/site-config-resolve.ts src/lib/site-config-resolve.test.ts
git commit -m "feat(cms): add site-config resolver with fallback-to-hardcoded"
```

---

## Task 8: Wire CMS into header, footer, and homepage

**Files:**
- Modify: `src/app/[locale]/layout.tsx`
- Modify: `src/components/site/site-header.tsx`
- Modify: `src/components/site/site-footer.tsx`
- Modify: `src/app/[locale]/page.tsx`
- Modify: `src/components/site/home/hero-section.tsx`

**Interfaces:**
- Consumes: `resolveHeader`, `resolveFooter`, `resolvePage`, `ResolvedHeader`, `ResolvedFooter`, `ResolvedPage` from Task 7; `getSiteConfig` from `src/lib/get-site-config.ts`.
- Produces: no new exports. `SiteHeader` and `SiteFooter` gain optional props; `HeroSection` gains optional overrides.

- [ ] **Step 1: Read the existing site-config getter**

Run: `cat src/lib/get-site-config.ts`

Note whether it returns a lean document and whether `pages` comes back as a `Map` or a plain object. `resolvePage` handles either, but the layout needs to read the right key. If `pages` is a `Map`, read it with `.get("home")`; if plain, `pages["home"]`. Write a small local helper if needed:

```ts
function pageConfig(pages: unknown, key: string): unknown {
  if (pages instanceof Map) return pages.get(key);
  return (pages as Record<string, unknown> | undefined)?.[key];
}
```

- [ ] **Step 2: Fetch config once in the locale layout and pass it down**

In `src/app/[locale]/layout.tsx`, next to the existing `getAdminConfig()` call:

```tsx
import { getSiteConfig } from "@/lib/get-site-config";
import { resolveHeader, resolveFooter } from "@/lib/site-config-resolve";

// ...
  const [adminConfig, siteConfig] = await Promise.all([
    getAdminConfig(),
    getSiteConfig(),
  ]);
  const themeCss = adminConfig ? buildThemeCss(adminConfig) : null;
  const header = resolveHeader(siteConfig?.header);
  const footer = resolveFooter(siteConfig?.footer);
```

Then pass them: `<SiteHeader config={header} />` and `<SiteFooter config={footer} />`.

Keep the existing `getAdminConfig` behavior unchanged.

- [ ] **Step 3: Make SiteHeader consume the config**

`SiteHeader` is a client component with a hardcoded `NAV` built from `useTranslations`. Add an optional prop and apply it without destroying the translated nav:

```tsx
import type { ResolvedHeader } from "@/lib/site-config-resolve";

export function SiteHeader({ config }: { config?: ResolvedHeader }) {
```

Logo — replace the hardcoded `Tbilisi` word mark. Keep the two-line `explore` / `Tbilisi.` treatment when there is no custom logo, and swap in an image when one is configured:

```tsx
{config?.logoImageUrl ? (
  // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-supplied host, not in next.config remotePatterns
  <img src={config.logoImageUrl} alt={config.logoText || "Home"} className="h-9 w-auto object-contain" />
) : (
  <>
    <span className="font-display italic text-[19px] tracking-[0.5px] -mb-1" style={{ color: "#E8A020" }}>
      explore
    </span>
    <span className="font-display text-[30px] tracking-[-0.5px]" style={{ color: c.text }}>
      {config?.logoText ?? "Tbilisi"}<span style={{ color: "#E8A020" }}>.</span>
    </span>
  </>
)}
```

Nav — the CMS list replaces the translated nav only when it is non-empty. Right after the existing `NAV` definition:

```tsx
// A configured nav replaces the translated one wholesale; an empty configured
// list means "keep the translated nav" (see site-config-defaults).
const navItems =
  config && config.navLinks.length > 0
    ? config.navLinks.map((l) => ({ label: l.label, href: l.href, icon: undefined, children: [] as { label: string; href: string }[] }))
    : NAV;
```

Then replace both `NAV.map(` call sites (desktop nav and mobile drawer) with `navItems.map(`.

- [ ] **Step 4: Make SiteFooter consume the config**

`SiteFooter` is a server component with a hardcoded `LINKS` object and `["Instagram","TikTok","YouTube"]` socials. Add the prop:

```tsx
import type { ResolvedFooter } from "@/lib/site-config-resolve";

export function SiteFooter({ config }: { config?: ResolvedFooter }) {
  const year = new Date().getFullYear();
  const columns = config?.columns ?? [];
  const socials = config?.socialLinks ?? [];
```

Replace `Object.entries(LINKS).map(([col, links]) => …)` with `columns.map(({ heading, links }) => …)`, using `heading` where `col` was used. Delete the now-unused `LINKS` constant — the same content lives in `DEFAULT_FOOTER`, and the resolver guarantees `columns` is never empty.

Socials: render `socials.map(({ platform, url }) => …)`, keeping the existing circular badge styling and `platform[0]` initial. Wrap in an anchor when `url` is non-empty; otherwise keep the current non-interactive `<span>` and drop the `cursor-pointer` class from it.

Copyright: find the existing copyright line and render `config?.copyrightText || <the existing default expression using {year}>`.

- [ ] **Step 5: Wire the homepage**

In `src/app/[locale]/page.tsx`:

```tsx
import { getSiteConfig } from "@/lib/get-site-config";
import { resolvePage } from "@/lib/site-config-resolve";

// ...inside the component:
  const siteConfig = await getSiteConfig();
  const raw = siteConfig?.pages;
  const homeRaw = raw instanceof Map ? raw.get("home") : (raw as Record<string, unknown> | undefined)?.home;
  const home = resolvePage(homeRaw, "home");
```

Then:
- `<HeroSection title={home.heroTitle} subtitle={home.heroSubtitle} imageUrl={home.heroImageUrl} />`
- `{home.showCategories && <CategoriesStrip />}`
- `{home.showFeaturedPlaces && <FeaturedPlaces places={featuredPlaces} />}`

Leave `StatsBar`, `NeighborhoodsSection`, `AIPlannerCTA`, and `ListBusinessSection` unconditional — the schema has no toggles for them.

- [ ] **Step 6: Make HeroSection accept overrides**

In `src/components/site/home/hero-section.tsx`:

```tsx
export function HeroSection({
  title,
  subtitle,
  imageUrl,
}: {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
} = {}) {
  const t = useTranslations("hero");
```

Use `imageUrl || HERO_IMAGE` for the `Image` `src`. Find where the heading and subheading render `t("...")` and replace with `title || t("<existingKey>")` and `subtitle || t("<existingKey>")` — read the file to get the real key names. Empty string falls through to the translation, which is exactly the fallback rule.

If `imageUrl` points at a host not in `next.config`'s `remotePatterns`, `next/image` throws at runtime. Check the config:

Run: `grep -n "remotePatterns" -A 15 next.config.ts`

If admin-supplied hosts are not covered, gate on it: use `next/image` for the default Unsplash URL and a plain `<img>` (with an eslint-disable comment) when a custom `imageUrl` is supplied.

- [ ] **Step 7: Verify the empty-database case**

This is the risk the spec calls out. With no `SiteConfig` document at all:

Run: `npm run dev`, open `/en`.
Expected: header nav, footer columns, socials, hero, and copyright render exactly as before this task. Compare against `git stash`-ed output if unsure.

- [ ] **Step 8: Verify the configured case**

As a superadmin, open `/en/superadmin/cms`. Set `header.logoText` to `TestCity`, add one nav link, add a footer column, set `pages.home.heroTitle`, and turn `showFeaturedPlaces` off. Save, then reload `/en`.

Expected: all five changes visible. Turn the toggle back on and confirm the section returns.

- [ ] **Step 9: Lint, build, commit**

Run: `npm run lint` then `npm run build` — both expected PASS.

```bash
git add -A
git commit -m "feat(cms): render header, footer, and home hero from site config

The CMS editor persisted config that nothing read. Header logo/nav,
footer columns/socials/copyright, and the home hero plus section
toggles now come from SiteConfig, falling back per field to the
previously hardcoded values."
```

---

## Task 9: Role-based post-login redirect

**Files:**
- Modify: `src/components/site/auth-card.tsx`

**Interfaces:**
- Consumes: `postLoginPath` from Task 1.
- Produces: nothing new.

- [ ] **Step 1: Read the current sign-in flow**

Run: `sed -n '1,80p' src/components/site/auth-card.tsx`

Note: credentials sign-in calls `signIn(..., { redirect: false })` then `router.push("/trips")` at line ~59; Google sign-in uses `signIn("google", { callbackUrl: "/trips" })` at line ~190.

- [ ] **Step 2: Redirect credentials sign-in by role**

`signIn` with `redirect: false` does not return the session, so fetch it after success. Replace the hardcoded `router.push("/trips")`:

```tsx
import { getSession, signIn } from "next-auth/react";
import { postLoginPath } from "@/lib/permissions";

// ...after a successful signIn result:
    const params = new URLSearchParams(window.location.search);
    const callbackUrl = params.get("callbackUrl");
    if (callbackUrl) {
      router.push(callbackUrl);
    } else {
      const session = await getSession();
      router.push(postLoginPath((session?.user as { role?: string } | undefined)?.role));
    }
    router.refresh();
```

`postLoginPath` returns a locale-less path and `router` comes from `@/i18n/navigation`, so the locale prefix is added automatically. A `callbackUrl` from the query string is already locale-prefixed — pass it through unchanged.

Importing `postLoginPath` from `@/lib/permissions` into a client component pulls in that module's `auth`/`mongoose` imports at bundle time. If the build complains, move the pure functions into `src/lib/permissions-core.ts`, have `permissions.ts` re-export them, and import from the core module here. Verify with `npm run build` and take that route only if needed.

- [ ] **Step 3: Redirect Google sign-in by role**

Google sign-in redirects before any client code runs, so the role is unknown at call time. Point it at a neutral landing route that itself redirects:

Change `signIn("google", { callbackUrl: "/trips" })` to `signIn("google", { callbackUrl: \`/${locale}/after-login\` })` — read the file for how it accesses the current locale (`useLocale()` from `next-intl` if it is not already in scope).

Create `src/app/[locale]/after-login/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getActor, postLoginPath } from "@/lib/permissions";

export default async function AfterLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await getActor();
  redirect({ href: postLoginPath(actor?.role), locale });
}
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`

1. Sign in as `ratige12@gmail.com` (Google) → expect to land on `/en/superadmin`.
2. Sign in as a `role: "business"` account (credentials) → expect `/en/business`.
3. Sign in as a tourist → expect `/en/trips`.
4. Visit `/en/login?callbackUrl=/en/deals` and sign in → expect `/en/deals`, overriding the role default.

- [ ] **Step 5: Lint, test, commit**

Run: `npm test` and `npm run lint` — both expected PASS.

```bash
git add -A
git commit -m "feat(auth): send each role to its own landing page after sign-in"
```

---

## Task 10: Business owner capability audit

**Files:**
- Create: `docs/superpowers/notes/2026-07-29-business-owner-audit.md`
- Modify: whatever the audit finds (expected: `src/app/[locale]/business/media/page.tsx`, `src/components/business/listing-form.tsx`)

**Interfaces:**
- Consumes: everything from Tasks 1, 4, 5.
- Produces: an audit note listing each capability as WORKS / FIXED / MISSING.

This task is deliberately investigative. Fix what is small and in-scope; write down what is genuinely a new feature rather than half-building it.

- [ ] **Step 1: Verify listing field coverage**

Run: `grep -n "name=\|register\|defaultValues" src/components/business/listing-form.tsx | head -60`

Compare the form's fields against `writableListingFields(false)` from Task 1. Record which owner-writable fields have no form control. Expected gaps: `images`, `services`, `reservationPriceGEL`, `nameRu`, `descriptionRu`, `tags`.

Add form controls for `images` (a list of URL inputs with add/remove), `services` (repeatable name + priceGEL rows), and `reservationPriceGEL` (a number input). These are the spec's "add pictures" and "make deals" requirements and the API already accepts them after Task 4.

Skip `nameRu`/`descriptionRu`/`tags` if the form has no Russian-locale section at all — note it in the audit as MISSING rather than bolting on a partial i18n UI.

- [ ] **Step 2: Verify the media page**

`src/app/[locale]/business/media/page.tsx` is currently a static "Media uploads coming soon" placeholder — no upload, no owner scoping.

There is no blob/upload provider configured in this project (no `@vercel/blob` in `package.json`). Building file upload is a new subsystem, out of scope for this plan. Instead:

Replace the placeholder with a real, useful page: list the owner's listings with their current image URLs and a link to each listing's editor, where Step 1's image URL controls now live. Query with `PlaceModel.find({ ownerId: actor.id })` via `requireBusiness`, and for a superadmin show all listings.

Record "file upload" as MISSING in the audit with a one-line reason.

- [ ] **Step 3: Verify review replies are owner-scoped**

Run: `cat "src/app/api/business/reviews/[id]/reply/route.ts"`

Confirm Task 4 Step 3 left it checking listing access, not merely the role. If a business owner can reply to a review on someone else's listing, that is a live bug — fix it now with `requireListingAccess`.

- [ ] **Step 4: Verify deals/vouchers**

Run: `grep -rn "VoucherModel" src/ | grep -v test`

Expected finding: `VoucherModel` is only written by the payment callback flow (`src/app/api/flitt/callback/route.ts`) — there is no owner-facing deal-creation API or UI, and `/deals` reads from elsewhere. Confirm what `/deals` actually reads:

Run: `grep -rn "deals" src/app/\[locale\]/deals/page.tsx | head -20`

If deals are driven by `Place.services` or a discount field, then Step 1's services editor already covers "make deals" — say so in the audit. If deals need a separate model and owner UI, record it as MISSING with a note that it needs its own spec. Do not start building a deals subsystem inside this plan.

- [ ] **Step 5: Verify cross-owner isolation by hand**

Run: `npm run dev`

Signed in as business owner A:
1. `/en/business/listings` — shows only A's listings.
2. Open owner B's listing editor by URL — redirected away.
3. `curl` a PATCH to owner B's listing id with a cookie from A's session — expect `403`.
4. `/en/superadmin` — redirected to `/`.
5. `/en/superadmin/theme` — redirected to `/`.

Record each result.

- [ ] **Step 6: Write the audit note**

Create `docs/superpowers/notes/2026-07-29-business-owner-audit.md` with one row per capability from the spec's §5 table, each marked WORKS, FIXED (with the commit), or MISSING (with a one-line reason and whether it needs its own spec).

- [ ] **Step 7: Lint, build, commit**

Run: `npm run lint` and `npm run build` — both expected PASS.

```bash
git add -A
git commit -m "feat(business): owner image/services editing, real media page, audit note"
```

---

## Task 11: Legacy admin-role migration and final verification

**Files:**
- Create: `scripts/migrate-admin-role.ts`

**Interfaces:**
- Consumes: `UserModel`, `connectDB`.
- Produces: a dry-run-by-default migration script.

- [ ] **Step 1: Write the migration script**

Follow the existing script convention in `scripts/` (run via `npx tsx --env-file=.env.local`). Create `scripts/migrate-admin-role.ts`:

```ts
/**
 * Flips legacy `role: "admin"` users to "business".
 *
 * The admin role is deprecated — no route grants it access — so these accounts
 * would otherwise be stranded with no panel at all.
 *
 * Dry run:  npx tsx --env-file=.env.local scripts/migrate-admin-role.ts
 * Apply:    npx tsx --env-file=.env.local scripts/migrate-admin-role.ts --apply
 */
import { connectDB } from "../src/lib/db";
import { UserModel } from "../src/lib/models/user";

async function main() {
  const apply = process.argv.includes("--apply");
  await connectDB();

  const affected = await UserModel.find({ role: "admin" })
    .select("name email createdAt")
    .lean();

  console.log(`Found ${affected.length} user(s) with the deprecated "admin" role:`);
  for (const u of affected) {
    console.log(`  - ${u.email} (${u.name})`);
  }

  if (affected.length === 0) {
    console.log("Nothing to migrate.");
    process.exit(0);
  }

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to flip these to role \"business\".");
    process.exit(0);
  }

  const result = await UserModel.updateMany({ role: "admin" }, { role: "business" });
  console.log(`\nUpdated ${result.modifiedCount} user(s) to role "business".`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the dry run and report**

Run: `npx tsx --env-file=.env.local scripts/migrate-admin-role.ts`

Record the affected count and email list. **Do not pass `--apply` without reporting the list first** — this rewrites user roles, and the spec requires reporting the count before running it.

- [ ] **Step 3: Apply only if the list looks right**

If the dry run lists accounts that should become business owners, run:

Run: `npx tsx --env-file=.env.local scripts/migrate-admin-role.ts --apply`

If the dry run lists zero users, skip this step and note it.

- [ ] **Step 4: Full verification sweep**

Run: `npm test` — expected PASS (Task 1 and Task 7 suites plus the 3 pre-existing files).
Run: `npm run lint` — expected PASS, no new warnings.
Run: `npm run build` — expected PASS.

Then, with `npm run dev`, walk the role matrix and confirm every cell:

| Route | superadmin | business | tourist | signed out |
|---|---|---|---|---|
| `/en/superadmin` | ✅ panel | → `/` | → `/` | → `/` |
| `/en/superadmin/theme` | ✅ | → `/` | → `/` | → `/` |
| `/en/superadmin/database` | ✅ | → `/` | → `/` | → `/` |
| `/en/admin` | → `/en/superadmin` | → `/en/superadmin` then → `/` | → `/` | → `/` |
| `/en/admin/theme` | → `/en/superadmin/theme` | → `/` | → `/` | → `/` |
| `/en/business` | ✅ | ✅ | → `/` | → `/` |
| `/en/business/listings/<own>/edit` | ✅ | ✅ | → `/` | → `/` |
| `/en/business/listings/<other>/edit` | ✅ + banner | → listings | → `/` | → `/` |
| `/en` edit bar | ✅ visible | hidden | hidden | hidden |

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-admin-role.ts
git commit -m "chore(auth): add legacy admin-role migration script"
```

---

## Verification Summary

Report at the end of execution:

1. `npm test` result — count of passing tests.
2. `npm run lint` and `npm run build` results.
3. The role matrix from Task 11 Step 4, with any cell that did not behave as specified.
4. The migration dry-run count from Task 11 Step 2, and whether `--apply` was run.
5. The audit findings from Task 10 — specifically anything marked MISSING and whether it needs its own spec.
6. Anything in the plan that turned out to be wrong about the codebase.
