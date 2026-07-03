import type { AtlasMission, CampaignBar } from "./types";
import type { RvTagId } from "@/lib/ops/rvtags-review/vocabulary";
import type { ReviewClassification } from "@/lib/ops/year-workspace/review-types";
import type { CandidateSourceKind } from "@/lib/track/album-link-recovery/types";
import type { MissionConfidenceTier } from "./mission-confidence";

export type MissionEvidenceSignal = {
  id: string;
  label: string;
  detail: string;
  source: string;
  field?: "style" | "crowd" | "classification";
  value?: string;
};

export type MissionStatusStamp = "READY" | "IN PROGRESS" | "FORTIFIED" | "COMPLETE";

export type MissionGapKind = "album" | "cover" | "commentary" | "tv" | "movie";

export type MissionGap = {
  id: string;
  kind: MissionGapKind;
  label: string;
  description: string;
  points: number;
  embeddable: boolean;
};

export type MissionSeal = {
  id: string;
  label: string;
};

export type MissionRelatedCard = {
  rvtr: string;
  title: string;
  artist: string;
  playCount: number;
  completenessPct: number;
};

/** @deprecated Phase C shape — use MissionWorkspace */
export type MissionChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  points: number;
  actionLabel: string | null;
  actionHref: string | null;
};

/** @deprecated Phase C shape — use MissionWorkspace */
export type MissionDetail = {
  rvtr: string;
  artist: string;
  title: string;
  territory: string;
  territoryHref: string;
  performanceYear: number | null;
  playCount: number;
  coveragePct: number;
  priority: number;
  rank: number;
  totalRanked: number;
  completenessPct: number;
  status: MissionStatusStamp;
  verb: AtlasMission["verb"];
  checklist: MissionChecklistItem[];
  checklistDone: number;
  checklistTotal: number;
  pointsEarned: number;
  pointsAvailable: number;
  completeBonus: number;
  territoryMappedPct: number;
  territoryMappedAfterPct: number;
  prev: AtlasMission | null;
  next: AtlasMission | null;
};

export type MissionAlbumSibling = {
  rvtr: string;
  title: string;
  position: number;
  isCurrent: boolean;
};

export type MissionAlbumAttachMode = "tracklist_slot" | "co_album_membership";

export type MissionAlbumCandidate = {
  albumId: number;
  albumTitle: string;
  artistName: string;
  releaseYear: number | null;
  confidence: number;
  confidencePct: number;
  coverUrl: string | null;
  hasCover: boolean;
  position: number | null;
  sequenceTitle: string | null;
  sourceKind: CandidateSourceKind;
  reasons: string[];
  rank: number;
  recommended: boolean;
  researchNote: string;
  confidenceTier: MissionConfidenceTier;
  evidence: MissionEvidenceSignal[];
  linkedRvtr: string | null;
  attachMode: MissionAlbumAttachMode;
  albumSiblings: MissionAlbumSibling[];
};

export type MissionMediaCandidate = {
  id: string;
  label: string;
  detail: string;
  confidence: number;
  confidencePct: number;
  rank: number;
  recommended: boolean;
  researchNote: string;
  confidenceTier: MissionConfidenceTier;
  evidence: MissionEvidenceSignal[];
};

export type MissionCommentaryState = {
  tags: RvTagId[];
  classification: ReviewClassification;
  classificationLocked: boolean;
  reviewYear: number;
  workspaceKey: string;
  suggestedStyleTags: RvTagId[];
  suggestedCrowdTags: RvTagId[];
  suggestedTags: RvTagId[];
  suggestedClassification: ReviewClassification;
  researchSummary: string;
  confidenceTier: MissionConfidenceTier;
  evidence: MissionEvidenceSignal[];
};

export type MissionResearchBrief = {
  headline: string;
  slotCount: number;
};

export type MissionWorkspace = {
  rvtr: string;
  artist: string;
  title: string;
  territory: string;
  territoryHref: string;
  performanceYear: number | null;
  peakHot100: number | null;
  playCount: number;
  mediaId: string;
  filePath: string;
  /** Videos on shelf vs total (territory ownership) */
  shelfCoveragePct: number;
  priority: number;
  rank: number;
  totalRanked: number;
  /** Per-track exhibit completeness (live when PG available) */
  exhibitDepthPct: number;
  status: MissionStatusStamp;
  verb: AtlasMission["verb"];
  gaps: MissionGap[];
  deferredSlots: MissionGap[];
  seals: MissionSeal[];
  albumCandidates: MissionAlbumCandidate[];
  albumResearchHeadline: string | null;
  commentary: MissionCommentaryState;
  tvCandidates: MissionMediaCandidate[];
  tvResearchHeadline: string | null;
  movieCandidates: MissionMediaCandidate[];
  movieResearchHeadline: string | null;
  researchBrief: MissionResearchBrief | null;
  albumWritesEnabled: boolean;
  relatedByArtist: MissionRelatedCard[];
  discoveries: string[];
  campaigns: CampaignBar[];
  pointsEarned: number;
  pointsAvailable: number;
  completeBonus: number;
  territoryMappedPct: number;
  territoryMappedAfterPct: number;
  prev: AtlasMission | null;
  next: AtlasMission | null;
};

export type AuditMissionRow = {
  mediaId: string | null;
  artist: string | null;
  title: string | null;
  path: string | null;
  performanceYear: number | null;
  playCount: number | null;
  rvtr: string | null;
  peakHot100: number | null;
  coverScore: number;
  chartScore: number;
  albumScore: number;
  commentaryScore: number;
  movieLinkage: boolean;
  tvLinkage: boolean;
  completenessPct: number;
  enrichmentPriority: number;
  canonicalTags: string[];
  classification: string | null;
  tagSource: string | null;
};

export type AuditFileFull = {
  summary: {
    matchedVideos: number;
    avgCompletenessPct: number;
  };
  top100: AuditMissionRow[];
  rows: AuditMissionRow[];
};
