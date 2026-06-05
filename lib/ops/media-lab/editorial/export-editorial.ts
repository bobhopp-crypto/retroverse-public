import { readFile, writeFile } from "fs/promises";
import { join } from "path";

import { secToTimecode } from "../chapters-only";
import type { EditorialChapter } from "../chapters-csv";
import { writeChaptersFromRecords } from "../chapters-csv";
import type { MediaLabJobMeta } from "../job-meta";
import {
  writeSegmentLabelsJson,
  writeSegmentLabelsTxt,
  type SegmentLabelRow,
} from "../segment-labels";

export function editorialToLabelRows(chapters: EditorialChapter[]): SegmentLabelRow[] {
  return chapters.map((ch) => ({
    start: secToTimecode(ch.startSec),
    end: secToTimecode(ch.endSec),
    label: ch.title,
    startSec: ch.startSec,
    endSec: ch.endSec,
  }));
}

export async function exportEditorialChapters(
  outputDir: string,
  chapters: EditorialChapter[],
): Promise<MediaLabJobMeta> {
  await writeChaptersFromRecords(outputDir, chapters);

  const rows = editorialToLabelRows(chapters);
  await writeSegmentLabelsJson(outputDir, rows);
  await writeSegmentLabelsTxt(outputDir, rows);

  const job = JSON.parse(
    await readFile(join(outputDir, "job.json"), "utf8"),
  ) as MediaLabJobMeta;

  job.chapterCount = chapters.length;
  job.segmentLabelCount = chapters.length;
  const files = new Set(job.files ?? []);
  files.add("chapters.csv");
  files.add("segment-labels.json");
  files.add("segment-labels.txt");
  job.files = [...files];
  await writeFile(join(outputDir, "job.json"), `${JSON.stringify(job, null, 2)}\n`, "utf8");

  return job;
}
