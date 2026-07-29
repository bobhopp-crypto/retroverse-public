import "server-only";

import { buildPlayheadPayload } from "@/lib/bobos/presentation/store";
import type { PlayheadPayload, PresentationQueue } from "@/lib/bobos/presentation/types";
import type { CurrentBroadcast } from "@/lib/broadcast/current-broadcast";
import type { Rvba } from "@/lib/broadcast/rvba";
import type { ChannelExperienceSource } from "@/lib/channel-zero/types";
import { resolveChannelExperience } from "@/lib/channel-zero/resolve-channel-experience";
import {
  resolveLiveDestination,
  type LiveDestination,
  type SundayNightsCurrentPayload,
} from "@/lib/sunday-nights/live-payload";
import { currentLiveSelection } from "@/lib/sunday-nights/live-freshness";
import { resolveLiveTrack, songKeyFromPath } from "@/lib/sunday-nights/resolve-live-track";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";
import type { SundayNightsLiveSelection } from "@/lib/sunday-nights/types";
import { loadPublicSongPayload, type PublicSongPayload } from "@/lib/retroverse/experience/load-public-song-payload";
import { loadTrackPage } from "@/lib/track/load-track-page";

const RE_RVTR = /^RVTR\d{6}$/i;

export const PUBLIC_CURRENT_NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Expires: "0",
  Pragma: "no-cache",
} as const;

export type PublicHomepageManualOverride = {
  broadcast: CurrentBroadcast;
  itemIndex: number;
  presentation: PlayheadPayload["presentation"];
  publishedAt: string | null;
  queue: PresentationQueue | null;
  rvba: Rvba;
  updatedAt: string;
};

export type PublicHomepagePayload = SundayNightsCurrentPayload & {
  /** Selected experience from the Experience Selector (when on air). */
  manualOverride?: PublicHomepageManualOverride | null;
  /** Unified public song payload for the current track when RVTR is known. */
  publicSong?: PublicSongPayload | null;
};

/** Show the selected experience on the homepage when the selector has one on air. */
export function resolvePublicHomepageManualOverride(
  playhead: PlayheadPayload,
): PublicHomepageManualOverride | null {
  if (
    !playhead.onAir ||
    !playhead.rvba ||
    !playhead.broadcast ||
    playhead.broadcast.state === "off-air"
  ) {
    return null;
  }

  return {
    broadcast: playhead.broadcast,
    itemIndex: playhead.itemIndex,
    presentation: playhead.presentation,
    publishedAt: playhead.publishedAt,
    queue: playhead.queue,
    rvba: playhead.rvba,
    updatedAt: playhead.updatedAt,
  };
}

export function applyPublicHomepageManualOverride(
  channelZeroPayload: SundayNightsCurrentPayload,
  playhead: PlayheadPayload,
): PublicHomepagePayload {
  return {
    ...channelZeroPayload,
    manualOverride: resolvePublicHomepageManualOverride(playhead),
  };
}

function publicSourceFromChannelZero(
  source: ChannelExperienceSource,
): "virtualdj" | "channel-zero" {
  if (source === "takeover" || source === "live-signal") return "virtualdj";
  return "channel-zero";
}

function liveSelectionFromPresentation(
  playhead: PlayheadPayload,
  bridgeLive: SundayNightsLiveSelection | null,
): SundayNightsLiveSelection | null {
  const rvba = playhead.rvba;
  const title = rvba?.title?.trim() || bridgeLive?.title?.trim() || "";
  const artist = rvba?.subtitle?.trim() || bridgeLive?.artist?.trim() || "";
  if (!title || !artist) return bridgeLive;

  return {
    rvtr: bridgeLive?.rvtr ?? null,
    artist,
    title,
    year: bridgeLive?.year ?? null,
    coverUrl: bridgeLive?.coverUrl ?? null,
    songKey: bridgeLive?.songKey ?? null,
    source: bridgeLive?.source ?? "manual",
    filepath: bridgeLive?.filepath ?? null,
    deck: bridgeLive?.deck ?? null,
    bridgeTimestamp: bridgeLive?.bridgeTimestamp ?? null,
    resolution: bridgeLive?.resolution ?? null,
  };
}

async function payloadFromCurrentExperience(playhead: PlayheadPayload): Promise<PublicHomepagePayload> {
  const manualOverride = resolvePublicHomepageManualOverride(playhead);
  const linkId = playhead.rvba?.link?.id?.trim() ?? null;
  const state = await loadSundayNightsState();
  const live = liveSelectionFromPresentation(playhead, state.live);
  const title = live?.title?.trim() ?? "";
  const artist = live?.artist?.trim() ?? "";

  let currentTrackId = linkId;
  let track = null as Awaited<ReturnType<typeof loadTrackPage>>;
  let publicSong: PublicSongPayload | null = null;
  let destination: LiveDestination = { kind: "EXPERIENCE", href: "/" };

  if (linkId && RE_RVTR.test(linkId)) {
    const rvtr = linkId.toUpperCase();
    currentTrackId = rvtr;
    [track, publicSong] = await Promise.all([
      loadTrackPage(rvtr),
      loadPublicSongPayload(rvtr).catch(() => null),
    ]);
    destination = await resolveLiveDestination(rvtr);
  } else if (linkId?.toLowerCase().startsWith("vdj:") && title && artist) {
    const filepath = linkId.slice(4);
    const resolved = await resolveLiveTrack({ filepath, artist, title }).catch(() => null);
    if (resolved?.rvtr) {
      currentTrackId = resolved.rvtr;
      [track, publicSong] = await Promise.all([
        loadTrackPage(resolved.rvtr),
        loadPublicSongPayload(resolved.rvtr).catch(() => null),
      ]);
      destination = await resolveLiveDestination(resolved.rvtr);
      if (live) {
        live.rvtr = resolved.rvtr;
        live.year = resolved.year ?? publicSong?.year ?? live.year;
        live.coverUrl = resolved.coverUrl ?? publicSong?.coverUrl ?? live.coverUrl;
        live.resolution = resolved.resolution;
      }
    } else {
      destination = await resolveLiveDestination(linkId);
      if (live) {
        live.filepath = filepath;
        live.songKey = songKeyFromPath(filepath);
        live.source = "bridge";
        live.resolution = "vdj-library";
      }
    }
  } else if (linkId) {
    destination = await resolveLiveDestination(linkId);
  }

  if (live && publicSong) {
    live.rvtr = publicSong.rvtr;
    live.year = publicSong.year ?? live.year;
    live.coverUrl = publicSong.coverUrl ?? live.coverUrl;
  }

  return {
    currentTrackId,
    live,
    track: publicSong?.track ?? track,
    destination,
    channel: null,
    updatedAt: playhead.updatedAt,
    publicState: {
      version: 2,
      source: "experience-selector",
      servedAt: new Date().toISOString(),
    },
    manualOverride,
    publicSong,
  };
}

/**
 * Canonical public now-playing payload.
 *
 * When the Experience Selector has a current experience on air, retroverse.live
 * renders that exact payload and does not fall back to Channel Zero.
 */
export async function loadPublicCurrentSongPayload(): Promise<PublicHomepagePayload> {
  const playhead = await buildPlayheadPayload();
  const manualOverride = resolvePublicHomepageManualOverride(playhead);
  if (manualOverride) {
    return await payloadFromCurrentExperience(playhead);
  }

  const state = await loadSundayNightsState();
  const channelZero = resolveChannelExperience({ state });
  const freshLive = currentLiveSelection(state);
  const rvtr = channelZero.experienceId;
  const [track, publicSong] = await Promise.all([
    loadTrackPage(rvtr),
    loadPublicSongPayload(rvtr).catch(() => null),
  ]);
  const destination = await resolveLiveDestination(channelZero.experienceId);

  const liveOverlay =
    channelZero.source === "takeover" || channelZero.source === "live-signal"
      ? freshLive
      : null;

  const channelZeroPayload: SundayNightsCurrentPayload = {
    currentTrackId: channelZero.experienceId,
    live: liveOverlay,
    track: publicSong?.track ?? track,
    destination,
    channel: null,
    channelZero,
    updatedAt: channelZero.selectedAt,
    publicState: {
      version: 2,
      source: publicSourceFromChannelZero(channelZero.source),
      servedAt: new Date().toISOString(),
    },
  };

  return {
    ...applyPublicHomepageManualOverride(channelZeroPayload, playhead),
    publicSong,
  };
}
