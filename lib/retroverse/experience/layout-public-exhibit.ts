import type { DirectorPlan } from "./experience-director";
import { chapterDirectorId } from "./experience-director";
import type { DiscoverShelf } from "./discover-shelves";
import { prioritizeDiscoverShelves } from "./discover-shelves";
import type { ExperienceChapter } from "./experience-types";

const MAX_PRIMARY_STORIES = 2;

export type PublicExhibitLayout = {
  primary: ExperienceChapter[];
  learnMore: ExperienceChapter[];
};

function storySortScore(chapter: ExperienceChapter, director: DirectorPlan, index: number): number {
  if (chapter.kind !== "story") return 0;
  const id = chapterDirectorId(chapter, index);
  const meta = director.chapters.find((entry) => entry.id === id);
  return meta?.directorScore ?? chapter.score;
}

function orderStories(stories: ExperienceChapter[], director: DirectorPlan): ExperienceChapter[] {
  return [...stories].sort((a, b) => {
    const aIndex = stories.indexOf(a);
    const bIndex = stories.indexOf(b);
    return storySortScore(b, director, bIndex) - storySortScore(a, director, aIndex);
  });
}

function mergeDiscoverShelves(chapters: ExperienceChapter[]): DiscoverShelf[] {
  const shelves: DiscoverShelf[] = [];
  for (const chapter of chapters) {
    if (chapter.kind === "discover") shelves.push(...chapter.shelves);
  }
  return shelves;
}

/** Fixed museum layout: stories → chart → discovery → sources; overflow → Learn More. */
export function layoutPublicExhibit(
  chapters: ExperienceChapter[],
  director: DirectorPlan,
): PublicExhibitLayout {
  const stories = orderStories(
    chapters.filter((chapter): chapter is Extract<ExperienceChapter, { kind: "story" }> => chapter.kind === "story"),
    director,
  );
  const chart = chapters.find(
    (chapter): chapter is Extract<ExperienceChapter, { kind: "chart_journey" }> =>
      chapter.kind === "chart_journey",
  );
  const sources = chapters.find(
    (chapter): chapter is Extract<ExperienceChapter, { kind: "sources" }> => chapter.kind === "sources",
  );
  const timeline = chapters.filter(
    (chapter): chapter is Extract<ExperienceChapter, { kind: "timeline" }> => chapter.kind === "timeline",
  );
  const discoverShelves = mergeDiscoverShelves(chapters);
  const { primary: primaryShelves, overflow: overflowShelves } = prioritizeDiscoverShelves(discoverShelves);

  const primaryStories = stories.slice(0, MAX_PRIMARY_STORIES);
  const overflowStories = stories.slice(MAX_PRIMARY_STORIES);

  const primary: ExperienceChapter[] = [...primaryStories];
  if (chart) primary.push(chart);
  if (primaryShelves.length > 0) {
    primary.push({
      kind: "discover",
      score: 300,
      shelves: primaryShelves,
    });
  }
  if (sources) primary.push(sources);

  const learnMore: ExperienceChapter[] = [...overflowStories, ...timeline];
  if (overflowShelves.length > 0) {
    learnMore.push({
      kind: "discover",
      score: 180,
      shelves: overflowShelves,
    });
  }

  return { primary, learnMore };
}

export function reconcileDirectorForPrimary(
  director: DirectorPlan,
  primary: ExperienceChapter[],
): DirectorPlan {
  const ids = primary.map((chapter, index) => chapterDirectorId(chapter, index));
  const openingId =
    ids.find((id) => id === director.openingId && director.majorIds.includes(id)) ??
    ids.find((id) => director.majorIds.includes(id)) ??
    ids[0] ??
    director.openingId;
  const openingMeta = director.chapters.find((entry) => entry.id === openingId);
  return {
    ...director,
    openingId,
    openingTitle: openingMeta?.title ?? director.openingTitle,
    openingKind: openingMeta?.kind ?? director.openingKind,
  };
}
