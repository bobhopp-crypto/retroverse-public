import "server-only";

import { buildPlayheadPayload } from "@/lib/bobos/presentation/store";
import type { PlayheadPayload } from "@/lib/bobos/presentation/types";
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
  rvba: Rvba;
};

export type PublicHomepagePayload = SundayNightsCurrentPayload & {
  /** Weekend compatibility bridge: only an active manual take may override Channel Zero. */
  manualOverride?: PublicHomepageManualOverride | null;
};

export function resolvePublicHomepageManualOverride(
  playhead: PlayheadPayload,
): PublicHomepageManualOverride | null {
  if (
    playhead.manualTakeActive !== true ||
    !playhead.onAir ||
    !playhead.presentation ||
    !playhead.item ||
    !playhead.rvba ||
    playhead.broadcast.state === "off-air"
  ) {
    return null;
  }

  return {
    broadcast: playhead.broadcast,
    rvba: playhead.rvba,
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

/**
 * Canonical public now-playing payload.
 *
 * Channel Zero resolves exactly one Experience (takeover → live signal →
 * scheduled program → default). Public V3 renders that Song Experience.
 */
export async function loadPublicCurrentSongPayload(): Promise<PublicHomepagePayload> {
  const [state, playhead] = await Promise.all([
    loadSundayNightsState(),
    buildPlayheadPayload(),
  ]);
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
