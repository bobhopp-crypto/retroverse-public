import type { ChartArchetype } from "@/lib/chart-journey/chart-archetype";
import { detectChartArchetype } from "@/lib/chart-journey/chart-archetype";
import { buildChartJourney } from "@/lib/chart-journey/build-chart-journey";
import type { TimelineEvent } from "@/lib/ops/intelligence/song-package-types";
import type { TrackPageData } from "@/lib/track/load-track-page";

import type { ExperienceChapter, ExperienceChapterKind } from "./experience-types";
import type { StoryClusterKey } from "./story-cluster";

export type NarrativeRole = "opening" | "middle" | "ending" | "optional";

export type DirectorChapterMeta = {
  id: string;
  kind: ExperienceChapterKind;
  title: string;
  directorScore: number;
  role: NarrativeRole;
  storyKey?: StoryClusterKey | string;
  chartArchetype?: ChartArchetype | null;
};

export type DirectorPlan = {
  openingId: string;
  openingTitle: string;
  openingKind: ExperienceChapterKind;
  majorIds: string[];
  optionalIds: string[];
  chapters: DirectorChapterMeta[];
  chartArchetype: ChartArchetype | null;
};

const MAX_MAJOR = 4;
const MIN_MAJOR = 2;

type ContentSignal = {
  pattern: RegExp;
  score: number;
  label?: string;
};

const STORY_SIGNALS: ContentSignal[] = [
  { pattern: /\blive aid\b/i, score: 120 },
  { pattern: /\bwoodstock\b/i, score: 115 },
  { pattern: /\bcultural impact\b|\biconic\b|\banthem\b|\bcraze\b|\bparticipation\b/i, score: 110 },
  { pattern: /\brecord(ed|ing)\b|\bstudio session\b|\bproduced by\b|\brare session\b/i, score: 100 },
  { pattern: /\bguitar solo\b|\bguitar sound\b|\biconic riff\b|\biconic sound\b/i, score: 95 },
  { pattern: /\bmusic video\b|\bmtv\b|\bdirector\b|\bfilmed the video\b/i, score: 90 },
  { pattern: /\bchart anomaly\b|\bunexpected hit\b|\bsleeper\b/i, score: 80 },
  { pattern: /\bcover(ed)? by\b|\binfluenced by\b|\binspired by\b/i, score: 70 },
  { pattern: /\bmovie\b|\bfilm\b|\bsoundtrack\b|\btv appearance\b|\btelevision\b/i, score: 50 },
  { pattern: /\bgrammy\b|\baward\b|\bnomination\b/i, score: 40 },
  { pattern: /\bsummer\b|\bsummertime\b|\bseason\b/i, score: 55, label: "Summer Anthem" },
  { pattern: /\bdance\b|\bmacarena\b|\bline dance\b/i, score: 65, label: "Dance Craze" },
  { pattern: /\bcrowd\b|\baudience\b|\bsingalong\b|\bparticipation\b/i, score: 75, label: "Crowd Participation" },
];

const CLUSTER_BASE: Partial<Record<StoryClusterKey, number>> = {
  cultural: 85,
  recording: 80,
  video: 75,
  performance: 70,
  tv_film: 68,
  legacy: 55,
  general: 60,
  album: 45,
  chart: 40,
};

const ARCHETYPE_CHART_BOOST: Partial<Record<ChartArchetype, number>> = {
  rocket: 90,
  instant_smash: 92,
  slow_burner: 78,
  sleeper_hit: 78,
  christmas_return: 88,
  re_entry: 82,
  one_hit_wonder: 85,
  long_tail: 74,
  album_monster: 76,
  chart_rivalry: 84,
  steady_climber: 70,
  freefall: 65,
};

function storyClusterKey(title: string): StoryClusterKey | string {
  const lower = title.toLowerCase();
  if (/record|studio/.test(lower)) return "recording";
  if (/video|mtv/.test(lower)) return "video";
  if (/live aid|tv|television|midnight special/.test(lower)) return "tv_film";
  if (/live|concert|performance/.test(lower)) return "performance";
  if (/cultural|impact|anthem|craze/.test(lower)) return "cultural";
  if (/legacy|artist/.test(lower)) return "legacy";
  if (/album/.test(lower)) return "album";
  if (/chart/.test(lower)) return "chart";
  return "general";
}

function scoreStoryChapter(title: string, body: string, rank: number): number {
  const text = `${title} ${body}`;
  let score = CLUSTER_BASE[storyClusterKey(title) as StoryClusterKey] ?? 55;
  for (const signal of STORY_SIGNALS) {
    if (signal.pattern.test(text)) score = Math.max(score, signal.score);
  }
  score += Math.max(0, 40 - rank * 5);
  score += Math.min(body.length, 500) / 40;
  return Math.round(score);
}

function scoreChartChapter(track: TrackPageData): { score: number; archetype: ChartArchetype | null } {
  const model = buildChartJourney({
    weeks: track.trajectoryWeeks,
    peak: track.peakHot100,
    chartLabel: track.chartRunLabel,
    focusTrackId: track.rvtr,
  });
  if (!model) return { score: 0, archetype: null };
  const archetype = detectChartArchetype(model);
  const boost = ARCHETYPE_CHART_BOOST[archetype] ?? 68;
  const weeksBoost = Math.min(track.trajectoryWeeks.length, 30);
  return { score: boost + weeksBoost, archetype };
}

function scoreTimelineEvents(events: TimelineEvent[]): number {
  let score = 35;
  for (const event of events) {
    const text = `${event.title} ${event.description}`;
    if (/grammy|award/i.test(text)) score = Math.max(score, 45);
    if (/video|film|movie/i.test(text)) score = Math.max(score, 48);
    if (/live aid|woodstock/i.test(text)) score = Math.max(score, 70);
  }
  return score + Math.min(events.length * 4, 20);
}

function scoreDiscoverShelf(shelfId: string, cardCount: number): number {
  const base =
    shelfId === "related" ? 52 : shelfId === "year" ? 48 : shelfId === "artist" ? 44 : 40;
  return base + Math.min(cardCount, 8);
}

export function chapterDirectorId(chapter: ExperienceChapter, index: number): string {
  switch (chapter.kind) {
    case "chart_journey":
      return "chart-journey";
    case "story":
      return `story-${chapter.title}-${chapter.cards[0]?.id ?? index}`.toLowerCase().replace(/\s+/g, "-");
    case "timeline":
      return "timeline";
    case "discover":
      return chapter.shelves.length === 1
        ? `discover-${chapter.shelves[0]!.id}`
        : "discover";
    case "sources":
      return "sources";
  }
}

function chapterTitle(chapter: ExperienceChapter): string {
  switch (chapter.kind) {
    case "chart_journey":
      return chapter.track.chartRunLabel.replace(/^Billboard\s+/i, "") || "Chart Journey";
    case "story":
    case "timeline":
      return chapter.title;
    case "discover":
      return chapter.shelves.length === 1
        ? chapter.shelves[0]!.title
        : "Discovery";
    case "sources":
      return "Continue Exploring";
  }
}

/** Rule-based director — order, priority, visibility. No LLM. */
export function directExperience(input: {
  chapters: ExperienceChapter[];
  track: TrackPageData;
  seenChapterIds?: string[];
}): { chapters: ExperienceChapter[]; plan: DirectorPlan } {
  const { chapters, track, seenChapterIds = [] } = input;
  const seen = new Set(seenChapterIds);

  const scored: DirectorChapterMeta[] = chapters.map((chapter, index) => {
    const id = chapterDirectorId(chapter, index);
    let directorScore = chapter.score;
    let chartArchetype: ChartArchetype | null = null;
    let storyKey: string | undefined;

    if (chapter.kind === "story") {
      const body = chapter.cards[0]?.body ?? "";
      directorScore = scoreStoryChapter(chapter.title, body, index);
      storyKey = storyClusterKey(chapter.title);
    } else if (chapter.kind === "chart_journey") {
      const chart = scoreChartChapter(chapter.track);
      directorScore = chart.score;
      chartArchetype = chart.archetype;
    } else if (chapter.kind === "timeline") {
      directorScore = scoreTimelineEvents(chapter.events);
    } else if (chapter.kind === "discover") {
      directorScore =
        chapter.shelves.length === 0
          ? 0
          : Math.max(
              ...chapter.shelves.map((shelf) => scoreDiscoverShelf(shelf.id, shelf.cards.length)),
            );
    } else if (chapter.kind === "sources") {
      directorScore = 25;
    }

    if (seen.has(id)) directorScore -= 55;

    return {
      id,
      kind: chapter.kind,
      title: chapterTitle(chapter),
      directorScore,
      role: "optional" as NarrativeRole,
      storyKey,
      chartArchetype,
    };
  });

  scored.sort((a, b) => b.directorScore - a.directorScore);

  const majorCandidates = scored.filter(
    (c) => c.kind !== "sources" && (c.kind !== "timeline" || c.directorScore >= 50),
  );

  const majorCount = Math.min(MAX_MAJOR, Math.max(MIN_MAJOR, majorCandidates.length));
  const major = majorCandidates.slice(0, majorCount);
  const majorIds = new Set(major.map((c) => c.id));

  if (major[0]) {
    major[0].role = "opening";
  }
  for (let i = 1; i < major.length - 1; i += 1) {
    major[i]!.role = "middle";
  }
  const lastMajor = major[major.length - 1];
  if (lastMajor && lastMajor.role !== "opening") {
    lastMajor.role = "ending";
  }

  for (const meta of scored) {
    if (!majorIds.has(meta.id)) meta.role = "optional";
  }

  const opening = major[0] ?? scored[0];
  const orderedIds = [
    ...major.map((c) => c.id),
    ...scored.filter((c) => c.role === "optional").map((c) => c.id),
  ];

  const chapterById = new Map(chapters.map((c, i) => [chapterDirectorId(c, i), c]));

  const orderedChapters: ExperienceChapter[] = [];
  for (const id of orderedIds) {
    const chapter = chapterById.get(id);
    if (chapter) {
      orderedChapters.push({
        ...chapter,
        score: scored.find((m) => m.id === id)?.directorScore ?? chapter.score,
      });
    }
  }

  const plan: DirectorPlan = {
    openingId: opening?.id ?? "",
    openingTitle: opening?.title ?? "The Story",
    openingKind: opening?.kind ?? "story",
    majorIds: major.map((c) => c.id),
    optionalIds: scored.filter((c) => c.role === "optional").map((c) => c.id),
    chapters: scored,
    chartArchetype: opening?.chartArchetype ?? scored.find((c) => c.chartArchetype)?.chartArchetype ?? null,
  };

  return { chapters: orderedChapters, plan };
}
