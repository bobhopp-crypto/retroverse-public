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
};

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

export function filterChaptersForExport<T extends { reviewStatus?: ClipReviewStatus }>(
  chapters: T[],
): T[] {
  return chapters.filter((ch) => isExportableClipStatus(ch.reviewStatus));
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
      if (reviewStatus) chapters[id] = { reviewStatus };
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
    chapters?: Record<string, { reviewStatus?: unknown } | undefined>;
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
      if (reviewStatus) chapters[id] = { ...chapters[id], reviewStatus };
      else if (chapters[id]) {
        const next = { ...chapters[id] };
        delete next.reviewStatus;
        if (Object.keys(next).length === 0) delete chapters[id];
        else chapters[id] = next;
      }
    }
  }

  const out: EditorialMetaFile = { chapters };
  if (nextSource) out.sourceReviewStatus = nextSource;
  return out;
}
