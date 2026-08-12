import assert from "node:assert/strict";
import test from "node:test";

import {
  fallbackTrackText,
  normalizeSourceMatch,
  parseFavoriteFolderPath,
  parseM3uPaths,
  parseVirtualFolderPaths,
} from "./vdj-source-parser";

test("favorite folders preserve the exact decoded local path", () => {
  assert.equal(
    parseFavoriteFolderPath('<FavoriteFolder path="/Users/test/DJ MEDIA/VIDEO" />'),
    "/Users/test/DJ MEDIA/VIDEO",
  );
});

test("VirtualDJ My List membership is path based", () => {
  assert.deepEqual(
    parseVirtualFolderPaths('<VirtualFolder><song path="/Media/1960&apos;s/A &amp; B.mp4" /></VirtualFolder>'),
    ["/Media/1960's/A & B.mp4"],
  );
});

test("M3U parsing accepts only exact absolute media paths", () => {
  assert.deepEqual(
    parseM3uPaths("#EXTM3U\n#EXTINF:1,Song\n/Media/Song.mp4\nArtist - unsafe text\n"),
    ["/Media/Song.mp4"],
  );
});

test("the installed 1960 apostrophe spelling matches the requested label", () => {
  assert.equal(normalizeSourceMatch("1960's"), normalizeSourceMatch("1960s"));
});

test("filename fallback does not change the exact track path", () => {
  assert.deepEqual(fallbackTrackText("/Media/The Turtles - Happy Together.mp4"), {
    artist: "The Turtles",
    title: "Happy Together",
  });
});
