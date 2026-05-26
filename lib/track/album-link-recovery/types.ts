/** Album-link recovery + on-the-fly healing — types only (no UI). */

export type AlbumLinkGapKind =
  | "missing_album_links"
  | "missing_cover"
  | "orphan_graph_track"
  | "none";

export type CandidateSourceKind =
  | "same_artist_album"
  | "tracklist_title_match"
  | "tracklist_title_unlinked"
  | "track_family_link"
  | "compilation_title_match";

export type AlbumLinkCandidate = {
  albumId: number;
  albumTitle: string;
  artistName: string;
  releaseYear: number | null;
  sourceKind: CandidateSourceKind;
  trackPosition: number | null;
  sequenceTitle: string | null;
  hasCanonicalCover: boolean;
  artworkLinkCount: number;
  existingRvtrOnSlot: string | null;
};

export type ScoredAlbumLinkCandidate = AlbumLinkCandidate & {
  confidence: number;
  score: number;
  reasons: string[];
};

export type TrackAlbumLinkAudit = {
  rvtr: string;
  title: string;
  artistName: string;
  artistId: number | null;
  firstChartYear: number | null;
  chartWeeks: number;
  peakHot100: number | null;
  trackFamilyId: number | null;
  existingLinkCount: number;
  gap: AlbumLinkGapKind;
  candidates: ScoredAlbumLinkCandidate[];
  diagnosis: string[];
};

export type AlbumLinkRecoverySummary = {
  generatedAt: string;
  hot100Total: number;
  hot100MissingLinks: number;
  pctMissing: number;
  audits: TrackAlbumLinkAudit[];
};

export type AlbumLinkProposalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "applied"
  | "rolled_back";

export type AlbumLinkWriteProposal = {
  rvtr: string;
  albumId: number;
  position: number | null;
  sequenceTitle: string;
  confidence: number;
  reasons: string[];
  sourceKind: CandidateSourceKind;
  proposedBy?: string;
};
