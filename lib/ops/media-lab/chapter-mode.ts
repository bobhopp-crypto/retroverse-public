import type { ContentChapter, TranscriptSegment } from "./build-chapters-from-segments";
import { buildContentAwareChapters } from "./build-chapters-from-segments";
import { buildCommercialCompilationChapters } from "./build-commercial-chapters";

export type MediaLabChapterMode = "content" | "commercial";

export const MEDIA_LAB_CHAPTER_MODES: MediaLabChapterMode[] = ["content", "commercial"];

export function parseChapterMode(value: unknown): MediaLabChapterMode {
  if (value === "commercial") return "commercial";
  return "content";
}

export function buildChaptersForMode(
  segments: TranscriptSegment[],
  mode: MediaLabChapterMode,
): ContentChapter[] {
  if (mode === "commercial") {
    return buildCommercialCompilationChapters(segments);
  }
  return buildContentAwareChapters(segments);
}
