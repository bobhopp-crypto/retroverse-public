import "server-only";

import { tickLiveControl } from "@/lib/live-control/engine";
import { loadLiveControlState } from "@/lib/live-control/state";
import { buildSundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";
import type { HomeNowPlaying } from "./homepage-types";

export async function loadBridgeNowPlaying(): Promise<HomeNowPlaying | null> {
  await tickLiveControl();
  const [state, control] = await Promise.all([
    loadSundayNightsState(),
    loadLiveControlState(),
  ]);

  const bridgeActive =
    state.live?.source === "bridge" &&
    Boolean(state.currentTrackId?.trim()) &&
    Boolean(state.live.title?.trim());

  if (!bridgeActive) return null;

  const payload = await buildSundayNightsCurrentPayload(state, control);
  const track = payload.track;
  const live = payload.live;

  return {
    title: track?.title ?? live?.title ?? "Unknown title",
    artist: track?.artistName ?? live?.artist ?? "Unknown artist",
    year: track?.releaseYear ?? live?.year ?? null,
    coverUrl: track?.coverUrl ?? live?.coverUrl ?? null,
    rvtr: payload.currentTrackId,
    liveHref: "/",
  };
}
