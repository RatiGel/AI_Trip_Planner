import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { popularityScore } from "@/lib/places/visit-duration";
import type { CategorySlug, Place, TravelPreferences } from "@/types";

/** Mongo lean doc → Place (maps _id → id; .lean() drops virtuals). */
function toPlace(doc: Record<string, unknown>): Place {
  const { _id, ...rest } = doc;
  return { ...(rest as Omit<Place, "id">), id: String(_id) };
}

/** Cap on candidates sent to the AI — enough variety, bounded token cost. */
const MAX_CANDIDATES = 40;

/**
 * STEP 2 of the backend flow: query the DB for candidate places and filter
 * by category / tags / popularity. The AI later chooses only from this set.
 *
 * Filtering here is deliberately coarse (city + optional category/tag hints):
 * we want a varied pool and let the AI do the nuanced selection. Results are
 * ranked by popularity and capped at MAX_CANDIDATES.
 */
export async function getCandidatePlaces(
  prefs: TravelPreferences,
): Promise<Place[]> {
  await connectDB();

  const filter: Record<string, unknown> = { citySlug: prefs.citySlug };

  // Category / tag hints (optional). $in keeps the pool broad rather than
  // requiring every hint to match.
  const orClauses: Record<string, unknown>[] = [];
  if (prefs.categories?.length) {
    orClauses.push({ categories: { $in: prefs.categories } });
  }
  if (orClauses.length) filter.$or = orClauses;

  const docs = await PlaceModel.find(filter).lean();
  const places = docs.map((d) => toPlace(d as Record<string, unknown>));

  // Scale the pool to trip length: ~8 candidates per day, min 12, max 40.
  const target = Math.min(MAX_CANDIDATES, Math.max(12, prefs.days * 8));

  return places
    .sort((a, b) => popularityScore(b) - popularityScore(a))
    .slice(0, target);
}

/** Compact projection sent to the AI — id, name, category, tags, short desc.
 *  No coordinates: the AI must not see or emit geographic data. */
export function toAICandidate(place: Place) {
  return {
    id: place.id,
    name: place.name,
    categories: place.categories as CategorySlug[],
    tags: place.tags,
    description: place.description?.slice(0, 240) ?? "",
  };
}
