import type { MediaLabChapterMode } from "./chapter-mode";

export type MediaLabJobMeta = {
  year: number;
  jobSlug: string;
  sourceVideo: string;
  sourceFilename: string;
  outputDir: string;
  createdAt: string;
  model: string;
  durationSeconds: number | null;
  segmentCount: number;
  chapterCount: number;
  segmentLabelCount?: number;
  chapterMode?: MediaLabChapterMode;
  files: string[];
};
