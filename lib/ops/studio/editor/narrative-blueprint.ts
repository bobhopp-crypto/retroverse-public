/**
 * Editor Sprint A4 — Narrative Blueprint generation.
 * Structured creative plan for Director — not prose.
 * Client-safe (no server-only imports).
 */

import { createHash } from "crypto";

import type { CollectorPackage } from "@/lib/ops/studio/collector/package-contract";
import { buildPerformanceRationale } from "./editorial-review";
import { storyAngleLabel } from "./editorial-constants";

import type {
  BlueprintEndingRecommendation,
  BlueprintPerformanceRecommendation,
  EditorStoryPackage,
  EmotionalArcId,
  KeyMoment,
  NarrativeBlueprint,
  RecommendedPace,
  StoryAngleId,
  StoryBeat,
  ThemeId,
} from "./types";

function stableId(prefix: string, seed: string): string {
  const hash = createHash("sha256").update(seed).digest("hex").slice(0, 10);
  return `${prefix}-${hash}`;
}

function acceptedFactIds(story: EditorStoryPackage): Array<{ id: string; text: string }> {
  return story.workspace.candidateFacts
    .filter((f) => f.status === "accepted")
    .map((f) => ({ id: f.id, text: f.text }));
}

function approvedImageIds(story: EditorStoryPackage): string[] {
  return story.approved.images.map((i) => i.assetId);
}

function songYear(pkg: CollectorPackage): number | null {
  return pkg.songEntity?.originalReleaseYear ?? pkg.identity.year;
}

function pickFacts(
  facts: Array<{ id: string; text: string }>,
  pattern: RegExp,
  limit = 2,
): string[] {
  return facts.filter((f) => pattern.test(f.text)).slice(0, limit).map((f) => f.id);
}

function emotionalArcFor(angle: StoryAngleId, pkg: CollectorPackage): EmotionalArcId {
  const peak = pkg.charts.peakHot100;
  switch (angle) {
    case "breakthrough":
      return peak != null && peak <= 10 ? "triumph" : "celebration";
    case "live_performance":
      return "energy";
    case "personal_story":
      return "reflection";
    case "technical_innovation":
      return "innovation";
    case "career_turning_point":
      return "drama";
    case "behind_the_scenes":
      return "discovery";
    case "unexpected_connection":
      return "nostalgia";
    default:
      return peak != null ? "celebration" : "discovery";
  }
}

function paceFor(arc: EmotionalArcId, angle: StoryAngleId): RecommendedPace {
  if (angle === "live_performance" && arc === "energy") return "mixed";
  if (arc === "reflection" || arc === "drama") return "slow";
  if (arc === "energy" || arc === "triumph") return "fast";
  return "moderate";
}

function themeFor(angle: StoryAngleId): ThemeId {
  const map: Record<StoryAngleId, ThemeId> = {
    breakthrough: "breakthrough",
    personal_story: "love",
    cultural_moment: "culture",
    technical_innovation: "technology",
    live_performance: "performance",
    career_turning_point: "reinvention",
    behind_the_scenes: "culture",
    unexpected_connection: "culture",
    custom: "culture",
  };
  return map[angle];
}

function secondaryThemeFor(angle: StoryAngleId, pkg: CollectorPackage): ThemeId | null {
  if (pkg.charts.peakHot100 != null && angle !== "breakthrough") return "chart_success";
  const perf = pkg.performances?.[0];
  if (angle !== "live_performance" && perf && /live|tv|video/i.test(perf.title)) {
    return "television";
  }
  if (pkg.songEntity?.culturalSignificance.length) return "legacy";
  return null;
}

function buildPerformanceRecommendation(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
): BlueprintPerformanceRecommendation {
  const performances = pkg.performances ?? [];
  const perfId = story.approved.performanceId ?? performances[0]?.id ?? "";
  const perf = performances.find((p) => p.id === perfId) ?? performances[0];
  const review = story.workspace.editorialReview;

  if (!perf) {
    return {
      performanceId: "",
      title: "No performance on file",
      reason: "Collector found no owned performance video for this song.",
    };
  }

  const reason =
    review?.performanceRationale?.trim() ||
    buildPerformanceRationale(perf, performances);

  const titleParts = [perf.title, perf.detectedYear != null ? String(perf.detectedYear) : null]
    .filter(Boolean)
    .join(" · ");

  return {
    performanceId: perf.id,
    title: titleParts || perf.title,
    reason,
  };
}

function buildStoryBeats(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
  angle: StoryAngleId,
): StoryBeat[] {
  const facts = acceptedFactIds(story);
  const images = approvedImageIds(story);
  const perfId = story.approved.performanceId;
  const year = songYear(pkg);
  const canonical = story.workspace.evidence.canonical;
  const beats: StoryBeat[] = [];
  let order = 0;

  const push = (
    title: string,
    description: string,
    factPatterns: RegExp[],
    priority: number,
    beatPerfId: string | null = perfId,
  ) => {
    const factIds: string[] = [];
    for (const p of factPatterns) {
      factIds.push(...pickFacts(facts, p, 2));
    }
    beats.push({
      id: stableId("beat", `${pkg.rvtr}-${order}-${title}`),
      order: order++,
      title,
      description,
      supportingFactIds: [...new Set(factIds)].slice(0, 3),
      relatedImageAssetIds: images.slice(0, 2),
      relatedPerformanceId: beatPerfId,
      priority,
    });
  };

  if (angle === "live_performance") {
    const perf = pkg.performances?.find((p) => p.id === perfId) ?? pkg.performances?.[0];
    push(
      "The performance setting",
      perf
        ? `${perf.title}${perf.detectedVenue ? ` — ${perf.detectedVenue}` : ""}${perf.detectedYear ? ` (${perf.detectedYear})` : ""}.`
        : "Establish where and when this performance took place.",
      [/venue|performance|live|tour/i],
      1,
      perf?.id ?? null,
    );
    push(
      "How the song began",
      year
        ? `Before the stage: "${pkg.title}" entered the world in ${year}.`
        : `The composition behind "${pkg.title}" — ${canonical?.songSummary ?? pkg.artist}.`,
      [/written|composed|performed by|original release/i],
      2,
    );
  } else {
    push(
      "How the song began",
      year
        ? `"${pkg.title}" — original release ${year}. ${canonical?.songSummary ?? ""}`.trim()
        : `"${pkg.title}" by ${pkg.artist} — ${canonical?.songSummary ?? "composition identity on file"}.`,
      [/written|composed|performed by|original release|debut/i],
      1,
    );
    if (pkg.recording.notes.length > 0 || canonical?.recordingSummary) {
      push(
        "Recording breakthrough",
        canonical?.recordingSummary || pkg.recording.summary || "Studio and session context.",
        [/record|studio|produced|album|session/i],
        2,
      );
    }
  }

  if (pkg.charts.peakHot100 != null) {
    push(
      "Commercial success",
      `Billboard Hot 100 peak #${pkg.charts.peakHot100}${pkg.charts.chartWeeks ? ` · ${pkg.charts.chartWeeks} weeks on chart` : ""}.`,
      [/hot 100|peaked|chart|billboard/i],
      3,
    );
  }

  const cultureNotes = pkg.culturalContext.notes.length;
  if (cultureNotes > 0 || facts.some((f) => /cultural|impact|legend|icon/i.test(f.text))) {
    push(
      "Cultural impact",
      story.workspace.evidence.culture.slice(0, 200) || "Why this song mattered beyond the charts.",
      [/cultural|impact|legend|icon|influenc|sample|cover/i],
      4,
    );
  }

  push(
    "Legacy",
    angle === "live_performance"
      ? "Why this performance still carries weight for patrons today."
      : "What listeners still take from this song — influence, memory, or return visits.",
    [/legacy|remember|still|today|influence/i],
    5,
  );

  return beats.slice(0, 6);
}

function buildKeyMoments(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
): KeyMoment[] {
  const facts = acceptedFactIds(story);
  const images = approvedImageIds(story);
  const moments: KeyMoment[] = [];

  const add = (title: string, description: string, kind: string, year: number | null, patterns: RegExp[]) => {
    moments.push({
      id: stableId("moment", `${pkg.rvtr}-${title}`),
      title,
      description,
      kind,
      year,
      supportingFactIds: patterns.flatMap((p) => pickFacts(facts, p, 1)),
      relatedImageAssetIds: images.slice(0, 1),
    });
  };

  if (pkg.charts.peakHot100 != null) {
    add(
      "Chart milestone",
      `Peaked at #${pkg.charts.peakHot100} on the Billboard Hot 100.`,
      "chart_milestone",
      songYear(pkg),
      [/hot 100|peaked|chart/i],
    );
  }

  for (const perf of (pkg.performances ?? []).slice(0, 2)) {
    if (/live aid|wembley|unplugged|grammy|tv|television|official video/i.test(perf.title + perf.virtualDjFilePath)) {
      add(
        perf.title,
        perf.detectedVenue
          ? `${perf.title} at ${perf.detectedVenue}.`
          : `Owned performance: ${perf.title}.`,
        /live/i.test(perf.title) ? "live_performance" : "music_video",
        perf.detectedYear,
        [/performance|venue|live/i],
      );
    }
  }

  const primaryPerf = pkg.performances?.find((p) => p.id === story.approved.performanceId);
  if (primaryPerf && moments.length < 2) {
    add(
      primaryPerf.title,
      story.workspace.performances[primaryPerf.id]?.recommendReason?.slice(0, 160) ||
        primaryPerf.collectorNotes.slice(0, 160),
      "featured_performance",
      primaryPerf.detectedYear,
      [/performance/i],
    );
  }

  for (const fact of facts) {
    if (moments.length >= 5) break;
    if (/drum fill|one take|improvis|lawsuit|controvers|grammy|award|sample|breakthrough|secret|infamous/i.test(fact.text)) {
      const years = fact.text.match(/\b(19|20)\d{2}\b/);
      add(
        fact.text.slice(0, 60).trim(),
        fact.text.slice(0, 180),
        "cultural_highlight",
        years ? Number(years[0]) : null,
        [new RegExp(fact.text.slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")],
      );
    }
  }

  for (const event of pkg.timelines?.performance ?? []) {
    if (moments.length >= 6) break;
    if (event.kind === "television" || event.kind === "festival") {
      add(event.label, event.detail ?? event.label, event.kind, event.year, []);
    }
  }

  return moments.slice(0, 6);
}

function buildEnding(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
  angle: StoryAngleId,
): BlueprintEndingRecommendation {
  if (pkg.charts.peakHot100 != null) {
    return {
      style: "last_chart_fact",
      description: `Close on the chart fact — #${pkg.charts.peakHot100} — as a measurable mark of reach.`,
    };
  }
  if (angle === "live_performance") {
    return {
      style: "return_to_opening",
      description: "Return to the performance moment — let the owned footage be the final image.",
    };
  }
  if (pkg.songEntity?.culturalSignificance.length) {
    return {
      style: "legacy_today",
      description: "Land on why the song still resonates — cultural significance in the present tense.",
    };
  }
  if (story.story.hook) {
    return {
      style: "return_to_opening",
      description: `Echo the opening hook: "${story.story.hook.split(/[.!?]/)[0]?.trim()}."`,
    };
  }
  return {
    style: "artist_reflection",
    description: `Leave patrons with ${pkg.artist} and "${pkg.title}" in mind — open-ended reflection.`,
  };
}

function buildOpening(story: EditorStoryPackage, angle: StoryAngleId): string {
  const hook = story.story.hook.trim();
  if (hook.length >= 30) return hook;
  return `${storyAngleLabel(angle, story.meta.storyAngleCustom)} — ${story.story.headline}`;
}

function buildClosing(
  story: EditorStoryPackage,
  ending: BlueprintEndingRecommendation,
): string {
  const summary = story.story.summary.trim();
  if (summary.length >= 40) return summary;
  return ending.description;
}

/** Build the Narrative Blueprint — Editor's creative plan for Director. */
export function buildNarrativeBlueprint(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
): NarrativeBlueprint {
  const angle = story.meta.storyAngle;
  const emotionalArc = emotionalArcFor(angle, pkg);
  const recommendedPace = paceFor(emotionalArc, angle);
  const recommendedPerformance = buildPerformanceRecommendation(pkg, story);
  const recommendedEnding = buildEnding(pkg, story, angle);
  const storyBeats = buildStoryBeats(pkg, story, angle);
  const keyMoments = buildKeyMoments(pkg, story);

  return {
    version: 1,
    opening: buildOpening(story, angle),
    closing: buildClosing(story, recommendedEnding),
    storyBeats,
    keyMoments,
    emotionalArc,
    recommendedPace,
    recommendedPerformance,
    primaryTheme: themeFor(angle),
    secondaryTheme: secondaryThemeFor(angle, pkg),
    recommendedEnding,
    generatedAt: new Date().toISOString(),
  };
}

export function attachNarrativeBlueprint(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
): EditorStoryPackage {
  return {
    ...story,
    narrativeBlueprint: buildNarrativeBlueprint(pkg, story),
  };
}

export function isBlueprintComplete(blueprint: NarrativeBlueprint | null | undefined): boolean {
  if (!blueprint) return false;
  return (
    blueprint.opening.trim().length >= 20 &&
    blueprint.closing.trim().length >= 20 &&
    blueprint.storyBeats.length >= 3 &&
    blueprint.keyMoments.length >= 1 &&
    Boolean(blueprint.recommendedPerformance.performanceId || blueprint.recommendedPerformance.reason) &&
    Boolean(blueprint.emotionalArc) &&
    Boolean(blueprint.recommendedPace) &&
    Boolean(blueprint.primaryTheme) &&
    Boolean(blueprint.recommendedEnding.description)
  );
}
