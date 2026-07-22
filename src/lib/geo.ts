type Point = { lat: number; lng: number };

const R = 6_371_000; // Earth radius, meters
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two lat/lng points, in meters. */
export function haversine(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Split a meter distance into a display value + unit. Caller builds the i18n string. */
export function formatDistance(meters: number): { value: string; unit: "km" | "m" } {
  if (meters < 1000) return { value: String(Math.round(meters)), unit: "m" };
  return { value: (meters / 1000).toFixed(1), unit: "km" };
}
