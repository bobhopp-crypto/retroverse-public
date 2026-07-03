"use client";

import { useMemo, useState } from "react";

import type {
  ChartJourneyChapterId,
  ChartJourneyExperience,
  ChartJourneyViewMode,
} from "@/lib/experiences/chart-journey/types";

import { ChapterBeatPreview } from "./ChapterBeatPreview";
import { ChartJourneyCreativeReviewPanel } from "./ChartJourneyCreativeReviewPanel";
import { ChartJourneyTimelineExplorer } from "./ChartJourneyTimelineExplorer";
import { TimelineSpine } from "./TimelineSpine";

import "./chart-journey-flagship.css";

type Props = {
  experience: ChartJourneyExperience;
};

export function ChartJourneyWorkspace({ experience }: Props) {
  const [viewMode, setViewMode] = useState<ChartJourneyViewMode>("experience");
  const [activeId, setActiveId] = useState<ChartJourneyChapterId>(
    experience.chapters[0]?.id ?? "opening",
  );
  const [focusWeekIndex, setFocusWeekIndex] = useState<number | null>(null);

  const activeChapter = useMemo(
    () => experience.chapters.find((c) => c.id === activeId) ?? experience.chapters[0],
    [activeId, experience.chapters],
  );

  function jumpToChapter(chapterId: ChartJourneyChapterId) {
    setActiveId(chapterId);
    const chapter = experience.chapters.find((c) => c.id === chapterId);
    if (chapter?.anchorWeekIndex != null) {
      setFocusWeekIndex(chapter.anchorWeekIndex);
    }
  }

  function openTimelineAtWeek(index: number) {
    setFocusWeekIndex(index);
    setViewMode("timeline");
  }

  return (
    <div className="cj-workspace">
      <header className="cj-workspace__hero">
        <p className="cj-workspace__badge">Experience 1.1 · Foundation</p>
        <h1>Chart Journey</h1>
        <p className="cj-workspace__song">
          {experience.title} — {experience.artist}
        </p>
        <p className="cj-workspace__tagline">{experience.visualLanguage.signature}</p>

        <div className="cj-workspace__mode-toggle" role="tablist" aria-label="Viewing mode">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "experience"}
            className={viewMode === "experience" ? "is-active" : undefined}
            onClick={() => setViewMode("experience")}
          >
            Experience Mode
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "timeline"}
            className={viewMode === "timeline" ? "is-active" : undefined}
            onClick={() => setViewMode("timeline")}
          >
            Timeline Mode
          </button>
        </div>
      </header>

      {viewMode === "experience" ? (
        <div className="cj-workspace__layout">
          <nav className="cj-workspace__chapters" aria-label="Chart Journey chapters">
            <h2>Chapters</h2>
            <ol>
              {experience.chapters.map((chapter, index) => (
                <li key={chapter.id}>
                  <button
                    type="button"
                    className={activeChapter?.id === chapter.id ? "is-active" : undefined}
                    onClick={() => jumpToChapter(chapter.id)}
                  >
                    <span className="cj-workspace__chapter-num">{index + 1}</span>
                    <span className="cj-workspace__chapter-label">{chapter.title}</span>
                  </button>
                </li>
              ))}
            </ol>
            {experience.skippedChapters.length > 0 ? (
              <div className="cj-workspace__skipped">
                <h3>Skipped (no data)</h3>
                <ul>
                  {experience.skippedChapters.map((c) => (
                    <li key={c.id}>
                      {c.title}
                      <span>{c.skipReason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </nav>

          <main className="cj-workspace__stage">
            {activeChapter ? (
              <>
                <header className="cj-workspace__beat-head">
                  <h2>{activeChapter.title}</h2>
                  <p>{activeChapter.subtitle}</p>
                  <p className="cj-workspace__concept">{activeChapter.visualConcept}</p>
                  {activeChapter.anchorWeekIndex != null ? (
                    <button
                      type="button"
                      className="cj-workspace__timeline-link"
                      onClick={() => openTimelineAtWeek(activeChapter.anchorWeekIndex!)}
                    >
                      View exact chart history — week {activeChapter.anchorWeekIndex + 1} →
                    </button>
                  ) : null}
                </header>
                <ChapterBeatPreview chapter={activeChapter} experience={experience} />
              </>
            ) : null}

            <TimelineSpine
              weeks={experience.timelineWeeks}
              focusWeekIndex={focusWeekIndex}
              onSelectWeek={openTimelineAtWeek}
              onExpandTimeline={() => setViewMode("timeline")}
            />
          </main>

          <aside className="cj-workspace__aside">
            <section className="cj-workspace__language">
              <h2>Visual Language</h2>
              <p>{experience.visualLanguage.texture}</p>
              <ul className="cj-workspace__palette">
                {experience.visualLanguage.palette.map((color) => (
                  <li key={color} style={{ background: color }} title={color} />
                ))}
              </ul>
            </section>
            <section className="cj-workspace__integrity">
              <h2>Historical integrity</h2>
              <p>
                {experience.timelineWeeks.length} weeks preserved in Timeline Mode. Experience Mode
                never replaces the record — it elevates it.
              </p>
            </section>
            <ChartJourneyCreativeReviewPanel review={experience.review} />
          </aside>
        </div>
      ) : (
        <div className="cj-workspace__timeline-layout">
          <ChartJourneyTimelineExplorer
            weeks={experience.timelineWeeks}
            focusWeekIndex={focusWeekIndex}
            onFocusWeek={setFocusWeekIndex}
            onJumpToChapter={(id) => jumpToChapter(id as ChartJourneyChapterId)}
            onSwitchMode={setViewMode}
          />
          <aside className="cj-workspace__aside">
            <section className="cj-workspace__integrity">
              <h2>Timeline Mode</h2>
              <p>Every week · movement · peak-to-date · enrichment slots ready for Retrograph.</p>
              <button
                type="button"
                className="cj-workspace__timeline-link"
                onClick={() => setViewMode("experience")}
              >
                ← Back to Experience Mode
              </button>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
