/**
 * Director 0.3 — Experience Plan + Scene Template + Render Spec types.
 * Planning artifact only — no rendering.
 */

import type { DirectorRenderSpec } from "./render-spec-types";
import type { SceneTemplateId } from "./scene-template-library";

import { DIRECTOR_PLAN_VERSION } from "@/lib/studio/package";

export { DIRECTOR_PLAN_VERSION };

export type SceneType =
  | "hero"
  | "story"
  | "timeline"
  | "quote"
  | "performance"
  | "chart"
  | "image"
  | "closing";

export type VisualRhythm = "slow" | "moderate" | "fast" | "mixed";

export type PresentationStyle =
  | "documentary"
  | "concert"
  | "magazine_feature"
  | "television_retrospective"
  | "countdown"
  | "storybook";

export type LayoutReadinessStatus =
  | "ready"
  | "needs_hero_image"
  | "needs_image"
  | "needs_multiple_images"
  | "needs_quote"
  | "needs_facts"
  | "needs_timeline_events"
  | "needs_performance"
  | "needs_performance_image"
  | "needs_chart_data"
  | "needs_comparison_copy"
  | "needs_headline"
  | "needs_supporting_copy"
  | "needs_closing_copy";

export type SceneTemplateRecommendation = {
  templateId: SceneTemplateId;
  displayName: string;
  confidence: number;
  reason: string;
};

export type ExperienceScene = {
  sceneNumber: number;
  sceneType: SceneType;
  title: string;
  headline: string;
  supportingCopy: string;
  narrativePurpose: string;
  linkedFactIds: string[];
  linkedImageAssetIds: string[];
  linkedPerformanceId: string | null;
  estimatedDurationSec: number;
  priority: number;
  durationFlag: "ok" | "too_short" | "too_long" | null;
  /** Director 0.2 — recommended presentation template (final after 0.3 passes) */
  recommendedTemplate?: SceneTemplateRecommendation;
  /** Director 0.3 — initial template before downgrade / variety */
  preferredTemplate?: SceneTemplateRecommendation;
  templateDowngraded?: boolean;
  downgradeReason?: string | null;
  varietyAdjusted?: boolean;
  layoutReadiness?: LayoutReadinessStatus;
  layoutReadinessLabel?: string;
};

export type ExperiencePlan = {
  version: typeof DIRECTOR_PLAN_VERSION | "0.1" | "0.2";
  opening: string;
  closing: string;
  scenes: ExperienceScene[];
  estimatedRuntimeSec: number;
  targetRuntimeSec: { min: number; max: number };
  primaryPerformance: {
    performanceId: string;
    title: string;
    reason: string;
  };
  visualRhythm: VisualRhythm;
  presentationStyle: PresentationStyle;
  /** Director 0.2 */
  templateLibraryVersion?: string;
};

export type DirectorReadiness =
  | "ready_for_production"
  | "needs_editorial_revision"
  | "missing_assets"
  | "missing_performance";

export type TemplateUsageStat = {
  templateId: SceneTemplateId;
  displayName: string;
  count: number;
  pct: number;
};

export type DirectorReview = {
  readiness: DirectorReadiness;
  readinessLabel: string;
  sceneCount: number;
  estimatedRuntimeSec: number;
  storyCoveragePct: number;
  imageCoveragePct: number;
  factCoveragePct: number;
  recommendedPerformance: string;
  missingAssets: string[];
  warnings: string[];
  summary: string;
  /** Director 0.2 */
  templateCoveragePct?: number;
  layoutReadinessPct?: number;
  assetCoveragePct?: number;
  visualVarietyScore?: number;
  templateUsage?: TemplateUsageStat[];
  duplicateTemplateWarnings?: string[];
  varietyRecommendations?: string[];
  /** Director 0.3 */
  templateDiversityScore?: number;
  visualDiversityScore?: number;
  pacingDiversityScore?: number;
  templateDowngradesApplied?: number;
  varietyAdjustmentsApplied?: number;
  renderReadiness?: "ready_to_render" | "missing_optional_assets" | "missing_required_assets";
  renderReadinessLabel?: string;
  estimatedRenderingConfidence?: number;
  downgradeReport?: string[];
  varietyReport?: string[];
};

export type DirectorPackage = {
  version: typeof DIRECTOR_PLAN_VERSION | "0.1" | "0.2";
  rvtr: string;
  artist: string;
  title: string;
  generatedAt: string;
  handoffVersion: number;
  experiencePlan: ExperiencePlan;
  /** Sprint 3.31 — documentary story plan (stories → exhibits → pages → storyboard) */
  storyPlan?: import("./storytelling/types").DirectorStoryPlan;
  review: DirectorReview;
  /** Director 0.3 — canonical machine-readable render output */
  renderSpec?: DirectorRenderSpec;
};

export type { SceneTemplateId, SceneTemplateDefinition } from "./scene-template-library";
export { SCENE_TEMPLATE_LIBRARY, getSceneTemplate, allSceneTemplateIds } from "./scene-template-library";
