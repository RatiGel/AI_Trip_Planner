import { visitDurationMin, popularityScore } from "@/lib/places/visit-duration";
import {
  haversineMeters,
  travelMinutes,
  parseHHMM,
  formatHHMM,
} from "@/lib/route/geo";
import type {
  AIItinerary,
  Place,
  RouteDay,
  RoutePlan,
  RouteStats,
  RouteStop,
} from "@/types";

// Distinct, high-contrast colours per day (cycles if > 6 days).
const DAY_COLORS = [
  "#B5271D", // brand red
  "#1D6FB5",
  "#2E9E5B",
  "#B58A1D",
  "#7A1DB5",
  "#1DB5A8",
];

const DEFAULT_DAY_START = "09:00";

/**
 * Order a day's stops with nearest-neighbour starting from the most popular
 * place (a sensible anchor). Minimizes back-tracking without the cost of an
 * exact TSP solve — fine for 3-6 stops.
 */
function orderStops(places: Place[]): Place[] {
  if (places.length <= 2) return places;

  const remaining = [...places];
  // Anchor on the most popular place.
  remaining.sort((a, b) => popularityScore(b) - popularityScore(a));
  const ordered: Place[] = [remaining.shift()!];

  while (remaining.length) {
    const last = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = haversineMeters(last.geo, p.geo);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  return ordered;
}

/** Weekday (0=Sun..6=Sat) assigned to a 1-based trip day. Deterministic:
 *  day 1 → Monday. Used only for opening-hours warnings (no real calendar). */
function weekdayForDay(day: number): number {
  return day % 7; // 1→1(Mon) ... 6→6(Sat) ... 7→0(Sun)
}

function isClosedAt(place: Place, weekday: number, arrivalMin: number): boolean {
  const hours = place.openingHours?.find((h) => h.day === weekday);
  if (!hours) return false; // unknown → don't warn
  if (hours.closed) return true;
  const open = parseHHMM(hours.open);
  const close = parseHHMM(hours.close);
  return arrivalMin < open || arrivalMin > close;
}

function buildDay(
  dayNum: number,
  places: Place[],
  dayStart: string,
): RouteDay {
  const ordered = orderStops(places);
  const weekday = weekdayForDay(dayNum);
  let cursor = parseHHMM(dayStart);

  let totalDistance = 0;
  let totalTravel = 0;
  let totalVisit = 0;

  const stops: RouteStop[] = ordered.map((place, i) => {
    const prev = ordered[i - 1];
    const meters = prev ? haversineMeters(prev.geo, place.geo) : 0;
    const travel = prev ? travelMinutes(meters) : 0;

    cursor += travel;
    const arrival = cursor;
    const visit = visitDurationMin(place);
    const departure = arrival + visit;
    cursor = departure;

    totalDistance += meters;
    totalTravel += travel;
    totalVisit += visit;

    return {
      order: i + 1,
      place,
      reason: "", // filled by caller (it has the AI reasons)
      arrival: formatHHMM(arrival),
      departure: formatHHMM(departure),
      visitDurationMin: visit,
      travelFromPrevMin: travel,
      travelFromPrevMeters: meters,
      closedWarning: isClosedAt(place, weekday, arrival),
    };
  });

  const stats: RouteStats = {
    totalDistanceMeters: totalDistance,
    totalTravelMin: totalTravel,
    totalVisitMin: totalVisit,
    dayEndsAt: formatHHMM(cursor),
    stopCount: stops.length,
  };

  return {
    day: dayNum,
    color: DAY_COLORS[(dayNum - 1) % DAY_COLORS.length],
    stops,
    stats,
  };
}

/**
 * STEP 5-6: join AI place IDs to DB places, optimize visit order, and build
 * the schedule + statistics. `placesById` must contain every id the AI used.
 */
export function buildRoutePlan(
  ai: AIItinerary,
  placesById: Map<string, Place>,
  opts: { dayStart?: string } = {},
): RoutePlan {
  const dayStart = opts.dayStart || DEFAULT_DAY_START;

  const days: RouteDay[] = ai.days.map((aiDay) => {
    const places = aiDay.stops
      .map((s) => placesById.get(s.place_id))
      .filter((p): p is Place => Boolean(p));

    const day = buildDay(aiDay.day, places, dayStart);

    // Graft the AI's reason onto each stop (match by place id, in order).
    const reasonByPlace = new Map(
      aiDay.stops.map((s) => [s.place_id, s.reason]),
    );
    day.stops.forEach((stop) => {
      stop.reason = reasonByPlace.get(stop.place.id) ?? "";
    });

    return day;
  });

  const totals: RouteStats = days.reduce<RouteStats>(
    (acc, d) => ({
      totalDistanceMeters: acc.totalDistanceMeters + d.stats.totalDistanceMeters,
      totalTravelMin: acc.totalTravelMin + d.stats.totalTravelMin,
      totalVisitMin: acc.totalVisitMin + d.stats.totalVisitMin,
      dayEndsAt: d.stats.dayEndsAt, // last day's end
      stopCount: acc.stopCount + d.stats.stopCount,
    }),
    {
      totalDistanceMeters: 0,
      totalTravelMin: 0,
      totalVisitMin: 0,
      dayEndsAt: dayStart,
      stopCount: 0,
    },
  );

  return {
    title: ai.title,
    days,
    totals,
    // No Mapbox Directions token wired yet → estimates are straight-line.
    mode: "straight-line",
  };
}
