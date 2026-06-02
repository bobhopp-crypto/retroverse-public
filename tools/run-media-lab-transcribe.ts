#!/usr/bin/env npx tsx
/**
 * CLI: transcribe a local video into RETROVERSE_DATA/YEARS/{year}/production/metadata/
 *
 * Usage:
 *   npm run ops:media-lab -- --year 1967 --video /path/to/video.mp4
 */
import { copyFile, mkdir } from "fs/promises";
import { join } from "path";

import { loadJobPreview } from "../lib/ops/media-lab/read-job";
import {
  ensureJobOutputDir,
  slugFromVideoFilename,
} from "../lib/ops/media-lab/paths";
import { runMediaLabTranscribe } from "../lib/ops/media-lab/run-transcribe";

function parseArgs(argv: string[]) {
  let year = 1967;
  let video = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--year" && argv[i + 1]) year = Number(argv[++i]);
    if (argv[i] === "--video" && argv[i + 1]) video = argv[++i];
  }
  return { year, video };
}

async function main() {
  const { year, video } = parseArgs(process.argv.slice(2));
  if (!video) {
    console.error("Usage: npm run ops:media-lab -- --year 1967 --video /path/to/file.mp4");
    process.exit(1);
  }

  const name = video.split("/").pop() ?? "video.mp4";
  const jobSlug = slugFromVideoFilename(name);
  const outputDir = await ensureJobOutputDir(year, jobSlug);
  const dest = join(outputDir, `_source_${name}`);

  await mkdir(outputDir, { recursive: true });
  await copyFile(video, dest);

  const result = await runMediaLabTranscribe({
    videoPath: dest,
    outputDir,
    year,
    jobSlug,
    sourceFilename: name,
  });

  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }

  const preview = await loadJobPreview(outputDir);
  console.log(`OK → ${outputDir}`);
  console.log(
    `segments=${preview.job.segmentCount} chapters=${preview.job.chapterCount}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
