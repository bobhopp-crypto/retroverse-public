import { loadTrackPage } from "@/lib/track/load-track-page";
import { setLiveTrack } from "@/lib/sunday-nights/state";
import type { SundayNightsState } from "@/lib/sunday-nights/types";

import { buildLiveQueue } from "./queue";
import {
  loadLiveControlState,
  mergeLiveControlConfig,
  saveLiveControlState,
} from "./state";
import type { LiveControlConfig, LiveControlState } from "./types";

async function publishRvtr(rvtr: string): Promise<SundayNightsState> {
  const track = await loadTrackPage(rvtr);
  if (!track) throw new Error(`track_not_found:${rvtr}`);

  return setLiveTrack({
    rvtr: track.rvtr,
    artist: track.artistName,
    title: track.title,
    year: track.releaseYear,
    coverUrl: track.coverUrl,
    songKey: null,
    source: "channel",
    filepath: null,
    deck: null,
    bridgeTimestamp: null,
    resolution: null,
  });
}

function scheduleNext(state: LiveControlState): LiveControlState {
  const nextAdvanceAt = new Date(Date.now() + state.durationSeconds * 1000).toISOString();
  return { ...state, nextAdvanceAt };
}

async function playQueueAt(state: LiveControlState, cursor: number): Promise<LiveControlState> {
  if (state.queueRvtrs.length === 0) return state;
  const index = ((cursor % state.queueRvtrs.length) + state.queueRvtrs.length) % state.queueRvtrs.length;
  const rvtr = state.queueRvtrs[index]!;
  await publishRvtr(rvtr);
  const now = new Date().toISOString();
  return scheduleNext({
    ...state,
    queueCursor: index,
    lastChangeAt: now,
  });
}

export async function startLiveChannel(
  configPatch?: Partial<LiveControlConfig>,
): Promise<LiveControlState> {
  let state = await loadLiveControlState();
  if (configPatch) state = mergeLiveControlConfig(state, configPatch);

  if (state.mode === "playlist") {
    state = {
      ...state,
      contentSource: "sunday_nights",
      order: state.order === "random" ? "playlist_order" : state.order,
    };
  }

  if (state.mode === "vdj") {
    const next = await saveLiveControlState({
      ...state,
      running: true,
      lastChangeAt: state.lastChangeAt,
      nextAdvanceAt: null,
    });
    return next;
  }

  const queueRvtrs = await buildLiveQueue(state);
  if (queueRvtrs.length === 0) {
    throw new Error("live_queue_empty");
  }

  let next: LiveControlState = {
    ...state,
    running: true,
    queueRvtrs,
    queueCursor: 0,
    nextAdvanceAt: null,
  };
  next = await playQueueAt(next, 0);
  return saveLiveControlState(next);
}

export async function stopLiveChannel(): Promise<LiveControlState> {
  const state = await loadLiveControlState();
  await setLiveTrack(null);
  return saveLiveControlState({
    ...state,
    running: false,
    nextAdvanceAt: null,
  });
}

export async function nextLiveChannelSong(): Promise<LiveControlState> {
  let state = await loadLiveControlState();
  if (!state.running) throw new Error("live_channel_stopped");
  if (state.mode === "vdj") throw new Error("vdj_mode_manual_next_unavailable");

  if (state.queueRvtrs.length === 0) {
    state = {
      ...state,
      queueRvtrs: await buildLiveQueue(state),
    };
  }
  if (state.queueRvtrs.length === 0) throw new Error("live_queue_empty");

  const nextCursor = state.queueCursor + 1;
  const played = await playQueueAt(state, nextCursor);
  return saveLiveControlState(played);
}

export async function updateLiveControlConfig(
  patch: Partial<LiveControlConfig>,
): Promise<LiveControlState> {
  const state = await loadLiveControlState();
  return saveLiveControlState(mergeLiveControlConfig(state, patch));
}

export async function maybeAdvanceLiveChannel(): Promise<LiveControlState | null> {
  const state = await loadLiveControlState();
  if (!state.running) return null;
  if (state.mode !== "demo" && state.mode !== "playlist") return null;
  if (!state.nextAdvanceAt) return null;

  const due = Date.parse(state.nextAdvanceAt);
  if (!Number.isFinite(due) || Date.now() < due) return null;

  try {
    return await nextLiveChannelSong();
  } catch (err) {
    console.error("[live-control] advance failed", err);
    return null;
  }
}

export async function getLiveControlStatus(): Promise<{
  control: LiveControlState;
  live: SundayNightsState;
  currentTitle: string | null;
  currentArtist: string | null;
  currentRvtr: string | null;
}> {
  const [control, live] = await Promise.all([
    loadLiveControlState(),
    import("@/lib/sunday-nights/state").then((mod) => mod.loadSundayNightsState()),
  ]);

  const rvtr = live.currentTrackId;
  const track = rvtr ? await loadTrackPage(rvtr).catch(() => null) : null;

  return {
    control,
    live,
    currentRvtr: rvtr,
    currentTitle: track?.title ?? live.live?.title ?? null,
    currentArtist: track?.artistName ?? live.live?.artist ?? null,
  };
}
