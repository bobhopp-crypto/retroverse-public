import type { CoverTrustRecord } from "@/lib/cover-integrity/trust-tier";
import type { Rv12AlbumAssetLink } from "@/lib/cover-integrity/rv12";

/**
 * Surgical re-pull workflow (design only — no auto-download in this pass).
 *
 * Rules:
 * - Only HIGH_RISK / BROKEN (and not curated-unless-BROKEN) enter the pull queue.
 * - TRUSTED assignments are never overwritten by batch jobs.
 * - Human approval required before bytes replace `canonical_cover_path`.
 */

export type RepullMatchWeights = {
  normalizedTitle: number;
  releaseYear: number;
  discographyProximity: number;
  exactArtist: number;
  chronologyConsistency: number;
};

export const DEFAULT_REPULL_WEIGHTS: RepullMatchWeights = {
  normalizedTitle: 40,
  releaseYear: 20,
  discographyProximity: 15,
  exactArtist: 20,
  chronologyConsistency: 5,
};

export type SurgicalRepullCandidate = {
  rval: string;
  artist: string;
  album: string;
  releaseYear: number | null;
  trustTier: CoverTrustRecord["trustTier"];
  suspicionReasons: string[];
  /** Existing assignment preserved until approved replacement lands. */
  preserveCurrentPath: boolean;
  weights: RepullMatchWeights;
  /** Future RV12 link after successful pull. */
  pendingRv12Link: Rv12AlbumAssetLink;
};

export function buildSurgicalRepullCandidate(
  record: CoverTrustRecord,
  meta: { artist: string; album: string; releaseYear: number | null; canonicalPath: string | null },
): SurgicalRepullCandidate | null {
  if (record.trustTier !== "HIGH_RISK" && record.trustTier !== "BROKEN") return null;
  if (record.manuallyCurated && record.trustTier !== "BROKEN") return null;

  return {
    rval: record.rval,
    artist: meta.artist,
    album: meta.album,
    releaseYear: meta.releaseYear,
    trustTier: record.trustTier,
    suspicionReasons: record.suspicionReasons,
    preserveCurrentPath: true,
    weights: DEFAULT_REPULL_WEIGHTS,
    pendingRv12Link: {
      rval: record.rval as `RVAL${string}`,
      rv12AssetId: null,
      role: "primary_cover",
      contentHash: record.fileHash,
      linkedAt: null,
      source: "repair_pull",
    },
  };
}
