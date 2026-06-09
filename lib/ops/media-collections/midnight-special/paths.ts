import { homedir } from "os";
import { join } from "path";

import { collectionDir, collectionSubdir } from "../paths";

export const MS_COLLECTION_ID = "midnight_special";

export function msCandidatesDir(): string {
  return join(collectionDir(MS_COLLECTION_ID), "candidates");
}

export function msPerformancesDir(): string {
  return join(collectionDir(MS_COLLECTION_ID), "performances");
}

export function msPerformanceEpisodesDir(): string {
  return join(msPerformancesDir(), "episodes");
}

export function msPerformanceIndexPath(): string {
  return join(msPerformancesDir(), "index.json");
}

export function msEpisodePerformancePath(episodeId: string): string {
  return join(msPerformanceEpisodesDir(), `${episodeId}.json`);
}

export function msExportsDir(): string {
  return join(collectionDir(MS_COLLECTION_ID), "exports");
}

export function msExportManifestPath(): string {
  return join(collectionDir(MS_COLLECTION_ID), "export-manifest.json");
}

/** VirtualDJ library destination — flat collection folder, no year/artist subfolders. */
export function msVdjExportDir(): string {
  return join(homedir(), "DJ MEDIA", "VIDEO", "TV Performances", "Midnight Special");
}

export function msCandidateManifestPath(episodeId: string): string {
  return join(msCandidatesDir(), `${episodeId}.json`);
}

export function msEpisodeAnalysisReportPath(episodeId: string): string {
  return join(collectionDir(MS_COLLECTION_ID), "reports", `episode-analysis-${episodeId}.json`);
}

export function msStructuredReviewHref(episodeId?: string): string {
  const base = "/ops/media-collections/midnight-special/review";
  return episodeId ? `${base}?episode=${encodeURIComponent(episodeId)}` : base;
}

export function msMetadataPath(episodeId: string): string {
  return join(collectionSubdir(MS_COLLECTION_ID, "metadata"), `${episodeId}.json`);
}

export function msDescriptionPath(episodeId: string): string {
  return join(collectionSubdir(MS_COLLECTION_ID, "descriptions"), `${episodeId}.txt`);
}
