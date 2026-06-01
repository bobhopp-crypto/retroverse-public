import {
  acquireCoverViaWelcome,
  findAcquiredCoverRelPath,
} from "@/lib/covers/backfill/acquire-welcome";
import { promoteDossierCoverToPg } from "@/lib/covers/backfill/promote-dossier";
import type { BackfillAlbumResult, BackfillQueueRow } from "@/lib/covers/backfill/types";
import { verifyCoverPromotedByRval } from "@/lib/covers/backfill/verify-rval";

export async function processBackfillAlbum(row: BackfillQueueRow): Promise<BackfillAlbumResult> {
  let coverPath = await findAcquiredCoverRelPath(row.rval);
  if (!coverPath) {
    const acquired = await acquireCoverViaWelcome(row);
    if (!acquired.ok) {
      return { rval: row.rval, ok: false, reason: acquired.reason, coverPath: null };
    }
    coverPath = await findAcquiredCoverRelPath(row.rval);
  }

  if (!coverPath) {
    return { rval: row.rval, ok: false, reason: "no_cover_file_after_acquire", coverPath: null };
  }

  try {
    await promoteDossierCoverToPg({
      albumId: row.albumId,
      rval: row.rval,
      canonicalCoverPath: coverPath,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { rval: row.rval, ok: false, reason: `promote_failed:${msg}`, coverPath };
  }

  const verified = await verifyCoverPromotedByRval(row.rval);
  if (!verified.ok) {
    return {
      rval: row.rval,
      ok: false,
      reason: "rval_verify_failed",
      coverPath: verified.canonicalCoverPath,
    };
  }

  return { rval: row.rval, ok: true, reason: "dossier_promoted", coverPath: verified.canonicalCoverPath };
}
