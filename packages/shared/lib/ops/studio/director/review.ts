/**
 * Director 0.3 — extended review with template coverage, variety, render readiness.
 */

import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";

import { validateManifest, buildAssetManifest } from "./asset-manifest";
import { exhibitIdFromScene } from "./exhibit-plan";
import type { SceneTemplateId } from "./scene-template-library";
import { getSceneTemplate } from "./scene-template-library";
import type { VarietyAdjustment } from "./variety-engine";
import { computeDiversityScores } from "./variety-engine";

import type {
  DirectorReadiness,
  DirectorReview,
  ExperiencePlan,
  TemplateUsageStat,
} from "./types";

const READINESS_LABELS: Record<DirectorReadiness, string> = {
  ready_for_production: "Ready for Production",
  needs_editorial_revision: "Needs Editorial Revision",
  missing_assets: "Missing Assets",
  missing_performance: "Missing Performance",
};

function templateUsageStats(plan: ExperiencePlan): TemplateUsageStat[] {
  const counts = new Map<SceneTemplateId, number>();
  for (const scene of plan.scenes) {
    const id = scene.recommendedTemplate?.templateId ?? "story";
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const total = plan.scenes.length || 1;
  return [...counts.entries()]
    .map(([templateId, count]) => ({
      templateId,
      displayName: getSceneTemplate(templateId).displayName,
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

function detectConsecutiveDuplicateTemplates(plan: ExperiencePlan): string[] {
  const warnings: string[] = [];
  let run = 1;
  let prev: SceneTemplateId | null = null;

  for (const scene of plan.scenes) {
    const id = scene.recommendedTemplate?.templateId ?? "story";
    if (id === prev) {
      run += 1;
    } else {
      if (run >= 3 && prev) {
        warnings.push(
          `${run} consecutive "${getSceneTemplate(prev).displayName}" scenes (scenes ${scene.sceneNumber - run}–${scene.sceneNumber - 1}) — recommend variation`,
        );
      }
      run = 1;
      prev = id;
    }
  }

  if (run >= 3 && prev) {
    warnings.push(
      `${run} consecutive "${getSceneTemplate(prev).displayName}" scenes at end — recommend variation`,
    );
  }

  return warnings;
}

function buildVarietyRecommendations(plan: ExperiencePlan, duplicateWarnings: string[]): string[] {
  const recs: string[] = [];
  const usage = templateUsageStats(plan);
  const dominant = usage[0];

  if (dominant && dominant.pct >= 60 && plan.scenes.length >= 5) {
    recs.push(
      `"${dominant.displayName}" dominates (${dominant.pct}%) — consider Gallery, Quote, or Timeline for variety`,
    );
  }

  const usedIds = new Set(usage.map((u) => u.templateId));
  if (!usedIds.has("quote") && plan.scenes.length >= 6) {
    recs.push("No Quote template assigned — key moment may suit a pull-quote layout");
  }
  if (!usedIds.has("timeline") && plan.presentationStyle !== "countdown") {
    recs.push("Timeline template unused — chronological beats may benefit");
  }

  for (const w of duplicateWarnings) {
    recs.push(w.replace(" — recommend variation", " — swap middle beat to Quote or Gallery"));
  }

  return recs.slice(0, 4);
}

function computeVisualVarietyScore(plan: ExperiencePlan): number {
  if (plan.scenes.length === 0) return 0;
  const unique = new Set(
    plan.scenes.map((s) => s.recommendedTemplate?.templateId ?? "story"),
  ).size;
  return Math.round((unique / plan.scenes.length) * 100);
}

export function buildDirectorReview(
  handoff: DirectorEditorialPackage,
  plan: ExperiencePlan,
  renderOptions?: {
    downgradesApplied: number;
    varietyAdjustments: VarietyAdjustment[];
  },
): DirectorReview {
  const missingAssets: string[] = [];
  const warnings: string[] = [];

  const isMuseumPlan = plan.scenes.some((s) => exhibitIdFromScene(s) != null);

  const scenesWithCopy = isMuseumPlan
    ? plan.scenes.filter((s) => exhibitIdFromScene(s) != null)
    : plan.scenes.filter((s) => s.supportingCopy.trim().length >= 30);
  const storyCoveragePct =
    plan.scenes.length > 0 ? Math.round((scenesWithCopy.length / plan.scenes.length) * 100) : 0;

  const uniqueImageIds = new Set(plan.scenes.flatMap((s) => s.linkedImageAssetIds));
  const imageDiversityPct =
    plan.scenes.length > 0
      ? Math.round((uniqueImageIds.size / Math.max(1, plan.scenes.filter((s) => s.linkedImageAssetIds.length).length)) * 100)
      : 0;

  const scenesWithImages = plan.scenes.filter((s) => s.linkedImageAssetIds.length > 0);
  const imageCoveragePct =
    plan.scenes.length > 0
      ? Math.round((scenesWithImages.length / plan.scenes.length) * 100)
      : 0;

  const allFactIds = new Set(handoff.approvedFacts.map((f) => f.id));
  const linkedFacts = new Set(plan.scenes.flatMap((s) => s.linkedFactIds));
  const factCoveragePct =
    allFactIds.size > 0
      ? Math.round(([...linkedFacts].filter((id) => allFactIds.has(id)).length / allFactIds.size) * 100)
      : handoff.approvedFacts.length === 0
        ? 0
        : 100;

  const scenesWithTemplate = plan.scenes.filter((s) => s.recommendedTemplate?.templateId);
  const templateCoveragePct =
    plan.scenes.length > 0
      ? Math.round((scenesWithTemplate.length / plan.scenes.length) * 100)
      : 0;

  const readyScenes = plan.scenes.filter((s) => s.layoutReadiness === "ready");
  const layoutReadinessPct =
    plan.scenes.length > 0 ? Math.round((readyScenes.length / plan.scenes.length) * 100) : 0;

  const assetCoveragePct = layoutReadinessPct;

  for (const scene of plan.scenes) {
    if (scene.layoutReadiness && scene.layoutReadiness !== "ready") {
      missingAssets.push(`Scene ${scene.sceneNumber} (${scene.title}): ${scene.layoutReadinessLabel}`);
    }
  }

  if (handoff.approvedImages.length === 0) {
    missingAssets.push("No approved images in handoff");
  }
  if (handoff.approvedFacts.length === 0) {
    missingAssets.push("No approved facts in handoff");
  }
  if (!handoff.story.fullStory || handoff.story.fullStory.length < 80) {
    if (!isMuseumPlan) missingAssets.push("Story body is thin");
  }
  if (!handoff.narrativeBlueprint?.storyBeats.length) {
    if (!isMuseumPlan) missingAssets.push("Narrative blueprint has no story beats");
  }

  const hasPerformance =
    Boolean(plan.primaryPerformance.performanceId) ||
    Boolean(handoff.performance.id) ||
    handoff.performance.screenshots.length > 0;

  if (!hasPerformance) {
    missingAssets.push("No performance linked");
  }

  for (const scene of plan.scenes) {
    if (scene.durationFlag === "too_short") {
      warnings.push(`Scene ${scene.sceneNumber} (${scene.title}) may be too short (${scene.estimatedDurationSec}s)`);
    }
    if (scene.durationFlag === "too_long") {
      warnings.push(`Scene ${scene.sceneNumber} (${scene.title}) may be too long (${scene.estimatedDurationSec}s)`);
    }
  }

  if (plan.estimatedRuntimeSec < plan.targetRuntimeSec.min) {
    warnings.push(`Runtime ${plan.estimatedRuntimeSec}s is below ${plan.targetRuntimeSec.min}s target`);
  }
  if (plan.estimatedRuntimeSec > plan.targetRuntimeSec.max) {
    warnings.push(`Runtime ${plan.estimatedRuntimeSec}s exceeds ${plan.targetRuntimeSec.max}s target`);
  }

  const duplicateTemplateWarnings = detectConsecutiveDuplicateTemplates(plan);
  warnings.push(...duplicateTemplateWarnings);

  const varietyRecommendations = buildVarietyRecommendations(plan, duplicateTemplateWarnings);
  const templateUsage = templateUsageStats(plan);
  const visualVarietyScore = computeVisualVarietyScore(plan);

  let readiness: DirectorReadiness = "ready_for_production";

  if (!hasPerformance) {
    readiness = "missing_performance";
  } else if (
    missingAssets.some((a) => a.includes("image") || a.includes("blueprint")) ||
    layoutReadinessPct < 50
  ) {
    readiness = "missing_assets";
  } else if (
    !isMuseumPlan &&
    (storyCoveragePct < 60 ||
      handoff.story.hook.length < 30 ||
      plan.scenes.length < 4 ||
      layoutReadinessPct < 70)
  ) {
    readiness = "needs_editorial_revision";
  } else if (isMuseumPlan && (plan.scenes.length < 3 || layoutReadinessPct < 60)) {
    readiness = "needs_editorial_revision";
  }

  const perfLabel = plan.primaryPerformance.title || handoff.performance.title || "None";

  const diversity = computeDiversityScores(plan);
  const manifest = buildAssetManifest(handoff, plan);
  const { missingRequired, missingOptional } = validateManifest(manifest);

  const downgradeReport = plan.scenes
    .filter((s) => s.templateDowngraded)
    .map(
      (s) =>
        `Scene ${s.sceneNumber}: ${s.preferredTemplate?.displayName ?? "?"} → ${s.recommendedTemplate?.displayName ?? "?"} — ${s.downgradeReason ?? ""}`,
    );

  const varietyReport = (renderOptions?.varietyAdjustments ?? []).map(
    (a) => `Scene ${a.sceneNumber}: ${a.fromTemplate} → ${a.toTemplate} — ${a.reason}`,
  );

  let renderReadiness: DirectorReview["renderReadiness"] = "ready_to_render";
  let renderReadinessLabel = "Ready to Render";

  const hasMinimumRenderAssets =
    handoff.approvedImages.length > 0 &&
    handoff.approvedFacts.length > 0 &&
    plan.scenes.length >= 3 &&
    hasPerformance;

  if (!hasMinimumRenderAssets) {
    renderReadiness = "missing_required_assets";
    renderReadinessLabel = "Missing Required Assets";
  } else if (missingRequired.length > 0 || layoutReadinessPct < 100) {
    renderReadiness = "missing_optional_assets";
    renderReadinessLabel = "Ready with Optional Gaps";
  } else if (missingOptional.length > 0) {
    renderReadiness = "missing_optional_assets";
    renderReadinessLabel = "Ready with Optional Gaps";
  }

  const confidenceBase = layoutReadinessPct * 0.6 + diversity.templateDiversity * 0.2 + diversity.pacingDiversity * 0.2;
  const estimatedRenderingConfidence = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        confidenceBase -
          missingRequired.length * 12 -
          missingOptional.length * 3 -
          (renderOptions?.downgradesApplied ?? 0) * 2,
      ),
    ),
  );

  const summary = [
    isMuseumPlan
      ? `${plan.scenes.length} exhibits · ${plan.estimatedRuntimeSec}s · museum arc`
      : `${plan.scenes.length} scenes · ${plan.estimatedRuntimeSec}s · ${templateUsage.length} template types`,
    `Render ${renderReadinessLabel} · Confidence ${estimatedRenderingConfidence}%`,
    isMuseumPlan
      ? `Image diversity ${imageDiversityPct}% · Layout ready ${layoutReadinessPct}%`
      : `Template ${templateCoveragePct}% · Layout ready ${layoutReadinessPct}% · Diversity ${diversity.templateDiversity}%`,
    `${storyCoveragePct}% exhibit coverage · ${imageCoveragePct}% image · ${factCoveragePct}% fact coverage`,
    missingAssets.length > 0 ? `Gaps: ${missingAssets.length}` : "Core assets present",
  ].join(" · ");

  return {
    readiness,
    readinessLabel: READINESS_LABELS[readiness],
    sceneCount: plan.scenes.length,
    estimatedRuntimeSec: plan.estimatedRuntimeSec,
    storyCoveragePct,
    imageCoveragePct,
    factCoveragePct,
    recommendedPerformance: perfLabel,
    missingAssets,
    warnings,
    summary,
    templateCoveragePct,
    layoutReadinessPct,
    assetCoveragePct,
    visualVarietyScore: isMuseumPlan ? imageDiversityPct : visualVarietyScore,
    templateUsage,
    duplicateTemplateWarnings,
    varietyRecommendations: isMuseumPlan
      ? [`Exhibit image diversity ${imageDiversityPct}% — Publisher scoring target`]
      : varietyRecommendations,
    templateDiversityScore: diversity.templateDiversity,
    visualDiversityScore: diversity.visualDiversity,
    pacingDiversityScore: diversity.pacingDiversity,
    templateDowngradesApplied: renderOptions?.downgradesApplied ?? 0,
    varietyAdjustmentsApplied: renderOptions?.varietyAdjustments.length ?? 0,
    renderReadiness,
    renderReadinessLabel,
    estimatedRenderingConfidence,
    downgradeReport,
    varietyReport,
  };
}
