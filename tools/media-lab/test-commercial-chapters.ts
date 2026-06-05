#!/usr/bin/env npx tsx
/**
 * Compare chapter counts: content vs commercial mode.
 *
 * Usage: npx tsx tools/media-lab/test-commercial-chapters.ts --output-dir PATH
 */
import { readFile } from "fs/promises";
import { join } from "path";

import { buildContentAwareChapters } from "../../lib/ops/media-lab/build-chapters-from-segments";
import { buildCommercialCompilationChapters } from "../../lib/ops/media-lab/build-commercial-chapters";
import type { TranscriptSegment } from "../../lib/ops/media-lab/build-chapters-from-segments";

function parseArgs(argv: string[]) {
  let outputDir = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--output-dir" && argv[i + 1]) outputDir = argv[++i];
  }
  return { outputDir };
}

function durationStats(chapters: { start: number; end: number }[]) {
  const durs = chapters.map((c) => c.end - c.start);
  const min = Math.min(...durs);
  const max = Math.max(...durs);
  const avg = durs.reduce((a, b) => a + b, 0) / durs.length;
  const under20 = durs.filter((d) => d < 20).length;
  const inTarget = durs.filter((d) => d >= 30 && d <= 90).length;
  return { min, max, avg, under20, inTarget, count: durs.length };
}

async function main() {
  const { outputDir } = parseArgs(process.argv.slice(2));
  if (!outputDir) {
    console.error("Usage: npx tsx tools/media-lab/test-commercial-chapters.ts --output-dir PATH");
    process.exit(1);
  }

  const segments = JSON.parse(
    await readFile(join(outputDir, "segments.json"), "utf8"),
  ) as TranscriptSegment[];

  const content = buildContentAwareChapters(segments);
  const commercial = buildCommercialCompilationChapters(segments);

  console.log(
    JSON.stringify(
      {
        segments: segments.length,
        videoMinutes: Math.round((segments[segments.length - 1]?.end ?? 0) / 60),
        content: durationStats(content),
        commercial: durationStats(commercial),
        commercialSample: commercial.slice(0, 8).map((c) => ({
          start: c.start.toFixed(1),
          dur: (c.end - c.start).toFixed(1),
          title: c.title,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
