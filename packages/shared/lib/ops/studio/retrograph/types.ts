/**
 * Retrograph — canonical ever-growing knowledge model for a Retroverse entity.
 * Sprint 3.29 — replaces internal "dossier" / "canonical dataset" terminology.
 */

export const RETROGRAPH_VERSION = 1 as const;

export type RetrographEntityKind = "song" | "artist" | "album" | "performance" | "event";

export type RetrographFactStatus = "accepted" | "pending" | "duplicate" | "invalid";

export type RetrographFact = {
  id: string;
  category: string;
  text: string;
  source: string;
  sourceUrl: string | null;
  confidence: number;
  status: RetrographFactStatus;
  duplicateOf: string | null;
  clusterId: string | null;
};

export type RetrographMediaImage = {
  assetId: string;
  imageUrl: string;
  caption: string;
  label: string;
  category: string;
  performanceId: string | null;
  status: "available" | "unused";
  unusedReason: string | null;
};

export type RetrographMediaVideo = {
  id: string;
  title: string;
  kind: string;
  year: number | null;
  venue: string | null;
  sourcePath: string | null;
  notes: string;
};

export type RetrographTimelineEvent = {
  id: string;
  date: string;
  label: string;
  detail: string | null;
  domain: "song" | "recording" | "performance";
  confidence: number;
  source: string;
};

export type RetrographRecording = {
  id: string;
  title: string;
  releaseDate: number | null;
  label: string | null;
  catalogNumber: string | null;
  recordingLocation: string | null;
  producer: string | null;
  notes: string[];
};

export type RetrographSourceRef = {
  id: string;
  source: string;
  url: string | null;
  excerpt: string;
  confidence: number;
};

export type RetrographDuplicateCluster = {
  clusterId: string;
  keptFactId: string;
  memberIds: string[];
  reason: string;
};

export type RetrographDedupeReport = {
  duplicatesRemoved: number;
  clusters: RetrographDuplicateCluster[];
};

export type RetrographConflictReport = {
  conflicts: Array<{ id: string; text: string; reason: string }>;
};

export type RetrographCharts = {
  peakHot100: number | null;
  chartWeeks: number | null;
  albumTitle: string | null;
  summary: string | null;
};

export type RetrographPersonnel = {
  writers: string[];
  producers: string[];
  members: string[];
  engineers: string[];
};

export type RetrographAiEnrichment = {
  id: string;
  kind: string;
  text: string;
  confidence: number;
  source: string;
  generatedAt: string;
};

export type RetrographRelationshipEdge = {
  id: string;
  kind: string;
  from: { entityType: string; entityId: string };
  to: { entityType: string; entityId: string };
  confidence: number;
  source: string;
  label: string | null;
};

export type RetrographFactCounts = {
  collectorInput: number;
  preserved: number;
  accepted: number;
  pending: number;
  duplicate: number;
  invalid: number;
  excerptDerived: number;
};

/** Complete connected knowledge model for one Retroverse entity (RVTR today). */
export type Retrograph = {
  version: typeof RETROGRAPH_VERSION;
  entity: {
    id: string;
    kind: RetrographEntityKind;
    rvtr: string;
    generatedAt: string;
    editorDistillVersion: string | null;
  };
  song: {
    rvtr: string;
    artist: string;
    title: string;
    year: number | null;
    albumTitle: string | null;
    coverUrl: string | null;
  };
  artist: {
    name: string;
    relatedArtists: string[];
  };
  album: {
    title: string | null;
    releaseYear: number | null;
    recordings: RetrographRecording[];
  };
  performances: RetrographMediaVideo[];
  charts: RetrographCharts;
  timeline: RetrographTimelineEvent[];
  recording: {
    location: string | null;
    notes: string[];
  };
  personnel: RetrographPersonnel;
  media: {
    images: RetrographMediaImage[];
    videos: RetrographMediaVideo[];
  };
  relationships: RetrographRelationshipEdge[];
  sources: RetrographSourceRef[];
  facts: RetrographFact[];
  pendingFacts: RetrographFact[];
  unknowns: string[];
  aiEnrichments: RetrographAiEnrichment[];
  confidence: Record<string, number> | null;
  dedupeReport: RetrographDedupeReport;
  conflictReport: RetrographConflictReport;
  factCounts: RetrographFactCounts;
  vdjMetadata: {
    primaryPath: string | null;
    tags: string[];
    mediaItemCount: number;
  };
  relatedSongs: string[];
};

/** @deprecated Sprint 3.29 — use `Retrograph`. */
export type RetroverseDossier = Retrograph;

/** @deprecated Sprint 3.29 — use `RetrographFact`. */
export type DossierFact = RetrographFact;

/** @deprecated Sprint 3.29 — use `RetrographFactStatus`. */
export type DossierFactStatus = RetrographFactStatus;

/** @deprecated Sprint 3.29 — use `RetrographMediaImage`. */
export type DossierImage = RetrographMediaImage;

/** @deprecated Sprint 3.29 — use `RetrographTimelineEvent`. */
export type DossierTimelineEvent = RetrographTimelineEvent;

/** @deprecated Sprint 3.29 — use `RetrographMediaVideo`. */
export type DossierPerformance = RetrographMediaVideo;

/** @deprecated Sprint 3.29 — use `RetrographRecording`. */
export type DossierRecording = RetrographRecording;

/** @deprecated Sprint 3.29 — use `RetrographSourceRef`. */
export type DossierSourceRef = RetrographSourceRef;

/** @deprecated Sprint 3.29 — use `RetrographDuplicateCluster`. */
export type DossierDuplicateCluster = RetrographDuplicateCluster;

/** @deprecated Sprint 3.29 — use `RetrographDedupeReport`. */
export type DossierDedupeReport = RetrographDedupeReport;

/** @deprecated Sprint 3.29 — use `RetrographConflictReport`. */
export type DossierConflictReport = RetrographConflictReport;

/** @deprecated Sprint 3.29 — use `RetrographCharts`. */
export type DossierCharts = RetrographCharts;
