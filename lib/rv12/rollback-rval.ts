import { copyFile, readFile } from "node:fs/promises";

import { revalidatePath } from "next/cache";

import { defaultCoverFsRoot, resolveCoverFilePath } from "@/lib/cover-integrity/score";
import { inspectExecute } from "@/lib/inspect/pg";
import { coverApplyEnabled, validateCoverApplyTarget } from "@/lib/rv12/guardrails";
import { hashBuffer } from "@/lib/rv12/image-meta";
import {
  appendPromotionAudit,
  appendRvalAssignment,
  getActiveAssignment,
  listPromotionAudit,
  newAssignmentId,
} from "@/lib/rv12/ledger";
import { loadAlbumByRval } from "@/lib/rv12/load-album";

export type RollbackRvalResult =
  | { ok: true; rval: string; restoredFrom: string }
  | { ok: false; code: string; message: string };

export async function rollbackRvalCover(
  rval: string,
  actor: string,
): Promise<RollbackRvalResult> {
  if (!coverApplyEnabled()) {
    return {
      ok: false,
      code: "writes_disabled",
      message: "Set RETROVERSE_COVER_APPLY=1 to enable rollback.",
    };
  }

  const id = rval.trim().toUpperCase();
  const guard = validateCoverApplyTarget(id);
  if (!guard.ok) return guard;

  const audits = await listPromotionAudit(id);
  const lastPromote = [...audits].reverse().find((a) => a.action === "promote" && a.ok);
  if (!lastPromote?.backupPath) {
    return { ok: false, code: "no_backup", message: "No successful promote with backup found." };
  }

  const album = await loadAlbumByRval(id);
  if (!album?.canonicalCoverPath) {
    return { ok: false, code: "no_album", message: "Album not found." };
  }

  const canonicalAbs = resolveCoverFilePath(
    defaultCoverFsRoot(),
    album.canonicalCoverPath,
  );
  if (!canonicalAbs) {
    return { ok: false, code: "bad_path", message: "Could not resolve canonical path." };
  }

  await copyFile(lastPromote.backupPath, canonicalAbs);
  const restoredHash = hashBuffer(await readFile(canonicalAbs));

  const priorAssignment = await getActiveAssignment(id);
  if (priorAssignment) {
    await appendRvalAssignment({
      ...priorAssignment,
      active: false,
      replacedAt: new Date().toISOString(),
    });
  }

  await appendRvalAssignment({
    rval: id,
    albumId: album.albumId,
    rv12Id: lastPromote.rv12Id ?? "RV12_ROLLBACK",
    assignmentType: "primary_cover",
    active: true,
    replacedAt: null,
    replacedByAssignmentId: priorAssignment?.assignmentId ?? null,
    assignmentId: newAssignmentId(),
    priorCanonicalPath: album.canonicalCoverPath,
    canonicalPath: album.canonicalCoverPath,
    promotedBy: actor,
    createdAt: new Date().toISOString(),
  });

  await inspectExecute(
    `UPDATE albums SET canonical_cover_path = $2 WHERE id = $1`,
    [album.albumId, album.canonicalCoverPath],
  );

  await appendPromotionAudit({
    action: "rollback",
    ok: true,
    rval: id,
    rv12Id: lastPromote.rv12Id,
    albumId: album.albumId,
    actor,
    message: "Restored prior cover from backup",
    priorCanonicalPath: album.canonicalCoverPath,
    newCanonicalPath: album.canonicalCoverPath,
    priorContentHash: lastPromote.newContentHash,
    newContentHash: restoredHash,
    backupPath: lastPromote.backupPath,
  });

  revalidatePath(`/album/${id}`);

  return { ok: true, rval: id, restoredFrom: lastPromote.backupPath };
}
