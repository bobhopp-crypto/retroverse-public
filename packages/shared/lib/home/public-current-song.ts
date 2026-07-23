import "server-only";

import { buildPlayheadPayload } from "@/lib/bobos/presentation/store";
import type { PlayheadPayload, PresentationQueue } from "@/lib/bobos/presentation/types";
import type { CurrentBroadcast } from "@/lib/broadcast/current-broadcast";
import type { Rvba } from "@/lib/broadcast/rvba";
import type { ChannelExperienceSource } from "@/lib/channel-zero/types";
import { resolveChannelExperience } from "@/lib/channel-zero/resolve-channel-experience";
import {
  resolveLiveDestination,
  type SundayNightsCurrentPayload,
} from "@/lib/sunday-nights/live-payload";
import { currentLiveSelection } from "@/lib/sunday-nights/live-freshness";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";
import { loadTrackPage } from "@/lib/track/load-track-page";

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

function payloadFromCurrentExperience(playhead: PlayheadPayload): PublicHomepagePayload {
  const manualOverride = resolvePublicHomepageManualOverride(playhead);
  const rvtr = playhead.rvba?.link?.id?.trim() ?? null;

  return {
    currentTrackId: rvtr,
    live: null,
    track: null,
    destination: {
      kind: "EXPERIENCE",
      href: "/",
    },
    channel: null,
    updatedAt: playhead.updatedAt,
    publicState: {
      version: 2,
      source: "experience-selector",
      servedAt: new Date().toISOString(),
    },
    manualOverride,
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
    return payloadFromCurrentExperience(playhead);
  }

  const state = await loadSundayNightsState();
  const channelZero = resolveChannelExperience({ state });
  const freshLive = currentLiveSelection(state);
  const track = await loadTrackPage(channelZero.experienceId);
  const destination = await resolveLiveDestination(channelZero.experienceId);

  const liveOverlay =
    channelZero.source === "takeover" || channelZero.source === "live-signal"
      ? freshLive
      : null;

  const channelZeroPayload: SundayNightsCurrentPayload = {
    currentTrackId: channelZero.experienceId,
    live: liveOverlay,
    track,
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

  return applyPublicHomepageManualOverride(channelZeroPayload, playhead);
}
