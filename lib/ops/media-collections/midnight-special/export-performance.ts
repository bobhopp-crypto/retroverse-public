import { execFile } from "child_process";
import { mkdir, stat } from "fs/promises";
import { join } from "path";
import { promisify } from "util";

import {
  ensureEpisodePerformances,
  episodeManifestToCandidateShape,
  updatePerformanceRecord,
} from "./performances";
import { msExportsDir } from "./paths";
import type { MsPerformanceCandidate } from "./types";

const execFileAsync = promisify(execFile);

const FFMPEG_CANDIDATES = [
  "ffmpeg",
  "/opt/homebrew/bin/ffmpeg",
  "/usr/local/bin/ffmpeg",
];

function sanitizeFilenamePart(text: string): string {
  return text
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function exportFilename(perf: MsPerformanceCandidate, airYear?: number): string {
  const year = airYear ?? new Date().getFullYear();
  const artist = sanitizeFilenamePart(perf.artist) || "Unknown Artist";
  const song = sanitizeFilenamePart(perf.song) || "Unknown Song";
  return `${artist} - ${song} (Midnight Special ${year}).mp4`;
}

async function findFfmpeg(): Promise<string | null> {
  for (const bin of FFMPEG_CANDIDATES) {
    try {
      await execFileAsync(bin, ["-version"]);
      return bin;
    } catch {
      // try next
    }
  }
  return null;
}

export type ExportResult =
  | {
      ok: true;
      path: string;
      bytes: number;
      duration_sec: number;
      filename: string;
    }
  | { ok: false; error: string };

export async function exportAcceptedPerformance(
  episodeId: string,
  performanceId: string,
): Promise<ExportResult> {
  const episodeManifest = await ensureEpisodePerformances(episodeId);
  if (!episodeManifest) return { ok: false, error: "candidate_manifest_missing" };

  const manifest = episodeManifestToCandidateShape(episodeManifest);
  const perf = manifest.performances.find((p) => p.id === performanceId);
  if (!perf) return { ok: false, error: "performance_not_found" };
  if (perf.review_status !== "accepted" && perf.review_status !== "adjusted") {
    return { ok: false, error: "performance_not_accepted" };
  }

  const record = episodeManifest.performances.find((p) => p.performance_id === performanceId);
  if (record?.status !== "accepted" && record?.status !== "exported") {
    return { ok: false, error: "performance_not_accepted" };
  }

  const ffmpeg = await findFfmpeg();
  if (!ffmpeg) return { ok: false, error: "ffmpeg_not_found" };

  await mkdir(msExportsDir(), { recursive: true });
  const filename = exportFilename(perf, manifest.air_year);
  const outPath = join(msExportsDir(), filename);

  const start = Math.max(0, perf.start_sec);
  const duration = Math.max(1, perf.end_sec - perf.start_sec);

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
    };
  } catch {
    return { ok: false, error: "export_stat_failed" };
  }
}
