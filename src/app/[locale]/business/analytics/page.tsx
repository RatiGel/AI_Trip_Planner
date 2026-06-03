import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { AnalyticsCharts } from "@/components/business/analytics-charts";

export default async function BusinessAnalyticsPage({
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
    .select("name viewCount reviewCount rating")
    .lean();

  const listings = places.map((p: any) => ({
    name: p.name,
    viewCount: p.viewCount ?? 0,
    reviewCount: p.reviewCount ?? 0,
    rating: p.rating ?? 0,
  }));

  const totalViews = listings.reduce((s, l) => s + l.viewCount, 0);
  const totalReviews = listings.reduce((s, l) => s + l.reviewCount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Performance across all your listings</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total views</p>
          <p className="mt-1 text-2xl font-semibold">{totalViews}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total reviews</p>
          <p className="mt-1 text-2xl font-semibold">{totalReviews}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Listings</p>
          <p className="mt-1 text-2xl font-semibold">{listings.length}</p>
        </div>
      </div>
      <AnalyticsCharts listings={listings} />
    </div>
  );
}
