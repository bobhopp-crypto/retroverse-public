import "server-only";

import { buildPlayheadPayload } from "@/lib/bobos/presentation/store";
import type { PlayheadPayload, PresentationQueue } from "@/lib/bobos/presentation/types";
import type { CurrentBroadcast } from "@/lib/broadcast/current-broadcast";
import type { Rvba } from "@/lib/broadcast/rvba";
import type { ChannelExperienceSource } from "@/lib/channel-zero/types";
import { resolveChannelExperience } from "@/lib/channel-zero/resolve-channel-experience";
import {
  buildSundayNightsCurrentPayload,
  resolveLiveDestination,
  type LiveDestination,
  type SundayNightsCurrentPayload,
} from "@/lib/sunday-nights/live-payload";
import { currentLiveSelection } from "@/lib/sunday-nights/live-freshness";
import { resolveLiveTrack, songKeyFromPath } from "@/lib/sunday-nights/resolve-live-track";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";
import type { SundayNightsLiveSelection, SundayNightsState } from "@/lib/sunday-nights/types";
import { loadPublicSongPayload, type PublicSongPayload } from "@/lib/retroverse/experience/load-public-song-payload";
import { loadVdjBasePackage, vdjBaseKey } from "@/lib/universal-renderer/load-vdj-base";
import { loadVdjSnapshotsForPaths, normVdjPath } from "@/lib/ops/intelligence/vdj-database";
import { mergeExactVdjPresentation } from "@/lib/home/public-song-experience-resolution";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { loadWoodstockPresentationAsset, type WoodstockPresentationAsset } from "@/lib/retroverse/woodstock-presentation-runtime";

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
  woodstockAsset?: WoodstockPresentationAsset | null;
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

/**
 * A fresh VirtualDJ song replaces song-type selector output. Intentional
 * non-song takes (announcements, giveaways, images, video, and so on) stay on air.
 */
export function shouldFreshVirtualDjTakePriority(
  playhead: PlayheadPayload,
  live: SundayNightsLiveSelection | null,
): boolean {
  if (
    live?.source !== "bridge" ||
    !live.title.trim() ||
    !live.artist.trim()
  ) {
    return false;
  }

  const selectedExperience = resolvePublicHomepageManualOverride(playhead);
  return !selectedExperience || selectedExperience.rvba.type === "now-playing";
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

async function payloadFromCurrentExperience(
  playhead: PlayheadPayload,
  state: SundayNightsState,
): Promise<PublicHomepagePayload> {
  const manualOverride = resolvePublicHomepageManualOverride(playhead);
  const linkId = playhead.rvba?.link?.id?.trim() ?? null;
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

async function payloadFromFreshVirtualDj(
  state: SundayNightsState,
): Promise<PublicHomepagePayload> {
  // This is the pre-selector now-playing authority: it preserves the bridge's
  // VDJ-only artist/title/path fallback while enriching matched RVTR tracks.
  const payload = await buildSundayNightsCurrentPayload(state, null);
  let live = payload.live ? { ...payload.live } : null;
  let currentTrackId = payload.currentTrackId;
  let track = payload.track;
  let destination = payload.destination;
  let rvtr = currentTrackId && RE_RVTR.test(currentTrackId)
    ? currentTrackId.toUpperCase()
    : null;
  let publicSong = rvtr
    ? await loadPublicSongPayload(rvtr).catch(() => null)
    : null;
  let exactVdjPublicSong: PublicSongPayload | null = null;

  // database.xml and the prepared VDJ package are presentation enrichment.
  // They do not turn an unresolved file into a canonical identity.
  if (live && live.year == null && live.filepath) {
    const snapshot = (await loadVdjSnapshotsForPaths([live.filepath])).get(normVdjPath(live.filepath));
    if (snapshot?.year != null) live = { ...live, year: snapshot.year };
  }

  if (live && live.year == null && currentTrackId?.toLowerCase().startsWith("vdj:")) {
    const vdjPackage = await loadVdjBasePackage(currentTrackId.slice(4).toLowerCase()).catch(() => null);
    if (vdjPackage?.year != null) live = { ...live, year: vdjPackage.year };
  }

  if (live?.filepath) {
    const filepath = live.filepath.replace(/\\/g, "/").trim();
    exactVdjPublicSong = await loadPublicSongPayload(
      `VDJ:${vdjBaseKey(filepath.toLowerCase())}`,
      {
        artist: live.artist,
        title: live.title,
        album: null,
        year: live.year,
        coverUrl: live.coverUrl,
      },
    ).catch(() => null);
  }

  if (!rvtr && live?.filepath) {
    const resolved = await resolveLiveTrack({
      filepath: live.filepath,
      artist: live.artist,
      title: live.title,
    }).catch(() => null);

    if (resolved?.rvtr) {
      rvtr = resolved.rvtr;
      currentTrackId = rvtr;
      [track, publicSong, destination] = await Promise.all([
        loadTrackPage(rvtr),
        loadPublicSongPayload(rvtr).catch(() => null),
        resolveLiveDestination(rvtr),
      ]);
      live = {
        ...live,
        rvtr,
        year: resolved.year ?? publicSong?.year ?? live.year,
        coverUrl: resolved.coverUrl ?? publicSong?.coverUrl ?? live.coverUrl,
        resolution: resolved.resolution,
      };
    }
  }

  publicSong = mergeExactVdjPresentation(publicSong, exactVdjPublicSong);
  if (publicSong && !rvtr) {
    currentTrackId = publicSong.rvtr;
    track = publicSong.track;
  }

  if (live && publicSong) {
    live = {
      ...live,
      rvtr: publicSong.rvtr,
      year: publicSong.year ?? live.year,
      coverUrl: publicSong.coverUrl ?? live.coverUrl,
    };
  }

  return {
    ...payload,
    currentTrackId,
    live,
    track: publicSong?.track ?? track,
    destination,
    manualOverride: null,
    publicSong,
    publicState: {
      version: 2,
      source: "virtualdj",
      servedAt: new Date().toISOString(),
    },
  };
}

/**
 * Canonical public now-playing payload.
 *
 * A fresh bridge song replaces song-type selector output. Intentionally
 * selected non-song experiences remain authoritative while they are on air.
 */
export async function loadPublicCurrentSongPayload(): Promise<PublicHomepagePayload> {
  const playhead = await buildPlayheadPayload();
  const manualOverride = resolvePublicHomepageManualOverride(playhead);
  const state = await loadSundayNightsState();
  const freshLive = currentLiveSelection(state);

  // The VirtualDJ selector is a source choice, not the current-song record.
  // For normal VDJ playback read the live bridge/playhead state directly so a
  // stale selector snapshot cannot keep publishing an older song. Non-song
  // presentations remain selector-authoritative below.
  if (
    (!manualOverride || manualOverride.rvba.type === "now-playing") &&
    freshLive?.source === "bridge"
  ) {
    const payload = await payloadFromFreshVirtualDj(state);
    const asset = payload.live?.filepath ? await loadWoodstockPresentationAsset(`VDJ:${vdjBaseKey(payload.live.filepath.replace(/\\/g, "/").trim().toLowerCase())}`) : null;
    return { ...payload, woodstockAsset: asset };
  }

  if (shouldFreshVirtualDjTakePriority(playhead, freshLive)) {
    const payload = await payloadFromFreshVirtualDj(state);
    const asset = payload.live?.filepath ? await loadWoodstockPresentationAsset(`VDJ:${vdjBaseKey(payload.live.filepath.replace(/\\/g, "/").trim().toLowerCase())}`) : null;
    return { ...payload, woodstockAsset: asset };
  }

  if (manualOverride) {
    return payloadFromCurrentExperience(playhead, state);
  }

  const channelZero = resolveChannelExperience({ state });
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
