import { isValidObjectId } from "mongoose";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ItineraryModel, type IItinerary } from "@/lib/models/itinerary";
import { PlaceModel } from "@/lib/models/place";
import { redirect } from "@/i18n/navigation";
import { savedTripToRoutePlan } from "@/lib/route/from-saved";
import { planItineraryRoutes } from "@/lib/transit/day-route";
import { TripTransitView } from "@/components/trips/trip-transit-view";
import type { Place, SavedItinerary } from "@/types";

type LeanItinerary = Omit<IItinerary, "_id"> & { _id: { toString(): string } };
type LeanDay = LeanItinerary["days"][number];
type LeanItem = LeanDay["items"][number];

export default async function TripTransitPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  await connectDB();
  // findById throws a CastError on a malformed id, so screen it first — a bad
  // URL should land on /trips, not a 500.
  const tripDoc =
    userId && isValidObjectId(id)
      ? ((await ItineraryModel.findById(id).lean()) as unknown as LeanItinerary | null)
      : null;

  if (!tripDoc || tripDoc.userId !== userId) {
    redirect({ href: "/trips", locale });
  }
  const doc = tripDoc!;

  const trip: SavedItinerary = {
    id: doc._id.toString(),
    title: String(doc.title),
    createdAt: doc.createdAt.toISOString().slice(0, 10),
    days: doc.days.map((d: LeanDay) => ({
      _id: d._id ? String(d._id) : undefined,
      date: String(d.date),
      items: d.items.map((i: LeanItem) => ({
        _id: i._id ? String(i._id) : undefined,
        placeId: String(i.placeId),
        time: String(i.time),
        notes: i.notes != null ? String(i.notes) : undefined,
      })),
    })),
  };

  const placeIds = [
    ...new Set(trip.days.flatMap((d) => d.items.map((i) => i.placeId))),
  ];
  const places = (await PlaceModel.find({ _id: { $in: placeIds } }).lean()) as unknown as (Place & {
    _id: { toString(): string };
  })[];
  const placesMap: Record<string, Place> = Object.fromEntries(
    places.map((p) => {
      const pid = p._id.toString();
      return [pid, { ...JSON.parse(JSON.stringify(p)), id: pid } as Place];
    }),
  );

  const plan = savedTripToRoutePlan(trip, placesMap);
  // savedTripToRoutePlan drops days with no resolvable places, so filter the
  // dates the same way to keep them aligned with plan.days.
  const dates = trip.days
    .filter((d) => d.items.some((i) => placesMap[i.placeId]?.geo))
    .map((d) => d.date);

  // Route on the server so the page arrives with the transit plan already
  // drawn — no client fetch, no loading flash.
  const routes = plan
    ? await planItineraryRoutes(
        plan.days
          .filter((d) => d.stops.length >= 2)
          .map((d) => ({
            day: d.day,
            color: d.color,
            stops: d.stops.map((s) => ({
              name: locale === "ka" ? s.place.nameKa || s.place.name : s.place.name,
              lat: s.place.geo.lat,
              lng: s.place.geo.lng,
            })),
          })),
        locale,
      )
    : [];

  return (
    <TripTransitView title={trip.title} plan={plan} routes={routes} dates={dates} />
  );
}
