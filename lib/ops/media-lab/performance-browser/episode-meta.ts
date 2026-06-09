import { existsSync } from "node:fs";
import { readFile } from "fs/promises";

import { MS_COLLECTION_ID, msMetadataPath } from "@/lib/ops/media-collections/midnight-special/paths";
import { episodeManifestPath } from "@/lib/ops/media-collections/paths";

/** Server-only episode metadata — no import from state.ts / download-episode.ts. */
export type EpisodeMetaSnapshot = {
  episode_number?: string;
  download_path?: string;
  duration_sec: number | null;
  download_status: "downloaded" | "missing";
};

export async function loadEpisodeMetaSnapshot(episodeId: string): Promise<EpisodeMetaSnapshot> {
  let episode_number: string | undefined;
  let download_path: string | undefined;
  let duration_sec: number | null = null;

  try {
    const raw = JSON.parse(
      await readFile(episodeManifestPath(MS_COLLECTION_ID, episodeId), "utf8"),
    ) as Record<string, unknown>;
    if (typeof raw.episode_number === "string") episode_number = raw.episode_number;
    if (typeof raw.download_path === "string") download_path = raw.download_path;
    if (typeof raw.duration_seconds === "number") duration_sec = raw.duration_seconds;
  } catch {
    // episode manifest optional
  }

  if (duration_sec == null) {
    try {
      const meta = JSON.parse(await readFile(msMetadataPath(episodeId), "utf8")) as {
        duration?: number;
      };
      if (typeof meta.duration === "number" && meta.duration > 0) {
        duration_sec = meta.duration;
      }
    } catch {
      // ytdlp metadata optional
    }
  }

  const downloaded = Boolean(download_path && existsSync(download_path));

  return {
    episode_number,
    download_path: downloaded ? download_path : undefined,
    duration_sec,
    download_status: downloaded ? "downloaded" : "missing",
  };
}
