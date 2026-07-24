import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { connectDB } from "@/lib/db";
import { CityModel } from "@/lib/models/city";
import { PlaceModel } from "@/lib/models/place";
import { PUBLISHED } from "@/lib/places/published";
import { SITE_URL } from "@/lib/seo";

type ChangeFreq = MetadataRoute.Sitemap[number]["changeFrequency"];

// path -> [changeFrequency, priority]
const STATIC_PATHS: Record<string, [ChangeFreq, number]> = {
  "": ["daily", 1.0],
  "/cities": ["weekly", 0.8],
  "/discover": ["weekly", 0.8],
  "/food": ["weekly", 0.7],
  "/experiences": ["weekly", 0.7],
  "/events": ["daily", 0.7],
  "/planner": ["monthly", 0.7],
  "/map": ["monthly", 0.6],
  "/travel-info": ["monthly", 0.6],
};

function entry(
  path: string,
  locale: string,
  opts: {
    changeFrequency?: ChangeFreq;
    priority?: number;
    lastModified?: Date;
  } = {},
): MetadataRoute.Sitemap[number] {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = `${SITE_URL}/${l}${path}`;
  }
  languages["x-default"] = `${SITE_URL}/${routing.defaultLocale}${path}`;
  return {
    url: `${SITE_URL}/${locale}${path}`,
    alternates: { languages },
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    lastModified: opts.lastModified,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connectDB();

  const cities = (await CityModel.find({})
    .select("slug updatedAt")
    .lean()) as unknown as { slug: string; updatedAt?: Date }[];
  const places = (await PlaceModel.find(PUBLISHED)
    .select("slug updatedAt")
    .lean()) as unknown as { slug: string; updatedAt?: Date }[];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const [path, [changeFrequency, priority]] of Object.entries(
      STATIC_PATHS,
    )) {
      entries.push(entry(path, locale, { changeFrequency, priority }));
    }
    for (const city of cities) {
      entries.push(
        entry(`/cities/${city.slug}`, locale, {
          changeFrequency: "weekly",
          priority: 0.7,
          lastModified: city.updatedAt,
        }),
      );
    }
    for (const place of places) {
      entries.push(
        entry(`/places/${place.slug}`, locale, {
          changeFrequency: "monthly",
          priority: 0.6,
          lastModified: place.updatedAt,
        }),
      );
    }
  }

  return entries;
}
