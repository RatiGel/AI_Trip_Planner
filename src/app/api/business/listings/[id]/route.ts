import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";

async function requireBusiness() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !["business", "admin"].includes(role ?? "")) {
    return null;
  }
  return session;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireBusiness();
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role;

  await connectDB();

  const place = await PlaceModel.findById(id);
  if (!place) return Response.json({ error: "Not found" }, { status: 404 });

  const isOwner = place.ownerId === userId;
  const isAdmin = ["admin"].includes(role ?? "");
  if (!isOwner && !isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const allowed = [
    "name", "nameKa", "citySlug", "description", "descriptionKa", "categories",
    "priceLevel", "phone", "email", "website", "socials", "openingHours",
    "reservable", "geo",
  ];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  // Status transitions an OWNER may trigger — never approve/activate themselves.
  // submit: draft/rejected → pending. unpublish-to-draft: pending → draft.
  // Admins may set any status via the moderation panel instead.
  if (isOwner && !isAdmin && typeof body.status === "string") {
    if (body.status === "pending" && ["draft", "rejected"].includes(place.status)) {
      update.status = "pending";
      update.rejectionReason = "";
    } else if (body.status === "draft" && place.status === "pending") {
      update.status = "draft";
    }
  } else if (isAdmin && typeof body.status === "string") {
    update.status = body.status;
  }

  const updated = await PlaceModel.findByIdAndUpdate(id, update, { new: true }).lean();
  return Response.json({ id: (updated as any)._id.toString() });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireBusiness();
  if (!session) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role;

  await connectDB();

  const place = await PlaceModel.findById(id);
  if (!place) return Response.json({ error: "Not found" }, { status: 404 });

  const isOwner = place.ownerId === userId;
  const isAdmin = ["admin"].includes(role ?? "");
  if (!isOwner && !isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await PlaceModel.findByIdAndDelete(id);
  return Response.json({ ok: true });
}
