import "server-only";

import { readFile } from "fs/promises";
import { join } from "path";

import { parseChapterMode, type MediaLabChapterMode } from "./chapter-mode";
import type { MediaLabJobMeta } from "./job-meta";

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
