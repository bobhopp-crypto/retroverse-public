"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useAttractTour } from "@/components/retroverse/experience/AttractTourProvider";
import { ChartJourneySummary } from "@/components/retroverse/experience/ChartJourneySummary";
import { buildChartJourney } from "@/lib/chart-journey/build-chart-journey";
import type { PatronSongExperience } from "@/lib/retroverse/experience/build-song-experience";
import { chapterDirectorId } from "@/lib/retroverse/experience/experience-director";
import type { AttractBeat } from "@/lib/retroverse/experience/attract-timeline";
import type { ExperienceChapter } from "@/lib/retroverse/experience/experience-types";

import "./attract-tour.css";

type Props = {
  patron: PatronSongExperience;
  hero: {
    title: string;
    artist: string;
    year: number | null;
    coverUrl: string | null;
  };
  eraArtifact?: string | null;
};

function titleCaseName(name: string): string {
  return name.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function casualExcerpt(body: string): string {
  const trimmed = body.trim();
  const sentence = trimmed.match(/^[\s\S]+?[.!?](?:\s|$)/)?.[0]?.trim();
  if (sentence && sentence.length <= 220) return sentence;
  if (trimmed.length <= 180) return trimmed;
  return `${trimmed.slice(0, 177).trim()}…`;
}

function findChapterByDirectorId(
  chapters: ExperienceChapter[],
  directorId: string,
): ExperienceChapter | null {
  for (let index = 0; index < chapters.length; index += 1) {
    if (chapterDirectorId(chapters[index]!, index) === directorId) {
      return chapters[index]!;
    }
  }
  return null;
}

function firstStoryChapter(chapters: ExperienceChapter[]) {
  return chapters.find((chapter) => chapter.kind === "story") ?? null;
}

function firstDiscoverChapter(chapters: ExperienceChapter[]) {
  return chapters.find((chapter) => chapter.kind === "discover") ?? null;
}

const BEAT_ORDER: AttractBeat[] = ["hero", "chart", "story", "discover"];

export function AttractTourExperience({ patron, hero, eraArtifact }: Props) {
  const tour = useAttractTour();
  const { director, chapters } = patron.experience;

  const openingChapter = useMemo(
    () => findChapterByDirectorId(chapters, director.openingId),
    [chapters, director.openingId],
  );

  const chartModel = useMemo(() => {
    const chapter =
      openingChapter?.kind === "chart_journey"
        ? openingChapter
        : chapters.find((c) => c.kind === "chart_journey");
    if (!chapter || chapter.kind !== "chart_journey") return null;
    return buildChartJourney({
      weeks: chapter.track.trajectoryWeeks,
      peak: chapter.track.peakHot100,
      chartLabel: chapter.track.chartRunLabel,
      focusTrackId: chapter.track.rvtr,
    });
  }, [chapters, openingChapter]);

  const story =
    openingChapter?.kind === "story"
      ? openingChapter
      : firstStoryChapter(chapters);

  const discover =
    openingChapter?.kind === "discover"
      ? openingChapter
      : firstDiscoverChapter(chapters);

  if (tour.mode !== "attract") return null;

  return (
    <section className="rv-attract" aria-label="Song auto tour">
      {tour.activeTheme ? (
        <header className="rv-attract__theme">
          <p className="rv-attract__theme-eyebrow">Now touring</p>
          <h3 className="rv-attract__theme-title">{tour.activeTheme.title}</h3>
          <p className="rv-attract__theme-desc">{tour.activeTheme.description}</p>
        </header>
      ) : null}

      <div className="rv-attract__stage">
        {BEAT_ORDER.map((beat) => {
          const visible = tour.activeBeat === beat;
          const panelClass = [
            "rv-attract__panel",
            visible ? "rv-attract__panel--active" : "",
            `rv-attract__panel--${beat}`,
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div key={beat} className={panelClass} aria-hidden={!visible}>
              {beat === "hero" ? (
                <div className="rv-attract__hero">
                  <div className="rv-attract__hero-copy">
                    <h2>{hero.title}</h2>
                    <p className="rv-attract__artist">{titleCaseName(hero.artist)}</p>
                    {hero.year ? <p className="rv-attract__year">{hero.year}</p> : null}
                    {director.openingTitle ? (
                      <p className="rv-attract__opening">{director.openingTitle}</p>
                    ) : null}
                    {eraArtifact ? (
                      <p className="rv-attract__artifact">{eraArtifact}</p>
                    ) : null}
                  </div>
                  <div className="rv-attract__art-wrap">
                    {hero.coverUrl ? (
                      <img src={hero.coverUrl} alt="" className="rv-attract__art" />
                    ) : (
                      <div className="rv-attract__art rv-attract__art--empty" aria-hidden />
                    )}
                  </div>
                </div>
              ) : null}

              {beat === "chart" && chartModel ? (
                <div className="rv-attract__chart">
                  <p className="rv-attract__eyebrow">Chart Journey</p>
                  <ChartJourneySummary model={chartModel} />
                </div>
              ) : null}

              {beat === "chart" && !chartModel ? (
                <div className="rv-attract__chart">
                  <p className="rv-attract__eyebrow">Chart Journey</p>
                  <p className="rv-attract__fallback">A story worth stepping closer to.</p>
                </div>
              ) : null}

              {beat === "story" && story && story.kind === "story" ? (
                <article className="rv-attract__story">
                  <p className="rv-attract__eyebrow">{story.title}</p>
                  <p className="rv-attract__story-body">
                    {casualExcerpt(story.cards[0]?.body ?? "")}
                  </p>
                </article>
              ) : null}

              {beat === "story" && !story ? (
                <article className="rv-attract__story">
                  <p className="rv-attract__eyebrow">The Story</p>
                  <p className="rv-attract__story-body">Every record carries a world behind it.</p>
                </article>
              ) : null}

              {beat === "discover" && discover && discover.kind === "discover" ? (
                <div className="rv-attract__discover">
                  <p className="rv-attract__eyebrow">
                    {discover.shelves[0]?.title ?? "Discovery"}
                  </p>
                  <ul className="rv-attract__discover-rail">
                    {discover.shelves
                      .flatMap((shelf) => shelf.cards)
                      .slice(0, 4)
                      .map((card) => (
                      <li key={card.id}>
                        <Link href={card.href} className="rv-attract__discover-card" prefetch>
                          <span className="rv-attract__discover-cover-wrap">
                            {card.coverUrl ? (
                              <img src={card.coverUrl} alt="" className="rv-attract__discover-cover" />
                            ) : (
                              <span className="rv-attract__discover-cover rv-attract__discover-cover--empty" />
                            )}
                          </span>
                          <span className="rv-attract__discover-title">{card.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="rv-attract__hint">Touch anywhere to explore</p>
    </section>
  );
}
