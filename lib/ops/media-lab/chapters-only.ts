import { readFile, writeFile } from "fs/promises";
import { join } from "path";

import {
  buildChaptersForMode,
  parseChapterMode,
  type MediaLabChapterMode,
} from "./chapter-mode";
import { secToTimecode } from "./chapter-time";
import type { TranscriptSegment } from "./build-chapters-from-segments";
import type { MediaLabJobMeta } from "./run-transcribe";

export { formatChapterClock, secToTimecode } from "./chapter-time";

export async function writeChaptersCsv(
  outputDir: string,
  chapters: { start: number; end: number; title: string }[],
): Promise<void> {
  const lines = ["start,end,title"];
  for (const ch of chapters) {
    const title = ch.title.includes(",") ? `"${ch.title.replace(/"/g, '""')}"` : ch.title;
    lines.push(`${secToTimecode(ch.start)},${secToTimecode(ch.end)},${title}`);
  }
  await writeFile(join(outputDir, "chapters.csv"), `${lines.join("\n")}\n`, "utf8");
}

export async function regenerateChapters(
  outputDir: string,
  mode?: MediaLabChapterMode,
): Promise<{
  chapters: { start: number; end: number; title: string }[];
  job: MediaLabJobMeta;
}> {
  const raw = await readFile(join(outputDir, "segments.json"), "utf8");
  const segments = JSON.parse(raw) as TranscriptSegment[];

  const jobRaw = await readFile(join(outputDir, "job.json"), "utf8");
  const job = JSON.parse(jobRaw) as MediaLabJobMeta;
  const chapterMode = mode ?? parseChapterMode(job.chapterMode);

  const contentChapters = buildChaptersForMode(segments, chapterMode);
  const chapters = contentChapters.map(({ start, end, title }) => ({ start, end, title }));
  await writeChaptersCsv(outputDir, chapters);

  job.chapterCount = chapters.length;
  job.chapterMode = chapterMode;
  await writeFile(join(outputDir, "job.json"), `${JSON.stringify(job, null, 2)}\n`, "utf8");

  return { chapters, job };
}
