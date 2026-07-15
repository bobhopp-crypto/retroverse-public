import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_BROADCAST_RVTR,
  resolveChannelExperience,
  resolveDefaultBroadcast,
} from "./resolve-channel-experience";
import { resolveTop10Songs1969Item } from "./resolve-scheduled-item";
import {
  TOP_10_SONGS_1969_EPOCH_MS,
  TOP_10_SONGS_1969_ITEM_MS,
  TOP_10_SONGS_1969_RVTRS,
} from "./programs/top-10-songs-1969";
import type { SundayNightsState } from "@/lib/sunday-nights/types";

function emptyState(overrides: Partial<SundayNightsState> = {}): SundayNightsState {
  return {
    version: 2,
    currentTrackId: null,
    live: null,
    updatedAt: "2026-07-15T12:00:00.000Z",
    bridgePlaying: false,
    bridgeStoppedAt: null,
    vdjTakeoverActive: false,
    vdjStoppedAt: null,
    ...overrides,
  };
}

const FRESH_BRIDGE_TS = "2026-07-15T12:00:00.000Z";
const NOW_MS = Date.parse("2026-07-15T12:00:30.000Z");
const STALE_NOW_MS = Date.parse("2026-07-15T12:02:00.000Z");

test("takeover wins over live signal and scheduled program", () => {
  const state = emptyState({
    vdjTakeoverActive: true,
    bridgePlaying: true,
    currentTrackId: "RVTR080577",
    live: {
      rvtr: "RVTR080577",
      artist: "The Beatles",
      title: "Come Together",
      year: 1969,
      source: "bridge",
      bridgeTimestamp: FRESH_BRIDGE_TS,
      resolution: "filepath",
    },
  });

  const resolved = resolveChannelExperience({ state, nowMs: NOW_MS });
  assert.equal(resolved.source, "takeover");
  assert.equal(resolved.experienceId, "RVTR080577");
  assert.equal(resolved.experienceType, "song");
  assert.equal(resolved.metadata.takeoverActive, true);
});

test("fresh live signal resolves to matched song experience", () => {
  const state = emptyState({
    bridgePlaying: true,
    currentTrackId: "RVTR318161",
    live: {
      rvtr: "RVTR318161",
      artist: "The 5th Dimension",
      title: "Aquarius Let The Sunshine In",
      year: 1969,
      source: "bridge",
      bridgeTimestamp: FRESH_BRIDGE_TS,
      resolution: "filepath",
    },
  });

  const resolved = resolveChannelExperience({ state, nowMs: NOW_MS });
  assert.equal(resolved.source, "live-signal");
  assert.equal(resolved.experienceId, "RVTR318161");
  assert.match(resolved.reason, /Fresh VirtualDJ/);
});

test("stale live signal falls through to scheduled program", () => {
  const state = emptyState({
    bridgePlaying: true,
    currentTrackId: "RVTR080577",
    live: {
      rvtr: "RVTR080577",
      artist: "The Beatles",
      title: "Come Together",
      year: 1969,
      source: "bridge",
      bridgeTimestamp: FRESH_BRIDGE_TS,
      resolution: "filepath",
    },
  });

  const resolved = resolveChannelExperience({ state, nowMs: STALE_NOW_MS });
  assert.equal(resolved.source, "scheduled");
  assert.equal(resolved.experienceType, "song");
  assert.equal(resolved.metadata.programId, "top-10-songs-1969");
});

test("scheduled program selects deterministic item from server time", () => {
  const slotMs = TOP_10_SONGS_1969_EPOCH_MS + 5 * TOP_10_SONGS_1969_ITEM_MS + 4_000;
  const slot = resolveTop10Songs1969Item(slotMs);
  assert.equal(slot.itemIndex, 5);
  assert.equal(slot.rvtr, TOP_10_SONGS_1969_RVTRS[5]);

  const resolved = resolveChannelExperience({
    state: emptyState(),
    nowMs: slotMs,
  });
  assert.equal(resolved.source, "scheduled");
  assert.equal(resolved.experienceId, slot.rvtr);
  assert.equal(resolved.selectedAt, new Date(slot.slotStartMs).toISOString());
  assert.equal(resolved.validUntil, new Date(slot.slotEndMs).toISOString());
  assert.equal(resolved.metadata.programItemIndex, 5);
});

test("scheduled program loops forever across list boundary", () => {
  const count = TOP_10_SONGS_1969_RVTRS.length;
  const slotMs = TOP_10_SONGS_1969_EPOCH_MS + count * TOP_10_SONGS_1969_ITEM_MS;
  const slot = resolveTop10Songs1969Item(slotMs);
  assert.equal(slot.itemIndex, 0);
  assert.equal(slot.rvtr, TOP_10_SONGS_1969_RVTRS[0]);
});

test("default broadcast resolves the public recommendation rvtr", () => {
  const resolved = resolveDefaultBroadcast(NOW_MS, DEFAULT_BROADCAST_RVTR);
  assert.equal(resolved.source, "default-broadcast");
  assert.equal(resolved.experienceId, DEFAULT_BROADCAST_RVTR);
  assert.equal(resolved.experienceType, "song");
});

test("off-air resolver uses scheduled program not default recommendation", () => {
  const resolved = resolveChannelExperience({ state: emptyState(), nowMs: NOW_MS });
  assert.equal(resolved.source, "scheduled");
  assert.notEqual(resolved.experienceId, DEFAULT_BROADCAST_RVTR);
});

test("takeover resumes automatically after stale bridge and channel zero returns to scheduled", () => {
  const live = resolveChannelExperience({
    state: emptyState({
      vdjTakeoverActive: true,
      bridgePlaying: true,
      currentTrackId: "RVTR737992",
      live: {
        rvtr: "RVTR737992",
        artist: "The Beatles",
        title: "Get Back",
        year: 1969,
        source: "bridge",
        bridgeTimestamp: FRESH_BRIDGE_TS,
        resolution: "filepath",
      },
    }),
    nowMs: NOW_MS,
  });
  assert.equal(live.source, "takeover");

  const scheduled = resolveChannelExperience({
    state: emptyState({
      vdjTakeoverActive: true,
      bridgePlaying: false,
      currentTrackId: "RVTR737992",
      live: {
        rvtr: "RVTR737992",
        artist: "The Beatles",
        title: "Get Back",
        year: 1969,
        source: "bridge",
        bridgeTimestamp: FRESH_BRIDGE_TS,
        resolution: "filepath",
      },
    }),
    nowMs: STALE_NOW_MS,
  });
  assert.equal(scheduled.source, "scheduled");
});
