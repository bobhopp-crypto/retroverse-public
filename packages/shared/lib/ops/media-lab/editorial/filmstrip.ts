import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { access, mkdir, readFile, readdir, rename, writeFile } from "fs/promises";
import { join } from "path";

export const FILMSTRIP_INTERVAL_SEC = 10;

export type FilmstripManifest = {
  chapterId: string;
  startSec: number;
  endSec: number;
  intervalSec: number;
  cacheKey: string;
  sourceFingerprint?: string;
  profile?: string;
  frames: { sec: number; file: string }[];
};

export function buildFilmstripCacheKey(
  chapterId: string,
  startSec: number,
  endSec: number,
  sourceFingerprint = "",
  profile = "chapter",
): string {
  const safeId = chapterId.replace(/[^a-z0-9_-]/gi, "") || "chapter";
  const safeProfile = profile.replace(/[^a-z0-9_-]/gi, "") || "chapter";
  const safeFingerprint = sourceFingerprint.replace(/[^a-f0-9]/gi, "").slice(0, 16) || "nofingerprint";
  return `${safeProfile}_${safeId}_${safeFingerprint}_${Math.round(startSec * 1000)}_${Math.round(endSec * 1000)}`;
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
      "-strict",
      "unofficial",
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
  options: { sourceFingerprint?: string; profile?: string; count?: number } = {},
): Promise<FilmstripManifest> {
  const profile = options.profile ?? "chapter";
  const sourceFingerprint = options.sourceFingerprint ?? "";
  const cacheKey = buildFilmstripCacheKey(chapterId, startSec, endSec, sourceFingerprint, profile);
  const dir = filmstripCacheDir(outputDir, cacheKey);
  await mkdir(dir, { recursive: true });

  const existing = await readFilmstripManifest(outputDir, cacheKey);
  if (
    existing &&
    existing.chapterId === chapterId &&
    existing.sourceFingerprint === sourceFingerprint &&
    existing.profile === profile &&
    Math.abs(existing.startSec - startSec) < 0.01 &&
    Math.abs(existing.endSec - endSec) < 0.01 &&
    existing.frames.length > 0
  ) {
    const complete = await Promise.all(
      existing.frames.map((f) => fileExists(join(dir, f.file))),
    );
    if (complete.every(Boolean)) return existing;
    const availableFrames = existing.frames.filter((_, index) => complete[index]);
    if (availableFrames.length >= 2) {
      return { ...existing, frames: availableFrames };
    }
  }

  if (!existing) {
    const cachedFiles = (await readdir(dir).catch(() => []))
      .filter((file) => /^frame_\d+\.jpg$/i.test(file))
      .sort();
    const cachedFrames = (
      await Promise.all(
        cachedFiles.map(async (file) => ({
          file,
          available: await fileExists(join(dir, file)),
          sec: Number(file.match(/^frame_(\d+)\.jpg$/i)?.[1] ?? "0") / 1000,
        })),
      )
    )
      .filter((frame) => frame.available)
      .map(({ file, sec }) => ({ file, sec }));
    if (cachedFrames.length >= 2) {
      const recovered: FilmstripManifest = {
        chapterId,
        startSec,
        endSec,
        intervalSec: FILMSTRIP_INTERVAL_SEC,
        cacheKey,
        sourceFingerprint,
        profile,
        frames: cachedFrames,
      };
      const manifestPath = join(dir, "manifest.json");
      const temporaryPath = join(dir, `.manifest-${process.pid}-${Date.now()}.json`);
      await writeFile(temporaryPath, `${JSON.stringify(recovered, null, 2)}\n`, "utf8");
      await rename(temporaryPath, manifestPath);
      return recovered;
    }
  }

  const count = Math.max(2, Math.min(48, Math.round(options.count ?? Math.ceil((endSec - startSec) / FILMSTRIP_INTERVAL_SEC))));
  const safeEndSec = Math.max(startSec, endSec - Math.min(0.05, (endSec - startSec) / 100));
  const times = Array.from({ length: count }, (_, index) => Math.round((startSec + ((safeEndSec - startSec) * index) / (count - 1)) * 1000) / 1000);
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
    sourceFingerprint,
    profile,
    frames,
  };
  const manifestPath = join(dir, "manifest.json");
  const temporaryPath = join(dir, `.manifest-${process.pid}-${Date.now()}.json`);
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await rename(temporaryPath, manifestPath);
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
