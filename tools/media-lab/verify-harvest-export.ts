/**
 * One-shot harvest export verification (local dev).
 * Usage: npx tsx tools/media-lab/verify-harvest-export.ts
 */
import { existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { exportHarvestQueue } from "@/lib/ops/media-lab/harvest/export-harvest";
import { readHarvestManifest } from "@/lib/ops/media-lab/harvest/manifest";

const repoRoot = process.cwd();
const verifyRoot = join(repoRoot, "reports/media-lab-workstation/harvest-verification/MEDIA_LAB_LIBRARY");
process.env.MEDIA_LAB_LIBRARY = verifyRoot;

const sourceVideo =
  "/Users/bobhopp/RETROVERSE_DATA/YEARS/1967/production/metadata/cbs-and-abc-commercials-1978-2026-06-04T19-27-00/_source_CBS_and_ABC_Commercials__1978_.mp4";

function probeMp4Tags(path: string): Record<string, string> {
  const result = spawnSync(
    "ffprobe",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-show_entries",
      "format_tags=artist,title,genre,album,grouping,date,year,comment",
      "-of",
      "json",
      path,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) return {};
  const parsed = JSON.parse(result.stdout) as { format?: { tags?: Record<string, string> } };
  return parsed.format?.tags ?? {};
}

async function main() {
  if (!existsSync(sourceVideo)) {
    console.error("Source video missing — skip live ffmpeg verification");
    process.exit(0);
  }

  const result = await exportHarvestQueue(
    sourceVideo,
    {
      sourceProgram: "CBS and ABC Commercials 1978",
      sourceFile: sourceVideo,
      jobSlug: "cbs-and-abc-commercials-1978-2026-06-04T19-27-00",
      year: 1967,
    },
    [
      {
        chapterId: "verify-clip-1",
        title: "Commercial - Verification Sample",
        category: "Commercial",
        inSeconds: 5,
        outSeconds: 10,
        artist: "Verification Sample",
        displayTitle: "Commercial - Verification Sample",
      },
    ],
    "replace_all",
  );

  const manifest = await readHarvestManifest();
  const clipPath = join(verifyRoot, "Commercial", "Verification Sample.mp4");
  const mp4Tags = existsSync(clipPath) ? probeMp4Tags(clipPath) : {};
  const vdj = manifest.clips[0]?.vdj ?? null;

  const metadataOk =
    vdj?.artist === "Verification Sample" &&
    vdj?.genre === "Commercial" &&
    vdj?.grouping === "CBS and ABC Commercials 1978" &&
    (mp4Tags.artist === "Verification Sample" || mp4Tags.ARTIST === "Verification Sample") &&
    (mp4Tags.genre === "Commercial" || mp4Tags.GENRE === "Commercial");

  console.log(
    JSON.stringify(
      {
        ok: existsSync(clipPath) && result.exported.length === 1 && metadataOk,
        libraryRoot: verifyRoot,
        clipPath,
        clipSizeBytes: existsSync(clipPath) ? statSync(clipPath).size : 0,
        manifestPath: join(verifyRoot, "_MANIFESTS", "manifest.json"),
        manifestClipCount: manifest.clips.length,
        manifestVdj: vdj,
        mp4Tags,
        reportPath: result.reportPath,
      },
      null,
      2,
    ),
  );

  if (!metadataOk) process.exit(1);
}

void main();
