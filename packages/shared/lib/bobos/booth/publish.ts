/**
 * Booth → Broadcast Publisher (Sprint 5+).
 * One-way: Booth Store → syncBroadcast / pushBroadcastToPublic.
 * Never reads retroverse.live back into the Booth Store.
 */

import type { BoothVdjAssetView } from "./vdj-source";
import { isOnAirPrimary, type BoothAsset, type BoothSource, type BoothState } from "./types";

import type { BoothPublisherState, PresentationItem, PresentationItemType } from "@/lib/bobos/presentation/types";

export type BoothPublishVdjInput = {
  artist: string;
  title: string;
  rvtr: string | null;
  coverUrl: string | null;
} | null;

export function boothAirPublishKey(
  state: BoothState,
  vdj: BoothPublishVdjInput = null,
): string {
  if (!isOnAirPrimary(state.primary) || !state.currentSource) {
    return `standby:${state.primary}`;
  }
  if (state.currentSource === "VirtualDJ" && vdj) {
    return `air:VirtualDJ:${vdj.rvtr ?? ""}:${vdj.artist}:${vdj.title}`;
  }
  return `air:${state.currentSource}:${state.currentAsset?.id ?? ""}`;
}

/** True when ownership / on-air identity changed and should publish once. */
export function shouldPublishBoothOwnership(
  prev: BoothState,
  next: BoothState,
  vdj: BoothPublishVdjInput = null,
): boolean {
  if (!isOnAirPrimary(prev.primary) && !isOnAirPrimary(next.primary)) {
    return false;
  }
  return boothAirPublishKey(prev, vdj) !== boothAirPublishKey(next, vdj);
}

export function boothAirItemId(source: BoothSource): string {
  return `booth-air-${source.toLowerCase()}`;
}

function itemTypeForSource(source: BoothSource): PresentationItemType {
  switch (source) {
    case "VirtualDJ":
      return "song";
    case "Announcement":
    case "Giveaway":
    case "Emergency":
      return "announcement";
    case "Program":
    default:
      return "slide";
  }
}

function baseItem(
  id: string,
  type: PresentationItemType,
  title: string,
  subtitle: string,
  extras?: Partial<PresentationItem>,
): PresentationItem {
  return {
    id,
    type,
    title,
    subtitle,
    body: "",
    enabled: true,
    durationSeconds: 0,
    transition: "cut",
    trigger: "manual",
    link: null,
    countdownTarget: null,
    notes: "Published by The Booth",
    mediaUrl: null,
    mediaWidth: null,
    mediaHeight: null,
    ...extras,
  };
}

/**
 * Build Booth publisher item for interrupt Sources.
 * Program uses the authoritative PresentationItem from the queue (see publish-ownership).
 */
export function buildBoothAirItem(
  state: BoothState,
  vdj: BoothPublishVdjInput | BoothVdjAssetView | null,
): PresentationItem | null {
  if (!isOnAirPrimary(state.primary) || !state.currentSource || !state.currentAsset) {
    return null;
  }

  const source = state.currentSource;
  if (source === "Program") {
    // Never invent a Program presentation item here.
    return null;
  }

  const id = boothAirItemId(source);

  if (source === "VirtualDJ" && vdj?.artist && vdj?.title) {
    const rvtr = vdj.rvtr?.trim() || null;
    return baseItem(id, "song", vdj.title, vdj.artist, {
      link: rvtr ? { kind: "song", id: rvtr, label: vdj.title } : null,
      mediaUrl: vdj.coverUrl ?? null,
    });
  }

  const asset: BoothAsset = state.currentAsset;
  return baseItem(id, itemTypeForSource(source), asset.title, source);
}

export function buildBoothPublisherState(
  state: BoothState,
  vdj: BoothPublishVdjInput | BoothVdjAssetView | null,
  sessionActive: boolean,
  ownershipAt: number | null = null,
  programItem: PresentationItem | null = null,
): BoothPublisherState {
  if (!sessionActive) {
    return { sessionActive: false, source: null, item: null, ownershipAt };
  }
  if (state.currentSource === "Program") {
    return {
      sessionActive: true,
      source: "Program",
      item: programItem,
      ownershipAt,
    };
  }
  return {
    sessionActive: true,
    source: state.currentSource,
    item: buildBoothAirItem(state, vdj),
    ownershipAt,
  };
}

export function injectBoothItemIntoQueue<T extends { items: PresentationItem[]; loop: boolean }>(
  queue: T,
  item: PresentationItem,
): T {
  return {
    ...queue,
    items: [item, ...queue.items.filter((entry) => !entry.id.startsWith("booth-air-"))],
  };
}
