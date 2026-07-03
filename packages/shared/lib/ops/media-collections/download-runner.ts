import { downloadEpisode } from "./download-episode";
import {
  buildDownloadProgress,
  loadDownloadRunState,
  resetStaleDownloadStates,
  saveDownloadRunState,
  type DownloadRunState,
} from "./download-state";
import { listEpisodes } from "./state";
import { isEpisodeDownloaded } from "./download-episode";
import type { EpisodeManifest } from "./types";

const NOW = () => new Date().toISOString();

function isFullEpisode(ep: EpisodeManifest): boolean {
  return /\bEp(?:isode)?\s*\d+/i.test(ep.title);
}

function comparePending(a: EpisodeManifest, b: EpisodeManifest): number {
  const aFull = isFullEpisode(a);
  const bFull = isFullEpisode(b);
  if (aFull !== bFull) return aFull ? -1 : 1;

  const ad = a.duration_seconds ?? 0;
  const bd = b.duration_seconds ?? 0;
  if (ad !== bd) return bd - ad;

  const ai = a.playlist_index ?? Number.MAX_SAFE_INTEGER;
  const bi = b.playlist_index ?? Number.MAX_SAFE_INTEGER;
  return ai - bi;
}

export type DownloadRunnerResult = {
  ok: boolean;
  collection_id: string;
  completed: number;
  failed: number;
  skipped: number;
  stopped_reason: "complete" | "limit" | "already_running" | "no_pending";
  error?: string;
};

async function pendingEpisodes(collectionId: string) {
  const episodes = await listEpisodes(collectionId);
  const pending = [];
  for (const ep of episodes) {
    if (ep.status === "failed") continue;
    if (await isEpisodeDownloaded(collectionId, ep)) continue;
    pending.push(ep);
  }
  pending.sort(comparePending);
  return pending;
}

export async function runDownloadMissing(
  collectionId: string,
  opts?: { limit?: number },
): Promise<DownloadRunnerResult> {
  const limit = opts?.limit && opts.limit > 0 ? opts.limit : undefined;

  const existing = await loadDownloadRunState(collectionId);
  if (existing?.running) {
    return {
      ok: false,
      collection_id: collectionId,
      completed: 0,
      failed: 0,
      skipped: 0,
      stopped_reason: "already_running",
      error: "Download run already in progress",
    };
  }

  await resetStaleDownloadStates(collectionId);
  const queue = await pendingEpisodes(collectionId);

  if (!queue.length) {
    const progress = await buildDownloadProgress(collectionId);
    await saveDownloadRunState({ ...progress, running: false });
    return {
      ok: true,
      collection_id: collectionId,
      completed: 0,
      failed: 0,
      skipped: 0,
      stopped_reason: "no_pending",
    };
  }

  const runState: DownloadRunState = {
    version: 1,
    collection_id: collectionId,
    running: true,
    started_at: NOW(),
    updated_at: NOW(),
    queued: queue.length,
    downloading: 0,
    downloaded: 0,
    failed: 0,
    remaining: queue.length,
    total: (await listEpisodes(collectionId)).length,
    completed_this_run: 0,
    failed_this_run: 0,
    limit,
  };
  await saveDownloadRunState(runState);

  let completed = 0;
  let failed = 0;
  let skipped = 0;

  try {
    for (const ep of queue) {
      if (limit && completed + failed >= limit) {
        break;
      }

      runState.current_episode_id = ep.id;
      runState.current_episode_title = ep.title;
      runState.downloading = 1;
      runState.updated_at = NOW();
      await saveDownloadRunState(runState);

      const result = await downloadEpisode(collectionId, ep.id);

      runState.downloading = 0;
      runState.updated_at = NOW();

      if (result.ok) {
        if (result.skipped) skipped += 1;
        else completed += 1;
        runState.completed_this_run = completed;
      } else {
        failed += 1;
        runState.failed_this_run = failed;
        runState.last_error = result.error;
      }

      const progress = await buildDownloadProgress(collectionId, runState);
      await saveDownloadRunState({ ...progress, running: true, limit });
    }
  } finally {
    const final = await buildDownloadProgress(collectionId, {
      ...runState,
      running: false,
      current_episode_id: undefined,
      current_episode_title: undefined,
      downloading: 0,
      completed_this_run: completed,
      failed_this_run: failed,
    });
    await saveDownloadRunState(final);
  }

  const stopped_reason =
    limit && completed + failed >= limit ? "limit" : queue.length ? "complete" : "no_pending";

  return {
    ok: true,
    collection_id: collectionId,
    completed,
    failed,
    skipped,
    stopped_reason,
  };
}
