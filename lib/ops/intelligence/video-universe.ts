import { isOpsPlayableVideoPath } from "@/lib/ops/ops-video-media";

import { scanVdjDatabase, type VdjLibraryEntry } from "./vdj-database";

/** Paths excluded from intelligence backfill (VIDEO subtree only). */
const VIDEO_PATH_EXCLUDE =
  /\/(karaoke|samples?|stingers?|utility|utilities|scratch|fx)\//i;

/** True when path is under VIDEO/ and eligible for Retroverse intelligence. */
export function isIntelligenceVideoPath(path: string | null | undefined): boolean {
  if (!path || !isOpsPlayableVideoPath(path)) return false;
  if (VIDEO_PATH_EXCLUDE.test(path)) return false;
  return true;
}

export function filterIntelligenceVideos(entries: VdjLibraryEntry[]): VdjLibraryEntry[] {
  return entries.filter((e) => isIntelligenceVideoPath(e.filePath));
}

export async function loadVideoUniverse(): Promise<{
  scannedAt: string;
  parseMs: number;
  allEntries: number;
  videos: VdjLibraryEntry[];
}> {
  const scan = await scanVdjDatabase();
  const videos = filterIntelligenceVideos(scan.entries);
  return {
    scannedAt: scan.scannedAt,
    parseMs: scan.parseMs,
    allEntries: scan.entries.length,
    videos,
  };
}
