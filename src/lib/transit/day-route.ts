import type { JourneyPlan, LatLng, DayTransitRoute, DayTransitSegment } from "@/types/transit";
import { planJourney } from "./client";
import { haversineMeters } from "@/lib/route/geo";

/**
 * TTC /plan is point-to-point, so an N-stop day needs N-1 calls. They are
 * fired in parallel per day, then stitched into one continuous route. Any pair
 * TTC can't route (too close, or a timeout) becomes a walk-fallback segment.
 */

/**
 * A pair closer than this is walked without asking TTC — at this range a bus
 * is slower than walking to the stop. Measured against the live API: pairs
 * under ~500m return a walk-only itinerary anyway.
 */
const MIN_TRANSIT_METERS = 300;
/**
 * Above this distance, prefer riding over walking: a bus/metro plan wins even
 * when a pure-walk plan is somewhat faster, up to TRANSIT_PREF_MINUTES.
 */
const PREFER_TRANSIT_METERS = 1000;
/** How much longer a riding plan may take and still beat a walk-only plan. */
const TRANSIT_PREF_MINUTES = 15;
/** Two plans within this many minutes count as a tie → fewer transfers wins. */
const TIE_MINUTES = 5;
const WALK_M_PER_MIN = 75;

export interface DayStopInput {
  name: string;
  lat: number;
  lng: number;
}

export interface DayInput {
  day: number;
  color: string;
  stops: DayStopInput[];
}

/** Boardings in a plan — a proxy for how "easy" it is to follow. */
function boardings(plan: JourneyPlan): number {
  return plan.legs.filter((l) => l.mode === "bus" || l.mode === "metro").length;
}

function duration(plan: JourneyPlan): number {
  if (typeof plan.durationMin === "number") return plan.durationMin;
  // No itinerary-level duration → fall back to the sum of leg durations.
  return plan.legs.reduce((sum, l) => sum + (l.durationMin ?? 0), 0);
}

/**
 * Best + easiest: the fastest plan, but when another is within TIE_MINUTES and
 * needs fewer boardings, prefer that one. Ties on both → less walking.
 *
 * `meters` is the straight-line distance of the hop. Past
 * PREFER_TRANSIT_METERS, plans that actually ride are considered first and a
 * walk-only plan only wins if no riding plan is within TRANSIT_PREF_MINUTES of
 * it — otherwise a long hop resolves to a 20-minute walk just because it beat
 * the bus by two minutes.
 */
export function pickBestPlan(plans: JourneyPlan[], meters = 0): JourneyPlan | null {
  const usable = plans.filter((p) => p.legs.some((l) => (l.points?.length ?? 0) >= 2));
  if (usable.length === 0) return null;

  let pool = usable;
  if (meters >= PREFER_TRANSIT_METERS) {
    const riding = usable.filter((p) => boardings(p) > 0);
    if (riding.length > 0) {
      const fastestOverall = Math.min(...usable.map(duration));
      const fastestRiding = Math.min(...riding.map(duration));
      // Only fall back to walking if every riding option is far slower.
      if (fastestRiding - fastestOverall <= TRANSIT_PREF_MINUTES) pool = riding;
    }
  }

  const fastest = Math.min(...pool.map(duration));
  const contenders = pool.filter((p) => duration(p) - fastest <= TIE_MINUTES);

  return contenders.reduce((best, p) => {
    const bt = boardings(best);
    const pt = boardings(p);
    if (pt !== bt) return pt < bt ? p : best;
    const bw = best.walkMin ?? Infinity;
    const pw = p.walkMin ?? Infinity;
    if (pw !== bw) return pw < bw ? p : best;
    return duration(p) < duration(best) ? p : best;
  });
}

function walkFallback(
  fromIndex: number,
  from: DayStopInput,
  to: DayStopInput,
): DayTransitSegment {
  const meters = haversineMeters(
    { lat: from.lat, lng: from.lng, address: "" },
    { lat: to.lat, lng: to.lng, address: "" },
  );
  return {
    fromIndex,
    fromName: from.name,
    toName: to.name,
    from: [from.lat, from.lng],
    to: [to.lat, to.lng],
    journey: null,
    fallbackMeters: meters,
    fallbackWalkMin: Math.max(1, Math.round(meters / WALK_M_PER_MIN)),
  };
}

async function segment(
  fromIndex: number,
  from: DayStopInput,
  to: DayStopInput,
  locale: string,
): Promise<DayTransitSegment> {
  const meters = haversineMeters(
    { lat: from.lat, lng: from.lng, address: "" },
    { lat: to.lat, lng: to.lng, address: "" },
  );
  if (meters < MIN_TRANSIT_METERS) return walkFallback(fromIndex, from, to);

  const plans = await planJourney(
    [from.lat, from.lng] as LatLng,
    [to.lat, to.lng] as LatLng,
    locale,
  );
  const best = plans ? pickBestPlan(plans, meters) : null;
  if (!best) return walkFallback(fromIndex, from, to);

  return {
    fromIndex,
    fromName: from.name,
    toName: to.name,
    from: [from.lat, from.lng],
    to: [to.lat, to.lng],
    journey: best,
  };
}

function summarize(day: DayInput, segments: DayTransitSegment[]): DayTransitRoute {
  let totalMin = 0;
  let totalWalkMin = 0;
  let transitLegs = 0;
  let gapCount = 0;

  for (const s of segments) {
    if (s.journey) {
      totalMin += duration(s.journey);
      totalWalkMin += s.journey.walkMin ?? 0;
      const rides = boardings(s.journey);
      transitLegs += rides;
      // TTC routed it but found no bus/metro — still a walked hop, so it counts
      // toward the "shown as walks" notice.
      if (rides === 0) gapCount += 1;
    } else {
      totalMin += s.fallbackWalkMin ?? 0;
      totalWalkMin += s.fallbackWalkMin ?? 0;
      gapCount += 1;
    }
  }

  return {
    day: day.day,
    color: day.color,
    segments,
    totalMin,
    totalWalkMin,
    transitLegs,
    gapCount,
  };
}

/** Chain every consecutive stop pair of a day into one TTC-routed line. */
export async function planDayRoute(day: DayInput, locale: string): Promise<DayTransitRoute> {
  const pairs = day.stops.slice(0, -1).map((from, i) => ({ from, to: day.stops[i + 1], i }));
  const segments = await Promise.all(
    pairs.map(({ from, to, i }) => segment(i, from, to, locale)),
  );
  return summarize(day, segments);
}

/** All days of an itinerary, routed in parallel. */
export async function planItineraryRoutes(
  days: DayInput[],
  locale: string,
): Promise<DayTransitRoute[]> {
  return Promise.all(days.map((d) => planDayRoute(d, locale)));
}
