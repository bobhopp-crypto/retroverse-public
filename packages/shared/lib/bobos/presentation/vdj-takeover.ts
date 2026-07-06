import "server-only";

import { loadBroadcastSnapshot, saveBroadcastSnapshot } from "./broadcast-snapshot";
import { pushBroadcastToPublic } from "./push-public";
import { loadPresentationState, savePresentationState } from "./store";
import { resolvePlayhead } from "./resolve-playhead";
import type { PlayheadVdjState, PresentationState } from "./types";
import { loadSundayNightsState, saveSundayNightsState } from "@/lib/sunday-nights/state";

/** Idle grace period before broadcast rotation resumes. */
export const VDJ_IDLE_RESUME_MS = 15_000;

export function normalizePresentationStateFields(
  parsed: Partial<PresentationState>,
): Pick<
  PresentationState,
  "autoFollowVdj" | "vdjTakeoverActive" | "vdjStoppedAt" | "broadcastSourceMeta"
> {
  return {
    autoFollowVdj: parsed.autoFollowVdj !== false,
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

  if (!enabled) {
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

  await pauseBroadcastRotation();
}

/** VirtualDJ playback stopped — start idle timeout before resuming broadcast. */
export async function handleVdjPlaybackStopped(timestamp: string): Promise<void> {
  if (!(await isAutoFollowEnabled())) return;

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

export async function buildPlayheadVdjState(): Promise<PlayheadVdjState> {
  const [snapshot, sn] = await Promise.all([loadBroadcastSnapshot(), loadSundayNightsState()]);
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

export async function readAutoFollowVdj(): Promise<boolean> {
  const snapshot = await loadBroadcastSnapshot();
  if (snapshot) return snapshot.autoFollowVdj !== false;
  const pres = await loadPresentationState();
  return pres.autoFollowVdj !== false;
}
