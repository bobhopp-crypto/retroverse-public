/**
 * Editor Department — v2 story package contract.
 *
 * story     — narrative the patron reads
 * approved  — curated material for Director
 * workspace — Editor-only suggestions, evidence, performance drafts
 * meta      — provenance and handoff (never sent to Director as workspace)
 */

import { EDITOR_STORY_VERSION } from "@/lib/studio/package";

export { EDITOR_STORY_VERSION };
export const EDITOR_DISTILL_VERSION = "2026-06-26.a4" as const;

/** @deprecated v1 shape — used only for migration input */
export type EditorConfidenceLevel = "draft" | "review" | "ready";

/** @deprecated v1 shape */
export type EditorDirectorHandoffStatus = "not_ready" | "ready" | "submitted";

export type EditorEditorialStatus =
  | "not_started"
  | "distilling"
  | "in_progress"
  | "ready"
  | "submitted";

export type StoryIdeaKind = "card" | "visual" | "quote" | "animation" | "transition";
export type StoryIdeaStatus = "suggested" | "dismissed" | "promoted";

export type StoryIdea = {
  id: string;
  kind: StoryIdeaKind;
  title: string;
  body: string;
  status: StoryIdeaStatus;
};

export type ApprovedFact = {
  id: string;
  text: string;
  sourceRef: string | null;
};

export type ApprovedCard = {
  id: string;
  title: string;
  body: string;
  cardType: string;
};

export type ApprovedImage = {
  assetId: string;
  caption: string;
  imageUrl: string;
  performanceId: string | null;
};

export type ApprovedQuote = {
  id: string;
  text: string;
  attribution: string | null;
};

export type EditorNote = {
  id: string;
  text: string;
};

export type TimelineEvent = {
  date: string;
  label: string;
};

export type CandidateFactStatus = "pending" | "accepted" | "rejected" | "hold";

export type CandidateFactReview = {
  id: string;
  text: string;
  sourceRef: string | null;
  category: string;
  status: CandidateFactStatus;
};

export type StoryAngleId =
  | "breakthrough"
  | "personal_story"
  | "cultural_moment"
  | "technical_innovation"
  | "live_performance"
  | "career_turning_point"
  | "behind_the_scenes"
  | "unexpected_connection"
  | "custom";

export type PlannedCard = {
  id: string;
  title: string;
  body: string;
  approved: boolean;
  hidden: boolean;
  priority: number;
  order: number;
};

export type ImageBoardRole =
  | "hero"
  | "supporting"
  | "performance"
  | "close-up"
  | "alternate";

export type ImageBoardItem = {
  assetId: string;
  imageUrl: string;
  caption: string;
  label: string;
  role: ImageBoardRole;
  order: number;
  approved: boolean;
  performanceId: string | null;
};

export type PerformanceScreenshot = {
  assetId: string;
  label: string;
  imageUrl: string;
  caption: string;
  approved: boolean;
};

export type PerformanceWorkspace = {
  performanceId: string;
  notes: string;
  venue: string;
  year: number | null;
  observations: string[];
  screenshots: PerformanceScreenshot[];
  recommended: boolean;
  recommendReason: string;
};

export type EditorialRecommendation =
  | "ready_for_director"
  | "needs_more_story"
  | "needs_more_research"
  | "needs_better_performance";

export type StoryWeakness = {
  id: string;
  issue: string;
  suggestion: string;
};

export type StoryAngleSuggestion = {
  currentAngle: StoryAngleId;
  suggestedAngle: StoryAngleId;
  reason: string;
};

export type EditorialReview = {
  patronValue: number;
  storyQuality: string;
  visualQuality: number;
  performanceQuality: number;
  recommendation: EditorialRecommendation;
  recommendationLabel: string;
  explanation: string;
  weaknesses: StoryWeakness[];
  angleSuggestion: StoryAngleSuggestion | null;
  performanceRationale: string;
};

export type EmotionalArcId =
  | "celebration"
  | "discovery"
  | "nostalgia"
  | "drama"
  | "triumph"
  | "innovation"
  | "humor"
  | "reflection"
  | "energy";

export type RecommendedPace = "slow" | "moderate" | "fast" | "mixed";

export type ThemeId =
  | "breakthrough"
  | "reinvention"
  | "love"
  | "protest"
  | "technology"
  | "television"
  | "dance"
  | "performance"
  | "culture"
  | "legacy"
  | "chart_success";

export type StoryBeat = {
  id: string;
  order: number;
  title: string;
  description: string;
  supportingFactIds: string[];
  relatedImageAssetIds: string[];
  relatedPerformanceId: string | null;
  priority: number;
};

export type KeyMoment = {
  id: string;
  title: string;
  description: string;
  kind: string;
  year: number | null;
  supportingFactIds: string[];
  relatedImageAssetIds: string[];
};

export type BlueprintPerformanceRecommendation = {
  performanceId: string;
  title: string;
  reason: string;
};

export type BlueprintEndingRecommendation = {
  style: string;
  description: string;
};

/** Sprint A4 — Editor's structured creative plan for Director. */
export type NarrativeBlueprint = {
  version: 1;
  opening: string;
  closing: string;
  storyBeats: StoryBeat[];
  keyMoments: KeyMoment[];
  emotionalArc: EmotionalArcId;
  recommendedPace: RecommendedPace;
  recommendedPerformance: BlueprintPerformanceRecommendation;
  primaryTheme: ThemeId;
  secondaryTheme: ThemeId | null;
  recommendedEnding: BlueprintEndingRecommendation;
  generatedAt: string;
};

export type EditorStoryNarrative = {
  headline: string;
  subtitle: string;
  hook: string;
  summary: string;
  fullStory: string;
};

export type EditorApprovedLayer = {
  facts: ApprovedFact[];
  cards: ApprovedCard[];
  images: ApprovedImage[];
  quotes: ApprovedQuote[];
  performanceId: string | null;
};

export type EditorWorkspace = {
  storyIdeas: {
    cards: StoryIdea[];
    visualMoments: StoryIdea[];
    quotes: StoryIdea[];
    animations: StoryIdea[];
    transitions: StoryIdea[];
  };
  editorialNotes: {
    questions: EditorNote[];
    missing: EditorNote[];
    factChecks: EditorNote[];
    weakAreas: EditorNote[];
  };
  evidence: {
    recording: string;
    charts: string;
    culture: string;
    timeline: TimelineEvent[];
    relationships: string;
    /** Sprint A3 — separated entity timelines from Collector v4. */
    songTimeline?: TimelineEvent[];
    recordingTimeline?: TimelineEvent[];
    performanceTimeline?: TimelineEvent[];
    canonical?: {
      songSummary: string;
      recordingSummary: string;
      performanceSummary: string;
      primaryNarrativeYear: number | null;
      yearResolution: string;
    };
  };
  performances: Record<string, PerformanceWorkspace>;
  candidateFacts: CandidateFactReview[];
  plannedCards: PlannedCard[];
  imageBoard: ImageBoardItem[];
  /** Sprint A2 — patron-value editorial checkpoint (recomputed on save/rewrite). */
  editorialReview?: EditorialReview | null;
};

import type { CollectorDomainConfidence } from "@/lib/ops/studio/collector/types";

export type EditorHandoffChecklist = {
  story: boolean;
  facts: boolean;
  cards: boolean;
  images: boolean;
  performance: boolean;
};

export type EditorPackageMeta = {
  version: typeof EDITOR_STORY_VERSION;
  rvtr: string;
  collectorCompletedAt: string;
  distillVersion: string;
  updatedAt: string;
  editorialStatus: EditorEditorialStatus;
  storyAngle: StoryAngleId;
  storyAngleCustom: string | null;
  lastRewriteAt: string | null;
  storyManuallyEdited: boolean;
  /** Sprint A1 — domain confidence from Collector v3 package. */
  collectorConfidence?: CollectorDomainConfidence | null;
  directorHandoff: {
    submittedAt: string | null;
    notes: string;
    checklist: EditorHandoffChecklist;
  };
};

export type EditorStoryPackage = {
  story: EditorStoryNarrative;
  approved: EditorApprovedLayer;
  /** Sprint A4 — structured creative plan for Director (not prose). */
  narrativeBlueprint?: NarrativeBlueprint;
  workspace: EditorWorkspace;
  meta: EditorPackageMeta;
};

/** v1 on-disk shape — migration input only */
export type EditorStoryPackageV1 = {
  version: 1;
  rvtr: string;
  collectorCompletedAt: string;
  updatedAt: string;
  headline: string;
  summary: string;
  longStory: string;
  recordingStory: string;
  chartStory: string;
  culturalImpact: string;
  relatedArtists: string;
  interestingFacts: string[];
  timeline: string;
  quoteCandidates: string[];
  suggestedCards: string[];
  suggestedImages: string[];
  missingInformation: string[];
  confidence: EditorConfidenceLevel;
  confidenceNotes: string;
  performances: Record<
    string,
    {
      performanceId: string;
      notes: string;
      venue: string;
      year: number | null;
      facts: string[];
      screenshots: PerformanceScreenshot[];
    }
  >;
  selectedPerformanceId: string | null;
  directorHandoff: {
    status: EditorDirectorHandoffStatus;
    submittedAt: string | null;
    notes: string;
  };
};

/** Director-facing package — approved material + narrative blueprint, no workspace */
export type DirectorEditorialPackage = {
  version: 2;
  rvtr: string;
  artist: string;
  title: string;
  story: EditorStoryNarrative;
  approvedFacts: ApprovedFact[];
  approvedCards: ApprovedCard[];
  approvedImages: ApprovedImage[];
  approvedQuotes: ApprovedQuote[];
  performance: {
    id: string;
    title: string;
    venue: string;
    year: number | null;
    notes: string;
    screenshots: PerformanceScreenshot[];
  };
  narrativeBlueprint: NarrativeBlueprint;
  submittedAt: string;
  editorNotesForDirector?: string;
  /** Patron Value + Story Quality from Editor review — not Collector */
  editorialQuality?: {
    patronValue: number | null;
    storyQuality: string | null;
  };
};

/** Legacy presentation compat — maps from PerformanceWorkspace */
export type EditorPerformanceStory = {
  performanceId: string;
  notes: string;
  venue: string;
  year: number | null;
  facts: string[];
  screenshots: PerformanceScreenshot[];
};

export type EditorLibraryCard = {
  rvtr: string;
  artist: string;
  title: string;
  heroImageUrl: string | null;
  performanceCount: number;
  storyStatus: EditorDirectorHandoffStatus | "no_draft";
  confidence: EditorConfidenceLevel | null;
  lastUpdated: string | null;
  collectorReady: boolean;
  href: string;
};

export type EditorLibraryStats = {
  storyCount: number;
  readyForDirector: number;
  submitted: number;
  draftCount: number;
};

export type EditorLibraryIndex = {
  cards: EditorLibraryCard[];
  recent: EditorLibraryCard[];
  alphabetical: EditorLibraryCard[];
  stats: EditorLibraryStats;
};

export function isEditorPackageV1(raw: unknown): raw is EditorStoryPackageV1 {
  if (!raw || typeof raw !== "object") return false;
  const pkg = raw as Record<string, unknown>;
  return pkg.version === 1 && typeof pkg.headline === "string" && !("story" in pkg);
}

export function isEditorPackageV2(raw: unknown): raw is EditorStoryPackage {
  if (!raw || typeof raw !== "object") return false;
  const pkg = raw as Record<string, unknown>;
  return (
    pkg.meta != null &&
    typeof pkg.meta === "object" &&
    (pkg.meta as EditorPackageMeta).version === EDITOR_STORY_VERSION &&
    pkg.story != null &&
    pkg.approved != null &&
    pkg.workspace != null
  );
}

export function selectedPerformanceId(pkg: EditorStoryPackage): string | null {
  return pkg.approved.performanceId;
}

export function editorialStatusToHandoff(
  status: EditorEditorialStatus,
): EditorDirectorHandoffStatus | "no_draft" {
  if (status === "submitted") return "submitted";
  if (status === "ready") return "ready";
  if (status === "in_progress" || status === "distilling") return "not_ready";
  return "no_draft";
}

export function editorialStatusToConfidence(
  status: EditorEditorialStatus,
): EditorConfidenceLevel | null {
  if (status === "ready" || status === "submitted") return "ready";
  if (status === "in_progress") return "draft";
  return null;
}
