/** Client-safe Media Lab job list types (no Node / fs imports). */

import type { MediaLabChapterMode } from "./chapter-mode";

export type MediaLabJobSummary = {
  jobSlug: string;
  outputDir: string;
  sourceFilename: string;
  createdAt: string;
  durationSeconds: number | null;
  segmentCount: number;
  chapterCount: number;
  segmentLabelCount: number | null;
  chapterMode: MediaLabChapterMode;
  hasSegments: boolean;
  hasTranscript: boolean;
  hasChapters: boolean;
  hasLabels: boolean;
  hasEditorialMeta: boolean;
};
