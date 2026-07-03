import "server-only";

import type { CollectorPackage } from "@/lib/ops/studio/collector/types";
import type { DirectorPackage } from "@/lib/ops/studio/director/types";
import { exhibitIdFromScene } from "@/lib/ops/studio/director/exhibit-plan";

import type { ExperienceFingerprint } from "./types";

function haystack(collector: CollectorPackage | null, director: DirectorPackage): string {
  const parts = [
    collector?.recording.notes.join(" ") ?? "",
    collector?.charts.summary ?? "",
    director.experiencePlan.opening,
    director.experiencePlan.closing,
    ...director.experiencePlan.scenes.map((s) => `${s.title} ${s.headline} ${s.narrativePurpose}`),
  ];
  return parts.join(" ").toLowerCase();
}

/** Auto-detect experience fingerprints from package shape and metadata. */
export function detectExperienceFingerprints(
  director: DirectorPackage,
  collector: CollectorPackage | null,
): ExperienceFingerprint[] {
  const tags = new Set<ExperienceFingerprint>();
  const text = haystack(collector, director);
  const scenes = director.experiencePlan.scenes;

  const imageCount = scenes.reduce((n, s) => n + s.linkedImageAssetIds.length, 0);
  const storyWords = scenes.reduce(
    (n, s) => n + s.headline.split(/\s+/).length + s.supportingCopy.split(/\s+/).length,
    0,
  );
  const perfScenes = scenes.filter((s) => s.sceneType === "performance").length;
  const chartScenes = scenes.filter((s) => s.sceneType === "chart").length;
  const timelineScenes = scenes.filter((s) => s.sceneType === "timeline").length;

  if (imageCount >= storyWords / 8 || perfScenes >= 2) tags.add("Visual Driven");
  if (storyWords > 120 || timelineScenes > 0) tags.add("Story Driven");
  if (perfScenes >= 1) tags.add("Performance Driven");
  if (timelineScenes > 0 || (collector?.recording.notes.length ?? 0) > 2) tags.add("Historical");
  if (collector?.candidateFacts.length) tags.add("Collector");
  if (chartScenes > 0 || (collector?.charts.peakHot100 ?? 0) > 0) tags.add("Chart Story");

  if (/concert|live at|tour|stadium|arena|festival/.test(text)) tags.add("Concert");
  if (/music video|mtv|directed by|promo video/.test(text)) tags.add("Music Video");
  if (/tv|television|show|appearance|snl|american bandstand/.test(text)) tags.add("TV Performance");
  if (/live event|broadcast|ceremony|award/.test(text)) tags.add("Live Event");

  const exhibitIds = scenes
    .map((s) => exhibitIdFromScene(s))
    .filter(Boolean) as string[];
  if (exhibitIds.includes("cover") && exhibitIds.includes("performance") && !tags.has("Visual Driven")) {
    tags.add("Visual Driven");
  }

  if (tags.size === 0) tags.add("Visual Driven");

  return [...tags];
}

/** Stable hash for comparing director plan shape (golden freeze / drift). */
export function hashDirectorPlan(director: DirectorPackage): string {
  const payload = director.experiencePlan.scenes.map((s) => ({
    type: s.sceneType,
    exhibit: exhibitIdFromScene(s),
    images: s.linkedImageAssetIds.join(","),
    headline: s.headline.slice(0, 40),
  }));
  const raw = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function openingExhibitPattern(director: DirectorPackage): string {
  const first = director.experiencePlan.scenes[0];
  const exhibit = first ? exhibitIdFromScene(first) : null;
  return exhibit ?? first?.sceneType ?? "unknown";
}
