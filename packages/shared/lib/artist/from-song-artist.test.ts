import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import {
  canonicalArtistHrefFromLinkage,
  fromSongFallbackCopy,
  resolveFromSongArtist,
  type SongArtistLinkage,
} from "./from-song-artist";

const shardPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../data/static-graph/tracks",
);

function trackRow(prefix: string, rvtr: string): SongArtistLinkage | null {
  const shard = JSON.parse(gunzipSync(readFileSync(join(shardPath, `${prefix}.json.gz`))).toString("utf8")) as Record<
    string,
    SongArtistLinkage
  >;
  return shard[rvtr] ?? null;
}

test("Take A Bow resolves to Madonna's canonical artist page", () => {
  const track = trackRow("70", "RVTR702175");
  assert.ok(track);
  const resolved = resolveFromSongArtist({ rvtr: "RVTR702175", track });
  assert.equal(resolved.canonicalHref, "/artist/RVAR001411");
  assert.equal(resolved.name, "Madonna");
  assert.equal(resolved.songHref, "/retroverse-2/song/RVTR702175");
});

test("unknown RVTR stays on the unlinked archive page", () => {
  assert.equal(trackRow("00", "RVTR000000"), null);
  const resolved = resolveFromSongArtist({ rvtr: "RVTR000000", track: null });
  assert.equal(resolved.canonicalHref, null);
  assert.equal(resolved.name, "This artist");
  assert.equal(resolved.songHref, null);
  const copy = fromSongFallbackCopy(resolved.name);
  assert.equal(copy.title, "Still connecting");
  assert.match(copy.body, /not linked yet/);
  assert.doesNotMatch(copy.body, /RVAR\d{6}|Madonna/);
});

test("a display name or name slug does not mint an RVAR", () => {
  assert.equal(
    canonicalArtistHrefFromLinkage({ artistName: "Madonna", artistHref: "/artist/madonna", artistSlug: "madonna" }),
    null,
  );
  const resolved = resolveFromSongArtist({
    rvtr: "RVTR702175",
    track: { artistName: "Madonna", artistHref: "/artist/madonna", artistSlug: "madonna" },
  });
  assert.equal(resolved.canonicalHref, null);
  const copy = fromSongFallbackCopy(resolved.name);
  assert.match(copy.body, /^Madonna is on this song/);
  assert.doesNotMatch(copy.body, /RVAR/);
});
