import { join } from "path";

import { retroverseDataRoot } from "@/lib/retroverse-data-root";

export function mediaCoverageRoot(): string {
  return join(retroverseDataRoot(), "virtualdj_media_coverage");
}

export function mediaCoverageScansDir(): string {
  return join(mediaCoverageRoot(), "scans");
}

export function mediaCoverageIndexPath(): string {
  return join(mediaCoverageRoot(), "index.json");
}

export function audioProbeCacheDir(): string {
  return join(mediaCoverageRoot(), "probe-cache", "audio");
}

export function scanPath(scanId: string): string {
  if (!/^[a-zA-Z0-9_-]{8,120}$/.test(scanId)) throw new Error("Invalid scan id");
  return join(mediaCoverageScansDir(), `${scanId}.json`);
}

