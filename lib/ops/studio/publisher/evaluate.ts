import "server-only";

import { access } from "fs/promises";
import { join } from "path";

import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { loadSongDnaPackage } from "@/lib/ops/studio/collector/song-dna-store";
import { loadDirectorPackage } from "@/lib/ops/studio/director/store";
import { loadEditorStory } from "@/lib/ops/studio/editor/store";
import { collectorVisualAssetsDir } from "@/lib/studio/package";
import { normalizeRvtr } from "@/lib/studio/status";

import { identifyStrings } from "@/lib/ops/studio/model-identity";

import { getPublisherRecord, savePublisherEvaluation } from "./store";
import { assessStructuralPublishReadiness } from "./publish-policy";
import { enrichEvaluationExperience } from "./experience/enrich";
import { runExperienceCritic } from "./experience/critic/run-critic";
import {
  loadVisualProduction,
  runVisualProducer,
  summarizeVisualProduction,
} from "./visual-producer";
import type {
  PublicationClass,
  PublisherAssetCheck,
  PublisherDimensionScore,
  PublisherEvaluation,
  PublisherRecord,
} from "./types";

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

async function hasVisualAssetFile(rvtr: string, name: string): Promise<boolean> {
  try {
    await access(join(collectorVisualAssetsDir(rvtr), name));
    return true;
  } catch {
    return false;
  }
}

function scoreStory(
  opening: string,
  closing: string,
  scenes: Array<{ headline: string; supportingCopy: string; title: string }>,
): PublisherDimensionScore {
  const notes: string[] = [];
  let score = 100;

  if (!opening.trim()) {
    score -= 25;
    notes.push("Missing clear opening beat");
  }
  if (!closing.trim()) {
    score -= 25;
    notes.push("Missing satisfying closing beat");
  }

  const weakSlides = scenes.filter(
    (s) => !s.headline.trim() || wordCount(s.headline) < 3,
  );
  if (weakSlides.length > 0) {
    score -= Math.min(30, weakSlides.length * 8);
    notes.push(`${weakSlides.length} slide(s) lack a strong headline`);
  }

  const duplicateTitles = new Set<string>();
  const seenTitles = new Set<string>();
  for (const s of scenes) {
    const key = s.title.trim().toLowerCase();
    if (key && seenTitles.has(key)) duplicateTitles.add(key);
    seenTitles.add(key);
  }
  if (duplicateTitles.size > 0) {
    score -= 10;
    notes.push("Repeated slide titles reduce narrative arc");
  }

  if (notes.length === 0) notes.push("Clear opening, closing, and slide headlines");

  return { id: "story", label: "Story", score: clampScore(score), notes: identifyStrings("story-note", notes) };
}

function scoreVisualVariety(
  director: NonNullable<Awaited<ReturnType<typeof loadDirectorPackage>>>,
): PublisherDimensionScore {
  const notes: string[] = [];
  let score = director.review.visualVarietyScore ?? director.review.visualDiversityScore ?? 75;

  const dupWarnings = director.review.duplicateTemplateWarnings ?? [];
  if (dupWarnings.length > 0) {
    score -= dupWarnings.length * 8;
    notes.push(...dupWarnings.slice(0, 3));
  }

  const scenes = director.experiencePlan.scenes;
  const templateIds = scenes.map((s) => s.recommendedTemplate?.templateId ?? s.sceneType);
  const uniqueTemplates = new Set(templateIds);
  if (uniqueTemplates.size < Math.min(4, scenes.length)) {
    score -= 12;
    notes.push("Limited layout variety across slides");
  }

  const imageIds = scenes.flatMap((s) => s.linkedImageAssetIds);
  const uniqueImages = new Set(imageIds);
  if (imageIds.length > 0 && uniqueImages.size / imageIds.length < 0.6) {
    score -= 15;
    notes.push("Repeated performance frames across slides");
  }

  const avgWords =
    scenes.length > 0
      ? scenes.reduce((n, s) => n + wordCount(s.headline) + wordCount(s.supportingCopy), 0) /
        scenes.length
      : 0;
  if (avgWords > 55) {
    score -= 10;
    notes.push("Excessive text density on slides");
  }

  if (notes.length === 0) notes.push("Good visual rhythm and layout variety");

  return {
    id: "visualVariety",
    label: "Visual Variety",
    score: clampScore(score),
    notes: identifyStrings("visual-note", notes),
  };
}

async function scoreAssetCoverage(
  rvtr: string,
  director: NonNullable<Awaited<ReturnType<typeof loadDirectorPackage>>>,
  collector: Awaited<ReturnType<typeof loadCollectorPackage>>,
  songDna: Awaited<ReturnType<typeof loadSongDnaPackage>>,
): Promise<{ dimension: PublisherDimensionScore; checks: PublisherAssetCheck[]; optionalGaps: string[] }> {
  const notes: string[] = [];
  const optionalGaps: string[] = [];
  let score = 100;

  const coverPresent = Boolean(collector?.visualAssets.coverUrl);
  const heroFrame = await hasVisualAssetFile(rvtr, "hero.jpg");
  const perfFrame = await hasVisualAssetFile(rvtr, "performance.jpg");
  const hasChartScene = director.experiencePlan.scenes.some(
    (s) => s.sceneType === "chart" || s.recommendedTemplate?.templateId === "chart",
  );
  const chartDataPresent =
    (collector?.charts.peakHot100 != null && collector.charts.peakHot100 > 0) || hasChartScene;
  const songDnaPresent = Boolean(songDna);
  const derivedArt = await hasVisualAssetFile(rvtr, "alternate.jpg");

  const checks: PublisherAssetCheck[] = [
    { id: "cover", label: "Cover artwork", present: coverPresent, required: true },
    { id: "performance", label: "Performance frames", present: heroFrame || perfFrame, required: true },
    { id: "chart", label: "Chart journey", present: chartDataPresent, required: false },
    { id: "song_dna", label: "Song DNA artwork", present: songDnaPresent, required: false },
    { id: "derived", label: "Derived artwork", present: derivedArt, required: false },
  ];

  for (const check of checks) {
    if (!check.present) {
      if (check.required) {
        score -= 18;
        notes.push(`Missing required: ${check.label}`);
      } else {
        optionalGaps.push(`Optional gap: ${check.label}`);
        score -= 4;
      }
    }
  }

  const missing = director.review.missingAssets ?? [];
  const requiredMissing = missing.filter((m) => !m.toLowerCase().includes("optional"));
  if (requiredMissing.length > 0) {
    score -= requiredMissing.length * 10;
    notes.push(...requiredMissing.slice(0, 2));
  }
  for (const m of missing.filter((x) => x.toLowerCase().includes("optional"))) {
    optionalGaps.push(m);
  }

  if (notes.length === 0 && optionalGaps.length === 0) {
    notes.push("Asset manifest complete");
  }

  return {
    dimension: {
      id: "assetCoverage",
      label: "Asset Coverage",
      score: clampScore(score),
      notes: identifyStrings(
        "asset-note",
        notes.length ? notes : ["Required assets present"],
      ),
    },
    checks,
    optionalGaps,
  };
}

function scoreHistoricalQuality(
  collector: Awaited<ReturnType<typeof loadCollectorPackage>>,
  director: NonNullable<Awaited<ReturnType<typeof loadDirectorPackage>>>,
): PublisherDimensionScore {
  const notes: string[] = [];
  let score = 88;

  const hasChart = collector?.charts.peakHot100 != null;
  const hasChartScene = director.experiencePlan.scenes.some((s) => s.sceneType === "chart");
  if (hasChart && !hasChartScene) {
    score -= 12;
    notes.push("Chart data available but no chart journey slide");
  }

  const timelineScenes = director.experiencePlan.scenes.filter((s) => s.sceneType === "timeline");
  if (timelineScenes.length === 0 && (collector?.recording.notes.length ?? 0) > 2) {
    score -= 8;
    notes.push("Rich recording history but no timeline slide");
  }

  const years = new Set<number>();
  if (collector?.charts.peakHot100 != null) {
    const chartYear = collector.charts.summary?.match(/\b(19|20)\d{2}\b/);
    if (chartYear) years.add(Number(chartYear[0]));
  }
  for (const fact of collector?.candidateFacts.filter((f) => f.approvalStatus === "approved") ?? []) {
    const match = fact.text.match(/\b(19|20)\d{2}\b/);
    if (match) years.add(Number(match[0]));
  }
  if (years.size > 3) {
    score -= 5;
    notes.push("Multiple year references — verify date consistency");
  }

  if (director.review.factCoveragePct != null && director.review.factCoveragePct < 50) {
    score -= 10;
    notes.push("Low fact coverage in experience plan");
  }

  if (notes.length === 0) notes.push("Historical facts and chart context align");

  return {
    id: "historicalQuality",
    label: "Historical Quality",
    score: clampScore(score),
    notes: identifyStrings("historical-note", notes),
  };
}

function scoreExperienceQuality(
  director: NonNullable<Awaited<ReturnType<typeof loadDirectorPackage>>>,
): PublisherDimensionScore {
  const notes: string[] = [];
  const review = director.review;
  let score =
    ((review.estimatedRenderingConfidence ?? 0.75) * 40 +
      (review.imageCoveragePct ?? 70) * 0.25 +
      (review.pacingDiversityScore ?? review.visualDiversityScore ?? 70) * 0.35);

  if ((review.sceneCount ?? 0) < 6) {
    score -= 10;
    notes.push("Short experience — limited swipe pacing");
  } else if ((review.sceneCount ?? 0) >= 14) {
    score += 4;
    notes.push("Extended scene count supports deep exploration");
  }

  if ((review.imageCoveragePct ?? 0) < 60) {
    notes.push("Visual coverage below editorial target");
  } else {
    notes.push("Strong visual pacing for patron swipes");
  }

  return {
    id: "experienceQuality",
    label: "Experience Quality",
    score: clampScore(score),
    notes: identifyStrings("experience-note", notes),
  };
}

function scoreVisualProduction(
  summary: ReturnType<typeof summarizeVisualProduction>,
): PublisherDimensionScore {
  const notes: string[] = [];
  if (!summary) {
    return {
      id: "visualProduction",
      label: "Visual Production",
      score: 50,
      notes: identifyStrings("vp-note", ["Visual production plan not generated"]),
    };
  }

  let score = summary.productionScore;
  if (summary.passed) notes.push("Visual Producer review passed");
  else notes.push("Visual Producer flagged production issues");

  if (summary.layoutTypes.length >= 5) {
    notes.push(`${summary.layoutTypes.length} distinct layout types — strong variety`);
  }
  if (summary.warningCount > 0) {
    score -= Math.min(20, summary.warningCount * 4);
    notes.push(...summary.topWarnings.slice(0, 2));
  }

  return {
    id: "visualProduction",
    label: "Visual Production",
    score: clampScore(score),
    notes: identifyStrings("vp-note", notes),
  };
}

function classifyPublication(
  qualityScore: number,
  dimensions: PublisherDimensionScore[],
  director: NonNullable<Awaited<ReturnType<typeof loadDirectorPackage>>>,
  blockingIssues: string[],
  coachingIssues: string[],
  emotionScore?: number,
): { publicationClass: PublicationClass; why: string } {
  if (blockingIssues.length > 0) {
    return {
      publicationClass: "blocked",
      why: blockingIssues[0] ?? "Blocking issues prevent publication",
    };
  }

  const sceneCount = director.experiencePlan.scenes.length;
  const extendedEligible =
    sceneCount >= 14 ||
    (director.review.templateUsage?.length ?? 0) >= 6 ||
    director.review.renderReadiness === "missing_optional_assets";

  const showcaseEligible =
    qualityScore >= 88 &&
    (emotionScore ?? 0) >= 78 &&
    dimensions.every((d) => d.score >= 78) &&
    sceneCount >= 10 &&
    (director.review.estimatedRenderingConfidence ?? 0) >= 0.85;

  if (showcaseEligible) {
    return {
      publicationClass: "showcase",
      why: "Exceptional editorial scores across story, visuals, and pacing",
    };
  }

  if (extendedEligible && qualityScore >= 75) {
    return {
      publicationClass: "extended",
      why: "Additional scenes and depth — Extended Experience eligible",
    };
  }

  if (coachingIssues.length > 0 || qualityScore < 80) {
    return {
      publicationClass: "needs_coaching",
      why:
        coachingIssues[0] ??
        (qualityScore < 70
          ? "Quality below target — coaching advisory (does not block publish)"
          : "Editorial polish recommended — does not block publish"),
    };
  }

  return {
    publicationClass: "ready",
    why: "Meets Retroverse editorial standards for standard release",
  };
}

export async function evaluatePublisherPackage(rvtr: string): Promise<PublisherRecord | null> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) return null;

  const [director, collector, editor, songDna] = await Promise.all([
    loadDirectorPackage(normalized),
    loadCollectorPackage(normalized),
    loadEditorStory(normalized),
    loadSongDnaPackage(normalized),
  ]);

  if (!director?.renderSpec) return null;

  let visualProductionPlan = await loadVisualProduction(normalized);
  if (!visualProductionPlan) {
    visualProductionPlan = await runVisualProducer(normalized);
  }
  const visualProductionSummary = summarizeVisualProduction(visualProductionPlan);

  const structural = await assessStructuralPublishReadiness(normalized);
  const blockingIssues: string[] = [...structural.fatals];
  const coachingIssues: string[] = [];

  const plan = director.experiencePlan;
  const storyDim = scoreStory(plan.opening, plan.closing, plan.scenes);
  const visualDim = scoreVisualVariety(director);
  const assetResult = await scoreAssetCoverage(normalized, director, collector, songDna);
  const historicalDim = scoreHistoricalQuality(collector, director);
  const experienceDim = scoreExperienceQuality(director);
  const visualProductionDim = scoreVisualProduction(visualProductionSummary);

  const dimensions = [
    storyDim,
    visualDim,
    assetResult.dimension,
    historicalDim,
    experienceDim,
    visualProductionDim,
  ];
  const qualityScore = clampScore(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length,
  );

  if (storyDim.score < 60) coachingIssues.push("Story arc needs editorial attention");
  if (visualDim.score < 58) coachingIssues.push("Visual variety below editorial standard");
  if (assetResult.dimension.score < 55) coachingIssues.push("Required asset gaps remain");
  if (historicalDim.score < 55) coachingIssues.push("Historical narrative needs refinement");
  if (experienceDim.score < 58) coachingIssues.push("Patron swipe experience needs polish");
  if (visualProductionDim.score < 60) coachingIssues.push("Visual production needs polish before showcase release");
  if (visualProductionSummary && !visualProductionSummary.passed) {
    coachingIssues.push("Visual Producer review — address composition or media gaps");
  }

  if ((editor?.story.fullStory.trim().length ?? 0) < 150) {
    coachingIssues.push("Editor story underdeveloped");
  }

  const existingRecord = await getPublisherRecord(normalized);
  const experience = await enrichEvaluationExperience({
    rvtr: normalized,
    existingScorecard: existingRecord?.evaluation?.experienceScorecard ?? null,
  });

  const experienceCritic = await runExperienceCritic(normalized);

  const { publicationClass, why } = classifyPublication(
    qualityScore,
    dimensions,
    director,
    blockingIssues,
    coachingIssues,
    experience.experienceScorecard.emotionScore,
  );

  const evaluation: PublisherEvaluation = {
    evaluatedAt: new Date().toISOString(),
    qualityScore,
    publicationClass,
    why,
    dimensions,
    assetChecks: assetResult.checks,
    blockingIssues,
    coachingIssues,
    optionalGaps: assetResult.optionalGaps,
    experienceScorecard: experience.experienceScorecard,
    fingerprints: experience.fingerprints,
    uniquenessScore: experience.uniquenessScore,
    similarPackages: experience.similarPackages,
    experienceCritic: experienceCritic ?? undefined,
    visualProduction: visualProductionSummary ?? undefined,
    visualProductionArtifact: Boolean(visualProductionPlan),
  };

  return savePublisherEvaluation({
    rvtr: normalized,
    artist: director.artist ?? collector?.artist ?? "Unknown",
    title: director.title ?? collector?.title ?? normalized,
    coverUrl: collector?.visualAssets.coverUrl ?? null,
    evaluation,
  });
}
