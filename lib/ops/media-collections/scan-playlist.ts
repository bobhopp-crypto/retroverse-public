import { execFile } from "child_process";
import { promisify } from "util";

import { parseEpisodeTitle } from "./parse-episode-title";
import { findYtDlp } from "./ytdlp";
import {
  loadCollection,
  loadCollectionManifest,
  loadEpisode,
  saveCollectionManifest,
  saveEpisode,
  syncCollectionCounts,
} from "./state";
import type { EpisodeManifest, PlaylistScanResult } from "./types";

const execFileAsync = promisify(execFile);

type YtDlpFlatEntry = {
  id?: string;
  title?: string;
  duration?: number;
  playlist_index?: number;
  url?: string;
  webpage_url?: string;
};

type YtDlpPlaylistJson = {
  id?: string;
  title?: string;
  entries?: YtDlpFlatEntry[];
};

async function fetchPlaylistEntries(
  playlistUrl: string,
): Promise<{ entries: YtDlpFlatEntry[]; method: "yt-dlp" | "stub"; error?: string }> {
  const ytdlp = await findYtDlp();
  if (!ytdlp) {
    return {
      entries: [],
      method: "stub",
      error: "yt-dlp not found on PATH. Install with: brew install yt-dlp",
    };
  }

  try {
    const { stdout } = await execFileAsync(
      ytdlp,
      ["--flat-playlist", "-J", "--no-warnings", playlistUrl],
      { maxBuffer: 32 * 1024 * 1024, timeout: 120_000 },
    );
    const parsed = JSON.parse(stdout) as YtDlpPlaylistJson;
    const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    return { entries, method: "yt-dlp" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "yt-dlp playlist scan failed";
    return { entries: [], method: "yt-dlp", error: message };
  }
}

function entryToEpisode(
  entry: YtDlpFlatEntry,
  collectionId: string,
  existing?: EpisodeManifest | null,
): EpisodeManifest {
  const videoId = entry.id?.trim() || "";
  const title = entry.title?.trim() || videoId || "Untitled";
  const parsed = parseEpisodeTitle(title);
  const now = new Date().toISOString();
  const source_url =
    entry.webpage_url?.trim() ||
    entry.url?.trim() ||
    (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "");

  return {
    version: 1,
    id: videoId || `unknown-${entry.playlist_index ?? 0}`,
    collection_id: collectionId,
    title,
    episode_number: parsed.episode_number ?? existing?.episode_number,
    air_date: parsed.air_date ?? existing?.air_date,
    duration_seconds:
      typeof entry.duration === "number" ? entry.duration : existing?.duration_seconds,
    source_url,
    source_video_id: videoId || undefined,
    playlist_index:
      typeof entry.playlist_index === "number" ? entry.playlist_index : existing?.playlist_index,
    status: existing?.status ?? "discovered",
    downloaded: existing?.downloaded ?? false,
    processed: existing?.processed ?? false,
    harvested: existing?.harvested ?? false,
    download_path: existing?.download_path,
    media_lab_job_slug: existing?.media_lab_job_slug,
    media_lab_year: existing?.media_lab_year,
    discovered_at: existing?.discovered_at ?? now,
    updated_at: now,
  };
}

export async function scanCollectionPlaylist(
  collectionId: string,
): Promise<PlaylistScanResult> {
  const scanned_at = new Date().toISOString();
  const collection = await loadCollection(collectionId);

  if (!collection) {
    return {
      ok: false,
      collection_id: collectionId,
      scanned_at,
      episodes_found: 0,
      episodes_new: 0,
      episodes_updated: 0,
      error: `Collection not found: ${collectionId}`,
      method: "stub",
    };
  }

  if (collection.source_type !== "youtube_playlist" || !collection.source_url.trim()) {
    return {
      ok: false,
      collection_id: collectionId,
      scanned_at,
      episodes_found: 0,
      episodes_new: 0,
      episodes_updated: 0,
      error: "Collection has no YouTube playlist source_url configured.",
      method: "stub",
    };
  }

  const { entries, method, error } = await fetchPlaylistEntries(collection.source_url.trim());

  if (error) {
    return {
      ok: false,
      collection_id: collectionId,
      scanned_at,
      episodes_found: 0,
      episodes_new: 0,
      episodes_updated: 0,
      error,
      method,
    };
  }

  let episodes_new = 0;
  let episodes_updated = 0;

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const videoId = entry.id?.trim();
    if (!videoId) continue;

    if (entry.playlist_index == null) {
      entry.playlist_index = i + 1;
    }

    const existing = await loadEpisode(collectionId, videoId);
    const episode = entryToEpisode(entry, collectionId, existing);

    if (!existing) {
      episodes_new += 1;
    } else {
      episodes_updated += 1;
    }

    await saveEpisode(episode);
  }

  await syncCollectionCounts(collectionId);

  const manifest = await loadCollectionManifest(collectionId);
  if (manifest) {
    await saveCollectionManifest({
      ...manifest,
      last_scan_at: scanned_at,
      last_scan_episode_count: entries.length,
    });
  }

  return {
    ok: true,
    collection_id: collectionId,
    scanned_at,
    episodes_found: entries.length,
    episodes_new,
    episodes_updated,
    method,
  };
}
