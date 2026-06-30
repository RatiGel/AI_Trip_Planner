import { visitDurationMin, popularityScore } from "@/lib/places/visit-duration";
import {
  haversineMeters,
  travelMinutes,
  parseHHMM,
  formatHHMM,
  planMode,
  sunsetHHMM,
} from "@/lib/route/geo";
import { TBILISI_CENTER } from "@/lib/route/geocode";
import type {
  AIItinerary,
  Geo,
  Place,
  RouteDay,
  RouteItem,
  RoutePlan,
  RouteStats,
  RouteStop,
  TransportMode,
} from "@/types";

const DAY_COLORS = [
  "#B5271D",
  "#1D6FB5",
  "#2E9E5B",
  "#B58A1D",
  "#7A1DB5",
  "#1DB5A8",
];

const DEFAULT_DAY_START = "09:00";

// Meal windows: a break is inserted when the schedule crosses the trigger time.
const LUNCH_TRIGGER = parseHHMM("12:30");
const LUNCH_DURATION = 60;
const DINNER_TRIGGER = parseHHMM("19:00");
const DINNER_DURATION = 90;

// A viewpoint counts as "sunset timed" when it's reached within this window
// before (or just after) sunset.
const SUNSET_WINDOW_MIN = 90;

const VIEWPOINT_TAGS = ["viewpoint", "view", "panorama", "sunset", "overlook", "scenic"];

function isViewpoint(place: Place): boolean {
  const hay = [...(place.tags ?? []), ...place.categories]
    .join(" ")
    .toLowerCase();
  return VIEWPOINT_TAGS.some((t) => hay.includes(t));
}

/** Nearest-neighbour ordering, anchored at `start` when provided. */
function orderStops(places: Place[], start?: Geo): Place[] {
  if (places.length <= 1) return places;

  const remaining = [...places];
  let ordered: Place[];

  if (start) {
    // Begin from the place closest to the start point.
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = haversineMeters(start, p.geo);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    ordered = [remaining.splice(bestIdx, 1)[0]];
  } else {
    remaining.sort((a, b) => popularityScore(b) - popularityScore(a));
    ordered = [remaining.shift()!];
  }

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

function weekdayForDay(day: number, startWeekday: number): number {
  return (startWeekday + day - 1) % 7;
}

function isClosedAt(place: Place, weekday: number, arrivalMin: number): boolean {
  const hours = place.openingHours?.find((h) => h.day === weekday);
  if (!hours) return false;
  if (hours.closed) return true;
  const open = parseHHMM(hours.open);
  const close = parseHHMM(hours.close);
  return arrivalMin < open || arrivalMin > close;
}

interface BuildDayOpts {
  dayStart: string;
  startWeekday: number;
  mode?: TransportMode;
  start?: Geo;
  sunsetMin?: number | null;
}

/**
 * Reorder so that, when a sunset time is known, a single viewpoint is moved to
 * the end of the day — the natural slot to catch golden hour. Only the LAST
 * viewpoint is moved (keeps the geo-optimised order otherwise).
 */
function preferSunsetLast(ordered: Place[], sunsetMin?: number | null): Place[] {
  if (!sunsetMin) return ordered;
  const vpIdx = ordered.map((p, i) => (isViewpoint(p) ? i : -1)).filter((i) => i >= 0);
  if (!vpIdx.length) return ordered;
  const last = vpIdx[vpIdx.length - 1];
  if (last === ordered.length - 1) return ordered; // already last
  const copy = [...ordered];
  const [vp] = copy.splice(last, 1);
  copy.push(vp);
  return copy;
}

function mealBreak(
  type: "lunch" | "dinner",
  start: number,
  durationMin: number,
): Extract<RouteItem, { kind: "break" }> {
  return {
    kind: "break",
    type,
    arrival: formatHHMM(start),
    departure: formatHHMM(start + durationMin),
    durationMin,
  };
}

function buildDay(dayNum: number, places: Place[], opts: BuildDayOpts): RouteDay {
  const { dayStart, startWeekday, mode, start, sunsetMin } = opts;
  let ordered = orderStops(places, dayNum === 1 ? start : undefined);
  ordered = preferSunsetLast(ordered, sunsetMin);

  const weekday = weekdayForDay(dayNum, startWeekday);
  let cursor = parseHHMM(dayStart);

  let totalDistance = 0;
  let totalTravel = 0;
  let totalVisit = 0;

  const items: RouteItem[] = [];
  const stops: RouteStop[] = [];
  let lunchInserted = false;
  let dinnerInserted = false;
  let prevGeo: Geo | undefined = dayNum === 1 ? start : undefined;

  ordered.forEach((place, i) => {
    // Insert meal breaks before this stop if the clock has crossed a trigger.
    if (!lunchInserted && cursor >= LUNCH_TRIGGER && cursor < DINNER_TRIGGER) {
      items.push(mealBreak("lunch", cursor, LUNCH_DURATION));
      cursor += LUNCH_DURATION;
      lunchInserted = true;
    }

    const meters = prevGeo ? haversineMeters(prevGeo, place.geo) : 0;
    const travel = prevGeo ? travelMinutes(meters, mode) : 0;

    cursor += travel;
    const arrival = cursor;
    const visit = visitDurationMin(place);
    const departure = arrival + visit;
    cursor = departure;

    totalDistance += meters;
    totalTravel += travel;
    totalVisit += visit;

    const sunsetTimed =
      !!sunsetMin &&
      isViewpoint(place) &&
      arrival >= sunsetMin - SUNSET_WINDOW_MIN &&
      arrival <= sunsetMin + 15;

    const stop: RouteStop = {
      order: i + 1,
      place,
      reason: "",
      arrival: formatHHMM(arrival),
      departure: formatHHMM(departure),
      visitDurationMin: visit,
      travelFromPrevMin: travel,
      travelFromPrevMeters: meters,
      closedWarning: isClosedAt(place, weekday, arrival),
      sunsetTimed,
    };
    stops.push(stop);
    items.push({ kind: "stop", ...stop });

    prevGeo = place.geo;

    // Dinner after the last stop, or once we cross into the evening.
    const isLast = i === ordered.length - 1;
    if (!dinnerInserted && (cursor >= DINNER_TRIGGER || isLast)) {
      if (cursor >= DINNER_TRIGGER - 60) {
        items.push(mealBreak("dinner", cursor, DINNER_DURATION));
        cursor += DINNER_DURATION;
        dinnerInserted = true;
      }
    }
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
    items,
    stats,
  };
}

export interface BuildRouteOpts {
  dayStart?: string;
  mode?: TransportMode;
  start?: Geo;
  /** ISO date of day 1, for sunset timing. */
  dateISO?: string;
}

export function buildRoutePlan(
  ai: AIItinerary,
  placesById: Map<string, Place>,
  opts: BuildRouteOpts = {},
): RoutePlan {
  const dayStart = opts.dayStart || DEFAULT_DAY_START;
  const start = opts.start;

  // Sunset for the trip's first date (good enough across a few days).
  const sunsetRef = start ?? TBILISI_CENTER;
  const sunset = opts.dateISO
    ? sunsetHHMM(opts.dateISO, sunsetRef.lat, sunsetRef.lng)
    : null;
  const sunsetMin = sunset ? parseHHMM(sunset) : null;

  // Weekday of day 1 (for opening-hours checks). 0 = Sunday.
  let startWeekday = 1; // default Monday when unknown
  if (opts.dateISO) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(opts.dateISO);
    if (m) {
      startWeekday = new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
      ).getDay();
    }
  }

  const days: RouteDay[] = ai.days.map((aiDay) => {
    const places = aiDay.stops
      .map((s) => placesById.get(s.place_id))
      .filter((p): p is Place => Boolean(p));

    const day = buildDay(aiDay.day, places, {
      dayStart,
      startWeekday,
      mode: opts.mode,
      start,
      sunsetMin,
    });
    if (sunset) day.sunset = sunset;

    const reasonByPlace = new Map(aiDay.stops.map((s) => [s.place_id, s.reason]));
    day.stops.forEach((stop) => {
      stop.reason = reasonByPlace.get(stop.place.id) ?? "";
    });
    // Mirror reasons onto the interleaved items.
    day.items.forEach((it) => {
      if (it.kind === "stop") it.reason = reasonByPlace.get(it.place.id) ?? "";
    });

    return day;
  });

  const totals: RouteStats = days.reduce<RouteStats>(
    (acc, d) => ({
      totalDistanceMeters: acc.totalDistanceMeters + d.stats.totalDistanceMeters,
      totalTravelMin: acc.totalTravelMin + d.stats.totalTravelMin,
      totalVisitMin: acc.totalVisitMin + d.stats.totalVisitMin,
      dayEndsAt: d.stats.dayEndsAt,
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
    mode: planMode(opts.mode),
  };
}
