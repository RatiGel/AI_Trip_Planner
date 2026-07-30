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
