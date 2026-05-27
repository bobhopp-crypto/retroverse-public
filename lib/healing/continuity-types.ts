/** Public continuity verification — serializable ops types. */

export type ExhibitPacing = "weak" | "partial" | "coherent";

export type PublicExhibitSnapshot = {
  rvtr: string;
  title: string;
  artistName: string;
  trackHref: string;
  artistHref: string | null;
  coverVisible: boolean;
  albumCount: number;
  albumLabels: string[];
  relatedTrackCount: number;
  chartWeeks: number;
  peakHot100: number | null;
  pacing: ExhibitPacing;
  pacingNote: string;
};

export type ContinuitySignalKind =
  | "artist_album_track_path"
  | "cover_continuity"
  | "album_shelf"
  | "related_coherence"
  | "exhibit_completeness";

export type ContinuitySignal = {
  kind: ContinuitySignalKind;
  label: string;
  before: string;
  after: string;
  improved: boolean;
};

export type PublicContinuityVerdict = "more_complete" | "partial" | "unchanged" | "reverted" | "unknown";

export type HealedPublicVerification = {
  rvtr: string;
  proposalId: number;
  lifecycle: "active" | "rolled_back" | "uncertain";
  before: PublicExhibitSnapshot;
  after: PublicExhibitSnapshot | null;
  signals: ContinuitySignal[];
  verdict: PublicContinuityVerdict;
  trustAnswer: string;
  publicImpactScore: number;
  impactNote: string;
};

export type HighImpactHealingObservation = {
  rvtr: string;
  title: string;
  artistName: string;
  score: number;
  note: string;
  trackHref: string;
};

export type PublicContinuityReport = {
  generatedAt: string;
  summary: {
    verified: number;
    moreComplete: number;
    partialGain: number;
    unchanged: number;
    withCoverGain: number;
    withAlbumShelfGain: number;
  };
  verifications: HealedPublicVerification[];
  highImpact: HighImpactHealingObservation[];
  examples: HealedPublicVerification[];
};
