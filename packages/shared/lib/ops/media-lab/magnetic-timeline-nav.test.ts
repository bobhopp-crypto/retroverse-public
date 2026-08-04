import test from "node:test";
import assert from "node:assert/strict";

import {
  magneticXToSourceSec,
  sourceSecToMagneticX,
  clipWidthPx,
  magneticTrackWidthPx,
} from "./magnetic-timeline-nav";

const chapters = [
  { id: "a", startSec: 0, endSec: 100, title: "A", durationSec: 100 },
  { id: "b", startSec: 100, endSec: 300, title: "B", durationSec: 200 },
];

test("source and timeline position conversions round trip", () => {
  const x = sourceSecToMagneticX(180, chapters, 4);
  assert.ok(Math.abs(magneticXToSourceSec(x, chapters, 4) - 180) < 0.01);
});

test("zoom is bounded by clip minimum width and track width", () => {
  assert.equal(clipWidthPx(chapters[0], 0.1), 48);
  assert.equal(magneticTrackWidthPx(chapters, 4), 1210);
});

test("timeline conversion clamps outside the source", () => {
  assert.equal(magneticXToSourceSec(-10, chapters, 4), 0);
  assert.equal(magneticXToSourceSec(99999, chapters, 4), 300);
});
