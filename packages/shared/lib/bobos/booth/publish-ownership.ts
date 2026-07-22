import "server-only";

import {
  getPresentation,
  loadPresentationState,
  savePresentationState,
  syncBroadcast,
} from "@/lib/bobos/presentation/store";
import type { PublicPushResult } from "@/lib/bobos/presentation/push-public";
import type { PresentationItem } from "@/lib/bobos/presentation/types";

import {
  boothAirPublishKey,
  buildBoothPublisherState,
  type BoothPublishVdjInput,
} from "./publish";
import { findExactEnabledItem } from "./program-view";
import { isOnAirPrimary, type BoothState } from "./types";

export type BoothOwnershipPublishResult = {
  push: PublicPushResult;
  publishedKey: string;
  skippedDuplicate: boolean;
};

async function resolveProgramItem(booth: BoothState): Promise<PresentationItem | null> {
  if (booth.currentSource !== "Program" || !booth.currentAsset?.id) return null;
  const state = await loadPresentationState();
  const id = state.activePresentationId;
  if (!id) return null;
  const presentation = await getPresentation(id);
  const queue = presentation?.published?.queue;
  if (!queue) return null;
  return findExactEnabledItem(queue, booth.currentAsset.id);
}

/**
 * Publish current Booth ownership through the existing Broadcast pipeline.
 * Exactly one syncBroadcast → pushBroadcastToPublic per intentional transition.
 * Duplicate keys are skipped (idempotent).
 */
export async function publishBoothOwnership(
  booth: BoothState,
  vdj: BoothPublishVdjInput = null,
  ownershipAt: number | null = null,
): Promise<BoothOwnershipPublishResult> {
  const state = await loadPresentationState();
  const now = new Date().toISOString();
  const publishedKey = boothAirPublishKey(booth, vdj);

  const priorAt = state.boothPublisher?.ownershipAt;
  if (
    typeof ownershipAt === "number" &&
    typeof priorAt === "number" &&
    ownershipAt < priorAt
  ) {
    return {
      push: { status: "synced", detail: "Stale Booth ownership publish skipped" },
      publishedKey,
      skippedDuplicate: true,
    };
  }

  // Idempotent: same air identity already published.
  if (state.lastBoothPublishedKey === publishedKey && isOnAirPrimary(booth.primary)) {
    return {
      push: { status: "synced", detail: "Idempotent publish skipped" },
      publishedKey,
      skippedDuplicate: true,
    };
  }

  const onAir = isOnAirPrimary(booth.primary);
  const wasSession = state.boothPublisher?.sessionActive === true;
  const activeSession = onAir ? true : false;
  const leavingSession = wasSession && !activeSession;

  const programItem = activeSession ? await resolveProgramItem(booth) : null;
  if (booth.currentSource === "Program" && activeSession && !programItem) {
    return {
      push: {
        status: "rejected",
        detail: "Program RVBA unavailable — not fabricating a presentation item",
      },
      publishedKey,
      skippedDuplicate: false,
    };
  }

  const boothPublisher = buildBoothPublisherState(
    booth,
    vdj,
    activeSession,
    ownershipAt,
    programItem,
  );

  state.boothPublisher = boothPublisher;
  state.autoFollowVdj = false;
  state.manualTakeActive = activeSession && (booth.currentSource === "Program" || Boolean(boothPublisher.item));
  state.vdjTakeoverActive = false;
  state.vdjStoppedAt = null;

  if (booth.currentSource === "Program" && programItem) {
    // Playhead already authoritative — only ensure presentation id + mode.
    state.playhead = {
      ...state.playhead,
      presentationId: state.activePresentationId,
      anchorItemId: programItem.id,
      mode: booth.paused ? "paused" : "playing",
      movedBy: "cockpit",
      updatedAt: now,
    };
  } else if (boothPublisher.item && booth.currentSource !== "Program") {
    // Interrupt owns The Air for the public snapshot only.
    // Preserve Presentation playhead as the frozen Program return position.
    state.playhead = {
      ...state.playhead,
      presentationId: state.activePresentationId,
      mode: "paused",
      movedBy: "cockpit",
      updatedAt: now,
    };
  } else if (leavingSession) {
    state.playhead = {
      ...state.playhead,
      mode: "paused",
      movedBy: "cockpit",
      updatedAt: now,
    };
  }

  state.lastBoothPublishedKey = publishedKey;
  await savePresentationState(state);
  const push = await syncBroadcast();

  return {
    push,
    publishedKey,
    skippedDuplicate: false,
  };
}
