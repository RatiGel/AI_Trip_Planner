import type { RouteDay, RoutePlan } from "@/types";

/** Google Maps caps the directions URL at ~10 points (origin + dest + 8-9 waypoints). */
const MAX_POINTS = 10;

function hasGeo(s: { place: { geo?: { lat: number; lng: number } } }): boolean {
  return (
    !!s.place.geo &&
    Number.isFinite(s.place.geo.lat) &&
    Number.isFinite(s.place.geo.lng)
  );
}

/**
 * Build a Google Maps directions URL for a single day's route.
 * Opens directly in the Google Maps app/site with the stops as a
 * multi-stop route — no file import needed.
 * Returns null if the day has fewer than 2 mappable stops.
 */
export function dayDirectionsUrl(
  day: RouteDay,
  mode: RoutePlan["mode"] = "walking",
): string | null {
  const stops = day.stops.filter(hasGeo).slice(0, MAX_POINTS);
  if (stops.length < 2) return null;

  const coord = (s: (typeof stops)[number]) =>
    `${s.place.geo.lat},${s.place.geo.lng}`;

  const origin = coord(stops[0]);
  const destination = coord(stops[stops.length - 1]);
  const waypoints = stops.slice(1, -1).map(coord).join("|");

  const travelmode = mode === "driving" ? "driving" : "walking";

  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode,
  });
  if (waypoints) params.set("waypoints", waypoints);

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * A single pin URL for one day with one stop (fallback when a route
 * can't be drawn). Returns null if no mappable stop exists.
 */
export function daySinglePinUrl(day: RouteDay): string | null {
  const stop = day.stops.find(hasGeo);
  if (!stop) return null;
  const params = new URLSearchParams({
    api: "1",
    query: `${stop.place.geo.lat},${stop.place.geo.lng}`,
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

/** Best available Google Maps link for a day (route, else single pin). */
export function dayMapUrl(
  day: RouteDay,
  mode: RoutePlan["mode"] = "walking",
): string | null {
  return dayDirectionsUrl(day, mode) ?? daySinglePinUrl(day);
}
