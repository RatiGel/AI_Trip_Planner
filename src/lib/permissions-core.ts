/**
 * Pure, dependency-free permission logic.
 *
 * Deliberately excludes anything that touches `auth`, `connectDB`, or a
 * Mongoose model — those live in `./permissions`, which re-exports
 * everything here so existing importers are unaffected. This split exists
 * so client components (e.g. auth-card.tsx) can import the pure role
 * helpers (like `postLoginPath`) without dragging mongoose/bcrypt into the
 * browser bundle.
 */

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

/**
 * Only same-origin relative paths may be followed after sign-in. An absolute
 * URL ("https://evil.example.com") is passed through unchanged by next-intl's
 * router, and a protocol-relative one ("//evil.example.com") is treated as
 * absolute by browsers — either would send a freshly-authenticated visitor
 * off-site.
 */
export function isSafeCallbackPath(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}
