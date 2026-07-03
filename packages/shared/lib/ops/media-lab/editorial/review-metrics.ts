import type { TranscriptSegment } from "../build-chapters-from-segments";
import type { EditorialChapter } from "../chapters-csv";
import { brandsMatchTitle, extractBrandFromText } from "../commercial/brand-detect";
import { transcriptSimilarity } from "../commercial/brand-detect";
import type { MergeSuggestion } from "./merge-suggestions";

export type ChapterReviewFlags = {
  under15Sec: boolean;
  sameBrandNeighbor: boolean;
  mergeEligible: boolean;
};

export type ReviewMetricsSummary = {
  totalClips: number;
  under15Sec: number;
  sameBrandNeighbor: number;
  mergeEligible: number;
};

function rangeText(
  segments: TranscriptSegment[],
  start: number,
  end: number,
): string {
  return segments
    .filter((s) => s.start >= start - 0.05 && s.start < end)
    .map((s) => s.text)
    .join(" ");
}

export function computeChapterReviewFlags(
  chapters: EditorialChapter[],
  segments: TranscriptSegment[],
  suggestions: MergeSuggestion[],
): Map<string, ChapterReviewFlags> {
  const mergeEligibleIds = new Set<string>();
  for (const s of suggestions) {
    if (s.confidence >= 55) {
      mergeEligibleIds.add(s.leftChapterId);
      mergeEligibleIds.add(s.rightChapterId);
    }
  }

  const flags = new Map<string, ChapterReviewFlags>();

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const dur = ch.endSec - ch.startSec;
    const prev = chapters[i - 1];
    const next = chapters[i + 1];

    let sameBrandNeighbor = false;
    if (prev && brandsMatchTitle(prev.title, ch.title)) sameBrandNeighbor = true;
    if (next && brandsMatchTitle(ch.title, next.title)) sameBrandNeighbor = true;

    if (!sameBrandNeighbor && prev) {
      const sim = transcriptSimilarity(
        rangeText(segments, prev.startSec, prev.endSec),
        rangeText(segments, ch.startSec, ch.endSec),
      );
      if (sim >= 0.26 && extractBrandFromText(prev.title + ch.title)) {
        sameBrandNeighbor = true;
      }
    }

    flags.set(ch.id, {
      under15Sec: dur < 15,
      sameBrandNeighbor,
      mergeEligible: mergeEligibleIds.has(ch.id) || sameBrandNeighbor || dur < 15,
    });
  }

  return flags;
}

export function summarizeReviewMetrics(
  flags: Map<string, ChapterReviewFlags>,
): ReviewMetricsSummary {
  let under15Sec = 0;
  let sameBrandNeighbor = 0;
  let mergeEligible = 0;
  for (const f of flags.values()) {
    if (f.under15Sec) under15Sec++;
    if (f.sameBrandNeighbor) sameBrandNeighbor++;
    if (f.mergeEligible) mergeEligible++;
  }
  return {
    totalClips: flags.size,
    under15Sec,
    sameBrandNeighbor,
    mergeEligible,
  };
}
