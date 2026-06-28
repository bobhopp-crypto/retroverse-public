/**
 * Director 2.0 — five fixed museum exhibits (not encyclopedic slides).
 */

import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";

import type { CoachingRuleHints } from "./coaching/types";
import { sortBucketsWithHints } from "./coaching/rules";
import type { ExperiencePlan, ExperienceScene, PresentationStyle, VisualRhythm } from "./types";

export const EXHIBIT_IDS = [
  "cover",
  "chart_journey",
  "iconic_moment",
  "song_dna",
  "performance",
] as const;

export type ExhibitId = (typeof EXHIBIT_IDS)[number];

const EXHIBIT_LABELS: Record<ExhibitId, string> = {
  cover: "Cover",
  chart_journey: "Chart Journey",
  iconic_moment: "Iconic Moment",
  song_dna: "Song DNA",
  performance: "Performance",
};

const EXHIBIT_DURATIONS: Record<ExhibitId, number> = {
  cover: 6,
  chart_journey: 9,
  iconic_moment: 8,
  song_dna: 7,
  performance: 8,
};

const IMAGE_CATEGORY_HINTS: Array<{ pattern: RegExp; bucket: string }> = [
  { pattern: /hero|wide|establish|full/i, bucket: "wide" },
  { pattern: /close|face|portrait|intimate/i, bucket: "close-up" },
  { pattern: /performance|stage|live|concert/i, bucket: "performance" },
  { pattern: /alternate|angle|b[- ]?roll|cutaway/i, bucket: "alternate" },
  { pattern: /crowd|audience|venue|location/i, bucket: "crowd" },
];

function bucketForImage(assetId: string, caption: string): string {
  const hay = `${assetId} ${caption}`;
  for (const hint of IMAGE_CATEGORY_HINTS) {
    if (hint.pattern.test(hay)) return hint.bucket;
  }
  return "unknown";
}

export type ExhibitFrameAssignment = {
  exhibitId: ExhibitId;
  imageAssetIds: string[];
  headline: string;
};

/** Maximize visual diversity — prefer category spread over image quality. */
export function assignExhibitFrames(
  handoff: DirectorEditorialPackage,
  hints?: CoachingRuleHints | null,
): ExhibitFrameAssignment[] {
  const images = handoff.approvedImages;
  const byBucket = new Map<string, string[]>();

  for (const img of images) {
    const bucket = bucketForImage(img.assetId, img.caption);
    const list = byBucket.get(bucket) ?? [];
    list.push(img.assetId);
    byBucket.set(bucket, list);
  }

  const used = new Set<string>();
  const take = (bucket: string): string | null => {
    const ids = byBucket.get(bucket) ?? [];
    const id = ids.find((x) => !used.has(x)) ?? null;
    if (id) used.add(id);
    return id;
  };
  const takeAny = (buckets: string[]): string | null => {
    for (const bucket of buckets) {
      const id = take(bucket);
      if (id) return id;
    }
    const fallback = images.find((img) => !used.has(img.assetId))?.assetId ?? null;
    if (fallback) used.add(fallback);
    return fallback;
  };

  const iconicId = takeAny(
    sortBucketsWithHints(["close-up", "performance", "alternate", "wide", "crowd", "unknown"], hints),
  );
  const chartBgId = takeAny(
    sortBucketsWithHints(["wide", "performance", "alternate", "crowd", "close-up", "unknown"], hints),
  );
  const performanceId = takeAny(
    sortBucketsWithHints(["performance", "wide", "alternate", "close-up", "crowd", "unknown"], hints),
  );

  const quote = handoff.approvedQuotes[0]?.text?.trim() ?? "";
  const lyricFragment =
    quote.length > 0 && quote.length <= 48 ? quote : handoff.story.headline.split(/[:—–-]/).pop()?.trim() ?? "";

  return [
    { exhibitId: "cover", imageAssetIds: images[0] ? [images[0].assetId] : [], headline: handoff.title },
    {
      exhibitId: "chart_journey",
      imageAssetIds: chartBgId ? [chartBgId] : [],
      headline: "",
    },
    {
      exhibitId: "iconic_moment",
      imageAssetIds: iconicId ? [iconicId] : [],
      headline: lyricFragment.slice(0, 48),
    },
    { exhibitId: "song_dna", imageAssetIds: [], headline: "" },
    {
      exhibitId: "performance",
      imageAssetIds: performanceId ? [performanceId] : [],
      headline: "",
    },
  ];
}

function exhibitSceneType(id: ExhibitId): ExperienceScene["sceneType"] {
  switch (id) {
    case "cover":
      return "hero";
    case "chart_journey":
      return "chart";
    case "iconic_moment":
      return "image";
    case "song_dna":
      return "image";
    case "performance":
      return "performance";
  }
}

function exhibitTemplateId(id: ExhibitId): ExperienceScene["recommendedTemplate"] {
  const map: Record<ExhibitId, NonNullable<ExperienceScene["recommendedTemplate"]>["templateId"]> = {
    cover: "hero",
    chart_journey: "chart",
    iconic_moment: "gallery",
    song_dna: "gallery",
    performance: "performance",
  };
  const templateId = map[id];
  return {
    templateId,
    displayName: EXHIBIT_LABELS[id],
    confidence: 95,
    reason: `Museum exhibit — ${EXHIBIT_LABELS[id]}`,
  };
}

function buildExtendedExhibits(handoff: DirectorEditorialPackage, startNumber: number): ExperienceScene[] {
  const moments = handoff.narrativeBlueprint.keyMoments.slice(0, 4);
  const images = handoff.approvedImages;
  const used = new Set<string>();

  return moments.map((moment, index) => {
    const imageId =
      moment.relatedImageAssetIds.find((id) => !used.has(id)) ??
      images.find((img) => !used.has(img.assetId))?.assetId ??
      null;
    if (imageId) used.add(imageId);

    const sceneNumber = startNumber + index;
    return {
      sceneNumber,
      sceneType: "image" as const,
      title: `Extended — ${moment.title.slice(0, 60)}`,
      headline: moment.title.slice(0, 60),
      supportingCopy: "",
      narrativePurpose: `extended_exhibit:${moment.kind}`,
      linkedFactIds: [...moment.supportingFactIds],
      linkedImageAssetIds: imageId ? [imageId] : [],
      linkedPerformanceId: handoff.performance.id || null,
      estimatedDurationSec: 7,
      priority: 50,
      durationFlag: "ok" as const,
      recommendedTemplate: {
        templateId: "gallery",
        displayName: "Extended Exhibit",
        confidence: 80,
        reason: moment.description.slice(0, 120),
      },
      layoutReadiness: imageId ? ("ready" as const) : ("needs_image" as const),
      layoutReadinessLabel: imageId ? "Ready" : "Needs image",
    };
  });
}

/** Five fixed exhibits + optional extended append slots (Director 2.0). */
export function buildMuseumExperiencePlan(
  handoff: DirectorEditorialPackage,
  options?: { includeExtended?: boolean; coachingHints?: CoachingRuleHints | null },
): ExperiencePlan {
  const assignments = assignExhibitFrames(handoff, options?.coachingHints);
  const defaultPerfId = handoff.performance.id || handoff.narrativeBlueprint.recommendedPerformance.performanceId || null;
  const releaseYear =
    handoff.performance.year ??
    handoff.approvedFacts.find((f) => /\b(19|20)\d{2}\b/.test(f.text))?.text.match(/\b(19|20)\d{2}\b/)?.[0] ??
    null;

  const coreScenes: ExperienceScene[] = assignments.map((slot, index) => ({
    sceneNumber: index + 1,
    sceneType: exhibitSceneType(slot.exhibitId),
    title: EXHIBIT_LABELS[slot.exhibitId],
    headline: slot.headline,
    supportingCopy: "",
    narrativePurpose: `museum_exhibit:${slot.exhibitId}${releaseYear && slot.exhibitId === "cover" ? `:year=${releaseYear}` : ""}`,
    linkedFactIds: slot.exhibitId === "chart_journey" ? handoff.approvedFacts.slice(0, 1).map((f) => f.id) : [],
    linkedImageAssetIds: slot.imageAssetIds,
    linkedPerformanceId: slot.exhibitId === "performance" ? defaultPerfId : null,
    estimatedDurationSec: EXHIBIT_DURATIONS[slot.exhibitId],
    priority: slot.exhibitId === "cover" || slot.exhibitId === "performance" ? 1 : 2,
    durationFlag: "ok",
    recommendedTemplate: exhibitTemplateId(slot.exhibitId),
    layoutReadiness: slot.exhibitId === "song_dna" || slot.imageAssetIds.length > 0 ? "ready" : "needs_image",
    layoutReadinessLabel: slot.exhibitId === "song_dna" ? "Song DNA artwork" : slot.imageAssetIds.length ? "Ready" : "Needs frame",
  }));

  const extended = options?.includeExtended ? buildExtendedExhibits(handoff, coreScenes.length + 1) : [];
  const scenes = [...coreScenes, ...extended];
  const estimatedRuntimeSec = scenes.reduce((sum, s) => sum + s.estimatedDurationSec, 0);

  return {
    version: "0.3",
    opening: "",
    closing: "",
    scenes,
    estimatedRuntimeSec,
    targetRuntimeSec: { min: 30, max: 55 },
    primaryPerformance: {
      performanceId: handoff.narrativeBlueprint.recommendedPerformance.performanceId,
      title: handoff.narrativeBlueprint.recommendedPerformance.title,
      reason: handoff.narrativeBlueprint.recommendedPerformance.reason,
    },
    visualRhythm: "moderate" as VisualRhythm,
    presentationStyle: "documentary" as PresentationStyle,
    templateLibraryVersion: "museum-2.0",
  };
}

export function exhibitIdFromScene(scene: ExperienceScene): ExhibitId | null {
  const match = scene.narrativePurpose.match(/^museum_exhibit:(\w+)/);
  if (!match?.[1]) return null;
  const id = match[1].split(":")[0] as ExhibitId;
  return EXHIBIT_IDS.includes(id) ? id : null;
}

export function isExtendedExhibitScene(scene: ExperienceScene): boolean {
  return scene.narrativePurpose.startsWith("extended_exhibit:");
}

export function releaseYearFromCoverScene(scene: ExperienceScene): number | null {
  const match = scene.narrativePurpose.match(/year=(\d{4})/);
  if (!match?.[1]) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}
