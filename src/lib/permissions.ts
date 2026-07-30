import { auth } from "./auth";
import { connectDB } from "./db";
import { PlaceModel } from "./models/place";
import {
  canAccessBusinessPanel,
  canAccessStaffPanel,
  canEditListing,
  isSuperadmin,
} from "./permissions-core";
import type { Actor, ListingAccess, PlaceLike, Role } from "./permissions-core";

export type { Role, Actor, PlaceLike, ListingAccess };
export {
  isSuperadmin,
  canAccessStaffPanel,
  canAccessBusinessPanel,
  canEditListing,
  writableListingFields,
  resolveOwnerStatusTransition,
  postLoginPath,
} from "./permissions-core";

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
