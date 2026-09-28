import assert from "node:assert/strict";
import test from "node:test";

import { artistInDepthHref, isDownwardArtistSwipe } from "./artist-in-depth-gesture";

test("artist href prefers a canonical artist route", () => {
  assert.equal(
    artistInDepthHref({ artistHref: "/artist/RVAR000123", rvtr: "RVTR111098" }),
    "/artist/RVAR000123",
  );
  assert.equal(artistInDepthHref({ artistHref: "/artist/42" }), "/artist/42");
});

test("name slugs fall through to the song resolver", () => {
  assert.equal(
    artistInDepthHref({ artistHref: "/artist/queen", rvtr: "rvtr970715" }),
    "/artist/from-song/RVTR970715",
  );
  assert.equal(artistInDepthHref({ artistHref: "/search?q=Queen", rvtr: "RVTR970715" }), "/artist/from-song/RVTR970715");
});

test("missing identity still lands on a minimal archive page", () => {
  assert.equal(artistInDepthHref({ artistHref: null, rvtr: "not-a-track" }), "/artist/from-song/unlinked");
  assert.equal(artistInDepthHref({ artistName: "VirtualDJ" }), "/artist/from-song/unlinked");
  assert.equal(
    artistInDepthHref({ artistName: "Fleetwood Mac" }),
    "/artist/from-song/unlinked?name=Fleetwood%20Mac",
  );
});

test("starter names and credit lines do not mint a slug route", () => {
  assert.equal(
    artistInDepthHref({ artistName: "Madonna", rvtr: "RVTR528167" }),
    "/artist/from-song/RVTR528167",
  );
  assert.equal(
    artistInDepthHref({ artistName: "Madonna feat. Justin Timberlake", rvtr: "RVTR528167" }),
    "/artist/from-song/RVTR528167",
  );
  assert.equal(
    artistInDepthHref({ artistName: "Madonna feat. Justin Timberlake" }),
    "/artist/from-song/unlinked?name=Madonna%20feat.%20Justin%20Timberlake",
  );
  assert.equal(
    artistInDepthHref({ artistName: "Michael Jackson" }),
    "/artist/from-song/unlinked?name=Michael%20Jackson",
  );
  assert.equal(
    artistInDepthHref({ artistName: "Jackson 5" }),
    "/artist/from-song/unlinked?name=Jackson%205",
  );
  assert.equal(
    artistInDepthHref({ artistHref: "/artist/RVAR000123", artistName: "Madonna feat. Justin Timberlake" }),
    "/artist/RVAR000123",
  );
});

test("downward swipe is distinct from a tap and a horizontal swipe", () => {
  assert.equal(isDownwardArtistSwipe({ dx: 2, dy: 6, elapsedMs: 80 }), false);
  assert.equal(isDownwardArtistSwipe({ dx: 140, dy: 20, elapsedMs: 180 }), false);
  assert.equal(isDownwardArtistSwipe({ dx: 10, dy: 120, elapsedMs: 220 }), true);
  assert.equal(isDownwardArtistSwipe({ dx: -12, dy: 110, elapsedMs: 300 }), true);
});

test("pull-down on a scrolled song page does not leave the song", () => {
  assert.equal(
    isDownwardArtistSwipe({ dx: 0, dy: 140, elapsedMs: 200, scrollTop: 240, requireScrollTop: true }),
    false,
  );
  assert.equal(
    isDownwardArtistSwipe({ dx: 0, dy: 140, elapsedMs: 200, scrollTop: 0, requireScrollTop: true }),
    true,
  );
});

test("slow drags are not swipes", () => {
  assert.equal(isDownwardArtistSwipe({ dx: 0, dy: 200, elapsedMs: 900 }), false);
});
