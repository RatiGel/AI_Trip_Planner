import type { CategorySlug, Place } from "@/types";

/** Default minutes a visitor spends, by category. Used when a place has no
 *  explicit `averageVisitDurationMin`. */
const DEFAULT_BY_CATEGORY: Record<CategorySlug, number> = {
  museum: 120,
  sight: 60,
  cafe: 45,
  club: 150,
  restaurant: 90,
  park: 60,
  shop: 45,
  wine: 90,
};

const FALLBACK_MIN = 60;

/** Resolve how long a visitor spends at a place, in minutes. */
export function visitDurationMin(place: Place): number {
  if (place.averageVisitDurationMin && place.averageVisitDurationMin > 0) {
    return place.averageVisitDurationMin;
  }
  const first = place.categories[0];
  return (first && DEFAULT_BY_CATEGORY[first]) || FALLBACK_MIN;
}

/** Derive a 0-100 popularity score when the place lacks an explicit one.
 *  Combines rating (0-5) and review volume (log-scaled). */
export function popularityScore(place: Place): number {
  if (typeof place.popularityScore === "number") return place.popularityScore;
  const ratingPart = (place.rating / 5) * 70; // up to 70 pts from rating
  const reviewPart = Math.min(30, Math.log10(place.reviewCount + 1) * 10); // up to 30
  return Math.round(ratingPart + reviewPart);
}
