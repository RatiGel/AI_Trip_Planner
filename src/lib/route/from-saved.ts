import { haversineMeters, travelMinutes } from "@/lib/route/geo";
import { DAY_COLORS } from "@/lib/route/optimize";
import type {
  ItineraryDay,
  Place,
  RouteDay,
  RoutePlan,
  RouteStop,
  SavedItinerary,
} from "@/types";

/**
 * Saved itineraries only persist {placeId, time, notes} — no order, colour, or
 * travel data. This rebuilds just enough of a RouteDay from a saved day plus
 * the places it references, so /trips can reuse the Google Maps deep links and
 * the TTC day-route endpoint the planner already has.
 *
 * Stop order follows the saved item order (which is already chronological by
 * `time`); distances are recomputed from coordinates.
 */
export function savedDayToRouteDay(
  day: ItineraryDay,
  dayIndex: number,
  placesMap: Record<string, Place>,
): RouteDay {
  const places = day.items
    .map((item) => ({ item, place: placesMap[item.placeId] }))
    .filter((x): x is { item: typeof x.item; place: Place } => {
      const g = x.place?.geo;
      return !!g && Number.isFinite(g.lat) && Number.isFinite(g.lng);
    });

  let totalDistanceMeters = 0;
  let totalTravelMin = 0;

  const stops: RouteStop[] = places.map(({ item, place }, i) => {
    const prev = places[i - 1]?.place;
    const meters = prev ? haversineMeters(prev.geo, place.geo) : 0;
    const minutes = prev ? travelMinutes(meters) : 0;
    totalDistanceMeters += meters;
    totalTravelMin += minutes;
    return {
      order: i + 1,
      place,
      reason: item.notes ?? "",
      arrival: item.time,
      departure: item.time,
      visitDurationMin: place.averageVisitDurationMin ?? 60,
      travelFromPrevMin: minutes,
      travelFromPrevMeters: meters,
    };
  });

  return {
    day: dayIndex + 1,
    color: DAY_COLORS[dayIndex % DAY_COLORS.length],
    stops,
    stats: {
      totalDistanceMeters,
      totalTravelMin,
      totalVisitMin: stops.reduce((sum, s) => sum + s.visitDurationMin, 0),
      dayEndsAt: stops[stops.length - 1]?.arrival ?? "",
      stopCount: stops.length,
    },
  };
}

/**
 * A whole saved trip as a RoutePlan, so /trips can render it with the same
 * RouteMap the planner uses. Days whose places all failed to resolve are
 * dropped — an empty day has nothing to draw.
 */
export function savedTripToRoutePlan(
  trip: SavedItinerary,
  placesMap: Record<string, Place>,
): RoutePlan | null {
  const days = trip.days
    .map((day, i) => savedDayToRouteDay(day, i, placesMap))
    .filter((d) => d.stops.length > 0);

  if (days.length === 0) return null;

  return {
    title: trip.title,
    days,
    totals: {
      totalDistanceMeters: days.reduce((n, d) => n + d.stats.totalDistanceMeters, 0),
      totalTravelMin: days.reduce((n, d) => n + d.stats.totalTravelMin, 0),
      totalVisitMin: days.reduce((n, d) => n + d.stats.totalVisitMin, 0),
      dayEndsAt: days[days.length - 1].stats.dayEndsAt,
      stopCount: days.reduce((n, d) => n + d.stats.stopCount, 0),
    },
    // Saved trips carry no travel mode; distances here are straight-line, same
    // as a freshly generated plan.
    mode: "straight-line",
  };
}
