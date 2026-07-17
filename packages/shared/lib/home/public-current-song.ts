import "server-only";

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
export async function loadPublicCurrentSongPayload(): Promise<SundayNightsCurrentPayload> {
  const state = await loadSundayNightsState();
  const channelZero = resolveChannelExperience({ state });
  const freshLive = currentLiveSelection(state);
  const track = await loadTrackPage(channelZero.experienceId);
  const destination = await resolveLiveDestination(channelZero.experienceId);

  const liveOverlay =
    channelZero.source === "takeover" || channelZero.source === "live-signal"
      ? freshLive
      : null;

  return {
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
}
