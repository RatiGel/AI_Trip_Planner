import { test } from "node:test";
import assert from "node:assert/strict";
import { haversine, formatDistance } from "./geo";

test("haversine returns ~0 for identical points", () => {
  const p = { lat: 41.7151, lng: 44.8271 };
  assert.ok(haversine(p, p) < 0.001);
});

test("haversine matches a known Tbilisi distance", () => {
  // Freedom Square → Rustaveli Metro, ~1.5 km apart.
  const a = { lat: 41.6934, lng: 44.8015 };
  const b = { lat: 41.7064, lng: 44.7997 };
  const d = haversine(a, b);
  assert.ok(d > 1300 && d < 1700, `expected ~1450m, got ${d}`);
});

test("haversine is symmetric", () => {
  const a = { lat: 41.70, lng: 44.80 };
  const b = { lat: 41.72, lng: 44.79 };
  assert.ok(Math.abs(haversine(a, b) - haversine(b, a)) < 0.001);
});

test("formatDistance uses meters below 1000", () => {
  assert.deepEqual(formatDistance(450), { value: "450", unit: "m" });
  assert.deepEqual(formatDistance(999), { value: "999", unit: "m" });
});

test("formatDistance rounds meters to a whole number", () => {
  assert.deepEqual(formatDistance(450.7), { value: "451", unit: "m" });
});

test("formatDistance switches to km at 1000 with one decimal", () => {
  assert.deepEqual(formatDistance(1000), { value: "1.0", unit: "km" });
  assert.deepEqual(formatDistance(1234), { value: "1.2", unit: "km" });
  assert.deepEqual(formatDistance(15800), { value: "15.8", unit: "km" });
});
