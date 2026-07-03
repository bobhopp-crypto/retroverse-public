"use client";

import { BehindTheStory } from "@/components/retroverse/experience/BehindTheStory";
import { BeyondTheCharts } from "@/components/retroverse/experience/BeyondTheCharts";
import { ChartJourney } from "@/components/retroverse/experience/ChartJourney";
import { DiscoverMore } from "@/components/retroverse/experience/DiscoverMore";
import { SongStory } from "@/components/retroverse/experience/SongStory";
import type { SongExperience } from "@/lib/retroverse/experience/experience-types";

import "./song-experience.css";

type Props = {
  experience: SongExperience;
  className?: string;
};

export function ExperienceFlow({ experience, className }: Props) {
  if (experience.chapters.length === 0) return null;

  const flowClass = ["rv2-song__experience-flow", className].filter(Boolean).join(" ");

  return (
    <div className={flowClass}>
      {experience.chapters.map((chapter) => {
        switch (chapter.kind) {
          case "chart_journey":
            return (
              <ChartJourney
                key="chart-journey"
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
            return (
              <SongStory
                key={`story-${chapter.title}-${chapter.cards[0]?.id ?? chapter.score}`}
                heading={chapter.title}
                cards={chapter.cards}
              />
            );
          case "timeline":
            return (
              <BeyondTheCharts
                key="timeline"
                heading={chapter.title}
                events={chapter.events}
              />
            );
          case "discover":
            return (
              <DiscoverMore
                key={`discover-${chapter.shelves.map((shelf) => shelf.id).join("-")}`}
                heading={chapter.shelves.length === 1 ? chapter.shelves[0]!.title : "Discovery"}
                shelves={chapter.shelves}
              />
            );
          case "sources":
            return (
              <BehindTheStory
                key="sources"
                sections={chapter.sections}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
