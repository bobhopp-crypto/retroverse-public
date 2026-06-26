/**
 * Director 0.1 — build Experience Plan from Editor handoff only.
 * No Collector access. No historical reasoning.
 */

import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";
import type { NarrativeBlueprint, RecommendedPace, StoryBeat } from "@/lib/ops/studio/editor/types";

import type {
  ExperiencePlan,
  ExperienceScene,
  PresentationStyle,
  SceneType,
  VisualRhythm,
} from "./types";

const TARGET_MIN_SEC = 60;
const TARGET_MAX_SEC = 120;
const SCENE_TOO_SHORT_SEC = 5;
const SCENE_TOO_LONG_SEC = 28;

function sceneTypeForBeat(beat: StoryBeat): SceneType {
  const hay = `${beat.title} ${beat.description}`.toLowerCase();
  if (/performance setting|live|concert|venue|stage/.test(hay)) return "performance";
  if (/chart|commercial|hot 100|billboard|peaked/.test(hay)) return "chart";
  if (/recording|studio|session|breakthrough/.test(hay)) return "story";
  if (/legacy|impact|cultural/.test(hay)) return "story";
  if (/how the song began|origin|release/.test(hay)) return "hero";
  return "story";
}

function presentationStyle(blueprint: NarrativeBlueprint): PresentationStyle {
  if (blueprint.primaryTheme === "performance" || blueprint.emotionalArc === "energy") {
    return "concert";
  }
  if (blueprint.primaryTheme === "breakthrough" || blueprint.primaryTheme === "chart_success") {
    return "countdown";
  }
  if (blueprint.emotionalArc === "nostalgia" || blueprint.primaryTheme === "television") {
    return "television_retrospective";
  }
  if (blueprint.emotionalArc === "reflection" || blueprint.emotionalArc === "drama") {
    return "documentary";
  }
  if (blueprint.primaryTheme === "culture") {
    return "magazine_feature";
  }
  return "documentary";
}

function visualRhythm(
  blueprintPace: RecommendedPace,
  sceneCount: number,
): VisualRhythm {
  if (sceneCount >= 7 && blueprintPace === "fast") return "mixed";
  if (sceneCount <= 4 && blueprintPace === "slow") return "slow";
  return blueprintPace;
}

function resolveImages(
  beatImageIds: string[],
  approvedImageIds: string[],
  sceneIndex: number,
): string[] {
  const fromBeat = beatImageIds.filter((id) => approvedImageIds.includes(id));
  if (fromBeat.length > 0) return fromBeat.slice(0, 2);
  if (approvedImageIds.length === 0) return [];
  const idx = sceneIndex % approvedImageIds.length;
  return [approvedImageIds[idx]!];
}

function baseDurationSec(sceneType: SceneType, priority: number): number {
  switch (sceneType) {
    case "hero":
      return 10;
    case "closing":
      return 12;
    case "performance":
      return 18;
    case "chart":
      return 14;
    case "quote":
      return 10;
    case "timeline":
      return 12;
    case "image":
      return 8;
    default:
      return priority <= 2 ? 16 : 13;
  }
}

function scaleDurations(scenes: ExperienceScene[]): ExperienceScene[] {
  let total = scenes.reduce((sum, s) => sum + s.estimatedDurationSec, 0);

  if (total > TARGET_MAX_SEC) {
    const scale = TARGET_MAX_SEC / total;
    return scenes.map((s) => ({
      ...s,
      estimatedDurationSec: Math.max(4, Math.round(s.estimatedDurationSec * scale)),
    }));
  }

  if (total < TARGET_MIN_SEC) {
    const scale = TARGET_MIN_SEC / total;
    return scenes.map((s) => ({
      ...s,
      estimatedDurationSec: Math.round(s.estimatedDurationSec * scale),
    }));
  }

  return scenes;
}

function flagDuration(sec: number): ExperienceScene["durationFlag"] {
  if (sec < SCENE_TOO_SHORT_SEC) return "too_short";
  if (sec > SCENE_TOO_LONG_SEC) return "too_long";
  return "ok";
}

function beatToScene(
  beat: StoryBeat,
  sceneNumber: number,
  approvedImageIds: string[],
  defaultPerfId: string | null,
): ExperienceScene {
  const sceneType = sceneTypeForBeat(beat);
  const duration = baseDurationSec(sceneType, beat.priority);

  return {
    sceneNumber,
    sceneType,
    title: beat.title,
    headline: beat.title,
    supportingCopy: beat.description.slice(0, 280),
    narrativePurpose: beat.title,
    linkedFactIds: [...beat.supportingFactIds],
    linkedImageAssetIds: resolveImages(beat.relatedImageAssetIds, approvedImageIds, sceneNumber),
    linkedPerformanceId: beat.relatedPerformanceId ?? defaultPerfId,
    estimatedDurationSec: duration,
    priority: beat.priority,
    durationFlag: null,
  };
}

/** Transform Narrative Blueprint + handoff assets into an Experience Plan. */
export function buildExperiencePlan(handoff: DirectorEditorialPackage): ExperiencePlan {
  const blueprint = handoff.narrativeBlueprint;
  const approvedImageIds = handoff.approvedImages.map((i) => i.assetId);
  const defaultPerfId =
    handoff.performance.id || blueprint.recommendedPerformance.performanceId || null;

  const scenes: ExperienceScene[] = [];
  let sceneNumber = 1;

  scenes.push({
    sceneNumber: sceneNumber++,
    sceneType: "hero",
    title: "Opening",
    headline: handoff.story.headline,
    supportingCopy: blueprint.opening.slice(0, 280),
    narrativePurpose: "Hook the patron — establish tone and subject",
    linkedFactIds: handoff.approvedFacts.slice(0, 1).map((f) => f.id),
    linkedImageAssetIds: approvedImageIds.slice(0, 1),
    linkedPerformanceId: defaultPerfId,
    estimatedDurationSec: 10,
    priority: 1,
    durationFlag: null,
  });

  const sortedBeats = [...blueprint.storyBeats].sort((a, b) => a.order - b.order);
  for (const beat of sortedBeats) {
    scenes.push(beatToScene(beat, sceneNumber++, approvedImageIds, defaultPerfId));
  }

  for (const moment of blueprint.keyMoments.slice(0, 2)) {
    const duplicate = scenes.some((s) =>
      s.headline.toLowerCase().includes(moment.title.toLowerCase().slice(0, 20)),
    );
    if (duplicate) continue;

    scenes.push({
      sceneNumber: sceneNumber++,
      sceneType: moment.kind.includes("chart") ? "chart" : "quote",
      title: moment.title.slice(0, 80),
      headline: moment.title.slice(0, 80),
      supportingCopy: moment.description.slice(0, 280),
      narrativePurpose: "Key moment highlight from Editor blueprint",
      linkedFactIds: [...moment.supportingFactIds],
      linkedImageAssetIds: resolveImages(moment.relatedImageAssetIds, approvedImageIds, sceneNumber),
      linkedPerformanceId: defaultPerfId,
      estimatedDurationSec: 10,
      priority: 3,
      durationFlag: null,
    });
  }

  scenes.push({
    sceneNumber: sceneNumber++,
    sceneType: "closing",
    title: "Closing",
    headline: blueprint.recommendedEnding.style.replace(/_/g, " "),
    supportingCopy: blueprint.closing.slice(0, 280),
    narrativePurpose: blueprint.recommendedEnding.description.slice(0, 160),
    linkedFactIds: [],
    linkedImageAssetIds: approvedImageIds.length > 0 ? [approvedImageIds[approvedImageIds.length - 1]!] : [],
    linkedPerformanceId: defaultPerfId,
    estimatedDurationSec: 12,
    priority: 1,
    durationFlag: null,
  });

  const scaled = scaleDurations(scenes);
  const withFlags = scaled.map((s) => ({
    ...s,
    durationFlag: flagDuration(s.estimatedDurationSec),
  }));

  const estimatedRuntimeSec = withFlags.reduce((sum, s) => sum + s.estimatedDurationSec, 0);

  return {
    version: "0.1",
    opening: blueprint.opening,
    closing: blueprint.closing,
    scenes: withFlags,
    estimatedRuntimeSec,
    targetRuntimeSec: { min: TARGET_MIN_SEC, max: TARGET_MAX_SEC },
    primaryPerformance: {
      performanceId: blueprint.recommendedPerformance.performanceId,
      title: blueprint.recommendedPerformance.title,
      reason: blueprint.recommendedPerformance.reason,
    },
    visualRhythm: visualRhythm(blueprint.recommendedPace, withFlags.length),
    presentationStyle: presentationStyle(blueprint),
  };
}
