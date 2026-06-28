/**
 * Sprint 3.13 — Editorial Brain.
 * Discovers the story from Collector research; groups evidence by narrative value.
 * Client-safe — no server-only imports.
 */

import type { CollectorPackage } from "@/lib/ops/studio/collector/package-contract";

import { attachEditorialReview } from "./editorial-review";
import { storyAngleLabel } from "./editorial-constants";
import { attachNarrativeBlueprint } from "./narrative-blueprint";
import type {
  CandidateFactReview,
  DirectorCreativeBrief,
  DiscardedResearchItem,
  EditorialBrain,
  EditorialBrief,
  EvidenceBoardItem,
  EvidenceBoardSection,
  EvidenceBoardSectionId,
  EditorStoryPackage,
  MuseumExhibitStep,
  MuseumRecommendation,
  NarrativeBlueprint,
} from "./types";
import { EDITORIAL_BRAIN_VERSION } from "./types";

const ENCYCLOPEDIA =
  /is performed by|retroverse track|canonical cover|virtualdj library|owned media file|appears on the album|rvtr\d+/i;

const SECTION_META: Record<
  EvidenceBoardSectionId,
  { title: string; lead: string; pattern: RegExp }
> = {
  recording_story: {
    title: "Recording Story",
    lead: "How the track was made — studio choices, breakthroughs, and craft.",
    pattern: /record|studio|session|produce|mix|track|album|guitar|tone|homemade|multitrack|engineer|vocal/i,
  },
  chart_story: {
    title: "Chart Story",
    lead: "Chart life — peaks, runs, and commercial impact.",
    pattern: /billboard|chart|hot 100|peak|week|rank|#\d|top \d|single|hit/i,
  },
  performance_story: {
    title: "Performance Story",
    lead: "Live and broadcast moments that defined how people saw the song.",
    pattern: /live|tv|midnight|aid|concert|performance|stage|appear|video|broadcast|venue|tour/i,
  },
  artist_perspective: {
    title: "Artist Perspective",
    lead: "Quotes, interviews, and commentary in the artist's voice.",
    pattern: /quote|said|told|interview|comment|explained|remark|felt|thought|wanted|meant/i,
  },
  lyrics: {
    title: "Lyrics",
    lead: "Themes and recurring ideas — internal editorial reference.",
    pattern: /lyric|verse|chorus|line|theme|metaphor|word|meaning|sing/i,
  },
  retroverse_knowledge: {
    title: "Retroverse Knowledge",
    lead: "What Retroverse uniquely knows — chart history, library life, and graph connections.",
    pattern: /retroverse|play count|library|canonical|graph|related|year context|top 200|vdj|virtualdj/i,
  },
};

function acceptedFacts(story: EditorStoryPackage): CandidateFactReview[] {
  return story.workspace.candidateFacts.filter((f) => f.status === "accepted");
}

function categorizeFact(fact: CandidateFactReview): EvidenceBoardSectionId {
  const text = `${fact.category} ${fact.text}`;
  for (const [id, meta] of Object.entries(SECTION_META) as Array<
    [EvidenceBoardSectionId, (typeof SECTION_META)[EvidenceBoardSectionId]]
  >) {
    if (meta.pattern.test(text)) return id;
  }
  if (/chart|billboard/i.test(text)) return "chart_story";
  if (/record|studio/i.test(text)) return "recording_story";
  if (/live|performance|tv/i.test(text)) return "performance_story";
  return "artist_perspective";
}

function isNoiseFact(fact: CandidateFactReview): string | null {
  const text = fact.text.trim();
  if (text.length < 18) return "Too thin for exhibit narrative";
  if (ENCYCLOPEDIA.test(text)) return "Metadata noise — not a story beat";
  if (/^the song (was|is) (released|recorded)/i.test(text)) return "Generic release line";
  if (/^\d{4}$/.test(text)) return "Year alone — needs narrative context";
  return null;
}

function buildRetroverseItems(pkg: CollectorPackage): EvidenceBoardItem[] {
  const items: EvidenceBoardItem[] = [];
  const peak = pkg.charts?.peakHot100;
  if (peak != null) {
    items.push({
      id: "rv-chart-peak",
      text: `Billboard Hot 100 peak: #${peak}${pkg.charts.summary ? ` — ${pkg.charts.summary}` : ""}`,
      factId: null,
      sourceRef: "Retroverse charts",
      emphasis: peak <= 10 ? "primary" : "supporting",
    });
  }
  const playCount = pkg.virtualDj?.playCount ?? null;
  if (playCount != null && playCount > 0) {
    items.push({
      id: "rv-play-count",
      text: `VirtualDJ library play count: ${playCount.toLocaleString()} — signals real-world DJ rotation in Bob's collection`,
      factId: null,
      sourceRef: "Retroverse library",
      emphasis: playCount >= 50 ? "primary" : "supporting",
    });
  }
  const year = pkg.songEntity?.originalReleaseYear ?? pkg.identity?.year;
  if (year != null) {
    items.push({
      id: "rv-year-context",
      text: `Historical year context: ${year} — anchor the exhibit in its era`,
      factId: null,
      sourceRef: "Retroverse timeline",
      emphasis: "supporting",
    });
  }
  for (const artist of pkg.relationships?.relatedArtists?.slice(0, 3) ?? []) {
    items.push({
      id: `rv-related-${artist.replace(/\s+/g, "-").toLowerCase()}`,
      text: `Related in Retroverse graph: ${artist}`,
      factId: null,
      sourceRef: "Retroverse graph",
      emphasis: "supporting",
    });
  }
  if (pkg.performances?.length) {
    const perf = pkg.performances[0]!;
    items.push({
      id: "rv-owned-performance",
      text: `Owned performance on file: ${perf.title}${perf.detectedVenue ? ` (${perf.detectedVenue})` : ""}`,
      factId: null,
      sourceRef: "Retroverse media",
      emphasis: "primary",
    });
  }
  return items;
}

function buildLyricsItems(pkg: CollectorPackage): EvidenceBoardItem[] {
  const lyrics = pkg.lyrics;
  if (!lyrics?.available || !lyrics.fullText?.trim()) return [];
  const sampleLines = lyrics.fullText
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 8)
    .slice(0, 3);
  return sampleLines.map((line, i) => ({
    id: `lyrics-${i}`,
    text: line.length > 120 ? `${line.slice(0, 117)}…` : line,
    factId: null,
    sourceRef: "Lyrics artifact (internal)",
    emphasis: "supporting" as const,
  }));
}

function buildEvidenceBoard(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
  discarded: DiscardedResearchItem[],
): EvidenceBoardSection[] {
  const discardedIds = new Set(discarded.map((d) => d.id));
  const buckets = new Map<EvidenceBoardSectionId, EvidenceBoardItem[]>();

  for (const fact of acceptedFacts(story)) {
    if (discardedIds.has(fact.id)) continue;
    const sectionId = categorizeFact(fact);
    const list = buckets.get(sectionId) ?? [];
    list.push({
      id: fact.id,
      text: fact.text,
      factId: fact.id,
      sourceRef: fact.sourceRef,
      emphasis: list.length === 0 ? "primary" : "supporting",
    });
    buckets.set(sectionId, list);
  }

  buckets.set("retroverse_knowledge", [
    ...(buckets.get("retroverse_knowledge") ?? []),
    ...buildRetroverseItems(pkg),
  ]);
  buckets.set("lyrics", [...(buckets.get("lyrics") ?? []), ...buildLyricsItems(pkg)]);

  return (Object.keys(SECTION_META) as EvidenceBoardSectionId[])
    .map((id) => ({
      id,
      title: SECTION_META[id].title,
      lead: SECTION_META[id].lead,
      items: (buckets.get(id) ?? []).slice(0, 6),
    }))
    .filter((s) => s.items.length > 0);
}

function filterNoise(story: EditorStoryPackage): DiscardedResearchItem[] {
  const discarded: DiscardedResearchItem[] = [];
  const seen = new Set<string>();

  for (const fact of story.workspace.candidateFacts) {
    if (fact.status === "rejected") {
      discarded.push({ id: fact.id, text: fact.text, reason: "Editor rejected" });
      continue;
    }
    const noise = isNoiseFact(fact);
    if (noise && fact.status !== "accepted") {
      discarded.push({ id: fact.id, text: fact.text, reason: noise });
      continue;
    }
    const key = fact.text.trim().toLowerCase().slice(0, 80);
    if (seen.has(key)) {
      discarded.push({ id: fact.id, text: fact.text, reason: "Duplicate research" });
      continue;
    }
    seen.add(key);
  }

  for (const fact of acceptedFacts(story)) {
    const noise = isNoiseFact(fact);
    if (noise) discarded.push({ id: fact.id, text: fact.text, reason: noise });
  }

  return discarded;
}

function buildBrief(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
  evidenceBoard: EvidenceBoardSection[],
): EditorialBrief {
  const angle = storyAngleLabel(story.meta.storyAngle, story.meta.storyAngleCustom);
  const seed = pkg.storySeed;
  const peak = pkg.charts?.peakHot100;
  const primarySection = evidenceBoard.find((s) => s.items.some((i) => i.emphasis === "primary"));

  const cultural =
    seed?.whyItMatters?.trim() ||
    story.story.summary.trim() ||
    (peak != null
      ? `A ${peak <= 10 ? "major " : ""}chart presence that stamped ${pkg.identity?.year ?? "its era"} on the radio.`
      : "A song that still earns its place in the canon.");

  const surprising =
    evidenceBoard
      .flatMap((s) => s.items)
      .find((i) => /surpris|secret|unexpected|never|only|homemade|accident/i.test(i.text))?.text ??
    seed?.storyIdeas?.[0] ??
    "The Collector surfaced a detail worth building the exhibit around.";

  const takeaway =
    story.story.hook.trim() ||
    seed?.whyItMatters?.trim() ||
    `Why ${pkg.title} still matters to anyone who lived through its moment.`;

  return {
    primaryTheme: `${angle} — ${primarySection?.title ?? "The central story"}`,
    emotionalHook: story.story.hook.trim() || story.story.headline,
    culturalSignificance: cultural,
    whyPeopleRemember:
      peak != null
        ? `People remember the chorus, the chart run (#${peak}), and the feeling of hearing it at the right moment.`
        : "People remember how it sounded when culture was ready for it.",
    mostSurprising: surprising,
    visitorTakeaway: takeaway,
    summary: story.story.summary.trim() || cultural,
  };
}

function buildMuseumFlow(
  brief: EditorialBrief,
  evidenceBoard: EvidenceBoardSection[],
  blueprint: NarrativeBlueprint | undefined,
): MuseumRecommendation {
  const steps: MuseumExhibitStep[] = [];
  const add = (label: string, role: MuseumExhibitStep["role"], rationale: string, ids: string[] = []) => {
    steps.push({
      id: `exhibit-${steps.length + 1}`,
      label,
      role,
      rationale,
      linkedFactIds: ids,
    });
  };

  add("Opening", "opening", brief.emotionalHook || "Hook the visitor immediately", []);

  const sectionOrder: Array<[EvidenceBoardSectionId, string]> = [
    ["recording_story", "Recording Story"],
    ["chart_story", "Chart Explosion"],
    ["performance_story", "Performance"],
    ["artist_perspective", "Artist Voice"],
    ["lyrics", "Song DNA"],
    ["retroverse_knowledge", "Retroverse Legacy"],
  ];

  for (const [id, fallbackLabel] of sectionOrder) {
    const section = evidenceBoard.find((s) => s.id === id);
    if (!section?.items.length) continue;
    add(
      section.title || fallbackLabel,
      "body",
      section.lead,
      section.items.map((i) => i.factId).filter(Boolean) as string[],
    );
  }

  if (blueprint?.storyBeats.length) {
    for (const beat of blueprint.storyBeats.slice(0, 3)) {
      if (steps.some((s) => s.label === beat.title)) continue;
      add(beat.title, "body", beat.description, beat.supportingFactIds);
    }
  }

  add(
    "Closing",
    "closing",
    blueprint?.closing || brief.visitorTakeaway,
    [],
  );

  return {
    headline: brief.primaryTheme,
    exhibitFlow: steps.slice(0, 10),
  };
}

function buildDirectorBrief(
  brief: EditorialBrief,
  museum: MuseumRecommendation,
  evidenceBoard: EvidenceBoardSection[],
  blueprint: NarrativeBlueprint | undefined,
  pkg: CollectorPackage,
): DirectorCreativeBrief {
  const keyEvidence = evidenceBoard
    .flatMap((s) => s.items.filter((i) => i.emphasis === "primary").map((i) => i.text))
    .slice(0, 6);

  const quotes = evidenceBoard
    .find((s) => s.id === "artist_perspective")
    ?.items.map((i) => i.text)
    .slice(0, 2) ?? [];

  const visuals = [
    pkg.visualAssets?.coverUrl ? "Cover artwork — hero candidate" : null,
    (pkg.performances?.length ?? 0) > 0 ? "Performance frames from owned video" : null,
    pkg.charts?.peakHot100 != null ? "Chart journey visualization" : null,
  ].filter(Boolean) as string[];

  return {
    theme: brief.primaryTheme,
    openingHook: brief.emotionalHook,
    emotionalArc: blueprint?.emotionalArc ?? "discovery",
    keySupportingEvidence: keyEvidence,
    recommendedExhibitOrder: museum.exhibitFlow.map((s) => s.label),
    closingTakeaway: brief.visitorTakeaway,
    retroverseMoments: evidenceBoard
      .find((s) => s.id === "retroverse_knowledge")
      ?.items.map((i) => i.text)
      .slice(0, 5) ?? [],
    visualOpportunities: visuals,
    quoteOpportunities: quotes,
    songDnaDirection:
      evidenceBoard.find((s) => s.id === "lyrics")?.items[0]?.text ??
      (pkg.lyrics?.available ? "Lyrics themes available for Song DNA exhibit" : null),
  };
}

export function buildEditorialBrain(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
): EditorialBrain {
  const discarded = filterNoise(story);
  const discardedIds = new Set(discarded.map((d) => d.id));
  const evidenceBoard = buildEvidenceBoard(pkg, story, discarded);
  const brief = buildBrief(pkg, story, evidenceBoard);
  const museumRecommendation = buildMuseumFlow(
    brief,
    evidenceBoard,
    story.narrativeBlueprint,
  );
  const directorBrief = buildDirectorBrief(
    brief,
    museumRecommendation,
    evidenceBoard,
    story.narrativeBlueprint,
    pkg,
  );

  const promotedFactIds = acceptedFacts(story)
    .filter((f) => !discardedIds.has(f.id))
    .map((f) => f.id);

  return {
    version: EDITORIAL_BRAIN_VERSION,
    generatedAt: new Date().toISOString(),
    brief,
    evidenceBoard,
    discarded,
    promotedFactIds,
    museumRecommendation,
    directorBrief,
  };
}

export function formatDirectorBriefForNotes(brief: DirectorCreativeBrief): string {
  return [
    "Director Brief (Editorial Brain)",
    `Theme: ${brief.theme}`,
    `Opening: ${brief.openingHook}`,
    `Arc: ${brief.emotionalArc}`,
    `Closing: ${brief.closingTakeaway}`,
    brief.keySupportingEvidence.length
      ? `Key evidence: ${brief.keySupportingEvidence.join(" · ")}`
      : null,
    brief.retroverseMoments.length
      ? `Retroverse highlights: ${brief.retroverseMoments.join(" · ")}`
      : null,
    `Exhibit order: ${brief.recommendedExhibitOrder.join(" → ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function attachEditorialBrain(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
): EditorStoryPackage {
  const brain = buildEditorialBrain(pkg, story);
  return { ...story, editorialBrain: brain };
}

/** Recompute review, blueprint, and editorial brain after workspace edits. */
export function refreshEditorDerivedState(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
): EditorStoryPackage {
  return attachEditorialBrain(
    pkg,
    attachNarrativeBlueprint(pkg, attachEditorialReview(pkg, story)),
  );
}

/** Fact IDs Director should receive when Editorial Brain is present. */
export function directorPromotedFactIds(story: EditorStoryPackage): string[] | null {
  const ids = story.editorialBrain?.promotedFactIds;
  return ids?.length ? ids : null;
}
