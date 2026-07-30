import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import {
  requireListingAccess,
  writableListingFields,
  resolveOwnerStatusTransition,
  isDenied,
} from "@/lib/permissions";

/**
 * Fields where an explicit `null` in the body means "clear this field".
 *
 * Deliberately an allowlist rather than a blanket rule: a future field that
 * sends `null` meaning "leave unchanged" — an easy mistake, since `undefined`
 * already carries that meaning here — would otherwise silently delete stored
 * data. Anything outside this set is written literally.
 */
const NULL_CLEARS = new Set(["reservationPriceGEL"]);

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
  const unset: Record<string, ""> = {};
  for (const key of writableListingFields(asSuperadmin)) {
    if (!(key in body)) continue;
    // `$set`-ing null would store the literal value null rather than removing
    // the key, so a clearable field routes through $unset instead.
    if (body[key] === null && NULL_CLEARS.has(key)) {
      unset[key] = "";
    } else {
      update[key] = body[key];
    }
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

  const mongoUpdate: Record<string, unknown> = { $set: update };
  if (Object.keys(unset).length > 0) mongoUpdate.$unset = unset;

  await connectDB();
  const updated = await PlaceModel.findByIdAndUpdate(id, mongoUpdate, {
    new: true,
    runValidators: true,
  }).lean();
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
