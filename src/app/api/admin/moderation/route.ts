import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSuperadmin, isDenied } from "@/lib/permissions";
import { PlaceModel } from "@/lib/models/place";
import { UserModel } from "@/lib/models/user";

/** List listings awaiting moderation (pending review). */
export async function GET() {
  const actor = await requireSuperadmin();
  if (isDenied(actor)) return actor;

  await connectDB();
  const places = await PlaceModel.find({ status: "pending" })
    .sort({ createdAt: 1 })
    .lean();

  // Attach owner name/email for context.
  const ownerIds = [...new Set(places.map((p: any) => p.ownerId).filter(Boolean))];
  const owners = ownerIds.length
    ? await UserModel.find({ _id: { $in: ownerIds } }).select("name email").lean()
    : [];
  const ownerMap = new Map(owners.map((o: any) => [o._id.toString(), o]));

  return NextResponse.json(
    places.map((p: any) => ({
      id: p._id.toString(),
      name: p.name,
      nameKa: p.nameKa ?? "",
      slug: p.slug,
      citySlug: p.citySlug,
      categories: p.categories ?? [],
      description: p.description ?? "",
      address: p.geo?.address ?? "",
      phone: p.phone ?? "",
      email: p.email ?? "",
      website: p.website ?? "",
      socials: p.socials ?? {},
      openingHours: p.openingHours ?? [],
      createdAt: p.createdAt,
      owner: p.ownerId
        ? {
            name: ownerMap.get(p.ownerId)?.name ?? "—",
            email: ownerMap.get(p.ownerId)?.email ?? "—",
          }
        : null,
    }))
  );
}
