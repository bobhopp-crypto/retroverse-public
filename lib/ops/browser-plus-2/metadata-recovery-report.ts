import { isActiveVideoRow } from "./status";
import type { Bp2MetadataImpact, Bp2MetadataRecoveryRow, Bp2Row } from "./types";

export const EMPTY_METADATA_IMPACT: Bp2MetadataImpact = {
  missingMetadata: 0,
  recoverableMetadata: 0,
  unidentifiedAmongMissing: 0,
  withRvtrAmongMissing: 0,
  matchBlockedNow: 0,
  likelyMatchFailures: 0,
  autoMatchableAfterRecovery: 0,
  reviewMatchableAfterRecovery: 0,
  graphAvailable: false,
};

export function buildMetadataRecoveryReport(rows: Bp2Row[]): Bp2MetadataRecoveryRow[] {
  return rows
    .filter((row) => isActiveVideoRow(row) && row.missingXmlMetadata)
    .map((row) => ({
      filePath: row.filePath,
      fileName: row.fileName,
      xmlArtist: row.artist.trim() || null,
      xmlTitle: row.title.trim() || null,
      recoveredArtist: row.recoveredArtist,
      recoveredTitle: row.recoveredTitle,
      rvtr: row.rvtr,
      identityStatus: row.identityStatus,
      recoveryConfidence: row.recoveryConfidence,
    }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
}

export function summarizeMetadataImpact(rows: Bp2Row[]): Bp2MetadataImpact {
  const videos = rows.filter(isActiveVideoRow);
  const orphans = videos.filter((row) => row.missingXmlMetadata);
  const recoverable = orphans.filter(
    (row) => row.hasFilenameRecovery && row.recoveryConfidence === "high",
  );
  const matchBlockedNow = orphans.filter(
    (row) => !row.artist.trim() || !row.title.trim(),
  ).length;

  return {
    missingMetadata: orphans.length,
    recoverableMetadata: recoverable.length,
    unidentifiedAmongMissing: orphans.filter((row) => row.identityStatus === "Unidentified").length,
    withRvtrAmongMissing: orphans.filter((row) => row.rvtr).length,
    matchBlockedNow,
    likelyMatchFailures: matchBlockedNow,
    autoMatchableAfterRecovery: 0,
    reviewMatchableAfterRecovery: recoverable.length,
    graphAvailable: false,
  };
}
