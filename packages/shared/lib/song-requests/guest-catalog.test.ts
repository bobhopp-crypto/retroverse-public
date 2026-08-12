import assert from "node:assert/strict";
import test from "node:test";

import { guestCatalogDisplayName } from "./guest-catalog";

test("the current VIDEO folder gets a guest-safe display name", () => {
  assert.equal(
    guestCatalogDisplayName("VIDEO/1960's", "folder"),
    "1960s Video Collection",
  );
});

test("only the selected source leaf is exposed in guest display names", () => {
  assert.equal(
    guestCatalogDisplayName("PLAYLISTS/Sunday Pub", "playlist"),
    "Sunday Pub Playlist",
  );
});
