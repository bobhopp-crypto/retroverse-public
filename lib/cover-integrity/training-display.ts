import type { CoverAuditHashRow } from "@/lib/cover-integrity/load-cover-audit-csv";
import type { RepairBatchCsvRow } from "@/lib/cover-integrity/load-repair-batch-csv";
import { isSafeCanonicalCoverPath } from "@/lib/cover-integrity/validate-cover-path";

export type TrainingRowContext = {
  replacement: CoverAuditHashRow | null;
  proposedPath: string | null;
  proposedHash: string | null;
};

export function siblingReplacement(
  row: RepairBatchCsvRow,
  hashMatches: Record<string, CoverAuditHashRow[]>,
): CoverAuditHashRow | null {
  if (!row.currentHash) return null;
  const siblings = hashMatches[row.currentHash] ?? [];
  return siblings.find((s) => s.rval !== row.rval) ?? null;
}

export function getTrainingRowContext(
  row: RepairBatchCsvRow,
  hashMatches: Record<string, CoverAuditHashRow[]>,
): TrainingRowContext {
  const replacement = siblingReplacement(row, hashMatches);
  const proposedPath =
    isSafeCanonicalCoverPath(row.proposedCoverUrlOrPath)
      ? row.proposedCoverUrlOrPath
      : replacement?.canonicalPath ?? null;
  const proposedHash = replacement?.fileHash ?? row.currentHash ?? null;
  return { replacement, proposedPath, proposedHash };
}

/** Skip when both sides would show the same image — nothing useful to decide. */
export function isTrivialTrainingPair(
  row: RepairBatchCsvRow,
  ctx: TrainingRowContext,
): boolean {
  const curPath = row.currentCoverPath?.trim() ?? "";
  const propPath = ctx.proposedPath?.trim() ?? "";

  if (curPath && propPath && curPath === propPath) return true;

  if (ctx.replacement) return false;

  const curHash = row.currentHash?.trim() ?? "";
  const propHash = ctx.proposedHash?.trim() ?? "";
  if (curHash && propHash && curHash === propHash) {
    if (propPath && curPath && propPath !== curPath) return false;
    return true;
  }

  return false;
}

export function trainingWhyExplanation(
  row: RepairBatchCsvRow,
  replacement: CoverAuditHashRow | null,
): string {
  const artist = row.artist?.trim() || "This artist";
  const album = row.album?.trim() || "this album";
  const tier = row.trustTier.toUpperCase();
  const issues = row.issueReason.toLowerCase();

  if (tier === "BROKEN" || issues.includes("missing") || issues.includes("file_missing")) {
    return "Retroverse does not have a cover image for this album yet.";
  }

  if (replacement) {
    const otherAlbum = replacement.album?.trim() || "another album";
    const otherArtist = replacement.artist?.trim() || artist;
    if (otherArtist.toLowerCase() === artist.toLowerCase()) {
      return `Retroverse thinks this album may have the wrong cover because another ${artist} album (“${otherAlbum}”) is using the same image.`;
    }
    return `Retroverse thinks this album may have the wrong cover because “${otherAlbum}” by ${otherArtist} is using the same image.`;
  }

  if (row.duplicateHashCount >= 2 || issues.includes("shared") || issues.includes("duplicate")) {
    const n = row.duplicateHashCount >= 2 ? row.duplicateHashCount : "multiple";
    return `Retroverse thinks this album may have the wrong cover because ${n} albums are sharing the same image.`;
  }

  if (issues.includes("same_artist")) {
    return `Retroverse thinks “${album}” by ${artist} may have the wrong cover because several albums by this artist share one image.`;
  }

  if (issues.includes("title")) {
    return `Retroverse thinks the cover on “${album}” may not match the album title.`;
  }

  if (issues.includes("quality") || issues.includes("low")) {
    return "Retroverse thinks the cover image quality is very poor and may need a better picture.";
  }

  return `Retroverse wants a quick check on “${album}” by ${artist} to make sure the cover looks right.`;
}

export function trainingSameImageNote(replacement: CoverAuditHashRow | null): string | null {
  if (!replacement) return null;
  const other = replacement.album?.trim();
  if (other) {
    return `Retroverse found another album using the exact same image (“${other}”).`;
  }
  return "Retroverse found another album using the exact same image.";
}

export function filterActionableTrainingRows(
  rows: RepairBatchCsvRow[],
  hashMatches: Record<string, CoverAuditHashRow[]>,
): { actionable: RepairBatchCsvRow[]; skippedRvals: string[] } {
  const actionable: RepairBatchCsvRow[] = [];
  const skippedRvals: string[] = [];

  for (const row of rows) {
    const ctx = getTrainingRowContext(row, hashMatches);
    if (isTrivialTrainingPair(row, ctx)) {
      skippedRvals.push(row.rval);
    } else {
      actionable.push(row);
    }
  }

  return { actionable, skippedRvals };
}
