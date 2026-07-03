import type { IdentifiedLabel } from "@/lib/ops/studio/model-identity";
import type { LabLayoutId } from "@/lib/retroverse/experience-lab/types";

/** Transformation style identifier (style library slug). */
export type VisualStyleId = string;

export type DerivedVisualGenerationStatus =
  | "preview_only"
  | "queued"
  | "generated"
  | "failed";

/** Metadata-only derived artwork — no generated image bytes in Phase 2.7. */
export type DerivedVisual = {
  id: string;
  sourceImageId: string;
  sourceTimestamp: number | null;
  style: VisualStyleId;
  title: string;
  description: string;
  prompt: string;
  palette: string[];
  preferredSceneTypes: string[];
  preferredLayouts: LabLayoutId[];
  preferredMoods: string[];
  generationStatus: DerivedVisualGenerationStatus;
  previewOnly: true;
};

export type PerformanceFrame = {
  id: string;
  imageUrl: string;
  caption: string | null;
  performanceId: string | null;
  role: string;
  sceneNumbers: number[];
};

export type VisualStyleDefinition = {
  id: VisualStyleId;
  name: string;
  description: string;
  preferredMoods: string[];
  preferredGenres: string[];
  preferredDecades: string[];
  preferredLayouts: LabLayoutId[];
  preferredSceneTypes: string[];
  /** DNA signals that boost this style (energy, acousticness, etc.). */
  dnaAffinities: string[];
};

export type StyleSuggestion = {
  style: VisualStyleDefinition;
  score: number;
  reason: string;
  dnaSources: string[];
};

export type DerivedVisualPreview = {
  rvtr: string;
  frame: PerformanceFrame | null;
  allFrames: PerformanceFrame[];
  suggestions: StyleSuggestion[];
  selectedStyle: VisualStyleDefinition;
  derivedVisual: DerivedVisual;
  preferredSceneTypes: string[];
  identifiedSceneTypes: IdentifiedLabel[];
  identifiedPalette: IdentifiedLabel[];
  selectionReason: string;
};

export type DerivedVisualStudioState = {
  preview: DerivedVisualPreview;
  allStyles: VisualStyleDefinition[];
};
