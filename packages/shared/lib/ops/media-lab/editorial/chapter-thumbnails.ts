import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import type { EditorialChapter } from "../chapters-csv";
import {
  buildFilmstripCacheKey,
  extractFrame,
  fileExists,
} from "./filmstrip";

export type ChapterThumbRole = "first" | "mid" | "last";

export type ChapterThumbFrame = {
  role: ChapterThumbRole;
  sec: number;
  file: string;
};

export type ChapterThumbManifest = {
  chapterId: string;
  startSec: number;
  endSec: number;
  cacheKey: string;
  frames: ChapterThumbFrame[];
};

const THUMB_FILES: Record<ChapterThumbRole, string> = {
  first: "first.jpg",
  mid: "mid.jpg",
  last: "last.jpg",
};

export function chapterThumbCacheDir(outputDir: string, cacheKey: string): string {
  return join(outputDir, "thumbnails", cacheKey);
}

export function chapterThumbTimes(
  startSec: number,
  endSec: number,
): Record<ChapterThumbRole, number> {
  const dur = endSec - startSec;
  if (dur <= 0.15) {
    const t = Math.round(startSec * 100) / 100;
    return { first: t, mid: t, last: t };
  }
  return {
    first: Math.round((startSec + 0.08) * 100) / 100,
    mid: Math.round((startSec + dur / 2) * 100) / 100,
    last: Math.round((endSec - 0.08) * 100) / 100,
  };
}

export async function readChapterThumbManifest(
  outputDir: string,
  cacheKey: string,
): Promise<ChapterThumbManifest | null> {
  const manifestPath = join(chapterThumbCacheDir(outputDir, cacheKey), "manifest.json");
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as ChapterThumbManifest;
  } catch {
    return null;
  }
}

export async function ensureChapterThumbnails(
  outputDir: string,
  videoPath: string,
  chapterId: string,
  startSec: number,
  endSec: number,
): Promise<ChapterThumbManifest> {
  const cacheKey = buildFilmstripCacheKey(chapterId, startSec, endSec);
  const dir = chapterThumbCacheDir(outputDir, cacheKey);
  await mkdir(dir, { recursive: true });

  const times = chapterThumbTimes(startSec, endSec);
  const existing = await readChapterThumbManifest(outputDir, cacheKey);
  if (
    existing &&
    existing.chapterId === chapterId &&
    Math.abs(existing.startSec - startSec) < 0.01 &&
    Math.abs(existing.endSec - endSec) < 0.01
  ) {
    const complete = await Promise.all(
      existing.frames.map((f) => fileExists(join(dir, f.file))),
    );
    if (complete.every(Boolean)) return existing;
  }

  const frames: ChapterThumbFrame[] = [];
  for (const role of ["first", "mid", "last"] as const) {
    const file = THUMB_FILES[role];
    const sec = times[role];
    const outPath = join(dir, file);
    if (!(await fileExists(outPath))) {
      await extractFrame(videoPath, outPath, sec);
    }
    frames.push({ role, sec, file });
  }

  const manifest: ChapterThumbManifest = {
    chapterId,
    startSec,
    endSec,
    cacheKey,
    frames,
  };
  await writeFile(join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

export async function ensureAllChapterThumbnails(
  outputDir: string,
  videoPath: string,
  chapters: Pick<EditorialChapter, "id" | "startSec" | "endSec">[],
  concurrency = 6,
): Promise<ChapterThumbManifest[]> {
  const out: ChapterThumbManifest[] = new Array(chapters.length);
  let next = 0;

  async function worker() {
    while (next < chapters.length) {
      const idx = next++;
      const ch = chapters[idx];
      out[idx] = await ensureChapterThumbnails(
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

export { THUMB_FILES };
