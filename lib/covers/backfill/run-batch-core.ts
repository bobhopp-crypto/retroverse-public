import {
  acquireCoverViaWelcome,
  findAcquiredCoverRelPath,
} from "@/lib/covers/backfill/acquire-welcome";
import { promoteDossierCoverToPg } from "@/lib/covers/backfill/promote-dossier";
import type { BackfillAlbumResult, BackfillQueueRow } from "@/lib/covers/backfill/types";
import { verifyCoverPromotedByRval } from "@/lib/covers/backfill/verify-rval";

function stageLog(
  rval: string,
  stage: "START" | "SEARCH" | "DOWNLOAD" | "WRITE" | "PROMOTE" | "COMPLETE",
  detail = "",
): void {
  const suffix = detail ? ` ${detail}` : "";
  process.stderr.write(`[cover-backfill][${new Date().toISOString()}][${rval}] ${stage}${suffix}\n`);
}

export async function processBackfillAlbum(row: BackfillQueueRow): Promise<BackfillAlbumResult> {
  const t0 = Date.now();
  stageLog(row.rval, "START", `${row.artist} — ${row.album}`);
  let coverPath = await findAcquiredCoverRelPath(row.rval);
  if (!coverPath) {
    stageLog(row.rval, "SEARCH", "no local cover found, invoking iTunes fill");
    const acquired = await acquireCoverViaWelcome(row);
    if (!acquired.ok) {
      stageLog(row.rval, "COMPLETE", `failed_acquire reason=${acquired.reason}`);
      return { rval: row.rval, ok: false, reason: acquired.reason, coverPath: null };
    }
    stageLog(row.rval, "DOWNLOAD", `result=${acquired.directResult ?? "DOWNLOADED"}`);
    coverPath = await findAcquiredCoverRelPath(row.rval);
  }

  if (!coverPath) {
    stageLog(row.rval, "COMPLETE", "failed no_cover_file_after_acquire");
    return { rval: row.rval, ok: false, reason: "no_cover_file_after_acquire", coverPath: null };
  }

  try {
    stageLog(row.rval, "PROMOTE", `cover=${coverPath}`);
    await promoteDossierCoverToPg({
      albumId: row.albumId,
      rval: row.rval,
      canonicalCoverPath: coverPath,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    stageLog(row.rval, "COMPLETE", `failed_promote ${msg}`);
    return { rval: row.rval, ok: false, reason: `promote_failed:${msg}`, coverPath };
  }

  const verified = await verifyCoverPromotedByRval(row.rval);
  if (!verified.ok) {
    stageLog(row.rval, "COMPLETE", "failed rval_verify_failed");
    return {
      rval: row.rval,
      ok: false,
      reason: "rval_verify_failed",
      coverPath: verified.canonicalCoverPath,
    };
  }

  stageLog(row.rval, "COMPLETE", `ok elapsed_ms=${Date.now() - t0}`);
  return { rval: row.rval, ok: true, reason: "dossier_promoted", coverPath: verified.canonicalCoverPath };
}
