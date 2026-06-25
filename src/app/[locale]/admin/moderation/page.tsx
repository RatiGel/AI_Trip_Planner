import { setRequestLocale } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { UserModel } from "@/lib/models/user";
import { ModerationPanel } from "@/components/admin/moderation-panel";

export default async function ModerationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await connectDB();
  const places = await PlaceModel.find({ status: "pending" })
    .sort({ createdAt: 1 })
    .lean();

  const ownerIds = [...new Set(places.map((p: any) => p.ownerId).filter(Boolean))];
  const owners = ownerIds.length
    ? await UserModel.find({ _id: { $in: ownerIds } }).select("name email").lean()
    : [];
  const ownerMap = new Map(owners.map((o: any) => [o._id.toString(), o]));

  const listings = places.map((p: any) => ({
    id: p._id.toString(),
    name: p.name,
    nameKa: p.nameKa ?? "",
    slug: p.slug,
    citySlug: p.citySlug ?? "",
    categories: p.categories ?? [],
    description: p.description ?? "",
    address: p.geo?.address ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    website: p.website ?? "",
    socials: p.socials ?? {},
    openingHours: p.openingHours ?? [],
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : "",
    owner: p.ownerId
      ? {
          name: ownerMap.get(p.ownerId)?.name ?? "—",
          email: ownerMap.get(p.ownerId)?.email ?? "—",
        }
      : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Moderation</h1>
        <p className="text-sm text-muted-foreground">
          {listings.length} listing(s) awaiting review.
        </p>
      </div>
      <ModerationPanel initial={listings} />
    </div>
  );
}
