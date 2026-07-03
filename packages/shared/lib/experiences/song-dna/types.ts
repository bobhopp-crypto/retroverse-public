import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";

/** Song DNA cinematic chapter identifiers — optional, data-driven. */
export type SongDnaChapterId =
  | "identity"
  | "energy"
  | "rhythm"
  | "harmony"
  | "instrumentation"
  | "vocals"
  | "production"
  | "similarities"
  | "legacy";

export type SongDnaMotionLanguage =
  | "fingerprint_pulse"
  | "wave_flow"
  | "particle_drift"
  | "orbit_spin"
  | "color_bloom"
  | "constellation_reveal"
  | "pulse_ring"
  | "texture_morph"
  | "neighbor_float";

export type SongDnaVisualLanguage = {
  palette: string[];
  typography: { display: string; body: string; accent: string };
  texture: string;
  signature: string;
  mood: string;
};

export type SongDnaSignalSlot = {
  id: string;
  label: string;
  category: "core" | "musical" | "visual" | "narrative" | "future";
  value: string | number | null;
  displayValue: string;
  available: boolean;
  source: string;
};

export type SongDnaEnrichmentSlots = {
  spotifyAudioFeatures: boolean;
  acousticFingerprint: boolean;
  chordProgression: boolean;
  aiEmbedding: boolean;
  instrumentRecognition: boolean;
  moodCluster: boolean;
  djMetadata: boolean;
  performanceHistory: boolean;
  remixRelationships: boolean;
};

export type SongDnaChapter = {
  id: SongDnaChapterId;
  title: string;
  subtitle: string;
  narrativeHook: string;
  visualConcept: string;
  motionConcept: SongDnaMotionLanguage;
  included: boolean;
  skipReason?: string;
  audienceBeat: string;
  payload: Record<string, unknown>;
};

export type SongDnaVisualConcept = {
  chapterId: SongDnaChapterId;
  title: string;
  description: string;
  layout: string;
  motion: SongDnaMotionLanguage;
  palette: string[];
  heroElement: string;
};

export type SongDnaArtDirection = {
  visualIdentity: string;
  colorField: string[];
  lighting: string;
  texture: string;
  typography: string;
  motionStyle: string;
  museumExhibitStyle: string;
  openingBeat: string;
  closingBeat: string;
};

export type SongDnaAudienceBeat = {
  order: number;
  chapterId: SongDnaChapterId;
  title: string;
  emotionalGoal: string;
  pacing: "slow" | "medium" | "fast";
  dwellSeconds: number;
};

export type SongDnaPreviewCard = {
  chapterId: SongDnaChapterId;
  title: string;
  mood: string;
  layout: string;
  palette: string[];
  motion: string;
  priority: "hero" | "supporting" | "closing";
};

export type SongDnaCreativeReviewDimension = {
  id:
    | "emotionalEngagement"
    | "visualRichness"
    | "accessibility"
    | "personalityClarity"
    | "pacing"
    | "ending"
    | "replayValue";
  label: string;
  score: number;
  note: string;
};

export type SongDnaCreativeReview = {
  overallScore: number;
  verdict: string;
  dimensions: SongDnaCreativeReviewDimension[];
};

export type SongDnaProductionReadiness = {
  score: number;
  passed: boolean;
  checks: Array<{ id: string; label: string; passed: boolean; note: string }>;
  publisherNotes: string[];
};

export type SongDnaExperience = {
  version: 1;
  rvtr: string;
  artist: string;
  title: string;
  generatedAt: string;
  coverUrl: string | null;
  songDna: CollectorSongDna;
  visualLanguage: SongDnaVisualLanguage;
  executiveSummary: {
    headline: string;
    personality: string;
    oneLine: string;
    strengths: string[];
  };
  overview: {
    fingerprintLabel: string;
    genreBlend: string;
    personalityTraits: string[];
    signalCount: number;
    enrichmentAvailable: number;
  };
  signals: SongDnaSignalSlot[];
  enrichmentSlots: SongDnaEnrichmentSlots;
  chapters: SongDnaChapter[];
  skippedChapters: SongDnaChapter[];
  visualConcepts: SongDnaVisualConcept[];
  artDirection: SongDnaArtDirection;
  audienceSequence: SongDnaAudienceBeat[];
  previewWall: SongDnaPreviewCard[];
  review: SongDnaCreativeReview;
  productionReadiness: SongDnaProductionReadiness;
};

export type SongDnaWorkspacePayload = {
  experience: SongDnaExperience | null;
  hasSongDna: boolean;
};
