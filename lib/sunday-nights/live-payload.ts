import { loadTrackPage, type TrackPageData } from "@/lib/track/load-track-page";

import type { SundayNightsLiveSelection, SundayNightsState } from "./types";

export type SundayNightsCurrentPayload = {
  currentTrackId: string | null;
  live: SundayNightsLiveSelection | null;
  updatedAt: string;
  track: TrackPageData | null;
};

export async function buildSundayNightsCurrentPayload(
  state: SundayNightsState,
): Promise<SundayNightsCurrentPayload> {
  const track = state.currentTrackId
    ? await loadTrackPage(state.currentTrackId)
    : null;

  return {
    currentTrackId: state.currentTrackId,
    live: state.live,
    updatedAt: state.updatedAt,
    track,
  };
}
