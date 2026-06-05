import { readFile } from "fs/promises";
import { join } from "path";

import { formatChapterClock } from "./chapter-time";
import type { MediaLabJobMeta } from "./run-transcribe";

export type MediaLabChapterPreview = {
  start: string;
  end: string;
  title: string;
  clock: string;
};

export type MediaLabSegmentLabelPreview = {
  start: string;
  end: string;
  label: string;
  clock: string;
};

export type MediaLabPreview = {
  job: MediaLabJobMeta;
  transcriptPreview: string;
  chaptersPreview: MediaLabChapterPreview[];
  chapterTitlesPreview: { clock: string; title: string }[];
  segmentLabelsPreview: MediaLabSegmentLabelPreview[];
  segmentLabelLinesPreview: string;
};

function parseTimecodeToSeconds(tc: string): number {
  const parts = tc.trim().split(":");
  if (parts.length < 2) return 0;
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1]);
  }
  return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
}

export async function loadJobPreview(outputDir: string): Promise<MediaLabPreview> {
  const job = JSON.parse(
    await readFile(join(outputDir, "job.json"), "utf8"),
  ) as MediaLabJobMeta;

  const transcript = await readFile(join(outputDir, "transcript.txt"), "utf8");
  const transcriptPreview =
    transcript.length > 4000 ? `${transcript.slice(0, 4000)}\n…` : transcript;

  const chaptersRaw = await readFile(join(outputDir, "chapters.csv"), "utf8").catch(() => "");
  const chapterLines = chaptersRaw.trim() ? chaptersRaw.trim().split("\n").slice(1) : [];
  const chaptersPreview = chapterLines.map((line) => {
    const parts = parseCsvLine(line);
    const start = parts[0] ?? "";
    const end = parts[1] ?? "";
    const title = parts[2] ?? "";
    const sec = parseTimecodeToSeconds(start);
    return {
      start,
      end,
      title,
      clock: formatChapterClock(sec),
    };
  });

  const chapterTitlesPreview = chaptersPreview.map((ch) => ({
    clock: ch.clock,
    title: ch.title,
  }));

  let segmentLabelsPreview: MediaLabSegmentLabelPreview[] = [];
  let segmentLabelLinesPreview = "";

  try {
    const labelsRaw = await readFile(join(outputDir, "segment-labels.json"), "utf8");
    const labels = JSON.parse(labelsRaw) as { start: string; end: string; label: string }[];
    segmentLabelsPreview = labels.map((row) => ({
      ...row,
      clock: formatChapterClock(parseTimecodeToSeconds(row.start)),
    }));
    segmentLabelLinesPreview = labels.map((r) => r.label).join("\n");
  } catch {
    segmentLabelsPreview = [];
    segmentLabelLinesPreview = "";
  }

  return {
    job,
    transcriptPreview,
    chaptersPreview,
    chapterTitlesPreview,
    segmentLabelsPreview,
    segmentLabelLinesPreview,
  };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}
