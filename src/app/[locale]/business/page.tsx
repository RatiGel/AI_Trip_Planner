import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { ReviewModel } from "@/lib/models/review";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function BusinessPage({
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
    .select("_id name status viewCount rating reviewCount")
    .lean();

  const placeIds = places.map((p: any) => p._id.toString());
  const totalViews = places.reduce((sum: number, p: any) => sum + (p.viewCount ?? 0), 0);
  const activeListings = places.filter((p: any) => p.status === "active").length;
  const pendingListings = places.filter((p: any) => p.status === "pending").length;

  const reviews = placeIds.length
    ? await ReviewModel.find({ placeId: { $in: placeIds } })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    : [];

  const avgRating =
    places.length > 0
      ? (
          places.reduce((sum: number, p: any) => sum + (p.rating ?? 0), 0) /
          places.length
        ).toFixed(1)
      : "—";

  const stats = [
    { label: "Total Views", value: totalViews },
    { label: "Active Listings", value: activeListings },
    { label: "Pending Approval", value: pendingListings },
    { label: "Avg Rating", value: avgRating },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Business Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {session?.user?.name}.
          </p>
        </div>
        <Button asChild>
          <Link href="/business/listings/new">
            <Plus className="size-4" /> Add Listing
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {reviews.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium mb-4">Recent reviews</h2>
          <div className="space-y-3">
            {reviews.map((r: any) => (
              <div key={r._id.toString()} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">{r.userName}</p>
                  <p className="text-muted-foreground line-clamp-1">{r.text}</p>
                </div>
                <span className="text-muted-foreground shrink-0">★ {r.rating}</span>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-3" asChild>
            <Link href="/business/reviews">View all reviews →</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
