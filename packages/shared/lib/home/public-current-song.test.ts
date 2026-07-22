import assert from "node:assert/strict";
import test from "node:test";

import type { PlayheadPayload } from "@/lib/bobos/presentation/types";
import type { SundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";

import { applyPublicHomepageManualOverride } from "./public-current-song";

function channelZeroPayload(
  source: "scheduled" | "live-signal" = "scheduled",
): SundayNightsCurrentPayload {
  return {
    currentTrackId: "RVTR080577",
    live: null,
    track: null,
    destination: { kind: "EXPERIENCE", href: "/retroverse-2/song/RVTR080577" },
    channel: null,
    channelZero: {
      experienceType: "song",
      experienceId: "RVTR080577",
      source,
      reason: source === "scheduled" ? "Scheduled rotation." : "Fresh VirtualDJ.",
      selectedAt: "2026-07-17T12:00:00.000Z",
      validUntil: "2026-07-17T12:01:00.000Z",
      metadata: { href: "/retroverse-2/song/RVTR080577" },
    },
    updatedAt: "2026-07-17T12:00:00.000Z",
    publicState: {
      version: 2,
      source: source === "live-signal" ? "virtualdj" : "channel-zero",
      servedAt: "2026-07-17T12:00:00.000Z",
    },
  };
}

function liveAidPlayhead(overrides: Partial<PlayheadPayload> = {}): PlayheadPayload {
  const item: NonNullable<PlayheadPayload["item"]> = {
    id: "live-aid-slide-1",
    type: "slide",
    title: "Live Aid",
    subtitle: "The Global Jukebox",
    body: "",
    enabled: true,
    durationSeconds: 20,
    transition: "fade",
    trigger: "automatic",
    link: null,
    countdownTarget: null,
    notes: "",
    mediaUrl: "/api/retroverse-live/broadcast-media/live-aid/slides/001.png",
    mediaWidth: 1600,
    mediaHeight: 900,
  };
  return {
    onAir: true,
    presentation: { id: "live-aid", title: "Live Aid" },
    item,
    itemIndex: 0,
    itemCount: 5,
    mode: "playing",
    elapsedSeconds: 0,
    nextItem: null,
    queue: { items: [item], loop: false },
    publishedAt: "2026-07-17T12:00:00.000Z",
    updatedAt: "2026-07-17T12:00:00.000Z",
    autoFollowVdj: true,
    manualTakeActive: true,
    vdj: {
      playing: false,
      rvtr: null,
      takeoverActive: false,
      resumeBroadcastAt: null,
    },
    broadcast: {
      id: "manual:live-aid-slide-1:2026-07-17T12:00:00.000Z",
      mode: "manual",
      rvbaId: "live-aid-slide-1",
      type: "image",
      sourceId: "live-aid",
      state: "playing",
      startedAt: "2026-07-17T12:00:00.000Z",
      duration: 20,
      updatedAt: "2026-07-17T12:00:00.000Z",
    },
    rvba: {
      id: "live-aid-slide-1",
      type: "image",
      title: "Live Aid",
      subtitle: "The Global Jukebox",
      body: "",
      transition: "fade",
      countdownTarget: null,
      link: null,
      mediaUrl: "/api/retroverse-live/broadcast-media/live-aid/slides/001.png",
      mediaWidth: 1600,
      mediaHeight: 900,
    },
    ...overrides,
  };
}

test("no manual take preserves the existing Channel Zero decision", () => {
  const channelZero = channelZeroPayload();
  const result = applyPublicHomepageManualOverride(
    channelZero,
    liveAidPlayhead({ manualTakeActive: false }),
  );

  assert.equal(result.manualOverride, null);
  assert.equal(result.currentTrackId, channelZero.currentTrackId);
  assert.equal(result.channelZero, channelZero.channelZero);
});

test("manual Live Aid take selects the existing manual RVBA", () => {
  const result = applyPublicHomepageManualOverride(channelZeroPayload(), liveAidPlayhead());

  assert.equal(result.manualOverride?.rvba.id, "live-aid-slide-1");
  assert.equal(result.manualOverride?.broadcast.mode, "manual");
  assert.equal(result.manualOverride?.presentation.id, "live-aid");
  assert.equal(result.manualOverride?.itemIndex, 0);
  assert.equal(result.manualOverride?.queue.items.length, 1);
  assert.equal(result.manualOverride?.publishedAt, "2026-07-17T12:00:00.000Z");
});

test("manual take wins while VirtualDJ is fresh", () => {
  const playhead = liveAidPlayhead({
    vdj: {
      playing: true,
      rvtr: "RVTR737992",
      takeoverActive: true,
      resumeBroadcastAt: null,
    },
  });
  const result = applyPublicHomepageManualOverride(
    channelZeroPayload("live-signal"),
    playhead,
  );

  assert.equal(result.publicState?.source, "virtualdj");
  assert.equal(result.manualOverride?.rvba.id, "live-aid-slide-1");
});

test("manual take wins over Channel Zero scheduled rotation", () => {
  const result = applyPublicHomepageManualOverride(channelZeroPayload("scheduled"), liveAidPlayhead());

  assert.equal(result.channelZero?.source, "scheduled");
  assert.equal(result.manualOverride?.rvba.id, "live-aid-slide-1");
});

test("Return to Auto restores Channel Zero", () => {
  const result = applyPublicHomepageManualOverride(
    channelZeroPayload(),
    liveAidPlayhead({ manualTakeActive: false, autoFollowVdj: true }),
  );

  assert.equal(result.manualOverride, null);
  assert.equal(result.currentTrackId, "RVTR080577");
});

test("invalid or missing manual RVBA safely falls back to Channel Zero", () => {
  const channelZero = channelZeroPayload();
  const invalidCases = [
    liveAidPlayhead({ onAir: false }),
    liveAidPlayhead({ presentation: null }),
    liveAidPlayhead({ item: null }),
    liveAidPlayhead({ itemIndex: -1 }),
    liveAidPlayhead({ queue: null }),
    liveAidPlayhead({ rvba: null }),
    liveAidPlayhead({ broadcast: { ...liveAidPlayhead().broadcast, state: "off-air" } }),
  ];

  for (const playhead of invalidCases) {
    const result = applyPublicHomepageManualOverride(channelZero, playhead);
    assert.equal(result.manualOverride, null);
    assert.equal(result.channelZero, channelZero.channelZero);
  }
});

test("homepage decision reads do not mutate manual or Channel Zero inputs", () => {
  const channelZero = channelZeroPayload();
  const playhead = liveAidPlayhead();
  const beforeChannelZero = structuredClone(channelZero);
  const beforePlayhead = structuredClone(playhead);

  applyPublicHomepageManualOverride(channelZero, playhead);

  assert.deepEqual(channelZero, beforeChannelZero);
  assert.deepEqual(playhead, beforePlayhead);
  assert.equal(playhead.manualTakeActive, true);
});
