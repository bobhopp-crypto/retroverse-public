import type { CoverAuditHashRow } from "@/lib/cover-integrity/load-cover-audit-csv";
import type { RepairBatchCsvRow } from "@/lib/cover-integrity/load-repair-batch-csv";
import { isSafeCanonicalCoverPath } from "@/lib/cover-integrity/validate-cover-path";

export type TrainingRowContext = {
  /** Album the candidate image is associated with (may differ from row under review). */
  candidateSource: CoverAuditHashRow | null;
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

function normalizeHash(hash: string | null | undefined): string {
  return (hash ?? "").trim().toLowerCase();
}

function normalizePath(path: string | null | undefined): string {
  return (path ?? "").trim();
}

export function getTrainingRowContext(
  row: RepairBatchCsvRow,
  hashMatches: Record<string, CoverAuditHashRow[]>,
  pathToHash?: Map<string, string>,
): TrainingRowContext {
  const replacement = siblingReplacement(row, hashMatches);
  const curHash = normalizeHash(row.currentHash);
  const curPath = normalizePath(row.currentCoverPath);

  const csvPath = isSafeCanonicalCoverPath(row.proposedCoverUrlOrPath)
    ? normalizePath(row.proposedCoverUrlOrPath)
    : "";

  let proposedPath: string | null = null;
  let proposedHash: string | null = null;
  let candidateSource: CoverAuditHashRow | null = null;

  if (csvPath && csvPath !== curPath) {
    const csvHash = normalizeHash(pathToHash?.get(csvPath) ?? null);
    if (!csvHash || csvHash !== curHash) {
      proposedPath = csvPath;
      proposedHash = csvHash || null;
    }
  }

  if (replacement) {
    const sibHash = normalizeHash(replacement.fileHash);
    const sibPath = normalizePath(replacement.canonicalPath);

    if (sibHash && sibHash !== curHash && sibPath) {
      candidateSource = replacement;
      if (!proposedPath) {
        proposedPath = sibPath;
        proposedHash = sibHash;
      }
    } else if (sibHash === curHash && sibHash) {
      candidateSource = replacement;
    }
  }

  return { candidateSource, proposedPath, proposedHash };
}

/** True when both sides would show the same bytes — never show in training. */
export function isTrivialTrainingPair(
  row: RepairBatchCsvRow,
  ctx: TrainingRowContext,
): boolean {
  const curHash = normalizeHash(row.currentHash);
  const propHash = normalizeHash(ctx.proposedHash);
  const curPath = normalizePath(row.currentCoverPath);
  const propPath = normalizePath(ctx.proposedPath);

  if (curPath && propPath && curPath === propPath) return true;

  if (curHash && propHash && curHash === propHash) return true;

  if (curHash && ctx.candidateSource) {
    const sourceHash = normalizeHash(ctx.candidateSource.fileHash);
    if (sourceHash === curHash && !propPath) return true;
    if (sourceHash === curHash && propPath && propHash === curHash) return true;
  }

  if (curHash && !propPath && ctx.candidateSource) return true;

  return false;
}

export function trainingCandidateSourceLabel(
  source: CoverAuditHashRow | null,
): string | null {
  if (!source) return null;
  const artist = source.artist?.trim() || "Unknown artist";
  const album = source.album?.trim();
  return album ? `${artist} — ${album}` : artist;
}

export function trainingWhyExplanation(
  row: RepairBatchCsvRow,
  candidateSource: CoverAuditHashRow | null,
): string {
  const artist = row.artist?.trim() || "This artist";
  const album = row.album?.trim() || "this album";
  const tier = row.trustTier.toUpperCase();
  const issues = row.issueReason.toLowerCase();

  if (tier === "BROKEN" || issues.includes("missing") || issues.includes("file_missing")) {
    return "Retroverse does not have a cover image for this album yet.";
  }

  if (candidateSource) {
    const otherAlbum = candidateSource.album?.trim() || "another album";
    const otherArtist = candidateSource.artist?.trim() || artist;
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

export function buildPathToHashIndex(
  rows: RepairBatchCsvRow[],
  hashMatches: Record<string, CoverAuditHashRow[]>,
): Map<string, string> {
  const index = new Map<string, string>();
  for (const row of rows) {
    const path = normalizePath(row.currentCoverPath);
    const hash = normalizeHash(row.currentHash);
    if (path && hash) index.set(path, hash);
  }
  for (const group of Object.values(hashMatches)) {
    for (const entry of group) {
      const path = normalizePath(entry.canonicalPath);
      const hash = normalizeHash(entry.fileHash);
      if (path && hash) index.set(path, hash);
    }
  }
  return index;
}

export function filterActionableTrainingRows(
  rows: RepairBatchCsvRow[],
  hashMatches: Record<string, CoverAuditHashRow[]>,
  pathToHash?: Map<string, string>,
): { actionable: RepairBatchCsvRow[]; skippedRvals: string[] } {
  const actionable: RepairBatchCsvRow[] = [];
  const skippedRvals: string[] = [];
  const pathIndex = pathToHash ?? buildPathToHashIndex(rows, hashMatches);

  for (const row of rows) {
    const ctx = getTrainingRowContext(row, hashMatches, pathIndex);
    if (isTrivialTrainingPair(row, ctx)) {
      skippedRvals.push(row.rval);
    } else {
      actionable.push(row);
    }
  }

  return { actionable, skippedRvals };
}
