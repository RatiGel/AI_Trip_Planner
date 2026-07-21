import type { LatLng, Arrival, JourneyPlan } from "@/types/transit";
import { normalizePlan } from "./normalize";

const BASE = "https://transit.ttc.com.ge/pis-gateway/api/v2";
// TTC's public API key — not a secret. It is shipped client-side by TTC and
// published in the open-source ttc-api npm package and the MCP_TTC_public_transport
// repo. Overridable via TTC_API_KEY env if TTC ever rotates it.
const API_KEY = process.env.TTC_API_KEY || "c0a2f304-551a-4d08-b8df-2c53ecd57f9f";
const TIMEOUT_MS = 5000;

function ttcLocale(locale: string): "ka" | "en" {
  return locale === "ka" ? "ka" : "en"; // ru falls back to en
}

async function ttcGet(path: string, params: Record<string, string>): Promise<unknown> {
  const url = `${BASE}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    headers: { "X-Api-Key": API_KEY },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`ttc_http_${res.status}`);
  return res.json();
}

export async function planJourney(
  from: LatLng,
  to: LatLng,
  locale: string
): Promise<JourneyPlan[] | null> {
  try {
    const raw = await ttcGet("/plan", {
      fromPlace: `${from[0]},${from[1]}`,
      toPlace: `${to[0]},${to[1]}`,
      departMode: "leaveNow",
      modes: "WALK,BUS",
      optimize: "quick",
      locale: ttcLocale(locale),
    });
    return normalizePlan(raw);
  } catch (e) {
    console.error("[transit] planJourney failed:", e);
    return null;
  }
}

function normalizeArrivals(raw: unknown): Arrival[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
    .map((a) => ({
      line: typeof a.shortName === "string" ? a.shortName : undefined,
      minutes:
        typeof a.realtimeArrivalMinutes === "number"
          ? a.realtimeArrivalMinutes
          : typeof a.scheduledArrivalMinutes === "number"
            ? a.scheduledArrivalMinutes
            : undefined,
      realtime: a.realtime === true,
      destination: typeof a.headsign === "string" ? a.headsign : undefined,
    }));
}

export async function getArrivals(
  stopId: string,
  locale: string
): Promise<Arrival[] | null> {
  try {
    const raw = await ttcGet(`/stops/1:${stopId}/arrival-times`, {
      locale: ttcLocale(locale),
      ignoreScheduledArrivalTimes: "false",
    });
    return normalizeArrivals(raw);
  } catch (e) {
    console.error("[transit] getArrivals failed:", e);
    return null;
  }
}
