import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ItineraryModel, type IItinerary } from "@/lib/models/itinerary";
import { PlaceModel } from "@/lib/models/place";
import { TripsList } from "@/components/trips/trips-list";
import type { SavedItinerary, Place } from "@/types";

export default async function TripsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  let trips: SavedItinerary[] = [];
  let placesMap: Record<string, Place> = {};

  if (session?.user) {
    await connectDB();
    const userId = (session.user as { id?: string }).id ?? "";
    const docs = userId
      ? await ItineraryModel.find({ userId }).sort({ createdAt: -1 }).lean()
      : [];
    trips = docs.map((d) => ({
      id: d._id.toString(),
      title: d.title,
      createdAt: d.createdAt.toISOString().slice(0, 10),
      days: d.days.map((day: IItinerary["days"][number]) => ({
        _id: day._id ? String(day._id) : undefined,
        date: day.date,
        items: day.items.map((item: IItinerary["days"][number]["items"][number]) => ({
          _id: item._id ? String(item._id) : undefined,
          placeId: item.placeId,
          time: item.time,
          notes: item.notes,
        })),
      })),
    }));

    const placeIds = trips.flatMap((t) => t.days.flatMap((d) => d.items.map((i) => i.placeId)));
    const unique = [...new Set(placeIds)];
    const places = (await PlaceModel.find({ _id: { $in: unique } }).lean()) as unknown as (Place & {
      _id: { toString(): string };
    })[];
    placesMap = Object.fromEntries(
      places.map((p) => {
        const id = p._id.toString();
        return [id, { ...JSON.parse(JSON.stringify(p)), id } as Place];
      })
    );
  }

  return <TripsContent trips={trips} placesMap={placesMap} isLoggedIn={!!session?.user} />;
}

function TripsContent({
  trips,
  placesMap,
  isLoggedIn,
}: {
  trips: SavedItinerary[];
  placesMap: Record<string, Place>;
  isLoggedIn: boolean;
}) {
  const t = useTranslations("trips");

  if (!isLoggedIn || trips.length === 0) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
        <Sparkles className="mb-4 size-10 text-primary" />
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-2 max-w-md text-muted-foreground">{t("empty")}</p>
        {!isLoggedIn ? (
          <Button asChild className="mt-6">
            <Link href="/login">{t("signInToSee")}</Link>
          </Button>
        ) : (
          <Button asChild className="mt-6">
            <Link href="/chat">{t("startPlanning")}</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <TripsList trips={trips} placesMap={placesMap} />
    </div>
  );
}
