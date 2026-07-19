import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { MapExplorer } from "@/components/map/map-explorer";
import { buildMetadata } from "@/lib/seo";
import type { Place } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale,
    path: "/map",
    title: "Tbilisi Map — Explore Attractions & Plan Your Route",
    description:
      "Interactive map of Tbilisi's top attractions, restaurants, and neighborhoods. Find places near you and plan your route.",
  });
}

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
