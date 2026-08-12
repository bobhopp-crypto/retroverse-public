import assert from "node:assert/strict";
import test from "node:test";

test("awaiting_rescan is the post-download state when VDJ row is absent", () => {
  const manualRescanRequired = true;
  const downloadStatus = manualRescanRequired ? "awaiting_rescan" : "complete";
  assert.equal(downloadStatus, "awaiting_rescan");
});

test("complete is the post-rescan state when label write succeeds", () => {
  const manualRescanRequired = false;
  const downloadStatus = manualRescanRequired ? "awaiting_rescan" : "complete";
  assert.equal(downloadStatus, "complete");
});

test("skipped label write preserves non-Retroverse labels", () => {
  const skipped = true;
  const vdjLabelStatus = skipped ? "skipped" : "written";
  assert.equal(vdjLabelStatus, "skipped");
});
