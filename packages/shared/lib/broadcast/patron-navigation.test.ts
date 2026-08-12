import assert from "node:assert/strict";
import test from "node:test";

import type { PresentationItem, PresentationQueue } from "@/lib/bobos/presentation/types";

import {
  movePatronIndex,
  patronBrowsingExpired,
  patronPresentationKey,
  PATRON_BROWSING_INACTIVITY_MS,
  resolvePatronSelection,
} from "./patron-navigation";

function item(id: string, enabled = true): PresentationItem {
  return {
    id,
    type: "slide",
    title: id,
    subtitle: "",
    body: "",
    enabled,
    durationSeconds: 5,
    transition: "fade",
    trigger: "automatic",
    link: null,
    countdownTarget: null,
    notes: "",
    mediaUrl: `/api/retroverse-live/broadcast-media/test/thumbs/${id}.jpg`,
    mediaWidth: 1600,
    mediaHeight: 900,
  };
}

function queue(loop = false): PresentationQueue {
  return { items: [item("one"), item("disabled", false), item("two"), item("three")], loop };
}

const snapshot = {
  itemIndex: 1,
  presentation: { id: "live-aid", title: "Live Aid" },
  publishedAt: "2026-07-19T12:00:00.000Z",
  queue: queue(),
  updatedAt: "2026-07-19T12:00:05.000Z",
};

test("Previous and Next start from the presenter index and then use the patron index", () => {
  assert.equal(movePatronIndex(snapshot.queue, 1, null, "previous"), 0);
  assert.equal(movePatronIndex(snapshot.queue, 1, null, "next"), 2);
  assert.equal(movePatronIndex(snapshot.queue, 1, 0, "next"), 1);
});

test("disabled presentation items are skipped", () => {
  const selected = resolvePatronSelection(snapshot, 1);
  assert.equal(selected?.item?.id, "two");
  assert.equal(selected?.rvba?.id, "two");
  assert.equal(selected?.broadcast.mode, "manual");
  assert.equal(selected?.mode, "paused");
});

test("navigation respects bounded and looping queues", () => {
  assert.equal(movePatronIndex(queue(false), 0, 0, "previous"), 0);
  assert.equal(movePatronIndex(queue(false), 2, 2, "next"), 2);
  assert.equal(movePatronIndex(queue(true), 0, 0, "previous"), 2);
  assert.equal(movePatronIndex(queue(true), 2, 2, "next"), 0);
});

test("presentation identity includes publication time so republishing resets the session", () => {
  assert.equal(patronPresentationKey(snapshot), "live-aid:2026-07-19T12:00:00.000Z");
  assert.notEqual(
    patronPresentationKey(snapshot),
    patronPresentationKey({ ...snapshot, publishedAt: "2026-07-19T12:10:00.000Z" }),
  );
});

test("ten minutes of browsing inactivity expires locally", () => {
  const startedAt = 1_000;
  assert.equal(patronBrowsingExpired(startedAt, startedAt + PATRON_BROWSING_INACTIVITY_MS - 1), false);
  assert.equal(patronBrowsingExpired(startedAt, startedAt + PATRON_BROWSING_INACTIVITY_MS), true);
});

test("patron selection does not mutate the published queue", () => {
  const before = structuredClone(snapshot.queue);
  resolvePatronSelection(snapshot, 2);
  assert.deepEqual(snapshot.queue, before);
});
