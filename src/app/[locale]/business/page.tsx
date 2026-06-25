import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { ReviewModel } from "@/lib/models/review";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Eye,
  CheckCircle2,
  Clock,
  Star,
  Plus,
  MessageSquare,
  ArrowUpRight,
  Store,
} from "lucide-react";

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
  const pendingListings = places.filter((p: any) =>
    ["pending", "approved", "draft"].includes(p.status)
  ).length;

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

  const hasListings = places.length > 0;

  const stats = [
    {
      label: "Total Views",
      value: totalViews.toLocaleString(),
      Icon: Eye,
      tint: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-500/10",
    },
    {
      label: "Active Listings",
      value: activeListings,
      Icon: CheckCircle2,
      tint: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Pending Approval",
      value: pendingListings,
      Icon: Clock,
      tint: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Avg Rating",
      value: avgRating,
      Icon: Star,
      tint: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Business Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {session?.user?.name}.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/business/listings/new">
            <Plus className="size-4" /> Add Listing
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, Icon, tint, bg }) => (
          <div
            key={label}
            className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span
                className={`flex size-10 items-center justify-center rounded-xl ${bg} ${tint}`}
              >
                <Icon className="size-5" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight">
              {value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Empty state — no listings yet */}
      {!hasListings && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Store className="size-7" />
          </span>
          <h2 className="mt-5 text-lg font-semibold">No listings yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Add your first business listing to start attracting visitors and collecting reviews.
          </p>
          <Button asChild className="mt-6">
            <Link href="/business/listings/new">
              <Plus className="size-4" /> Add your first listing
            </Link>
          </Button>
        </div>
      )}

      {/* Recent reviews */}
      {hasListings && (
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Recent reviews</h2>
            </div>
            {reviews.length > 0 && (
              <Button variant="ghost" size="sm" asChild className="h-8 text-xs">
                <Link href="/business/reviews">
                  View all <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            )}
          </div>

          {reviews.length > 0 ? (
            <ul className="divide-y divide-border">
              {reviews.map((r: any) => (
                <li
                  key={r._id.toString()}
                  className="flex items-start justify-between gap-4 px-5 py-4"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground">
                      {r.userName?.[0] ?? "?"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.userName}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {r.text}
                      </p>
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <Star className="size-3 fill-current" />
                    {r.rating}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No reviews yet. They&rsquo;ll appear here once visitors rate your listings.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
