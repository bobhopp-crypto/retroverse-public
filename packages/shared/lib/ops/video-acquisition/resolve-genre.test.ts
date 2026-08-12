import assert from "node:assert/strict";
import test from "node:test";

import type { VdjLibraryEntry } from "@/lib/ops/intelligence/vdj-database";

import { pickVdjAudioGenreForRvtr } from "./resolve-genre";

function entry(overrides: Partial<VdjLibraryEntry>): VdjLibraryEntry {
  return {
    filePath: "/Users/bobhopp/DJ MEDIA/MUSIC/Artist - Title.mp3",
    filePathNorm: "/users/bobhopp/dj media/music/artist - title.mp3",
    artist: "Artist",
    title: "Title",
    album: "Album",
    year: 1969,
    genre: "Rock",
    remix: "",
    label: "RVTR000001",
    user1: "",
    user2: "",
    playCount: 1,
    rating: null,
    lastPlayed: null,
    firstSeen: null,
    isVideo: false,
    ...overrides,
  };
}

test("same-RVTR audio genre is used", () => {
  const result = pickVdjAudioGenreForRvtr(
    [entry({ label: "RVTR000123", genre: "Pop" })],
    "RVTR000123",
  );
  assert.equal(result.genre, "Pop");
  assert.equal(result.genreSource, "vdj_audio");
});

test("empty genre remains blank", () => {
  const result = pickVdjAudioGenreForRvtr(
    [entry({ label: "RVTR000123", genre: "   " })],
    "RVTR000123",
  );
  assert.equal(result.genre, null);
  assert.equal(result.genreSource, "none");
});

test("video entries are ignored for genre lookup", () => {
  const result = pickVdjAudioGenreForRvtr(
    [entry({ label: "RVTR000123", genre: "Rock", isVideo: true })],
    "RVTR000123",
  );
  assert.equal(result.genre, null);
  assert.equal(result.genreSource, "none");
});

test("genre is not inferred from unrelated entries", () => {
  const result = pickVdjAudioGenreForRvtr(
    [entry({ label: "RVTR000999", genre: "Jazz" })],
    "RVTR000123",
  );
  assert.equal(result.genre, null);
  assert.equal(result.genreSource, "none");
});
