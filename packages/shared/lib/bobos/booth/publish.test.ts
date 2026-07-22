import assert from "node:assert/strict";
import test from "node:test";

import { createInitialBoothState } from "./initial-state";
import {
  boothAirPublishKey,
  buildBoothAirItem,
  shouldPublishBoothOwnership,
} from "./publish";
import { reduceBooth } from "./reduce";

function loadedReady() {
  return reduceBooth(createInitialBoothState(), {
    type: "APPLY_PROGRAM_LOAD",
    payload: {
      presentationId: "pres-1",
      showName: "Test Show",
      currentAsset: { id: "rvba-01", title: "Opening Card" },
      nextAsset: { id: "rvba-02", title: "Song Two" },
      upcoming: "Song Three",
    },
  });
}

test("GO LIVE then TAKE VDJ then RETURN each change publish key", () => {
  let state = loadedReady();
  const afterLoad = state;
  state = reduceBooth(state, { type: "GO_LIVE" });
  assert.equal(shouldPublishBoothOwnership(afterLoad, state), true);
  assert.equal(boothAirPublishKey(state), "air:Program:rvba-01");

  const afterLive = state;
  state = reduceBooth(state, { type: "ARM_SOURCE", source: "VirtualDJ" });
  state = reduceBooth(state, { type: "TAKE", source: "VirtualDJ" });
  assert.equal(shouldPublishBoothOwnership(afterLive, state), true);
  assert.equal(boothAirPublishKey(state), "air:VirtualDJ:VDJ-PLACEHOLDER");

  const afterVdj = state;
  state = reduceBooth(state, { type: "RETURN" });
  assert.equal(shouldPublishBoothOwnership(afterVdj, state), true);
  assert.equal(boothAirPublishKey(state), "air:Program:rvba-01");
});

test("blocked TAKE does not publish", () => {
  let state = loadedReady();
  state = reduceBooth(state, { type: "GO_LIVE" });
  const prev = state;
  const next = reduceBooth(state, { type: "TAKE", source: null });
  assert.equal(shouldPublishBoothOwnership(prev, next), false);
});

test("LOAD_SHOW alone does not publish", () => {
  const prev = createInitialBoothState();
  const next = reduceBooth(prev, { type: "LOAD_SHOW" });
  assert.equal(shouldPublishBoothOwnership(prev, next), false);
});

test("buildBoothAirItem uses live VDJ identity when present", () => {
  let state = loadedReady();
  state = reduceBooth(state, { type: "GO_LIVE" });
  state = reduceBooth(state, { type: "TAKE", source: "VirtualDJ" });
  const item = buildBoothAirItem(state, {
    artist: "Bee Gees",
    title: "To Love Somebody",
    rvtr: "RVTR604727",
    coverUrl: "/cover.jpg",
  });
  assert.ok(item);
  assert.equal(item?.id, "booth-air-virtualdj");
  assert.equal(item?.title, "To Love Somebody");
  assert.equal(item?.subtitle, "Bee Gees");
  assert.equal(item?.link?.id, "RVTR604727");
});

test("Announcement TAKE builds announcement item", () => {
  let state = loadedReady();
  state = reduceBooth(state, { type: "GO_LIVE" });
  state = reduceBooth(state, { type: "TAKE", source: "Announcement" });
  const item = buildBoothAirItem(state, null);
  assert.equal(item?.type, "announcement");
  assert.equal(item?.title, "Announcement Card");
});

test("Program never fabricates a Booth air item", () => {
  let state = loadedReady();
  state = reduceBooth(state, { type: "GO_LIVE" });
  assert.equal(buildBoothAirItem(state, null), null);
});
