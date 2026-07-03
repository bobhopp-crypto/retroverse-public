/** Read-only cover integrity audit — no writes to artwork. */

export type ConfidenceBand = "HIGH" | "MEDIUM" | "LOW" | "VERY_SUSPICIOUS";

/** @deprecated Use RV12 asset ids — see `lib/cover-integrity/rv12.ts`. */
export type RvcoCoverId = `RVCO${string}`;

/** Reserved for alternate cover variants / RV45 label artifacts. */
export type CoverVariantSlot = "primary" | "alternate" | "rv45_label";

export type CoverInventoryRow = {
  rval: string;
  albumId: number;
  artist: string;
  album: string;
  releaseYear: number | null;
  canonicalPath: string | null;
  coverFilename: string | null;
  artworkSource: string | null;
  linkConfidence: number | null;
  reviewFlag: string | null;
  b200Peak: number | null;
};

export type ScoredCoverRow = CoverInventoryRow & {
  fileExists: boolean;
  fileHash: string | null;
  fileBytes: number | null;
  filenameArtistSlug: string | null;
  filenameAlbumSlug: string | null;
  titleKeyAlbum: string;
  titleKeyFilename: string | null;
  artistKey: string;
  artistKeyFilename: string | null;
  titleExactMatch: boolean;
  titlePartialMatch: boolean;
  artistExactMatch: boolean;
  confidenceScore: number;
  confidenceBand: ConfidenceBand;
  suspicionReasons: string[];
  duplicateHashCount: number;
  normalizationDrift: boolean;
};

export type CoverAuditSummary = {
  auditedAt: string;
  coverFsRoot: string;
  totalPgAlbumsWithRval: number;
  totalWithCanonicalPath: number;
  totalMissingPath: number;
  totalFileMissingOnDisk: number;
  totalFilesHashed: number;
  totalOrphanCoverFiles: number;
  confidenceDistribution: Record<ConfidenceBand, number>;
  suspiciousCount: number;
  missingAssignmentCount: number;
  normalizationDriftCount: number;
  topReusedHashes: { hash: string; albumCount: number; sampleRvals: string[] }[];
  sameArtistSubstitutionCount: number;
  trustTierCounts: Record<"TRUSTED" | "REVIEW" | "HIGH_RISK" | "BROKEN", number>;
  repairQueueCount: number;
  spotChecks: {
    eltonTooLowForZero: ScoredCoverRow | null;
    eltonCaribou: ScoredCoverRow | null;
    eltonSharedHash: boolean;
  };
};
