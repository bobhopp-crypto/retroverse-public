import assert from "node:assert/strict";
import test from "node:test";

import { createInitialBoothState } from "./initial-state";
import { reduceBooth } from "./reduce";
import type { BoothState } from "./types";

function readyWithShow(): BoothState {
  return reduceBooth(createInitialBoothState(), {
    type: "APPLY_PROGRAM_LOAD",
    payload: {
      presentationId: "pres-1",
      showName: "Test Show",
      currentAsset: { id: "item-1", title: "Asset One" },
      nextAsset: { id: "item-2", title: "Asset Two" },
      upcoming: "Asset Three",
    },
  });
}

function onProgram(): BoothState {
  return reduceBooth(readyWithShow(), { type: "GO_LIVE" });
}

test("starts READY without Program loaded", () => {
  const state = createInitialBoothState();
  assert.equal(state.primary, "READY");
  assert.equal(state.currentSource, null);
  assert.equal(state.programLoaded, false);
  assert.equal(state.showActive, false);
});

test("APPLY_PROGRAM_LOAD then GO_LIVE → PROGRAM", () => {
  const state = onProgram();
  assert.equal(state.primary, "PROGRAM");
  assert.equal(state.currentSource, "Program");
  assert.equal(state.showActive, true);
  assert.equal(state.override, false);
  assert.equal(state.hold, false);
  assert.equal(state.currentAsset?.id, "item-1");
});

test("GO_LIVE blocked without Program loaded", () => {
  const state = reduceBooth(createInitialBoothState(), { type: "GO_LIVE" });
  assert.equal(state.primary, "READY");
  assert.equal(state.statusMessage, "No Program loaded");
});

test("ARM_SOURCE then TAKE VirtualDJ sets OVERRIDE", () => {
  let state = onProgram();
  state = reduceBooth(state, { type: "ARM_SOURCE", source: "VirtualDJ" });
  assert.equal(state.armedSource, "VirtualDJ");
  state = reduceBooth(state, { type: "TAKE", source: state.armedSource! });
  assert.equal(state.primary, "VIRTUALDJ");
  assert.equal(state.currentSource, "VirtualDJ");
  assert.equal(state.override, true);
  assert.equal(state.returnTarget?.id, "item-1");
});

test("RETURN from VIRTUALDJ → PROGRAM clears OVERRIDE and HOLD", () => {
  let state = onProgram();
  state = reduceBooth(state, { type: "TAKE", source: "VirtualDJ" });
  state = reduceBooth(state, { type: "SET_HOLD" });
  assert.equal(state.hold, true);
  state = reduceBooth(state, { type: "RETURN" });
  assert.equal(state.primary, "PROGRAM");
  assert.equal(state.override, false);
  assert.equal(state.hold, false);
});

test("TAKE blocked from EMERGENCY until RETURN", () => {
  let state = onProgram();
  state = reduceBooth(state, { type: "EMERGENCY_STOP" });
  assert.equal(state.primary, "EMERGENCY");
  assert.equal(state.override, true);
  state = reduceBooth(state, { type: "TAKE", source: "VirtualDJ" });
  assert.equal(state.primary, "EMERGENCY");
  assert.match(state.statusMessage, /RETURN first/);
});

test("EMERGENCY STOP blocked from OFF", () => {
  const off: BoothState = { ...createInitialBoothState(), primary: "OFF" };
  const state = reduceBooth(off, { type: "EMERGENCY_STOP" });
  assert.equal(state.primary, "OFF");
  assert.match(state.statusMessage, /blocked/);
});

test("SET_AUTO / HOLD modifiers", () => {
  let state = onProgram();
  state = reduceBooth(state, { type: "SET_AUTO", armed: true });
  assert.equal(state.auto, true);
  state = reduceBooth(state, { type: "SET_HOLD" });
  assert.equal(state.hold, true);
  state = reduceBooth(state, { type: "CLEAR_HOLD" });
  assert.equal(state.hold, false);
  state = reduceBooth(state, { type: "SET_AUTO", armed: false });
  assert.equal(state.auto, false);
});

test("NEXT/PREVIOUS are server-driven (reducer no-ops position)", () => {
  let state = onProgram();
  const first = state.currentAsset?.id;
  state = reduceBooth(state, { type: "NEXT" });
  assert.equal(state.currentAsset?.id, first);
  state = reduceBooth(state, {
    type: "APPLY_PROGRAM_VIEW",
    payload: {
      presentationId: "pres-1",
      showName: "Test Show",
      currentAsset: { id: "item-2", title: "Asset Two" },
      nextAsset: null,
      upcoming: null,
      paused: false,
      currentAvailable: true,
    },
  });
  assert.equal(state.currentAsset?.id, "item-2");
});

test("END_SHOW → READY clears On Air", () => {
  let state = onProgram();
  state = reduceBooth(state, { type: "END_SHOW" });
  assert.equal(state.primary, "READY");
  assert.equal(state.currentSource, null);
  assert.equal(state.showActive, false);
  assert.equal(state.override, false);
});

test("Announcement and Giveaway TAKE paths", () => {
  let state = onProgram();
  state = reduceBooth(state, { type: "TAKE", source: "Announcement" });
  assert.equal(state.primary, "ANNOUNCEMENT");
  state = reduceBooth(state, { type: "RETURN" });
  state = reduceBooth(state, { type: "TAKE", source: "Giveaway" });
  assert.equal(state.primary, "GIVEAWAY");
});

test("LOAD_SHOW_FAILED keeps prior loaded mirrors", () => {
  const loaded = readyWithShow();
  const failed = reduceBooth(loaded, {
    type: "LOAD_SHOW_FAILED",
    error: "No published Program",
  });
  assert.equal(failed.programLoaded, true);
  assert.equal(failed.currentAsset?.id, "item-1");
  assert.match(failed.statusMessage, /No published Program/);
});
