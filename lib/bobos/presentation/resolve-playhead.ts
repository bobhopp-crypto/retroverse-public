/**
 * Pure playhead resolution — no I/O, no timers.
 *
 * The playhead stores an anchor (item + start time). The current item is
 * derived by walking enabled-item durations forward from that anchor.
 * Auto-advance therefore happens "for free" on every read: the Studio
 * preview, the public player, and the API all compute the same answer
 * from the same stored anchor.
 */

import type { Playhead, PresentationItem, PresentationQueue } from "./types";

export type ResolvedPlayhead = {
  item: PresentationItem | null;
  /** Index within the *enabled* items of the queue. -1 when empty. */
  index: number;
  enabledCount: number;
  /** Seconds the current item has been on screen. */
  elapsedSeconds: number;
};

const EMPTY: ResolvedPlayhead = { item: null, index: -1, enabledCount: 0, elapsedSeconds: 0 };

export function enabledItems(queue: PresentationQueue): PresentationItem[] {
  return queue.items.filter((item) => item.enabled);
}

/**
 * Resolve the current item for a queue given the stored playhead anchor.
 *
 * Rules:
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

  let index = items.findIndex((item) => item.id === playhead.anchorItemId);
  if (index === -1) index = 0;

  if (playhead.mode === "paused") {
    return { item: items[index], index, enabledCount: items.length, elapsedSeconds: 0 };
  }

  const anchorMs = Date.parse(playhead.anchorStartedAt);
  let remaining = Number.isFinite(anchorMs)
    ? Math.max(0, (now.getTime() - anchorMs) / 1000)
    : 0;

  // Walk forward through durations. Bounded by one full pass beyond the
  // current cycle so a long-idle looping queue resolves in O(n).
  if (queue.loop) {
    const cycle = items.reduce((sum, item) => sum + item.durationSeconds, 0);
    const holds = items.some((item) => item.durationSeconds <= 0);
    if (cycle > 0 && !holds) {
      // Skip whole loops, then walk the remainder below.
      const offsetToAnchor = items
        .slice(0, index)
        .reduce((sum, item) => sum + item.durationSeconds, 0);
      remaining = (offsetToAnchor + remaining) % cycle;
      index = 0;
    }
  }

  for (let steps = 0; steps <= items.length; steps += 1) {
    const item = items[index];
    if (item.durationSeconds <= 0 || remaining < item.durationSeconds) {
      return {
        item,
        index,
        enabledCount: items.length,
        elapsedSeconds: Math.floor(remaining),
      };
    }
    remaining -= item.durationSeconds;
    if (index === items.length - 1) {
      if (!queue.loop) {
        // Hold on the final item once the queue runs out.
        return { item, index, enabledCount: items.length, elapsedSeconds: Math.floor(remaining) };
      }
      index = 0;
    } else {
      index += 1;
    }
  }

  // Unreachable in practice; hold on the anchor as a safe fallback.
  const item = items[Math.min(index, items.length - 1)];
  return { item, index: Math.min(index, items.length - 1), enabledCount: items.length, elapsedSeconds: 0 };
}

/** Enabled-item index for prev/next/jump controls. Returns null when empty. */
export function stepIndex(
  enabledCount: number,
  currentIndex: number,
  direction: 1 | -1,
  loop: boolean,
): number | null {
  if (enabledCount === 0) return null;
  const next = currentIndex + direction;
  if (next < 0) return loop ? enabledCount - 1 : 0;
  if (next >= enabledCount) return loop ? 0 : enabledCount - 1;
  return next;
}
