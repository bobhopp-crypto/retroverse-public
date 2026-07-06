import { logLiveNowPlaying } from "@/lib/live-now-playing/logger";
import {
  handleVdjPlaybackStarted,
  handleVdjPlaybackStopped,
} from "@/lib/bobos/presentation/vdj-takeover";
import { pushBridgeLiveUpdateToPublic } from "@/lib/bobos/presentation/push-public";

import { resolveLiveTrack, songKeyFromPath } from "./resolve-live-track";
import { loadSundayNightsState, setLiveTrack } from "./state";
import { usePostgresSundayNightsState } from "./storage-mode";
import type { BridgeLivePostBody, SundayNightsState } from "./types";

async function forwardBridgeUpdateToPublic(body: BridgeLivePostBody): Promise<void> {
  if (usePostgresSundayNightsState()) return;

  const result = await pushBridgeLiveUpdateToPublic(body);
  if (result.status === "synced") {
    await logLiveNowPlaying("bridge_public_push_ok", {
      destination: result.destination,
      httpStatus: result.httpStatus,
    }).catch(() => undefined);
    return;
  }

  await logLiveNowPlaying("bridge_public_push_failed", {
    status: result.status,
    detail: result.detail,
    destination: result.destination,
    httpStatus: result.httpStatus,
  }).catch(() => undefined);
  console.error("[applyBridgeLiveUpdate] production bridge forward failed", result);
}

export async function applyBridgeLiveUpdate(
  body: BridgeLivePostBody,
): Promise<SundayNightsState> {
  const timestamp = body.timestamp?.trim() || new Date().toISOString();
  const playing = body.playing === true;

  if (!playing) {
    await logLiveNowPlaying("playback_stopped", { timestamp });
    await handleVdjPlaybackStopped(timestamp);
    const state = await loadSundayNightsState();
    await forwardBridgeUpdateToPublic(body);
    return state;
  }

  const filepath = body.filepath?.trim() ?? "";
  const artist = body.artist?.trim() ?? "";
  const title = body.title?.trim() ?? "";
  const deck = Number(body.deck);

  if (!filepath || !artist || !title || !Number.isFinite(deck) || deck < 1) {
    throw new Error("filepath, artist, title, and deck are required when playing");
  }

  await logLiveNowPlaying("track_detected", { filepath, artist, title, deck, timestamp, playing });

  const resolved = await resolveLiveTrack({ filepath, artist, title });

  if (resolved.resolution === "filepath") {
    await logLiveNowPlaying("rvtr_resolved", { rvtr: resolved.rvtr, method: "filepath", filepath });
  } else if (resolved.resolution === "vdj-library") {
    await logLiveNowPlaying("rvtr_resolved", {
      rvtr: resolved.rvtr,
      method: "vdj-library",
      filepath,
      artist,
      title,
    });
  } else if (resolved.resolution === "fallback") {
    await logLiveNowPlaying("rvtr_fallback", { rvtr: resolved.rvtr, filepath, artist, title });
  } else {
    await logLiveNowPlaying("rvtr_unresolved", { filepath, artist, title });
  }

  const state = await setLiveTrack(
    {
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
    },
    { bridgePlaying: true },
  );

  await handleVdjPlaybackStarted();

  await logLiveNowPlaying("live_state_updated", {
    rvtr: resolved.rvtr,
    resolution: resolved.resolution,
    deck,
    playing: true,
    updatedAt: state.updatedAt,
  });

  await forwardBridgeUpdateToPublic(body);

  return state;
}
