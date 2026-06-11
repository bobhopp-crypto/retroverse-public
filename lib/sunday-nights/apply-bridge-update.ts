import { logLiveNowPlaying } from "@/lib/live-now-playing/logger";

import { resolveLiveTrack, songKeyFromPath } from "./resolve-live-track";
import { setLiveTrack } from "./state";
import type { BridgeLivePostBody, SundayNightsState } from "./types";

export async function applyBridgeLiveUpdate(
  body: BridgeLivePostBody,
): Promise<SundayNightsState> {
  const filepath = body.filepath?.trim() ?? "";
  const artist = body.artist?.trim() ?? "";
  const title = body.title?.trim() ?? "";
  const deck = Number(body.deck);
  const timestamp = body.timestamp?.trim() || new Date().toISOString();

  if (!filepath || !artist || !title || !Number.isFinite(deck) || deck < 1) {
    throw new Error("filepath, artist, title, and deck are required");
  }

  await logLiveNowPlaying("track_detected", { filepath, artist, title, deck, timestamp });

  const resolved = await resolveLiveTrack({ filepath, artist, title });

  if (resolved.resolution === "filepath") {
    await logLiveNowPlaying("rvtr_resolved", { rvtr: resolved.rvtr, method: "filepath", filepath });
  } else if (resolved.resolution === "fallback") {
    await logLiveNowPlaying("rvtr_fallback", { rvtr: resolved.rvtr, filepath, artist, title });
  } else {
    await logLiveNowPlaying("rvtr_unresolved", { filepath, artist, title });
  }

  const state = await setLiveTrack({
    rvtr: resolved.rvtr,
    artist,
    title,
    year: resolved.year,
    coverUrl: resolved.coverUrl,
    songKey: songKeyFromPath(filepath),
    source: "bridge",
    filepath,
    deck,
    bridgeTimestamp: timestamp,
    resolution: resolved.resolution,
  });

  await logLiveNowPlaying("live_state_updated", {
    rvtr: resolved.rvtr,
    resolution: resolved.resolution,
    deck,
    updatedAt: state.updatedAt,
  });

  return state;
}
