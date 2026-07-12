import "server-only";

import { resolveHomepageRotationRvtr } from "@/lib/home/homepage-rvtr";
import {
  buildSundayNightsCurrentPayload,
  type SundayNightsCurrentPayload,
} from "@/lib/sunday-nights/live-payload";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";
import { loadTrackPage, type TrackPageData } from "@/lib/track/load-track-page";

export const PUBLIC_CURRENT_NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Expires: "0",
  Pragma: "no-cache",
} as const;

async function loadRecommendation(): Promise<TrackPageData | null> {
  const rvtr = await resolveHomepageRotationRvtr();
  const rotated = rvtr ? await loadTrackPage(rvtr) : null;
  return rotated ?? (await loadTrackPage("Sweet Home Alabama"));
}

/**
 * Canonical public now-playing payload.
 *
 * Only a fresh VirtualDJ bridge selection is allowed to be live. When the
 * bridge expires, the server attaches one deterministic daily recommendation
 * so every browser receives the same off-air song from the polling endpoint.
 */
export async function loadPublicCurrentSongPayload(): Promise<SundayNightsCurrentPayload> {
  const state = await loadSundayNightsState();

  // Omitting Live Control deliberately excludes mixer/channel/manual state
  // from the public current-song authority.
  const payload = await buildSundayNightsCurrentPayload(state, null);
  if (payload.live?.source === "bridge" && payload.live.title.trim()) {
    return payload;
  }

  const track = await loadRecommendation();
  if (!track) return payload;

  return {
    ...payload,
    currentTrackId: track.rvtr,
    live: null,
    track,
    destination: {
      kind: "EXPERIENCE",
      href: `/retroverse-2/song/${encodeURIComponent(track.rvtr)}`,
    },
    channel: null,
  };
}
