import { copyFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { revalidatePath } from "next/cache";

import { defaultCoverFsRoot, resolveCoverFilePath } from "@/lib/cover-integrity/score";
import { inspectExecute } from "@/lib/inspect/pg";
import { copyRv12ToPath } from "@/lib/rv12/create-asset";
import { coverApplyEnabled, validateCoverApplyTarget } from "@/lib/rv12/guardrails";
import { hashBuffer } from "@/lib/rv12/image-meta";
import {
  appendPromotionAudit,
  appendRvalAssignment,
  getActiveAssignment,
  listRv12Assets,
  newAssignmentId,
  type PromotionAuditRow,
  type RvalAssignmentRow,
} from "@/lib/rv12/ledger";
import { loadAlbumByRval } from "@/lib/rv12/load-album";
import { rv12BackupsDir } from "@/lib/rv12/paths";

export type PromoteRvalInput = {
  rval: string;
  rv12Id: string;
  actor: string;
  auditReason?: string;
  forceTrustedOverride?: boolean;
  forceReason?: string | null;
  trustTier?: string;
};

export type PromoteRvalResult =
  | {
      ok: true;
      rval: string;
      rv12Id: string;
      assignment: RvalAssignmentRow;
      backupPath: string | null;
      priorHash: string | null;
      newHash: string;
      canonicalPath: string;
    }
  | { ok: false; code: string; message: string };

async function hashFileAtPath(absPath: string): Promise<string | null> {
  try {
    const buf = await readFile(absPath);
    return hashBuffer(buf);
  } catch {
    return null;
  }
}

export async function promoteRvalCover(
  input: PromoteRvalInput,
): Promise<PromoteRvalResult> {
  if (!coverApplyEnabled()) {
    return {
      ok: false,
      code: "writes_disabled",
      message: "Set RETROVERSE_COVER_APPLY=1 to enable promotion.",
    };
  }

  const rval = input.rval.trim().toUpperCase();
  const guard = validateCoverApplyTarget(rval, {
    forceTrustedOverride: input.forceTrustedOverride,
    trustTier: input.trustTier,
  });
  if (!guard.ok) return guard;

  const album = await loadAlbumByRval(rval);
  if (!album?.canonicalCoverPath) {
    return { ok: false, code: "no_album", message: "Album or canonical path not found." };
  }

  const assets = await listRv12Assets();
  const asset = assets.find((a) => a.rv12Id === input.rv12Id);
  if (!asset) {
    return { ok: false, code: "rv12_not_found", message: `RV12 ${input.rv12Id} not in ledger.` };
  }

  const fsRoot = defaultCoverFsRoot();
  const canonicalAbs = resolveCoverFilePath(fsRoot, album.canonicalCoverPath);
  if (!canonicalAbs) {
    return { ok: false, code: "bad_path", message: "Could not resolve canonical cover path." };
  }

  const priorHash = await hashFileAtPath(canonicalAbs);
  if (priorHash === asset.contentHash) {
    return {
      ok: false,
      code: "same_hash",
      message: "Candidate hash matches current file — no change.",
    };
  }

  await mkdir(rv12BackupsDir(), { recursive: true });
  const backupPath = join(
    rv12BackupsDir(),
    `${rval}_${Date.now()}_prior.jpg`,
  );

  try {
    await copyFile(canonicalAbs, backupPath);
  } catch {
    // no prior file on disk
  }

  await copyRv12ToPath(asset, canonicalAbs);
  const newHash = asset.contentHash;

  const priorAssignment = await getActiveAssignment(rval);
  if (priorAssignment) {
    await appendRvalAssignment({
      ...priorAssignment,
      active: false,
      replacedAt: new Date().toISOString(),
    });
  }

  const assignmentId = newAssignmentId();
  const assignment: RvalAssignmentRow = {
    rval,
    albumId: album.albumId,
    rv12Id: asset.rv12Id,
    assignmentType: "primary_cover",
    active: true,
    replacedAt: null,
    replacedByAssignmentId: priorAssignment?.assignmentId ?? null,
    assignmentId,
    priorCanonicalPath: album.canonicalCoverPath,
    canonicalPath: album.canonicalCoverPath,
    promotedBy: input.actor,
    createdAt: new Date().toISOString(),
  };
  await appendRvalAssignment(assignment);

  await inspectExecute(
    `
    UPDATE albums
    SET canonical_cover_path = $2
    WHERE id = $1
    `,
    [album.albumId, album.canonicalCoverPath],
  );

  await inspectExecute(
    `
    INSERT INTO album_artwork_links (
      album_id, canonical_cover_path, r2_cover_key, source, confidence_score, review_flag
    )
    VALUES ($1, $2, $2, 'rv12_pilot', 90, 'curated')
    `,
    [album.albumId, album.canonicalCoverPath],
  );

  const audit: Omit<PromotionAuditRow, "ts"> = {
    action: "promote",
    ok: true,
    rval,
    rv12Id: asset.rv12Id,
    albumId: album.albumId,
    actor: input.actor,
    message: input.auditReason ?? "RV12 pilot promote",
    priorCanonicalPath: album.canonicalCoverPath,
    newCanonicalPath: album.canonicalCoverPath,
    priorContentHash: priorHash,
    newContentHash: newHash,
    backupPath,
    forceTrustedOverride: input.forceTrustedOverride,
    forceReason: input.forceReason ?? null,
  };
  await appendPromotionAudit(audit);

  revalidatePath(`/album/${rval}`);

  return {
    ok: true,
    rval,
    rv12Id: asset.rv12Id,
    assignment,
    backupPath,
    priorHash,
    newHash,
    canonicalPath: album.canonicalCoverPath,
  };
}
