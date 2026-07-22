import assert from "node:assert/strict";
import test from "node:test";

import { newPresentationItem, type PresentationQueue } from "./types";
import { resolvePlayhead, stepIndex } from "./resolve-playhead";

function item(id: string, title: string, durationSeconds = 0) {
  return { ...newPresentationItem("slide"), id, title, durationSeconds, enabled: true };
}

function queue(items: ReturnType<typeof item>[], loop = false): PresentationQueue {
  return { items, loop };
}

const basePlayhead = {
  presentationId: "pres",
  anchorStartedAt: new Date().toISOString(),
  mode: "paused" as const,
  movedBy: "cockpit" as const,
  updatedAt: new Date().toISOString(),
};

test("missing anchor does not fall back to index 0", () => {
  const q = queue([item("a", "A"), item("b", "B")]);
  const resolved = resolvePlayhead(q, { ...basePlayhead, anchorItemId: null });
  assert.equal(resolved.available, false);
  assert.equal(resolved.item, null);
  assert.equal(resolved.index, -1);
  assert.equal(resolved.enabledCount, 2);
});

test("unknown anchor does not fall back to index 0", () => {
  const q = queue([item("a", "A"), item("b", "B")]);
  const resolved = resolvePlayhead(q, { ...basePlayhead, anchorItemId: "gone" });
  assert.equal(resolved.available, false);
  assert.equal(resolved.item, null);
  assert.equal(resolved.index, -1);
});

test("valid anchor resolves exactly", () => {
  const q = queue([item("a", "A"), item("b", "B")]);
  const resolved = resolvePlayhead(q, { ...basePlayhead, anchorItemId: "b" });
  assert.equal(resolved.available, true);
  assert.equal(resolved.item?.id, "b");
  assert.equal(resolved.index, 1);
});

test("stepIndex fails closed when current index unavailable", () => {
  assert.equal(stepIndex(3, -1, 1, true), null);
  assert.equal(stepIndex(3, 0, 1, false), 1);
  assert.equal(stepIndex(3, 2, 1, false), null);
  assert.equal(stepIndex(3, 0, -1, false), null);
});
