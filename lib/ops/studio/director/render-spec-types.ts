/**
 * Director 0.3 — Render specification schema.
 * Machine-readable output for all future presentation layers.
 */

import type { SceneTemplateId } from "./scene-template-library";

import type { PresentationStyle, VisualRhythm } from "./types";

import { DIRECTOR_RENDER_SPEC_VERSION } from "@/lib/studio/package";

export { DIRECTOR_RENDER_SPEC_VERSION };

export type TransitionHint =
  | "cut"
  | "fade"
  | "crossfade"
  | "dissolve"
  | "hold"
  | "zoom"
  | "reveal";

export type SceneImportance = "high" | "medium" | "low";

export type AssetRole =
  | "hero"
  | "supporting_image"
  | "performance_image"
  | "gallery_image"
  | "chart_data"
  | "quote_text"
  | "timeline_data"
  | "fact"
  | "logo";

export type ManifestAsset = {
  id: string;
  role: AssetRole;
  required: boolean;
  priority: number;
  url: string | null;
  caption: string | null;
  performanceId: string | null;
  sceneNumbers: number[];
};

export type AssetManifest = {
  hero: ManifestAsset[];
  supportingImages: ManifestAsset[];
  performanceImages: ManifestAsset[];
  galleryImages: ManifestAsset[];
  timelineData: ManifestAsset[];
  charts: ManifestAsset[];
  quotes: ManifestAsset[];
  facts: ManifestAsset[];
  logos: ManifestAsset[];
};

export type RenderSpecMetadata = {
  rvtr: string;
  artist: string;
  title: string;
  version: typeof DIRECTOR_RENDER_SPEC_VERSION;
  generatedAt: string;
  estimatedRuntimeSec: number;
  presentationStyle: PresentationStyle;
  primaryPerformance: {
    performanceId: string;
    title: string;
  };
  patronValue: number | null;
  storyQuality: string | null;
};

export type GlobalPresentationSettings = {
  backgroundTreatment: string;
  typographyProfile: string;
  colorTheme: string;
  pacingProfile: VisualRhythm;
  imageTreatment: string;
  orientation: "widescreen_preferred" | "portrait_compatible" | "both";
};

export type RenderSpecTimelineEvent = {
  year: number | null;
  label: string;
};

export type RenderSpecSceneAssets = {
  imageAssetIds: string[];
  imageUrls: string[];
  factIds: string[];
  factTexts: string[];
  performanceId: string | null;
  timelineEvents: RenderSpecTimelineEvent[];
};

export type RenderSpecScene = {
  sceneNumber: number;
  templateId: SceneTemplateId;
  preferredTemplateId: SceneTemplateId;
  templateDowngraded: boolean;
  varietyAdjusted: boolean;
  downgradeReason: string | null;
  durationSec: number;
  headline: string;
  supportingCopy: string;
  narrativePurpose: string;
  importance: SceneImportance;
  assets: RenderSpecSceneAssets;
  transitionIn: TransitionHint;
  transitionOut: TransitionHint;
  layoutReadiness: string;
  selfContained: true;
};

export type FallbackRule = {
  id: string;
  when: string;
  fallbackTemplate: SceneTemplateId;
  description: string;
};

export type RenderingInstructions = {
  sceneOrder: number[];
  autoAdvance: boolean;
  loopPresentation: boolean;
  respectDurationHints: boolean;
  notes: string[];
};

export type RenderReadiness =
  | "ready_to_render"
  | "missing_optional_assets"
  | "missing_required_assets";

export type DirectorRenderSpec = {
  version: typeof DIRECTOR_RENDER_SPEC_VERSION;
  metadata: RenderSpecMetadata;
  globalPresentation: GlobalPresentationSettings;
  sceneTimeline: RenderSpecScene[];
  assetManifest: AssetManifest;
  renderingInstructions: RenderingInstructions;
  fallbackRules: FallbackRule[];
  renderReadiness: RenderReadiness;
  renderReadinessLabel: string;
  templateDowngradesApplied: number;
  varietyAdjustmentsApplied: number;
  estimatedRenderingConfidence: number;
};

export const STANDARD_FALLBACK_RULES: FallbackRule[] = [
  {
    id: "quote-to-story",
    when: "quote template lacks pull-quote length",
    fallbackTemplate: "story",
    description: "Quote without quote text becomes Story layout",
  },
  {
    id: "gallery-to-hero",
    when: "gallery template has fewer than two images",
    fallbackTemplate: "hero",
    description: "Gallery with one image becomes Hero layout",
  },
  {
    id: "fact-stack-to-story",
    when: "fact stack has fewer than two facts",
    fallbackTemplate: "story",
    description: "Insufficient facts collapse to Story",
  },
  {
    id: "timeline-to-story",
    when: "timeline lacks dated events",
    fallbackTemplate: "story",
    description: "Timeline without dates becomes Story",
  },
  {
    id: "performance-to-story",
    when: "performance reference or image missing",
    fallbackTemplate: "story",
    description: "Performance without footage falls back to Story",
  },
  {
    id: "chart-to-story",
    when: "chart data missing",
    fallbackTemplate: "story",
    description: "Chart without peak data becomes Story",
  },
  {
    id: "comparison-to-story",
    when: "comparison copy missing",
    fallbackTemplate: "story",
    description: "Comparison without dual timeline copy becomes Story",
  },
];
