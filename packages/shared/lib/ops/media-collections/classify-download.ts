import type { DownloadValidation } from "./validate-download";
import { validateDownloadFile } from "./validate-download";
import { episodeDownloadDir, findPartFile, findVideoFile } from "./download-files";
import type { EpisodeManifest, EpisodeStatus } from "./types";

/** Acquisition health bucket (download pipeline only). */
export type EpisodeAcquireStatus =
  | "downloaded"
  | "partial"
  | "corrupt"
  | "discovered"
  | "failed"
  | "in_progress";

export type EpisodeDownloadInspection = {
  acquireStatus: EpisodeAcquireStatus;
  videoPath: string | null;
  partPath: string | null;
  validation?: DownloadValidation;
};

export type CollectionDownloadHealth = {
  downloaded: number;
  partial: number;
  corrupt: number;
  failed: number;
  discovered: number;
  in_progress: number;
  remaining: number;
  total: number;
};

export function isPendingAcquireStatus(status: EpisodeAcquireStatus): boolean {
  return (
    status === "discovered" ||
    status === "partial" ||
    status === "corrupt" ||
    status === "in_progress"
  );
}

export async function inspectEpisodeDownload(
  collectionId: string,
  episode: EpisodeManifest,
): Promise<EpisodeDownloadInspection> {
  if (episode.status === "failed") {
    return { acquireStatus: "failed", videoPath: null, partPath: null };
  }

  if (episode.status === "queued" || episode.status === "downloading") {
    const dir = episodeDownloadDir(collectionId, episode.id);
    const partPath = await findPartFile(dir);
    const videoPath =
      (episode.download_path && (await findVideoFile(dir)) === episode.download_path
        ? episode.download_path
        : null) ?? (await findVideoFile(dir));

    if (videoPath) {
      const validation = await validateDownloadFile(videoPath);
      if (validation.valid) {
        return { acquireStatus: "downloaded", videoPath, partPath, validation };
      }
    }
    if (partPath) {
      return { acquireStatus: "partial", videoPath, partPath };
    }
    return { acquireStatus: "in_progress", videoPath, partPath: null };
  }

  const dir = episodeDownloadDir(collectionId, episode.id);
  const partPath = await findPartFile(dir);
  let videoPath = episode.download_path ?? null;

  if (videoPath) {
    try {
      const { stat } = await import("fs/promises");
      await stat(videoPath);
    } catch {
      videoPath = null;
    }
  }
  if (!videoPath) {
    videoPath = await findVideoFile(dir);
  }

  if (videoPath) {
    const validation = await validateDownloadFile(videoPath);
    if (validation.valid) {
      return { acquireStatus: "downloaded", videoPath, partPath, validation };
    }
    return { acquireStatus: "corrupt", videoPath, partPath, validation };
  }

  if (partPath) {
    return { acquireStatus: "partial", videoPath: null, partPath };
  }

  if (episode.status === "partial") {
    return { acquireStatus: "partial", videoPath: null, partPath: null };
  }
  if (episode.status === "corrupt") {
    return { acquireStatus: "corrupt", videoPath: null, partPath: null };
  }

  return { acquireStatus: "discovered", videoPath: null, partPath: null };
}

export async function auditCollectionDownloadHealth(
  collectionId: string,
  episodes: EpisodeManifest[],
): Promise<CollectionDownloadHealth> {
  const health: CollectionDownloadHealth = {
    downloaded: 0,
    partial: 0,
    corrupt: 0,
    failed: 0,
    discovered: 0,
    in_progress: 0,
    remaining: 0,
    total: episodes.length,
  };

  for (const ep of episodes) {
    const inspection = await inspectEpisodeDownload(collectionId, ep);
    switch (inspection.acquireStatus) {
      case "downloaded":
        health.downloaded += 1;
        break;
      case "partial":
        health.partial += 1;
        health.remaining += 1;
        break;
      case "corrupt":
        health.corrupt += 1;
        health.remaining += 1;
        break;
      case "failed":
        health.failed += 1;
        break;
      case "in_progress":
        health.in_progress += 1;
        health.remaining += 1;
        break;
      default:
        health.discovered += 1;
        health.remaining += 1;
        break;
    }
  }

  return health;
}

export function acquireStatusToEpisodeStatus(
  acquireStatus: EpisodeAcquireStatus,
): EpisodeStatus {
  if (acquireStatus === "downloaded") return "downloaded";
  if (acquireStatus === "partial") return "partial";
  if (acquireStatus === "corrupt") return "corrupt";
  if (acquireStatus === "failed") return "failed";
  if (acquireStatus === "in_progress") return "downloading";
  return "discovered";
}
