import "server-only";

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { cache } from "react";

import { loadTrackPage } from "@/lib/track/load-track-page";
import { scanVdjDatabase } from "@/lib/ops/intelligence/vdj-database";
import { isOpsPlayableVideoPath } from "@/lib/ops/ops-video-media";
import { buildLocalStreamUrl, mediaKeyToStreamUrl, youtubeEmbedUrl } from "./media-delivery";
import type { PlaybackResolveResult, PlaybackTarget } from "./types";

type PlaybackLink = { mediaId: number | null; mediaKey: string | null; youtubeId: string | null };
let linksPromise: Promise<Record<string, PlaybackLink>> | null = null;

function playbackLinks(): Promise<Record<string, PlaybackLink>> {
  if (!linksPromise) {
    linksPromise = readFile(join(process.cwd(), "data/static-graph/playback-map.json.gz"))
      .then((bytes) => JSON.parse(gunzipSync(bytes).toString("utf8")) as Record<string, PlaybackLink>)
      .catch((error) => { linksPromise = null; throw error; });
  }
  return linksPromise;
}

/** Local stream route uses the saved media identity to validate its URL. */
export async function playbackMediaId(rvtr: string): Promise<number | null> {
  if (!/^RVTR\d{6}$/.test(rvtr)) return null;
  return (await playbackLinks())[rvtr]?.mediaId ?? null;
}

export async function findLocalPlaybackPath(rvtr: string, mediaId: number): Promise<string | null> {
  if (process.env.VERCEL || await playbackMediaId(rvtr) !== mediaId) return null;
  const library = await scanVdjDatabase();
  return library.entries.find((entry) =>
    entry.isVideo && entry.label.trim().toUpperCase() === rvtr &&
    isOpsPlayableVideoPath(entry.filePath) && existsSync(entry.filePath)
  )?.filePath ?? null;
}

async function resolveTrackPlaybackImpl(
  rvtrParam: string,
  fallback?: { title?: string; artist?: string },
): Promise<PlaybackResolveResult | null> {
  const rvtr = rvtrParam.trim().toUpperCase();
  if (!/^RVTR\d{6}$/.test(rvtr)) return null;
  const [track, links] = await Promise.all([loadTrackPage(rvtr), playbackLinks()]);
  const link = links[rvtr];
  const title = track?.title || fallback?.title?.trim() || rvtr;
  const artist = track?.artistName || fallback?.artist?.trim() || "";

  const localPath = link?.mediaId ? await findLocalPlaybackPath(rvtr, link.mediaId) : null;
  const streamUrl = mediaKeyToStreamUrl(link?.mediaKey);
  let target: PlaybackTarget | null = localPath
    ? { provider: "vdj_local", streamUrl: buildLocalStreamUrl(rvtr, link!.mediaId!), mediaAssetId: link!.mediaId }
    : streamUrl
      ? { provider: "mp4", streamUrl, mediaAssetId: link?.mediaId ?? null }
    : null;
  if (!target && link?.youtubeId) {
    target = { provider: "youtube", embedUrl: youtubeEmbedUrl(link.youtubeId), youtubeId: link.youtubeId };
  }
  return {
    rvtr,
    title,
    artist,
    target,
    hasVdjMedia: link?.mediaId != null,
    canPlay: Boolean(target),
    playLabel: target?.provider === "youtube" ? "Watch Performance" : "Play",
  };
}

export const resolveTrackPlayback = cache(resolveTrackPlaybackImpl);
