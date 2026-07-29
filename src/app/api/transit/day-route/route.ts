import { NextRequest, NextResponse } from "next/server";
import { planItineraryRoutes, type DayInput, type DayStopInput } from "@/lib/transit/day-route";

export const runtime = "nodejs";

/** Cap so one request can't fan out into hundreds of TTC calls. */
const MAX_DAYS = 14;
const MAX_STOPS_PER_DAY = 12;

function parseStop(v: unknown): DayStopInput | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.lat !== "number" || typeof o.lng !== "number") return null;
  if (!Number.isFinite(o.lat) || !Number.isFinite(o.lng)) return null;
  return {
    name: typeof o.name === "string" ? o.name : "",
    lat: o.lat,
    lng: o.lng,
  };
}

function parseDay(v: unknown): DayInput | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.day !== "number" || !Array.isArray(o.stops)) return null;
  const stops = o.stops
    .map(parseStop)
    .filter((s): s is DayStopInput => s !== null)
    .slice(0, MAX_STOPS_PER_DAY);
  // A day needs at least two mappable stops to have a route between them.
  if (stops.length < 2) return null;
  return {
    day: o.day,
    color: typeof o.color === "string" ? o.color : "#0891B2",
    stops,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const rawDays = (body as Record<string, unknown>)?.days;
  const locale =
    typeof (body as Record<string, unknown>)?.locale === "string"
      ? ((body as Record<string, unknown>).locale as string)
      : "en";

  if (!Array.isArray(rawDays)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const days = rawDays
    .map(parseDay)
    .filter((d): d is DayInput => d !== null)
    .slice(0, MAX_DAYS);

  if (days.length === 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // planItineraryRoutes never throws — unroutable pairs come back as walk
  // fallbacks, so a partial result is still useful.
  const routes = await planItineraryRoutes(days, locale);
  return NextResponse.json({ routes });
}
