import assert from "node:assert/strict";
import test from "node:test";

import { newPresentationItem, type PresentationQueue } from "@/lib/bobos/presentation/types";

import {
  buildBoothProgramView,
  findExactEnabledItem,
  firstValidProgramItem,
  isValidProgramItem,
} from "./program-view";

function item(id: string, title: string, enabled = true) {
  return { ...newPresentationItem("slide"), id, title, enabled };
}

function queue(items: ReturnType<typeof item>[], loop = true): PresentationQueue {
  return { items, loop };
}

test("isValidProgramItem rejects empty title / disabled", () => {
  assert.equal(isValidProgramItem(item("a", "Ok")), true);
  assert.equal(isValidProgramItem(item("a", "", true)), false);
  assert.equal(isValidProgramItem(item("a", "Ok", false)), false);
});

test("firstValidProgramItem skips invalid then returns real RVBA", () => {
  const q = queue([item("bad", "", true), item("good", "Real Asset"), item("next", "Next")]);
  const first = firstValidProgramItem(q);
  assert.equal(first?.id, "good");
});

test("buildBoothProgramView never fabricates when anchor missing", () => {
  const q = queue([item("a", "A"), item("b", "B")]);
  const view = buildBoothProgramView("pres", "Show", q, {
    presentationId: "pres",
    anchorItemId: "gone-rvba",
    anchorStartedAt: new Date().toISOString(),
    mode: "paused",
    movedBy: "cockpit",
    updatedAt: new Date().toISOString(),
  });
  assert.equal(view.currentAvailable, false);
  assert.equal(view.currentAsset, null);
  assert.equal(view.index, -1);
});

test("buildBoothProgramView mirrors Current / Next / Upcoming from ordered queue", () => {
  const q = queue([item("a", "A"), item("b", "B"), item("c", "C")], false);
  const view = buildBoothProgramView("pres", "Show", q, {
    presentationId: "pres",
    anchorItemId: "a",
    anchorStartedAt: new Date().toISOString(),
    mode: "playing",
    movedBy: "cockpit",
    updatedAt: new Date().toISOString(),
  });
  assert.equal(view.currentAvailable, true);
  assert.equal(view.currentAsset?.id, "a");
  assert.equal(view.nextAsset?.id, "b");
  assert.equal(view.upcoming, "C");
  assert.equal(view.index, 0);
});

test("findExactEnabledItem never falls back to first result", () => {
  const q = queue([item("a", "A"), item("b", "B")]);
  assert.equal(findExactEnabledItem(q, "missing"), null);
  assert.equal(findExactEnabledItem(q, "b")?.id, "b");
});
