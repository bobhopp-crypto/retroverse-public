import type { EditorialChapter } from "../chapters-csv";
import type { MergeSuggestion } from "./merge-suggestions";
import { brandsMatchTitle } from "./brand-utils";

export type EditorialReviewFilter =
  | "all"
  | "under20"
  | "sameBrand"
  | "lowConfidence";

export function chapterDuration(ch: EditorialChapter): number {
  return ch.endSec - ch.startSec;
}

export function filterChapterIds(
  chapters: EditorialChapter[],
  suggestions: MergeSuggestion[],
  filter: EditorialReviewFilter,
): Set<string> {
  if (filter === "all") {
    return new Set(chapters.map((c) => c.id));
  }

  const ids = new Set<string>();

  if (filter === "under20") {
    for (const ch of chapters) {
      if (chapterDuration(ch) < 20) ids.add(ch.id);
    }
    return ids;
  }

  if (filter === "sameBrand") {
    for (let i = 0; i < chapters.length - 1; i++) {
      if (brandsMatchTitle(chapters[i].title, chapters[i + 1].title)) {
        ids.add(chapters[i].id);
        ids.add(chapters[i + 1].id);
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

  return new Set(chapters.map((c) => c.id));
}
