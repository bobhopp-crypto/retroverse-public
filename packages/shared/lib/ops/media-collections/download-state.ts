import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { collectionDir } from "./paths";
import { listEpisodes } from "./state";
import type { EpisodeManifest } from "./types";

const NOW = () => new Date().toISOString();

export type DownloadRunState = {
  version: 1;
  collection_id: string;
  running: boolean;
  started_at: string;
  updated_at: string;
  current_episode_id?: string;
  current_episode_title?: string;
  queued: number;
  downloading: number;
  downloaded: number;
  failed: number;
  remaining: number;
  total: number;
  completed_this_run: number;
  failed_this_run: number;
  last_error?: string;
  limit?: number;
};

function downloadRunPath(collectionId: string): string {
  return join(collectionDir(collectionId), "download-run.json");
}

function countByStatus(episodes: EpisodeManifest[]) {
  return {
    queued: episodes.filter((e) => e.status === "queued").length,
    downloading: episodes.filter((e) => e.status === "downloading").length,
    downloaded: episodes.filter((e) => e.downloaded).length,
    failed: episodes.filter((e) => e.status === "failed").length,
    remaining: episodes.filter((e) => !e.downloaded && e.status !== "failed").length,
    total: episodes.length,
  };
}

export async function loadDownloadRunState(
  collectionId: string,
): Promise<DownloadRunState | null> {
  try {
    const raw = JSON.parse(
      await readFile(downloadRunPath(collectionId), "utf8"),
    ) as DownloadRunState;
    if (raw?.version === 1 && raw.collection_id === collectionId) return raw;
  } catch {
    // no state yet
  }
  return null;
}

export async function saveDownloadRunState(state: DownloadRunState): Promise<void> {
  await mkdir(collectionDir(state.collection_id), { recursive: true });
  await writeFile(
    downloadRunPath(state.collection_id),
    `${JSON.stringify({ ...state, version: 1, updated_at: NOW() }, null, 2)}\n`,
    "utf8",
  );
}

function isStaleRun(run: DownloadRunState): boolean {
  if (!run.running) return false;
  const age = Date.now() - new Date(run.updated_at).getTime();
  return age > 20 * 60 * 1000;
}

export async function buildDownloadProgress(
  collectionId: string,
  run?: DownloadRunState | null,
): Promise<DownloadRunState> {
  const episodes = await listEpisodes(collectionId);
  const counts = countByStatus(episodes);

  let running = run?.running ?? false;
  if (run && run.running && isStaleRun(run)) {
    running = false;
    await saveDownloadRunState({ ...run, running: false, downloading: 0 });
  }

  return {
    version: 1,
    collection_id: collectionId,
    running,
    started_at: run?.started_at ?? NOW(),
    updated_at: NOW(),
    current_episode_id: run?.current_episode_id,
    current_episode_title: run?.current_episode_title,
    queued: counts.queued,
    downloading: counts.downloading,
    downloaded: counts.downloaded,
    failed: counts.failed,
    remaining: counts.remaining,
    total: counts.total,
    completed_this_run: run?.completed_this_run ?? 0,
    failed_this_run: run?.failed_this_run ?? 0,
    last_error: run?.last_error,
    limit: run?.limit,
  };
}

export async function resetStaleDownloadStates(collectionId: string): Promise<void> {
  const episodes = await listEpisodes(collectionId);
  const { saveEpisode } = await import("./state");
  const { isEpisodeDownloaded } = await import("./download-episode");

  for (const ep of episodes) {
    if (ep.status === "queued" || ep.status === "downloading") {
      const done = await isEpisodeDownloaded(collectionId, ep);
      if (done) continue;
      await saveEpisode({
        ...ep,
        status: "discovered",
        updated_at: NOW(),
      });
    }
  }
}
