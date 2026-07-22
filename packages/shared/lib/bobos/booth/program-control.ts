import "server-only";

import {
  getPresentation,
  loadPresentationState,
  movePlayhead,
  savePresentationState,
  syncBroadcast,
} from "@/lib/bobos/presentation/store";
import type { PlayheadCommand } from "@/lib/bobos/presentation/types";

import { publishBoothOwnership, type BoothOwnershipPublishResult } from "./publish-ownership";
import {
  buildBoothProgramView,
  findExactEnabledItem,
  firstValidProgramItem,
  type BoothProgramView,
} from "./program-view";
import type { BoothPublishVdjInput } from "./publish";
import type { BoothState } from "./types";

export type BoothLoadShowResult =
  | { ok: true; view: BoothProgramView; published: false }
  | { ok: false; error: string };

export type BoothProgramTransportOp = "next" | "previous" | "pause" | "resume" | { jump: string };

export type BoothProgramControlResult =
  | {
      ok: true;
      view: BoothProgramView;
      published: boolean;
      publish: BoothOwnershipPublishResult | null;
    }
  | { ok: false; error: string };

async function resolveLoadedPresentation(): Promise<{
  presentationId: string;
  showName: string;
  published: NonNullable<
    NonNullable<Awaited<ReturnType<typeof getPresentation>>>["published"]
  >;
} | null> {
  const state = await loadPresentationState();
  const activeId = state.activePresentationId;
  if (!activeId) return null;
  const presentation = await getPresentation(activeId);
  if (!presentation?.published) return null;
  return {
    presentationId: presentation.id,
    showName: presentation.published.title || presentation.title,
    published: presentation.published,
  };
}

/**
 * LOAD SHOW — resolve one published Program, set first valid Current.
 * Does not publish. Does not change Air ownership.
 */
export async function loadBoothShow(): Promise<BoothLoadShowResult> {
  const loaded = await resolveLoadedPresentation();
  if (!loaded) {
    return {
      ok: false,
      error: "No published Program / Snapshot on the active presentation",
    };
  }

  const first = firstValidProgramItem(loaded.published.queue);
  if (!first) {
    return {
      ok: false,
      error: "Program has no valid RVBAs — load aborted",
    };
  }

  const state = await loadPresentationState();
  const now = new Date().toISOString();
  // Anchor at first valid item, paused — READY until GO LIVE.
  state.activePresentationId = loaded.presentationId;
  state.playhead = {
    presentationId: loaded.presentationId,
    anchorItemId: first.id,
    anchorStartedAt: now,
    mode: "paused",
    movedBy: "cockpit",
    updatedAt: now,
  };
  // Clear Booth publisher session if any leftover — LOAD must not publish.
  if (state.boothPublisher?.sessionActive) {
    state.boothPublisher = {
      sessionActive: false,
      source: null,
      item: null,
      ownershipAt: state.boothPublisher.ownershipAt ?? null,
    };
    state.manualTakeActive = false;
  }
  await savePresentationState(state);
  // Persist paused playhead to Snapshot without ownership publish.
  await syncBroadcast();

  const view = buildBoothProgramView(
    loaded.presentationId,
    loaded.showName,
    loaded.published.queue,
    state.playhead,
  );
  if (!view.currentAvailable || !view.currentAsset) {
    return { ok: false, error: "Program current asset unavailable after load" };
  }

  return { ok: true, view, published: false };
}

async function readProgramView(): Promise<BoothProgramView | null> {
  const loaded = await resolveLoadedPresentation();
  if (!loaded) return null;
  const state = await loadPresentationState();
  return buildBoothProgramView(
    loaded.presentationId,
    loaded.showName,
    loaded.published.queue,
    state.playhead,
  );
}

/**
 * GO LIVE — Program owns The Air; publish current Program RVBA once.
 * Does not advance.
 */
export async function goLiveBoothProgram(
  booth: BoothState,
  ownershipAt: number,
): Promise<BoothProgramControlResult> {
  if (!booth.programLoaded || !booth.presentationId) {
    return { ok: false, error: "No Program loaded — Load Show first" };
  }
  const view = await readProgramView();
  if (!view?.currentAvailable || !view.currentAsset) {
    return { ok: false, error: "No valid Program asset to take On Air" };
  }
  if (view.presentationId !== booth.presentationId) {
    return { ok: false, error: "Loaded Program does not match active presentation" };
  }

  await movePlayhead({ op: "jump", itemId: view.currentAsset.id }, "cockpit", {
    sync: false,
    authority: "booth",
  });
  await movePlayhead({ op: "play" }, "cockpit", { sync: false, authority: "booth" });

  const after = await readProgramView();
  if (!after?.currentAvailable || !after.currentAsset) {
    return { ok: false, error: "Program asset unavailable after GO LIVE" };
  }

  const nextBooth: BoothState = {
    ...booth,
    primary: "PROGRAM",
    currentSource: "Program",
    presentationId: after.presentationId,
    showName: after.showName,
    programLoaded: true,
    currentAsset: after.currentAsset,
    nextAsset: after.nextAsset,
    upcoming: after.upcoming,
    returnTarget: after.currentAsset,
    showActive: true,
    override: false,
    hold: false,
    paused: false,
  };

  const publish = await publishBoothOwnership(nextBooth, null, ownershipAt);
  return { ok: true, view: after, published: true, publish };
}

/**
 * Transport against authoritative playhead.
 * Publishes only when Program owns The Air (or resume needs correction).
 */
export async function transportBoothProgram(
  booth: BoothState,
  op: BoothProgramTransportOp,
  ownershipAt: number,
  vdj: BoothPublishVdjInput = null,
): Promise<BoothProgramControlResult> {
  const loaded = await resolveLoadedPresentation();
  if (!loaded) {
    return { ok: false, error: "No published Program loaded" };
  }

  let command: PlayheadCommand;
  if (op === "next") command = { op: "next" };
  else if (op === "previous") command = { op: "previous" };
  else if (op === "pause") command = { op: "pause" };
  else if (op === "resume") command = { op: "play" };
  else {
    const item = findExactEnabledItem(loaded.published.queue, op.jump);
    if (!item) {
      return { ok: false, error: `JUMP target not found: ${op.jump}` };
    }
    command = { op: "jump", itemId: item.id };
  }

  const programOwnsAir = booth.currentSource === "Program" && booth.primary === "PROGRAM";

  await movePlayhead(command, "cockpit", { sync: false, authority: "booth" });
  const view = await readProgramView();
  if (!view) {
    return { ok: false, error: "Program view unavailable after transport" };
  }

  // Unavailable current: keep last public playhead; do not fabricate / publish.
  if (!view.currentAvailable && (command.op === "next" || command.op === "previous" || command.op === "jump")) {
    return {
      ok: true,
      view,
      published: false,
      publish: null,
    };
  }

  if (!programOwnsAir) {
    // Operator may update frozen Program return position — keep paused, never publish.
    if (command.op === "next" || command.op === "previous" || command.op === "jump") {
      await movePlayhead({ op: "pause" }, "cockpit", { sync: false, authority: "booth" });
      const frozen = await readProgramView();
      return {
        ok: true,
        view: frozen ?? { ...view, paused: true },
        published: false,
        publish: null,
      };
    }
    return { ok: true, view, published: false, publish: null };
  }

  if (op === "pause") {
    // Freeze progression on Snapshot without a new ownership publish.
    await syncBroadcast();
    return {
      ok: true,
      view: { ...view, paused: true },
      published: false,
      publish: null,
    };
  }

  if (op === "resume") {
    const nextBooth: BoothState = {
      ...booth,
      currentAsset: view.currentAsset ?? booth.currentAsset,
      nextAsset: view.nextAsset,
      upcoming: view.upcoming,
      returnTarget: view.currentAsset ?? booth.returnTarget,
      paused: false,
    };
    const state = await loadPresentationState();
    const key = `air:Program:${nextBooth.currentAsset?.id ?? ""}`;
    const playheadMissing =
      !view.currentAvailable ||
      state.lastBoothPublishedKey !== key ||
      state.boothPublisher?.source !== "Program";
    if (!playheadMissing) {
      // Mode change only — sync Snapshot, do not republish ownership.
      await syncBroadcast();
      return { ok: true, view: { ...view, paused: false }, published: false, publish: null };
    }
    const publish = await publishBoothOwnership(nextBooth, vdj, ownershipAt);
    return { ok: true, view: { ...view, paused: false }, published: true, publish };
  }

  // NEXT / PREVIOUS / JUMP while Program owns air — publish new RVBA once.
  const nextBooth: BoothState = {
    ...booth,
    currentAsset: view.currentAsset,
    nextAsset: view.nextAsset,
    upcoming: view.upcoming,
    returnTarget: view.currentAsset,
    paused: false,
  };
  const publish = await publishBoothOwnership(nextBooth, vdj, ownershipAt);
  return { ok: true, view, published: true, publish };
}

/** TAKE interrupt — pause Program progression; preserve playhead index. */
export async function freezeBoothProgramForTake(): Promise<BoothProgramView | null> {
  await movePlayhead({ op: "pause" }, "cockpit", { sync: false, authority: "booth" });
  return readProgramView();
}

/** RETURN — restore frozen Program asset and resume. */
export async function restoreBoothProgram(
  booth: BoothState,
  ownershipAt: number,
): Promise<BoothProgramControlResult> {
  const targetId = booth.returnTarget?.id;
  if (!targetId) {
    return { ok: false, error: "No Program return target" };
  }
  const loaded = await resolveLoadedPresentation();
  if (!loaded) {
    return { ok: false, error: "No published Program loaded" };
  }
  const item = findExactEnabledItem(loaded.published.queue, targetId);
  if (!item) {
    return { ok: false, error: `Return target unavailable: ${targetId}` };
  }

  await movePlayhead({ op: "jump", itemId: item.id }, "cockpit", {
    sync: false,
    authority: "booth",
  });
  await movePlayhead({ op: "play" }, "cockpit", { sync: false, authority: "booth" });
  const view = await readProgramView();
  if (!view?.currentAvailable || !view.currentAsset) {
    return { ok: false, error: "Program unavailable after RETURN" };
  }

  const nextBooth: BoothState = {
    ...booth,
    primary: "PROGRAM",
    currentSource: "Program",
    currentAsset: view.currentAsset,
    nextAsset: view.nextAsset,
    upcoming: view.upcoming,
    returnTarget: view.currentAsset,
    override: false,
    hold: false,
    paused: false,
    showActive: true,
  };
  const publish = await publishBoothOwnership(nextBooth, null, ownershipAt);
  return { ok: true, view, published: true, publish };
}
