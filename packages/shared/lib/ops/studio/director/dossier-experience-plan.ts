/**
 * Retrograph-driven experience plan — Director reads Retrograph, never edits it.
 */

import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";
import type { Retrograph } from "@/lib/ops/studio/retrograph/types";
import { usableRetrographFacts } from "@/lib/ops/studio/retrograph/build-retrograph";

import type { CoachingRuleHints } from "./coaching/types";
import type { ExperiencePlan, ExperienceScene } from "./types";

function categoryLabel(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isTruncatedOpener(text: string): boolean {
  return /^"When You'?re in Love with a Beautiful Woman" is a song by Dr\.?$/i.test(text.trim());
}

function shouldSkipQuoteFact(text: string): boolean {
  return isTruncatedOpener(text) || text.trim().length < 24;
}

function factScene(
  sceneNumber: number,
  fact: { id: string; text: string; category: string },
  imageAssetIds: string[],
): ExperienceScene {
  return {
    sceneNumber,
    sceneType: "story",
    title: categoryLabel(fact.category),
    headline: categoryLabel(fact.category),
    supportingCopy: fact.text,
    narrativePurpose: `retrograph:fact:${fact.id}`,
    linkedFactIds: [fact.id],
    linkedImageAssetIds: imageAssetIds,
    linkedPerformanceId: null,
    estimatedDurationSec: 8,
    priority: 2,
    durationFlag: "ok",
    recommendedTemplate: {
      templateId: "story",
      displayName: "Fact",
      confidence: 90,
      reason: `Retrograph fact — ${fact.category}`,
    },
    layoutReadiness: "ready",
    layoutReadinessLabel: "Ready",
  };
}

export function buildRetrographExperiencePlan(
  handoff: DirectorEditorialPackage,
  retrograph: Retrograph,
  _coachingHints?: CoachingRuleHints | null,
): ExperiencePlan {
  const scenes: ExperienceScene[] = [];
  let n = 1;
  const usedImages = new Set<string>();
  const { song, charts, timeline, album, media } = retrograph;

  const coverImage = media.images.find((i) => i.category === "cover") ?? media.images[0];
  if (coverImage) {
    usedImages.add(coverImage.assetId);
    scenes.push({
      sceneNumber: n++,
      sceneType: "hero",
      title: "Cover",
      headline: song.title,
      supportingCopy: song.albumTitle
        ? `${song.artist} · ${song.albumTitle}${song.year ? ` (${song.year})` : ""}`
        : song.artist,
      narrativePurpose: `retrograph:cover:year=${song.year ?? ""}`,
      linkedFactIds: [],
      linkedImageAssetIds: [coverImage.assetId],
      linkedPerformanceId: handoff.performance.id || null,
      estimatedDurationSec: 7,
      priority: 1,
      durationFlag: "ok",
      recommendedTemplate: {
        templateId: "hero",
        displayName: "Cover",
        confidence: 95,
        reason: "Album cover from Retrograph",
      },
      layoutReadiness: "ready",
      layoutReadinessLabel: "Ready",
    });
  }

  if (charts.peakHot100 != null) {
    const chartFact = usableRetrographFacts(retrograph).find((f) => f.category === "chart");
    const chartImage =
      media.images.find((i) => i.category === "Hero" || i.category === "Performance") ??
      coverImage;
    if (chartImage) usedImages.add(chartImage.assetId);
    scenes.push({
      sceneNumber: n++,
      sceneType: "chart",
      title: "Chart Journey",
      headline: `Hot 100 #${charts.peakHot100}`,
      supportingCopy: chartFact?.text ?? charts.summary ?? "",
      narrativePurpose: "retrograph:chart_journey",
      linkedFactIds: chartFact ? [chartFact.id] : [],
      linkedImageAssetIds: chartImage ? [chartImage.assetId] : [],
      linkedPerformanceId: null,
      estimatedDurationSec: 9,
      priority: 1,
      durationFlag: "ok",
      recommendedTemplate: {
        templateId: "chart",
        displayName: "Chart Journey",
        confidence: 95,
        reason: "Chart data from Retrograph",
      },
      layoutReadiness: "ready",
      layoutReadinessLabel: "Ready",
    });
  }

  if (timeline.length >= 2) {
    scenes.push({
      sceneNumber: n++,
      sceneType: "timeline",
      title: "Timeline",
      headline: "Timeline",
      supportingCopy: timeline
        .slice(0, 6)
        .map((t) => `${t.date}: ${t.label}`)
        .join(" · "),
      narrativePurpose: "retrograph:timeline",
      linkedFactIds: [],
      linkedImageAssetIds: [],
      linkedPerformanceId: null,
      estimatedDurationSec: 10,
      priority: 2,
      durationFlag: "ok",
      recommendedTemplate: {
        templateId: "timeline",
        displayName: "Timeline",
        confidence: 90,
        reason: "Timeline events from Retrograph",
      },
      layoutReadiness: "ready",
      layoutReadinessLabel: "Ready",
    });
  }

  for (const recording of album.recordings) {
    const body = [
      recording.title,
      recording.releaseDate ? `Released ${recording.releaseDate}` : null,
      ...recording.notes,
      recording.recordingLocation,
    ]
      .filter(Boolean)
      .join(" · ");
    if (!body.trim()) continue;
    scenes.push({
      sceneNumber: n++,
      sceneType: "story",
      title: "Recording Session",
      headline: recording.title,
      supportingCopy: body,
      narrativePurpose: `retrograph:recording:${recording.id}`,
      linkedFactIds: [],
      linkedImageAssetIds: [],
      linkedPerformanceId: null,
      estimatedDurationSec: 8,
      priority: 2,
      durationFlag: "ok",
      recommendedTemplate: {
        templateId: "story",
        displayName: "Recording",
        confidence: 88,
        reason: "Recording entity from Retrograph",
      },
      layoutReadiness: "ready",
      layoutReadinessLabel: "Ready",
    });
  }

  const facts = usableRetrographFacts(retrograph).filter((f) => !shouldSkipQuoteFact(f.text));
  let imageIdx = 0;
  const rotImages = media.images.filter((i) => i.category !== "cover");

  for (const fact of facts) {
    if (fact.category === "chart" && charts.peakHot100 != null) continue;
    const img = rotImages[imageIdx % Math.max(rotImages.length, 1)];
    imageIdx += 1;
    if (img) usedImages.add(img.assetId);
    scenes.push(factScene(n++, fact, img ? [img.assetId] : []));
  }

  for (const card of handoff.approvedCards) {
    if (!card.body.trim()) continue;
    scenes.push({
      sceneNumber: n++,
      sceneType: "story",
      title: card.title,
      headline: card.title,
      supportingCopy: card.body,
      narrativePurpose: `retrograph:card:${card.id}`,
      linkedFactIds: [],
      linkedImageAssetIds: [],
      linkedPerformanceId: null,
      estimatedDurationSec: 7,
      priority: 2,
      durationFlag: "ok",
      recommendedTemplate: {
        templateId: "fact_stack",
        displayName: "Card",
        confidence: 85,
        reason: card.title,
      },
      layoutReadiness: "ready",
      layoutReadinessLabel: "Ready",
    });
  }

  scenes.push({
    sceneNumber: n++,
    sceneType: "image",
    title: "Song DNA",
    headline: "Song DNA",
    supportingCopy: "",
    narrativePurpose: "retrograph:song_dna",
    linkedFactIds: [],
    linkedImageAssetIds: [],
    linkedPerformanceId: null,
    estimatedDurationSec: 7,
    priority: 2,
    durationFlag: "ok",
    recommendedTemplate: {
      templateId: "gallery",
      displayName: "Song DNA",
      confidence: 90,
      reason: "Song DNA visual",
    },
    layoutReadiness: "ready",
    layoutReadinessLabel: "Ready",
  });

  for (const image of media.images.filter((i) => i.category !== "cover")) {
    if (usedImages.has(image.assetId)) continue;
    usedImages.add(image.assetId);
    scenes.push({
      sceneNumber: n++,
      sceneType: "image",
      title: image.label,
      headline: image.label,
      supportingCopy: image.caption,
      narrativePurpose: `retrograph:image:${image.assetId}`,
      linkedFactIds: [],
      linkedImageAssetIds: [image.assetId],
      linkedPerformanceId: image.performanceId,
      estimatedDurationSec: 7,
      priority: 3,
      durationFlag: "ok",
      recommendedTemplate: {
        templateId: "gallery",
        displayName: "Gallery",
        confidence: 85,
        reason: image.caption,
      },
      layoutReadiness: "ready",
      layoutReadinessLabel: "Ready",
    });
  }

  if (handoff.performance.id) {
    const perfImage = media.images.find((i) => i.category === "Performance") ?? rotImages[0];
    scenes.push({
      sceneNumber: n++,
      sceneType: "performance",
      title: handoff.performance.title || "Performance",
      headline: handoff.performance.title || "Performance",
      supportingCopy: handoff.performance.notes || "",
      narrativePurpose: "retrograph:performance",
      linkedFactIds: [],
      linkedImageAssetIds: perfImage ? [perfImage.assetId] : [],
      linkedPerformanceId: handoff.performance.id,
      estimatedDurationSec: 9,
      priority: 1,
      durationFlag: "ok",
      recommendedTemplate: {
        templateId: "performance",
        displayName: "Performance",
        confidence: 92,
        reason: "Primary performance from Retrograph",
      },
      layoutReadiness: "ready",
      layoutReadinessLabel: "Ready",
    });
  }

  const estimatedRuntimeSec = scenes.reduce((sum, s) => sum + s.estimatedDurationSec, 0);

  return {
    version: "0.3",
    opening: handoff.story.hook || handoff.story.headline,
    closing: handoff.story.summary || "",
    scenes,
    estimatedRuntimeSec,
    targetRuntimeSec: { min: estimatedRuntimeSec, max: estimatedRuntimeSec + 30 },
    primaryPerformance: {
      performanceId: handoff.performance.id,
      title: handoff.performance.title,
      reason: handoff.performance.notes || "Retrograph performance",
    },
    visualRhythm: "moderate",
    presentationStyle: "documentary",
    templateLibraryVersion: "retrograph-3.29",
  };
}

/** @deprecated Sprint 3.29 — use `buildRetrographExperiencePlan`. */
export const buildDossierExperiencePlan = buildRetrographExperiencePlan;
