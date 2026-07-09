/**
 * CurrentBroadcast — the single object every presentation surface renders.
 *
 * Broadcast Mixer, PresentationStage, BroadcastViewer, retroverse.live, and
 * any future renderer consume CurrentBroadcast + Rvba only. Neither carries
 * any notion of VirtualDJ, a queue, or a mode-specific code path — that
 * resolution already happened in buildPlayheadPayload().
 *
 * Isomorphic (no server-only imports) — same derivation runs on the server
 * (API route) and in the Studio preview.
 */

import type { PlayheadPayloadCore } from "@/lib/bobos/presentation/types";

import { resolveRvbaFromPresentationItem, type Rvba, type RvbaType } from "./rvba";

export type BroadcastMode = "auto" | "manual";
export type BroadcastState = "playing" | "paused" | "off-air";

export type CurrentBroadcast = {
  id: string;
  mode: BroadcastMode;
  rvbaId: string;
  type: RvbaType;
  /** What is driving this RVBA: "vdj" for the live VirtualDJ track, the
   * on-air presentation id for a queue/manual item, or null when off-air. */
  sourceId: string | null;
  state: BroadcastState;
  startedAt: string;
  /** Seconds this RVBA stays on screen, or null to hold until moved. */
  duration: number | null;
  updatedAt: string;
};

/**
 * The Broadcast Engine overrides the queue with the live VDJ item using
 * itemIndex -1 (see applyVdjPresentationItem); ordinary queue resolution
 * always yields itemIndex >= 0 whenever an item is resolved. This is the
 * only signal deriveCurrentBroadcast needs to tell the two apart.
 */
function isVdjDrivenItem(payload: PlayheadPayloadCore): boolean {
  return payload.item !== null && payload.itemIndex === -1;
}

function computeStartedAt(payload: PlayheadPayloadCore, now: Date): string {
  if (payload.item && payload.mode === "playing") {
    return new Date(now.getTime() - payload.elapsedSeconds * 1000).toISOString();
  }
  // Paused or off-air: nothing to back-compute from elapsed time (it reads 0),
  // so anchor to the payload's own last-moved timestamp instead.
  return payload.updatedAt;
}

/** Pure derivation: PlayheadPayload -> { CurrentBroadcast, Rvba }. */
export function deriveCurrentBroadcast(
  payload: PlayheadPayloadCore,
  now: Date = new Date(),
): { broadcast: CurrentBroadcast; rvba: Rvba | null } {
  const rvba = payload.item ? resolveRvbaFromPresentationItem(payload.item) : null;
  const mode: BroadcastMode =
    payload.autoFollowVdj && !payload.manualTakeActive ? "auto" : "manual";
  const sourceId = payload.item === null
    ? null
    : isVdjDrivenItem(payload)
      ? "vdj"
      : payload.presentation?.id ?? null;
  const state: BroadcastState = payload.item === null ? "off-air" : payload.mode;
  const startedAt = computeStartedAt(payload, now);
  const duration =
    payload.item && payload.item.durationSeconds > 0 ? payload.item.durationSeconds : null;
  const rvbaId = payload.item?.id ?? "off-air";

  const broadcast: CurrentBroadcast = {
    id: `${mode}:${rvbaId}:${startedAt}`,
    mode,
    rvbaId,
    type: rvba?.type ?? "blank",
    sourceId,
    state,
    startedAt,
    duration,
    updatedAt: payload.updatedAt,
  };

  return { broadcast, rvba };
}
