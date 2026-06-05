import { readFile, writeFile } from "fs/promises";
import { join } from "path";

import { secToTimecode } from "./chapters-only";

export type ChapterRecord = {
  startSec: number;
  endSec: number;
  title: string;
};

export type EditorialChapter = ChapterRecord & {
  id: string;
};

export function parseTimecodeToSeconds(tc: string): number {
  const parts = tc.trim().split(":");
  if (parts.length < 2) return 0;
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1]);
  }
  return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
}

export function parseCsvLine(line: string): string[] {
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

export async function readChaptersCsv(outputDir: string): Promise<ChapterRecord[]> {
  const raw = await readFile(join(outputDir, "chapters.csv"), "utf8").catch(() => "");
  const lines = raw.trim() ? raw.trim().split("\n").slice(1) : [];
  return lines.map((line) => {
    const parts = parseCsvLine(line);
    const startSec = parseTimecodeToSeconds(parts[0] ?? "0");
    const endSec = parseTimecodeToSeconds(parts[1] ?? "0");
    return {
      startSec,
      endSec,
      title: parts[2] ?? "",
    };
  });
}

export async function writeChaptersFromRecords(
  outputDir: string,
  chapters: ChapterRecord[],
): Promise<void> {
  const lines = ["start,end,title"];
  for (const ch of chapters) {
    const title = ch.title.includes(",") ? `"${ch.title.replace(/"/g, '""')}"` : ch.title;
    lines.push(
      `${secToTimecode(ch.startSec)},${secToTimecode(ch.endSec)},${title}`,
    );
  }
  await writeFile(join(outputDir, "chapters.csv"), `${lines.join("\n")}\n`, "utf8");
}

export function withEditorialIds(chapters: ChapterRecord[]): EditorialChapter[] {
  return chapters.map((ch, i) => ({
    ...ch,
    id: `ch-${i}`,
  }));
}

export function normalizeChapterTimeline(
  chapters: EditorialChapter[],
  videoEndSec: number,
): EditorialChapter[] {
  if (chapters.length === 0) return [];

  const sorted = [...chapters].sort((a, b) => a.startSec - b.startSec);
  const out: EditorialChapter[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const ch = sorted[i];
    const next = sorted[i + 1];
    const endSec = next ? next.startSec : videoEndSec;
    out.push({
      ...ch,
      endSec: Math.max(ch.startSec + 0.5, endSec),
    });
  }

  out[0].startSec = sorted[0].startSec;
  out[out.length - 1].endSec = videoEndSec;

  return out.map((ch, i) => ({ ...ch, id: `ch-${i}` }));
}
