import { spawn } from "node:child_process";

export async function extractClipCopy(
  videoPath: string,
  outPath: string,
  startSec: number,
  endSec: number,
  metadataArgs: string[] = [],
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const args = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      String(startSec),
      "-to",
      String(endSec),
      "-i",
      videoPath,
      "-c",
      "copy",
      "-avoid_negative_ts",
      "1",
      ...metadataArgs,
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
