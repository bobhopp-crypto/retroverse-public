import { execFile } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { promisify } from "util";

import { downloadEpisode, isEpisodeDownloaded } from "../download-episode";
import {
  loadCollection,
  loadEpisode,
  listEpisodes,
  saveEpisode,
  syncCollectionCounts,
} from "../state";
import { fetchYoutubePlaylistEntries, scanCollectionPlaylist } from "../scan-playlist";
import { findYtDlp } from "../ytdlp";
import type { EpisodeManifest } from "../types";
import {
  MS_HISTORICAL_EPISODE_COUNT,
  MS_OFFICIAL_PLAYLIST_URL,
  MS_PRIVATE_WATCHLIST,
} from "./constants";
import { computeCoverageMetrics, type MsCoverageMetrics } from "./coverage";
import { ensureEpisodePerformances, rebuildPerformanceIndex } from "./performances";
import { MS_COLLECTION_ID } from "./paths";
import {
  appendMsSyncEvent,
  loadMsSyncState,
  saveMsSyncState,
  type MsSyncEvent,
} from "./sync-state";

const execFileAsync = promisify(execFile);

export type MsSyncEpisodeDelta = {
  episode_id: string;
  title: string;
  source_url: string;
  playlist_index?: number;
};

export type MsPrivateWatchlistEntry = {
  episode_id: string;
  title: string;
  status: "private" | "public" | "downloaded" | "unknown";
  restored: boolean;
};

export type MsSyncAcquisitionResult = {
  downloaded: number;
  download_skipped: number;
  download_failed: number;
  performances_generated: number;
  errors: { episode_id: string; error: string }[];
};

export type MsSyncReport = {
  ok: boolean;
  synced_at: string;
  mode: "report" | "sync-and-acquire" | "retry-private";
  official_playlist_count: number;
  official_playlist_count_delta: number;
  historical_episode_count: number;
  coverage: MsCoverageMetrics;
  new_episodes: MsSyncEpisodeDelta[];
  removed_episodes: MsSyncEpisodeDelta[];
  private_restored: MsSyncEpisodeDelta[];
  private_watchlist: MsPrivateWatchlistEntry[];
  new_episodes_since_last_sync: number;
  last_sync_at: string | null;
  acquisition?: MsSyncAcquisitionResult;
  events: MsSyncEvent[];
  error?: string;
};

export type MsSyncMode = "report" | "sync-and-acquire" | "retry-private";

async function checkVideoPublic(videoId: string): Promise<"public" | "private" | "unknown"> {
  const ytdlp = await findYtDlp();
  if (!ytdlp) return "unknown";

  try {
    const { stdout } = await execFileAsync(
      ytdlp,
      ["--skip-download", "-j", "--no-warnings", `https://www.youtube.com/watch?v=${videoId}`],
      { maxBuffer: 8 * 1024 * 1024, timeout: 60_000 },
    );
    const parsed = JSON.parse(stdout) as { availability?: string; title?: string };
    if (parsed.availability === "private") return "private";
    if (parsed.title && !parsed.title.includes("[Private video]")) return "public";
    return "public";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/private|sign in|members only|unavailable/i.test(msg)) return "private";
    return "unknown";
  }
}

function episodeToDelta(ep: EpisodeManifest): MsSyncEpisodeDelta {
  return {
    episode_id: ep.id,
    title: ep.title,
    source_url: ep.source_url,
    playlist_index: ep.playlist_index,
  };
}

async function countDownloaded(): Promise<number> {
  const episodes = await listEpisodes(MS_COLLECTION_ID);
  let n = 0;
  for (const ep of episodes) {
    if (await isEpisodeDownloaded(MS_COLLECTION_ID, ep)) n += 1;
  }
  return n;
}

async function acquireEpisodes(
  episodeIds: string[],
): Promise<MsSyncAcquisitionResult> {
  const result: MsSyncAcquisitionResult = {
    downloaded: 0,
    download_skipped: 0,
    download_failed: 0,
    performances_generated: 0,
    errors: [],
  };

  for (const episodeId of episodeIds) {
    const dl = await downloadEpisode(MS_COLLECTION_ID, episodeId);
    if (!dl.ok) {
      result.download_failed += 1;
      result.errors.push({ episode_id: episodeId, error: dl.error });
      continue;
    }
    if (dl.skipped) result.download_skipped += 1;
    else result.downloaded += 1;

    const manifest = await ensureEpisodePerformances(episodeId);
    if (manifest?.performances.length) {
      result.performances_generated += manifest.performances.length;
    }

    await appendMsSyncEvent({
      type: "acquired",
      episode_id: episodeId,
      detail: dl.skipped ? "skipped_existing" : "downloaded",
    });
  }

  await syncCollectionCounts(MS_COLLECTION_ID);
  await rebuildPerformanceIndex();
  return result;
}

export async function runMidnightSpecialSync(
  mode: MsSyncMode = "report",
): Promise<MsSyncReport> {
  const synced_at = new Date().toISOString();
  const prevState = await loadMsSyncState();

  const collection = await loadCollection(MS_COLLECTION_ID);
  if (!collection) {
    return {
      ok: false,
      synced_at,
      mode,
      official_playlist_count: 0,
      official_playlist_count_delta: 0,
      historical_episode_count: MS_HISTORICAL_EPISODE_COUNT,
      coverage: computeCoverageMetrics(0, 0),
      new_episodes: [],
      removed_episodes: [],
      private_restored: [],
      private_watchlist: [],
      new_episodes_since_last_sync: 0,
      last_sync_at: prevState.last_sync_at,
      events: prevState.events,
      error: "Collection not found: midnight_special",
    };
  }

  const playlistUrl = collection.source_url.trim() || MS_OFFICIAL_PLAYLIST_URL;
  const scan = await scanCollectionPlaylist(MS_COLLECTION_ID);
  if (!scan.ok) {
    return {
      ok: false,
      synced_at,
      mode,
      official_playlist_count: 0,
      official_playlist_count_delta: 0,
      historical_episode_count: MS_HISTORICAL_EPISODE_COUNT,
      coverage: computeCoverageMetrics(await countDownloaded(), 0),
      new_episodes: [],
      removed_episodes: [],
      private_restored: [],
      private_watchlist: [],
      new_episodes_since_last_sync: 0,
      last_sync_at: prevState.last_sync_at,
      events: prevState.events,
      error: scan.error ?? "Playlist scan failed",
    };
  }

  const { entries } = await fetchYoutubePlaylistEntries(playlistUrl);
  const playlistIds = new Set(
    entries.map((e) => e.id?.trim()).filter((id): id is string => Boolean(id)),
  );

  await ensurePrivateWatchlistManifests();
  const episodesAfterWatchlist = await listEpisodes(MS_COLLECTION_ID);
  const localById = new Map(episodesAfterWatchlist.map((e) => [e.id, e]));

  const prevIds = new Set(prevState.last_playlist_video_ids);
  const new_episodes: MsSyncEpisodeDelta[] = [];
  const removed_episodes: MsSyncEpisodeDelta[] = [];

  if (prevState.last_sync_at) {
    for (const id of playlistIds) {
      if (!prevIds.has(id)) {
        const ep = localById.get(id);
        if (ep) new_episodes.push(episodeToDelta(ep));
      }
    }

    for (const id of prevIds) {
      if (!playlistIds.has(id)) {
        const ep = localById.get(id);
        if (ep) removed_episodes.push(episodeToDelta(ep));
      }
    }
  }

  const private_watchlist: MsPrivateWatchlistEntry[] = [];
  const private_restored: MsSyncEpisodeDelta[] = [];
  const acquireTargets: string[] = [];

  for (const videoId of MS_PRIVATE_WATCHLIST) {
    const ep = localById.get(videoId);
    const downloaded = ep ? await isEpisodeDownloaded(MS_COLLECTION_ID, ep) : false;
    let status: MsPrivateWatchlistEntry["status"] = downloaded ? "downloaded" : "unknown";
    let restored = false;

    if (!downloaded) {
      const availability = await checkVideoPublic(videoId);
      status = availability === "public" ? "public" : availability;
      if (availability === "public") {
        restored = true;
        if (ep) private_restored.push(episodeToDelta(ep));
        else {
          private_restored.push({
            episode_id: videoId,
            title: `[Private video] ${videoId}`,
            source_url: `https://www.youtube.com/watch?v=${videoId}`,
          });
        }
        if (mode === "sync-and-acquire" || mode === "retry-private") {
          acquireTargets.push(videoId);
        }
        if (prevState.last_sync_at) {
          await appendMsSyncEvent({
            type: "private_restored",
            episode_id: videoId,
            detail: "now_public",
          });
        }
      }
    }

    private_watchlist.push({
      episode_id: videoId,
      title: ep?.title ?? `[Private video] ${videoId}`,
      status,
      restored,
    });
  }

  const targets = new Set<string>();
  if (mode === "sync-and-acquire") {
    for (const delta of new_episodes) targets.add(delta.episode_id);
    for (const id of acquireTargets) targets.add(id);
  } else if (mode === "retry-private") {
    for (const id of acquireTargets) targets.add(id);
  }

  let acquisition: MsSyncAcquisitionResult | undefined;
  if (targets.size && (mode === "sync-and-acquire" || mode === "retry-private")) {
    acquisition = await acquireEpisodes([...targets]);
  }

  const downloaded = await countDownloaded();
  const official_playlist_count = playlistIds.size;
  const official_playlist_count_delta = prevState.last_sync_at
    ? official_playlist_count - prevState.last_official_playlist_count
    : 0;

  let privatePending = 0;
  for (const entry of private_watchlist) {
    if (entry.status === "private" || entry.status === "unknown") privatePending += 1;
  }

  const coverage = computeCoverageMetrics(
    downloaded,
    official_playlist_count,
    MS_HISTORICAL_EPISODE_COUNT,
    privatePending,
  );

  const new_episodes_since_last_sync = prevState.last_sync_at ? new_episodes.length : 0;

  const events: MsSyncEvent[] = [...prevState.events];
  for (const delta of new_episodes) {
    events.unshift({
      at: synced_at,
      type: "new_episode",
      episode_id: delta.episode_id,
      detail: delta.title,
    });
  }
  for (const delta of removed_episodes) {
    events.unshift({
      at: synced_at,
      type: "removed_episode",
      episode_id: delta.episode_id,
      detail: delta.title,
    });
  }

  await saveMsSyncState({
    version: 1,
    last_sync_at: synced_at,
    last_official_playlist_count: official_playlist_count,
    last_playlist_video_ids: [...playlistIds],
    new_episodes_since_last_sync,
    events: events.slice(0, 50),
  });

  const report: MsSyncReport = {
    ok: true,
    synced_at,
    mode,
    official_playlist_count,
    official_playlist_count_delta,
    historical_episode_count: MS_HISTORICAL_EPISODE_COUNT,
    coverage,
    new_episodes,
    removed_episodes,
    private_restored,
    private_watchlist,
    new_episodes_since_last_sync,
    last_sync_at: prevState.last_sync_at,
    acquisition,
    events: events.slice(0, 50),
  };

  await writeSyncReport(report);
  return report;
}

async function writeSyncReport(report: MsSyncReport): Promise<string> {
  const dir = join(process.cwd(), "reports/midnight-special");
  await mkdir(dir, { recursive: true });
  const stamp = report.synced_at.replace(/[:.]/g, "-");
  const path = join(dir, `sync-${stamp}.json`);
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return path;
}

/** Ensure private watchlist episodes exist in manifests even if absent from playlist flat scan. */
export async function ensurePrivateWatchlistManifests(): Promise<void> {
  for (const videoId of MS_PRIVATE_WATCHLIST) {
    const existing = await loadEpisode(MS_COLLECTION_ID, videoId);
    if (existing) continue;
    const now = new Date().toISOString();
    await saveEpisode({
      version: 1,
      id: videoId,
      collection_id: MS_COLLECTION_ID,
      title: "[Private video]",
      source_url: `https://www.youtube.com/watch?v=${videoId}`,
      source_video_id: videoId,
      status: "failed",
      downloaded: false,
      processed: false,
      harvested: false,
      discovered_at: now,
      updated_at: now,
    });
  }
}
