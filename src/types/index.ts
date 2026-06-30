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

// ── AI Route Planner ────────────────────────────────────────────────
// The AI is responsible ONLY for itinerary planning. It never returns
// coordinates, addresses, or routes — only place IDs drawn from the
// candidate list. All geographic data comes from the database.

export type TripPace = "relaxed" | "balanced" | "packed";

export type TransportMode = "walk" | "car" | "taxi" | "public";

export type Budget = "low" | "mid" | "high";

export type WalkingTolerance = "low" | "medium" | "high";

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
  /** ISO date of the (first) trip day, "YYYY-MM-DD". Drives sunset timing. */
  dateISO?: string;
  /** Free-text starting point, e.g. "Rustaveli metro" or a hotel name. */
  startLocation?: string;
  /** How the traveller gets around — affects travel-time estimates. */
  transport?: TransportMode;
  /** Spending level — filters candidate places by price. */
  budget?: Budget;
  /** Tolerance for walking between stops. */
  walkingTolerance?: WalkingTolerance;
  /** Number of people travelling. */
  travelers?: number;
}

/**
 * Routing context captured at preview time and replayed at confirm time so the
 * final itinerary can be optimised without re-asking the user. Carried in the
 * SSE preview payload → ChatMessage → confirm request body.
 */
export interface TripContext {
  dateISO?: string;
  transport?: TransportMode;
  /** Resolved start coordinates (geocoded once at preview time). */
  startGeo?: Geo;
  walkingTolerance?: WalkingTolerance;
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
  /** True when scheduled near sunset (viewpoint timed for golden hour). */
  sunsetTimed?: boolean;
}

/** A non-place block inserted into a day's schedule (e.g. a meal). */
export interface RouteBreak {
  /** Which meal this break represents. */
  type: "lunch" | "dinner";
  /** "HH:MM" start. */
  arrival: string;
  /** "HH:MM" end. */
  departure: string;
  durationMin: number;
}

/** Either a real place stop or a synthetic break, in schedule order. */
export type RouteItem =
  | ({ kind: "stop" } & RouteStop)
  | ({ kind: "break" } & RouteBreak);

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
  /** Real place stops only — used for the map + Google Maps export. */
  stops: RouteStop[];
  /** Full schedule incl. synthetic meal breaks, in time order. For display. */
  items: RouteItem[];
  /** Computed sunset "HH:MM" for the trip date, if a date was given. */
  sunset?: string;
  stats: RouteStats;
}

export interface RoutePlan {
  title: string;
  days: RouteDay[];
  /** Aggregate across all days. */
  totals: RouteStats;
  /** Travel mode used for distance/time estimates. */
  mode: "walking" | "driving" | "transit" | "straight-line";
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
  type?: "place-selection" | "route-plan";
  previewPlaces?: PlacePreviewCard[];
  pendingItinerary?: AIItinerary;
  itineraryPlaces?: Place[];
  tripContext?: TripContext;
  itinerary?: SavedItinerary;
}

export interface ItineraryItem {
  placeId: string;
  time: string;
  notes?: string;
}

export interface ItineraryDay {
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
