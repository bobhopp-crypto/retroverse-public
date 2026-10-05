import { videoForIdentity } from "@/lib/vdjbx-catalog";

export type StageRelatedTrack = {
  rvtr?: string | null;
  title?: string | null;
  artist?: string | null;
  artistName?: string | null;
  releaseYear?: number | null;
  year?: number | null;
  href?: string | null;
  coverUrl?: string | null;
};

export type StageNow = {
  title: string;
  artist: string;
  year: number | null;
  videoKey: string;
  songRvtr: string | null;
  heroRvtr: string | null;
  bridgeTimestamp: string | null;
  relatedTracks: StageRelatedTrack[];
};

export type PublicCurrentPayload = {
  live?: {
    source?: string | null;
    title?: string | null;
    artist?: string | null;
    year?: number | null;
    rvtr?: string | null;
    songKey?: string | null;
    bridgeTimestamp?: string | null;
  } | null;
  track?: {
    rvtr?: string | null;
    artistHref?: string | null;
    relatedTracks?: StageRelatedTrack[] | null;
  } | null;
  publicSong?: {
    rvtr?: string | null;
    title?: string | null;
    artist?: string | null;
    year?: number | null;
    links?: { artistHref?: string | null } | null;
    relatedTracks?: StageRelatedTrack[] | null;
  } | null;
  currentTrackId?: string | null;
  updatedAt?: string | null;
};

const LIVE_FRESHNESS_MS = 25 * 60_000;

function isFreshBridgePayload(payload: PublicCurrentPayload): boolean {
  const live = payload.live;
  if (live?.source !== "bridge" || !live.title?.trim() || !live.artist?.trim()) return false;
  const timestamp = live.bridgeTimestamp || payload.updatedAt;
  const parsed = timestamp ? Date.parse(timestamp) : NaN;
  const age = Date.now() - parsed;
  return Number.isFinite(parsed) && age >= -120_000 && age <= LIVE_FRESHNESS_MS;
}

export function stageNowFromPublicPayload(payload: PublicCurrentPayload | null | undefined): StageNow | null {
  if (!payload || !isFreshBridgePayload(payload) || !payload.live) return null;
  const live = payload.live;
  const title = live.title!.trim();
  const artist = live.artist!.trim();
  const catalogMatch = videoForIdentity(artist, title);
  const songRvtr = payload.publicSong?.rvtr || payload.track?.rvtr || live.rvtr || payload.currentTrackId || null;
  return {
    title,
    artist,
    year: live.year ?? payload.publicSong?.year ?? catalogMatch?.year ?? null,
    videoKey: catalogMatch?.videoKey || live.songKey || songRvtr || `live:${artist}:${title}`,
    songRvtr,
    heroRvtr: catalogMatch?.heroRvtr || songRvtr,
    bridgeTimestamp: live.bridgeTimestamp || payload.updatedAt || null,
    relatedTracks: payload.track?.relatedTracks || payload.publicSong?.relatedTracks || [],
  };
}
