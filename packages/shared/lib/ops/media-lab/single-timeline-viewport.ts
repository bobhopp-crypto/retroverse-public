export type TimelineViewport = { startWorkingSec: number; endWorkingSec: number };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function fitTimeline(workingDurationSec: number): TimelineViewport {
  return { startWorkingSec: 0, endWorkingSec: Math.max(0, workingDurationSec) };
}

export function clampViewport(view: TimelineViewport, workingDurationSec: number): TimelineViewport {
  const duration = Math.max(0, Math.min(workingDurationSec, view.endWorkingSec - view.startWorkingSec));
  const maxStart = Math.max(0, workingDurationSec - duration);
  const start = clamp(Number.isFinite(view.startWorkingSec) ? view.startWorkingSec : 0, 0, maxStart);
  return { startWorkingSec: start, endWorkingSec: start + duration };
}

export function edgeFocusViewport(edgeWorkingSec: number, visibleDurationSec: number, workingDurationSec: number): TimelineViewport {
  const duration = clamp(visibleDurationSec, Math.min(0.1, workingDurationSec), Math.max(0.1, workingDurationSec));
  return clampViewport({ startWorkingSec: edgeWorkingSec - duration / 2, endWorkingSec: edgeWorkingSec + duration / 2 }, workingDurationSec);
}

export function zoomViewport(view: TimelineViewport, pointerRatio: number, factor: number, workingDurationSec: number): TimelineViewport {
  const currentDuration = Math.max(0.1, view.endWorkingSec - view.startWorkingSec);
  const nextDuration = clamp(currentDuration / Math.max(0.1, factor), 0.1, Math.max(0.1, workingDurationSec));
  const anchor = view.startWorkingSec + clamp(pointerRatio, 0, 1) * currentDuration;
  return clampViewport({ startWorkingSec: anchor - clamp(pointerRatio, 0, 1) * nextDuration, endWorkingSec: anchor + (1 - clamp(pointerRatio, 0, 1)) * nextDuration }, workingDurationSec);
}

export function panViewport(view: TimelineViewport, deltaWorkingSec: number, workingDurationSec: number): TimelineViewport {
  return clampViewport({ startWorkingSec: view.startWorkingSec + deltaWorkingSec, endWorkingSec: view.endWorkingSec + deltaWorkingSec }, workingDurationSec);
}

export function viewportPositionToWorkingTime(position: number, view: TimelineViewport): number {
  return view.startWorkingSec + clamp(position, 0, 1) * Math.max(0, view.endWorkingSec - view.startWorkingSec);
}

export function workingTimeToViewportPosition(workingSec: number, view: TimelineViewport): number {
  const duration = view.endWorkingSec - view.startWorkingSec;
  return duration <= 0 ? 0 : clamp((workingSec - view.startWorkingSec) / duration, 0, 1);
}
