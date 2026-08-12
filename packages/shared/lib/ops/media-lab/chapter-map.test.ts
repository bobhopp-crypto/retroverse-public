import test from "node:test";
import assert from "node:assert/strict";
import { canPlaceMarker, deriveChapterRanges, normalizeMarkers } from "./chapter-map";

const now = "2026-01-01T00:00:00.000Z";
const markers = [
  { id: "b", timeSec: 60, provenance: "generated" as const, createdAt: now, updatedAt: now },
  { id: "a", timeSec: 20, provenance: "operator" as const, createdAt: now, updatedAt: now },
];

test("markers sort and derive complete chapter coverage", () => {
  const sorted = normalizeMarkers(markers, 100);
  assert.deepEqual(sorted.map((m) => m.timeSec), [20, 60]);
  assert.deepEqual(deriveChapterRanges({ version: 1, sourceFingerprint: "fp", sourceDurationSeconds: 100, markers: sorted, updatedAt: now }).map((r) => [r.startSec, r.endSec]), [[0,20],[20,60],[60,100]]);
});

test("nearby, boundary, and non-finite markers are rejected", () => {
  assert.equal(canPlaceMarker(10, markers, 100), true);
  assert.equal(canPlaceMarker(21, markers, 100), false);
  assert.equal(canPlaceMarker(0, markers, 100), false);
  assert.equal(canPlaceMarker(Number.NaN, markers, 100), false);
});
