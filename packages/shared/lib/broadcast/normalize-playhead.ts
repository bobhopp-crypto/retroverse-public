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
import { tracePresentationRender } from "./presentation-render-trace";

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

/** Re-derive when a stale broadcast/rvba contract disagrees with the resolved item. */
function needsBroadcastContractRefresh(
  payload: PlayheadPayloadInput,
  now: Date = new Date(),
): boolean {
  if (!payload.item) return false;
  if (!payload.broadcast || !("rvba" in payload) || !payload.rvba) return true;
  if (needsRvbaRefresh(payload)) return true;

  const fresh = deriveCurrentBroadcast(payload, now);
  if (!fresh.rvba || !fresh.broadcast) return true;

  return (
    fresh.rvba.id !== payload.rvba.id ||
    fresh.rvba.type !== payload.rvba.type ||
    fresh.rvba.title !== payload.rvba.title ||
    fresh.rvba.subtitle !== payload.rvba.subtitle ||
    fresh.broadcast.type !== payload.broadcast.type ||
    fresh.broadcast.sourceId !== payload.broadcast.sourceId
  );
}

/** Derive `broadcast` + `rvba` when missing from the resolved playhead core. */
export function normalizePlayheadPayload(
  payload: PlayheadPayloadInput,
  now: Date = new Date(),
): PlayheadPayload {
  const normalizedItem = rewritePresentationMediaFields(payload.item);
  const core: PlayheadPayloadInput = normalizedItem === payload.item ? payload : { ...payload, item: normalizedItem };

  const forceSongRefresh = core.item?.type === "song";
  const keepContract =
    hasBroadcastContract(core) &&
    !forceSongRefresh &&
    !needsBroadcastContractRefresh(core, now);

  if (keepContract) {
    return { ...core, rvba: core.rvba ?? null };
  }

  const { broadcast, rvba } = deriveCurrentBroadcast(core, now);
  const normalized = { ...core, broadcast, rvba };

  if (typeof window !== "undefined") {
    tracePresentationRender({
      step: "normalizePlayheadPayload",
      experience:
        normalized.item?.type === "song" || rvba?.type === "now-playing"
          ? "broadcast-asset"
          : "broadcast-stage",
      itemType: normalized.item?.type ?? null,
      rvbaType: rvba?.type ?? null,
      broadcastSourceId: broadcast?.sourceId ?? null,
      component: "PresentationStage",
      detail: forceSongRefresh ? "forced-song-refresh" : keepContract ? "kept-contract" : "re-derived",
    });
  }

  return normalized;
}

/** Stable PresentationStage remount key for a normalized playhead. */
export function playheadStageKey(payload: PlayheadPayload): string {
  const rvba = payload.rvba;
  if (rvba) {
    return `${rvba.link?.id ?? rvba.id}|${rvba.title}|${rvba.subtitle}`;
  }
  return payload.broadcast?.id ?? payload.item?.id ?? "off-air";
}
