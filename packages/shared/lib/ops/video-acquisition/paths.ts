import { existsSync } from "fs";
import { join, resolve, sep } from "path";

import { retroverseDataRoot } from "@/lib/retroverse-data-root";

export const PRODUCTION_VIDEO_ROOT = "/Users/bobhopp/DJ MEDIA/VIDEO";
export const PRODUCTION_UNSORTED_FOLDER = "order";

const RVTR_RE = /^RVTR\d{6}$/i;

export function normalizeRvtrParam(rvtr: string): string | null {
  const normalized = rvtr.trim().toUpperCase();
  return RVTR_RE.test(normalized) ? normalized : null;
}

export function videoAcquisitionRoot(): string {
  return join(retroverseDataRoot(), "video_acquisition");
}

export function acquisitionManifestsDir(): string {
  return join(videoAcquisitionRoot(), "manifests");
}

export function acquisitionBatchesDir(): string {
  return join(videoAcquisitionRoot(), "batches");
}

export function batchManifestPath(batchId: string): string {
  return join(acquisitionBatchesDir(), `${batchId.trim()}.json`);
}

export function manifestPathForRvtr(rvtr: string): string {
  return join(acquisitionManifestsDir(), `${rvtr.trim().toUpperCase()}.json`);
}

export function stagingDirForRvtr(rvtr: string): string {
  return join(videoAcquisitionRoot(), "staging", rvtr.trim().toUpperCase());
}

export function isPathInsideRoot(absPath: string, root: string): boolean {
  const resolved = resolve(absPath);
  const resolvedRoot = resolve(root);
  return resolved === resolvedRoot || resolved.startsWith(resolvedRoot + sep);
}

export function assertStagingPath(absPath: string, rvtr: string): void {
  const staging = stagingDirForRvtr(rvtr);
  if (!isPathInsideRoot(absPath, staging)) {
    throw new Error("Path is outside the acquisition staging directory.");
  }
}

export function assertProductionVideoPath(absPath: string): void {
  if (!isPathInsideRoot(absPath, PRODUCTION_VIDEO_ROOT)) {
    throw new Error("Path is outside the production video library.");
  }
}

export function decadeFolderForYear(year: number | null | undefined): string {
  if (typeof year === "number" && year >= 1900 && year < 2100) {
    const decade = Math.floor(year / 10) * 10;
    return `${decade}'s`;
  }
  return PRODUCTION_UNSORTED_FOLDER;
}

export function productionFolderForYear(year: number | null | undefined): string {
  const folder = decadeFolderForYear(year);
  const full = join(PRODUCTION_VIDEO_ROOT, folder);
  if (!existsSync(PRODUCTION_VIDEO_ROOT)) {
    throw new Error(`Production video root not found: ${PRODUCTION_VIDEO_ROOT}`);
  }
  return full;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function isAllowedYoutubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();
    if (host === "youtu.be") return parsed.pathname.length > 1;
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      return (
        parsed.pathname === "/watch" ||
        parsed.pathname.startsWith("/shorts/") ||
        parsed.pathname.startsWith("/live/")
      );
    }
    return false;
  } catch {
    return false;
  }
}
