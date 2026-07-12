import assert from "node:assert/strict";
import test from "node:test";

import {
  LIVE_BRIDGE_FRESHNESS_MS,
  currentLiveSelection,
  isFreshBridgeLiveSelection,
} from "./live-freshness";
import type { SundayNightsState } from "./types";

const NOW = Date.parse("2026-07-12T18:00:00.000Z");

function bridgeState(ageMs: number): SundayNightsState {
  const timestamp = new Date(NOW - ageMs).toISOString();
  return {
    version: 2,
    currentTrackId: "RVTR123456",
    live: {
      rvtr: "RVTR123456",
      artist: "Artist",
      title: "Song",
      year: 1978,
      source: "bridge",
      bridgeTimestamp: timestamp,
    },
    updatedAt: timestamp,
    bridgePlaying: true,
    bridgeStoppedAt: null,
    vdjTakeoverActive: true,
    vdjStoppedAt: null,
  };
}

test("keeps a recent bridge song live", () => {
  const state = bridgeState(LIVE_BRIDGE_FRESHNESS_MS - 1);
  assert.equal(isFreshBridgeLiveSelection(state, NOW), true);
  assert.equal(currentLiveSelection(state, NOW)?.rvtr, "RVTR123456");
});

test("expires a stale bridge song", () => {
  const state = bridgeState(LIVE_BRIDGE_FRESHNESS_MS + 1);
  assert.equal(isFreshBridgeLiveSelection(state, NOW), false);
  assert.equal(currentLiveSelection(state, NOW), null);
});

test("requires the bridge to report playback", () => {
  const state = bridgeState(1_000);
  state.bridgePlaying = false;
  assert.equal(currentLiveSelection(state, NOW), null);
});

test("does not expire non-bridge selections", () => {
  const state = bridgeState(LIVE_BRIDGE_FRESHNESS_MS * 10);
  if (!state.live) throw new Error("fixture missing live selection");
  state.live.source = "channel";
  assert.equal(currentLiveSelection(state, NOW)?.source, "channel");
});
