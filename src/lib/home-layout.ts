import { connectDB } from "@/lib/db";
import { SiteConfigModel, HOME_SECTION_KEYS } from "@/lib/models/site-config";
import { PlaceModel } from "@/lib/models/place";
import { mockPlaces } from "@/lib/mock/places";
import type { Place } from "@/types";

type HomePageConfig = {
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  componentOrder?: string[];
  featuredPlaceIds?: string[];
};

export type HomeLayout = {
  /** Section keys to render, in order. */
  order: string[];
  /** Hero text/image overrides (empty string = use i18n / default). */
  hero: { title: string; subtitle: string; imageUrl: string };
  /** Featured places, resolved from DB ids or falling back to mock. */
  featured: Place[];
};

function mapDbPlace(doc: Record<string, unknown>): Place {
  return {
    id: String(doc._id),
    slug: String(doc.slug ?? ""),
    citySlug: String(doc.citySlug ?? ""),
    name: String(doc.name ?? ""),
    description: String(doc.description ?? ""),
    images: (doc.images as string[]) ?? [],
    categories: (doc.categories as Place["categories"]) ?? [],
    rating: Number(doc.rating ?? 0),
    reviewCount: Number(doc.reviewCount ?? 0),
    priceLevel: (Number(doc.priceLevel ?? 1) as Place["priceLevel"]),
    geo: (doc.geo as Place["geo"]) ?? { lng: 0, lat: 0, address: "" },
    tags: (doc.tags as string[]) ?? [],
    reservable: Boolean(doc.reservable),
  } as Place;
}

/**
 * Resolve the home-page layout from SiteConfig. Falls back to the full default
 * section order and mock featured places when nothing is configured, so an
 * empty config renders exactly as the original hardcoded homepage did.
 */
export async function getHomeLayout(): Promise<HomeLayout> {
  await connectDB();
  const config = await SiteConfigModel.findOne({ key: "main" })
    .select("pages")
    .lean<{ pages?: Record<string, HomePageConfig> | Map<string, HomePageConfig> }>();

  // `pages` may come back as a Map (Mongoose) or plain object (.lean()).
  const pages = config?.pages as Record<string, HomePageConfig> | undefined;
  const home: HomePageConfig =
    pages && typeof (pages as { get?: unknown }).get === "function"
      ? ((pages as unknown as Map<string, HomePageConfig>).get("home") ?? {})
      : (pages?.home ?? {});

  // Only keep known section keys; ignore unknown/typo entries. Empty => all.
  const configured = (home.componentOrder ?? []).filter((k) =>
    (HOME_SECTION_KEYS as readonly string[]).includes(k)
  );
  const order = configured.length > 0 ? configured : [...HOME_SECTION_KEYS];

  const hero = {
    title: home.heroTitle ?? "",
    subtitle: home.heroSubtitle ?? "",
    imageUrl: home.heroImageUrl ?? "",
  };

  const featured = await resolveFeatured(home.featuredPlaceIds ?? []);

  return { order, hero, featured };
}

async function resolveFeatured(ids: string[]): Promise<Place[]> {
  const valid = ids.filter((id) => /^[a-fA-F0-9]{24}$/.test(id));
  if (valid.length > 0) {
    const docs = await PlaceModel.find({ _id: { $in: valid } }).lean();
    if (docs.length > 0) {
      // Preserve the admin-chosen order.
      const byId = new Map(docs.map((d) => [String(d._id), d]));
      const ordered = valid
        .map((id) => byId.get(id))
        .filter((d): d is NonNullable<typeof d> => Boolean(d))
        .map((d) => mapDbPlace(d as Record<string, unknown>));
      if (ordered.length > 0) return ordered;
    }
  }
  // Fallback: original homepage behaviour.
  return mockPlaces.slice(0, 4);
}
