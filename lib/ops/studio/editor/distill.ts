import "server-only";

import { createHash, randomUUID } from "crypto";

import { confidenceLabel } from "@/lib/ops/studio/collector/package-finalize";
import { derivePerformances } from "@/lib/ops/studio/collector/package-archive";
import type {
  CollectorPackage,
  CollectorPerformance,
  CollectorCanonicalModel,
} from "@/lib/ops/studio/collector/package-contract";
import type { CollectorResearchFact, CollectorTimelineEvent } from "@/lib/ops/studio/collector/types";
import { buildCanonicalModel, primaryNarrativeYear } from "@/lib/ops/studio/collector/identity-resolution";

import {
  attachEditorialReview,
  buildPerformanceRationale,
} from "./editorial-review";
import { attachNarrativeBlueprint } from "./narrative-blueprint";
import { visualAssetUrl } from "@/lib/ops/studio/collector/visual-asset-url";

import {
  EDITOR_DISTILL_VERSION,
  EDITOR_STORY_VERSION,
  type CandidateFactReview,
  type EditorNote,
  type EditorStoryPackage,
  type ImageBoardItem,
  type ImageBoardRole,
  type PerformanceWorkspace,
  type PlannedCard,
  type StoryIdea,
  type StoryAngleId,
  type TimelineEvent,
} from "./types";

export const DISTILL_LIMITS = {
  approvedFacts: 7,
  storyIdeas: 8,
  quotes: 5,
  images: 6,
  autoPromotedFacts: 0,
} as const;

const RVTR_PATTERN = /\bRVTR\d{6}\b/gi;
const FILE_PATH_PATTERN =
  /(?:\/Users\/|\/DJ MEDIA\/|\\|[A-Z]:\\)[^\s]+|\.(?:mp4|mp3|m4a|wav|flac)\b/gi;
const VDJ_NOISE =
  /virtualdj|vdj-only|play count|playcount|owned media file|rotation signal|library item/i;
const GRAPH_NOISE = /graph linkage|graph pending|not yet linked|canonical — locked/i;

type RankedFact = {
  id: string;
  text: string;
  score: number;
  source: string;
  category: string;
  confidence: number;
};

function stableId(prefix: string, seed: string): string {
  const hash = createHash("sha256").update(seed).digest("hex").slice(0, 12);
  return `${prefix}-${hash}`;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function isNoiseFact(text: string): boolean {
  const t = text.trim();
  if (t.length < 12) return true;
  if (RVTR_PATTERN.test(t)) return true;
  if (FILE_PATH_PATTERN.test(t)) return true;
  if (/^retroverse track identity/i.test(t)) return true;
  if (/^[\d\s·plays:]+$/i.test(t)) return true;
  if (/is performed by .+\.$/i.test(t) && t.length < 80) return true;
  return false;
}

function isVdjMetadata(text: string): boolean {
  return VDJ_NOISE.test(text) && !/discovered|executive produced|chart|billboard/i.test(text);
}

function categoryScore(category: string): number {
  switch (category) {
    case "cultural_impact":
      return 90;
    case "chart":
      return 85;
    case "recording":
      return 75;
    case "artist":
      return 60;
    case "video":
      return 40;
    case "trivia":
      return 25;
    default:
      return 50;
  }
}

function dedupeParagraphs(paragraphs: string[]): string[] {
  const seen = new Set<string>();
  return paragraphs.filter((p) => {
    const key = normalizeText(p).slice(0, 120);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeTexts(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = normalizeText(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}

function rankFacts(facts: CollectorResearchFact[]): RankedFact[] {
  return facts
    .map((fact) => {
      let score = categoryScore(fact.category) + Math.round(fact.confidence * 20);
      if (fact.approvalStatus === "approved") score += 60;
      if (isNoiseFact(fact.text)) score = 0;
      if (/^retroverse track identity/i.test(fact.text)) score = 0;
      if (isVdjMetadata(fact.text) && fact.approvalStatus !== "approved") {
        score = Math.min(score, 15);
      }
      if (GRAPH_NOISE.test(fact.text) && fact.approvalStatus !== "approved") score = 0;
      return {
        id: fact.id,
        text: fact.text.trim(),
        score,
        source: fact.source,
        category: fact.category,
        confidence: fact.confidence,
      };
    })
    .filter((f) => f.score > 0 && f.text.length >= 12)
    .sort((a, b) => b.score - a.score);
}

function cleanParagraph(text: string): string {
  return text
    .replace(RVTR_PATTERN, "")
    .replace(FILE_PATH_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildEvidenceRecording(pkg: CollectorPackage): string {
  const notes = dedupeParagraphs(pkg.recording.notes.map(cleanParagraph).filter(Boolean));
  const summary = cleanParagraph(pkg.recording.summary);
  if (notes.length === 0) return summary;
  return [summary, ...notes.slice(0, 4)].filter(Boolean).join("\n\n");
}

function buildEvidenceCharts(pkg: CollectorPackage): string {
  const parts: string[] = [];
  const { charts } = pkg;
  if (charts.peakHot100 != null) {
    parts.push(`Peaked at #${charts.peakHot100} on the Billboard Hot 100.`);
  }
  if (charts.chartWeeks != null) parts.push(`Chart run: ${charts.chartWeeks} weeks on chart.`);
  if (charts.albumTitle) parts.push(`Album: ${charts.albumTitle}.`);
  const summary = charts.summary?.trim();
  if (summary && summary !== "No chart history in graph") parts.push(summary);
  return parts.join("\n\n");
}

function buildEvidenceCulture(pkg: CollectorPackage): string {
  const notes = dedupeParagraphs(pkg.culturalContext.notes.map(cleanParagraph).filter(Boolean));
  const summary = cleanParagraph(pkg.culturalContext.summary);
  if (notes.length === 0) return summary;
  return dedupeParagraphs([summary, ...notes.slice(0, 3)].filter(Boolean)).join("\n\n");
}

function buildEvidenceRelationships(pkg: CollectorPackage): string {
  const artists = pkg.relationships.relatedArtists.filter(Boolean);
  if (artists.length === 0) return pkg.relationships.summary ?? "";
  return `Related artists: ${artists.join(", ")}.`;
}

function resolveCanonical(
  pkg: CollectorPackage,
  performances: CollectorPerformance[],
): CollectorCanonicalModel {
  if (pkg.canonical) return pkg.canonical;
  return buildCanonicalModel(pkg, performances);
}

function timelineToEditorEvents(events: CollectorTimelineEvent[]): TimelineEvent[] {
  return events.map((e) => ({
    date: e.year != null ? String(e.year) : "—",
    label: e.label,
  }));
}

function songReleaseYear(pkg: CollectorPackage, canonical: CollectorCanonicalModel): number | null {
  return canonical.song.originalReleaseYear ?? pkg.identity.year;
}

function buildEntityEvidence(
  pkg: CollectorPackage,
  canonical: CollectorCanonicalModel,
  storyAngle: StoryAngleId,
): EditorStoryPackage["workspace"]["evidence"]["canonical"] {
  const song = canonical.song;
  const primaryRec =
    canonical.recordings.find((r) => r.kind === "original_studio") ?? canonical.recordings[0];
  const primaryPerf = canonical.performances[0];

  const songSummary = [
    `${song.artist} — "${song.title}"`,
    song.originalReleaseYear != null ? `Original release ${song.originalReleaseYear}` : null,
    song.originalAlbum ? `Album: ${song.originalAlbum}` : null,
    song.peakHot100 != null ? `Hot 100 peak #${song.peakHot100}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const recordingSummary = primaryRec
    ? [
        primaryRec.title,
        primaryRec.releaseDate != null ? `Release ${primaryRec.releaseDate}` : null,
        primaryRec.isCompilation ? "Compilation edition" : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : pkg.recording.summary;

  const performanceSummary = primaryPerf
    ? [
        primaryPerf.title,
        primaryPerf.performanceYear != null ? String(primaryPerf.performanceYear) : null,
        primaryPerf.venue,
        primaryPerf.event,
      ]
        .filter(Boolean)
        .join(" · ")
    : pkg.videoPerformance.summary;

  const yr = canonical.yearResolution;
  const yearResolution = [
    yr.songRelease.year != null ? `Song ${yr.songRelease.year}` : null,
    yr.recordingRelease.year != null ? `Recording ${yr.recordingRelease.year}` : null,
    yr.primaryPerformance?.year != null ? `Performance ${yr.primaryPerformance.year}` : null,
    ...yr.notes,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    songSummary,
    recordingSummary,
    performanceSummary,
    primaryNarrativeYear: primaryNarrativeYear(canonical, storyAngle),
    yearResolution,
  };
}

function buildTimelineForAngle(
  pkg: CollectorPackage,
  canonical: CollectorCanonicalModel,
  storyAngle: StoryAngleId,
): {
  primary: TimelineEvent[];
  song: TimelineEvent[];
  recording: TimelineEvent[];
  performance: TimelineEvent[];
} {
  const songTl = timelineToEditorEvents(canonical.timelines.song);
  const recordingTl = timelineToEditorEvents(canonical.timelines.recording);
  const performanceTl = timelineToEditorEvents(canonical.timelines.performance);

  let primary: TimelineEvent[] = songTl;
  switch (storyAngle) {
    case "live_performance":
      primary = performanceTl.length > 0 ? performanceTl : songTl;
      break;
    case "technical_innovation":
      primary = recordingTl.length > 0 ? recordingTl : songTl;
      break;
    case "career_turning_point":
      primary = songTl;
      break;
    default:
      primary = songTl.length > 0 ? songTl : recordingTl;
  }

  if (primary.length === 0) {
    primary = buildTimelineLegacy(pkg, canonical);
  }

  return { primary, song: songTl, recording: recordingTl, performance: performanceTl };
}

function buildTimelineLegacy(
  pkg: CollectorPackage,
  canonical: CollectorCanonicalModel,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const songYear = songReleaseYear(pkg, canonical);
  if (songYear != null) {
    events.push({ date: String(songYear), label: `${pkg.title} — song original release` });
  }
  const recYear = canonical.yearResolution.recordingRelease.year;
  if (recYear != null && recYear !== songYear) {
    events.push({
      date: String(recYear),
      label: `${canonical.yearResolution.recordingRelease.label}`,
    });
  }
  if (pkg.charts.peakHot100 != null) {
    events.push({
      date: songYear != null ? String(songYear) : "—",
      label: `Billboard Hot 100 peak — #${pkg.charts.peakHot100}`,
    });
  }
  return events.slice(0, 8);
}

function generateHeadline(pkg: CollectorPackage, canonical: CollectorCanonicalModel): string {
  const { title } = pkg;
  const songYear = songReleaseYear(pkg, canonical);
  if (pkg.charts.peakHot100 != null && pkg.charts.peakHot100 <= 10) {
    return `When ${title} Reached the Top Ten`;
  }
  if (songYear != null) {
    return `${title} — A ${songYear} Story`;
  }
  return `${pkg.artist} and the Story of "${title}"`;
}

function generateSubtitle(pkg: CollectorPackage, canonical: CollectorCanonicalModel): string {
  const songYear = songReleaseYear(pkg, canonical);
  if (songYear != null && pkg.charts.peakHot100 != null) {
    return `How ${pkg.artist} landed a #${pkg.charts.peakHot100} hit in ${songYear}`;
  }
  if (songYear != null) {
    return `The ${songYear} chapter of ${pkg.artist}'s catalog`;
  }
  const perfYear = canonical.yearResolution.primaryPerformance?.year;
  if (perfYear != null) {
    return `A ${perfYear} performance chapter of ${pkg.artist}'s "${pkg.title}"`;
  }
  return `An editorial portrait of ${pkg.artist}'s "${pkg.title}"`;
}

function generateHook(
  pkg: CollectorPackage,
  canonical: CollectorCanonicalModel,
  topFact: RankedFact | null,
): string {
  if (topFact && topFact.text.length <= 200) {
    const sentence = topFact.text.split(/[.!?]/)[0]?.trim();
    if (sentence && sentence.length >= 30 && !/compilation anchor|graph compilation/i.test(sentence)) {
      return `${sentence}.`;
    }
  }
  const songYear = songReleaseYear(pkg, canonical);
  if (songYear != null) {
    return `${pkg.artist}'s "${pkg.title}" — original release ${songYear}.`;
  }
  const perf = canonical.yearResolution.primaryPerformance;
  if (perf?.year != null) {
    return `${pkg.artist}'s "${pkg.title}" — ${perf.label} (${perf.year}).`;
  }
  return `${pkg.artist}'s "${pkg.title}" deserves a closer look than the credits alone.`;
}

function generateSummary(
  pkg: CollectorPackage,
  canonical: CollectorCanonicalModel,
  ranked: RankedFact[],
): string {
  const parts: string[] = [];
  parts.push(
    `${pkg.artist}'s "${pkg.title}" sits at the intersection of performance history and cultural memory.`,
  );
  const cultural = ranked.find((f) => f.category === "cultural_impact");
  if (cultural) {
    parts.push(`${cultural.text.split(/[.!?]/)[0]}.`);
  } else if (songReleaseYear(pkg, canonical) != null) {
    parts.push(
      `The ${songReleaseYear(pkg, canonical)} recording remains a touchstone in the Retroverse library.`,
    );
  }
  return parts.slice(0, 3).join(" ");
}

function generateFullStory(
  pkg: CollectorPackage,
  canonical: CollectorCanonicalModel,
  ranked: RankedFact[],
  recording: string,
  culture: string,
): string {
  const songYear = songReleaseYear(pkg, canonical);
  const paragraphs: string[] = [];
  paragraphs.push(
    `${pkg.artist}'s "${pkg.title}"${songYear ? ` (original release ${songYear})` : ""} opens a window into a specific era of popular music — not only as a recording, but as a cultural artifact worth interpreting.`,
  );

  const recYear = canonical.yearResolution.recordingRelease.year;
  if (recYear != null && recYear !== songYear) {
    paragraphs.push(
      `A separate recording edition on file: ${canonical.yearResolution.recordingRelease.label} (${recYear}).`,
    );
  }

  for (const fact of ranked
    .filter((f) => f.category === "cultural_impact" || f.category === "recording")
    .filter((f) => !/compilation anchor|virtualdj library play count/i.test(f.text))
    .slice(0, 3)) {
    paragraphs.push(fact.text);
  }

  const cultureLead = culture.split("\n\n").find((p) => p.length > 60);
  if (
    cultureLead &&
    !paragraphs.some((p) => normalizeText(p).includes(normalizeText(cultureLead).slice(0, 40)))
  ) {
    paragraphs.push(cultureLead);
  }

  const recordingLead = recording.split("\n\n").find((p) => p.length > 60 && !VDJ_NOISE.test(p));
  if (
    recordingLead &&
    !paragraphs.some((p) => normalizeText(p).includes(normalizeText(recordingLead).slice(0, 40)))
  ) {
    paragraphs.push(recordingLead);
  }

  if (pkg.charts.peakHot100 != null) {
    paragraphs.push(
      `On the Billboard Hot 100, the song climbed to #${pkg.charts.peakHot100}${pkg.charts.chartWeeks ? ` across ${pkg.charts.chartWeeks} weeks` : ""} — a measurable mark of its reach.`,
    );
  }

  return dedupeParagraphs(paragraphs.map(cleanParagraph)).slice(0, 5).join("\n\n");
}

function recommendPerformance(
  performances: CollectorPerformance[],
): { id: string; reason: string } | null {
  if (performances.length === 0) return null;
  const sorted = [...performances].sort((a, b) => b.qualityScore - a.qualityScore);
  const best = sorted[0]!;
  const reason = buildPerformanceRationale(best, performances);
  return { id: best.id, reason };
}

function buildPerformanceWorkspace(
  perf: CollectorPerformance,
  rvtr: string,
  recommended: boolean,
  recommendReason: string,
): PerformanceWorkspace {
  const observations = dedupeTexts(
    perf.facts.filter((f) => !isNoiseFact(f) && !VDJ_NOISE.test(f)),
  ).slice(0, 5);

  return {
    performanceId: perf.id,
    notes: recommended
      ? `Recommended cut — ${recommendReason}.`
      : cleanParagraph(perf.collectorNotes),
    venue: perf.detectedVenue ?? "",
    year: perf.detectedYear,
    observations,
    screenshots: perf.visualAssets.extraction.assets.slice(0, DISTILL_LIMITS.images).map((asset) => ({
      assetId: asset.id,
      label: asset.category,
      imageUrl: visualAssetUrl(rvtr, asset.filename),
      caption: asset.selectionReason ?? "",
      approved: recommended && (asset.category === "Hero" || asset.category === "Performance"),
    })),
    recommended,
    recommendReason,
  };
}

function factToStoryIdea(fact: RankedFact, kind: StoryIdea["kind"]): StoryIdea {
  return {
    id: stableId("idea", fact.id),
    kind,
    title: kind === "card" ? "Story Card" : kind === "quote" ? "Quote" : "Visual Moment",
    body: fact.text,
    status: "suggested",
  };
}

function buildStoryIdeas(
  pkg: CollectorPackage,
  canonical: CollectorCanonicalModel,
  ranked: RankedFact[],
): EditorStoryPackage["workspace"]["storyIdeas"] {
  const cards: StoryIdea[] = [];
  const quotes: StoryIdea[] = [];
  const songYear = songReleaseYear(pkg, canonical);

  if (pkg.charts.peakHot100 != null) {
    cards.push({
      id: stableId("card", "hot100"),
      kind: "card",
      title: "Chart Peak",
      body: `#${pkg.charts.peakHot100} on the Billboard Hot 100`,
      status: "suggested",
    });
  }
  if (songYear != null) {
    cards.push({
      id: stableId("card", "year"),
      kind: "card",
      title: "Song Original Release",
      body: String(songYear),
      status: "suggested",
    });
  }
  const recYear = canonical.yearResolution.recordingRelease.year;
  if (recYear != null && recYear !== songYear) {
    cards.push({
      id: stableId("card", "recording-year"),
      kind: "card",
      title: "Recording Edition",
      body: `${canonical.yearResolution.recordingRelease.label} (${recYear})`,
      status: "suggested",
    });
  }

  for (const fact of ranked) {
    if (cards.length + quotes.length >= DISTILL_LIMITS.storyIdeas) break;
    if (fact.category === "cultural_impact" && quotes.length < DISTILL_LIMITS.quotes) {
      if (fact.text.length >= 40 && fact.text.length <= 280) {
        quotes.push(factToStoryIdea(fact, "quote"));
      }
    } else if (cards.length < DISTILL_LIMITS.storyIdeas) {
      cards.push(factToStoryIdea(fact, "card"));
    }
  }

  return {
    cards: cards.slice(0, DISTILL_LIMITS.storyIdeas),
    visualMoments: [],
    quotes: quotes.slice(0, DISTILL_LIMITS.quotes),
    animations: [],
    transitions: [],
  };
}

function buildEditorialQuestions(pkg: CollectorPackage): EditorNote[] {
  return pkg.missingAreas.map((area, i) => ({
    id: stableId("q", `${area}-${i}`),
    text: `What is the definitive story behind: ${area}?`,
  }));
}

function buildMissingNotes(pkg: CollectorPackage): EditorNote[] {
  return pkg.missingAreas.map((area, i) => ({
    id: stableId("missing", `${area}-${i}`),
    text: area,
  }));
}

function buildCandidateFacts(facts: CollectorResearchFact[]): CandidateFactReview[] {
  const ranked = rankFacts(facts);
  const approvalById = new Map(facts.map((f) => [f.id, f.approvalStatus]));
  return ranked.slice(0, 20).map((f) => ({
    id: f.id,
    text: f.text,
    sourceRef: f.source,
    category: f.category,
    status: approvalById.get(f.id) === "approved" ? "accepted" : "pending",
  }));
}

function parseStoryAngle(seed: string | undefined): StoryAngleId {
  const allowed: StoryAngleId[] = [
    "breakthrough",
    "personal_story",
    "cultural_moment",
    "technical_innovation",
    "live_performance",
    "career_turning_point",
    "behind_the_scenes",
    "unexpected_connection",
    "custom",
  ];
  if (seed && allowed.includes(seed as StoryAngleId)) return seed as StoryAngleId;
  return "cultural_moment";
}

function buildConfidenceWeakAreas(pkg: CollectorPackage): EditorNote[] {
  const c = pkg.confidence;
  if (!c) return [];
  const domains: Array<[string, number]> = [
    ["Identity", c.identity],
    ["Recording", c.recording],
    ["Charts", c.charts],
    ["Performance", c.performance],
    ["Culture", c.culture],
    ["Relationships", c.relationships],
  ];
  return domains
    .filter(([, score]) => score < 55)
    .map(([label, score], i) => ({
      id: stableId("conf", `${label}-${i}`),
      text: `${label} confidence ${confidenceLabel(score)} (${score}%) — needs editorial attention`,
    }));
}

function roleFromLabel(label: string): ImageBoardRole {
  const lower = label.toLowerCase();
  if (lower.includes("hero")) return "hero";
  if (lower.includes("performance")) return "performance";
  if (lower.includes("close")) return "close-up";
  if (lower.includes("alternate")) return "alternate";
  return "supporting";
}

function buildImageBoard(
  performances: CollectorPerformance[],
  perfWorkspaces: Record<string, PerformanceWorkspace>,
  rvtr: string,
): ImageBoardItem[] {
  const items: ImageBoardItem[] = [];
  let order = 0;
  for (const perf of performances) {
    for (const shot of perfWorkspaces[perf.id]?.screenshots ?? []) {
      if (items.length >= DISTILL_LIMITS.images) break;
      items.push({
        assetId: shot.assetId,
        imageUrl: shot.imageUrl,
        caption: shot.caption,
        label: shot.label,
        role: roleFromLabel(shot.label),
        order: order++,
        approved: shot.approved,
        performanceId: perf.id,
      });
    }
  }
  return items;
}

function buildPlannedCards(
  pkg: CollectorPackage,
  ranked: RankedFact[],
): PlannedCard[] {
  const cards: PlannedCard[] = [];
  let order = 0;

  if (pkg.recording.summary) {
    cards.push({
      id: stableId("pcard", "recording"),
      title: "Recording Story",
      body: pkg.recording.summary,
      approved: false,
      hidden: false,
      priority: 1,
      order: order++,
    });
  }
  if (pkg.charts.peakHot100 != null) {
    cards.push({
      id: stableId("pcard", "chart"),
      title: "Chart History",
      body: `Hot 100 peak #${pkg.charts.peakHot100}`,
      approved: false,
      hidden: false,
      priority: 1,
      order: order++,
    });
  }
  for (const fact of ranked.slice(0, 6)) {
    if (cards.length >= DISTILL_LIMITS.storyIdeas) break;
    cards.push({
      id: stableId("pcard", fact.id),
      title: fact.category.replace(/_/g, " "),
      body: fact.text.slice(0, 120),
      approved: false,
      hidden: false,
      priority: 0,
      order: order++,
    });
  }
  return cards;
}

/** Distill CollectorPackage into Editor v2 package. */
export function distillCollectorPackage(pkg: CollectorPackage): EditorStoryPackage {
  const rvtr = pkg.rvtr.trim().toUpperCase();
  const performances =
    pkg.performances && pkg.performances.length > 0
      ? pkg.performances
      : derivePerformances(pkg);
  const canonical = resolveCanonical(pkg, performances);
  const ranked = rankFacts(pkg.candidateFacts);
  const seed = pkg.storySeed;
  const storyAngle = parseStoryAngle(seed?.suggestedAngle);

  const recording = buildEvidenceRecording(pkg);
  const charts = buildEvidenceCharts(pkg);
  const culture = buildEvidenceCulture(pkg);
  const relationships = buildEvidenceRelationships(pkg);
  const timelines = buildTimelineForAngle(pkg, canonical, storyAngle);
  const entityEvidence = buildEntityEvidence(pkg, canonical, storyAngle);

  const recommendation = recommendPerformance(performances);
  const perfWorkspaces: Record<string, PerformanceWorkspace> = {};
  for (const perf of performances) {
    const isRec = recommendation?.id === perf.id;
    perfWorkspaces[perf.id] = buildPerformanceWorkspace(
      perf,
      rvtr,
      isRec,
      isRec ? (recommendation?.reason ?? "") : "",
    );
  }

  const candidateFacts = buildCandidateFacts(pkg.candidateFacts);
  const approvedFactReviews = candidateFacts.filter((f) => f.status === "accepted");
  const plannedCards = buildPlannedCards(pkg, ranked);
  const imageBoard = buildImageBoard(performances, perfWorkspaces, rvtr);
  const storyIdeas = buildStoryIdeas(pkg, canonical, ranked.slice(0, 8));

  if (seed?.storyIdeas.length) {
    for (const idea of seed.storyIdeas) {
      if (storyIdeas.cards.length >= DISTILL_LIMITS.storyIdeas) break;
      storyIdeas.cards.push({
        id: stableId("seed-card", idea),
        kind: "card",
        title: "Collector seed",
        body: idea,
        status: "suggested",
      });
    }
  }

  const approvedImages: EditorStoryPackage["approved"]["images"] = imageBoard
    .filter((i) => i.approved)
    .map((i) => ({
      assetId: i.assetId,
      caption: i.caption,
      imageUrl: i.imageUrl,
      performanceId: i.performanceId,
    }));

  const topApproved = ranked.find((f) =>
    pkg.candidateFacts.some((cf) => cf.id === f.id && cf.approvalStatus === "approved"),
  );

  const confidenceWeakAreas = buildConfidenceWeakAreas(pkg);

  const draft: EditorStoryPackage = {
    story: {
      headline: generateHeadline(pkg, canonical),
      subtitle: generateSubtitle(pkg, canonical),
      hook: seed?.whyItMatters ?? generateHook(pkg, canonical, topApproved ?? ranked[0] ?? null),
      summary: seed?.strongestFacts.length
        ? seed.strongestFacts.slice(0, 2).join(" ")
        : generateSummary(pkg, canonical, ranked),
      fullStory: generateFullStory(pkg, canonical, ranked, recording, culture),
    },
    approved: {
      facts: approvedFactReviews.slice(0, DISTILL_LIMITS.approvedFacts).map((f) => ({
        id: f.id,
        text: f.text,
        sourceRef: f.sourceRef,
      })),
      cards: [],
      images: approvedImages,
      quotes: [],
      performanceId: recommendation?.id ?? performances[0]?.id ?? null,
    },
    workspace: {
      storyIdeas,
      editorialNotes: {
        questions: buildEditorialQuestions(pkg),
        missing: buildMissingNotes(pkg),
        factChecks: ranked
          .filter((f) => f.confidence < 0.8)
          .slice(0, 5)
          .map((f) => ({
            id: stableId("fc", f.id),
            text: `Verify: ${f.text.slice(0, 120)}… (${f.source})`,
          })),
        weakAreas: [
          ...confidenceWeakAreas,
          ...pkg.identityNotes.slice(0, 4).map((note, i) => ({
            id: stableId("weak", `${note}-${i}`),
            text: note,
          })),
        ],
      },
      evidence: {
        recording,
        charts,
        culture,
        timeline: timelines.primary,
        relationships,
        songTimeline: timelines.song,
        recordingTimeline: timelines.recording,
        performanceTimeline: timelines.performance,
        canonical: entityEvidence,
      },
      performances: perfWorkspaces,
      candidateFacts,
      plannedCards,
      imageBoard,
    },
    meta: {
      version: EDITOR_STORY_VERSION,
      rvtr,
      collectorCompletedAt: pkg.completedAt,
      distillVersion: EDITOR_DISTILL_VERSION,
      updatedAt: new Date().toISOString(),
      editorialStatus: approvedFactReviews.length >= 3 ? "in_progress" : "distilling",
      storyAngle,
      storyAngleCustom: null,
      lastRewriteAt: null,
      storyManuallyEdited: false,
      collectorConfidence: pkg.confidence ?? null,
      directorHandoff: {
        submittedAt: null,
        notes: pkg.confidence
          ? `Collector confidence: ${confidenceLabel(pkg.confidence.overall)} (${pkg.confidence.overall}%)`
          : "",
        checklist: {
          story: (seed?.whyItMatters.length ?? 0) >= 40,
          facts: approvedFactReviews.length >= 3,
          cards: false,
          images: approvedImages.length > 0,
          performance: performances.length > 0,
        },
      },
    },
  };

  return attachNarrativeBlueprint(pkg, attachEditorialReview(pkg, draft));
}

export function newEditorNoteId(): string {
  return randomUUID();
}
