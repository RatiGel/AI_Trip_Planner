import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { ReviewModel } from "@/lib/models/review";
import { ReviewsTable } from "@/components/business/reviews-table";

export default async function BusinessReviewsPage({
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
    .select("_id name")
    .lean();

  const placeIds = places.map((p: any) => p._id.toString());
  const placeNameMap = Object.fromEntries(
    places.map((p: any) => [p._id.toString(), p.name])
  );

  const reviews = placeIds.length
    ? await ReviewModel.find({ placeId: { $in: placeIds } })
        .sort({ createdAt: -1 })
        .lean()
    : [];

  const serialized = reviews.map((r: any) => ({
    id: r._id.toString(),
    placeId: r.placeId,
    placeName: placeNameMap[r.placeId] ?? "Unknown",
    userName: r.userName,
    rating: r.rating,
    text: r.text,
    reply: r.reply ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
        <p className="text-sm text-muted-foreground">{serialized.length} review(s)</p>
      </div>
      <ReviewsTable reviews={serialized} />
    </div>
  );
}
