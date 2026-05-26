import type { AlbumLinkWriteProposal } from "@/lib/track/album-link-recovery/types";

export type GuardrailResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

/** Writes are disabled unless explicitly enabled in environment. */
export function healingWritesEnabled(): boolean {
  return process.env.RETROVERSE_HEALING_APPLY?.trim() === "1";
}

export function validateAlbumLinkProposal(
  proposal: AlbumLinkWriteProposal,
  existingLinkCount: number,
  existingRvtrOnSlot: string | null,
): GuardrailResult {
  if (!/^RVTR\d{6}$/i.test(proposal.rvtr)) {
    return { ok: false, code: "invalid_rvtr", message: "RVTR id required." };
  }
  if (!Number.isFinite(proposal.albumId) || proposal.albumId <= 0) {
    return { ok: false, code: "invalid_album", message: "album_id required." };
  }
  if (proposal.confidence < 0.45) {
    return {
      ok: false,
      code: "low_confidence",
      message: "Confidence below approval threshold (0.45).",
    };
  }
  if (existingLinkCount > 0) {
    return {
      ok: false,
      code: "already_linked",
      message: "Track already has canonical_album_tracks — no replace.",
    };
  }
  if (
    existingRvtrOnSlot &&
    existingRvtrOnSlot.toUpperCase() !== proposal.rvtr.toUpperCase()
  ) {
    return {
      ok: false,
      code: "slot_occupied",
      message: `Tracklist slot already keyed to ${existingRvtrOnSlot}.`,
    };
  }
  return { ok: true };
}
