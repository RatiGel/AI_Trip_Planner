import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSuperadmin, isDenied } from "@/lib/permissions";
import { PlaceModel } from "@/lib/models/place";

/**
 * Approve or reject a pending listing.
 * Body: { action: "approve" | "reject", reason?: string }
 *
 * approve → status="approved" (owner must then pay the listing fee to go live).
 * reject  → status="rejected" with a reason; the owner can edit & resubmit.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireSuperadmin();
  if (isDenied(actor)) return actor;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await connectDB();
  const place = await PlaceModel.findById(id);
  if (!place) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "approve") {
    place.status = "approved";
    place.rejectionReason = "";
  } else {
    place.status = "rejected";
    place.rejectionReason = (body.reason as string)?.slice(0, 500) || "";
  }
  await place.save();

  return NextResponse.json({ id, status: place.status });
}
