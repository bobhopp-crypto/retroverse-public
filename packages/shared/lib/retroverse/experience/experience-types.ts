import type { BehindStorySection } from "@/lib/retroverse/experience/behind-the-story";
import type { DiscoverShelf } from "@/lib/retroverse/experience/discover-shelves";
import type { StoryDisplayCard } from "@/lib/retroverse/experience/story-cards";
import type { TimelineEvent } from "@/lib/ops/intelligence/song-package-types";
import type { TrackPageData } from "@/lib/track/load-track-page";

/** Exhibit chapter kinds — only rendered when payload has meaningful content. */
export type ExperienceChapterKind =
  | "chart_journey"
  | "story"
  | "timeline"
  | "discover"
  | "sources";

export type ExperienceChapter =
  | {
      kind: "chart_journey";
      score: number;
      track: TrackPageData;
      releaseYear: number | null;
      summary: string | null;
    }
  | {
      kind: "story";
      score: number;
      title: string;
      cards: StoryDisplayCard[];
    }
  | {
      kind: "timeline";
      score: number;
      title: string;
      events: TimelineEvent[];
    }
  | {
      kind: "discover";
      score: number;
      shelves: DiscoverShelf[];
    }
  | {
      kind: "sources";
      score: number;
      sections: BehindStorySection[];
    };

export type SongExperience = {
  rvtr: string;
  packageUpdatedAt: string | null;
  builtAt: string;
  chapters: ExperienceChapter[];
  learnMore: ExperienceChapter[];
  profile: ExperienceProfile;
  director: import("./experience-director").DirectorPlan;
};

export type ExperienceProfile = {
  storyWeight: number;
  chartWeight: number;
  mediaWeight: number;
  discoveryWeight: number;
  dominant: "story" | "chart" | "media" | "artist" | "balanced";
};

export type CachedSongExperience = {
  version: 1 | 2;
  rvtr: string;
  packageUpdatedAt: string | null;
  builtAt: string;
  profile: ExperienceProfile;
  durationSec: number;
  chapterOrder: Array<{ kind: ExperienceChapterKind; score: number; title?: string }>;
  livingSchedule: Array<{ id: string; kind: ExperienceChapterKind; revealAtSec: number }>;
  directorOpeningId?: string;
  directorOpeningTitle?: string;
  directorOpeningKind?: ExperienceChapterKind;
};
