import type { JourneyPlan, JourneyLeg, LegMode } from "@/types/transit";

const SECONDS_PER_MIN = 60;

function toMode(raw: unknown): LegMode {
  const s = String(raw ?? "").toUpperCase();
  if (s === "WALK") return "walk";
  if (s === "BUS") return "bus";
  if (s === "SUBWAY" || s === "METRO") return "metro";
  return "unknown"; // GONDOLA and anything unrecognized
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function secToMin(v: unknown): number | undefined {
  const n = num(v);
  return n === undefined ? undefined : Math.round(n / SECONDS_PER_MIN);
}

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function normalizeLeg(raw: unknown): JourneyLeg | null {
  const r = asObj(raw);
  if (!r) return null;
  const from = asObj(r.from);
  const to = asObj(r.to);
  const route = asObj(r.route);
  return {
    mode: toMode(r.mode),
    line: route ? str(route.shortName) : undefined,
    fromStop: from ? str(from.name) : undefined,
    toStop: to ? str(to.name) : undefined,
    fromStopId: from ? str(from.stopId) : undefined,
    durationMin: secToMin(r.duration),
    distanceM: num(r.distance),
  };
}

export function normalizePlan(raw: unknown): JourneyPlan[] {
  const root = asObj(raw);
  if (!root || !Array.isArray(root.itineraries)) return [];

  const plans: JourneyPlan[] = [];
  root.itineraries.forEach((it, i) => {
    const itin = asObj(it);
    if (!itin || !Array.isArray(itin.legs)) return;
    const legs = itin.legs
      .map(normalizeLeg)
      .filter((l): l is JourneyLeg => l !== null);
    if (legs.length === 0) return;
    plans.push({
      id: `plan-${i}`,
      durationMin: secToMin(itin.duration),
      legs,
    });
  });
  return plans;
}
