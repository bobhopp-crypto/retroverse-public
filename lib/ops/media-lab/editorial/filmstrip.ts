import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { access, mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

export const FILMSTRIP_INTERVAL_SEC = 10;

export type FilmstripManifest = {
  chapterId: string;
  startSec: number;
  endSec: number;
  intervalSec: number;
  cacheKey: string;
  frames: { sec: number; file: string }[];
};

export function buildFilmstripCacheKey(
  chapterId: string,
  startSec: number,
  endSec: number,
): string {
  const safeId = chapterId.replace(/[^a-z0-9_-]/gi, "") || "chapter";
  return `${safeId}_${Math.round(startSec * 1000)}_${Math.round(endSec * 1000)}`;
}

export function filmstripCacheDir(outputDir: string, cacheKey: string): string {
  return join(outputDir, "filmstrip", cacheKey);
}

export function frameFilename(sec: number): string {
  return `frame_${String(Math.round(sec * 1000)).padStart(8, "0")}.jpg`;
}

export function filmstripTimes(
  startSec: number,
  endSec: number,
  intervalSec = FILMSTRIP_INTERVAL_SEC,
): number[] {
  const times: number[] = [];
  if (endSec <= startSec + 0.05) return times;
  for (let t = startSec; t < endSec - 0.05; t += intervalSec) {
    times.push(Math.round(t * 100) / 100);
  }
  return times;
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function extractFrame(
  videoPath: string,
  outPath: string,
  sec: number,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const args = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      String(sec),
      "-i",
      videoPath,
      "-frames:v",
      "1",
      "-q:v",
      "4",
      "-y",
      outPath,
    ];
    const proc = spawn("ffmpeg", args);
    let err = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      err += chunk.toString();
    });
    proc.on("error", (e) => {
      reject(new Error(`ffmpeg not available: ${e.message}`));
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim() || `ffmpeg exited ${code}`));
    });
  });
}

export async function readFilmstripManifest(
  outputDir: string,
  cacheKey: string,
): Promise<FilmstripManifest | null> {
  const manifestPath = join(filmstripCacheDir(outputDir, cacheKey), "manifest.json");
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as FilmstripManifest;
  } catch {
    return null;
  }
}

export async function ensureFilmstrip(
  outputDir: string,
  videoPath: string,
  chapterId: string,
  startSec: number,
  endSec: number,
): Promise<FilmstripManifest> {
  const cacheKey = buildFilmstripCacheKey(chapterId, startSec, endSec);
  const dir = filmstripCacheDir(outputDir, cacheKey);
  await mkdir(dir, { recursive: true });

  const existing = await readFilmstripManifest(outputDir, cacheKey);
  if (
    existing &&
    existing.chapterId === chapterId &&
    Math.abs(existing.startSec - startSec) < 0.01 &&
    Math.abs(existing.endSec - endSec) < 0.01 &&
    existing.frames.length > 0
  ) {
    const complete = await Promise.all(
      existing.frames.map((f) => fileExists(join(dir, f.file))),
    );
    if (complete.every(Boolean)) return existing;
  }

  const times = filmstripTimes(startSec, endSec);
  const frames: { sec: number; file: string }[] = [];

  for (const sec of times) {
    const file = frameFilename(sec);
    const outPath = join(dir, file);
    if (!(await fileExists(outPath))) {
      await extractFrame(videoPath, outPath, sec);
    }
    frames.push({ sec, file });
  }

  const manifest: FilmstripManifest = {
    chapterId,
    startSec,
    endSec,
    intervalSec: FILMSTRIP_INTERVAL_SEC,
    cacheKey,
    frames,
  };
  await writeFile(join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

export function openFilmstripFrameStream(
  outputDir: string,
  cacheKey: string,
  file: string,
) {
  if (!/^[a-z0-9_-]+$/i.test(cacheKey)) {
    throw new Error("Invalid cache key");
  }
  if (!/^frame_\d+\.jpg$/i.test(file)) {
    throw new Error("Invalid frame file");
  }
  const path = join(filmstripCacheDir(outputDir, cacheKey), file);
  if (!existsSync(path)) {
    throw new Error("Frame not found");
  }
  return createReadStream(path);
}
