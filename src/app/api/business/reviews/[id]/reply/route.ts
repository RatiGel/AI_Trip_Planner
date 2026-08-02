import { connectDB } from "@/lib/db";
import { ReviewModel } from "@/lib/models/review";
import { requireBusiness, requireListingAccess, isDenied } from "@/lib/permissions";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireBusiness();
  if (isDenied(actor)) return actor;

  const { id } = await params;
  const { reply } = await req.json();

  if (!reply?.trim()) {
    return Response.json({ error: "reply required" }, { status: 400 });
  }

  await connectDB();

  const review = await ReviewModel.findById(id);
  if (!review) return Response.json({ error: "Not found" }, { status: 404 });

  // A business owner may only reply to reviews on their own listing;
  // requireListingAccess also allows superadmin through.
  const access = await requireListingAccess(String(review.placeId));
  if (isDenied(access)) return access;

  await ReviewModel.findByIdAndUpdate(id, { reply });
  return Response.json({ ok: true });
}
