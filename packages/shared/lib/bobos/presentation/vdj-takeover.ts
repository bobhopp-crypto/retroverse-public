import "server-only";

import { loadBroadcastSnapshot, saveBroadcastSnapshot } from "./broadcast-snapshot";
import { pushBroadcastToPublic } from "./push-public";
import { loadPresentationState, savePresentationState } from "./store";
import { resolvePlayhead } from "./resolve-playhead";
import type {
  PlayheadPayloadCore,
  PlayheadVdjState,
  PresentationItem,
  PresentationState,
} from "./types";
import { loadSundayNightsState, saveSundayNightsState } from "@/lib/sunday-nights/state";
import type { SundayNightsLiveSelection, SundayNightsState } from "@/lib/sunday-nights/types";

/** Idle grace period before broadcast rotation resumes. */
export const VDJ_IDLE_RESUME_MS = 15_000;

/** Stable id — AUTO mode has no queue position; the live VDJ track is the item. */
export const VDJ_LIVE_ITEM_ID = "vdj-live-current";

/** Build the presentation item for the current VirtualDJ track (AUTO mode). */
export function buildVdjPresentationItem(live: SundayNightsLiveSelection): PresentationItem {
  const rvtr = live.rvtr?.trim() || null;
  const songKey = live.songKey?.trim() || null;
  const linkId = rvtr ?? (songKey ? `vdj:${songKey}` : VDJ_LIVE_ITEM_ID);

  return {
    id: VDJ_LIVE_ITEM_ID,
    type: "song",
    title: live.title.trim(),
    subtitle: live.artist.trim(),
    body: "",
    enabled: true,
    durationSeconds: 0,
    transition: "fade",
    trigger: "song-change",
    link: { kind: "song", id: linkId, label: live.title.trim() },
    countdownTarget: null,
    notes: "",
    mediaUrl: null,
    mediaWidth: null,
    mediaHeight: null,
  };
}

/** AUTO mode: audience item is the live VDJ track, not a queue slot. */
export function shouldUseVdjPresentationItem(
  autoFollowVdj: boolean,
  manualTakeActive: boolean,
  vdj: PlayheadVdjState,
  live: SundayNightsLiveSelection | null | undefined,
): boolean {
  if (manualTakeActive) return false;
  if (!autoFollowVdj) return false;
  if (!live?.title?.trim() || !live?.artist?.trim()) return false;
  return vdj.playing || vdj.takeoverActive;
}

/** Override playhead item when AUTO mode follows VirtualDJ. */
export function applyVdjPresentationItem(
  payload: PlayheadPayloadCore,
  sn: SundayNightsState,
  now: Date,
): PlayheadPayloadCore {
  if (
    !shouldUseVdjPresentationItem(
      payload.autoFollowVdj,
      payload.manualTakeActive,
      payload.vdj,
      sn.live,
    ) ||
    !sn.live
  ) {
    return payload;
  }

  const item = buildVdjPresentationItem(sn.live);
  let elapsedSeconds = 0;
  const startedAt = sn.live.bridgeTimestamp?.trim();
  if (startedAt) {
    elapsedSeconds = Math.max(0, Math.floor((now.getTime() - Date.parse(startedAt)) / 1000));
  }

  return {
    ...payload,
    onAir: true,
    item,
    itemIndex: -1,
    nextItem: null,
    elapsedSeconds,
    mode: payload.vdj.playing ? "playing" : payload.mode,
  };
}

export function normalizePresentationStateFields(
  parsed: Partial<PresentationState>,
): Pick<
  PresentationState,
  "autoFollowVdj" | "manualTakeActive" | "vdjTakeoverActive" | "vdjStoppedAt" | "broadcastSourceMeta"
> {
  return {
    autoFollowVdj: parsed.autoFollowVdj !== false,
    manualTakeActive: parsed.manualTakeActive === true,
    vdjTakeoverActive: parsed.vdjTakeoverActive === true,
    vdjStoppedAt:
      typeof parsed.vdjStoppedAt === "string" && parsed.vdjStoppedAt.trim()
        ? parsed.vdjStoppedAt.trim()
        : null,
    broadcastSourceMeta: parsed.broadcastSourceMeta ?? null,
  };
}

async function isAutoFollowEnabled(): Promise<boolean> {
  const snapshot = await loadBroadcastSnapshot();
  if (snapshot) return snapshot.autoFollowVdj !== false;
  const pres = await loadPresentationState();
  return pres.autoFollowVdj !== false;
}

async function isManualTakeActive(): Promise<boolean> {
  const snapshot = await loadBroadcastSnapshot();
  if (snapshot) return snapshot.manualTakeActive === true;
  const pres = await loadPresentationState();
  return pres.manualTakeActive === true;
}

async function pauseBroadcastRotation(): Promise<void> {
  const snapshot = await loadBroadcastSnapshot();
  if (!snapshot) {
    const { movePlayhead } = await import("./store");
    await movePlayhead({ op: "pause" }, "vdj");
    return;
  }

  const now = new Date();
  const resolved = resolvePlayhead(snapshot.queue, snapshot.playhead, now);
  snapshot.playhead = {
    ...snapshot.playhead,
    presentationId: snapshot.presentationId,
    anchorItemId: resolved.item?.id ?? snapshot.playhead.anchorItemId,
    anchorStartedAt: now.toISOString(),
    mode: "paused",
    movedBy: "vdj",
    updatedAt: now.toISOString(),
  };
  snapshot.updatedAt = now.toISOString();
  await saveBroadcastSnapshot(snapshot);
  await pushBroadcastToPublic(snapshot).catch(() => undefined);
}

async function resumeBroadcastRotation(): Promise<void> {
  const snapshot = await loadBroadcastSnapshot();
  if (!snapshot) {
    const { movePlayhead } = await import("./store");
    await movePlayhead({ op: "play" }, "vdj");
    return;
  }

  const now = new Date();
  const resolved = resolvePlayhead(snapshot.queue, snapshot.playhead, now);
  snapshot.playhead = {
    ...snapshot.playhead,
    presentationId: snapshot.presentationId,
    anchorItemId: resolved.item?.id ?? snapshot.playhead.anchorItemId,
    anchorStartedAt: now.toISOString(),
    mode: "playing",
    movedBy: "vdj",
    updatedAt: now.toISOString(),
  };
  snapshot.updatedAt = now.toISOString();
  await saveBroadcastSnapshot(snapshot);
  await pushBroadcastToPublic(snapshot).catch(() => undefined);
}

export async function setAutoFollowVdj(enabled: boolean): Promise<PresentationState> {
  const state = await loadPresentationState();
  state.autoFollowVdj = enabled;

  if (enabled) {
    // Return to Auto — clear manual take so VDJ can resume driving the audience view.
    state.manualTakeActive = false;
  }

  if (!enabled) {
    state.manualTakeActive = false;
    const sn = await loadSundayNightsState();
    if (sn.vdjTakeoverActive) {
      state.vdjTakeoverActive = false;
      state.vdjStoppedAt = null;
      await saveSundayNightsState({
        ...sn,
        vdjTakeoverActive: false,
        vdjStoppedAt: null,
        updatedAt: new Date().toISOString(),
      });
      await resumeBroadcastRotation();
    }
  }

  await savePresentationState(state);

  const snapshot = await loadBroadcastSnapshot();
  if (snapshot) {
    snapshot.autoFollowVdj = enabled;
    snapshot.manualTakeActive = state.manualTakeActive;
    snapshot.updatedAt = new Date().toISOString();
    await saveBroadcastSnapshot(snapshot);
    await pushBroadcastToPublic(snapshot).catch(() => undefined);
  } else {
    const { syncBroadcast } = await import("./store");
    await syncBroadcast();
  }

  return state;
}

/** VirtualDJ started or changed songs — pause broadcast rotation. */
export async function handleVdjPlaybackStarted(): Promise<void> {
  if (!(await isAutoFollowEnabled())) return;
  // Manual Take is an operator override. VDJ updates remain available as an
  // input, but must not clear or pause the active manual presentation.
  if (await isManualTakeActive()) return;

  const sn = await loadSundayNightsState();
  await saveSundayNightsState({
    ...sn,
    bridgePlaying: true,
    bridgeStoppedAt: null,
    vdjTakeoverActive: true,
    vdjStoppedAt: null,
    updatedAt: new Date().toISOString(),
  });

  const pres = await loadPresentationState();
  pres.vdjTakeoverActive = true;
  pres.vdjStoppedAt = null;
  await savePresentationState(pres);

  const snapshot = await loadBroadcastSnapshot();
  if (snapshot) {
    snapshot.updatedAt = new Date().toISOString();
    await saveBroadcastSnapshot(snapshot);
    await pushBroadcastToPublic(snapshot).catch(() => undefined);
  }

  await pauseBroadcastRotation();
}

/** VirtualDJ playback stopped — start idle timeout before resuming broadcast. */
export async function handleVdjPlaybackStopped(timestamp: string): Promise<void> {
  if (!(await isAutoFollowEnabled())) return;
  if (await isManualTakeActive()) return;

  const sn = await loadSundayNightsState();
  await saveSundayNightsState({
    ...sn,
    bridgePlaying: false,
    bridgeStoppedAt: timestamp,
    vdjStoppedAt: sn.vdjTakeoverActive ? timestamp : sn.vdjStoppedAt ?? null,
    updatedAt: new Date().toISOString(),
  });

  if (!sn.vdjTakeoverActive) return;

  const pres = await loadPresentationState();
  pres.vdjStoppedAt = timestamp;
  await savePresentationState(pres);
}

/** Lazy resume — called on every playhead read after idle timeout elapses. */
export async function maybeResumeBroadcastAfterVdjIdle(): Promise<boolean> {
  const sn = await loadSundayNightsState();
  if (!(await isAutoFollowEnabled()) || !sn.vdjTakeoverActive) return false;
  if (await isManualTakeActive()) return false;

  const stoppedAt = sn.vdjStoppedAt ?? sn.bridgeStoppedAt ?? null;
  if (!stoppedAt || sn.bridgePlaying) return false;

  const elapsed = Date.now() - Date.parse(stoppedAt);
  if (elapsed < VDJ_IDLE_RESUME_MS) return false;

  await saveSundayNightsState({
    ...sn,
    vdjTakeoverActive: false,
    vdjStoppedAt: null,
    updatedAt: new Date().toISOString(),
  });

  const pres = await loadPresentationState();
  pres.vdjTakeoverActive = false;
  pres.vdjStoppedAt = null;
  await savePresentationState(pres);

  await resumeBroadcastRotation();
  return true;
}

export function buildPlayheadVdjStateFromSundayNights(sn: SundayNightsState): PlayheadVdjState {
  const playing = sn.bridgePlaying === true;
  const takeoverActive = sn.vdjTakeoverActive === true;
  const stoppedAt = sn.vdjStoppedAt ?? sn.bridgeStoppedAt ?? null;

  let resumeBroadcastAt: string | null = null;
  if (takeoverActive && stoppedAt && !playing) {
    resumeBroadcastAt = new Date(Date.parse(stoppedAt) + VDJ_IDLE_RESUME_MS).toISOString();
  }

  return {
    playing,
    rvtr: sn.currentTrackId,
    takeoverActive,
    resumeBroadcastAt,
  };
}

export async function buildPlayheadVdjState(): Promise<PlayheadVdjState> {
  const sn = await loadSundayNightsState();
  return buildPlayheadVdjStateFromSundayNights(sn);
}

export async function readAutoFollowVdj(): Promise<boolean> {
  const snapshot = await loadBroadcastSnapshot();
  if (snapshot) return snapshot.autoFollowVdj !== false;
  const pres = await loadPresentationState();
  return pres.autoFollowVdj !== false;
}
