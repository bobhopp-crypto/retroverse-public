/**
 * Editor Sprint A2 — Patron Value, weakness detection, and editorial review.
 * Client-safe — no server-only imports.
 */

import type { CollectorPackage, CollectorPerformance } from "@/lib/ops/studio/collector/package-contract";

import { storyAngleLabel } from "./editorial-constants";
import type {
  EditorialRecommendation,
  EditorialReview,
  EditorStoryPackage,
  StoryAngleId,
  StoryAngleSuggestion,
  StoryWeakness,
} from "./types";

export type {
  EditorialRecommendation,
  EditorialReview,
  StoryAngleSuggestion,
  StoryWeakness,
} from "./types";

const ENCYCLOPEDIA =
  /is performed by|retroverse track|canonical cover|virtualdj|billboard hot 100 peak|library play count|owned media file|appears on the album/i;

const EMOTION =
  /love|heart|break|joy|fear|dream|soul|pain|celebrat|iconic|legend|surpris|never forget|changed|revolution|anthem|timeless|raw|intimate|defining|memorable/i;

const MEMORABLE =
  /first time|only|never|unexpected|secret|infamous|controvers|breakthrough|turned down|by accident|overnight|against all odds|one take|improvis/i;

function acceptedFacts(story: EditorStoryPackage) {
  return story.workspace.candidateFacts.filter((f) => f.status === "accepted");
}

function narrativeText(story: EditorStoryPackage): string {
  return `${story.story.hook} ${story.story.summary} ${story.story.fullStory}`.toLowerCase();
}

function paragraphCount(text: string): number {
  return text.split(/\n\n+/).filter((p) => p.trim().length > 20).length;
}

function uniqueSentenceRatio(text: string): number {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 15);
  if (sentences.length === 0) return 1;
  return new Set(sentences).size / sentences.length;
}

/** Primary editorial score — would a patron keep reading? */
export function computePatronValue(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
): number {
  const { hook, fullStory, summary } = story.story;
  let score = 4;

  const hookLen = hook.trim().length;
  if (hookLen >= 50 && hookLen <= 220) score += 1.5;
  else if (hookLen >= 30) score += 0.5;
  else score -= 1;

  if (EMOTION.test(hook)) score += 1;
  if (MEMORABLE.test(hook)) score += 1;
  if (ENCYCLOPEDIA.test(hook)) score -= 1.5;
  if (/is a song by|was released in/i.test(hook)) score -= 1.5;

  const paras = paragraphCount(fullStory);
  if (paras >= 3) score += 1;
  if (paras >= 4) score += 0.5;
  if (fullStory.length >= 400) score += 0.5;
  if (fullStory.length >= 700) score += 0.5;
  if (fullStory.length < 180) score -= 2;

  if (EMOTION.test(fullStory)) score += 0.75;
  if (MEMORABLE.test(fullStory)) score += 0.75;

  const encyclopediaHits = (fullStory.match(new RegExp(ENCYCLOPEDIA.source, "gi")) ?? []).length;
  score -= Math.min(2, encyclopediaHits * 0.6);

  if (uniqueSentenceRatio(fullStory) < 0.75) score -= 1;

  const facts = acceptedFacts(story);
  if (facts.length >= 4) score += 0.75;
  if (facts.length >= 7) score += 0.5;
  if (facts.length < 2) score -= 1.5;

  const culturalFacts = facts.filter((f) =>
    /cultural|impact|legend|icon|remember|influenc|changed|era|moment|controvers|surpris/i.test(f.text),
  );
  if (culturalFacts.length >= 1) score += 0.75;

  if (pkg.storySeed?.whyItMatters && hook.includes(pkg.storySeed.whyItMatters.slice(0, 30).trim())) {
    score += 0.5;
  } else if (pkg.storySeed?.whyItMatters && summary.length > 40) {
    score += 0.25;
  }

  if (story.meta.storyManuallyEdited && story.meta.lastRewriteAt) score += 0.25;

  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

export function storyQualityLabel(patronValue: number): string {
  if (patronValue >= 8) return "Strong";
  if (patronValue >= 6.5) return "Good";
  if (patronValue >= 5) return "Fair";
  if (patronValue >= 3.5) return "Weak";
  return "Poor";
}

export function computeVisualQuality(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
): number {
  const perfId = story.approved.performanceId;
  const perf = pkg.performances?.find((p) => p.id === perfId) ?? pkg.performances?.[0];
  const extracted = perf?.visualAssets.extraction.extractedCount ?? 0;
  const approvedImages = story.workspace.imageBoard.filter((i) => i.approved).length;

  let score = 3;
  if (extracted >= 3) score += 3;
  if (extracted >= 5) score += 1;
  if (approvedImages >= 1) score += 1.5;
  if (pkg.visualAssets.coverUrl) score += 0.5;
  if (perf?.visualAssets.extraction.skipped) score -= 1;

  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

export function computePerformanceQuality(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
): number {
  const perfId = story.approved.performanceId;
  const perf = perfId
    ? pkg.performances?.find((p) => p.id === perfId)
    : pkg.performances?.[0];
  if (!perf) return 2;

  let score = perf.qualityScore / 10;
  if (/live/i.test(perf.title) || /live/i.test(perf.virtualDjFilePath ?? "")) score += 1;
  if (perf.detectedVenue) score += 0.5;
  if (perf.visualAssets.extraction.extractedCount >= 4) score += 1;

  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

export function buildPerformanceRationale(
  perf: CollectorPerformance | null | undefined,
  all: CollectorPerformance[],
): string {
  if (!perf) return "No performance video on file — story may lack a visual anchor.";

  const parts: string[] = [`Recommended: ${perf.title}`];

  if (/live aid|wembley|unplugged|mtv|concert|live at|live from/i.test(perf.title + perf.virtualDjFilePath)) {
    parts.push("iconic live setting with strong audience energy");
  }
  if (perf.detectedVenue) {
    parts.push(`venue context (${perf.detectedVenue}) adds place and moment`);
  }
  if (perf.visualAssets.extraction.extractedCount >= 4) {
    parts.push(`${perf.visualAssets.extraction.extractedCount} curated visual frames for cards and hero art`);
  } else if (perf.visualAssets.extraction.extractedCount > 0) {
    parts.push("visual reference frames available for the experience layer");
  }
  if (perf.detectedYear != null) {
    parts.push(`dated ${perf.detectedYear} performance helps anchor the narrative`);
  }
  if (all.length > 1) {
    const alts = all.filter((p) => p.id !== perf.id);
    if (alts.length > 0) {
      parts.push(`${alts.length} alternate cut(s) on file — this one scores highest for visuals and context`);
    }
  }
  if (parts.length === 1) {
    parts.push(`strongest quality score (${perf.qualityScore}/100) among owned videos`);
  }

  return parts.join(". ") + ".";
}

export function detectStoryWeaknesses(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
): StoryWeakness[] {
  const out: StoryWeakness[] = [];
  const { hook, fullStory } = story.story;
  const facts = acceptedFacts(story);
  const text = narrativeText(story);

  if (hook.trim().length < 35 || /deserves a closer look|reference point for|intersection of performance/i.test(hook)) {
    out.push({
      id: "weak-opening",
      issue: "Weak opening",
      suggestion:
        "Lead with the most surprising or emotional fact — why people still talk about this song today.",
    });
  }

  if (!EMOTION.test(hook) && !MEMORABLE.test(hook)) {
    out.push({
      id: "no-emotional-hook",
      issue: "No emotional hook",
      suggestion:
        "Rewrite the hook around a human moment: jealousy, triumph, accident, rebellion, or nostalgia.",
    });
  }

  if (uniqueSentenceRatio(fullStory) < 0.7) {
    out.push({
      id: "repetitive-facts",
      issue: "Repetitive facts",
      suggestion: "Each paragraph should add something new — cut duplicate chart or credit lines.",
    });
  }

  const hasCulture = facts.some((f) => f.category === "cultural_impact") || EMOTION.test(text);
  if (!hasCulture && (pkg.confidence?.culture ?? 50) < 55) {
    out.push({
      id: "lacks-significance",
      issue: "Lacks cultural significance",
      suggestion:
        "Add why this song mattered beyond the charts — movies, samples, covers, or a moment in time.",
    });
  }

  if (!MEMORABLE.test(fullStory) && !fullStory.match(/[.!?]["']?\s*$/)) {
    out.push({
      id: "no-takeaway",
      issue: "No memorable takeaway",
      suggestion: "End with one line a patron would repeat to a friend after the song ends.",
    });
  }

  const perfQ = computePerformanceQuality(pkg, story);
  if (perfQ < 5 && (pkg.performances?.length ?? 0) > 0) {
    out.push({
      id: "performance-choice",
      issue: "Performance choice may be weak",
      suggestion: "Review the Performances tab — a live cut or alternate version may tell a richer story.",
    });
  }

  if (facts.length < 3 || (pkg.confidence?.overall ?? 0) < 50) {
    out.push({
      id: "sparse-research",
      issue: "Sparse research",
      suggestion: "Accept more high-confidence facts or run Collector on a better-linked graph entry.",
    });
  }

  if (ENCYCLOPEDIA.test(fullStory)) {
    out.push({
      id: "encyclopedia-tone",
      issue: "Encyclopedia tone",
      suggestion: "Write like a music magazine feature — fewer credits and chart stats, more scene and story.",
    });
  }

  return out.slice(0, 6);
}

export function suggestStoryAngle(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
): StoryAngleSuggestion | null {
  const current = story.meta.storyAngle ?? "cultural_moment";
  const facts = acceptedFacts(story);
  const factText = facts.map((f) => f.text).join(" ").toLowerCase();

  const perf = pkg.performances?.find((p) => p.id === story.approved.performanceId) ?? pkg.performances?.[0];
  const isLive =
    perf &&
    (/live/i.test(perf.title) ||
      /live/i.test(perf.virtualDjFilePath ?? "") ||
      /live aid|wembley|unplugged/i.test(perf.title + (perf.detectedVenue ?? "")));

  if (isLive && current !== "live_performance") {
    return {
      currentAngle: current,
      suggestedAngle: "live_performance",
      reason: "The owned video is a live performance — lean into the stage moment and crowd energy.",
    };
  }

  if (
    pkg.charts.peakHot100 != null &&
    pkg.charts.peakHot100 <= 10 &&
    current !== "breakthrough" &&
    current !== "cultural_moment"
  ) {
    return {
      currentAngle: current,
      suggestedAngle: "breakthrough",
      reason: `A top-ten Hot 100 peak (#${pkg.charts.peakHot100}) is a natural breakthrough narrative.`,
    };
  }

  if (
    /personal|wrote|inspired by|relationship|divorce|death|father|mother|childhood|struggl|therapy/i.test(
      factText,
    ) &&
    current !== "personal_story"
  ) {
    return {
      currentAngle: current,
      suggestedAngle: "personal_story",
      reason: "Accepted facts point to a personal backstory stronger than the current angle.",
    };
  }

  if (
    /studio|produced|synthes|sample|recording|engineer|innov|technique|effect|pedal|drum machine/i.test(
      factText,
    ) &&
    current === "cultural_moment"
  ) {
    return {
      currentAngle: current,
      suggestedAngle: "technical_innovation",
      reason: "Production and studio details are the most distinctive material in the fact set.",
    };
  }

  if (
    /sampled|cover|movie|film|tv|commercial|viral|meme|internet|tiktok|sample/i.test(factText) &&
    current === "technical_innovation"
  ) {
    return {
      currentAngle: current,
      suggestedAngle: "unexpected_connection",
      reason: "Cultural connections and afterlife are stronger than a production-only frame.",
    };
  }

  if (
    current === "technical_innovation" &&
    !/studio|produced|synthes|engineer|innov/i.test(factText)
  ) {
    return {
      currentAngle: current,
      suggestedAngle: "cultural_moment",
      reason: "The emotional and cultural context is much stronger than the production story.",
    };
  }

  return null;
}

function recommendationLabel(rec: EditorialRecommendation): string {
  switch (rec) {
    case "ready_for_director":
      return "Ready for Director";
    case "needs_more_story":
      return "Needs More Story";
    case "needs_more_research":
      return "Needs More Research";
    case "needs_better_performance":
      return "Needs Better Performance";
  }
}

export function buildEditorialReview(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
): EditorialReview {
  const patronValue = computePatronValue(pkg, story);
  const visualQuality = computeVisualQuality(pkg, story);
  const performanceQuality = computePerformanceQuality(pkg, story);
  const weaknesses = detectStoryWeaknesses(pkg, story);
  const angleSuggestion = suggestStoryAngle(pkg, story);

  const perf =
    pkg.performances?.find((p) => p.id === story.approved.performanceId) ?? pkg.performances?.[0];
  const performanceRationale = buildPerformanceRationale(perf, pkg.performances ?? []);

  let recommendation: EditorialRecommendation = "needs_more_story";
  let explanation = "Story needs more editorial polish before Director handoff.";

  const researchThin =
    (pkg.confidence?.overall ?? 100) < 48 ||
    acceptedFacts(story).length < 3 ||
    (pkg.missingAreas?.length ?? 0) >= 4;

  if (researchThin) {
    recommendation = "needs_more_research";
    explanation =
      "Research depth is limiting the narrative — more accepted facts or graph coverage will unlock a stronger story.";
  } else if (performanceQuality < 4.5 && (pkg.performances?.length ?? 0) > 0) {
    recommendation = "needs_better_performance";
    explanation =
      "The story may improve with a stronger performance cut — review alternates and visual coverage.";
  } else if (
    patronValue >= 7 &&
    visualQuality >= 6 &&
    performanceQuality >= 5.5 &&
    weaknesses.length <= 2
  ) {
    recommendation = "ready_for_director";
    explanation =
      "Patron Value is strong, visuals and performance are adequate — presentation is the next challenge.";
  } else if (patronValue < 6 || weaknesses.length >= 3) {
    recommendation = "needs_more_story";
    explanation =
      "Rewrite for memorable moments and human stakes — facts are present but the story does not yet compel.";
  }

  return {
    patronValue,
    storyQuality: storyQualityLabel(patronValue),
    visualQuality,
    performanceQuality,
    recommendation,
    recommendationLabel: recommendationLabel(recommendation),
    explanation,
    weaknesses,
    angleSuggestion,
    performanceRationale,
  };
}

export function formatEditorialReviewSummary(review: EditorialReview): string {
  const icon =
    review.recommendation === "ready_for_director"
      ? "✅"
      : "⚠";
  return `${icon} ${review.recommendationLabel} — ${review.explanation}`;
}

export function attachEditorialReview(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
): EditorStoryPackage {
  return {
    ...story,
    workspace: {
      ...story.workspace,
      editorialReview: buildEditorialReview(pkg, story),
    },
  };
}
