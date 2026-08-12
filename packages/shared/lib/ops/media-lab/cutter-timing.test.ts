import test from "node:test";
import assert from "node:assert/strict";
import { formatDuration, formatPreciseTime, generateRulerTicks, isLongClip } from "./cutter-timing";

test("formats precise time without 60 second overflow", () => {
  assert.equal(formatPreciseTime(59.9996), "00:01:00.000");
  assert.equal(formatPreciseTime(3661.234), "01:01:01.234");
});
test("formats broad durations consistently", () => assert.equal(formatDuration(3661.6), "01:01:02"));
test("generates bounded deterministic ruler ticks", () => {
  const ticks = generateRulerTicks(540, 840, 800, 70, [60, 120, 300]);
  assert.equal(ticks[0].position, 0);
  assert.equal(ticks.at(-1)?.position, 1);
  assert.ok(ticks.every((tick) => tick.position >= 0 && tick.position <= 1));
});
test("uses the named long clip threshold", () => {
  assert.equal(isLongClip(480), true);
  assert.equal(isLongClip(479.999), false);
});
