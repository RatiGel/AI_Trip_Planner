import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePlan } from "./normalize";
import sample from "./__fixtures__/plan-sample.json";

test("normalizes the BusPlan fixture into JourneyPlan[]", () => {
  const plans = normalizePlan(sample);
  assert.equal(plans.length, 1, "one itinerary → one plan");
  const first = plans[0];
  assert.equal(first.id, "plan-0");
  assert.equal(first.durationMin, 34, "2040s → 34min");
  assert.equal(first.legs.length, 3, "walk/bus/walk");
  assert.deepEqual(first.legs.map((l) => l.mode), ["walk", "bus", "walk"]);
});

test("maps the BUS leg's route, stops, and stopId", () => {
  const busLeg = normalizePlan(sample)[0].legs[1];
  assert.equal(busLeg.mode, "bus");
  assert.equal(busLeg.line, "37", "route.shortName → line");
  assert.equal(busLeg.fromStop, "Rustaveli Metro");
  assert.equal(busLeg.toStop, "Station Square");
  assert.equal(busLeg.fromStopId, "1946", "from.stopId → fromStopId");
  assert.equal(busLeg.durationMin, 24, "1440s → 24min");
  assert.equal(busLeg.distanceM, 3200);
  assert.equal(busLeg.color, "0033B4", "route.color → color");
});

test("maps itinerary and leg clock times + walk total", () => {
  const plan = normalizePlan(sample)[0];
  assert.equal(plan.startTime, "2026-07-21T09:00:00.000Z");
  assert.equal(plan.endTime, "2026-07-21T09:34:00.000Z");
  assert.equal(plan.walkMin, 9, "540s → 9min");
  assert.equal(plan.legs[1].startTime, "2026-07-21T09:05:00.000Z");
  assert.equal(plan.legs[1].endTime, "2026-07-21T09:29:00.000Z");
});

test("builds leg points from → intermediate stops → to", () => {
  const busLeg = normalizePlan(sample)[0].legs[1];
  assert.deepEqual(busLeg.points, [
    [41.7005, 44.8009], // from
    [41.71, 44.8],      // intermediate: Kostava St
    [41.7285, 44.8011], // to
  ]);
  // walk leg with no intermediates → just from/to
  assert.deepEqual(normalizePlan(sample)[0].legs[0].points, [
    [41.6977, 44.8015],
    [41.7005, 44.8009],
  ]);
});

test("maps SUBWAY mode to 'metro'", () => {
  const raw = { itineraries: [{ duration: 60, legs: [{ mode: "SUBWAY", duration: 60 }] }] };
  assert.equal(normalizePlan(raw)[0].legs[0].mode, "metro");
});

test("returns [] for null / non-object input without throwing", () => {
  assert.deepEqual(normalizePlan(null), []);
  assert.deepEqual(normalizePlan(undefined), []);
  assert.deepEqual(normalizePlan(42), []);
  assert.deepEqual(normalizePlan("nope"), []);
});

test("returns [] when itineraries is missing or not an array", () => {
  assert.deepEqual(normalizePlan({}), []);
  assert.deepEqual(normalizePlan({ itineraries: "no" }), []);
});

test("maps unknown leg modes to 'unknown' instead of throwing", () => {
  const raw = { itineraries: [{ duration: 10, legs: [{ mode: "TELEPORT", duration: 10 }] }] };
  const out = normalizePlan(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].legs[0].mode, "unknown");
});

test("skips malformed legs but keeps the itinerary", () => {
  const raw = { itineraries: [{ duration: 10, legs: [null, { mode: "WALK", duration: 60 }, 5] }] };
  const out = normalizePlan(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].legs.length, 1);
  assert.equal(out[0].legs[0].mode, "walk");
});

test("drops itineraries whose legs are all malformed", () => {
  const raw = { itineraries: [{ duration: 10, legs: [null, 3] }] };
  assert.deepEqual(normalizePlan(raw), []);
});

test("assigns stable ids per itinerary index", () => {
  const raw = { itineraries: [
    { duration: 10, legs: [{ mode: "WALK", duration: 10 }] },
    { duration: 20, legs: [{ mode: "BUS", duration: 20 }] },
  ] };
  const out = normalizePlan(raw);
  assert.equal(out[0].id, "plan-0");
  assert.equal(out[1].id, "plan-1");
});
