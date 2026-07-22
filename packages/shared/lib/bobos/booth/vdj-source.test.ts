import assert from "node:assert/strict";
import test from "node:test";

import { emptyBoothVdjSourceView, mapBoothVdjSource } from "./vdj-source";

test("empty / unavailable clears asset", () => {
  const empty = emptyBoothVdjSourceView();
  assert.equal(empty.asset, null);
  assert.equal(empty.status, "No VirtualDJ Source");

  const down = mapBoothVdjSource({
    bridgeConnected: false,
    playing: false,
    live: {
      artist: "Fleetwood Mac",
      title: "Dreams",
      rvtr: "RVTR-1",
      coverUrl: null,
      bridgeTimestamp: "2026-07-21T00:00:00.000Z",
      source: "bridge",
    },
    album: "Rumours",
    packageStatus: "published",
    destinationKind: "EXPERIENCE",
  });
  assert.equal(down.pad, "unavailable");
  assert.equal(down.asset, null);
  assert.equal(down.status, "No VirtualDJ Source");
});

test("idle connected clears stale track", () => {
  const view = mapBoothVdjSource({
    bridgeConnected: true,
    playing: false,
    live: {
      artist: "Fleetwood Mac",
      title: "Dreams",
      rvtr: "RVTR-1",
      coverUrl: "/x.jpg",
      bridgeTimestamp: "2026-07-21T00:00:00.000Z",
      source: "bridge",
    },
    album: "Rumours",
    packageStatus: "published",
    destinationKind: "EXPERIENCE",
  });
  assert.equal(view.pad, "idle");
  assert.equal(view.asset, null);
  assert.equal(view.status, "No VirtualDJ Source");
});

test("sticky playing without fresh identity stays Connected — no stale card", () => {
  const view = mapBoothVdjSource({
    bridgeConnected: true,
    playing: true,
    live: null,
    album: null,
    packageStatus: null,
    destinationKind: null,
  });
  assert.equal(view.pad, "connected");
  assert.equal(view.playing, false);
  assert.equal(view.asset, null);
  assert.equal(view.status, "No VirtualDJ Source");
});

test("playing maps real VirtualDJ asset", () => {
  const view = mapBoothVdjSource({
    bridgeConnected: true,
    playing: true,
    live: {
      artist: "Fleetwood Mac",
      title: "Dreams",
      rvtr: "RVTR-1",
      coverUrl: "/cover.jpg",
      bridgeTimestamp: "2026-07-21T12:00:00.000Z",
      source: "bridge",
    },
    album: "Rumours",
    packageStatus: "published",
    destinationKind: "EXPERIENCE",
  });
  assert.equal(view.pad, "playing");
  assert.equal(view.playing, true);
  assert.ok(view.asset);
  assert.equal(view.asset?.artist, "Fleetwood Mac");
  assert.equal(view.asset?.title, "Dreams");
  assert.equal(view.asset?.album, "Rumours");
  assert.equal(view.asset?.rvtr, "RVTR-1");
  assert.equal(view.asset?.coverUrl, "/cover.jpg");
  assert.equal(view.asset?.packageStatus, "published");
  assert.equal(view.asset?.bridgeTimestamp, "2026-07-21T12:00:00.000Z");
});
