import type { SourceRange } from "./cutter-edit-model";

export type CutterPlaybackMode =
  | "paused"
  | "source_navigation"
  | "working"
  | "clip_preview";

export type ActivePlaybackMode = Exclude<CutterPlaybackMode, "paused">;

export type CutterScrubState =
  | "idle"
  | "overview_drag"
  | "detail_drag"
  | "working_drag"
  | "marker_or_control_drag";

export type PlaybackControllerState = {
  mode: CutterPlaybackMode;
  resumeMode: ActivePlaybackMode;
  previewClipId: string | null;
  handledBoundaryKey: string | null;
  seekInProgress: boolean;
};

export type PlaybackBoundaryDecision =
  | { type: "none" }
  | { type: "seek"; sourceTimeSec: number; boundaryKey: string }
  | {
      type: "pause";
      sourceTimeSec: number;
      reason: "working_complete" | "clip_preview_complete";
      boundaryKey: string;
    };

export const SCRUB_SEEK_INTERVAL_MS = 75;

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function boundaryKey(sourceEndSec: number, nextStartSec?: number): string {
  return `${sourceEndSec.toFixed(6)}->${
    nextStartSec == null ? "END" : nextStartSec.toFixed(6)
  }`;
}

export function boundaryToleranceSec(frameRate: number): number {
  const twoFrames = finite(frameRate) && frameRate > 0 ? 2 / frameRate : 0;
  return Math.max(0.1, twoFrames);
}

export function beginPlayback(
  current: PlaybackControllerState,
  mode: ActivePlaybackMode,
  previewClipId: string | null = null,
): PlaybackControllerState {
  return {
    mode,
    resumeMode: mode,
    previewClipId: mode === "clip_preview" ? previewClipId : null,
    handledBoundaryKey: null,
    seekInProgress: false,
  };
}

export function pausePlayback(
  current: PlaybackControllerState,
): PlaybackControllerState {
  return {
    ...current,
    mode: "paused",
    resumeMode: current.mode === "paused" ? current.resumeMode : current.mode,
    seekInProgress: false,
  };
}

export function nativeSeekTransition(
  current: PlaybackControllerState,
): PlaybackControllerState {
  return {
    ...current,
    mode: "paused",
    resumeMode: "source_navigation",
    previewClipId: null,
    handledBoundaryKey: null,
    seekInProgress: false,
  };
}

export function completeClipPreview(
  current: PlaybackControllerState,
): PlaybackControllerState {
  return {
    ...current,
    mode: "paused",
    resumeMode: "working",
    previewClipId: null,
    handledBoundaryKey: null,
    seekInProgress: false,
  };
}

export function beginScrub(
  current: PlaybackControllerState,
  scrubState: Exclude<CutterScrubState, "idle">,
): { playback: PlaybackControllerState; scrubState: CutterScrubState } {
  const resumeMode: ActivePlaybackMode =
    scrubState === "working_drag" ? "working" : "source_navigation";
  return {
    playback: {
      ...current,
      mode: "paused",
      resumeMode,
      previewClipId: null,
      handledBoundaryKey: null,
      seekInProgress: false,
    },
    scrubState,
  };
}

export function finishScrub(
  current: PlaybackControllerState,
  scrubState: Exclude<CutterScrubState, "idle">,
): PlaybackControllerState {
  return beginScrub(current, scrubState).playback;
}

export function decidePlaybackBoundary(options: {
  mode: CutterPlaybackMode;
  sourceTimeSec: number;
  remainingRanges: SourceRange[];
  previewRange: SourceRange | null;
  toleranceSec: number;
  handledBoundaryKey: string | null;
  seekInProgress: boolean;
  scrubState: CutterScrubState;
}): PlaybackBoundaryDecision {
  if (
    options.mode === "paused" ||
    options.mode === "source_navigation" ||
    options.scrubState !== "idle" ||
    options.seekInProgress ||
    !finite(options.sourceTimeSec)
  ) {
    return { type: "none" };
  }

  const toleranceSec = Math.max(0, options.toleranceSec);
  if (options.mode === "clip_preview") {
    const preview = options.previewRange;
    if (!preview) return { type: "none" };
    const key = `PREVIEW->${preview.sourceEndSec.toFixed(6)}`;
    if (
      options.sourceTimeSec >= preview.sourceEndSec - toleranceSec &&
      options.handledBoundaryKey !== key
    ) {
      return {
        type: "pause",
        sourceTimeSec: preview.sourceEndSec,
        reason: "clip_preview_complete",
        boundaryKey: key,
      };
    }
    return { type: "none" };
  }

  if (options.remainingRanges.length === 0) return { type: "none" };
  for (let index = 0; index < options.remainingRanges.length; index += 1) {
    const range = options.remainingRanges[index];
    const next = options.remainingRanges[index + 1];
    if (options.sourceTimeSec < range.sourceStartSec - toleranceSec) {
      const key = boundaryKey(
        index === 0 ? range.sourceStartSec : options.remainingRanges[index - 1].sourceEndSec,
        range.sourceStartSec,
      );
      return options.handledBoundaryKey === key
        ? { type: "none" }
        : { type: "seek", sourceTimeSec: range.sourceStartSec, boundaryKey: key };
    }
    if (options.sourceTimeSec < range.sourceEndSec - toleranceSec) {
      return { type: "none" };
    }
    if (options.sourceTimeSec <= range.sourceEndSec + toleranceSec) {
      const key = boundaryKey(range.sourceEndSec, next?.sourceStartSec);
      if (options.handledBoundaryKey === key) return { type: "none" };
      return next
        ? { type: "seek", sourceTimeSec: next.sourceStartSec, boundaryKey: key }
        : {
            type: "pause",
            sourceTimeSec: range.sourceEndSec,
            reason: "working_complete",
            boundaryKey: key,
          };
    }
  }

  const finalRange = options.remainingRanges.at(-1)!;
  const finalKey = boundaryKey(finalRange.sourceEndSec);
  return options.handledBoundaryKey === finalKey
    ? { type: "none" }
    : {
        type: "pause",
        sourceTimeSec: finalRange.sourceEndSec,
        reason: "working_complete",
        boundaryKey: finalKey,
      };
}

export function shouldIssueScrubSeek(
  lastSeekAtMs: number | null,
  nowMs: number,
  intervalMs = SCRUB_SEEK_INTERVAL_MS,
): boolean {
  return (
    lastSeekAtMs == null ||
    !finite(lastSeekAtMs) ||
    nowMs - lastSeekAtMs >= Math.max(0, intervalMs)
  );
}

export function mediaSeekMethod(options: {
  exact: boolean;
  fastSeekSupported: boolean;
}): "fastSeek" | "currentTime" {
  return !options.exact && options.fastSeekSupported ? "fastSeek" : "currentTime";
}

export function playerSourceHandoff<T extends {
  sourcePlayheadSec: number;
  activeInSec: number | null;
  selectedClipId: string | null;
  playback: PlaybackControllerState;
}>(state: T): T {
  return {
    ...state,
    playback: {
      ...pausePlayback(state.playback),
      previewClipId: null,
      handledBoundaryKey: null,
      seekInProgress: false,
    },
  };
}
