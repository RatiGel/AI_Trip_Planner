import { test } from "node:test";
import assert from "node:assert/strict";
import { pickBestPlan } from "./day-route";
import type { JourneyPlan, LatLng } from "@/types/transit";

const PTS: LatLng[] = [
  [41.7, 44.8],
  [41.71, 44.81],
];

/** Minimal plan with drawable geometry; `lines` become bus legs. */
function plan(
  id: string,
  durationMin: number,
  lines: string[],
  walkMin = 0,
): JourneyPlan {
  const legs = lines.length
    ? lines.map((line) => ({ mode: "bus" as const, line, points: PTS, durationMin }))
    : [{ mode: "walk" as const, points: PTS, durationMin }];
  return { id, durationMin, walkMin, legs };
}

test("returns null when no plan has drawable geometry", () => {
  const noGeo: JourneyPlan = { id: "a", durationMin: 10, legs: [{ mode: "walk" }] };
  assert.equal(pickBestPlan([noGeo], 2000), null);
  assert.equal(pickBestPlan([], 2000), null);
});

test("picks the fastest plan when durations differ beyond the tie window", () => {
  const best = pickBestPlan(
    [plan("slow", 40, ["1"]), plan("fast", 20, ["2"]), plan("mid", 30, ["3"])],
    2000,
  );
  assert.equal(best?.id, "fast");
});

test("within the tie window, prefers fewer boardings", () => {
  // 42m with 2 transfers vs 45m with 1 — inside the 5-minute tie window.
  const best = pickBestPlan(
    [plan("two-rides", 42, ["1", "2"]), plan("one-ride", 45, ["3"])],
    2000,
  );
  assert.equal(best?.id, "one-ride");
});

test("short hop: a faster walk-only plan is allowed to win", () => {
  // Below PREFER_TRANSIT_METERS there is no transit preference.
  const best = pickBestPlan([plan("walk", 10, []), plan("bus", 14, ["1"])], 600);
  assert.equal(best?.id, "walk");
});

test("long hop: a riding plan beats a somewhat faster walk-only plan", () => {
  // Over 1km, riding is preferred even though walking is 4 minutes quicker.
  const best = pickBestPlan([plan("walk", 20, []), plan("bus", 24, ["1"])], 1500);
  assert.equal(best?.id, "bus");
});

test("long hop: walking still wins when every ride is far slower", () => {
  // 18m walk vs 40m ride — beyond TRANSIT_PREF_MINUTES, so don't force the bus.
  const best = pickBestPlan([plan("walk", 18, []), plan("bus", 40, ["1"])], 1500);
  assert.equal(best?.id, "walk");
});

test("long hop with only walk-only plans returns the walk plan", () => {
  const best = pickBestPlan([plan("walk", 13, [])], 1300);
  assert.equal(best?.id, "walk");
});

test("long hop prefers the quicker of two riding plans", () => {
  const best = pickBestPlan(
    [plan("walk", 15, []), plan("bus-slow", 35, ["1"]), plan("bus-fast", 22, ["2"])],
    2000,
  );
  assert.equal(best?.id, "bus-fast");
});

test("ties on duration and boardings fall back to less walking", () => {
  const best = pickBestPlan(
    [plan("more-walk", 30, ["1"], 18), plan("less-walk", 30, ["2"], 6)],
    2000,
  );
  assert.equal(best?.id, "less-walk");
});
