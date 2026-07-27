import type { JourneyPlan } from "./transit";

export type CategorySlug =
  | "museum"
  | "sight"
  | "cafe"
  | "club"
  | "restaurant"
  | "park"
  | "shop"
  | "wine";

export interface Category {
  slug: CategorySlug;
  icon: string;
}

export interface Geo {
  lng: number;
  lat: number;
  address: string;
}

export interface OpeningHours {
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  open: string; // "10:00"
  close: string; // "22:00"
  closed?: boolean;
}

export interface City {
  id: string;
  slug: string;
  name: string;
  nameKa: string;
  country: string;
  description: string;
  descriptionKa: string;
  heroImage: string;
  geo: Geo;
  placesCount: number;
}

export interface Socials {
  facebook?: string;
  instagram?: string;
  x?: string;
  tiktok?: string;
  youtube?: string;
}

/**
 * Listing lifecycle: draft → pending (submitted) → approved (admin OK, awaiting
 * payment) → active (paid, live). rejected is terminal until edited & resubmitted.
 */
export type ListingStatus = "draft" | "pending" | "approved" | "active" | "rejected";

export interface PlaceService {
  id: string;
  name: string;
  nameKa?: string;
  description?: string;
  priceGEL: number;
}

export interface Place {
  id: string;
  slug: string;
  citySlug: string;
  name: string;
  nameKa: string;
  description: string;
  descriptionKa: string;
  categories: CategorySlug[];
  images: string[];
  geo: Geo;
  openingHours: OpeningHours[];
  priceLevel: 1 | 2 | 3 | 4;
  rating: number; // 0-5
  reviewCount: number;
  tags: string[];
  reservable: boolean;
  phone?: string;
  email?: string;
  website?: string;
  socials?: Socials;
  /** Typical time a visitor spends here, in minutes. Optional — derived from
   *  category when absent (see lib/places/visit-duration.ts). */
  averageVisitDurationMin?: number;
  /** 0-100 popularity used for candidate ranking. Optional — derived from
   *  rating * reviewCount when absent. */
  popularityScore?: number;
  ownerId?: string;
  status?: ListingStatus;
  featured?: boolean;
  /** True once the 50 GEL listing publication fee is paid. */
  paid?: boolean;
  /** Paid services/products the business sells on this listing. */
  services?: PlaceService[];
  /** Booking fee/deposit charged per reservation, in GEL. 0/undefined = free. */
  reservationPriceGEL?: number;
  rejectionReason?: string;
  viewCount?: number;
  /** External place ID (Foursquare fsq_id), set by sync-ratings script. */
  extPlaceId?: string;
  /** Rating from external source (0-5 scale). Preferred over `rating` for ranking. */
  extRating?: number;
  /** Review count from external source. Preferred over `reviewCount` for ranking. */
  extReviewCount?: number;
}

/** A candidate place surfaced to the itinerary pipeline, tagged by where it
 *  came from. "listed" candidates (our DB) always rank ahead of "external"
 *  ones (future map/API sources) — see lib/places/candidates.ts. */
export interface PlaceCandidate extends Place {
  source: "listed" | "external";
}

// ── AI Route Planner ────────────────────────────────────────────────
// The AI is responsible ONLY for itinerary planning. It never returns
// coordinates, addresses, or routes — only place IDs drawn from the
// candidate list. All geographic data comes from the database.

export type TripPace = "relaxed" | "balanced" | "packed";

/** Raw preferences submitted by the user. */
export interface TravelPreferences {
  citySlug: string;
  days: number;
  /** Free-text description of what the traveller enjoys. */
  interests: string;
  /** Optional category hints used to pre-filter candidates. */
  categories?: CategorySlug[];
  pace?: TripPace;
  /** Wall-clock the traveller wants to start each day, e.g. "09:00". */
  dayStart?: string;
}

/** A single stop as chosen by the AI — place_id + reason only. */
export interface AIItineraryStop {
  place_id: string;
  reason: string;
}

export interface AIItineraryDay {
  day: number;
  stops: AIItineraryStop[];
}

/** Exactly the JSON shape the AI is constrained to return. */
export interface AIItinerary {
  title: string;
  days: AIItineraryDay[];
}

/** A stop after the DB join + optimization: full place + schedule. */
export interface RouteStop {
  order: number; // 1-based position within the day
  place: Place;
  reason: string;
  /** Estimated arrival time, "HH:MM". */
  arrival: string;
  /** Estimated departure time, "HH:MM". */
  departure: string;
  visitDurationMin: number;
  /** Travel from the PREVIOUS stop to this one (0 for the first stop). */
  travelFromPrevMin: number;
  travelFromPrevMeters: number;
  /** True when this stop is likely closed at the scheduled arrival. */
  closedWarning?: boolean;
}

export interface RouteStats {
  totalDistanceMeters: number;
  totalTravelMin: number;
  totalVisitMin: number;
  /** "HH:MM" the day is expected to wrap up. */
  dayEndsAt: string;
  stopCount: number;
}

export interface RouteDay {
  day: number;
  /** Hex colour assigned to this day's markers + polyline. */
  color: string;
  stops: RouteStop[];
  stats: RouteStats;
}

export interface RoutePlan {
  title: string;
  days: RouteDay[];
  /** Aggregate across all days. */
  totals: RouteStats;
  /** Travel mode used for distance/time estimates. */
  mode: "walking" | "driving" | "straight-line";
}

export interface PlacePreviewCard {
  placeId: string;
  name: string;
  nameKa: string;
  category: CategorySlug;
  imageUrl?: string;
  rating: number;
  reviewCount: number;
  description: string;
  reason: string;
  day: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "place-selection" | "route-plan" | "journey";
  previewPlaces?: PlacePreviewCard[];
  pendingItinerary?: AIItinerary;
  itineraryPlaces?: Place[];
  itinerary?: SavedItinerary;
  journeyPlans?: JourneyPlan[];
  journeyFrom?: string;
  journeyTo?: string;
}

export interface ItineraryItem {
  /** Stable Mongoose subdocument id. Optional — absent on docs saved before
   *  subdocument _ids were enabled; callers should fall back to array index. */
  _id?: string;
  placeId: string;
  time: string;
  notes?: string;
}

export interface ItineraryDay {
  /** Stable Mongoose subdocument id. Optional — absent on docs saved before
   *  subdocument _ids were enabled; callers should fall back to array index. */
  _id?: string;
  date: string;
  items: ItineraryItem[];
}

export interface SavedItinerary {
  id: string;
  title: string;
  days: ItineraryDay[];
  createdAt: string;
}

export type TicketType = "bus" | "rail" | "transit-pass";

export type DealCategory = "attraction" | "food" | "transport" | "experience";

export interface DealOption {
  id: string;
  title: string;
  description: string;
  priceOriginal: number;
  priceGEL: number;
  discountPct: number;
  category: DealCategory;
  validUntil?: string;
  image?: string;
  badge?: string;
}

export interface TicketOption {
  id: string;
  type: TicketType;
  from?: string;
  to?: string;
  departure?: string;
  arrival?: string;
  durationMin?: number;
  priceGEL: number;
  operator: string;
}

export interface Reservation {
  id: string;
  placeId: string;
  datetime: string;
  partySize: number;
  notes?: string;
  status: "pending" | "confirmed" | "cancelled";
  priceGEL?: number;
  paymentStatus?: "unpaid" | "paid";
}

export interface Voucher {
  id: string;
  code: string;
  userId: string;
  dealId: string;
  dealTitle: string;
  amountGEL: number;
  paymentOrderId: string;
  status: "active" | "redeemed";
  createdAt: string;
}
