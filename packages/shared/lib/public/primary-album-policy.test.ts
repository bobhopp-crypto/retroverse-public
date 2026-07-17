import assert from "node:assert/strict";
import test from "node:test";

import { resolvePrimaryAlbum, type PrimaryAlbumCandidate } from "./primary-album-policy";

function album(overrides: Partial<PrimaryAlbumCandidate>): PrimaryAlbumCandidate {
  return {
    albumId: 1,
    artistId: 10,
    title: "Studio Album",
    releaseYear: 1979,
    rval: "RVAL000001",
    coverUrl: null,
    relationshipType: "appears_on",
    relationshipConfidence: 92,
    canonicalSource: "musicbrainz",
    membershipConfidence: 92,
    reviewFlag: "ok",
    position: 1,
    ...overrides,
  };
}

test("historical album order ignores presentation classifications", () => {
  const result = resolvePrimaryAlbum({
    canonicalArtistId: 10,
    canonicalYear: 1979,
    candidates: [
      album({ albumId: 2, title: "The Collection", releaseYear: 1990 }),
      album({ albumId: 3, title: "Greatest Hits", releaseYear: 1995 }),
      album({ albumId: 4, title: "Live in Concert", releaseYear: 1985 }),
      album({ albumId: 1, title: "Original Studio Album", releaseYear: 1979 }),
    ],
  });

  assert.equal(result.primaryAlbum?.albumId, 1);
  assert.deepEqual(result.secondaryAlbums.map((entry) => entry.albumId), [4, 2, 3]);
  assert.deepEqual(result.albumAppearances.map((entry) => entry.albumId), [1, 4, 2, 3]);
});

test("earliest release wins when only compilations are linked", () => {
  const result = resolvePrimaryAlbum({
    canonicalArtistId: 10,
    canonicalYear: 1979,
    candidates: [
      album({ albumId: 2, title: "The Collection", releaseYear: 1990 }),
      album({ albumId: 5, title: "Archive Deluxe", releaseYear: 1991 }),
    ],
  });

  assert.equal(result.primaryAlbum?.albumId, 2);
});

test("empty canonical relationships return an explicit low-confidence result", () => {
  const result = resolvePrimaryAlbum({
    canonicalArtistId: 10,
    canonicalYear: 1979,
    candidates: [],
  });

  assert.equal(result.primaryAlbum, null);
  assert.equal(result.confidence, "low");
  assert.match(result.reason, /No canonical album relationship/);
});

test("preserves cross-artist album relationships in chronology", () => {
  const result = resolvePrimaryAlbum({
    canonicalArtistId: 10,
    canonicalYear: 1979,
    candidates: [album({ artistId: 99, title: "Another Artist Album" })],
  });

  assert.equal(result.primaryAlbum?.albumId, 1);
  assert.equal(result.secondaryAlbums.length, 0);
});

test("historical and artwork albums are separate decisions", () => {
  const result = resolvePrimaryAlbum({
    canonicalArtistId: 10,
    canonicalYear: 1984,
    candidates: [album({ albumId: 8, releaseYear: 1984, coverUrl: null }), album({ albumId: 9, releaseYear: 1998, coverUrl: "/covers/9.jpg" })],
  });
  assert.equal(result.historicalAlbum?.albumId, 8);
  assert.equal(result.artworkAlbum?.albumId, 9);
  assert.equal(result.albumAppearances.length, 2);
});
