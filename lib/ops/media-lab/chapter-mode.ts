import { readFile } from "fs/promises";
import { join } from "path";

import type { ContentChapter, TranscriptSegment } from "./build-chapters-from-segments";
import { buildContentAwareChapters } from "./build-chapters-from-segments";
import { buildCommercialCompilationChapters } from "./build-commercial-chapters";
import type { MediaLabJobMeta } from "./job-meta";

export type MediaLabChapterMode = "content" | "commercial";

export const MEDIA_LAB_CHAPTER_MODES: MediaLabChapterMode[] = ["content", "commercial"];

export function parseChapterMode(value: unknown): MediaLabChapterMode {
  if (value === "commercial") return "commercial";
  return "content";
}

export async function readJobChapterMode(outputDir: string): Promise<MediaLabChapterMode> {
  try {
    const job = JSON.parse(
      await readFile(join(outputDir, "job.json"), "utf8"),
    ) as MediaLabJobMeta;
    return parseChapterMode(job.chapterMode);
  } catch {
    return "content";
  }
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
