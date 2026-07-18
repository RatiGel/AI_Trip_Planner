import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ItineraryModel, type IItinerary } from "@/lib/models/itinerary";
import { PlaceModel } from "@/lib/models/place";
import { TripForm } from "@/components/trips/trip-form";
import { redirect } from "@/i18n/navigation";

type LeanItinerary = Omit<IItinerary, "_id"> & { _id: { toString(): string } };
type LeanDay = LeanItinerary["days"][number];
type LeanItem = LeanDay["items"][number];

export default async function EditTripPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  await connectDB();
  const tripDoc = userId
    ? ((await ItineraryModel.findById(id).lean()) as unknown as LeanItinerary | null)
    : null;

  if (!tripDoc || tripDoc.userId !== userId) {
    redirect({ href: "/trips", locale });
  }
  const trip = tripDoc!;

  const placeIds = [
    ...new Set(trip.days.flatMap((d: LeanDay) => d.items.map((i: LeanItem) => i.placeId))),
  ];
  const places = (await PlaceModel.find({ _id: { $in: placeIds } })
    .select("name")
    .lean()) as unknown as { _id: { toString(): string }; name: string }[];
  const nameById = Object.fromEntries(places.map((p) => [String(p._id), p.name]));

  const defaultValues = {
    title: String(trip.title),
    days: trip.days.map((d: LeanDay) => ({
      date: String(d.date),
      items: d.items.map((i: LeanItem) => ({
        placeId: String(i.placeId),
        time: String(i.time),
        notes: i.notes != null ? String(i.notes) : undefined,
        name: String(nameById[i.placeId] ?? "Unknown place"),
      })),
    })),
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Edit trip</h1>
      <p className="text-sm text-muted-foreground">{trip.title}</p>
      <div className="mt-6">
        <TripForm tripId={id} defaultValues={defaultValues} />
      </div>
    </div>
  );
}
