import {
  enabledItems,
  stepIndex,
} from "@/lib/bobos/presentation/resolve-playhead";
import type {
  PlayheadPayload,
  PlayheadPayloadCore,
  PresentationQueue,
} from "@/lib/bobos/presentation/types";

import { normalizePlayheadPayload } from "./normalize-playhead";

export const PATRON_BROWSING_INACTIVITY_MS = 10 * 60 * 1000;

export type PatronNavigationDirection = "previous" | "next";

export type PatronPresentationSnapshot = {
  itemIndex: number;
  presentation: NonNullable<PlayheadPayload["presentation"]>;
  publishedAt: string | null;
  queue: PresentationQueue;
  updatedAt: string;
};

export function patronPresentationKey(snapshot: PatronPresentationSnapshot): string {
  return `${snapshot.presentation.id}:${snapshot.publishedAt ?? "unpublished"}`;
}

/** Enabled-item index after a patron-local Previous/Next action. */
export function movePatronIndex(
  queue: PresentationQueue,
  presenterIndex: number,
  manualIndex: number | null,
  direction: PatronNavigationDirection,
): number | null {
  const items = enabledItems(queue);
  if (items.length === 0) return null;

  const requestedIndex = manualIndex ?? presenterIndex;
  const currentIndex = Math.min(Math.max(requestedIndex, 0), items.length - 1);
  return stepIndex(
    items.length,
    currentIndex,
    direction === "next" ? 1 : -1,
    queue.loop,
  );
}

/**
 * Create a patron-local render payload for one published queue item.
 * This is pure derivation only; it never moves or writes the presenter playhead.
 */
export function resolvePatronSelection(
  snapshot: PatronPresentationSnapshot,
  manualIndex: number,
): PlayheadPayload | null {
  const items = enabledItems(snapshot.queue);
  const item = items[manualIndex] ?? null;
  if (!item) return null;

  const nextIndex = stepIndex(items.length, manualIndex, 1, snapshot.queue.loop);
  const nextItem = nextIndex == null || nextIndex === manualIndex ? null : items[nextIndex] ?? null;
  const core: PlayheadPayloadCore = {
    onAir: true,
    presentation: snapshot.presentation,
    item,
    itemIndex: manualIndex,
    itemCount: items.length,
    mode: "paused",
    elapsedSeconds: 0,
    nextItem,
    queue: snapshot.queue,
    publishedAt: snapshot.publishedAt,
    updatedAt: snapshot.updatedAt,
    autoFollowVdj: false,
    manualTakeActive: true,
    vdj: {
      playing: false,
      rvtr: null,
      takeoverActive: false,
      resumeBroadcastAt: null,
    },
  };

  return normalizePlayheadPayload(core);
}

export function patronBrowsingExpired(lastInteractionAt: number, now: number): boolean {
  return now - lastInteractionAt >= PATRON_BROWSING_INACTIVITY_MS;
}
