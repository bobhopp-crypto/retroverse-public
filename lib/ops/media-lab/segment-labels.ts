import { readFile, writeFile } from "fs/promises";
import { join } from "path";

import {
  buildContentAwareChapters,
  type ContentChapter,
  type TranscriptSegment,
} from "./build-chapters-from-segments";
import { secToTimecode, writeChaptersCsv } from "./chapters-only";
import type { MediaLabJobMeta } from "./run-transcribe";

export type SegmentMediaPrefix =
  | "TV"
  | "Commercial"
  | "Movie"
  | "News"
  | "Music"
  | "Sports"
  | "Awards"
  | "Documentary";

export type SegmentLabelRow = {
  start: string;
  end: string;
  label: string;
  startSec: number;
  endSec: number;
};

const BRAND_LEXICON: { match: RegExp; name: string }[] = [
  { match: /\brice\s+krispies\b/i, name: "Rice Krispies" },
  { match: /\bquaker\s+oats\b/i, name: "Quaker Oats" },
  { match: /\bcoca[\s-]?cola\b/i, name: "Coca-Cola" },
  { match: /\bpepsi\b/i, name: "Pepsi" },
  { match: /\bchevrolet\b/i, name: "Chevrolet" },
  { match: /\bford\b/i, name: "Ford" },
  { match: /\bgeneral\s+motors\b/i, name: "General Motors" },
  { match: /\bkellogg'?s?\b/i, name: "Kellogg's" },
  { match: /\bcampbell'?s?\b/i, name: "Campbell's" },
  { match: /\bgillette\b/i, name: "Gillette" },
  { match: /\bcolgate\b/i, name: "Colgate" },
  { match: /\bmaxwell\s+house\b/i, name: "Maxwell House" },
  { match: /\bjell[\s-]?o\b/i, name: "Jell-O" },
  { match: /\bwonder\s+bread\b/i, name: "Wonder Bread" },
  { match: /\bprocter\s*(?:&|and)\s*gamble\b/i, name: "Procter & Gamble" },
];

const MOVIE_RE =
  /\b(trailer|motion\s+picture|feature\s+film|in\s+theaters|coming\s+to\s+theaters|starring)\b/i;
const NEWS_RE =
  /\b(news|breaking|vietnam|report|anchor|broadcast|headlines|war\s+in)\b/i;
const MUSIC_RE =
  /\b(music|concert|festival|monterey|billboard|performance\s+by|sings)\b/i;
const SPORTS_RE = /\b(sports|game|championship|world\s+series|touchdown|nfl|nba)\b/i;
const AWARDS_RE = /\b(oscar|emmy|grammy|awards?\s+ceremony|academy\s+award)\b/i;
const DOCUMENTARY_RE = /\b(documentary|documentary\s+feature)\b/i;

function segmentsInRange(
  segments: TranscriptSegment[],
  start: number,
  end: number,
): TranscriptSegment[] {
  return segments.filter((s) => s.start >= start - 0.05 && s.start < end);
}

function rangeText(segments: TranscriptSegment[], start: number, end: number): string {
  return segmentsInRange(segments, start, end)
    .map((s) => s.text)
    .join(" ");
}

function extractBrand(text: string): string | null {
  for (const { match, name } of BRAND_LEXICON) {
    if (match.test(text)) return name;
  }
  const m = text.match(
    /\b(?:brought\s+to\s+you\s+by|sponsored\s+by|try\s+new)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i,
  );
  if (m?.[1]) return m[1].trim();
  return null;
}

function inferMediaPrefix(
  chapter: ContentChapter,
  text: string,
): SegmentMediaPrefix {
  if (chapter.kind === "commercial") return "Commercial";
  const hay = `${chapter.title} ${text}`.toLowerCase();

  if (MOVIE_RE.test(hay) || /\btrailer\b/i.test(chapter.title)) return "Movie";
  if (NEWS_RE.test(hay)) return "News";
  if (MUSIC_RE.test(hay)) return "Music";
  if (SPORTS_RE.test(hay)) return "Sports";
  if (AWARDS_RE.test(hay)) return "Awards";
  if (DOCUMENTARY_RE.test(hay)) return "Documentary";
  if (chapter.kind === "network") return "TV";
  return "TV";
}

function stripDisneyPrefix(title: string): string {
  const parts = title.split(/\s*\/\s*/);
  if (parts.length > 1 && /disney/i.test(parts[0] ?? "")) {
    return parts.slice(1).join(" / ").trim();
  }
  return title.trim();
}

function normalizeShowTitle(title: string): string {
  let t = stripDisneyPrefix(title);
  t = t.replace(/^Commercial\s+—\s+/i, "").replace(/^Commercial\s+Sponsors$/i, "");
  t = t.replace(/^Network\s*—\s*/i, "Network ");
  return t.replace(/\s+/g, " ").trim();
}

function formatReadableTitle(title: string, prefix: SegmentMediaPrefix): string {
  const base = normalizeShowTitle(title);
  if (!base) return prefix === "Commercial" ? "Sponsors" : "Segment";

  if (prefix === "Movie" && !/trailer/i.test(base)) {
    return /trailer/i.test(title) ? base : `${base} Trailer`;
  }
  if (prefix === "News" && !/report/i.test(base)) {
    return base.length > 24 ? base : `${base} Report`;
  }

  return base;
}

const COMMERCIAL_CONTEXT_RE =
  /\b(commercial|sponsor(?:ed)?|brought\s+to\s+you|advertisement)\b/i;

export function formatSegmentLabel(
  chapter: ContentChapter,
  segmentText: string,
): string {
  const brand = extractBrand(segmentText) ?? extractBrand(chapter.title);
  const commercialContext =
    chapter.kind === "commercial" ||
    COMMERCIAL_CONTEXT_RE.test(segmentText) ||
    COMMERCIAL_CONTEXT_RE.test(chapter.title) ||
    /^commercial/i.test(chapter.title);

  if (commercialContext || (brand && chapter.kind !== "show")) {
    if (brand && !/^sponsor/i.test(brand)) {
      return `Commercial - ${brand}`;
    }
    return "Commercial - Sponsors";
  }

  const prefix = inferMediaPrefix(chapter, segmentText);

  const title = formatReadableTitle(chapter.title, prefix);
  return `${prefix} - ${title}`;
}

export function buildSegmentLabelsFromSegments(
  segments: TranscriptSegment[],
): SegmentLabelRow[] {
  const chapters = buildContentAwareChapters(segments);

  return chapters.map((ch) => {
    const text = rangeText(segments, ch.start, ch.end);
    const label = formatSegmentLabel(ch, text);
    return {
      start: secToTimecode(ch.start),
      end: secToTimecode(ch.end),
      label,
      startSec: ch.start,
      endSec: ch.end,
    };
  });
}

export async function writeSegmentLabelsJson(
  outputDir: string,
  rows: SegmentLabelRow[],
): Promise<void> {
  const payload = rows.map(({ start, end, label }) => ({ start, end, label }));
  await writeFile(
    join(outputDir, "segment-labels.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
}

export async function writeSegmentLabelsTxt(
  outputDir: string,
  rows: SegmentLabelRow[],
): Promise<void> {
  const lines = [
    "# LosslessCut segment labels — tab-separated (start, end, label)",
    "# Copy each label into the matching segment name field, or use as export filenames.",
    "start\tend\tlabel",
    ...rows.map((r) => `${r.start}\t${r.end}\t${r.label}`),
    "",
    "# Labels only (one per line, in order):",
    ...rows.map((r) => r.label),
    "",
  ];
  await writeFile(join(outputDir, "segment-labels.txt"), lines.join("\n"), "utf8");
}

export async function regenerateSegmentLabels(outputDir: string): Promise<{
  labels: SegmentLabelRow[];
  job: MediaLabJobMeta;
}> {
  const raw = await readFile(join(outputDir, "segments.json"), "utf8");
  const segments = JSON.parse(raw) as TranscriptSegment[];

  const labels = buildSegmentLabelsFromSegments(segments);

  const chapters = labels.map((r) => ({
    start: r.startSec,
    end: r.endSec,
    title: r.label,
  }));
  await writeChaptersCsv(outputDir, chapters);
  await writeSegmentLabelsJson(outputDir, labels);
  await writeSegmentLabelsTxt(outputDir, labels);

  const jobRaw = await readFile(join(outputDir, "job.json"), "utf8");
  const job = JSON.parse(jobRaw) as MediaLabJobMeta;
  job.chapterCount = labels.length;
  job.segmentLabelCount = labels.length;
  const files = new Set(job.files ?? []);
  files.add("chapters.csv");
  files.add("segment-labels.json");
  files.add("segment-labels.txt");
  job.files = [...files];
  await writeFile(join(outputDir, "job.json"), `${JSON.stringify(job, null, 2)}\n`, "utf8");

  return { labels, job };
}
