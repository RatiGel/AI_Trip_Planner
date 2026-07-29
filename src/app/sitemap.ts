import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { connectDB } from "@/lib/db";
import { CityModel } from "@/lib/models/city";
import { PlaceModel } from "@/lib/models/place";
import { PUBLISHED } from "@/lib/places/published";
import { SITE_URL } from "@/lib/seo";
import { hasTranslation } from "@/lib/i18n-content";

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
    /** Locales that render real translated copy. Defaults to all locales. */
    localesWithContent?: readonly string[];
  } = {},
): MetadataRoute.Sitemap[number] {
  // Only advertise alternates that are actually indexable. Pointing hreflang at
  // a noindexed duplicate wastes crawl budget and sends Google mixed signals.
  const alternateLocales = opts.localesWithContent ?? routing.locales;
  const languages: Record<string, string> = {};
  for (const l of alternateLocales) {
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

/**
 * A place earns a sitemap entry only if it has enough content to be worth
 * indexing. Google's "Discovered - currently not indexed" is largely a crawl-
 * budget verdict: advertise 537 URLs where most are thin or duplicated and it
 * samples a few, judges the set low-value, and defers the rest. Better to
 * submit fewer, genuinely indexable URLs.
 */
const MIN_DESCRIPTION_CHARS = 200;

function isIndexable(place: { description?: string; images?: string[] }): boolean {
  return (
    (place.description?.trim().length ?? 0) >= MIN_DESCRIPTION_CHARS &&
    (place.images?.length ?? 0) > 0
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connectDB();

  type Translatable = {
    slug: string;
    updatedAt?: Date;
    description?: string;
    images?: string[];
    nameKa?: string;
    descriptionKa?: string;
    nameRu?: string;
    descriptionRu?: string;
  };

  const cities = (await CityModel.find({})
    .select("slug updatedAt nameKa descriptionKa nameRu descriptionRu")
    .lean()) as unknown as Translatable[];
  const allPlaces = (await PlaceModel.find(PUBLISHED)
    .select(
      "slug updatedAt description images nameKa descriptionKa nameRu descriptionRu",
    )
    .lean()) as unknown as Translatable[];

  // Thin listings (no description or no photo) are dropped entirely — they are
  // what teaches Google the site is low-value.
  const places = allPlaces.filter(isIndexable);

  const entries: MetadataRoute.Sitemap = [];

  /** Locales whose translated copy actually exists for this record. */
  const contentLocales = (doc: Translatable) =>
    routing.locales.filter((l) => hasTranslation(doc, l));

  for (const locale of routing.locales) {
    for (const [path, [changeFrequency, priority]] of Object.entries(
      STATIC_PATHS,
    )) {
      // Static pages are translated through the message files, so every locale
      // is a genuine alternate.
      entries.push(entry(path, locale, { changeFrequency, priority }));
    }
    for (const city of cities) {
      const localesWithContent = contentLocales(city);
      if (!localesWithContent.includes(locale)) continue;
      entries.push(
        entry(`/cities/${city.slug}`, locale, {
          changeFrequency: "weekly",
          priority: 0.7,
          lastModified: city.updatedAt,
          localesWithContent,
        }),
      );
    }
    for (const place of places) {
      const localesWithContent = contentLocales(place);
      if (!localesWithContent.includes(locale)) continue;
      entries.push(
        entry(`/places/${place.slug}`, locale, {
          changeFrequency: "monthly",
          priority: 0.6,
          lastModified: place.updatedAt,
          localesWithContent,
        }),
      );
    }
  }

  return entries;
}
