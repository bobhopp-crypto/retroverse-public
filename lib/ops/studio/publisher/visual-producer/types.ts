/** Sprint 3.37 — Visual Producer: faithful production of Director creative package. */

export type ProducerLayoutType =
  | "hero"
  | "magazine_spread"
  | "timeline"
  | "gallery"
  | "record_sleeve"
  | "comparison"
  | "documentary_frame"
  | "museum_panel"
  | "data_visualization"
  | "performance_reel";

export type ProducedSceneTypography = {
  display: string;
  body: string;
  emphasis: "headline" | "pull_quote" | "stat" | "caption";
};

export type ProducedSceneComposition = {
  heroElement: string;
  secondary: string;
  supporting: string;
  eyePath: string;
};

export type ProducedSceneMedia = {
  heroMediaIds: string[];
  supportingMediaIds: string[];
  mediaRole: string;
};

export type ProducedSceneRhythm = {
  visualWeight: "light" | "medium" | "heavy";
  pacingBeat: string;
  family: string;
};

export type ProducedSceneTransition = {
  transitionIn: string;
  transitionOut: string;
  continuityNote: string;
};

export type ProducedScene = {
  sceneNumber: number;
  pageId: string;
  storyId: string;
  exhibitId: string;
  headline: string;
  layout: ProducerLayoutType;
  presentationLayout: string;
  typography: ProducedSceneTypography;
  composition: ProducedSceneComposition;
  media: ProducedSceneMedia;
  rhythm: ProducedSceneRhythm;
  transition: ProducedSceneTransition;
  artDirectionId: string;
  experienceConceptTitle: string;
  mood: string;
  palette: string[];
};

export type VisualProductionReview = {
  productionScore: number;
  layoutConsistency: boolean;
  mediaQuality: boolean;
  typographyHierarchy: boolean;
  spacingRhythm: boolean;
  visualRepetitionWarnings: string[];
  missingHeroImages: string[];
  oversizedTextWarnings: string[];
  weakCompositionWarnings: string[];
  transitionWarnings: string[];
  passed: boolean;
};

export type VisualProductionPlan = {
  version: 1;
  rvtr: string;
  generatedAt: string;
  directorStoryPlanVersion: number | null;
  typographyProfile: {
    display: string;
    body: string;
    era: string;
  };
  overallRhythm: string;
  creativeIdentity: string;
  scenes: ProducedScene[];
  review: VisualProductionReview;
};

export type VisualProductionReviewSummary = {
  productionScore: number;
  passed: boolean;
  sceneCount: number;
  layoutTypes: string[];
  warningCount: number;
  topWarnings: string[];
};
