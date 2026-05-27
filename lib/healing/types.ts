import type {
  ScoredAlbumLinkCandidate,
  TrackAlbumLinkAudit,
} from "@/lib/track/album-link-recovery/types";

export type HealingClusterId = "stand_by_me" | "degraded_sample";

export type HealingReviewItem = TrackAlbumLinkAudit & {
  reviewStatus: "open" | "applied" | "rejected";
  topConfidence: number | null;
  coverGap: boolean;
};

export type HealingReviewSet = {
  clusterId: HealingClusterId;
  clusterLabel: string;
  generatedAt: string;
  summary: {
    hot100Total: number;
    hot100MissingLinks: number;
    pctMissing: number;
    clusterSize: number;
    degradedCount: number;
  };
  healthyControl: TrackAlbumLinkAudit | null;
  items: HealingReviewItem[];
};

export type HealingAuditAction =
  | "proposal_preview"
  | "apply"
  | "rollback"
  | "reject"
  | "cover_preview";

export type HealingApplyPreviousState = {
  rvtr: string;
  trackTitle: string;
  artistName: string;
  albumLinkCount: number;
  linkedAlbumIds: number[];
  hasCanonicalCover: boolean;
};

export type HealingAuditEntry = {
  ts: string;
  action: HealingAuditAction;
  rvtr: string;
  albumId?: number;
  proposalId?: number;
  catRowId?: number;
  confidence?: number;
  actor: string;
  ok: boolean;
  message: string;
  reasons?: string[];
  previousState?: HealingApplyPreviousState;
  revalidatedPaths?: string[];
};

export type CoverArtworkCandidate = {
  linkId: number;
  canonicalCoverPath: string | null;
  r2CoverKey: string | null;
  reviewFlag: string | null;
  confidence: number | null;
  sourceUrl: string | null;
};

export type CoverHealingAudit = {
  rvtr: string;
  albumId: number | null;
  albumTitle: string | null;
  artistName: string | null;
  hasCanonicalCover: boolean;
  candidates: CoverArtworkCandidate[];
  diagnosis: string[];
};

export type AlbumLinkApplyRequest = {
  rvtr: string;
  albumId: number;
  position?: number | null;
  sequenceTitle: string;
  confidence: number;
  reasons: string[];
  sourceKind: ScoredAlbumLinkCandidate["sourceKind"];
};
