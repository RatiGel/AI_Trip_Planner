import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ReviewModel } from "@/lib/models/review";
import { PlaceModel } from "@/lib/models/place";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !["business", "admin"].includes(role ?? "")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const userId = (session.user as { id?: string }).id!;
  const { reply } = await req.json();

  if (!reply?.trim()) {
    return Response.json({ error: "reply required" }, { status: 400 });
  }

  await connectDB();

  const review = await ReviewModel.findById(id);
  if (!review) return Response.json({ error: "Not found" }, { status: 404 });

  const place = await PlaceModel.findById(review.placeId);
  const isOwner = (place as any)?.ownerId === userId;
  const isAdminOrSuper = ["admin"].includes(role ?? "");
  if (!isOwner && !isAdminOrSuper) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await ReviewModel.findByIdAndUpdate(id, { reply });
  return Response.json({ ok: true });
}
