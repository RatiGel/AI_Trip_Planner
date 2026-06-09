import type { CategorySlug, Place } from "@/types";

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

export function visitDurationMin(place: Place): number {
  if (place.averageVisitDurationMin && place.averageVisitDurationMin > 0) {
    return place.averageVisitDurationMin;
  }
  const first = place.categories[0];
  return (first && DEFAULT_BY_CATEGORY[first]) || FALLBACK_MIN;
}

export function popularityScore(place: Place): number {
  if (typeof place.popularityScore === "number") return place.popularityScore;
  const rating = place.extRating ?? place.rating;
  const reviews = place.extReviewCount ?? place.reviewCount;
  const ratingPart = (rating / 5) * 70;
  const reviewPart = Math.min(30, Math.log10(reviews + 1) * 10);
  return Math.round(ratingPart + reviewPart);
}
