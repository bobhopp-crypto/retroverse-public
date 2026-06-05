import { readFile, writeFile } from "fs/promises";
import { join } from "path";

import {
  normalizeClipReviewStatus,
  parseClipReviewStatus,
  parseSourceReviewStatus,
  isExportableClipStatus,
  summarizeClipReviewCounts,
  type ClipReviewStatus,
  type SourceReviewStatus,
} from "./review-status";

export type ChapterEditorialMeta = {
  reviewStatus?: ClipReviewStatus;
  /** Exceptional show material — implies Keep when true. */
  favorite?: boolean;
  /** Curator-facing category label (e.g. Bumper, Commercial). */
  category?: string;
  /** Curator bumper IN/OUT (whole seconds in source video). */
  inSeconds?: number;
  outSeconds?: number;
  lengthSeconds?: number;
};

function parseWholeSeconds(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const n = Math.round(value);
  return n >= 0 ? n : undefined;
}

function hasChapterMeta(row: ChapterEditorialMeta): boolean {
  return Boolean(
    row.reviewStatus ||
      row.favorite ||
      row.category ||
      row.inSeconds != null ||
      row.outSeconds != null ||
      row.lengthSeconds != null,
  );
}

/** Future export modes: favorites-only, kept, or full timeline. */
export type ExportFilterMode = "favorites" | "kept" | "everything";

export type EditorialMetaFile = {
  sourceReviewStatus?: SourceReviewStatus;
  chapters: Record<string, ChapterEditorialMeta>;
};

export {
  type ClipReviewStatus,
  type SourceReviewStatus,
  type ClipReviewCounts,
  isExportableClipStatus,
  summarizeClipReviewCounts,
  parseClipReviewStatus,
  parseSourceReviewStatus,
  normalizeClipReviewStatus,
} from "./review-status";

/** @deprecated use isExportableClipStatus */
export const isExportableReviewStatus = isExportableClipStatus;

/** @deprecated use summarizeClipReviewCounts */
export const summarizeReviewStatusCounts = summarizeClipReviewCounts;

export function isKeptChapter(ch: {
  reviewStatus?: ClipReviewStatus;
  favorite?: boolean;
}): boolean {
  return isExportableClipStatus(ch.reviewStatus);
}

export function filterChaptersForExport<
  T extends { reviewStatus?: ClipReviewStatus; favorite?: boolean },
>(chapters: T[], mode: ExportFilterMode = "kept"): T[] {
  switch (mode) {
    case "favorites":
      return chapters.filter((ch) => ch.favorite === true && isExportableClipStatus(ch.reviewStatus));
    case "everything":
      return chapters;
    case "kept":
    default:
      return chapters.filter((ch) => isExportableClipStatus(ch.reviewStatus));
  }
}

export async function readEditorialMeta(outputDir: string): Promise<EditorialMetaFile> {
  try {
    const raw = JSON.parse(
      await readFile(join(outputDir, "editorial-meta.json"), "utf8"),
    ) as EditorialMetaFile;
    if (!raw || typeof raw !== "object" || !raw.chapters) {
      return { chapters: {} };
    }
    const chapters: EditorialMetaFile["chapters"] = {};
    for (const [id, row] of Object.entries(raw.chapters)) {
      const reviewStatus = normalizeClipReviewStatus(row?.reviewStatus);
      const favorite = row?.favorite === true;
      const category =
        typeof row?.category === "string" && row.category.trim()
          ? row.category.trim()
          : undefined;
      const inSeconds = parseWholeSeconds(row?.inSeconds);
      const outSeconds = parseWholeSeconds(row?.outSeconds);
      const lengthSeconds = parseWholeSeconds(row?.lengthSeconds);
      const next: ChapterEditorialMeta = {
        ...(reviewStatus ? { reviewStatus } : {}),
        ...(favorite ? { favorite: true } : {}),
        ...(category ? { category } : {}),
        ...(inSeconds != null ? { inSeconds } : {}),
        ...(outSeconds != null ? { outSeconds } : {}),
        ...(lengthSeconds != null ? { lengthSeconds } : {}),
      };
      if (hasChapterMeta(next)) chapters[id] = next;
    }
    return {
      sourceReviewStatus: parseSourceReviewStatus(raw.sourceReviewStatus),
      chapters,
    };
  } catch {
    return { chapters: {} };
  }
}

export async function writeEditorialMeta(
  outputDir: string,
  meta: EditorialMetaFile,
): Promise<void> {
  await writeFile(
    join(outputDir, "editorial-meta.json"),
    `${JSON.stringify(meta, null, 2)}\n`,
    "utf8",
  );
}

export function mergeEditorialMetaPayload(
  existing: EditorialMetaFile,
  payload: {
    sourceReviewStatus?: unknown;
    chapters?: Record<
      string,
      | {
          reviewStatus?: unknown;
          favorite?: unknown;
          category?: unknown;
          inSeconds?: unknown;
          outSeconds?: unknown;
          lengthSeconds?: unknown;
        }
      | undefined
    >;
  },
): EditorialMetaFile {
  const chapters = { ...existing.chapters };

  let nextSource = existing.sourceReviewStatus;
  if (payload.sourceReviewStatus !== undefined) {
    nextSource = parseSourceReviewStatus(payload.sourceReviewStatus);
  }

  if (payload.chapters) {
    for (const [id, row] of Object.entries(payload.chapters)) {
      if (!row) continue;
      const reviewStatus = parseClipReviewStatus(row.reviewStatus);
      const next: ChapterEditorialMeta = { ...chapters[id] };

      if (reviewStatus) next.reviewStatus = reviewStatus;
      else delete next.reviewStatus;

      if (row.favorite === true) next.favorite = true;
      else if (row.favorite === false || row.favorite === null) delete next.favorite;

      if (typeof row.category === "string") {
        const cat = row.category.trim();
        if (cat) next.category = cat;
        else delete next.category;
      }

      const inSeconds = parseWholeSeconds(row.inSeconds);
      if (inSeconds != null) next.inSeconds = inSeconds;
      else if (row.inSeconds === null) delete next.inSeconds;

      const outSeconds = parseWholeSeconds(row.outSeconds);
      if (outSeconds != null) next.outSeconds = outSeconds;
      else if (row.outSeconds === null) delete next.outSeconds;

      const lengthSeconds = parseWholeSeconds(row.lengthSeconds);
      if (lengthSeconds != null) next.lengthSeconds = lengthSeconds;
      else if (row.lengthSeconds === null) delete next.lengthSeconds;

      if (!hasChapterMeta(next)) delete chapters[id];
      else chapters[id] = next;
    }
  }

  const out: EditorialMetaFile = { chapters };
  if (nextSource) out.sourceReviewStatus = nextSource;
  return out;
}
