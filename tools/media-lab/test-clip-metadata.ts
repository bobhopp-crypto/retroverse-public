/**
 * Unit checks for harvest metadata resolution (no ffmpeg).
 * Usage: npx tsx tools/media-lab/test-clip-metadata.ts
 */
import assert from "node:assert/strict";

import {
  harvestMetadataToFfmpegArgs,
  resolveHarvestClipMetadata,
} from "@/lib/ops/media-lab/harvest/clip-metadata";

function main() {
  const batman = resolveHarvestClipMetadata(
    { title: "Batman", category: "Commercial" },
    { sourceProgram: "1992 Billboard Music Awards", year: 1992 },
  );
  assert.equal(batman.artist, "Batman");
  assert.equal(batman.title, "Batman");
  assert.equal(batman.genre, "Commercial");
  assert.equal(batman.year, 1992);
  assert.equal(batman.grouping, "1992 Billboard Music Awards");

  const typed = resolveHarvestClipMetadata(
    {
      title: "Commercial - Taco Bell",
      category: "Commercial",
      artist: "Taco Bell",
      displayTitle: "Commercial - Taco Bell",
    },
    { sourceProgram: "CBS and ABC Commercials 1978", year: 1978 },
  );
  assert.equal(typed.artist, "Taco Bell");
  assert.equal(typed.genre, "Commercial");
  assert.equal(typed.grouping, "CBS and ABC Commercials 1978");

  const fallback = resolveHarvestClipMetadata(
    { title: "Segment", category: undefined },
    { sourceProgram: "Genesis Live 1973" },
  );
  assert.equal(fallback.artist, "Genesis Live 1973");
  assert.equal(fallback.genre, "Other");
  assert.equal(fallback.year, undefined);

  const args = harvestMetadataToFfmpegArgs(batman);
  assert.ok(args.includes("-metadata"));
  assert.ok(args.some((a) => a.startsWith("artist=")));
  assert.ok(args.some((a) => a.startsWith("album=")));

  console.log(JSON.stringify({ ok: true, samples: { batman, typed, fallback } }, null, 2));
}

main();
