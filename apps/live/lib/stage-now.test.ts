import assert from "node:assert/strict";
import test from "node:test";

import { artistInDepthHref } from "../../../packages/shared/lib/artist/artist-in-depth-gesture";
import { stageNowFromPublicPayload, type PublicCurrentPayload } from "./stage-now";

function livePayload(extra: Partial<PublicCurrentPayload> = {}): PublicCurrentPayload {
  const now = new Date().toISOString();
  return {
    updatedAt: now,
    live: {
      source: "bridge",
      title: "Take A Bow",
      artist: "Madonna",
      bridgeTimestamp: now,
      rvtr: "RVTR702175",
    },
    ...extra,
  };
}

test("stage swipe keeps the public song's canonical artist href", () => {
  const stage = stageNowFromPublicPayload(livePayload({
    publicSong: {
      rvtr: "RVTR702175",
      links: { artistHref: "/artist/RVAR001411" },
    },
  }));
  assert.ok(stage);
  assert.equal(stage.songRvtr, "RVTR702175");
  assert.equal(stage.artistHref, "/artist/RVAR001411");
  assert.equal(
    artistInDepthHref({ artistHref: stage.artistHref, rvtr: stage.songRvtr, artistName: stage.artist }),
    "/artist/RVAR001411",
  );
});

test("stage does not invent an artist href when the song has none", () => {
  const stage = stageNowFromPublicPayload(livePayload({
    track: { rvtr: "RVTR702175", artistHref: "/artist/madonna" },
  }));
  assert.ok(stage);
  assert.equal(stage.artistHref, null);
  assert.equal(
    artistInDepthHref({ artistHref: stage.artistHref, rvtr: stage.songRvtr, artistName: stage.artist }),
    "/artist/from-song/RVTR702175",
  );
});
