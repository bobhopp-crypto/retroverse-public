import type { TrackPageData } from "@/lib/track/load-track-page";

import type { ExperienceChapter, SongExperience } from "./experience-types";
import type { LivingSongPlan } from "./timeline-engine";
import type { PublicExhibit, PublicExhibitChapter } from "./public-exhibit-types";

export function toPublicExhibitChapter(chapter: ExperienceChapter): PublicExhibitChapter {
  switch (chapter.kind) {
    case "chart_journey":
      return {
        kind: "chart_journey",
        score: chapter.score,
        releaseYear: chapter.releaseYear,
        summary: chapter.summary,
      };
    case "story":
      return {
        kind: "story",
        score: chapter.score,
        title: chapter.title,
        cards: chapter.cards,
      };
    case "discover":
      return {
        kind: "discover",
        score: chapter.score,
        shelves: chapter.shelves,
      };
    case "timeline":
      return {
        kind: "timeline",
        score: chapter.score,
        title: chapter.title,
        events: chapter.events,
      };
    case "sources":
      return {
        kind: "sources",
        score: chapter.score,
        sections: chapter.sections,
      };
  }
}

export function toPublicExhibit(input: {
  experience: SongExperience;
  living: LivingSongPlan;
  eraExhibit: import("@/lib/retroverse/rvbr/song-era-exhibit").SongEraExhibit | null;
}): PublicExhibit {
  const { experience, living, eraExhibit } = input;
  return {
    version: 1,
    rvtr: experience.rvtr,
    packageUpdatedAt: experience.packageUpdatedAt,
    builtAt: experience.builtAt,
    profile: experience.profile,
    director: experience.director,
    eraExhibit,
    living,
    primary: experience.chapters.map(toPublicExhibitChapter),
    learnMore: experience.learnMore.map(toPublicExhibitChapter),
  };
}

export function hydratePublicExhibitChapter(
  chapter: PublicExhibitChapter,
  track: TrackPageData,
): ExperienceChapter {
  if (chapter.kind === "chart_journey") {
    return {
      kind: "chart_journey",
      score: chapter.score,
      track,
      releaseYear: chapter.releaseYear,
      summary: chapter.summary,
    };
  }
  return chapter;
}

export function hydratePublicExhibit(
  exhibit: PublicExhibit,
  track: TrackPageData,
): { experience: SongExperience; living: LivingSongPlan } {
  return {
    experience: {
      rvtr: exhibit.rvtr,
      packageUpdatedAt: exhibit.packageUpdatedAt,
      builtAt: exhibit.builtAt,
      profile: exhibit.profile,
      director: exhibit.director,
      chapters: exhibit.primary.map((chapter) => hydratePublicExhibitChapter(chapter, track)),
      learnMore: (exhibit.learnMore ?? []).map((chapter) => hydratePublicExhibitChapter(chapter, track)),
    },
    living: exhibit.living,
  };
}

export function isPublicExhibitFresh(
  exhibit: PublicExhibit | null,
  packageUpdatedAt: string | null,
): boolean {
  if (!exhibit) return false;
  if (!packageUpdatedAt) return true;
  return exhibit.packageUpdatedAt === packageUpdatedAt;
}
