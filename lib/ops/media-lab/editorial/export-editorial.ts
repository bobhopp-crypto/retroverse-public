import { readFile, writeFile } from "fs/promises";
import { join } from "path";

import { secToTimecode } from "../chapter-time";
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
  allChapters: EditorialChapter[],
  exportChapters: EditorialChapter[],
): Promise<MediaLabJobMeta> {
  if (exportChapters.length === 0) {
    throw new Error("No Keep clips to export. Mark clips Keep before exporting.");
  }

  await writeChaptersFromRecords(outputDir, allChapters);
  await writeChaptersFromRecords(outputDir, exportChapters, "chapters-export.csv");

  const rows = editorialToLabelRows(exportChapters);
  await writeSegmentLabelsJson(outputDir, rows);
  await writeSegmentLabelsTxt(outputDir, rows);

  const job = JSON.parse(
    await readFile(join(outputDir, "job.json"), "utf8"),
  ) as MediaLabJobMeta;

  job.chapterCount = allChapters.length;
  job.segmentLabelCount = exportChapters.length;
  const files = new Set(job.files ?? []);
  files.add("chapters.csv");
  files.add("chapters-export.csv");
  files.add("segment-labels.json");
  files.add("segment-labels.txt");
  job.files = [...files];
  await writeFile(join(outputDir, "job.json"), `${JSON.stringify(job, null, 2)}\n`, "utf8");

  return job;
}
