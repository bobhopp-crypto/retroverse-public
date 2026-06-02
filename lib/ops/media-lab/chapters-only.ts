import { readFile, writeFile } from "fs/promises";
import { join } from "path";

import {
  buildContentAwareChapters,
  type TranscriptSegment,
} from "./build-chapters-from-segments";
import type { MediaLabJobMeta } from "./run-transcribe";

export function secToTimecode(sec: number): string {
  if (sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
}

export function formatChapterClock(sec: number): string {
  if (sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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

export async function regenerateChapters(outputDir: string): Promise<{
  chapters: { start: number; end: number; title: string }[];
  job: MediaLabJobMeta;
}> {
  const raw = await readFile(join(outputDir, "segments.json"), "utf8");
  const segments = JSON.parse(raw) as TranscriptSegment[];
  const contentChapters = buildContentAwareChapters(segments);
  const chapters = contentChapters.map(({ start, end, title }) => ({ start, end, title }));
  await writeChaptersCsv(outputDir, chapters);

  const jobRaw = await readFile(join(outputDir, "job.json"), "utf8");
  const job = JSON.parse(jobRaw) as MediaLabJobMeta;
  job.chapterCount = chapters.length;
  await writeFile(join(outputDir, "job.json"), `${JSON.stringify(job, null, 2)}\n`, "utf8");

  return { chapters, job };
}
