import { execFile } from "child_process";
import { stat } from "fs/promises";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const MIN_DOWNLOAD_BYTES = 1024 * 1024;

const FFPROBE_CANDIDATES = [
  "ffprobe",
  "/opt/homebrew/bin/ffprobe",
  "/usr/local/bin/ffprobe",
];

let cachedFfprobe: string | null | undefined;

export type DownloadValidation = {
  valid: boolean;
  durationSeconds?: number;
  reason?: string;
};

export async function findFfprobe(): Promise<string | null> {
  if (cachedFfprobe !== undefined) return cachedFfprobe;
  for (const bin of FFPROBE_CANDIDATES) {
    try {
      await execFileAsync(bin, ["-version"]);
      cachedFfprobe = bin;
      return bin;
    } catch {
      // try next
    }
  }
  cachedFfprobe = null;
  return null;
}

export async function validateDownloadFile(filePath: string): Promise<DownloadValidation> {
  try {
    const info = await stat(filePath);
    if (info.size <= MIN_DOWNLOAD_BYTES) {
      return { valid: false, reason: `file_too_small (${info.size} bytes)` };
    }
  } catch {
    return { valid: false, reason: "file_missing" };
  }

  const ffprobe = await findFfprobe();
  if (!ffprobe) {
    return { valid: false, reason: "ffprobe_not_found" };
  }

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
        filePath,
      ],
      { timeout: 30_000 },
    );
    const durationSeconds = Number.parseFloat(stdout.trim());
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      return { valid: false, reason: "invalid_duration" };
    }
    return { valid: true, durationSeconds };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { valid: false, reason: `ffprobe_failed: ${msg.slice(0, 120)}` };
  }
}
