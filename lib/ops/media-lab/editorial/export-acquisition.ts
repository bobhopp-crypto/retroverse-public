import { spawn } from "node:child_process";
import { copyFile, mkdir, writeFile } from "fs/promises";
import { existsSync } from "node:fs";
import { extname, join } from "path";

import {
  clipDestinationDirFromTitle,
  resolveAssetFolderFromTitle,
  sourceArchiveDir,
  assetsRootDir,
} from "./asset-routing";
import type { EditorialChapter } from "../chapters-csv";
import type { ClipReviewStatus, SourceReviewStatus } from "./review-status";
import { shouldArchiveSource } from "./review-status";
import {
  parseTypedTitle,
  type ClipTagSuggestion,
  type ContentType,
} from "./transcript-suggestions";

export type ExportedClip = {
  chapterId: string;
  title: string;
  path: string;
  startSec: number;
  endSec: number;
  assetType: ContentType | null;
  assetFolder: string;
  reviewStatus: ClipReviewStatus;
  suggestedType: ContentType | null;
  suggestedTitle: string | null;
  confidence: number | null;
};

export type AcquisitionExportResult = {
  assetsRootDir: string;
  sourceArchiveDir: string;
  clips: ExportedClip[];
  sourcePath: string | null;
  failed: { title: string; error: string }[];
};

export type ExportChapterInput = EditorialChapter & {
  reviewStatus?: ClipReviewStatus;
  tagSuggestion?: ClipTagSuggestion | null;
};

export type AcquisitionJobMeta = {
  year: number;
  jobSlug: string;
  sourceFilename: string;
  sourceShow: string;
};

function sanitizeFilename(title: string): string {
  const cleaned = title
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || "Untitled";
}

async function uniqueOutputPath(dir: string, baseName: string, ext: string): Promise<string> {
  await mkdir(dir, { recursive: true });
  let candidate = join(dir, `${baseName}${ext}`);
  if (!existsSync(candidate)) return candidate;
  for (let i = 2; i < 100; i++) {
    candidate = join(dir, `${baseName}_${i}${ext}`);
    if (!existsSync(candidate)) return candidate;
  }
  throw new Error(`Too many duplicate filenames for ${baseName}`);
}

async function extractClipCopy(
  videoPath: string,
  outPath: string,
  startSec: number,
  endSec: number,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const args = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      String(startSec),
      "-to",
      String(endSec),
      "-i",
      videoPath,
      "-c",
      "copy",
      "-avoid_negative_ts",
      "1",
      "-y",
      outPath,
    ];
    const proc = spawn("ffmpeg", args);
    let err = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      err += chunk.toString();
    });
    proc.on("error", (e) => {
      reject(new Error(`ffmpeg not available: ${e.message}`));
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim() || `ffmpeg exited ${code}`));
    });
  });
}

function sourceShowLabel(job: AcquisitionJobMeta): string {
  return job.sourceFilename.replace(/\.[^.]+$/, "") || job.jobSlug;
}

export async function exportAcquisitionMedia(
  outputDir: string,
  sourceVideoPath: string,
  job: AcquisitionJobMeta,
  exportChapters: ExportChapterInput[],
  sourceReviewStatus?: SourceReviewStatus,
): Promise<AcquisitionExportResult> {
  const archiveDir = sourceArchiveDir();
  const rootAssets = assetsRootDir();

  const clips: ExportedClip[] = [];
  const failed: { title: string; error: string }[] = [];
  const sourceExt = extname(job.sourceFilename) || extname(sourceVideoPath) || ".mp4";

  for (const ch of exportChapters) {
    const parsed = parseTypedTitle(ch.title);
    const assetFolder = resolveAssetFolderFromTitle(ch.title);
    const destDir = clipDestinationDirFromTitle(ch.title);
    const baseName = sanitizeFilename(ch.title);
    const outPath = await uniqueOutputPath(destDir, baseName, ".mp4");

    try {
      await extractClipCopy(sourceVideoPath, outPath, ch.startSec, ch.endSec);
      clips.push({
        chapterId: ch.id,
        title: ch.title,
        path: outPath,
        startSec: ch.startSec,
        endSec: ch.endSec,
        assetType: parsed.type,
        assetFolder,
        reviewStatus: ch.reviewStatus ?? "Keep",
        suggestedType: ch.tagSuggestion?.type ?? null,
        suggestedTitle: ch.tagSuggestion?.title ?? null,
        confidence: ch.tagSuggestion?.confidence ?? null,
      });
    } catch (e) {
      failed.push({
        title: ch.title,
        error: e instanceof Error ? e.message : "Clip export failed",
      });
    }
  }

  let sourcePath: string | null = null;
  if (shouldArchiveSource(sourceReviewStatus)) {
    await mkdir(archiveDir, { recursive: true });
    const archiveBase = sanitizeFilename(sourceShowLabel(job));
    sourcePath = await uniqueOutputPath(archiveDir, archiveBase, sourceExt);
    await copyFile(sourceVideoPath, sourcePath);
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    job: {
      year: job.year,
      jobSlug: job.jobSlug,
      sourceFilename: job.sourceFilename,
      sourceShow: sourceShowLabel(job),
    },
    assetsRootDir: rootAssets,
    sourceArchiveDir: archiveDir,
    sourcePath,
    sourceReviewStatus: sourceReviewStatus ?? null,
    clips,
    failed,
  };
  await writeFile(
    join(outputDir, "acquisition-export.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  if (clips.length === 0 && failed.length > 0) {
    throw new Error(failed[0]?.error ?? "All clip exports failed");
  }

  return {
    assetsRootDir: rootAssets,
    sourceArchiveDir: archiveDir,
    clips,
    sourcePath,
    failed,
  };
}
