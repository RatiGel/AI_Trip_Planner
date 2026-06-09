import type { Geo } from "@/types";

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(a: Geo, b: Geo): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h)));
}

const WALK_M_PER_MIN = 75;
const DRIVE_M_PER_MIN = 300;
export const WALK_MAX_METERS = 1800;

export function travelMinutes(meters: number): number {
  const speed = meters > WALK_MAX_METERS ? DRIVE_M_PER_MIN : WALK_M_PER_MIN;
  return Math.max(1, Math.round((meters * 1.3) / speed));
}

export function parseHHMM(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatHHMM(totalMin: number): string {
  const mins = ((Math.round(totalMin) % 1440) + 1440) % 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
