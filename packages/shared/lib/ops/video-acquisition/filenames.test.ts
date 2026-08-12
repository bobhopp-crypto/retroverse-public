import assert from "node:assert/strict";
import test from "node:test";

import {
  productionVideoFilename,
  productionVideoFilenameWithSuffix,
} from "./filenames";

test("production filename uses Artist - Title.ext", () => {
  assert.equal(productionVideoFilename("Fleetwood Mac", "Dreams"), "Fleetwood Mac - Dreams.mp4");
});

test("filename collision suffixes increment", () => {
  assert.equal(productionVideoFilenameWithSuffix("Artist", "Title", "mp4", 0), "Artist - Title.mp4");
  assert.equal(productionVideoFilenameWithSuffix("Artist", "Title", "mp4", 1), "Artist - Title 1.mp4");
  assert.equal(productionVideoFilenameWithSuffix("Artist", "Title", "mp4", 2), "Artist - Title 2.mp4");
  assert.equal(productionVideoFilenameWithSuffix("Artist", "Title", "m4v", 3), "Artist - Title 3.m4v");
});
