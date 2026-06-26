import type { ArtistPageData } from "@/lib/artist/types";
import type { RvYearDestination } from "@/lib/rv-year/rv-year-destination";
import type { SongPackage } from "@/lib/ops/intelligence/song-package-types";
import type { SongControlData } from "@/lib/retroverse-2/song-control";
import type { TrackPageData } from "@/lib/track/load-track-page";
import { resolveSongEraExhibit } from "@/lib/retroverse/rvbr/song-era-exhibit";

import { buildChartJourney } from "@/lib/chart-journey/build-chart-journey";
import { buildChartJourneyStory } from "@/lib/chart-journey/chart-journey-story";
import { buildBehindStorySections } from "./behind-the-story";
import { deduplicateExperienceChapters } from "./chapter-deduplication";
import {
  buildDiscoverShelves,
  scoreDiscoverShelf,
} from "./discover-shelves";
import {
  buildLivingSongPlan,
  type LivingSongPlan,
} from "./timeline-engine";
import type {
  CachedSongExperience,
  ExperienceChapter,
  ExperienceProfile,
  SongExperience,
} from "./experience-types";
import {
  buildFallbackStoryEntries,
  buildRawStoryCards,
  buildStoryDisplayCards,
} from "./story-cards";
import { directExperience } from "./experience-director";
import { clusterStoryCards, consolidateWeakStoryClusters, intelCardsFromFacts, type StoryCluster } from "./story-cluster";
import { layoutPublicExhibit, reconcileDirectorForPrimary } from "./layout-public-exhibit";
import { toPublicExhibit } from "./hydrate-public-exhibit";

const MEDIA_CLUSTER_KEYS = new Set(["video", "performance", "tv_film"]);

function storyChapterScore(cluster: StoryCluster, storyCount: number): number {
  const rankBonus = Math.max(0, 120 - cluster.bestRank * 8);
  const lengthBonus = Math.min(cluster.cards[0]?.body.length ?? 0, 400) / 20;
  const mediaBonus = MEDIA_CLUSTER_KEYS.has(cluster.key) ? 45 : 0;
  const dominanceBonus = storyCount >= 6 ? 30 : storyCount >= 3 ? 15 : 0;
  return 600 + rankBonus + lengthBonus + mediaBonus + dominanceBonus;
}

function chartChapterScore(track: TrackPageData, storyCount: number): number {
  const weeks = track.trajectoryWeeks.length;
  if (weeks === 0) return 0;
  const chartDominance = storyCount === 0 ? 120 : storyCount <= 2 ? 40 : 0;
  return 750 + weeks + chartDominance;
}

function timelineChapterScore(eventCount: number): number {
  if (eventCount === 0) return 0;
  return 380 + eventCount * 12;
}

function sourcesChapterScore(entryCount: number): number {
  if (entryCount === 0) return 0;
  return 120 + entryCount * 3;
}

function buildProfile(chapters: ExperienceChapter[]): ExperienceProfile {
  let storyWeight = 0;
  let chartWeight = 0;
  let mediaWeight = 0;
  let discoveryWeight = 0;

  for (const chapter of chapters) {
    if (chapter.kind === "story") {
      storyWeight += chapter.score;
      if (/Music Video|Live|TV|Video/i.test(chapter.title)) mediaWeight += chapter.score;
    } else if (chapter.kind === "chart_journey") {
      chartWeight += chapter.score;
    } else if (chapter.kind === "discover") {
      discoveryWeight += chapter.score;
    }
  }

  const weights = [
    { key: "story" as const, value: storyWeight },
    { key: "chart" as const, value: chartWeight },
    { key: "media" as const, value: mediaWeight },
    { key: "artist" as const, value: discoveryWeight },
  ].sort((a, b) => b.value - a.value);

  const top = weights[0]?.value ?? 0;
  const second = weights[1]?.value ?? 0;
  const dominant =
    top === 0
      ? "balanced"
      : top - second < 80
        ? "balanced"
        : (weights[0]?.key ?? "balanced");

  return { storyWeight, chartWeight, mediaWeight, discoveryWeight, dominant };
}

function storyClustersFromPackage(input: {
  pkg: SongPackage;
  track: TrackPageData;
  control?: SongControlData;
}): StoryCluster[] {
  const { pkg, track, control } = input;
  const label = pkg.intel?.label ?? null;

  let raw = buildRawStoryCards(pkg, track);
  if (raw.length === 0) {
    raw = buildFallbackStoryEntries(control, track);
  }

  const clustered = consolidateWeakStoryClusters(clusterStoryCards(raw, track, label));

  const existingKeys = new Set(clustered.map((cluster) => cluster.key));
  const intelClusters = intelCardsFromFacts({
    recordingFacts: existingKeys.has("recording") ? [] : (pkg.intel?.recordingFacts ?? []),
    videoFacts: existingKeys.has("video") ? [] : (pkg.intel?.videoFacts ?? []),
    track,
    label,
  });

  return [...clustered, ...intelClusters].sort((a, b) => a.bestRank - b.bestRank);
}

function filterTimelineEvents(
  events: SongPackage["intel"]["timelineEvents"],
  hasChartJourney: boolean,
): SongPackage["intel"]["timelineEvents"] {
  if (!hasChartJourney) return events;
  return events.filter((event) => {
    const title = event.title.toLowerCase();
    return !title.includes("chart peak") && !title.includes("billboard hot 100");
  });
}

function discoverChapterScore(shelves: ReturnType<typeof buildDiscoverShelves>): number {
  if (shelves.length === 0) return 0;
  return Math.max(...shelves.map((shelf) => scoreDiscoverShelf(shelf, shelf.cards.length)));
}

export function buildSongExperience(input: {
  track: TrackPageData;
  pkg: SongPackage;
  control?: SongControlData;
  artist: ArtistPageData | null;
  destination: RvYearDestination | null;
  releaseYear: number | null;
}): SongExperience {
  const { track, pkg, control, artist, destination, releaseYear } = input;
  const hasChartJourney = track.trajectoryWeeks.length > 0;

  const clusters = storyClustersFromPackage({ pkg, track, control });
  const storyBodies = clusters.flatMap((cluster) => cluster.cards.map((card) => card.body));

  const chapters: ExperienceChapter[] = [];

  if (hasChartJourney) {
    const chartModel = buildChartJourney({
      weeks: track.trajectoryWeeks,
      peak: track.peakHot100,
      chartLabel: track.chartRunLabel,
      focusTrackId: track.rvtr,
    });
    chapters.push({
      kind: "chart_journey",
      score: chartChapterScore(track, clusters.length),
      track,
      releaseYear,
      summary: chartModel ? buildChartJourneyStory(chartModel) : null,
    });
  }

  for (const cluster of clusters) {
    if (hasChartJourney && cluster.key === "chart") continue;
    if (!cluster.cards.some((card) => card.body.trim().length >= 80)) continue;

    chapters.push({
      kind: "story",
      score: storyChapterScore(cluster, clusters.length),
      title: cluster.title,
      cards: cluster.cards,
    });
  }

  const timelineEvents = filterTimelineEvents(pkg.intel?.timelineEvents ?? [], hasChartJourney);
  if (timelineEvents.length > 0) {
    chapters.push({
      kind: "timeline",
      score: timelineChapterScore(timelineEvents.length),
      title: "Beyond the Charts",
      events: timelineEvents,
    });
  }

  const shelves = buildDiscoverShelves({
    track,
    artist,
    destination,
    pkg,
    storyBodies,
  });
  if (shelves.length > 0) {
    chapters.push({
      kind: "discover",
      score: discoverChapterScore(shelves),
      shelves,
    });
  }

  const behindSections = buildBehindStorySections(pkg.researchVault ?? []);
  const entryCount = behindSections.reduce((sum, section) => sum + section.entries.length, 0);
  if (behindSections.length > 0) {
    chapters.push({
      kind: "sources",
      score: sourcesChapterScore(entryCount),
      sections: behindSections,
    });
  }

  chapters.sort((a, b) => b.score - a.score);

  const chartChapter = chapters.find(
    (chapter): chapter is Extract<ExperienceChapter, { kind: "chart_journey" }> =>
      chapter.kind === "chart_journey",
  );
  const deduped = deduplicateExperienceChapters(chapters, {
    hasChartJourney,
    track,
    chartSummary: chartChapter?.summary ?? null,
  });
  const directed = directExperience({ chapters: deduped, track });
  const layout = layoutPublicExhibit(directed.chapters, directed.plan);
  const director = reconcileDirectorForPrimary(directed.plan, layout.primary);
  const builtAt = new Date().toISOString();
  const profile = buildProfile(layout.primary);

  return {
    rvtr: track.rvtr,
    packageUpdatedAt: pkg.updatedAt ?? null,
    builtAt,
    chapters: layout.primary,
    learnMore: layout.learnMore,
    profile,
    director,
  };
}

export function serializeExperienceCache(
  experience: SongExperience,
  living: LivingSongPlan,
): CachedSongExperience {
  return {
    version: 2,
    rvtr: experience.rvtr,
    packageUpdatedAt: experience.packageUpdatedAt,
    builtAt: experience.builtAt,
    profile: experience.profile,
    durationSec: living.durationSec,
    chapterOrder: experience.chapters.map((chapter) => ({
      kind: chapter.kind,
      score: chapter.score,
      title:
        chapter.kind === "story" || chapter.kind === "timeline"
          ? chapter.title
          : chapter.kind === "discover"
            ? chapter.shelves[0]?.title
            : undefined,
    })),
    livingSchedule: living.schedules.map((schedule) => ({
      id: schedule.id,
      kind: schedule.kind,
      revealAtSec: schedule.revealAtSec,
    })),
    directorOpeningId: experience.director.openingId,
    directorOpeningTitle: experience.director.openingTitle,
    directorOpeningKind: experience.director.openingKind,
  };
}

/** Legacy flat story cards — kept for callers that have not migrated. */
export function buildStoryCardsFromExperience(
  pkg: SongPackage,
  track: TrackPageData,
  control?: SongControlData,
): ReturnType<typeof buildStoryDisplayCards> {
  const experience = buildSongExperience({
    track,
    pkg,
    control,
    artist: null,
    destination: null,
    releaseYear: track.releaseYear,
  });
  return experience.chapters
    .filter((chapter): chapter is Extract<ExperienceChapter, { kind: "story" }> => chapter.kind === "story")
    .flatMap((chapter) => chapter.cards);
}

export type PatronSongExperience = {
  experience: SongExperience;
  living: LivingSongPlan;
  eraExhibit: import("@/lib/retroverse/rvbr/song-era-exhibit").SongEraExhibit | null;
};

/** Full patron experience: dynamic chapters + living timeline plan. */
export function buildPatronSongExperience(input: {
  track: TrackPageData;
  pkg: SongPackage;
  control?: SongControlData;
  artist: ArtistPageData | null;
  destination: RvYearDestination | null;
  releaseYear: number | null;
  lengthHint?: string | null;
}): PatronSongExperience {
  const experience = buildSongExperience(input);
  const living = buildLivingSongPlan({
    experience,
    lengthHint: input.lengthHint ?? input.control?.facts?.length ?? input.pkg.metadata.videoInfo,
  });
  const eraExhibit = resolveSongEraExhibit(input.releaseYear);
  return { experience, living, eraExhibit };
}

export function buildPublicExhibitFromPatron(patron: PatronSongExperience): import("./public-exhibit-types").PublicExhibit {
  return toPublicExhibit({
    experience: patron.experience,
    living: patron.living,
    eraExhibit: patron.eraExhibit,
  });
}
