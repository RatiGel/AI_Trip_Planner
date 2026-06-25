import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { popularityScore } from "@/lib/places/visit-duration";
import { PUBLISHED } from "@/lib/places/published";
import type { CategorySlug, Place, TravelPreferences } from "@/types";

function toPlace(doc: Record<string, unknown>): Place {
  const { _id, ...rest } = doc;
  return { ...(rest as Omit<Place, "id">), id: String(_id) };
}

const MAX_CANDIDATES = 40;

export async function getCandidatePlaces(
  prefs: TravelPreferences,
): Promise<Place[]> {
  await connectDB();

  // PUBLISHED carries its own $or, so AND it with the category $or rather than
  // assigning a second top-level $or (which would silently overwrite).
  const filter: Record<string, unknown> = {
    citySlug: prefs.citySlug,
    $and: [PUBLISHED],
  };

  if (prefs.categories?.length) {
    (filter.$and as Record<string, unknown>[]).push({
      $or: [{ categories: { $in: prefs.categories } }],
    });
  }

  const docs = await PlaceModel.find(filter).lean();
  const places = docs.map((d) => toPlace(d as Record<string, unknown>));

  const target = Math.min(MAX_CANDIDATES, Math.max(12, prefs.days * 8));

  return places
    .sort((a, b) => popularityScore(b) - popularityScore(a))
    .slice(0, target);
}

export function toAICandidate(place: Place) {
  return {
    id: place.id,
    name: place.name,
    categories: place.categories as CategorySlug[],
    tags: place.tags,
    description: place.description?.slice(0, 240) ?? "",
  };
}
