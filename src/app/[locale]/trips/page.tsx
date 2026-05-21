import { CalendarDays, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ItineraryModel } from "@/lib/models/itinerary";
import { PlaceModel } from "@/lib/models/place";
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
    const userId = (session.user as { id?: string }).id;
    const docs = await ItineraryModel.find({ userId }).sort({ createdAt: -1 }).lean();
    trips = docs.map((d) => ({
      id: d._id.toString(),
      title: d.title,
      createdAt: d.createdAt.toISOString().slice(0, 10),
      days: d.days,
    }));

    const placeIds = trips.flatMap((t) => t.days.flatMap((d) => d.items.map((i) => i.placeId)));
    const unique = [...new Set(placeIds)];
    const places = (await PlaceModel.find({ _id: { $in: unique } }).lean()) as unknown as Place[];
    placesMap = Object.fromEntries(places.map((p) => [p.id, p]));
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
  const locale = useLocale();

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
      <div className="mt-6 space-y-6">
        {trips.map((trip) => (
          <article key={trip.id} className="rounded-2xl border border-border bg-card p-5">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{trip.title}</h2>
                <p className="text-xs text-muted-foreground">{trip.createdAt}</p>
              </div>
              <Badge variant="secondary">{trip.days.length} days</Badge>
            </header>
            <ol className="mt-4 space-y-4">
              {trip.days.map((day) => (
                <li key={day.date} className="rounded-lg border border-border/60 p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <CalendarDays className="size-4 text-primary" />
                    {day.date}
                  </p>
                  <ul className="space-y-2">
                    {day.items.map((item) => {
                      const place = placesMap[item.placeId];
                      if (!place) return null;
                      const name = locale === "ka" ? place.nameKa : place.name;
                      return (
                        <li key={`${item.placeId}-${item.time}`} className="flex items-start gap-3">
                          <span className="w-12 shrink-0 text-sm tabular-nums text-muted-foreground">
                            {item.time}
                          </span>
                          <div className="flex-1">
                            <Link
                              href={`/places/${place.slug}`}
                              className="text-sm font-medium hover:underline"
                            >
                              {name}
                            </Link>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground">{item.notes}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </div>
  );
}
