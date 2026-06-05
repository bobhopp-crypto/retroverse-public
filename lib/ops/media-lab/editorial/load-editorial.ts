import { readFile } from "fs/promises";
import { join } from "path";

import type { TranscriptSegment } from "../build-chapters-from-segments";
import { parseChapterMode, type MediaLabChapterMode } from "../chapter-mode";
import {
  normalizeChapterTimeline,
  readChaptersCsv,
  withEditorialIds,
  type EditorialChapter,
} from "../chapters-csv";
import { formatChapterClock, secToTimecode } from "../chapter-time";
import type { MediaLabJobMeta } from "../job-meta";
import {
  assetsRootDir,
  listAssetRouteSummary,
  sourceArchiveDir,
  type AssetRouteSummary,
} from "./asset-routing";
import { readEditorialMeta } from "./editorial-meta";
import type { EditorialChapterRow } from "./editorial-types";
import { suggestAdjacentMerges, type MergeSuggestion } from "./merge-suggestions";
import {
  computeChapterReviewFlags,
  summarizeReviewMetrics,
  type ChapterReviewFlags,
  type ReviewMetricsSummary,
} from "./review-metrics";
import type { ClipReviewStatus, SourceReviewStatus } from "./review-status";
import {
  suggestAllChapterTags,
  type ClipTagSuggestion,
} from "./transcript-suggestions";

export type { EditorialChapterRow } from "./editorial-types";

export type EditorialBundle = {
  job: MediaLabJobMeta;
  chapterMode: MediaLabChapterMode;
  videoPath: string | null;
  videoUrl: string | null;
  sourceReviewStatus?: SourceReviewStatus;
  clipAssetsDir: string;
  sourceArchiveDir: string;
  assetRoutes: AssetRouteSummary[];
  chapters: EditorialChapterRow[];
  suggestions: MergeSuggestion[];
  reviewMetrics: ReviewMetricsSummary;
  tagSuggestions: Record<string, ClipTagSuggestion>;
  segments: TranscriptSegment[];
};

function toRow(ch: EditorialChapter): EditorialChapterRow {
  return {
    ...ch,
    start: secToTimecode(ch.startSec),
    end: secToTimecode(ch.endSec),
    durationSec: Math.round((ch.endSec - ch.startSec) * 10) / 10,
    clock: formatChapterClock(ch.startSec),
  };
}

export async function loadEditorialBundle(
  outputDir: string,
  options?: { year?: number; jobSlug?: string },
): Promise<EditorialBundle> {
  const job = JSON.parse(
    await readFile(join(outputDir, "job.json"), "utf8"),
  ) as MediaLabJobMeta;

  const videoEnd =
    job.durationSeconds ??
    (await readSegments(outputDir)).at(-1)?.end ??
    0;

  const raw = await readChaptersCsv(outputDir);
  const normalized = normalizeChapterTimeline(withEditorialIds(raw), videoEnd);
  const segments = await readSegments(outputDir);
  const suggestions = suggestAdjacentMerges(normalized, segments);
  const tagMap = suggestAllChapterTags(normalized, segments);
  const editorialMeta = await readEditorialMeta(outputDir);
  const flagMap = computeChapterReviewFlags(normalized, segments, suggestions);
  const reviewMetrics = summarizeReviewMetrics(flagMap);

  const videoPath = job.sourceVideo?.trim() || null;
  const videoUrl =
    videoPath && options?.year != null && options?.jobSlug
      ? `/api/ops/media-lab/editorial/video?year=${options.year}&jobSlug=${encodeURIComponent(options.jobSlug)}`
      : null;

  return {
    job,
    chapterMode: parseChapterMode(job.chapterMode),
    videoPath,
    videoUrl,
    sourceReviewStatus: editorialMeta.sourceReviewStatus,
    clipAssetsDir: assetsRootDir(),
    sourceArchiveDir: sourceArchiveDir(),
    assetRoutes: listAssetRouteSummary(),
    chapters: normalized.map((ch) => ({
      ...toRow(ch),
      reviewFlags: flagMap.get(ch.id),
      tagSuggestion: tagMap.get(ch.id),
      reviewStatus: editorialMeta.chapters[ch.id]?.reviewStatus,
      favorite: editorialMeta.chapters[ch.id]?.favorite,
      category: editorialMeta.chapters[ch.id]?.category,
      inSeconds: editorialMeta.chapters[ch.id]?.inSeconds,
      outSeconds: editorialMeta.chapters[ch.id]?.outSeconds,
      lengthSeconds: editorialMeta.chapters[ch.id]?.lengthSeconds,
    })),
    suggestions,
    reviewMetrics,
    tagSuggestions: Object.fromEntries(tagMap.entries()),
    segments,
  };
}

async function readSegments(outputDir: string): Promise<TranscriptSegment[]> {
  try {
    return JSON.parse(
      await readFile(join(outputDir, "segments.json"), "utf8"),
    ) as TranscriptSegment[];
  } catch {
    return [];
  }
}

export function parseEditorialChaptersPayload(
  chapters: {
    id?: string;
    startSec?: number;
    endSec?: number;
    title?: string;
  }[],
  videoEndSec: number,
): EditorialChapter[] {
  const mapped = chapters.map((ch, i) => ({
    id: ch.id?.trim() || `ch-${i}`,
    startSec: Number(ch.startSec) || 0,
    endSec: Number(ch.endSec) || 0,
    title: String(ch.title ?? "").trim() || "Untitled",
  }));
  return normalizeChapterTimeline(mapped, videoEndSec);
}
