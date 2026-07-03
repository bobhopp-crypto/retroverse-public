/**
 * Sprint 3.31 — Director storytelling model.
 * Stories → Clusters → Exhibits → Pages → Storyboard
 */

export type StoryStatus = "discovered" | "built" | "skipped";

export type DiscoveryCategory =
  | "unexpected_chart_success"
  | "rare_recording_story"
  | "famous_studio"
  | "chart_journey"
  | "cultural_influence"
  | "career_turning_point"
  | "rare_footage"
  | "awards"
  | "famous_collaborator"
  | "famous_producer"
  | "historical_coincidence"
  | "missing_research";

export type DirectorInterestingDiscovery = {
  id: string;
  title: string;
  whyItMatters: string;
  category: DiscoveryCategory;
  factIds: string[];
  mediaIds: string[];
  relationshipIds: string[];
  confidence: number;
  potentialExperiences: string[];
  status: "found" | "used" | "ignored";
  ignoreReason: string | null;
  rank: number;
  scores: {
    audienceInterest: number;
    historicalSignificance: number;
    emotionalImpact: number;
    visualPotential: number;
    researchConfidence: number;
    uniqueness: number;
    composite: number;
  };
};

export type DirectorExperienceOpportunity = {
  id: string;
  title: string;
  discoveryId: string;
  storyId: string;
  exhibitHints: string[];
  priority: number;
  compositeScore: number;
};

export type DirectorNarrativeChapter = {
  id: string;
  title: string;
  thesis: string;
  discoveryIds: string[];
  storyIds: string[];
  opportunityIds: string[];
  order: number;
};

export type DirectorDiscoveryCoverage = {
  discoveriesFound: number;
  discoveriesUsed: number;
  discoveriesIgnored: number;
  ignored: Array<{ id: string; title: string; reason: string }>;
  unusedFactIds: string[];
  unusedMediaIds: string[];
  unusedRelationshipIds: string[];
};

export type DirectorStory = {
  id: string;
  title: string;
  hook: string;
  whyCare: string;
  status: StoryStatus;
  skipReason: string | null;
  factIds: string[];
  mediaIds: string[];
  relationshipIds: string[];
  exhibitIds: string[];
  pageIds: string[];
  discoveryIds: string[];
};

export type DirectorStoryCluster = {
  storyId: string;
  title: string;
  factIds: string[];
  mediaIds: string[];
  relationshipIds: string[];
  summary: string;
};

export type DirectorExhibit = {
  id: string;
  storyId: string;
  title: string;
  purpose: string;
  factIds: string[];
  mediaIds: string[];
  relationshipIds: string[];
  estimatedPages: number;
  pageIds: string[];
  status: "built" | "skipped";
  skipReason: string | null;
};

/** Sprint 3.35 — Experience Designer palette */
export type ExperienceType =
  | "cinematic_opening"
  | "magazine_spread"
  | "documentary"
  | "timeline"
  | "gallery"
  | "infographic"
  | "collector_card"
  | "record_sleeve"
  | "map"
  | "performance_reel"
  | "comparison"
  | "before_after"
  | "quote_focus"
  | "motion_graphic"
  | "data_visualization";

export type DirectorVisualVocabulary = {
  primaryVisual: string;
  supportingVisual: string;
  backgroundStyle: string;
  motionStyle: string;
  typographyEmphasis: string;
  iconography: string;
  informationDensity: "sparse" | "moderate" | "dense";
  desiredEmotionalReaction: string;
};

export type DirectorExperienceConcept = {
  storyId: string;
  storyTitle: string;
  conceptTitle: string;
  experienceType: ExperienceType;
  mood: string;
  primaryMedia: string;
  supportingMedia: string[];
  animation: string;
  narration: string;
  visualPriority: number;
  visualVocabulary: DirectorVisualVocabulary;
};

export type DirectorVisualConcept = {
  id: string;
  storyId: string;
  exhibitId: string;
  experienceType: ExperienceType;
  conceptTitle: string;
  wireframeIcon: string;
  wireframeLabel: string;
  templateId: string;
  mood: string;
  motionHint: string;
  contrastNote: string | null;
};

/** Sprint 3.36 — Art Director brief */
export type DirectorArtDirectionBrief = {
  id: string;
  storyId: string;
  storyTitle: string;
  visualIdentity: string;
  primaryEnvironment: string;
  camera: string;
  lighting: string;
  colorPalette: string[];
  textures: string[];
  motion: string;
  layoutStyle: string;
  primaryFocus: string;
  supportingElements: string[];
  emotionalGoal: string;
  emotionalTone: string;
  eraYear: number;
  eraNotes: string;
  openingBeat: string;
};

export type DirectorPageArtDirection = {
  exhibitId: string;
  storyId: string;
  pageId: string | null;
  wireframeIcon: string;
  paletteChips: string[];
  cameraIcon: string;
  cameraLabel: string;
  motionIcon: string;
  motionLabel: string;
  layoutType: string;
  texture: string;
  mood: string;
  priority: number;
};

export type DirectorArtDirectionConsistency = {
  uniquenessScore: number;
  repeatedPalettes: string[];
  repeatedLayouts: string[];
  repeatedCameras: string[];
  repeatedTextures: string[];
  repeatedMotions: string[];
  repeatedEmotionalTones: string[];
  warnings: string[];
};

export type DirectorArtDirectionOverview = {
  visualStylesUsed: string[];
  cameraVariety: string[];
  motionVariety: string[];
  eraAuthenticity: string;
  textureBalance: string[];
  colorDiversity: string[];
  emotionalPacing: string;
  overallCreativeIdentity: string;
  consistencyScore: number;
};

export type DirectorExperienceVarietyAudit = {
  varietyScore: number;
  visualTypesUsed: Record<string, number>;
  motionTypesUsed: Record<string, number>;
  mediaBalance: {
    photo: number;
    video: number;
    chart: number;
    text: number;
    illustration: number;
  };
  textHeavyWarnings: string[];
  repeatedLayouts: string[];
  missingVisualOpportunities: string[];
  scrollStopMoments: Array<{
    storyId: string;
    pageId: string;
    verdict: "strong" | "moderate" | "weak";
    reason: string;
  }>;
  varietyViolations: Array<{ rule: string; message: string; fixHint: string }>;
};

export type DirectorStoryPage = {
  id: string;
  storyId: string;
  exhibitId: string;
  title: string;
  headline: string;
  supportingCopy: string;
  sceneNumber: number | null;
  factIds: string[];
  mediaIds: string[];
  templateId: string;
  visualConceptId?: string;
};

export type DirectorSequenceViolation = {
  rule: string;
  message: string;
  pageIds: string[];
  severity: "blocking" | "warning";
  fixHint: string;
};

export type DirectorOperatorSummary = {
  mainStory: string;
  narrativeParagraph: string;
  creativeBrief: string;
  majorDiscoveryCount: number;
  topDiscoveries: string[];
  storyCount: number;
  exhibitCount: number;
  pageCount: number;
  strengths: string[];
  weaknesses: string[];
  publishReadiness: "ready" | "needs_review" | "blocked";
  publishReadinessLabel: string;
};

export type DirectorAudienceStep = {
  order: number;
  pageId: string;
  label: string;
  templateId: string;
  storyId: string;
  warnings: string[];
};

export type DirectorChapterView = {
  order: number;
  storyId: string;
  title: string;
  role: string;
  purpose: string;
  factCount: number;
  mediaCount: number;
  exhibitCount: number;
  pageCount: number;
  warnings: string[];
  pageIds: string[];
};

export type DirectorStoryboardBeat = {
  order: number;
  storyId: string;
  storyTitle: string;
  role: "opening" | "act" | "visual_break" | "closing";
  exhibitIds: string[];
  pageIds: string[];
};

export type DirectorCoverageReport = {
  storiesDiscovered: number;
  storiesBuilt: number;
  storiesSkipped: number;
  exhibitsBuilt: number;
  pagesBuilt: number;
  factsTotal: number;
  factsUsed: number;
  factsUnused: number;
  unusedFactIds: string[];
  relationshipsTotal: number;
  relationshipsUsed: number;
  mediaTotal: number;
  mediaUsed: number;
  unusedMediaIds: string[];
  skippedStories: Array<{ id: string; title: string; reason: string }>;
  unusedStories: Array<{ id: string; title: string; reason: string }>;
  missingResearchOpportunities: string[];
};

export type DirectorStoryPlan = {
  version: 5;
  generatedAt: string;
  retrographSummary: {
    rvtr: string;
    artist: string;
    title: string;
    factCount: number;
    pendingFactCount: number;
    mediaCount: number;
    relationshipCount: number;
    timelineCount: number;
  };
  discoveries: DirectorInterestingDiscovery[];
  opportunities: DirectorExperienceOpportunity[];
  narrativeChapters: DirectorNarrativeChapter[];
  discoveryCoverage: DirectorDiscoveryCoverage;
  experienceConcepts: DirectorExperienceConcept[];
  visualConcepts: DirectorVisualConcept[];
  experienceVariety: DirectorExperienceVarietyAudit;
  artDirectionBriefs: DirectorArtDirectionBrief[];
  pageArtDirections: DirectorPageArtDirection[];
  artDirectionConsistency: DirectorArtDirectionConsistency;
  artDirectionOverview: DirectorArtDirectionOverview;
  stories: DirectorStory[];
  clusters: DirectorStoryCluster[];
  exhibits: DirectorExhibit[];
  pages: DirectorStoryPage[];
  storyboard: DirectorStoryboardBeat[];
  coverage: DirectorCoverageReport;
  summary: DirectorOperatorSummary;
  audienceSequence: DirectorAudienceStep[];
  chapters: DirectorChapterView[];
  sequenceViolations: DirectorSequenceViolation[];
};

export type StorytellingPipelineResult = {
  storyPlan: DirectorStoryPlan;
  experiencePlan: import("../types").ExperiencePlan;
  sequenceViolations: DirectorSequenceViolation[];
};
