/**
 * Pure playhead resolution — no I/O, no timers.
 *
 * The playhead stores an anchor (item + start time). The current item is
 * derived by walking enabled-item durations forward from that anchor.
 * Auto-advance therefore happens "for free" on every read: the Studio
 * preview, the public player, and the API all compute the same answer
 * from the same stored anchor.
 *
 * Missing / disabled anchors fail closed — never fall back to queue index 0.
 */

import type { Playhead, PresentationItem, PresentationQueue } from "./types";

export type ResolvedPlayhead = {
  item: PresentationItem | null;
  /** Index within the *enabled* items of the queue. -1 when empty or unavailable. */
  index: number;
  enabledCount: number;
  /** Seconds the current item has been on screen. */
  elapsedSeconds: number;
  /** False when the anchor is missing/disabled — do not fabricate a current item. */
  available: boolean;
};

const EMPTY: ResolvedPlayhead = {
  item: null,
  index: -1,
  enabledCount: 0,
  elapsedSeconds: 0,
  available: false,
};

export function enabledItems(queue: PresentationQueue): PresentationItem[] {
  return queue.items.filter((item) => item.enabled);
}

/**
 * Resolve the current item for a queue given the stored playhead anchor.
 *
 * Rules:
 * - Missing/null/disabled anchor: unavailable (no index-0 fallback).
 * - Paused: hold on the anchor item; elapsed clock stays at 0.
 * - Playing: consume elapsed wall time through item durations from the anchor.
 * - Duration 0 means "hold until moved manually" — walking stops there.
 * - When the walk passes the last item: loop to the first when queue.loop,
 *   otherwise hold on the last item.
 */
export function resolvePlayhead(
  queue: PresentationQueue,
  playhead: Playhead,
  now: Date = new Date(),
): ResolvedPlayhead {
  const items = enabledItems(queue);
  if (items.length === 0) return EMPTY;

  const anchorId = playhead.anchorItemId;
  if (anchorId == null || !String(anchorId).trim()) {
    return {
      item: null,
      index: -1,
      enabledCount: items.length,
      elapsedSeconds: 0,
      available: false,
    };
  }

  const index = items.findIndex((item) => item.id === anchorId);
  if (index === -1) {
    // Anchor points at a missing/disabled item — fail closed.
    return {
      item: null,
      index: -1,
      enabledCount: items.length,
      elapsedSeconds: 0,
      available: false,
    };
  }

  if (playhead.mode === "paused") {
    return {
      item: items[index]!,
      index,
      enabledCount: items.length,
      elapsedSeconds: 0,
      available: true,
    };
  }

  const anchorMs = Date.parse(playhead.anchorStartedAt);
  let remaining = Number.isFinite(anchorMs)
    ? Math.max(0, (now.getTime() - anchorMs) / 1000)
    : 0;
  let walkIndex = index;

  // Walk forward through durations. Bounded by one full pass beyond the
  // current cycle so a long-idle looping queue resolves in O(n).
  if (queue.loop) {
    const cycle = items.reduce((sum, item) => sum + item.durationSeconds, 0);
    const holds = items.some((item) => item.durationSeconds <= 0);
    if (cycle > 0 && !holds) {
      const offsetToAnchor = items
        .slice(0, walkIndex)
        .reduce((sum, item) => sum + item.durationSeconds, 0);
      remaining = (offsetToAnchor + remaining) % cycle;
      walkIndex = 0;
    }
  }

  for (let steps = 0; steps <= items.length; steps += 1) {
    const item = items[walkIndex]!;
    if (item.durationSeconds <= 0 || remaining < item.durationSeconds) {
      return {
        item,
        index: walkIndex,
        enabledCount: items.length,
        elapsedSeconds: Math.floor(remaining),
        available: true,
      };
    }
    remaining -= item.durationSeconds;
    if (walkIndex === items.length - 1) {
      if (!queue.loop) {
        return {
          item,
          index: walkIndex,
          enabledCount: items.length,
          elapsedSeconds: Math.floor(remaining),
          available: true,
        };
      }
      walkIndex = 0;
    } else {
      walkIndex += 1;
    }
  }

  return {
    item: items[index]!,
    index,
    enabledCount: items.length,
    elapsedSeconds: 0,
    available: true,
  };
}

/**
 * Enabled-item index for prev/next controls.
 * Returns null when empty or when current index is unavailable (fail closed).
 */
export function stepIndex(
  enabledCount: number,
  currentIndex: number,
  direction: 1 | -1,
  loop: boolean,
): number | null {
  if (enabledCount === 0) return null;
  if (currentIndex < 0 || currentIndex >= enabledCount) return null;
  const next = currentIndex + direction;
  if (next < 0) return loop ? enabledCount - 1 : null;
  if (next >= enabledCount) return loop ? 0 : null;
  return next;
}
