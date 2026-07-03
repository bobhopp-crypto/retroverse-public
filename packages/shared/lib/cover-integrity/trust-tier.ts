import type { ConfidenceBand, ScoredCoverRow } from "@/lib/cover-integrity/types";

export type CoverTrustTier = "TRUSTED" | "REVIEW" | "HIGH_RISK" | "BROKEN";

export type CoverTrustRecord = {
  rval: string;
  trustTier: CoverTrustTier;
  confidenceScore: number;
  confidenceBand: ConfidenceBand;
  suspicionReasons: string[];
  duplicateHashCount: number;
  fileHash: string | null;
  manuallyCurated: boolean;
  assessedAt: string;
};

function isManuallyCurated(reviewFlag: string | null): boolean {
  const f = (reviewFlag || "").toLowerCase();
  return f === "curated" || f === "curator_override" || f === "ok";
}

/**
 * Map audit scores → repair trust tiers.
 * Curated rows stay TRUSTED unless byte-level corruption is proven.
 */
export function classifyCoverTrustTier(row: ScoredCoverRow): CoverTrustTier {
  const curated = isManuallyCurated(row.reviewFlag);
  const hasAssignment = !!row.canonicalPath?.trim();
  const hasBytes = hasAssignment && row.fileExists;

  if (!hasAssignment) {
    return "REVIEW";
  }

  if (!row.fileExists) {
    return "BROKEN";
  }

  if (row.suspicionReasons.includes("same_artist_different_album_shared_image")) {
    return curated ? "HIGH_RISK" : "BROKEN";
  }

  if (row.suspicionReasons.includes("file_missing_on_disk")) {
    return "BROKEN";
  }

  if (row.confidenceBand === "VERY_SUSPICIOUS") {
    return "HIGH_RISK";
  }

  if (
    row.duplicateHashCount >= 5 &&
    row.suspicionReasons.includes("high_frequency_duplicate_cover")
  ) {
    return "REVIEW";
  }

  if (row.confidenceBand === "HIGH" && row.titleExactMatch && row.artistExactMatch) {
    return "TRUSTED";
  }

  if (row.confidenceBand === "MEDIUM" || row.titlePartialMatch) {
    return "REVIEW";
  }

  if (row.confidenceBand === "LOW" && hasBytes) {
    return "REVIEW";
  }

  return "REVIEW";
}

export function toTrustRecord(row: ScoredCoverRow): CoverTrustRecord {
  return {
    rval: row.rval,
    trustTier: classifyCoverTrustTier(row),
    confidenceScore: row.confidenceScore,
    confidenceBand: row.confidenceBand,
    suspicionReasons: [...row.suspicionReasons],
    duplicateHashCount: row.duplicateHashCount,
    fileHash: row.fileHash,
    manuallyCurated: isManuallyCurated(row.reviewFlag),
    assessedAt: new Date().toISOString(),
  };
}

export type ScoredCoverWithTrust = ScoredCoverRow & {
  trustTier: CoverTrustTier;
};

export function enrichWithTrustTier(row: ScoredCoverRow): ScoredCoverWithTrust {
  return { ...row, trustTier: classifyCoverTrustTier(row) };
}

/** Human repair queue — includes curated rows flagged HIGH_RISK for review. */
export function isEligibleForRepairQueue(record: CoverTrustRecord): boolean {
  return record.trustTier === "HIGH_RISK" || record.trustTier === "BROKEN";
}

/** Automated byte replacement gate (future) — never auto-touch curated unless BROKEN. */
export function isEligibleForAutomatedRepull(record: CoverTrustRecord): boolean {
  if (record.manuallyCurated && record.trustTier !== "BROKEN") return false;
  return record.trustTier === "HIGH_RISK" || record.trustTier === "BROKEN";
}
