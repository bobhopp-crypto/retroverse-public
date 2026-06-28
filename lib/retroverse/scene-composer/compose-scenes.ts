import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";
import type {
  RenderSpecScene,
  RenderSpecSceneAssets,
  RenderSpecTimelineEvent,
} from "@/lib/retroverse/renderer/types";

import { derivePacingProfile, intensityForIndex } from "./pacing-profile";
import {
  computeCompositionStats,
  duplicateFact,
  isChartFact,
  isEncyclopediaCopy,
  isQuoteLike,
  isWeakTimelineMoment,
  isYearOnlyHeadline,
  normalizeHeadline,
  sanitizeMomentCopy,
  trimSupportingCopy,
} from "./scene-metrics";
import type {
  ComposedScene,
  CompositionTransform,
  MomentType,
  SceneCompositionResult,
} from "./types";
import { MOMENT_TYPE_LABELS } from "./types";

type DraftMoment = {
  momentType: MomentType;
  headline: string;
  supportingCopy: string;
  narrativePurpose: string;
  importance: RenderSpecScene["importance"];
  assets: RenderSpecSceneAssets;
  templateId: RenderSpecScene["templateId"];
  durationSec: number;
  sourceSceneNumbers: number[];
  composeReason: string;
  performanceId: string | null;
  transitionIn: RenderSpecScene["transitionIn"];
  transitionOut: RenderSpecScene["transitionOut"];
};

function emptyAssets(): RenderSpecSceneAssets {
  return {
    imageAssetIds: [],
    imageUrls: [],
    factIds: [],
    factTexts: [],
    performanceId: null,
    timelineEvents: [],
  };
}

function cloneAssets(partial: Partial<RenderSpecSceneAssets>): RenderSpecSceneAssets {
  return { ...emptyAssets(), ...partial };
}

function isWeakScene(scene: RenderSpecScene): boolean {
  return scene.importance === "low" && scene.assets.factTexts.filter(Boolean).length === 0;
}

function headlineSuggestsLegacy(headline: string): boolean {
  return /legacy|lasting|influence|memory/i.test(headline);
}

function headlineSuggestsBehind(headline: string): boolean {
  return /recording|how the song began|breakthrough|studio|written/i.test(headline);
}

function expandDirectorScene(scene: RenderSpecScene, transforms: CompositionTransform[]): DraftMoment[] {
  const drafts: DraftMoment[] = [];
  const facts = scene.assets.factTexts.filter((f) => f.trim());
  const images = scene.assets.imageUrls;
  const events = scene.assets.timelineEvents.filter((e) => e.label?.trim());
  const isFirst = scene.sceneNumber === 1;
  const isClosing = scene.templateId === "closing";
  const trimmedCopy = trimSupportingCopy(scene.supportingCopy, facts);

  const baseReason = `Decomposed Director scene ${scene.sceneNumber}.`;

  if (isClosing) {
    drafts.push({
      momentType: "final_reflection",
      headline: scene.headline,
      supportingCopy: trimmedCopy,
      narrativePurpose: scene.narrativePurpose,
      importance: scene.importance,
      assets: cloneAssets({
        imageAssetIds: scene.assets.imageAssetIds.slice(0, 1),
        imageUrls: images.slice(0, 1),
        factIds: [],
        factTexts: [],
        performanceId: scene.assets.performanceId,
        timelineEvents: events.slice(0, 1),
      }),
      templateId: "closing",
      durationSec: scene.durationSec,
      sourceSceneNumbers: [scene.sceneNumber],
      composeReason: "Closing scene becomes a single final reflection moment.",
      performanceId: scene.assets.performanceId,
      transitionIn: scene.transitionIn,
      transitionOut: scene.transitionOut,
    });
    if (drafts.length) {
      transforms.push({
        kind: "isolate",
        description: `Scene ${scene.sceneNumber} isolated as Final Reflection.`,
        sourceScenes: [scene.sceneNumber],
      });
    }
    return drafts;
  }

  if (isFirst || scene.templateId === "hero") {
    drafts.push({
      momentType: "hero_moment",
      headline: scene.headline,
      supportingCopy: facts.length > 0 ? trimmedCopy : scene.supportingCopy.trim(),
      narrativePurpose: scene.narrativePurpose,
      importance: scene.importance,
      assets: cloneAssets({
        imageAssetIds: scene.assets.imageAssetIds.slice(0, 1),
        imageUrls: images.slice(0, 1),
        factIds: [],
        factTexts: [],
        performanceId: scene.assets.performanceId,
        timelineEvents: events.length <= 1 ? events : [],
      }),
      templateId: "hero",
      durationSec: Math.max(8, Math.round(scene.durationSec * 0.45)),
      sourceSceneNumbers: [scene.sceneNumber],
      composeReason: "Opening hook elevated to Hero Moment with image-first focus.",
      performanceId: scene.assets.performanceId,
      transitionIn: scene.transitionIn,
      transitionOut: "fade",
    });
    transforms.push({
      kind: "elevate",
      description: `Scene ${scene.sceneNumber} elevated to Hero Moment.`,
      sourceScenes: [scene.sceneNumber],
    });
  } else if (scene.templateId === "chart") {
    drafts.push({
      momentType: "chart_milestone",
      headline: scene.headline,
      supportingCopy: trimmedCopy || scene.supportingCopy.trim(),
      narrativePurpose: scene.narrativePurpose,
      importance: scene.importance,
      assets: cloneAssets({
        imageAssetIds: scene.assets.imageAssetIds.slice(0, 1),
        imageUrls: images.slice(0, 1),
        factIds: scene.assets.factIds.slice(0, 1),
        factTexts: facts.slice(0, 1),
        performanceId: scene.assets.performanceId,
        timelineEvents: [],
      }),
      templateId: "chart",
      durationSec: scene.durationSec,
      sourceSceneNumbers: [scene.sceneNumber],
      composeReason: "Chart template mapped to Chart Milestone.",
      performanceId: scene.assets.performanceId,
      transitionIn: scene.transitionIn,
      transitionOut: scene.transitionOut,
    });
  } else if (headlineSuggestsLegacy(scene.headline)) {
    drafts.push({
      momentType: "legacy_moment",
      headline: scene.headline,
      supportingCopy: trimmedCopy,
      narrativePurpose: scene.narrativePurpose,
      importance: scene.importance,
      assets: cloneAssets({
        imageAssetIds: scene.assets.imageAssetIds.slice(0, 1),
        imageUrls: images.slice(0, 1),
        factIds: facts.length ? scene.assets.factIds.slice(0, 1) : [],
        factTexts: facts.slice(0, 1),
        performanceId: scene.assets.performanceId,
        timelineEvents: [],
      }),
      templateId: scene.templateId,
      durationSec: scene.durationSec,
      sourceSceneNumbers: [scene.sceneNumber],
      composeReason: "Legacy headline preserved as Legacy Moment.",
      performanceId: scene.assets.performanceId,
      transitionIn: scene.transitionIn,
      transitionOut: scene.transitionOut,
    });
  } else if (
    scene.assets.performanceId &&
    images.some((_, i) => i > 0) &&
    scene.templateId !== "story"
  ) {
    drafts.push({
      momentType: "performance_spotlight",
      headline: scene.headline,
      supportingCopy: trimmedCopy,
      narrativePurpose: scene.narrativePurpose,
      importance: scene.importance,
      assets: cloneAssets({
        imageAssetIds: scene.assets.imageAssetIds.slice(1, 2),
        imageUrls: images.slice(1, 2),
        factIds: [],
        factTexts: [],
        performanceId: scene.assets.performanceId,
        timelineEvents: [],
      }),
      templateId: "performance",
      durationSec: Math.max(8, Math.round(scene.durationSec * 0.5)),
      sourceSceneNumbers: [scene.sceneNumber],
      composeReason: "Performance imagery isolated as Performance Spotlight.",
      performanceId: scene.assets.performanceId,
      transitionIn: "cut",
      transitionOut: "fade",
    });
    transforms.push({
      kind: "isolate",
      description: `Scene ${scene.sceneNumber} performance image isolated.`,
      sourceScenes: [scene.sceneNumber],
    });
  } else if (headlineSuggestsBehind(scene.headline)) {
    drafts.push({
      momentType: "behind_the_song",
      headline: scene.headline,
      supportingCopy: trimmedCopy,
      narrativePurpose: scene.narrativePurpose,
      importance: scene.importance,
      assets: cloneAssets({
        imageAssetIds: scene.assets.imageAssetIds.slice(0, 1),
        imageUrls: images.slice(0, 1),
        factIds: facts.length ? scene.assets.factIds.slice(0, 1) : [],
        factTexts: facts.slice(0, 1),
        performanceId: scene.assets.performanceId,
        timelineEvents: events.slice(0, 1),
      }),
      templateId: scene.templateId,
      durationSec: scene.durationSec,
      sourceSceneNumbers: [scene.sceneNumber],
      composeReason: "Origin/recording scene grouped as Behind the Song.",
      performanceId: scene.assets.performanceId,
      transitionIn: scene.transitionIn,
      transitionOut: scene.transitionOut,
    });
  } else if (isQuoteLike(trimmedCopy) || scene.preferredTemplateId === "quote") {
    drafts.push({
      momentType: "big_quote",
      headline: scene.headline,
      supportingCopy: trimmedCopy || scene.supportingCopy.trim(),
      narrativePurpose: scene.narrativePurpose,
      importance: scene.importance,
      assets: cloneAssets({
        imageAssetIds: scene.assets.imageAssetIds.slice(0, 1),
        imageUrls: images.slice(0, 1),
        factIds: [],
        factTexts: [],
        performanceId: scene.assets.performanceId,
        timelineEvents: [],
      }),
      templateId: "quote",
      durationSec: scene.durationSec,
      sourceSceneNumbers: [scene.sceneNumber],
      composeReason: "Quote-like copy elevated to Big Quote moment.",
      performanceId: scene.assets.performanceId,
      transitionIn: scene.transitionIn,
      transitionOut: scene.transitionOut,
    });
    transforms.push({
      kind: "elevate",
      description: `Scene ${scene.sceneNumber} elevated to Big Quote.`,
      sourceScenes: [scene.sceneNumber],
    });
  } else {
    drafts.push({
      momentType: "behind_the_song",
      headline: scene.headline,
      supportingCopy: trimmedCopy,
      narrativePurpose: scene.narrativePurpose,
      importance: scene.importance,
      assets: cloneAssets({
        imageAssetIds: scene.assets.imageAssetIds.slice(0, 1),
        imageUrls: images.slice(0, 1),
        factIds: [],
        factTexts: [],
        performanceId: scene.assets.performanceId,
        timelineEvents: [],
      }),
      templateId: scene.templateId,
      durationSec: scene.durationSec,
      sourceSceneNumbers: [scene.sceneNumber],
      composeReason: baseReason,
      performanceId: scene.assets.performanceId,
      transitionIn: scene.transitionIn,
      transitionOut: scene.transitionOut,
    });
  }

  const heroDraft = drafts.find((d) => d.momentType === "hero_moment");

  for (let i = 0; i < facts.length; i++) {
    const fact = facts[i]!;
    const factId = scene.assets.factIds[i] ?? scene.assets.factIds[0] ?? "";

    if (heroDraft && duplicateFact(fact, scene.supportingCopy) && facts.length === 1) {
      heroDraft.assets.factIds = factId ? [factId] : [];
      heroDraft.assets.factTexts = [fact];
      continue;
    }

    if (heroDraft && i === 0 && facts.length === 1 && !duplicateFact(fact, heroDraft.supportingCopy)) {
      // Single fact on hero — keep on hero when copy is short; otherwise split.
      if (heroDraft.supportingCopy.length < 100) {
        heroDraft.assets.factIds = factId ? [factId] : [];
        heroDraft.assets.factTexts = [fact];
        continue;
      }
    }

    if (heroDraft && i === 0 && facts.length === 1 && duplicateFact(fact, heroDraft.supportingCopy)) {
      continue;
    }

    drafts.push({
      momentType: isChartFact(fact) ? "chart_milestone" : "did_you_know",
      headline: isChartFact(fact) ? scene.headline.includes("chart") ? scene.headline : "Chart Milestone" : "Did You Know?",
      supportingCopy: "",
      narrativePurpose: fact,
      importance: "medium",
      assets: cloneAssets({
        imageAssetIds: i === 0 && images.length ? scene.assets.imageAssetIds.slice(0, 1) : [],
        imageUrls: i === 0 && images.length ? images.slice(0, 1) : [],
        factIds: factId ? [factId] : [],
        factTexts: [fact],
        performanceId: null,
        timelineEvents: [],
      }),
      templateId: isChartFact(fact) ? "chart" : "fact_stack",
      durationSec: 8,
      sourceSceneNumbers: [scene.sceneNumber],
      composeReason: "Each fact becomes its own presentation moment.",
      performanceId: null,
      transitionIn: "fade",
      transitionOut: "fade",
    });
    transforms.push({
      kind: "split",
      description: `Scene ${scene.sceneNumber} fact ${i + 1} isolated.`,
      sourceScenes: [scene.sceneNumber],
    });
  }

  const timelineStart = events.length > 1 ? 0 : drafts.some((d) => d.assets.timelineEvents.length) ? events.length : 0;
  for (let i = timelineStart; i < events.length; i++) {
    const event = events[i]!;
    if (i === 0 && events.length === 1 && drafts.some((d) => d.assets.timelineEvents.length)) continue;
    if (events.length > 1 && isYearOnlyHeadline(String(event.year ?? "")) && !images.length) continue;

    drafts.push(timelineDraft(scene, event, i));
    transforms.push({
      kind: "split",
      description: `Scene ${scene.sceneNumber} timeline event split into Timeline Beat.`,
      sourceScenes: [scene.sceneNumber],
    });
  }

  if (images.length > 1 && scene.templateId === "gallery") {
    for (let i = 1; i < images.length; i++) {
      drafts.push({
        momentType: "visual_break",
        headline: scene.headline,
        supportingCopy: "",
        narrativePurpose: "Visual pause — image-first moment.",
        importance: "low",
        assets: cloneAssets({
          imageAssetIds: scene.assets.imageAssetIds.slice(i, i + 1),
          imageUrls: images.slice(i, i + 1),
          performanceId: scene.assets.performanceId,
        }),
        templateId: "gallery",
        durationSec: 6,
        sourceSceneNumbers: [scene.sceneNumber],
        composeReason: "Gallery image given its own Visual Break.",
        performanceId: scene.assets.performanceId,
        transitionIn: "dissolve",
        transitionOut: "dissolve",
      });
      transforms.push({
        kind: "isolate",
        description: `Scene ${scene.sceneNumber} image ${i + 1} isolated as Visual Break.`,
        sourceScenes: [scene.sceneNumber],
      });
    }
  }

  if (
    trimmedCopy.length > 140 &&
    facts.length === 0 &&
    !drafts.some((d) => d.momentType === "big_quote")
  ) {
    const sentences = trimmedCopy.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) {
      drafts.push({
        momentType: "did_you_know",
        headline: "Did You Know?",
        supportingCopy: "",
        narrativePurpose: sentences.slice(1).join(" "),
        importance: "medium",
        assets: emptyAssets(),
        templateId: "story",
        durationSec: 8,
        sourceSceneNumbers: [scene.sceneNumber],
        composeReason: "Long paragraph split — secondary idea isolated.",
        performanceId: null,
        transitionIn: "fade",
        transitionOut: "fade",
      });
      const primary = drafts.find((d) => d.sourceSceneNumbers[0] === scene.sceneNumber);
      if (primary) primary.supportingCopy = sentences[0] ?? primary.supportingCopy;
      transforms.push({
        kind: "split",
        description: `Scene ${scene.sceneNumber} long copy split across moments.`,
        sourceScenes: [scene.sceneNumber],
      });
    }
  }

  if (drafts.length === 0) {
    drafts.push({
      momentType: isWeakScene(scene) ? "pause_moment" : "behind_the_song",
      headline: scene.headline,
      supportingCopy: trimmedCopy,
      narrativePurpose: scene.narrativePurpose,
      importance: scene.importance,
      assets: cloneAssets({
        imageAssetIds: scene.assets.imageAssetIds,
        imageUrls: images,
        factIds: scene.assets.factIds,
        factTexts: facts,
        performanceId: scene.assets.performanceId,
        timelineEvents: events,
      }),
      templateId: scene.templateId,
      durationSec: scene.durationSec,
      sourceSceneNumbers: [scene.sceneNumber],
      composeReason: baseReason,
      performanceId: scene.assets.performanceId,
      transitionIn: scene.transitionIn,
      transitionOut: scene.transitionOut,
    });
  }

  return drafts;
}

function timelineDraft(
  scene: RenderSpecScene,
  event: RenderSpecTimelineEvent,
  index: number,
): DraftMoment {
  return {
    momentType: "timeline_beat",
    headline: event.year ? String(event.year) : scene.headline,
    supportingCopy: event.label,
    narrativePurpose: event.label,
    importance: scene.importance,
    assets: cloneAssets({ timelineEvents: [event] }),
    templateId: "timeline",
    durationSec: 8,
    sourceSceneNumbers: [scene.sceneNumber],
    composeReason: `Timeline event ${index + 1} becomes its own beat.`,
    performanceId: scene.assets.performanceId,
    transitionIn: "cut",
    transitionOut: "fade",
  };
}

function pruneWeakMoments(drafts: DraftMoment[], transforms: CompositionTransform[]): DraftMoment[] {
  const pruned: DraftMoment[] = [];
  const seenChartFacts = new Set<string>();

  for (const draft of drafts) {
    const imageCount = draft.assets.imageUrls.length;

    if (
      draft.momentType === "timeline_beat" &&
      isWeakTimelineMoment({
        headline: draft.headline,
        supportingCopy: draft.supportingCopy,
        imageCount,
      })
    ) {
      transforms.push({
        kind: "merge",
        description: `Dropped weak timeline beat "${draft.headline}" (no image, recycled copy).`,
        sourceScenes: draft.sourceSceneNumbers,
      });
      continue;
    }

    if (draft.momentType === "chart_milestone") {
      const factKey = (draft.assets.factTexts[0] ?? draft.supportingCopy).trim().toLowerCase();
      if (factKey && seenChartFacts.has(factKey)) {
        transforms.push({
          kind: "merge",
          description: "Dropped duplicate chart milestone.",
          sourceScenes: draft.sourceSceneNumbers,
        });
        continue;
      }
      if (factKey) seenChartFacts.add(factKey);
    }

    const prev = pruned[pruned.length - 1];
    if (
      prev &&
      draft.momentType === "visual_break" &&
      normalizeHeadline(prev.headline) === normalizeHeadline(draft.headline)
    ) {
      transforms.push({
        kind: "merge",
        description: `Merged duplicate visual break (${draft.headline}).`,
        sourceScenes: [...prev.sourceSceneNumbers, ...draft.sourceSceneNumbers],
      });
      prev.durationSec = Math.max(prev.durationSec, draft.durationSec);
      if (draft.assets.imageUrls[0] && prev.assets.imageUrls[0] !== draft.assets.imageUrls[0]) {
        prev.assets.imageUrls = draft.assets.imageUrls.slice(0, 1);
        prev.assets.imageAssetIds = draft.assets.imageAssetIds.slice(0, 1);
      }
      continue;
    }

    if (
      draft.momentType === "big_quote" &&
      (isEncyclopediaCopy(draft.supportingCopy) ||
        isEncyclopediaCopy(draft.narrativePurpose) ||
        draft.supportingCopy.split(/\s+/).length > 35)
    ) {
      const fact = draft.assets.factTexts.find((f) => isChartFact(f));
      if (imageCount > 0 && fact) {
        draft.momentType = "chart_milestone";
        draft.templateId = "chart";
        draft.headline = "Chart Milestone";
        draft.supportingCopy = sanitizeMomentCopy(fact, 12);
        draft.narrativePurpose = fact;
        draft.assets.factTexts = [fact];
        draft.composeReason = "Encyclopedia quote converted to minimal chart moment.";
      } else if (imageCount > 0) {
        draft.momentType = "visual_break";
        draft.templateId = "gallery";
        draft.headline = draft.headline.includes("chart") ? draft.headline : "Visual Moment";
        draft.supportingCopy = "";
        draft.narrativePurpose = "Visual pause — text trimmed for impact.";
        draft.assets.factTexts = [];
        draft.composeReason = "Text-heavy quote demoted to visual break.";
      } else {
        transforms.push({
          kind: "merge",
          description: "Dropped text-only encyclopedia quote.",
          sourceScenes: draft.sourceSceneNumbers,
        });
        continue;
      }
    }

    draft.supportingCopy = sanitizeMomentCopy(draft.supportingCopy, draft.momentType === "hero_moment" ? 22 : 16);
    draft.narrativePurpose = sanitizeMomentCopy(draft.narrativePurpose, 20) || draft.narrativePurpose;

    pruned.push(draft);
  }

  return pruned;
}

function mergeWeakMoments(drafts: DraftMoment[], transforms: CompositionTransform[]): DraftMoment[] {
  const merged: DraftMoment[] = [];

  for (const draft of drafts) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.momentType === draft.momentType &&
      prev.momentType === "chart_milestone" &&
      normalizeHeadline(prev.headline) === normalizeHeadline(draft.headline) &&
      duplicateFact(prev.assets.factTexts[0] ?? "", draft.assets.factTexts[0] ?? "")
    ) {
      transforms.push({
        kind: "merge",
        description: `Merged duplicate chart moments from scenes ${prev.sourceSceneNumbers.join(",")} and ${draft.sourceSceneNumbers.join(",")}.`,
        sourceScenes: [...new Set([...prev.sourceSceneNumbers, ...draft.sourceSceneNumbers])],
      });
      continue;
    }

    if (
      prev &&
      isWeakGallery(prev, draft) &&
      normalizeHeadline(prev.headline) === normalizeHeadline(draft.headline)
    ) {
      prev.durationSec += draft.durationSec;
      prev.sourceSceneNumbers = [...new Set([...prev.sourceSceneNumbers, ...draft.sourceSceneNumbers])];
      transforms.push({
        kind: "merge",
        description: `Merged weak duplicate gallery beats (${draft.headline}).`,
        sourceScenes: prev.sourceSceneNumbers,
      });
      continue;
    }

    merged.push(draft);
  }

  return merged;
}

function isWeakGallery(a: DraftMoment, b: DraftMoment): boolean {
  return (
    a.importance === "low" &&
    b.importance === "low" &&
    a.assets.factTexts.length === 0 &&
    b.assets.factTexts.length === 0 &&
    (a.momentType === "legacy_moment" || a.momentType === "visual_break") &&
    (b.momentType === "legacy_moment" || b.momentType === "visual_break")
  );
}

function draftToComposedScene(draft: DraftMoment, sceneNumber: number, intensity: ComposedScene["visualIntensity"]): ComposedScene {
  return {
    sceneNumber,
    templateId: draft.templateId,
    preferredTemplateId: draft.templateId,
    templateDowngraded: false,
    varietyAdjusted: true,
    downgradeReason: null,
    durationSec: draft.durationSec,
    headline: draft.headline,
    supportingCopy: draft.supportingCopy,
    narrativePurpose: draft.narrativePurpose,
    importance: draft.importance,
    assets: draft.assets,
    transitionIn: draft.transitionIn,
    transitionOut: draft.transitionOut,
    layoutReadiness: "Ready",
    selfContained: true,
    momentType: draft.momentType,
    momentLabel: MOMENT_TYPE_LABELS[draft.momentType],
    sourceSceneNumbers: draft.sourceSceneNumbers,
    visualIntensity: intensity,
    composeReason: draft.composeReason,
  };
}

export type ComposeScenesInput = {
  scenes: RenderSpecScene[];
  songDna: CollectorSongDna | null;
  totalDurationSec?: number;
};

export function composeScenes(input: ComposeScenesInput): SceneCompositionResult {
  const { scenes, songDna } = input;
  const transforms: CompositionTransform[] = [];
  const pacingProfile = derivePacingProfile(songDna, scenes.length);

  let drafts: DraftMoment[] = [];
  for (const scene of scenes) {
    drafts.push(...expandDirectorScene(scene, transforms));
  }

  drafts = mergeWeakMoments(drafts, transforms);
  drafts = pruneWeakMoments(drafts, transforms);

  const composedScenes = drafts.map((draft, index) =>
    draftToComposedScene(
      draft,
      index + 1,
      intensityForIndex(index, drafts.length, pacingProfile.id, draft.momentType),
    ),
  );

  return {
    originalScenes: scenes,
    composedScenes,
    pacingProfile,
    stats: computeCompositionStats(scenes, composedScenes),
    transforms,
  };
}
