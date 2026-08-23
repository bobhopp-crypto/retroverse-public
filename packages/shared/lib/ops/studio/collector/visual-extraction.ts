import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { retroverseDataRoot } from "@/lib/retroverse-data-root";

import { bobosVisualAssetsDir, bundledBobosVisualAssetsDir } from "@/lib/bobos/hero/paths";

import { collectorTempDir, collectorVisualAssetsDir } from "./paths";
import type {
  CollectorExtractedVisualAsset,
  CollectorVisualAssetCategory,
  CollectorVisualAssetExtraction,
} from "./types";

const execFileAsync = promisify(execFile);

export const FRAME_INTERVAL_SEC = 20;
export const MAX_CURATED_ASSETS = 5;

const FFMPEG_CANDIDATES = ["ffmpeg", "/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"];
const FFPROBE_CANDIDATES = ["ffprobe", "/opt/homebrew/bin/ffprobe", "/usr/local/bin/ffprobe"];

const CATEGORY_ORDER: CollectorVisualAssetCategory[] = [
  "Hero",
  "Performance",
  "Close-up",
  "Alternate",
  "Crowd",
];

const CATEGORY_FILENAME: Record<CollectorVisualAssetCategory, string> = {
  Hero: "hero.jpg",
  Performance: "performance.jpg",
  "Close-up": "close-up.jpg",
  Alternate: "alternate.jpg",
  Crowd: "crowd.jpg",
};

const CATEGORY_REASON: Record<CollectorVisualAssetCategory, string> = {
  Hero: "Opening representative moment",
  Performance: "Strong performance moment",
  "Close-up": "Sharpest close-up in sequence",
  Alternate: "Visually distinct alternate angle",
  Crowd: "Audience or wide-stage context",
};

type FrameCandidate = {
  tempPath: string;
  timestampSec: number;
  mean: number;
  variance: number;
  sharpness: number;
  width: number;
  height: number;
  fingerprint: Buffer;
};

async function findBinary(candidates: string[]): Promise<string | null> {
  for (const bin of candidates) {
    try {
      await execFileAsync(bin, ["-version"], { timeout: 10_000 });
      return bin;
    } catch {
      // try next
    }
  }
  return null;
}

async function probeDurationSec(videoPath: string): Promise<number | null> {
  const ffprobe = await findBinary(FFPROBE_CANDIDATES);
  if (!ffprobe) return null;

  try {
    const { stdout } = await execFileAsync(
      ffprobe,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        videoPath,
      ],
      { timeout: 60_000 },
    );
    const duration = Number.parseFloat(stdout.trim());
    return Number.isFinite(duration) && duration > 0 ? duration : null;
  } catch {
    return null;
  }
}

/** Probe video duration for performance metadata. */
export async function probeVideoDurationSec(videoPath: string): Promise<number | null> {
  return probeDurationSec(videoPath);
}

function sampleTimestamps(durationSec: number, intervalSec = FRAME_INTERVAL_SEC): number[] {
  const times: number[] = [];
  for (let t = 0; t < durationSec; t += intervalSec) {
    times.push(Math.round(t * 100) / 100);
  }
  if (times.length === 0 && durationSec > 0.5) times.push(0);
  return times;
}

async function extractFrame(
  ffmpeg: string,
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
    const proc = spawn(ffmpeg, args);
    let err = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      err += chunk.toString();
    });
    proc.on("error", (error) => reject(error));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim() || `Frame extraction failed (${code})`));
    });
  });
}

function fingerprintDistance(a: Buffer, b: Buffer): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = a[i]! - b[i]!;
    sum += diff * diff;
  }
  return sum / len;
}

async function analyzeFrame(tempPath: string, timestampSec: number): Promise<FrameCandidate | null> {
  try {
    const [meta, stats, fingerprint] = await Promise.all([
      sharp(tempPath).metadata(),
      sharp(tempPath).stats(),
      sharp(tempPath).resize(16, 16, { fit: "fill" }).grayscale().raw().toBuffer(),
    ]);

    const channel = stats.channels[0];
    if (!channel) return null;

    return {
      tempPath,
      timestampSec,
      mean: channel.mean,
      variance: channel.stdev ** 2,
      sharpness: channel.stdev,
      width: meta.width ?? 0,
      height: meta.height ?? 0,
      fingerprint,
    };
  } catch {
    return null;
  }
}

function isDiscardable(frame: FrameCandidate): boolean {
  if (frame.mean < 18) return true;
  if (frame.variance < 90) return true;
  if (frame.sharpness < 12) return true;
  if (frame.width < 32 || frame.height < 32) return true;
  return false;
}

function fingerprintDistanceNormalized(a: Buffer, b: Buffer): number {
  return fingerprintDistance(a, b);
}

function assignCategories(frames: FrameCandidate[]): CollectorVisualAssetCategory[] {
  if (frames.length === 0) return [];
  const remaining = new Set(frames);
  const assignments = new Map<FrameCandidate, CollectorVisualAssetCategory>();

  let closeUp: FrameCandidate | null = null;
  for (const f of frames) {
    if (!closeUp || f.sharpness > closeUp.sharpness) closeUp = f;
  }
  if (closeUp) {
    assignments.set(closeUp, "Close-up");
    remaining.delete(closeUp);
  }

  let hero: FrameCandidate | null = null;
  for (const f of remaining) {
    const score = f.sharpness * 0.6 + Math.min(f.mean, 160) * 0.02;
    if (!hero || score > (hero.sharpness * 0.6 + Math.min(hero.mean, 160) * 0.02)) hero = f;
  }
  if (hero) {
    assignments.set(hero, "Hero");
    remaining.delete(hero);
  }

  let performance: FrameCandidate | null = null;
  if (hero) {
    for (const f of remaining) {
      const timeGap = Math.abs(f.timestampSec - hero.timestampSec);
      const score = timeGap * 0.4 + f.sharpness * 0.5;
      if (!performance || score > (Math.abs(performance.timestampSec - hero.timestampSec) * 0.4 + performance.sharpness * 0.5)) {
        performance = f;
      }
    }
  } else {
    performance = [...remaining].sort((a, b) => b.sharpness - a.sharpness)[0] ?? null;
  }
  if (performance) {
    assignments.set(performance, "Performance");
    remaining.delete(performance);
  }

  let alternate: FrameCandidate | null = null;
  if (hero) {
    for (const f of remaining) {
      const dist = fingerprintDistanceNormalized(f.fingerprint, hero.fingerprint);
      if (!alternate || dist > fingerprintDistanceNormalized(alternate.fingerprint, hero.fingerprint)) {
        alternate = f;
      }
    }
  } else {
    alternate = [...remaining][0] ?? null;
  }
  if (alternate) {
    assignments.set(alternate, "Alternate");
    remaining.delete(alternate);
  }

  for (const f of remaining) {
    assignments.set(f, "Crowd");
  }

  return frames.map((f) => assignments.get(f) ?? "Crowd");
}

function dedupeFrames(frames: FrameCandidate[]): FrameCandidate[] {
  const kept: FrameCandidate[] = [];

  for (const frame of frames) {
    let replaced = false;
    for (let i = 0; i < kept.length; i++) {
      const existing = kept[i]!;
      if (fingerprintDistance(frame.fingerprint, existing.fingerprint) < 120) {
        if (frame.sharpness > existing.sharpness) kept[i] = frame;
        replaced = true;
        break;
      }
    }
    if (!replaced) kept.push(frame);
  }

  return kept;
}

function selectDiverseFrames(frames: FrameCandidate[], maxCount: number): FrameCandidate[] {
  if (frames.length <= maxCount) return frames;

  const sorted = [...frames].sort((a, b) => a.timestampSec - b.timestampSec);
  const selected: FrameCandidate[] = [sorted[0]!];

  while (selected.length < maxCount) {
    let best: FrameCandidate | null = null;
    let bestScore = -1;

    for (const candidate of sorted) {
      if (selected.includes(candidate)) continue;
      const minDistance = Math.min(
        ...selected.map((picked) => Math.abs(picked.timestampSec - candidate.timestampSec)),
      );
      const score = minDistance + candidate.sharpness * 0.05;
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    if (!best) break;
    selected.push(best);
  }

  return selected.sort((a, b) => a.timestampSec - b.timestampSec);
}

function emptyExtraction(
  skipped: boolean,
  skipReason: string | null,
  sourceVideo: string | null = null,
): CollectorVisualAssetExtraction {
  return {
    skipped,
    skipReason,
    sourceVideo,
    frameIntervalSec: FRAME_INTERVAL_SEC,
    extractedCount: 0,
    assets: [],
  };
}

export async function extractVisualAssets(input: {
  rvtr: string;
  videoPath: string | null;
  onProgress?: (message: string) => Promise<void>;
}): Promise<CollectorVisualAssetExtraction> {
  const rvtr = input.rvtr.trim().toUpperCase();
  const videoPath = input.videoPath?.trim() ?? null;

  if (!videoPath || !existsSync(videoPath)) {
    return emptyExtraction(true, "No local performance video available");
  }

  const ffmpeg = await findBinary(FFMPEG_CANDIDATES);
  if (!ffmpeg) {
    return emptyExtraction(true, "Video tools unavailable — skipped", videoPath);
  }

  const durationSec = await probeDurationSec(videoPath);
  if (!durationSec) {
    return emptyExtraction(true, "Could not read video duration", videoPath);
  }

  const tempDir = collectorTempDir(rvtr);
  const assetsDir = collectorVisualAssetsDir(rvtr);
  await rm(tempDir, { recursive: true, force: true });
  await rm(assetsDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });

  await input.onProgress?.("Preparing visual reference library…");

  const timestamps = sampleTimestamps(durationSec);
  const tempFrames: FrameCandidate[] = [];

  await input.onProgress?.("Extracting representative frames…");

  for (const timestampSec of timestamps) {
    const tempName = `frame_${String(Math.round(timestampSec * 1000)).padStart(8, "0")}.jpg`;
    const tempPath = join(tempDir, tempName);
    try {
      await extractFrame(ffmpeg, videoPath, tempPath, timestampSec);
      const analyzed = await analyzeFrame(tempPath, timestampSec);
      if (analyzed && !isDiscardable(analyzed)) {
        tempFrames.push(analyzed);
      } else {
        await rm(tempPath, { force: true });
      }
    } catch {
      await rm(tempPath, { force: true });
    }
  }

  if (tempFrames.length === 0) {
    await rm(tempDir, { recursive: true, force: true });
    return emptyExtraction(true, "No usable frames found in video", videoPath);
  }

  await input.onProgress?.("Selecting best visual moments…");

  const deduped = dedupeFrames(tempFrames);
  const curated = selectDiverseFrames(deduped, MAX_CURATED_ASSETS);
  const categories = assignCategories(curated);

  await input.onProgress?.("Curating visual assets…");

  const assets: CollectorExtractedVisualAsset[] = [];
  const capturedAt = new Date().toISOString();

  for (let index = 0; index < curated.length; index++) {
    const frame = curated[index]!;
    const category = categories[index] ?? CATEGORY_ORDER[index];
    if (!category) break;

    const filename = CATEGORY_FILENAME[category];
    const destPath = join(assetsDir, filename);
    await copyFile(frame.tempPath, destPath);

    assets.push({
      id: createHash("sha256").update(`${rvtr}:${filename}`).digest("hex").slice(0, 12),
      category,
      filename,
      timestampSec: frame.timestampSec,
      width: frame.width,
      height: frame.height,
      selectionReason: CATEGORY_REASON[category],
      capturedAt,
    });
  }

  await rm(tempDir, { recursive: true, force: true });

  return {
    skipped: false,
    skipReason: null,
    sourceVideo: videoPath,
    frameIntervalSec: FRAME_INTERVAL_SEC,
    extractedCount: assets.length,
    assets,
  };
}

export async function listVisualAssetFiles(rvtr: string): Promise<string[]> {
  const dir = collectorVisualAssetsDir(rvtr);
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  return entries.filter((name) => name.endsWith(".jpg"));
}

export async function resolveVisualAssetPath(
  rvtr: string,
  filename: string,
): Promise<string | null> {
  if (!/^[a-z0-9-]+\.jpg$/i.test(filename)) return null;
  const id = rvtr.trim().toUpperCase();
  const candidates = [
    join(bobosVisualAssetsDir(id), filename),
    join(bundledBobosVisualAssetsDir(id), filename),
    join(collectorVisualAssetsDir(id), filename),
    join(retroverseDataRoot(), "bobos", "presentation-assets", "woodstock", id, filename),
    join(process.cwd(), "data", "bobos", "presentation-assets", "woodstock", `VDJ-${id.slice(4).toLowerCase()}`, filename),
    join(retroverseDataRoot(), "bobos", "presentation-assets", "woodstock", `VDJ-${id.slice(4).toLowerCase()}`, filename),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const info = await stat(path);
    if (info.isFile()) return path;
  }
  return null;
}
