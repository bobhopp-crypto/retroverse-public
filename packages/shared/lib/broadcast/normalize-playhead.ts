/**
 * Ensures every playhead payload includes derived `broadcast` + `rvba`.
 *
 * Older deployed playhead responses (and partial JSON) may only carry `item`.
 * Audience surfaces must derive the Broadcast Output Contract before rendering
 * so PresentationStage routes to BroadcastAssetComposerView consistently.
 */

import type { PlayheadPayload, PlayheadPayloadCore } from "@/lib/bobos/presentation/types";
import { rewritePresentationMediaFields } from "@/lib/bobos/importer/media-url";

import { deriveCurrentBroadcast } from "./current-broadcast";

export type PlayheadPayloadInput = PlayheadPayloadCore &
  Partial<Pick<PlayheadPayload, "broadcast" | "rvba">>;

function hasBroadcastContract(
  payload: PlayheadPayloadInput,
): payload is PlayheadPayload {
  return payload.broadcast != null && "rvba" in payload;
}

function needsRvbaRefresh(payload: PlayheadPayloadInput): boolean {
  const item = payload.item;
  if (!item?.mediaUrl) return false;
  if (!payload.rvba?.mediaUrl) return true;
  return payload.rvba.type !== "image";
}

/** Derive `broadcast` + `rvba` when missing from the resolved playhead core. */
export function normalizePlayheadPayload(
  payload: PlayheadPayloadInput,
  now: Date = new Date(),
): PlayheadPayload {
  const normalizedItem = rewritePresentationMediaFields(payload.item);
  const core: PlayheadPayloadInput = normalizedItem === payload.item ? payload : { ...payload, item: normalizedItem };

  if (hasBroadcastContract(core) && !needsRvbaRefresh(core)) {
    return { ...core, rvba: core.rvba ?? null };
  }

  const { broadcast, rvba } = deriveCurrentBroadcast(core, now);
  return { ...core, broadcast, rvba };
}

/** Stable PresentationStage remount key for a normalized playhead. */
export function playheadStageKey(payload: PlayheadPayload): string {
  const rvba = payload.rvba;
  if (rvba) {
    return `${rvba.link?.id ?? rvba.id}|${rvba.title}|${rvba.subtitle}`;
  }
  return payload.broadcast?.id ?? payload.item?.id ?? "off-air";
}
