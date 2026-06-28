/**
 * Sprint 3.33 — Creative Review types.
 * Read-only critique of Director output — never mutates upstream departments.
 */

export type CreativeReviewPublishGate =
  | "ready"
  | "ready_with_changes"
  | "needs_revision"
  | "blocked";

export type CreativeReviewExecutiveSummary = {
  overallScore: number;
  publishReadiness: CreativeReviewPublishGate;
  publishReadinessLabel: string;
  strengths: string[];
  weaknesses: string[];
  recommendedFixes: string[];
  narrativeParagraph: string;
};

export type CreativeReviewBeat = {
  order: number;
  beatId: string;
  pageId: string;
  storyId: string;
  label: string;
  purpose: string;
  templateId: string;
  interestScore: number;
  visualScore: number;
  informationDensity: number;
  audienceAttention: number;
  transitionQuality: number;
  hasMedia: boolean;
  copyLength: number;
};

export type CreativeReviewStoryFlow = {
  beats: CreativeReviewBeat[];
  averageInterest: number;
  averageVisual: number;
  flowScore: number;
};

export type CreativeReviewPacingIssue = {
  kind: string;
  message: string;
  beatRange: string;
  recommendation: string;
};

export type CreativeReviewPacing = {
  score: number;
  textHeavyBeats: number;
  imageHeavyBeats: number;
  longestTextRun: number;
  longestMediaGap: number;
  longestStoryGap: number;
  issues: CreativeReviewPacingIssue[];
  recommendations: string[];
};

export type CreativeReviewVarietySlot = {
  id: string;
  label: string;
  count: number;
  present: boolean;
};

export type CreativeReviewVariety = {
  diversityScore: number;
  slots: CreativeReviewVarietySlot[];
  imagesReused: number;
  uniqueTemplates: number;
  recommendations: string[];
};

export type CreativeReviewRepetitionItem = {
  kind: "fact" | "wording" | "media" | "story" | "title" | "exhibit_purpose";
  message: string;
  beatLabels: string[];
  recommendation: string;
};

export type CreativeReviewRepetition = {
  score: number;
  items: CreativeReviewRepetitionItem[];
};

export type CreativeReviewNarrativePhase = {
  phase: "opening" | "discovery" | "momentum" | "surprise" | "payoff" | "ending";
  label: string;
  present: boolean;
  strength: number;
  beatLabel: string | null;
  recommendation: string | null;
};

export type CreativeReviewNarrative = {
  arcScore: number;
  phases: CreativeReviewNarrativePhase[];
  recommendations: string[];
};

export type CreativeReviewPersonaScore = {
  persona: string;
  interesting: number;
  educational: number;
  emotional: number;
  entertaining: number;
  replayValue: number;
  overall: number;
};

export type CreativeReviewAudience = {
  personas: CreativeReviewPersonaScore[];
  averageEngagement: number;
};

export type CreativeReviewMissingOpportunity = {
  id: string;
  label: string;
  reason: string;
};

export type CreativeReviewPublishGateSection = {
  decision: CreativeReviewPublishGate;
  label: string;
  reasons: string[];
  blockers: string[];
};

export type CreativeReviewDirectorNote = {
  id: string;
  beatRefs: string[];
  message: string;
  priority: "high" | "medium" | "low";
};

export type CreativeReviewPackage = {
  version: 1;
  rvtr: string;
  artist: string;
  title: string;
  generatedAt: string;
  directorGeneratedAt: string | null;
  executiveSummary: CreativeReviewExecutiveSummary;
  storyFlow: CreativeReviewStoryFlow;
  pacing: CreativeReviewPacing;
  variety: CreativeReviewVariety;
  repetition: CreativeReviewRepetition;
  narrative: CreativeReviewNarrative;
  audience: CreativeReviewAudience;
  missingOpportunities: CreativeReviewMissingOpportunity[];
  publishGate: CreativeReviewPublishGateSection;
  directorFeedback: CreativeReviewDirectorNote[];
};

export type CreativeReviewSnapshot = CreativeReviewPackage & {
  coverUrl: string | null;
  album: string | null;
  year: number | null;
  pageCount: number;
  sceneCount: number;
};
