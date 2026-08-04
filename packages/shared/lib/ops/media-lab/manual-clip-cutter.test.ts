import test from "node:test";
import assert from "node:assert/strict";
import { clampSourceTime, detailWindowRange, manualClipId, temporaryClipTitle, thumbnailCacheKey, timelinePositionForTime, timelineSampleTimes, timeFromTimelinePosition, validClipRange } from "./manual-clip-cutter";

test("detail windows clamp at both source edges", () => {
  assert.deepEqual(detailWindowRange(2, 100, 10), { start: 0, end: 10 });
  assert.deepEqual(detailWindowRange(98, 100, 60), { start: 40, end: 100 });
});
test("clip ranges require finite contained start before end", () => {
  assert.equal(validClipRange(1, 2, 10), true);
  assert.equal(validClipRange(2, 1, 10), false);
  assert.equal(validClipRange(0, 11, 10), false);
  assert.equal(validClipRange(Number.NaN, 2, 10), false);
});
test("manual IDs and temporary titles are stable", () => {
  assert.equal(temporaryClipTitle(1), "Clip 001");
  assert.equal(manualClipId("fingerprint", 1, 2, 1), manualClipId("fingerprint", 1, 2, 1));
});
test("overview and detail geometry share one source-time scale", () => {
  const overview = { start: 0, end: 100 };
  const detail = { start: 20, end: 80 };
  assert.equal(timeFromTimelinePosition(.52, overview), 52);
  assert.equal(timelinePositionForTime(52, overview), .52);
  assert.equal(timelinePositionForTime(32, detail), .2);
  assert.equal(timelinePositionForTime(68, detail), .8);
  assert.equal(clampSourceTime(120, 100), 100);
});
test("detail range stays fixed during detail scrub and overview navigation rebuilds it", () => {
  const initial = detailWindowRange(50, 100, 30);
  assert.deepEqual(initial, { start: 35, end: 65 });
  assert.equal(timeFromTimelinePosition(.8, initial), 59);
  assert.deepEqual(initial, { start: 35, end: 65 });
  assert.deepEqual(detailWindowRange(90, 100, 30), { start: 70, end: 100 });
});
test("thumbnail samples are bounded, contained, and fingerprinted", () => {
  const samples = timelineSampleTimes({ start: 10, end: 70 }, 200);
  assert.equal(samples.length, 48);
  assert.equal(samples[0], 10);
  assert.equal(samples.at(-1), 70);
  assert.equal(thumbnailCacheKey("fp-a", "detail", 12.5), "fp-a:detail:12500");
  assert.notEqual(thumbnailCacheKey("fp-a", "detail", 12.5), thumbnailCacheKey("fp-b", "detail", 12.5));
});
