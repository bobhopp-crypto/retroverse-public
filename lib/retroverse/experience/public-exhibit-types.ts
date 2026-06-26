import type { BehindStorySection } from "./behind-the-story";
import type { DiscoverShelf } from "./discover-shelves";
import type { DirectorPlan } from "./experience-director";
import type { ExperienceProfile } from "./experience-types";
import type { StoryDisplayCard } from "./story-cards";
import type { TimelineEvent } from "@/lib/ops/intelligence/song-package-types";
import type { SongEraExhibit } from "@/lib/retroverse/rvbr/song-era-exhibit";
import type { LivingSongPlan } from "./timeline-engine";

export type PublicExhibitChapter =
  | {
      kind: "story";
      score: number;
      title: string;
      cards: StoryDisplayCard[];
    }
  | {
      kind: "chart_journey";
      score: number;
      releaseYear: number | null;
      summary: string | null;
    }
  | {
      kind: "discover";
      score: number;
      shelves: DiscoverShelf[];
    }
  | {
      kind: "timeline";
      score: number;
      title: string;
      events: TimelineEvent[];
    }
  | {
      kind: "sources";
      score: number;
      sections: BehindStorySection[];
    };

export type PublicExhibit = {
  version: 1;
  rvtr: string;
  packageUpdatedAt: string | null;
  builtAt: string;
  profile: ExperienceProfile;
  director: DirectorPlan;
  eraExhibit: SongEraExhibit | null;
  living: LivingSongPlan;
  primary: PublicExhibitChapter[];
  learnMore: PublicExhibitChapter[];
};
