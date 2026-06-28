/**
 * Sprint 3.33 — Creative Review engine.
 * Reads Director (+ optional Retrograph) — never writes upstream artifacts.
 */

import type { DirectorPackage } from "@/lib/ops/studio/director/types";
import type { DirectorStoryPage } from "@/lib/ops/studio/director/storytelling/types";
import type { Retrograph } from "@/lib/ops/studio/retrograph/types";

import {
  attentionFromDensity,
  average,
  clampScore,
  densityScore,
  gateFromScore,
  isImageHeavy,
  isTextHeavy,
  transitionScore,
} from "./scoring";
import type {
  CreativeReviewAudience,
  CreativeReviewBeat,
  CreativeReviewDirectorNote,
  CreativeReviewExecutiveSummary,
  CreativeReviewMissingOpportunity,
  CreativeReviewNarrative,
  CreativeReviewNarrativePhase,
  CreativeReviewPackage,
  CreativeReviewPacing,
  CreativeReviewPacingIssue,
  CreativeReviewPersonaScore,
  CreativeReviewPublishGateSection,
  CreativeReviewRepetition,
  CreativeReviewRepetitionItem,
  CreativeReviewStoryFlow,
  CreativeReviewVariety,
  CreativeReviewVarietySlot,
} from "./types";

type ReviewContext = {
  director: DirectorPackage;
  retrograph: Retrograph | null;
  hasSongDna: boolean;
};

type BeatInput = {
  order: number;
  pageId: string;
  storyId: string;
  label: string;
  purpose: string;
  templateId: string;
  supportingCopy: string;
  mediaIds: string[];
  factIds: string[];
};

function normalizeCopy(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function collectBeats(ctx: ReviewContext): BeatInput[] {
  const { director } = ctx;
  const plan = director.storyPlan;

  if (plan?.audienceSequence?.length && plan.pages.length) {
    const pageById = new Map(plan.pages.map((p) => [p.id, p]));
    const chapterPurpose = new Map(plan.chapters?.map((c) => [c.storyId, c.purpose]) ?? []);

    return plan.audienceSequence.map((step) => {
      const page = pageById.get(step.pageId);
      return {
        order: step.order,
        pageId: step.pageId,
        storyId: step.storyId,
        label: step.label,
        purpose: chapterPurpose.get(step.storyId) ?? step.storyId.replace(/_/g, " "),
        templateId: page?.templateId ?? step.templateId,
        supportingCopy: page?.supportingCopy ?? "",
        mediaIds: page?.mediaIds ?? [],
        factIds: page?.factIds ?? [],
      };
    });
  }

  return director.experiencePlan.scenes.map((scene, index) => ({
    order: index + 1,
    pageId: `scene-${scene.sceneNumber}`,
    storyId: scene.narrativePurpose.split(":")[1] ?? "unknown",
    label: scene.headline || scene.title,
    purpose: scene.title,
    templateId: scene.recommendedTemplate?.templateId ?? scene.sceneType,
    supportingCopy: scene.supportingCopy,
    mediaIds: scene.linkedImageAssetIds,
    factIds: scene.linkedFactIds,
  }));
}

function scoreBeat(
  beat: BeatInput,
  prev: BeatInput | null,
  storyPages: DirectorStoryPage[],
): CreativeReviewBeat {
  const copyLength = beat.supportingCopy.length;
  const hasMedia = beat.mediaIds.length > 0;
  const density = densityScore(copyLength);

  let interest = 68;
  if (/bathroom|pitch|muscle shoals|uk breakthrough|chart/i.test(beat.label)) interest += 14;
  if (beat.templateId === "performance" || beat.templateId === "chart") interest += 12;
  if (beat.templateId === "timeline") interest += 6;
  if (copyLength < 15 && !hasMedia) interest -= 20;

  let visual = 55;
  if (hasMedia) visual += 25;
  if (beat.templateId === "gallery" || beat.templateId === "hero") visual += 15;
  if (beat.templateId === "performance") visual += 18;
  if (beat.templateId === "story" && !hasMedia) visual -= 12;

  const page = storyPages.find((p) => p.id === beat.pageId);
  if (page && page.mediaIds.length > 1) visual += 8;

  return {
    order: beat.order,
    beatId: `beat-${beat.order}`,
    pageId: beat.pageId,
    storyId: beat.storyId,
    label: beat.label,
    purpose: beat.purpose,
    templateId: beat.templateId,
    interestScore: clampScore(interest),
    visualScore: clampScore(visual),
    informationDensity: density,
    audienceAttention: attentionFromDensity(density, beat.templateId),
    transitionQuality: transitionScore(
      prev?.templateId ?? null,
      beat.templateId,
      prev?.storyId ?? null,
      beat.storyId,
    ),
    hasMedia,
    copyLength,
  };
}

function buildStoryFlow(ctx: ReviewContext, inputs: BeatInput[]): CreativeReviewStoryFlow {
  const pages = ctx.director.storyPlan?.pages ?? [];
  const beats: CreativeReviewBeat[] = [];

  for (let i = 0; i < inputs.length; i++) {
    beats.push(scoreBeat(inputs[i]!, i > 0 ? inputs[i - 1]! : null, pages));
  }

  return {
    beats,
    averageInterest: average(beats.map((b) => b.interestScore)),
    averageVisual: average(beats.map((b) => b.visualScore)),
    flowScore: average(beats.map((b) => (b.interestScore + b.visualScore + b.transitionQuality) / 3)),
  };
}

function buildPacing(inputs: BeatInput[], beats: CreativeReviewBeat[]): CreativeReviewPacing {
  const issues: CreativeReviewPacingIssue[] = [];
  let textHeavyBeats = 0;
  let imageHeavyBeats = 0;
  let longestTextRun = 0;
  let textRun = 0;
  let longestMediaGap = 0;
  let mediaGap = 0;
  let longestStoryGap = 0;
  let storyGap = 0;

  for (const beat of inputs) {
    const textHeavy = isTextHeavy(beat.templateId) && beat.supportingCopy.length > 40;
    const imageHeavy = isImageHeavy(beat.templateId, beat.mediaIds.length > 0);

    if (textHeavy) {
      textHeavyBeats += 1;
      textRun += 1;
    } else {
      longestTextRun = Math.max(longestTextRun, textRun);
      textRun = 0;
    }

    if (imageHeavy) imageHeavyBeats += 1;

    if (beat.mediaIds.length === 0) {
      mediaGap += 1;
    } else {
      longestMediaGap = Math.max(longestMediaGap, mediaGap);
      mediaGap = 0;
    }

    if (beat.templateId === "story" || beat.templateId === "quote") {
      storyGap += 1;
    } else {
      longestStoryGap = Math.max(longestStoryGap, storyGap);
      storyGap = 0;
    }
  }
  longestTextRun = Math.max(longestTextRun, textRun);
  longestMediaGap = Math.max(longestMediaGap, mediaGap);
  longestStoryGap = Math.max(longestStoryGap, storyGap);

  if (longestTextRun >= 4) {
    issues.push({
      kind: "text_heavy_run",
      message: `${longestTextRun} consecutive text-heavy beats`,
      beatRange: `beats ${Math.max(1, inputs.length - longestTextRun + 1)}–${inputs.length}`,
      recommendation: "Insert a gallery, chart, or performance beat to break the text run",
    });
  }
  if (longestMediaGap >= 4) {
    issues.push({
      kind: "media_gap",
      message: `${longestMediaGap} beats without media`,
      beatRange: "mid-experience",
      recommendation: "Add cover art, performance stills, or album imagery",
    });
  }
  if (longestStoryGap >= 5) {
    issues.push({
      kind: "story_gap",
      message: "Long stretch without narrative movement",
      beatRange: "mid-experience",
      recommendation: "Move chart or performance earlier to restore momentum",
    });
  }

  const historicalBeats = inputs.filter(
    (b) => b.templateId === "timeline" || b.templateId === "chart" || /legacy|chart/i.test(b.storyId),
  ).length;
  if (inputs.length >= 8 && historicalBeats === 0) {
    issues.push({
      kind: "no_historical_movement",
      message: "No chart or timeline beats in a long experience",
      beatRange: "full sequence",
      recommendation: "Add chart journey or legacy timeline for historical anchor",
    });
  }

  const score = clampScore(88 - issues.length * 12 - Math.max(0, longestTextRun - 2) * 6);

  const recommendations = issues.map((i) => i.recommendation);

  return {
    score,
    textHeavyBeats,
    imageHeavyBeats,
    longestTextRun,
    longestMediaGap,
    longestStoryGap,
    issues,
    recommendations,
  };
}

function buildVariety(inputs: BeatInput[]): CreativeReviewVariety {
  const templateCounts = new Map<string, number>();
  for (const b of inputs) {
    templateCounts.set(b.templateId, (templateCounts.get(b.templateId) ?? 0) + 1);
  }

  const mediaIds = inputs.flatMap((b) => b.mediaIds);
  const uniqueMedia = new Set(mediaIds);
  const imagesReused = mediaIds.length - uniqueMedia.size;

  const slots: CreativeReviewVarietySlot[] = [
    { id: "chart", label: "Charts", count: inputs.filter((b) => b.templateId === "chart").length, present: false },
    { id: "timeline", label: "Timelines", count: inputs.filter((b) => b.templateId === "timeline").length, present: false },
    { id: "dna", label: "Song DNA", count: inputs.filter((b) => b.storyId === "song_dna").length, present: false },
    { id: "album", label: "Album", count: inputs.filter((b) => b.storyId === "album_story").length, present: false },
    {
      id: "performance",
      label: "Performance",
      count: inputs.filter((b) => b.templateId === "performance" || b.storyId === "performance_history").length,
      present: false,
    },
    { id: "quote", label: "Quote cards", count: inputs.filter((b) => b.templateId === "quote").length, present: false },
    { id: "story", label: "Story cards", count: inputs.filter((b) => b.templateId === "story").length, present: false },
    { id: "hero", label: "Hero", count: inputs.filter((b) => b.templateId === "hero").length, present: false },
  ].map((s) => ({ ...s, present: s.count > 0 }));

  const uniqueTemplates = templateCounts.size;
  const presentSlots = slots.filter((s) => s.present).length;
  const diversityScore = clampScore(
    (uniqueTemplates / Math.max(inputs.length, 1)) * 55 + (presentSlots / slots.length) * 45 - imagesReused * 8,
  );

  const recommendations: string[] = [];
  if (!slots.find((s) => s.id === "quote")?.present) {
    recommendations.push("Add a pull-quote beat for a magazine-style moment");
  }
  if (imagesReused > 0) {
    recommendations.push(`Reduce image reuse (${imagesReused} repeated frame${imagesReused === 1 ? "" : "s"})`);
  }
  if (!slots.find((s) => s.id === "timeline")?.present) {
    recommendations.push("Consider a timeline beat for historical movement");
  }

  return {
    diversityScore,
    slots,
    imagesReused,
    uniqueTemplates,
    recommendations,
  };
}

function buildRepetition(inputs: BeatInput[], ctx: ReviewContext): CreativeReviewRepetition {
  const items: CreativeReviewRepetitionItem[] = [];
  const copyByNorm = new Map<string, string[]>();
  const titleByNorm = new Map<string, string[]>();
  const mediaById = new Map<string, string[]>();
  const storyLabels = new Map<string, string[]>();

  for (const beat of inputs) {
    const norm = normalizeCopy(beat.supportingCopy);
    if (norm.length > 24) {
      const labels = copyByNorm.get(norm) ?? [];
      labels.push(beat.label);
      copyByNorm.set(norm, labels);
    }

    const titleNorm = normalizeCopy(beat.label);
    const titles = titleByNorm.get(titleNorm) ?? [];
    titles.push(beat.label);
    titleByNorm.set(titleNorm, titles);

    for (const mid of beat.mediaIds) {
      const mlabels = mediaById.get(mid) ?? [];
      mlabels.push(beat.label);
      mediaById.set(mid, mlabels);
    }

    const sl = storyLabels.get(beat.storyId) ?? [];
    sl.push(beat.label);
    storyLabels.set(beat.storyId, sl);
  }

  for (const [copy, labels] of copyByNorm) {
    if (labels.length >= 2) {
      const snippet = copy.slice(0, 48);
      items.push({
        kind: "wording",
        message: `"${snippet}${copy.length > 48 ? "…" : ""}" appears ${labels.length} times`,
        beatLabels: labels,
        recommendation: `Keep the strongest version (${labels[0]}); remove the other ${labels.length - 1}`,
      });
    }
  }

  for (const [title, labels] of titleByNorm) {
    if (labels.length >= 2 && title.length > 3) {
      items.push({
        kind: "title",
        message: `Title "${labels[0]}" repeated ${labels.length} times`,
        beatLabels: labels,
        recommendation: "Differentiate headlines by exhibit purpose",
      });
    }
  }

  for (const [, labels] of mediaById) {
    if (labels.length >= 2) {
      items.push({
        kind: "media",
        message: `Same image on ${labels.join(" and ")}`,
        beatLabels: labels,
        recommendation: "Use official cover or alternate performance frame on one beat",
      });
    }
  }

  if (/bathroom|pitch/i.test(inputs.map((b) => b.label + b.supportingCopy).join(" "))) {
    const bathroomBeats = inputs.filter((b) => /bathroom|pitch/i.test(b.label + b.supportingCopy));
    if (bathroomBeats.length > 1) {
      items.push({
        kind: "fact",
        message: `The bathroom pitch story appears ${bathroomBeats.length} times`,
        beatLabels: bathroomBeats.map((b) => b.label),
        recommendation: "Keep the strongest version; remove the others",
      });
    }
  }

  const perfBeats = inputs.filter((b) => b.storyId === "performance_history");
  if (perfBeats.length >= 2) {
    const purposes = perfBeats.map((b) => b.label);
    if (new Set(purposes).size < perfBeats.length) {
      items.push({
        kind: "exhibit_purpose",
        message: "Performance section repeats similar exhibit purpose",
        beatLabels: purposes,
        recommendation: "Merge performance beats or differentiate official video vs live",
      });
    }
  }

  const pages = ctx.director.storyPlan?.pages ?? [];
  const factToLabels = new Map<string, string[]>();
  for (const page of pages) {
    for (const fid of page.factIds) {
      const ls = factToLabels.get(fid) ?? [];
      const beat = inputs.find((b) => b.pageId === page.id);
      if (beat) ls.push(beat.label);
      factToLabels.set(fid, ls);
    }
  }
  for (const [, labels] of factToLabels) {
    if (labels.length >= 2) {
      items.push({
        kind: "fact",
        message: `Same fact used on ${labels.join(" and ")}`,
        beatLabels: labels,
        recommendation: "Assign each fact to one story beat only",
      });
    }
  }

  const score = clampScore(100 - items.length * 14);

  return { score, items };
}

function findBeatLabel(inputs: BeatInput[], pred: (b: BeatInput) => boolean): string | null {
  return inputs.find(pred)?.label ?? null;
}

function buildNarrative(inputs: BeatInput[]): CreativeReviewNarrative {
  const phases: CreativeReviewNarrativePhase[] = [
    {
      phase: "opening",
      label: "Strong opening",
      present: inputs.some((b) => b.order <= 2),
      strength: average(
        inputs
          .filter((b) => b.order <= 2)
          .map(() => 85),
      ) || 40,
      beatLabel: findBeatLabel(inputs, (b) => b.order === 1),
      recommendation: null,
    },
    {
      phase: "discovery",
      label: "Discovery",
      present: inputs.some((b) => /recording|bathroom|muscle/i.test(b.label + b.supportingCopy)),
      strength: inputs.some((b) => /recording|bathroom|muscle/i.test(b.label + b.supportingCopy)) ? 88 : 45,
      beatLabel: findBeatLabel(inputs, (b) => /bathroom|muscle|recording/i.test(b.label + b.supportingCopy)),
      recommendation: null,
    },
    {
      phase: "momentum",
      label: "Momentum",
      present: inputs.some((b) => b.storyId === "chart_journey" || b.templateId === "chart"),
      strength: inputs.some((b) => b.templateId === "chart") ? 86 : 50,
      beatLabel: findBeatLabel(inputs, (b) => b.templateId === "chart"),
      recommendation: null,
    },
    {
      phase: "surprise",
      label: "Surprise",
      present: inputs.some((b) => b.storyId === "song_dna" || b.templateId === "performance"),
      strength: inputs.some((b) => b.storyId === "song_dna") ? 84 : 55,
      beatLabel: findBeatLabel(inputs, (b) => b.storyId === "song_dna"),
      recommendation: null,
    },
    {
      phase: "payoff",
      label: "Payoff",
      present: inputs.some((b) => b.storyId === "performance_history"),
      strength: inputs.some((b) => b.storyId === "performance_history") ? 82 : 48,
      beatLabel: findBeatLabel(inputs, (b) => b.storyId === "performance_history"),
      recommendation: null,
    },
    {
      phase: "ending",
      label: "Ending",
      present: inputs.some((b) => b.storyId === "legacy" || b.order === inputs.length),
      strength: inputs.some((b) => b.storyId === "legacy") ? 78 : 52,
      beatLabel: findBeatLabel(inputs, (b) => b.storyId === "legacy"),
      recommendation: null,
    },
  ];

  for (const phase of phases) {
    if (!phase.present) {
      phase.recommendation = `Add a dedicated ${phase.label.toLowerCase()} beat`;
    } else if (phase.strength < 70) {
      phase.recommendation = `Strengthen ${phase.label.toLowerCase()} with media or sharper copy`;
    }
  }

  const arcScore = average(phases.map((p) => (p.present ? p.strength : 35)));
  const recommendations = phases.filter((p) => p.recommendation).map((p) => p.recommendation!);

  if (inputs.at(-1)?.storyId !== "legacy" && !/legacy|timeline/i.test(inputs.at(-1)?.label ?? "")) {
    recommendations.push("Ending feels abrupt — close on Legacy or a performance reprise");
  }

  return { arcScore, phases, recommendations: [...new Set(recommendations)] };
}

function personaScore(
  persona: string,
  inputs: BeatInput[],
  beats: CreativeReviewBeat[],
  weights: { i: number; e: number; em: number; en: number; r: number },
): CreativeReviewPersonaScore {
  const flow = average(beats.map((b) => b.interestScore));
  const visual = average(beats.map((b) => b.visualScore));
  const hasChart = inputs.some((b) => b.templateId === "chart");
  const hasPerf = inputs.some((b) => b.storyId === "performance_history");
  const hasDna = inputs.some((b) => b.storyId === "song_dna");

  let interesting = flow * weights.i;
  let educational = (hasChart ? 88 : 62) * weights.e;
  let emotional = (hasPerf ? 85 : 60) * weights.em;
  let entertaining = visual * weights.en;
  let replayValue = (hasDna ? 80 : 58) * weights.r;

  if (persona === "DJ") {
    interesting = hasDna ? 90 : interesting;
    educational = hasChart ? 92 : educational;
  }
  if (persona === "Museum visitor") {
    emotional = hasPerf ? 88 : emotional;
    educational = Math.max(educational, 78);
  }

  const overall = average([interesting, educational, emotional, entertaining, replayValue]);

  return {
    persona,
    interesting: clampScore(interesting),
    educational: clampScore(educational),
    emotional: clampScore(emotional),
    entertaining: clampScore(entertaining),
    replayValue: clampScore(replayValue),
    overall,
  };
}

function buildAudience(inputs: BeatInput[], beats: CreativeReviewBeat[]): CreativeReviewAudience {
  const personas = [
    personaScore("Music fan", inputs, beats, { i: 1, e: 0.85, em: 0.9, en: 0.95, r: 0.88 }),
    personaScore("Casual listener", inputs, beats, { i: 0.95, e: 0.7, em: 0.85, en: 1, r: 0.75 }),
    personaScore("DJ", inputs, beats, { i: 0.88, e: 1, em: 0.65, en: 0.8, r: 0.92 }),
    personaScore("Museum visitor", inputs, beats, { i: 0.82, e: 0.95, em: 0.92, en: 0.78, r: 0.7 }),
    personaScore("Retroverse collector", inputs, beats, { i: 0.9, e: 0.92, em: 0.8, en: 0.85, r: 0.95 }),
  ];

  return {
    personas,
    averageEngagement: average(personas.map((p) => p.overall)),
  };
}

function buildMissingOpportunities(ctx: ReviewContext, inputs: BeatInput[]): CreativeReviewMissingOpportunity[] {
  const ops: CreativeReviewMissingOpportunity[] = [];
  const rg = ctx.retrograph;
  const builtStories = new Set(ctx.director.storyPlan?.stories.filter((s) => s.status === "built").map((s) => s.id));

  if (!inputs.some((b) => b.storyId === "artist_journey") && builtStories.has("artist_journey") === false) {
    ops.push({ id: "artist_timeline", label: "Artist timeline", reason: "No artist journey chapter in audience sequence" });
  }
  if (!builtStories.has("related_songs")) {
    ops.push({ id: "related_songs", label: "Related songs", reason: "Director skipped related-song discovery paths" });
  }
  if (rg && rg.timeline.length >= 3 && !inputs.some((b) => b.templateId === "timeline")) {
    ops.push({ id: "timeline", label: "Historical timeline", reason: "Retrograph timeline exists but no timeline beat" });
  }
  if (ctx.hasSongDna && !inputs.some((b) => b.storyId === "song_dna")) {
    ops.push({ id: "song_dna", label: "Song DNA visualization", reason: "song-dna.json exists but DNA beat missing" });
  }
  if (!inputs.some((b) => b.templateId === "chart") && rg?.charts.peakHot100 != null) {
    ops.push({ id: "chart_animation", label: "Chart animation", reason: "Chart data available without chart beat" });
  }
  if (rg && rg.performances.length >= 2 && inputs.filter((b) => b.storyId === "performance_history").length < 2) {
    ops.push({ id: "video_comparison", label: "Video comparison", reason: "Multiple performances in Retrograph — only one beat used" });
  }
  if (!inputs.some((b) => /personnel|producer|songwriter/i.test(b.label + b.supportingCopy))) {
    ops.push({ id: "personnel", label: "Personnel page", reason: "Recording credits could be a dedicated beat" });
  }
  if (!builtStories.has("cultural_impact") && rg) {
    ops.push({ id: "cultural_context", label: "Historical context", reason: "Cultural impact story not in final sequence" });
  }

  return ops.slice(0, 8);
}

function buildDirectorFeedback(
  inputs: BeatInput[],
  beats: CreativeReviewBeat[],
  repetition: CreativeReviewRepetition,
  pacing: CreativeReviewPacing,
  narrative: CreativeReviewNarrative,
  missing: CreativeReviewMissingOpportunity[],
): CreativeReviewDirectorNote[] {
  const notes: CreativeReviewDirectorNote[] = [];

  const ukBeat = inputs.find((b) => /uk/i.test(b.label));
  const legacyBeat = inputs.find((b) => b.storyId === "legacy");
  if (ukBeat && legacyBeat && ukBeat.order > legacyBeat.order) {
    notes.push({
      id: "move-uk-before-legacy",
      beatRefs: [ukBeat.label, legacyBeat.label],
      message: `Move "${ukBeat.label}" before "${legacyBeat.label}" — international breakthrough should precede legacy close`,
      priority: "high",
    });
  }

  const perfBeat = inputs.find((b) => b.storyId === "performance_history");
  const chartBeat = inputs.find((b) => b.templateId === "chart");
  if (perfBeat && chartBeat && perfBeat.order > chartBeat.order + 4) {
    notes.push({
      id: "performance-late",
      beatRefs: [perfBeat.label],
      message: `"${perfBeat.label}" begins too late (beat ${perfBeat.order}) — move performance section earlier for visual payoff`,
      priority: "medium",
    });
  }

  for (const item of repetition.items.slice(0, 3)) {
    notes.push({
      id: `rep-${item.kind}-${item.beatLabels[0]}`,
      beatRefs: item.beatLabels,
      message: `${item.message}. ${item.recommendation}`,
      priority: "high",
    });
  }

  for (const issue of pacing.issues.slice(0, 2)) {
    notes.push({
      id: `pace-${issue.kind}`,
      beatRefs: [issue.beatRange],
      message: `${issue.message} (${issue.beatRange}). ${issue.recommendation}`,
      priority: "medium",
    });
  }

  const recordingBeat = inputs.find((b) => /bathroom|muscle|recording/i.test(b.label + b.supportingCopy));
  const albumBeat = inputs.find((b) => b.storyId === "album_story");
  if (recordingBeat && albumBeat && albumBeat.order < recordingBeat.order) {
    notes.push({
      id: "recording-act-two",
      beatRefs: [recordingBeat.label, albumBeat.label],
      message: `Recording story ("${recordingBeat.label}") should open Act Two before "${albumBeat.label}"`,
      priority: "medium",
    });
  }

  const weakTransition = beats.find((b) => b.transitionQuality < 65);
  if (weakTransition) {
    notes.push({
      id: `transition-${weakTransition.order}`,
      beatRefs: [weakTransition.label],
      message: `Weak transition into "${weakTransition.label}" (beat ${weakTransition.order}) — vary template or story chapter`,
      priority: "low",
    });
  }

  if (narrative.phases.find((p) => p.phase === "ending")?.strength ?? 0 < 72) {
    notes.push({
      id: "ending-abrupt",
      beatRefs: [inputs.at(-1)?.label ?? "final beat"],
      message: "Ending feels abrupt — add legacy coda or performance reprise after Song DNA",
      priority: "medium",
    });
  }

  for (const op of missing.slice(0, 2)) {
    notes.push({
      id: `missing-${op.id}`,
      beatRefs: [],
      message: `Consider adding ${op.label}: ${op.reason}`,
      priority: "low",
    });
  }

  return notes.slice(0, 10);
}

function buildExecutiveSummary(
  flow: CreativeReviewStoryFlow,
  pacing: CreativeReviewPacing,
  variety: CreativeReviewVariety,
  repetition: CreativeReviewRepetition,
  narrative: CreativeReviewNarrative,
  audience: CreativeReviewAudience,
  gate: CreativeReviewPublishGateSection,
): CreativeReviewExecutiveSummary {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const fixes: string[] = [];

  const recordingBeat = flow.beats.find((b) => /bathroom|muscle|recording/i.test(b.label));
  if (recordingBeat && recordingBeat.interestScore >= 75) {
    strengths.push("Excellent recording story");
  }
  const chartBeat = flow.beats.find((b) => b.templateId === "chart");
  if (chartBeat) strengths.push("Excellent chart section");
  if (flow.beats[0]?.interestScore >= 80) strengths.push("Opening is strong");
  if (flow.beats.some((b) => b.storyId === "performance_history")) {
    if (repetition.items.some((i) => i.kind === "exhibit_purpose")) {
      weaknesses.push("Performance footage is repetitive");
    } else {
      strengths.push("Strong performance section");
    }
  }
  if (narrative.phases.find((p) => p.phase === "ending")!.strength < 75) {
    weaknesses.push("Ending could be stronger");
  }
  if (repetition.items.length > 0) {
    weaknesses.push(`${repetition.items.length} repetition issue${repetition.items.length === 1 ? "" : "s"} detected`);
  }
  if (pacing.score < 75) weaknesses.push("Pacing needs tightening");

  fixes.push(...pacing.recommendations.slice(0, 2));
  fixes.push(...variety.recommendations.slice(0, 1));
  fixes.push(...repetition.items.slice(0, 2).map((i) => i.recommendation));

  const overallScore = clampScore(
    flow.flowScore * 0.28 +
      pacing.score * 0.18 +
      variety.diversityScore * 0.18 +
      repetition.score * 0.18 +
      narrative.arcScore * 0.1 +
      audience.averageEngagement * 0.08,
  );

  const { gate: publishReadiness, label: publishReadinessLabel } = gateFromScore(
    overallScore,
    gate.blockers,
  );

  const narrativeParagraph = [
    strengths.length ? strengths.join(". ") + "." : "Core chapters need strengthening.",
    weaknesses.length ? weaknesses.join(". ") + "." : "No major weaknesses flagged.",
    `Overall readiness: ${overallScore}%. ${publishReadinessLabel}.`,
  ].join(" ");

  return {
    overallScore,
    publishReadiness,
    publishReadinessLabel,
    strengths,
    weaknesses,
    recommendedFixes: [...new Set(fixes)].slice(0, 6),
    narrativeParagraph,
  };
}

function buildPublishGate(
  ctx: ReviewContext,
  inputs: BeatInput[],
  repetition: CreativeReviewRepetition,
  executive: CreativeReviewExecutiveSummary,
): CreativeReviewPublishGateSection {
  const blockers: string[] = [];
  const reasons: string[] = [];

  if (inputs.length === 0) {
    blockers.push("Director produced no audience beats");
  }
  if (inputs.length < 3) {
    blockers.push("Experience too short for public publishing");
  }
  if (/virtualdj|play count/i.test(inputs.map((b) => b.supportingCopy).join(" "))) {
    blockers.push("Private DJ metadata visible in page copy");
  }

  reasons.push(`Overall creative score: ${executive.overallScore}%`);
  reasons.push(`${inputs.length} beats in audience sequence`);
  reasons.push(`Repetition score: ${repetition.score}%`);
  if (repetition.items.length) {
    reasons.push(`${repetition.items.length} repetition item(s) flagged`);
  }

  const { gate, label } = gateFromScore(executive.overallScore, blockers);

  return {
    decision: blockers.length ? "blocked" : executive.publishReadiness,
    label: blockers.length ? "Blocked — resolve blockers before publishing" : label,
    reasons,
    blockers,
  };
}

export function buildCreativeReview(ctx: ReviewContext): CreativeReviewPackage {
  const inputs = collectBeats(ctx);
  const storyFlow = buildStoryFlow(ctx, inputs);
  const pacing = buildPacing(inputs, storyFlow.beats);
  const variety = buildVariety(inputs);
  const repetition = buildRepetition(inputs, ctx);
  const narrative = buildNarrative(inputs);
  const audience = buildAudience(inputs, storyFlow.beats);
  const missingOpportunities = buildMissingOpportunities(ctx, inputs);

  const publishGateDraft = buildPublishGate(ctx, inputs, repetition, {
    overallScore: 0,
    publishReadiness: "needs_revision",
    publishReadinessLabel: "",
    strengths: [],
    weaknesses: [],
    recommendedFixes: [],
    narrativeParagraph: "",
  });

  const executiveSummary = buildExecutiveSummary(
    storyFlow,
    pacing,
    variety,
    repetition,
    narrative,
    audience,
    publishGateDraft,
  );

  const publishGate = buildPublishGate(ctx, inputs, repetition, executiveSummary);
  const directorFeedback = buildDirectorFeedback(
    inputs,
    storyFlow.beats,
    repetition,
    pacing,
    narrative,
    missingOpportunities,
  );

  return {
    version: 1,
    rvtr: ctx.director.rvtr,
    artist: ctx.director.artist,
    title: ctx.director.title,
    generatedAt: new Date().toISOString(),
    directorGeneratedAt: ctx.director.generatedAt ?? null,
    executiveSummary,
    storyFlow,
    pacing,
    variety,
    repetition,
    narrative,
    audience,
    missingOpportunities,
    publishGate,
    directorFeedback,
  };
}
