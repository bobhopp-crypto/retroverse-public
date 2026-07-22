/**
 * Program Authority — required Booth transport / publication tests.
 * Presentation playhead is SSoT; Booth Store only mirrors + owns air ownership.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { createInitialBoothState } from "./initial-state";
import {
  boothAirPublishKey,
  buildBoothAirItem,
  shouldPublishBoothOwnership,
} from "./publish";
import { buildBoothProgramView } from "./program-view";
import { reduceBooth } from "./reduce";
import type { BoothState } from "./types";
import { newPresentationItem, type PresentationQueue } from "@/lib/bobos/presentation/types";

function loadPayload(overrides?: Partial<{
  presentationId: string;
  showName: string;
  currentId: string;
  nextId: string;
}>) {
  const currentId = overrides?.currentId ?? "rvba-01";
  const nextId = overrides?.nextId ?? "rvba-02";
  return {
    presentationId: overrides?.presentationId ?? "pres-broadcast-mixer",
    showName: overrides?.showName ?? "Broadcast Mixer",
    currentAsset: { id: currentId, title: "Opening Card" },
    nextAsset: { id: nextId, title: "Song Two" },
    upcoming: "Song Three",
  };
}

function readyLoaded(): BoothState {
  return reduceBooth(createInitialBoothState(), {
    type: "APPLY_PROGRAM_LOAD",
    payload: loadPayload(),
  });
}

function programOnAir(): BoothState {
  return reduceBooth(readyLoaded(), { type: "GO_LIVE" });
}

test("1. LOAD SHOW does not publish", () => {
  const prev = createInitialBoothState();
  const loading = reduceBooth(prev, { type: "LOAD_SHOW" });
  assert.equal(shouldPublishBoothOwnership(prev, loading), false);

  const loaded = readyLoaded();
  assert.equal(loaded.primary, "READY");
  assert.equal(loaded.programLoaded, true);
  assert.equal(shouldPublishBoothOwnership(prev, loaded), false);
  assert.equal(boothAirPublishKey(loaded), "standby:READY");
});

test("2. GO LIVE publishes the first real RVBA once", () => {
  const ready = readyLoaded();
  const live = reduceBooth(ready, { type: "GO_LIVE" });
  assert.equal(shouldPublishBoothOwnership(ready, live), true);
  assert.equal(boothAirPublishKey(live), "air:Program:rvba-01");
  // Same ownership again — no duplicate publish signal.
  assert.equal(shouldPublishBoothOwnership(live, live), false);
});

test("2b. GO LIVE without Program loaded is blocked in Booth Store", () => {
  const state = reduceBooth(createInitialBoothState(), { type: "GO_LIVE" });
  assert.equal(state.primary, "READY");
  assert.equal(state.programLoaded, false);
  assert.equal(state.statusMessage, "No Program loaded");
});

test("3. NEXT publishes the next RVBA once while Program is On Air", () => {
  const live = programOnAir();
  const afterNext = reduceBooth(live, {
    type: "APPLY_PROGRAM_VIEW",
    payload: {
      presentationId: "pres-broadcast-mixer",
      showName: "Broadcast Mixer",
      currentAsset: { id: "rvba-02", title: "Song Two" },
      nextAsset: { id: "rvba-03", title: "Song Three" },
      upcoming: null,
      paused: false,
      currentAvailable: true,
    },
  });
  assert.equal(shouldPublishBoothOwnership(live, afterNext), true);
  assert.equal(boothAirPublishKey(afterNext), "air:Program:rvba-02");
  assert.equal(shouldPublishBoothOwnership(afterNext, afterNext), false);
});

test("4. PREVIOUS publishes the prior RVBA once", () => {
  let state = programOnAir();
  state = reduceBooth(state, {
    type: "APPLY_PROGRAM_VIEW",
    payload: {
      presentationId: "pres-broadcast-mixer",
      showName: "Broadcast Mixer",
      currentAsset: { id: "rvba-02", title: "Song Two" },
      nextAsset: { id: "rvba-03", title: "Song Three" },
      upcoming: null,
      paused: false,
      currentAvailable: true,
    },
  });
  const afterPrev = reduceBooth(state, {
    type: "APPLY_PROGRAM_VIEW",
    payload: {
      presentationId: "pres-broadcast-mixer",
      showName: "Broadcast Mixer",
      currentAsset: { id: "rvba-01", title: "Opening Card" },
      nextAsset: { id: "rvba-02", title: "Song Two" },
      upcoming: "Song Three",
      paused: false,
      currentAvailable: true,
    },
  });
  assert.equal(shouldPublishBoothOwnership(state, afterPrev), true);
  assert.equal(boothAirPublishKey(afterPrev), "air:Program:rvba-01");
});

test("5. TAKE freezes Program index and position (returnTarget)", () => {
  const live = programOnAir();
  const frozenId = live.currentAsset?.id;
  assert.ok(frozenId);
  const taken = reduceBooth(live, { type: "TAKE", source: "VirtualDJ" });
  assert.equal(taken.primary, "VIRTUALDJ");
  assert.equal(taken.override, true);
  assert.equal(taken.returnTarget?.id, frozenId);
  assert.equal(taken.paused, true);
});

test("6. NEXT does not publish while another Source owns The Air", () => {
  let state = programOnAir();
  state = reduceBooth(state, { type: "TAKE", source: "Announcement" });
  const interruptKey = boothAirPublishKey(state);
  const afterNext = reduceBooth(state, {
    type: "APPLY_PROGRAM_VIEW",
    payload: {
      presentationId: "pres-broadcast-mixer",
      showName: "Broadcast Mixer",
      currentAsset: { id: "rvba-02", title: "Song Two" },
      nextAsset: { id: "rvba-03", title: "Song Three" },
      upcoming: null,
      paused: true,
      returnTarget: { id: "rvba-02", title: "Song Two" },
      currentAvailable: true,
    },
  });
  // Interrupt still owns air — publish key unchanged.
  assert.equal(boothAirPublishKey(afterNext), interruptKey);
  assert.equal(shouldPublishBoothOwnership(state, afterNext), false);
  assert.equal(afterNext.returnTarget?.id, "rvba-02");
});

test("7. RETURN restores the frozen Program asset", () => {
  let state = programOnAir();
  const frozen = state.currentAsset;
  assert.ok(frozen);
  state = reduceBooth(state, { type: "TAKE", source: "VirtualDJ" });
  const returned = reduceBooth(state, { type: "RETURN" });
  assert.equal(returned.primary, "PROGRAM");
  assert.equal(returned.currentAsset?.id, frozen.id);
  assert.equal(returned.override, false);
  assert.equal(shouldPublishBoothOwnership(state, returned), true);
  assert.equal(boothAirPublishKey(returned), `air:Program:${frozen.id}`);
});

test("8. PAUSE retains the current public asset", () => {
  const live = programOnAir();
  const key = boothAirPublishKey(live);
  const paused = reduceBooth(live, {
    type: "APPLY_PROGRAM_VIEW",
    payload: {
      presentationId: "pres-broadcast-mixer",
      showName: "Broadcast Mixer",
      currentAsset: live.currentAsset,
      nextAsset: live.nextAsset,
      upcoming: live.upcoming,
      paused: true,
      currentAvailable: true,
    },
  });
  assert.equal(paused.paused, true);
  assert.equal(paused.currentAsset?.id, live.currentAsset?.id);
  assert.equal(boothAirPublishKey(paused), key);
  assert.equal(shouldPublishBoothOwnership(live, paused), false);
});

test("9. Missing RVBAs never produce fabricated assets", () => {
  const items = [
    { ...newPresentationItem("slide"), id: "gone", title: "", enabled: true },
    { ...newPresentationItem("slide"), id: "real", title: "Real", enabled: true },
  ];
  const q: PresentationQueue = { items, loop: false };
  const missing = buildBoothProgramView("pres", "Show", q, {
    presentationId: "pres",
    anchorItemId: "does-not-exist",
    anchorStartedAt: new Date().toISOString(),
    mode: "playing",
    movedBy: "cockpit",
    updatedAt: new Date().toISOString(),
  });
  assert.equal(missing.currentAvailable, false);
  assert.equal(missing.currentAsset, null);
  assert.equal(buildBoothAirItem({ ...programOnAir(), currentAsset: null }, null), null);

  // Program builder never invents a queue item.
  const programState = programOnAir();
  assert.equal(buildBoothAirItem(programState, null), null);
});

test("10. React polling / rerender does not duplicate publication", () => {
  const live = programOnAir();
  const key = boothAirPublishKey(live);
  // Health / confidence-only updates must not change air key.
  const afterHealth = reduceBooth(live, {
    type: "APPLY_PUBLISH_RESULT",
    localConfidence: "Confirmed",
    publicConfidence: "Confirmed",
    statusMessage: "Published air:Program:rvba-01",
    publishedKey: key,
  });
  assert.equal(boothAirPublishKey(afterHealth), key);
  assert.equal(shouldPublishBoothOwnership(live, afterHealth), false);
  assert.equal(afterHealth.lastPublishedKey, key);

  // Identical re-apply of the same Program view (poll/rerender) — no publish.
  const sameView = reduceBooth(afterHealth, {
    type: "APPLY_PROGRAM_VIEW",
    payload: {
      presentationId: "pres-broadcast-mixer",
      showName: "Broadcast Mixer",
      currentAsset: afterHealth.currentAsset,
      nextAsset: afterHealth.nextAsset,
      upcoming: afterHealth.upcoming,
      paused: false,
      currentAvailable: true,
    },
  });
  assert.equal(shouldPublishBoothOwnership(afterHealth, sameView), false);
});
