import type { Geo, TransportMode } from "@/types";

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
const TRANSIT_M_PER_MIN = 200;
export const WALK_MAX_METERS = 1800;

/** Per-mode speed (m/min) and a fixed boarding/wait buffer (min). */
const MODE_PROFILE: Record<
  TransportMode,
  { speed: number; buffer: number }
> = {
  walk: { speed: WALK_M_PER_MIN, buffer: 0 },
  car: { speed: DRIVE_M_PER_MIN, buffer: 1 },
  taxi: { speed: DRIVE_M_PER_MIN, buffer: 3 },
  public: { speed: TRANSIT_M_PER_MIN, buffer: 6 },
};

/**
 * Estimated travel time between two points (straight-line distance × 1.3
 * detour factor). Mode picks the speed and a boarding/wait buffer; when no
 * mode is given, short legs are walked and longer ones driven (legacy).
 */
export function travelMinutes(meters: number, mode?: TransportMode): number {
  if (mode) {
    const { speed, buffer } = MODE_PROFILE[mode];
    return Math.max(1, Math.round((meters * 1.3) / speed) + buffer);
  }
  const speed = meters > WALK_MAX_METERS ? DRIVE_M_PER_MIN : WALK_M_PER_MIN;
  return Math.max(1, Math.round((meters * 1.3) / speed));
}

/** Map a transport mode to the RoutePlan mode used for the map + GMaps link. */
export function planMode(
  mode?: TransportMode,
): "walking" | "driving" | "transit" | "straight-line" {
  switch (mode) {
    case "walk":
      return "walking";
    case "car":
    case "taxi":
      return "driving";
    case "public":
      return "transit";
    default:
      return "straight-line";
  }
}

/**
 * Sunset time (local "HH:MM") for a date + location, via the NOAA solar
 * equations. No API/key. `dateISO` is "YYYY-MM-DD"; `tzOffsetMin` is the
 * location's UTC offset in minutes (Tbilisi = +240, i.e. UTC+4).
 * Returns null if the date can't be parsed.
 */
export function sunsetHHMM(
  dateISO: string,
  lat: number,
  lng: number,
  tzOffsetMin = 240,
): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateISO);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);

  // Day of year.
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const doy = cum[month - 1] + day + (isLeap && month > 2 ? 1 : 0);

  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;

  // Fractional year (radians).
  const gamma = ((2 * Math.PI) / (isLeap ? 366 : 365)) * (doy - 1 + 0.5);

  // Equation of time (minutes) and solar declination (radians).
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  // Hour angle for sunset (zenith 90.833° accounts for refraction).
  const zenith = 90.833 * rad;
  const cosH =
    (Math.cos(zenith) - Math.sin(lat * rad) * Math.sin(decl)) /
    (Math.cos(lat * rad) * Math.cos(decl));
  if (cosH < -1 || cosH > 1) return null; // polar day/night — no sunset
  const ha = Math.acos(cosH) * deg; // degrees, positive for sunset

  // Solar noon (UTC minutes) for an east-positive longitude, then add the
  // sunset hour angle as time (4 min per degree). Finally shift to local.
  const solarNoonUTC = 720 - 4 * lng - eqTime;
  const sunsetUTCmin = solarNoonUTC + 4 * ha;
  const localMin = sunsetUTCmin + tzOffsetMin;
  return formatHHMM(localMin);
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
