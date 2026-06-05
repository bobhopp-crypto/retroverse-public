import type { EditorialChapter } from "../chapters-csv";
import type { ChapterReviewFlags } from "./review-metrics";
import type { MergeSuggestion } from "./merge-suggestions";
import { brandsMatchTitle } from "./brand-utils";
import type { ClipReviewStatus } from "./review-status";
import { isExportableClipStatus } from "./review-status";

export type EditorialReviewFilter =
  | "all"
  | "under15"
  | "under20"
  | "sameBrand"
  | "mergeEligible"
  | "lowConfidence"
  | "keep"
  | "reject"
  | "unreviewed"
  | "exportable";

export function chapterDuration(ch: EditorialChapter): number {
  return ch.endSec - ch.startSec;
}

export function filterChapterIds(
  chapters: EditorialChapter[],
  suggestions: MergeSuggestion[],
  filter: EditorialReviewFilter,
  flags?: Map<string, ChapterReviewFlags>,
  reviewStatus?: Map<string, ClipReviewStatus | undefined>,
): Set<string> {
  if (filter === "all") {
    return new Set(chapters.map((c) => c.id));
  }

  const ids = new Set<string>();

  if (filter === "under15") {
    for (const ch of chapters) {
      if (flags?.get(ch.id)?.under15Sec ?? chapterDuration(ch) < 15) ids.add(ch.id);
    }
    return ids;
  }

  if (filter === "under20") {
    for (const ch of chapters) {
      if (chapterDuration(ch) < 20) ids.add(ch.id);
    }
    return ids;
  }

  if (filter === "sameBrand") {
    for (const ch of chapters) {
      if (flags?.get(ch.id)?.sameBrandNeighbor) {
        ids.add(ch.id);
        continue;
      }
    }
    if (ids.size > 0) return ids;
    for (let i = 0; i < chapters.length - 1; i++) {
      if (brandsMatchTitle(chapters[i].title, chapters[i + 1].title)) {
        ids.add(chapters[i].id);
        ids.add(chapters[i + 1].id);
      }
    }
    return ids;
  }

  if (filter === "mergeEligible") {
    for (const ch of chapters) {
      if (flags?.get(ch.id)?.mergeEligible) ids.add(ch.id);
    }
    if (ids.size > 0) return ids;
    for (const s of suggestions) {
      if (s.confidence >= 55) {
        ids.add(s.leftChapterId);
        ids.add(s.rightChapterId);
      }
    }
    return ids;
  }

  if (filter === "lowConfidence") {
    const inStrongMerge = new Set<string>();
    for (const s of suggestions) {
      if (s.confidence >= 70) {
        inStrongMerge.add(s.leftChapterId);
        inStrongMerge.add(s.rightChapterId);
      }
    }
    for (const ch of chapters) {
      if (chapterDuration(ch) < 20) ids.add(ch.id);
    }
    for (const s of suggestions) {
      if (s.confidence < 70) {
        ids.add(s.leftChapterId);
        ids.add(s.rightChapterId);
      }
    }
    for (const ch of chapters) {
      if (!inStrongMerge.has(ch.id) && chapterDuration(ch) < 30) {
        ids.add(ch.id);
      }
    }
    return ids;
  }

  if (filter === "keep" || filter === "reject") {
    const target: ClipReviewStatus = filter === "keep" ? "Keep" : "Reject";
    for (const ch of chapters) {
      if (reviewStatus?.get(ch.id) === target) ids.add(ch.id);
    }
    return ids;
  }

  if (filter === "unreviewed") {
    for (const ch of chapters) {
      if (!reviewStatus?.get(ch.id)) ids.add(ch.id);
    }
    return ids;
  }

  if (filter === "exportable") {
    for (const ch of chapters) {
      if (isExportableClipStatus(reviewStatus?.get(ch.id))) ids.add(ch.id);
    }
    return ids;
  }

  return new Set(chapters.map((c) => c.id));
}
