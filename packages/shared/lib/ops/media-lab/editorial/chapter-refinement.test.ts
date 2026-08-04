import test from "node:test";
import assert from "node:assert/strict";

import { refineOversizedChapters } from "./chapter-refinement";

const segments = Array.from({ length: 13 }, (_, index) => ({
  start: index * 100,
  end: index * 100 + 80,
  text: `segment ${index}`,
}));

test("does not split chapters under ten minutes", () => {
  const result = refineOversizedChapters(
    [{ id: "ch-1", startSec: 0, endSec: 599, title: "Short" }],
    segments,
    { analysisRunId: "run-1" },
  );
  assert.equal(result.length, 0);
});

test("splits at transcript boundaries with stable provenance", () => {
  const result = refineOversizedChapters(
    [{ id: "ch-7", startSec: 0, endSec: 1300, title: "Long" }],
    segments,
    { analysisRunId: "run-1", sourceFingerprint: "fp" },
  );
  assert.deepEqual(result.map((row) => [row.startSec, row.endSec]), [
    [0, 600],
    [600, 1200],
    [1200, 1300],
  ]);
  assert.equal(result[0].parentChapterId, "ch-7");
  assert.equal(result[0].sourceFingerprint, "fp");
  assert.equal(result[0].reviewStatus, "unapproved");
});

test("merges a short tail instead of creating a sub-thirty-second child", () => {
  const result = refineOversizedChapters(
    [{ id: "ch-7", startSec: 0, endSec: 1220, title: "Long" }],
    segments,
    { analysisRunId: "run-1" },
  );
  assert.deepEqual(result.map((row) => [row.startSec, row.endSec]), [
    [0, 600],
    [600, 1220],
  ]);
  assert.ok(result.every((row) => row.durationSec >= 30));
});

test("reruns deterministically with a fixed generated timestamp", () => {
  const args = { analysisRunId: "run-1", generatedAt: "2026-01-01T00:00:00.000Z" };
  const chapters = [{ id: "ch-7", startSec: 0, endSec: 1300, title: "Long" }];
  assert.deepEqual(refineOversizedChapters(chapters, segments, args), refineOversizedChapters(chapters, segments, args));
});
