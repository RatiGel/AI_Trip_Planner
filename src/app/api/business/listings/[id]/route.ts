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
