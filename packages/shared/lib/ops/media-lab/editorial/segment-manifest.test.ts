import assert from "node:assert/strict";
import test from "node:test";

import { validateOutputPath, validateSegmentBounds } from "./segment-manifest";

test("accepts a valid performance segment", () => assert.deepEqual(validateSegmentBounds({ startSeconds: 10, endSeconds: 20 }, 100), []));
test("blocks NaN and invalid bounds", () => assert.ok(validateSegmentBounds({ startSeconds: Number.NaN, endSeconds: 4 }, 100).length > 0));
test("blocks end beyond source", () => assert.ok(validateSegmentBounds({ startSeconds: 10, endSeconds: 101 }, 100).includes("endSeconds exceeds source duration")));
test("blocks source overwrite and path escape", () => {
  assert.ok(validateOutputPath("/tmp/source.mp4", "/tmp/exports", "/tmp/source.mp4").includes("output path escapes approved export root"));
  assert.ok(validateOutputPath("/tmp/exports/source.mp4", "/tmp/exports", "/tmp/exports/source.mp4").includes("output path would overwrite source"));
});
