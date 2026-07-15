"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { BehindTheStory } from "@/components/retroverse/experience/BehindTheStory";
import { BeyondTheCharts } from "@/components/retroverse/experience/BeyondTheCharts";
import { ChartJourney } from "@/components/retroverse/experience/ChartJourney";
import { DiscoverMore } from "@/components/retroverse/experience/DiscoverMore";
import { usePlaybackSync } from "@/components/retroverse/experience/PlaybackSyncProvider";
import { SongStory } from "@/components/retroverse/experience/SongStory";
import { applyMemoryToChapters } from "@/lib/retroverse/experience/apply-director-memory";
import { chapterDirectorId } from "@/lib/retroverse/experience/experience-director";
import type { ExperienceChapter, SongExperience } from "@/lib/retroverse/experience/experience-types";
import {
  recordChapterSeen,
  recordSongVisit,
} from "@/lib/retroverse/experience/experience-memory";
import type { SongMemory } from "@/lib/retroverse/experience/experience-memory";
import type { LivingSongPlan } from "@/lib/retroverse/experience/timeline-engine";
import { revealedChapterIds, scheduleById } from "@/lib/retroverse/experience/timeline-engine";

import "./living-song.css";

type Props = {
  experience: SongExperience;
  plan: LivingSongPlan;
};

const EMPTY_SONG_MEMORY: SongMemory = {
  seenChapterIds: [],
  visitCount: 0,
  lastVisit: "",
  videoPlays: 0,
};

function stableChapterId(
  chapter: ExperienceChapter,
  sourceChapters: ExperienceChapter[],
): string {
  const sourceIndex = sourceChapters.indexOf(chapter);
  return chapterDirectorId(chapter, sourceIndex >= 0 ? sourceIndex : 0);
}

function renderChapterContent(chapter: ExperienceChapter) {
  switch (chapter.kind) {
            case "chart_journey":
              return (
                <ChartJourney
                  weeks={chapter.track.trajectoryWeeks}
                  peak={chapter.track.peakHot100}
                  chartLabel={chapter.track.chartRunLabel}
                  focusTrackId={chapter.track.rvtr}
                  releaseYear={chapter.releaseYear}
                  summary={chapter.summary}
                  hideTimeline
                  variant="rv2"
                  className="rv2-song__chart-journey"
                />
              );
    case "story":
      return <SongStory heading={chapter.title} cards={chapter.cards} />;
    case "timeline":
      return <BeyondTheCharts heading={chapter.title} events={chapter.events} />;
    case "discover":
      return (
        <DiscoverMore
          heading={chapter.shelves.length === 1 ? chapter.shelves[0]!.title : "Discovery"}
          shelves={chapter.shelves}
        />
      );
    case "sources":
      return <BehindTheStory sections={chapter.sections} heading="Continue Exploring" />;
    default:
      return null;
  }
}

export function LivingSongExperience({ experience, plan }: Props) {
  const sync = usePlaybackSync();
  const visitRecorded = useRef(false);
  // This state must match the server-rendered first pass. Persisted memory is
  // applied after hydration so localStorage cannot change the initial tree.
  const [memory, setMemory] = useState<SongMemory>(EMPTY_SONG_MEMORY);

  useEffect(() => {
    if (visitRecorded.current) return;
    visitRecorded.current = true;
    setMemory(recordSongVisit(experience.rvtr));
  }, [experience.rvtr]);

  const displayChapters = useMemo(
    () =>
      applyMemoryToChapters(
        experience.chapters,
        experience.director,
        memory.seenChapterIds,
      ).filter((chapter) => chapter.kind !== "chart_journey"),
    [experience.chapters, experience.director, memory.seenChapterIds],
  );

  const scheduleMap = useMemo(() => scheduleById(plan.schedules), [plan.schedules]);

  const browseMode = !sync.synced;
  const effectiveTime = browseMode ? plan.durationSec : sync.currentTimeSec;
  const showReturnVisitHint =
    memory.visitCount > 1 &&
    memory.seenChapterIds.includes(experience.director.openingId);

  const revealed = useMemo(
    () =>
      browseMode
        ? new Set(plan.schedules.map((schedule) => schedule.id))
        : revealedChapterIds(plan.schedules, effectiveTime),
    [browseMode, plan.schedules, effectiveTime],
  );

  useEffect(() => {
    for (const id of revealed) {
      recordChapterSeen(experience.rvtr, id);
    }
  }, [revealed, experience.rvtr]);

  if (displayChapters.length === 0 && experience.learnMore.length === 0) return null;

  const rootClass = [
    "rv2-song__experience-flow",
    "rv-living",
    browseMode ? "rv-living--browse" : "rv-living--synced",
    sync.playing ? "rv-living--playing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} data-sync-source={sync.source}>
      {sync.synced && !browseMode ? (
        <div className="rv-living__toolbar">
          <span className="rv-living__sync-badge" aria-live="polite">
            {sync.source === "live" ? "Live with the DJ" : "Following playback"}
          </span>
        </div>
      ) : null}

      {showReturnVisitHint ? (
        <p className="rv-living__return-hint">Something different this visit</p>
      ) : null}

      {displayChapters.map((chapter) => {
        const id = stableChapterId(chapter, experience.chapters);
        const schedule = scheduleMap.get(id);
        const isRevealed = revealed.has(id);
        const isOpening = schedule?.role === "opening";
        const content = renderChapterContent(chapter);

        if (!content) return null;

        const wrapClass = [
          "rv-living-chapter",
          isRevealed ? "rv-living-chapter--revealed" : "",
          isOpening ? "rv-living-chapter--opening" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div
            key={id}
            className={wrapClass}
            data-chapter-id={id}
            data-reveal-at={schedule?.revealAtSec ?? 0}
            aria-hidden={!isRevealed}
          >
            {isOpening ? (
              <p className="rv-living__opening-eyebrow">{experience.director.openingTitle}</p>
            ) : null}
            {content}
          </div>
        );
      })}

      {experience.learnMore.length > 0 ? (
        <details className="rv-learn-more">
          <summary className="rv-learn-more__toggle">Learn More</summary>
          <div className="rv-learn-more__body">
            {experience.learnMore.map((chapter, index) => {
              const id = stableChapterId(chapter, experience.learnMore);
              const content = renderChapterContent(chapter);
              if (!content) return null;
              return (
                <div key={`${id}-${index}`} className="rv-learn-more__chapter">
                  {content}
                </div>
              );
            })}
          </div>
        </details>
      ) : null}
    </div>
  );
}
