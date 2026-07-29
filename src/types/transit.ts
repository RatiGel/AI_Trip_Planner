// Server-normalized transit shapes. normalizePlan() maps the TTC /plan
// (BusPlan) response into these. Keep field names stable — API routes and
// UI components import these directly.

export type LatLng = [number, number]; // [latitude, longitude]

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

export type LegMode = "walk" | "bus" | "metro" | "unknown";

export interface JourneyLeg {
  mode: LegMode;
  line?: string;        // e.g. "37" for a bus/metro line
  color?: string;       // route brand color, 6-digit hex w/o "#" (e.g. "0033B4")
  fromStop?: string;    // boarding stop name
  toStop?: string;      // alighting stop name
  fromStopId?: string;  // used to fetch live arrivals
  startTime?: string;   // ISO — leg departure
  endTime?: string;     // ISO — leg arrival
  durationMin?: number;
  distanceM?: number;
  /** Ordered coordinates for drawing the leg on a map: from → intermediate stops → to. */
  points?: LatLng[];
}

export interface JourneyPlan {
  id: string;           // stable per-plan key for React
  durationMin?: number;
  walkMin?: number;     // total walking minutes across the journey
  startTime?: string;   // ISO — journey departure
  endTime?: string;     // ISO — journey arrival
  legs: JourneyLeg[];
}

/**
 * One hop of an itinerary day: how to get from stop N to stop N+1 on TTC.
 * `journey` is the chosen TTC plan; when it is null the pair had no transit
 * option (too close, or the API failed) and the UI draws a dashed walk line
 * between `from` and `to` instead.
 */
export interface DayTransitSegment {
  /** 0-based index of the originating stop within the day. */
  fromIndex: number;
  fromName: string;
  toName: string;
  from: LatLng;
  to: LatLng;
  journey: JourneyPlan | null;
  /** Straight-line distance, used for the walk-fallback estimate. */
  fallbackMeters?: number;
  fallbackWalkMin?: number;
}

/** TTC routing for a single itinerary day, stitched from N-1 /plan calls. */
export interface DayTransitRoute {
  day: number;
  color: string;
  segments: DayTransitSegment[];
  /** Sum of routed transit minutes + fallback walk estimates. */
  totalMin: number;
  totalWalkMin: number;
  /** Boardings across the day (bus + metro legs). */
  transitLegs: number;
  /** Segments that had no TTC route and fell back to walking. */
  gapCount: number;
}

export interface DayTransitResponse {
  routes: DayTransitRoute[];
}

export interface Arrival {
  line?: string;
  minutes?: number;     // minutes until arrival
  realtime: boolean;    // true = live prediction, false = scheduled
  destination?: string;
}

export interface TransitError {
  error: "transit_unavailable" | "bad_request";
}
