/**
 * Ensures every playhead payload includes derived `broadcast` + `rvba`.
 *
 * Older deployed playhead responses (and partial JSON) may only carry `item`.
 * Audience surfaces must derive the Broadcast Output Contract before rendering
 * so PresentationStage routes to BroadcastAssetComposerView consistently.
 */

import type { PlayheadPayload, PlayheadPayloadCore } from "@/lib/bobos/presentation/types";

import { deriveCurrentBroadcast } from "./current-broadcast";

export type PlayheadPayloadInput = PlayheadPayloadCore &
  Partial<Pick<PlayheadPayload, "broadcast" | "rvba">>;

function hasBroadcastContract(
  payload: PlayheadPayloadInput,
): payload is PlayheadPayload {
  return payload.broadcast != null && "rvba" in payload;
}

/** Derive `broadcast` + `rvba` when missing from the resolved playhead core. */
export function normalizePlayheadPayload(
  payload: PlayheadPayloadInput,
  now: Date = new Date(),
): PlayheadPayload {
  if (hasBroadcastContract(payload)) {
    return { ...payload, rvba: payload.rvba ?? null };
  }
  const { broadcast, rvba } = deriveCurrentBroadcast(payload, now);
  return { ...payload, broadcast, rvba };
}

/** Stable PresentationStage remount key for a normalized playhead. */
export function playheadStageKey(payload: PlayheadPayload): string {
  const rvba = payload.rvba;
  if (rvba) {
    return `${rvba.link?.id ?? rvba.id}|${rvba.title}|${rvba.subtitle}`;
  }
  return payload.broadcast?.id ?? payload.item?.id ?? "off-air";
}
