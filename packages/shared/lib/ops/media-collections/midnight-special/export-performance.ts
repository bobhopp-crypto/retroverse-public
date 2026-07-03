import { execFile } from "child_process";
import { access, mkdir, stat } from "fs/promises";
import { join } from "path";
import { promisify } from "util";

import {
  buildExportMetadata,
  buildExportMetadataFromRecord,
  exportGroupingForRecord,
  ffmpegMetadataArgs,
  type MsExportMetadata,
} from "./export-metadata";
import { performanceEffectiveBounds } from "./effective-bounds";
import {
  ensureEpisodePerformances,
  episodeManifestToCandidateShape,
  listAcceptedPerformances,
  updatePerformanceRecord,
} from "./performances";
import { classifyPerformance } from "./classify-segment";
import { msVdjExportDir } from "./paths";
import type { MsPerformanceCandidate, MsPerformanceRecord } from "./types";

const execFileAsync = promisify(execFile);

const FFMPEG_CANDIDATES = [
  "ffmpeg",
  "/opt/homebrew/bin/ffmpeg",
  "/usr/local/bin/ffmpeg",
];

const FFPROBE_CANDIDATES = [
  "ffprobe",
  "/opt/homebrew/bin/ffprobe",
  "/usr/local/bin/ffprobe",
];

const MIN_VALID_BYTES = 50_000;

function sanitizeFilenamePart(text: string | undefined): string {
  return (text ?? "")
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Clean filename — no collection/year suffix (metadata carries collection context). */
export function exportFilename(
  perf: Pick<MsPerformanceCandidate, "artist" | "song">,
  disambiguator?: string,
): string {
  const artist = sanitizeFilenamePart(perf.artist) || "Unknown Artist";
  const song = sanitizeFilenamePart(perf.song) || "Unknown Song";
  const base = `${artist} - ${song}`;
  if (disambiguator) return `${base} [${disambiguator}].mp4`;
  return `${base}.mp4`;
}

async function findBinary(candidates: string[]): Promise<string | null> {
  for (const bin of candidates) {
    try {
      await execFileAsync(bin, ["-version"]);
      return bin;
    } catch {
      // try next
    }
  }
  return null;
}

export type ExportProbeResult = Record<string, string>;

export async function probeExportMetadata(filePath: string): Promise<ExportProbeResult> {
  const ffprobe = await findBinary(FFPROBE_CANDIDATES);
  if (!ffprobe) return {};

  try {
    const { stdout } = await execFileAsync(
      ffprobe,
      [
        "-v",
        "quiet",
        "-show_entries",
        "format_tags=title,artist,album,grouping,date,year",
        "-of",
        "json",
        filePath,
      ],
      { timeout: 30_000 },
    );
    const parsed = JSON.parse(stdout) as { format?: { tags?: ExportProbeResult } };
    return parsed.format?.tags ?? {};
  } catch {
    return {};
  }
}

export function metadataMatchesExport(
  probed: ExportProbeResult,
  expected: MsExportMetadata,
): boolean {
  const album = probed.album?.trim();
  const grouping = probed.grouping?.trim();
  const artist = probed.artist?.trim();
  const title = probed.title?.trim();
  const year = probed.year?.trim() || probed.date?.trim() || "";
  if (album !== expected.album) return false;
  if (grouping !== expected.grouping) return false;
  if (artist !== expected.artist) return false;
  if (title !== expected.title) return false;
  if (expected.year && year !== expected.year) return false;
  return true;
}

export async function isValidExistingExport(
  filePath: string,
  expected: MsExportMetadata,
): Promise<boolean> {
  try {
    const info = await stat(filePath);
    if (info.size < MIN_VALID_BYTES) return false;
    const probed = await probeExportMetadata(filePath);
    return metadataMatchesExport(probed, expected);
  } catch {
    return false;
  }
}

export type ExportResult =
  | {
      ok: true;
      path: string;
      bytes: number;
      duration_sec: number;
      filename: string;
      metadata: MsExportMetadata;
      probed_tags: ExportProbeResult;
      skipped?: boolean;
    }
  | { ok: false; error: string; skipped?: boolean };

async function resolveUniqueOutPath(
  dir: string,
  perf: Pick<MsPerformanceCandidate, "artist" | "song">,
  performanceId: string,
): Promise<{ path: string; filename: string }> {
  const primary = exportFilename(perf);
  const primaryPath = join(dir, primary);
  try {
    await access(primaryPath);
  } catch {
    return { path: primaryPath, filename: primary };
  }

  const suffix = performanceId.split(":").pop() ?? performanceId;
  const filename = exportFilename(perf, suffix);
  return { path: join(dir, filename), filename };
}

export function isMassExportable(record: MsPerformanceRecord): boolean {
  if (record.status !== "accepted" && record.status !== "exported") return false;
  return classifyPerformance(record) !== "UNKNOWN";
}

export async function listMassExportTargets(): Promise<MsPerformanceRecord[]> {
  const rows = await listAcceptedPerformances();
  return rows.filter(isMassExportable);
}

export async function exportAcceptedPerformance(
  episodeId: string,
  performanceId: string,
  opts?: {
    destinationDir?: string;
    dryRun?: boolean;
    force?: boolean;
    record?: MsPerformanceRecord;
  },
): Promise<ExportResult> {
  const episodeManifest = await ensureEpisodePerformances(episodeId);
  if (!episodeManifest) return { ok: false, error: "candidate_manifest_missing" };

  const manifest = episodeManifestToCandidateShape(episodeManifest);
  const perf = manifest.performances.find((p) => p.id === performanceId);
  if (!perf) return { ok: false, error: "performance_not_found" };
  if (perf.review_status !== "accepted" && perf.review_status !== "adjusted") {
    return { ok: false, error: "performance_not_accepted" };
  }

  const record =
    opts?.record ??
    episodeManifest.performances.find((p) => p.performance_id === performanceId);
  if (!record) return { ok: false, error: "performance_record_missing" };
  if (record.status !== "accepted" && record.status !== "exported") {
    return { ok: false, error: "performance_not_accepted" };
  }

  const metadata = buildExportMetadataFromRecord(record, manifest.air_year);
  if (!metadata) return { ok: false, error: "performance_not_exportable" };

  const ffmpeg = await findBinary(FFMPEG_CANDIDATES);
  if (!ffmpeg) return { ok: false, error: "ffmpeg_not_found" };

  const destDir = opts?.destinationDir ?? msVdjExportDir();
  await mkdir(destDir, { recursive: true });

  const existingPath = record.export_path?.trim();
  const { path: outPath, filename } = existingPath
    ? { path: existingPath, filename: existingPath.split("/").pop() ?? exportFilename(perf) }
    : await resolveUniqueOutPath(destDir, perf, performanceId);

  const bounds = performanceEffectiveBounds(record);
  const start = Math.max(0, bounds.start);
  const duration = Math.max(1, bounds.end - bounds.start);

  if (!opts?.force) {
    const valid = await isValidExistingExport(outPath, metadata);
    if (valid) {
      const info = await stat(outPath);
      return {
        ok: true,
        path: outPath,
        bytes: info.size,
        duration_sec: duration,
        filename,
        metadata,
        probed_tags: await probeExportMetadata(outPath),
        skipped: true,
      };
    }
  }

  if (opts?.dryRun) {
    return {
      ok: true,
      path: outPath,
      bytes: 0,
      duration_sec: duration,
      filename,
      metadata,
      probed_tags: {},
    };
  }

  try {
    await execFileAsync(
      ffmpeg,
      [
        "-y",
        "-ss",
        String(start),
        "-i",
        manifest.video_path,
        "-t",
        String(duration),
        "-c",
        "copy",
        "-avoid_negative_ts",
        "make_zero",
        ...ffmpegMetadataArgs(metadata),
        outPath,
      ],
      { timeout: 300_000 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `ffmpeg_failed: ${msg.slice(0, 200)}` };
  }

  try {
    const info = await stat(outPath);
    const probed_tags = await probeExportMetadata(outPath);
    await updatePerformanceRecord(episodeId, performanceId, {
      status: "exported",
      export_path: outPath,
    });
    return {
      ok: true,
      path: outPath,
      bytes: info.size,
      duration_sec: duration,
      filename,
      metadata,
      probed_tags,
    };
  } catch {
    return { ok: false, error: "export_stat_failed" };
  }
}

export async function pickPilotExportTargets(
  limit: number,
): Promise<Array<{ episodeId: string; record: MsPerformanceRecord }>> {
  const accepted = await listMassExportTargets();
  const byEpisode = new Map<string, MsPerformanceRecord[]>();
  for (const row of accepted) {
    if (row.status === "exported") continue;
    const list = byEpisode.get(row.episode_id) ?? [];
    list.push(row);
    byEpisode.set(row.episode_id, list);
  }

  const picked: Array<{ episodeId: string; record: MsPerformanceRecord }> = [];
  const episodes = [...byEpisode.keys()].sort();
  let round = 0;
  while (picked.length < limit && episodes.length > 0) {
    for (const episodeId of episodes) {
      if (picked.length >= limit) break;
      const list = byEpisode.get(episodeId) ?? [];
      const row = list[round];
      if (row) picked.push({ episodeId, record: row });
    }
    round += 1;
    if (round > 50) break;
  }
  return picked.slice(0, limit);
}

export { exportGroupingForRecord };
