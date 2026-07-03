import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { extractClipCopy } from "@/lib/ops/media-lab/editorial/ffmpeg-clip";

import {
  harvestMetadataToFfmpegArgs,
  resolveHarvestClipMetadata,
  type HarvestVdjMetadata,
} from "./clip-metadata";
import { subjectFromTitle } from "./filenames";
import {
  appendHarvestClips,
  newHarvestClipId,
  type HarvestClipEntry,
} from "./manifest";
import {
  categoryDirForLabel,
  categoryFolderForLabel,
  ensureHarvestLibraryLayout,
  harvestLibraryRoot,
  harvestReportsDir,
} from "./paths";

export type HarvestExportItem = {
  chapterId: string;
  title: string;
  category?: string;
  inSeconds: number;
  outSeconds: number;
  /** Primary entity hint (tag suggestion subject). */
  artist?: string | null;
  /** Accepted display title; defaults to title. */
  displayTitle?: string | null;
  /** Retroverse / User2-style tags — only written when provided. */
  rvTags?: string | null;
};

export type { HarvestVdjMetadata };

export type HarvestDuplicateAction = "skip" | "replace" | "replace_all";

export type HarvestConflict = {
  exportedPath: string;
  absolutePath: string;
  title: string;
  type: string;
};

export type HarvestExportContext = {
  sourceProgram: string;
  sourceFile: string;
  jobSlug?: string;
  year?: number;
};

export type HarvestExportResult = {
  libraryRoot: string;
  exported: HarvestClipEntry[];
  skipped: { title: string; exportedPath: string; reason: string }[];
  failed: { title: string; error: string }[];
  reportPath: string;
};

function relativeExportPath(category: string | undefined, title: string): string {
  const folder = categoryFolderForLabel(category);
  const base = subjectFromTitle(title);
  return `${folder}/${base}.mp4`;
}

export function resolveHarvestExportPaths(
  items: HarvestExportItem[],
): { item: HarvestExportItem; exportedPath: string; absolutePath: string }[] {
  return items.map((item) => {
    const exportedPath = relativeExportPath(item.category, item.title);
    const absolutePath = join(harvestLibraryRoot(), exportedPath);
    return { item, exportedPath, absolutePath };
  });
}

export function findHarvestConflicts(
  items: HarvestExportItem[],
): HarvestConflict[] {
  const conflicts: HarvestConflict[] = [];
  const seen = new Set<string>();
  for (const { item, exportedPath, absolutePath } of resolveHarvestExportPaths(items)) {
    if (seen.has(exportedPath)) continue;
    seen.add(exportedPath);
    if (existsSync(absolutePath)) {
      conflicts.push({
        exportedPath,
        absolutePath,
        title: item.title.trim(),
        type: categoryFolderForLabel(item.category),
      });
    }
  }
  return conflicts;
}

function shouldExportFile(
  exists: boolean,
  duplicateAction: HarvestDuplicateAction | undefined,
): boolean {
  if (!exists) return true;
  if (duplicateAction === "replace" || duplicateAction === "replace_all") return true;
  return false;
}

export async function exportHarvestQueue(
  sourceVideoPath: string,
  context: HarvestExportContext,
  items: HarvestExportItem[],
  duplicateAction?: HarvestDuplicateAction,
): Promise<HarvestExportResult> {
  const libraryRoot = await ensureHarvestLibraryLayout();
  const exported: HarvestClipEntry[] = [];
  const skipped: HarvestExportResult["skipped"] = [];
  const failed: HarvestExportResult["failed"] = [];
  const exportedAt = new Date().toISOString();

  for (const item of items) {
    const exportedPath = relativeExportPath(item.category, item.title);
    const absolutePath = join(libraryRoot, exportedPath);
    const destDir = categoryDirForLabel(item.category);
    const fileExists = existsSync(absolutePath);

    if (!shouldExportFile(fileExists, duplicateAction)) {
      skipped.push({
        title: item.title.trim(),
        exportedPath,
        reason: "File already exists",
      });
      continue;
    }

    await mkdir(destDir, { recursive: true });

    try {
      const vdj = resolveHarvestClipMetadata(item, context);
      await extractClipCopy(
        sourceVideoPath,
        absolutePath,
        item.inSeconds,
        item.outSeconds,
        harvestMetadataToFfmpegArgs(vdj),
      );
      const durationSec = Math.max(0, item.outSeconds - item.inSeconds);
      exported.push({
        id: newHarvestClipId(),
        title: item.title.trim(),
        type: categoryFolderForLabel(item.category),
        sourceProgram: context.sourceProgram,
        sourceFile: context.sourceFile,
        inSec: item.inSeconds,
        outSec: item.outSeconds,
        durationSec,
        exportedAt,
        chapterId: item.chapterId,
        exportedPath,
        jobSlug: context.jobSlug,
        year: context.year,
        vdj,
      });
    } catch (e) {
      failed.push({
        title: item.title.trim(),
        error: e instanceof Error ? e.message : "Clip export failed",
      });
    }
  }

  if (exported.length > 0) {
    await appendHarvestClips(exported);
  }

  const reportPath = join(
    harvestReportsDir(),
    `export-${exportedAt.replace(/[:.]/g, "-")}.json`,
  );
  await writeFile(
    reportPath,
    `${JSON.stringify(
      {
        exportedAt,
        libraryRoot,
        context,
        duplicateAction: duplicateAction ?? null,
        exportedCount: exported.length,
        skippedCount: skipped.length,
        failedCount: failed.length,
        exported,
        skipped,
        failed,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  if (exported.length === 0 && failed.length > 0 && skipped.length === 0) {
    throw new Error(failed[0]?.error ?? "All clip exports failed");
  }

  return {
    libraryRoot,
    exported,
    skipped,
    failed,
    reportPath,
  };
}
