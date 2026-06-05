import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import type { EditorialChapter } from "../chapters-csv";
import {
  buildFilmstripCacheKey,
  fileExists,
} from "./filmstrip";
import {
  chapterThumbCacheDir,
  ensureChapterThumbnails,
  THUMB_FILES,
  type ChapterThumbRole,
} from "./chapter-thumbnails";

export type ChapterOcrHint = {
  chapterId: string;
  cacheKey: string;
  rawText: string;
  lines: string[];
  subjects: string[];
  primarySubject: string | null;
  byFrame: { role: ChapterThumbRole; text: string }[];
};

export type ChapterOcrManifest = ChapterOcrHint;

const OCR_STOP = new Set([
  "LIVE",
  "HD",
  "TV",
  "AM",
  "PM",
  "ABC",
  "NBC",
  "CBS",
  "FOX",
  "BBC",
  "CNN",
  "MTV",
  "VH1",
  "USA",
  "THE",
  "AND",
  "FOR",
  "WITH",
  "FROM",
]);

export function ocrCacheDir(outputDir: string, cacheKey: string): string {
  return join(outputDir, "ocr", cacheKey);
}

async function runTesseract(imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [imagePath, "stdout", "--psm", "6", "-l", "eng"];
    const proc = spawn("tesseract", args);
    let out = "";
    let err = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString();
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      err += chunk.toString();
    });
    proc.on("error", (e) => {
      reject(new Error(`tesseract not available: ${e.message}`));
    });
    proc.on("close", (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(err.trim() || `tesseract exited ${code}`));
    });
  });
}

function normalizeOcrLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function titleCaseWord(word: string): string {
  if (/^(II|III|IV|U2)$/i.test(word)) return word.toUpperCase();
  if (word.length <= 3 && word === word.toUpperCase()) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function titleCasePhrase(s: string): string {
  return s.split(/\s+/).map(titleCaseWord).join(" ");
}

/** Extract likely on-screen artist / title strings from OCR output. */
export function parseOcrSubjects(rawText: string): string[] {
  const subjects: string[] = [];
  const seen = new Set<string>();

  function push(subject: string) {
    const key = subject.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    subjects.push(subject);
  }

  for (const line of rawText.split(/\n+/)) {
    const cleaned = normalizeOcrLine(line.replace(/[^A-Za-z0-9\s&'.-]/g, " "));
    if (cleaned.length < 3 || cleaned.length > 42) continue;

    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    if (words.every((w) => OCR_STOP.has(w.toUpperCase()))) continue;

    const mostlyCaps =
      words.filter((w) => /^[A-Z0-9&'.-]+$/.test(w)).length >=
      Math.max(1, Math.ceil(words.length * 0.6));

    if (mostlyCaps && words.length <= 5) {
      const phrase = titleCasePhrase(cleaned);
      if (phrase.length >= 3) push(phrase);
      continue;
    }

    if (words.length === 1 && /^[A-Z]{4,}$/.test(words[0]!)) {
      push(titleCasePhrase(words[0]!));
    }
  }

  return subjects;
}

export function parseOcrText(rawText: string): Pick<ChapterOcrHint, "lines" | "subjects" | "primarySubject"> {
  const lines = rawText
    .split(/\n+/)
    .map(normalizeOcrLine)
    .filter((l) => l.length >= 2);
  const subjects = parseOcrSubjects(rawText);
  return {
    lines,
    subjects,
    primarySubject: subjects[0] ?? null,
  };
}

export async function readChapterOcrManifest(
  outputDir: string,
  cacheKey: string,
): Promise<ChapterOcrManifest | null> {
  const manifestPath = join(ocrCacheDir(outputDir, cacheKey), "ocr.json");
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as ChapterOcrManifest;
  } catch {
    return null;
  }
}

export async function ensureChapterOcr(
  outputDir: string,
  videoPath: string,
  chapterId: string,
  startSec: number,
  endSec: number,
): Promise<ChapterOcrManifest> {
  const cacheKey = buildFilmstripCacheKey(chapterId, startSec, endSec);
  const dir = ocrCacheDir(outputDir, cacheKey);
  await mkdir(dir, { recursive: true });

  const existing = await readChapterOcrManifest(outputDir, cacheKey);
  if (existing?.chapterId === chapterId && existing.rawText.length >= 0 && existing.byFrame.length > 0) {
    return existing;
  }

  await ensureChapterThumbnails(outputDir, videoPath, chapterId, startSec, endSec);
  const thumbDir = chapterThumbCacheDir(outputDir, cacheKey);

  const byFrame: ChapterOcrHint["byFrame"] = [];
  const parts: string[] = [];

  for (const role of ["first", "mid", "last"] as const) {
    const imagePath = join(thumbDir, THUMB_FILES[role]);
    if (!(await fileExists(imagePath))) continue;
    const text = await runTesseract(imagePath);
    byFrame.push({ role, text });
    if (text) parts.push(text);
  }

  const rawText = parts.join("\n");
  const parsed = parseOcrText(rawText);

  const manifest: ChapterOcrManifest = {
    chapterId,
    cacheKey,
    rawText,
    ...parsed,
    byFrame,
  };

  await writeFile(join(dir, "ocr.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

export async function ensureAllChapterOcr(
  outputDir: string,
  videoPath: string,
  chapters: Pick<EditorialChapter, "id" | "startSec" | "endSec">[],
  concurrency = 4,
): Promise<ChapterOcrManifest[]> {
  const out: ChapterOcrManifest[] = new Array(chapters.length);
  let next = 0;

  async function worker() {
    while (next < chapters.length) {
      const idx = next++;
      const ch = chapters[idx];
      out[idx] = await ensureChapterOcr(
        outputDir,
        videoPath,
        ch.id,
        ch.startSec,
        ch.endSec,
      );
    }
  }

  const workers = Math.min(concurrency, Math.max(1, chapters.length));
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return out;
}
