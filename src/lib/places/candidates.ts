import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { popularityScore } from "@/lib/places/visit-duration";
import { PUBLISHED } from "@/lib/places/published";
import type { CategorySlug, Place, PlaceCandidate, TravelPreferences } from "@/types";

function toPlace(doc: Record<string, unknown>): Place {
  const { _id, ...rest } = doc;
  return { ...(rest as Omit<Place, "id">), id: String(_id) };
}

const MAX_CANDIDATES = 40;

/** DB-listed places — always ranked ahead of external candidates. */
async function getListedCandidates(
  prefs: TravelPreferences,
): Promise<PlaceCandidate[]> {
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

  return places
    .sort((a, b) => popularityScore(b) - popularityScore(a))
    .map((p) => ({ ...p, source: "listed" as const }));
}

/**
 * Placeholder for a future external place source (e.g. Google Places,
 * Foursquare) used to fill gaps when listed candidates are too few. Always
 * returns an empty array today — no provider is configured. When one is
 * added, its results must be appended AFTER listed candidates in
 * `getCandidatePlaces`, never interleaved or sorted above them, so DB-listed
 * places always win priority.
 */
export async function getExternalCandidates(
  _prefs: TravelPreferences,
): Promise<PlaceCandidate[]> {
  return [];
}

export async function getCandidatePlaces(
  prefs: TravelPreferences,
): Promise<PlaceCandidate[]> {
  const target = Math.min(MAX_CANDIDATES, Math.max(12, prefs.days * 8));

  const listed = await getListedCandidates(prefs);
  if (listed.length >= target) return listed.slice(0, target);

  const external = await getExternalCandidates(prefs);
  return [...listed, ...external].slice(0, target);
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
