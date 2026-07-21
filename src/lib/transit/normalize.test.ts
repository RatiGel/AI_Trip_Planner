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
