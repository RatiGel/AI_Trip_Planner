import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { ListingsTable } from "@/components/business/listings-table";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";

export default async function BusinessListingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;

  await connectDB();
  const places = await PlaceModel.find({ ownerId: userId })
    .select("name slug status featured viewCount rating reviewCount citySlug paid")
    .sort({ createdAt: -1 })
    .lean();

  const listings = places.map((p: any) => ({
    id: p._id.toString(),
    name: p.name,
    slug: p.slug,
    status: p.status ?? "active",
    featured: p.featured ?? false,
    viewCount: p.viewCount ?? 0,
    rating: p.rating ?? 0,
    reviewCount: p.reviewCount ?? 0,
    citySlug: p.citySlug,
    paid: p.paid ?? false,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Listings</h1>
          <p className="text-sm text-muted-foreground">{listings.length} listing(s)</p>
        </div>
        <Button asChild>
          <Link href="/business/listings/new">
            <Plus className="size-4" /> New listing
          </Link>
        </Button>
      </div>
      <ListingsTable listings={listings} />
    </div>
  );
}
