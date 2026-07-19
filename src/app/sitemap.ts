import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { connectDB } from "@/lib/db";
import { CityModel } from "@/lib/models/city";
import { PlaceModel } from "@/lib/models/place";
import { PUBLISHED } from "@/lib/places/published";
import { SITE_URL } from "@/lib/seo";

const STATIC_PATHS = [
  "",
  "/cities",
  "/food",
  "/discover",
  "/events",
  "/experiences",
  "/travel-info",
  "/map",
  "/planner",
];

function entry(path: string, locale: string): MetadataRoute.Sitemap[number] {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = `${SITE_URL}/${l}${path}`;
  }
  return {
    url: `${SITE_URL}/${locale}${path}`,
    alternates: { languages },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connectDB();

  const cities = (await CityModel.find({}).select("slug").lean()) as unknown as {
    slug: string;
  }[];
  const places = (await PlaceModel.find(PUBLISHED)
    .select("slug")
    .lean()) as unknown as { slug: string }[];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of STATIC_PATHS) {
      entries.push(entry(path, locale));
    }
    for (const city of cities) {
      entries.push(entry(`/cities/${city.slug}`, locale));
    }
    for (const place of places) {
      entries.push(entry(`/places/${place.slug}`, locale));
    }
  }

  return entries;
}
