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
import { formatChapterClock, secToTimecode } from "../chapters-only";
import type { MediaLabJobMeta } from "../job-meta";
import { suggestAdjacentMerges, type MergeSuggestion } from "./merge-suggestions";

export type EditorialChapterRow = EditorialChapter & {
  start: string;
  end: string;
  durationSec: number;
  clock: string;
};

export type EditorialBundle = {
  job: MediaLabJobMeta;
  chapterMode: MediaLabChapterMode;
  videoPath: string | null;
  videoUrl: string | null;
  chapters: EditorialChapterRow[];
  suggestions: MergeSuggestion[];
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
    chapters: normalized.map(toRow),
    suggestions,
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
