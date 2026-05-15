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
  website?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
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
}
