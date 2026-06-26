/**
 * Director 0.3 — build director-render-spec.json from finalized plan.
 */

import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";

import {
  buildAssetManifest,
  sceneAssetsForRender,
  validateManifest,
} from "./asset-manifest";
import {
  DIRECTOR_RENDER_SPEC_VERSION,
  STANDARD_FALLBACK_RULES,
  type DirectorRenderSpec,
  type GlobalPresentationSettings,
  type RenderReadiness,
  type RenderSpecScene,
  type SceneImportance,
} from "./render-spec-types";
import type { SceneTemplateId } from "./scene-template-library";
import { transitionInHint, transitionOutHint } from "./transition-hints";
import { readinessIsBlocking } from "./template-downgrade";

import type { DirectorReview, ExperiencePlan, ExperienceScene } from "./types";

function globalPresentation(plan: ExperiencePlan): GlobalPresentationSettings {
  const style = plan.presentationStyle;
  const bgByStyle: Record<string, string> = {
    documentary: "warm_paper_documentary",
    concert: "stage_dark_spotlight",
    magazine_feature: "editorial_cream_masthead",
    television_retrospective: "broadcast_scanlines_soft",
    countdown: "chart_board_neon",
    storybook: "illustrated_page_turn",
  };
  const colorByStyle: Record<string, string> = {
    documentary: "retroverse_teal_cream",
    concert: "stage_amber_black",
    magazine_feature: "editorial_orange_teal",
    television_retrospective: "broadcast_blue_gray",
    countdown: "countdown_red_gold",
    storybook: "storybook_warm_pastel",
  };

  return {
    backgroundTreatment: bgByStyle[style] ?? "retroverse_cream_default",
    typographyProfile: style === "magazine_feature" ? "editorial_bold" : "retroverse_display",
    colorTheme: colorByStyle[style] ?? "retroverse_teal_cream",
    pacingProfile: plan.visualRhythm,
    imageTreatment: style === "concert" ? "full_bleed_performance" : "poster_card_framed",
    orientation: "both",
  };
}

function sceneImportance(scene: ExperienceScene): SceneImportance {
  if (scene.title === "Opening" || scene.title === "Closing") return "high";
  if (scene.priority >= 90) return "high";
  if (scene.priority >= 70) return "medium";
  return "low";
}

function renderingConfidence(
  plan: ExperiencePlan,
  missingRequired: string[],
  missingOptional: string[],
  downgrades: number,
): number {
  const readyScenes = plan.scenes.filter((s) => s.layoutReadiness === "ready").length;
  const layoutPct = plan.scenes.length ? (readyScenes / plan.scenes.length) * 100 : 0;
  let score = layoutPct * 0.5;
  score += Math.min(30, plan.scenes.length * 2);
  score -= missingRequired.length * 15;
  score -= missingOptional.length * 3;
  score -= downgrades * 2;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function renderReadinessFrom(
  missingRequired: string[],
  missingOptional: string[],
  plan: ExperiencePlan,
): { status: RenderReadiness; label: string } {
  const blocking = plan.scenes.some((s) => s.layoutReadiness && readinessIsBlocking(s.layoutReadiness));

  if (missingRequired.length > 0 || blocking) {
    return {
      status: "missing_required_assets",
      label: "Missing Required Assets — renderer should not publish",
    };
  }
  if (missingOptional.length > 0) {
    return {
      status: "missing_optional_assets",
      label: "Ready with Optional Gaps — renderer may proceed with fallbacks",
    };
  }
  return {
    status: "ready_to_render",
    label: "Ready to Render — all required assets present",
  };
}

export function buildRenderSpec(
  handoff: DirectorEditorialPackage,
  plan: ExperiencePlan,
  review: DirectorReview,
  options: {
    downgradesApplied: number;
    varietyAdjustmentsApplied: number;
  },
): DirectorRenderSpec {
  const assetManifest = buildAssetManifest(handoff, plan);
  const { missingRequired, missingOptional } = validateManifest(assetManifest);
  const { status, label } = renderReadinessFrom(missingRequired, missingOptional, plan);

  const sceneTimeline: RenderSpecScene[] = plan.scenes.map((scene, idx) => {
    const prev = idx > 0 ? plan.scenes[idx - 1] : null;
    const next = idx < plan.scenes.length - 1 ? plan.scenes[idx + 1] : null;
    const templateId = scene.recommendedTemplate?.templateId ?? "story";
    const preferredId =
      scene.preferredTemplate?.templateId ?? scene.recommendedTemplate?.templateId ?? "story";
    const prevTemplate = prev?.recommendedTemplate?.templateId ?? null;
    const nextTemplate = next?.recommendedTemplate?.templateId ?? null;

    return {
      sceneNumber: scene.sceneNumber,
      templateId,
      preferredTemplateId: preferredId,
      templateDowngraded: scene.templateDowngraded ?? false,
      varietyAdjusted: scene.varietyAdjusted ?? false,
      downgradeReason: scene.downgradeReason ?? null,
      durationSec: scene.estimatedDurationSec,
      headline: scene.headline,
      supportingCopy: scene.supportingCopy,
      narrativePurpose: scene.narrativePurpose,
      importance: sceneImportance(scene),
      assets: sceneAssetsForRender(scene, handoff),
      transitionIn: transitionInHint(scene, prevTemplate),
      transitionOut: transitionOutHint(scene, nextTemplate),
      layoutReadiness: scene.layoutReadinessLabel ?? "Unknown",
      selfContained: true as const,
    };
  });

  const confidence = renderingConfidence(
    plan,
    missingRequired,
    missingOptional,
    options.downgradesApplied,
  );

  return {
    version: DIRECTOR_RENDER_SPEC_VERSION,
    metadata: {
      rvtr: handoff.rvtr,
      artist: handoff.artist,
      title: handoff.title,
      version: DIRECTOR_RENDER_SPEC_VERSION,
      generatedAt: new Date().toISOString(),
      estimatedRuntimeSec: plan.estimatedRuntimeSec,
      presentationStyle: plan.presentationStyle,
      primaryPerformance: {
        performanceId: plan.primaryPerformance.performanceId,
        title: plan.primaryPerformance.title,
      },
      patronValue: handoff.editorialQuality?.patronValue ?? null,
      storyQuality: handoff.editorialQuality?.storyQuality ?? null,
    },
    globalPresentation: globalPresentation(plan),
    sceneTimeline,
    assetManifest,
    renderingInstructions: {
      sceneOrder: sceneTimeline.map((s) => s.sceneNumber),
      autoAdvance: true,
      loopPresentation: false,
      respectDurationHints: true,
      notes: [
        "Execute scenes in sceneOrder — no creative decisions required",
        "Transition hints are labels only; renderer chooses motion",
        "Template downgrades are final; do not revert to preferredTemplateId",
        review.summary,
      ],
    },
    fallbackRules: STANDARD_FALLBACK_RULES,
    renderReadiness: status,
    renderReadinessLabel: label,
    templateDowngradesApplied: options.downgradesApplied,
    varietyAdjustmentsApplied: options.varietyAdjustmentsApplied,
    estimatedRenderingConfidence: confidence,
  };
}

export function templateIdOfScene(scene: ExperienceScene): SceneTemplateId {
  return scene.recommendedTemplate?.templateId ?? "story";
}
