"use server";

import {
  buildPlayheadPayload,
  createPresentation,
  movePlayhead,
  publishPresentation,
  saveDraft,
} from "@/lib/bobos/presentation/store";
import type {
  PlayheadCommand,
  PlayheadPayload,
  Presentation,
  PresentationQueue,
} from "@/lib/bobos/presentation/types";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

function assertLocalStudio() {
  if (!shouldAllowOpsRoutes()) {
    throw new Error("Presentation Studio is localhost-only.");
  }
}

export async function createPresentationAction(title: string): Promise<Presentation> {
  assertLocalStudio();
  return createPresentation(title);
}

export async function saveDraftAction(
  id: string,
  patch: { title: string; description: string; queue: PresentationQueue },
): Promise<Presentation | null> {
  assertLocalStudio();
  return saveDraft(id, patch);
}

export async function publishPresentationAction(id: string): Promise<Presentation | null> {
  assertLocalStudio();
  // Rejected with BoothAuthorityError while Booth owns The Air.
  return publishPresentation(id);
}

export async function movePlayheadAction(command: PlayheadCommand): Promise<PlayheadPayload> {
  assertLocalStudio();
  // Legacy surface — rejected with BoothAuthorityError while Booth owns The Air.
  await movePlayhead(command, "manual");
  return buildPlayheadPayload();
}

export async function getPlayheadAction(): Promise<PlayheadPayload> {
  assertLocalStudio();
  return buildPlayheadPayload();
}
