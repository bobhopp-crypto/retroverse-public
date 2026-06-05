#!/usr/bin/env npx tsx
/**
 * Regenerate chapters.csv from segments.json (content-aware).
 *
 * Usage: npx tsx tools/media-lab/build-chapters-cli.ts --output-dir /path/to/job
 */
import { readFile } from "fs/promises";
import { join } from "path";

import { buildChaptersForMode, parseChapterMode } from "../../lib/ops/media-lab/chapter-mode";
import { writeChaptersCsv } from "../../lib/ops/media-lab/chapters-only";

function parseArgs(argv: string[]) {
  let outputDir = "";
  let mode: "content" | "commercial" = "content";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--output-dir" && argv[i + 1]) outputDir = argv[++i];
    if (argv[i] === "--mode" && argv[i + 1]) mode = parseChapterMode(argv[++i]);
  }
  return { outputDir, mode };
}

async function main() {
  const { outputDir, mode } = parseArgs(process.argv.slice(2));
  if (!outputDir) {
    console.error(
      "Usage: npx tsx tools/media-lab/build-chapters-cli.ts --output-dir PATH [--mode content|commercial]",
    );
    process.exit(1);
  }

  const segments = JSON.parse(
    await readFile(join(outputDir, "segments.json"), "utf8"),
  ) as { start: number; end: number; text: string }[];

  const chapters = buildChaptersForMode(segments, mode).map(({ start, end, title }) => ({
    start,
    end,
    title,
  }));

  await writeChaptersCsv(outputDir, chapters);
  console.log(JSON.stringify({ ok: true, chapterCount: chapters.length, chapterMode: mode }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
