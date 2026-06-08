import { access, copyFile, mkdir, readdir, readFile, stat, writeFile } from "fs/promises";
import { join } from "path";

import { collectionSubdir } from "./paths";
import { loadEpisode, saveEpisode, syncCollectionCounts } from "./state";
import type { EpisodeManifest } from "./types";
import { findYtDlp, runYtDlp } from "./ytdlp";

const VIDEO_EXT = /\.(mp4|mkv|webm|mov)$/i;

function episodeDownloadDir(collectionId: string, episodeId: string): string {
  return join(collectionSubdir(collectionId, "downloads"), episodeId);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function findVideoFile(dir: string): Promise<string | null> {
  let files: string[] = [];
  try {
    files = await readdir(dir);
  } catch {
    return null;
  }

  const candidates = files.filter((f) => VIDEO_EXT.test(f) && !f.endsWith(".part"));
  if (!candidates.length) return null;

  let best: { path: string; size: number } | null = null;
  for (const name of candidates) {
    const full = join(dir, name);
    try {
      const info = await stat(full);
      if (!best || info.size > best.size) {
        best = { path: full, size: info.size };
      }
    } catch {
      // skip
    }
  }
  return best?.path ?? null;
}

async function archiveSidecars(
  collectionId: string,
  episodeId: string,
  downloadDir: string,
  videoPath: string,
): Promise<void> {
  const videoBase = videoPath.replace(/\.[^.]+$/, "");
  const metaDir = collectionSubdir(collectionId, "metadata");
  const descDir = collectionSubdir(collectionId, "descriptions");
  await mkdir(metaDir, { recursive: true });
  await mkdir(descDir, { recursive: true });

  const infoJson = `${videoBase}.info.json`;
  if (await fileExists(infoJson)) {
    const raw = await readFile(infoJson, "utf8");
    await writeFile(join(metaDir, `${episodeId}.json`), `${raw.trim()}\n`, "utf8");
  }

  const description = `${videoBase}.description`;
  if (await fileExists(description)) {
    await copyFile(description, join(descDir, `${episodeId}.txt`));
  }
}

export type DownloadEpisodeResult =
  | { ok: true; episode_id: string; path: string; bytes: number; skipped: boolean }
  | { ok: false; episode_id: string; error: string };

export async function isEpisodeDownloaded(
  collectionId: string,
  episode: EpisodeManifest,
): Promise<boolean> {
  if (!episode.downloaded || !episode.download_path) return false;
  try {
    const info = await stat(episode.download_path);
    return info.size > 1024 * 1024;
  } catch {
    return false;
  }
}

export async function downloadEpisode(
  collectionId: string,
  episodeId: string,
): Promise<DownloadEpisodeResult> {
  const episode = await loadEpisode(collectionId, episodeId);
  if (!episode) {
    return { ok: false, episode_id: episodeId, error: "Episode not found" };
  }

  if (await isEpisodeDownloaded(collectionId, episode)) {
    return {
      ok: true,
      episode_id: episodeId,
      path: episode.download_path!,
      bytes: (await stat(episode.download_path!)).size,
      skipped: true,
    };
  }

  const ytdlp = await findYtDlp();
  if (!ytdlp) {
    return { ok: false, episode_id: episodeId, error: "yt-dlp not found on PATH" };
  }

  const outDir = episodeDownloadDir(collectionId, episodeId);
  await mkdir(outDir, { recursive: true });

  const queued: EpisodeManifest = {
    ...episode,
    status: "queued",
    updated_at: new Date().toISOString(),
  };
  await saveEpisode(queued);

  const downloading: EpisodeManifest = {
    ...queued,
    status: "downloading",
    updated_at: new Date().toISOString(),
  };
  await saveEpisode(downloading);

  const outputTemplate = join(outDir, "%(title)s.%(ext)s");
  const url = episode.source_url.trim();
  if (!url) {
    const failed: EpisodeManifest = {
      ...downloading,
      status: "failed",
      downloaded: false,
      updated_at: new Date().toISOString(),
    };
    await saveEpisode(failed);
    return { ok: false, episode_id: episodeId, error: "Episode has no source_url" };
  }

  const args = [
    "--extractor-args",
    "youtube:player_client=android,web",
    "-f",
    "18/bv*+ba/b",
    "--merge-output-format",
    "mp4",
    "--write-info-json",
    "--write-description",
    "--continue",
    "--no-overwrites",
    "--no-playlist",
    "--no-warnings",
    "-o",
    outputTemplate,
    url,
  ];

  const { code, stderr } = await runYtDlp(ytdlp, args);

  const videoPath = await findVideoFile(outDir);
  if (!videoPath) {
    const failed: EpisodeManifest = {
      ...downloading,
      status: "failed",
      downloaded: false,
      updated_at: new Date().toISOString(),
    };
    await saveEpisode(failed);
    const detail = stderr.trim().slice(-400) || `yt-dlp exited with code ${code}`;
    return { ok: false, episode_id: episodeId, error: detail };
  }

  let bytes = 0;
  try {
    bytes = (await stat(videoPath)).size;
  } catch {
    // keep 0
  }

  await archiveSidecars(collectionId, episodeId, outDir, videoPath);

  const completed: EpisodeManifest = {
    ...downloading,
    status: "downloaded",
    downloaded: true,
    download_path: videoPath,
    updated_at: new Date().toISOString(),
  };
  await saveEpisode(completed);
  await syncCollectionCounts(collectionId);

  return {
    ok: true,
    episode_id: episodeId,
    path: videoPath,
    bytes,
    skipped: code !== 0 && bytes > 1024 * 1024,
  };
}
