import "server-only";

import type { DirectorPackage } from "@/lib/ops/studio/director/types";
import { exhibitIdFromScene } from "@/lib/ops/studio/director/exhibit-plan";

import type {
  ExperienceScorecard,
  ExperienceScorecardDimension,
  ExperienceScorecardDimensionId,
} from "./types";
import { SCORECARD_LABELS } from "./types";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function dim(
  id: ExperienceScorecardDimensionId,
  autoScore: number,
  operatorScore: number | null = null,
): ExperienceScorecardDimension {
  const effectiveScore = operatorScore != null ? clamp(operatorScore) : clamp(autoScore);
  return {
    id,
    label: SCORECARD_LABELS[id],
    autoScore: clamp(autoScore),
    operatorScore,
    effectiveScore,
  };
}

/** Heuristic emotion-first scorecard — editorial judgments filled by operator later. */
export function buildAutoExperienceScorecard(
  director: DirectorPackage,
  existing?: ExperienceScorecard | null,
): ExperienceScorecard {
  const scenes = director.experiencePlan.scenes;
  const review = director.review;
  const opening = director.experiencePlan.opening.trim();
  const closing = director.experiencePlan.closing.trim();

  const coverScene = scenes.find((s) => exhibitIdFromScene(s) === "cover") ?? scenes[0];
  const iconicScene = scenes.find((s) => exhibitIdFromScene(s) === "iconic_moment");
  const performanceScene = scenes.find((s) => exhibitIdFromScene(s) === "performance") ?? scenes.at(-1);

  const imageIds = scenes.flatMap((s) => s.linkedImageAssetIds);
  const uniqueImages = new Set(imageIds);
  const imageReuseRatio = imageIds.length > 0 ? uniqueImages.size / imageIds.length : 1;

  const templateIds = scenes.map((s) => s.recommendedTemplate?.templateId ?? s.sceneType);
  const uniqueTemplates = new Set(templateIds);

  let openingImpact = 72;
  if (coverScene?.linkedImageAssetIds.length) openingImpact += 12;
  if (opening.length > 20) openingImpact += 8;
  if (coverScene?.headline.trim()) openingImpact += 6;

  let visualSurprise = review.visualVarietyScore ?? review.visualDiversityScore ?? 70;
  if (uniqueTemplates.size >= 4) visualSurprise += 8;
  if (imageReuseRatio < 0.55) visualSurprise -= 15;

  let emotionalArc = 68;
  if (opening && closing) emotionalArc += 12;
  if (iconicScene?.headline.trim()) emotionalArc += 10;
  if ((review.storyCoveragePct ?? 0) >= 60) emotionalArc += 8;

  let memorability = 65;
  if (iconicScene?.linkedImageAssetIds.length) memorability += 15;
  if (iconicScene?.headline && iconicScene.headline.length <= 48) memorability += 10;
  if ((review.estimatedRenderingConfidence ?? 0) >= 0.85) memorability += 8;

  let rhythm = review.pacingDiversityScore ?? review.visualDiversityScore ?? 70;
  if (scenes.length >= 8 && scenes.length <= 14) rhythm += 6;
  if (scenes.length < 6) rhythm -= 12;

  let endingStrength = 70;
  if (performanceScene?.linkedImageAssetIds.length) endingStrength += 12;
  if (closing.length > 15) endingStrength += 8;
  if (exhibitIdFromScene(performanceScene ?? scenes.at(-1)!) === "performance") endingStrength += 6;

  let watchTwice = Math.round(
    (openingImpact + visualSurprise + emotionalArc + memorability + rhythm + endingStrength) / 6,
  );
  if (imageReuseRatio < 0.6) watchTwice -= 10;
  if (uniqueTemplates.size >= 5) watchTwice += 6;

  const operatorById = new Map(
    (existing?.dimensions ?? []).map((d) => [d.id, d.operatorScore] as const),
  );

  const dimensions: ExperienceScorecardDimension[] = [
    dim("openingImpact", openingImpact, operatorById.get("openingImpact") ?? null),
    dim("visualSurprise", visualSurprise, operatorById.get("visualSurprise") ?? null),
    dim("emotionalArc", emotionalArc, operatorById.get("emotionalArc") ?? null),
    dim("memorability", memorability, operatorById.get("memorability") ?? null),
    dim("rhythm", rhythm, operatorById.get("rhythm") ?? null),
    dim("endingStrength", endingStrength, operatorById.get("endingStrength") ?? null),
    dim("watchTwice", watchTwice, operatorById.get("watchTwice") ?? null),
  ];

  const emotionScore = clamp(
    dimensions.reduce((sum, d) => sum + d.effectiveScore, 0) / dimensions.length,
  );

  return {
    computedAt: new Date().toISOString(),
    operatorReviewedAt: existing?.operatorReviewedAt ?? null,
    dimensions,
    emotionScore,
    operatorNote: existing?.operatorNote ?? null,
  };
}

export function applyOperatorScorecard(
  existing: ExperienceScorecard,
  input: {
    scores: Partial<Record<ExperienceScorecardDimensionId, number>>;
    note?: string | null;
  },
): ExperienceScorecard {
  const dimensions = existing.dimensions.map((d) => {
    const operatorScore = input.scores[d.id] ?? d.operatorScore;
    const effectiveScore =
      operatorScore != null ? clamp(operatorScore) : d.autoScore;
    return { ...d, operatorScore, effectiveScore };
  });

  const emotionScore = clamp(
    dimensions.reduce((sum, d) => sum + d.effectiveScore, 0) / dimensions.length,
  );

  return {
    ...existing,
    dimensions,
    emotionScore,
    operatorReviewedAt: new Date().toISOString(),
    operatorNote: input.note?.trim() || existing.operatorNote,
  };
}
