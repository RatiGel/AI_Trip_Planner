import { setRequestLocale } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { MapExplorer } from "@/components/map/map-explorer";
import type { Place } from "@/types";

export default async function MapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await connectDB();
  const docs = await PlaceModel.find({ citySlug: "tbilisi", status: { $ne: "rejected" } })
    .select("slug name nameKa categories images geo rating reviewCount description")
    .lean();

  const places: Place[] = (docs as Record<string, unknown>[]).map((d) => {
    const { _id, ...rest } = d;
    return { ...(rest as Omit<Place, "id">), id: String(_id) };
  });

  return <MapExplorer places={places} />;
}
