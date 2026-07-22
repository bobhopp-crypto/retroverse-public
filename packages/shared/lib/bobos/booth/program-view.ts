/**
 * Booth Program view — mirrors of the authoritative Presentation playhead.
 * Index / ordering live only in PresentationQueue + Playhead.
 */

import { enabledItems, resolvePlayhead } from "@/lib/bobos/presentation/resolve-playhead";
import type { Playhead, PresentationItem, PresentationQueue } from "@/lib/bobos/presentation/types";

import type { BoothAsset } from "./types";

export type BoothProgramView = {
  presentationId: string;
  showName: string;
  /** Exact enabled-item index in the authoritative queue (-1 if none). */
  index: number;
  currentAsset: BoothAsset | null;
  nextAsset: BoothAsset | null;
  upcoming: string | null;
  paused: boolean;
  /** False when the anchored item is missing/disabled/empty — never fabricate. */
  currentAvailable: boolean;
  enabledCount: number;
};

export function isValidProgramItem(item: PresentationItem | null | undefined): boolean {
  if (!item || !item.enabled) return false;
  if (!item.id.trim()) return false;
  if (!item.title.trim()) return false;
  return true;
}

export function toBoothAsset(item: PresentationItem): BoothAsset {
  return { id: item.id, title: item.title };
}

export function neighborsFromIndex(
  items: PresentationItem[],
  index: number,
  loop: boolean,
): { next: PresentationItem | null; upcoming: string | null } {
  if (items.length === 0 || index < 0) {
    return { next: null, upcoming: null };
  }
  let nextIndex = index + 1;
  if (nextIndex >= items.length) {
    nextIndex = loop && items.length > 1 ? 0 : -1;
  }
  const next = nextIndex >= 0 ? items[nextIndex]! : null;
  let upcomingIndex = nextIndex >= 0 ? nextIndex + 1 : -1;
  if (upcomingIndex >= items.length) {
    upcomingIndex = loop && items.length > 1 ? 0 : -1;
  }
  if (upcomingIndex === index) upcomingIndex = -1;
  const upcomingItem = upcomingIndex >= 0 ? items[upcomingIndex]! : null;
  return {
    next: next && isValidProgramItem(next) ? next : null,
    upcoming: upcomingItem && isValidProgramItem(upcomingItem) ? upcomingItem.title : null,
  };
}

/** Build Booth mirrors from authoritative queue + playhead. Never invents assets. */
export function buildBoothProgramView(
  presentationId: string,
  showName: string,
  queue: PresentationQueue,
  playhead: Playhead,
  now: Date = new Date(),
): BoothProgramView {
  const items = enabledItems(queue).filter(isValidProgramItem);
  if (items.length === 0) {
    return {
      presentationId,
      showName,
      index: -1,
      currentAsset: null,
      nextAsset: null,
      upcoming: null,
      paused: playhead.mode === "paused",
      currentAvailable: false,
      enabledCount: 0,
    };
  }

  // If anchor points at an invalid/missing item, do not fall back to first.
  const anchorMissing =
    playhead.anchorItemId != null &&
    !items.some((item) => item.id === playhead.anchorItemId);

  if (anchorMissing) {
    return {
      presentationId,
      showName,
      index: -1,
      currentAsset: null,
      nextAsset: null,
      upcoming: null,
      paused: playhead.mode === "paused",
      currentAvailable: false,
      enabledCount: items.length,
    };
  }

  const resolved = resolvePlayhead(queue, playhead, now);
  const current = resolved.item && isValidProgramItem(resolved.item) ? resolved.item : null;
  if (!current) {
    return {
      presentationId,
      showName,
      index: -1,
      currentAsset: null,
      nextAsset: null,
      upcoming: null,
      paused: playhead.mode === "paused",
      currentAvailable: false,
      enabledCount: items.length,
    };
  }

  const index = items.findIndex((item) => item.id === current.id);
  const { next, upcoming } = neighborsFromIndex(items, index, queue.loop !== false);
  return {
    presentationId,
    showName,
    index,
    currentAsset: toBoothAsset(current),
    nextAsset: next ? toBoothAsset(next) : null,
    upcoming,
    paused: playhead.mode === "paused",
    currentAvailable: true,
    enabledCount: items.length,
  };
}

/** First valid enabled item — used only for LOAD SHOW initial Current. */
export function firstValidProgramItem(queue: PresentationQueue): PresentationItem | null {
  return enabledItems(queue).find(isValidProgramItem) ?? null;
}

export function findExactEnabledItem(
  queue: PresentationQueue,
  itemId: string,
): PresentationItem | null {
  const id = itemId.trim();
  if (!id) return null;
  return enabledItems(queue).find((item) => item.id === id && isValidProgramItem(item)) ?? null;
}
