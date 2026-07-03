"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import type { ChartJourneyTimelineWeek, ChartJourneyViewMode } from "@/lib/experiences/chart-journey/types";

type Props = {
  weeks: ChartJourneyTimelineWeek[];
  focusWeekIndex: number | null;
  onFocusWeek: (index: number) => void;
  onJumpToChapter?: (chapterId: string) => void;
  onSwitchMode?: (mode: ChartJourneyViewMode) => void;
};

const ENRICHMENT_LABELS: Array<{ key: keyof ChartJourneyTimelineWeek["enrichment"]; label: string }> = [
  { key: "billboardCover", label: "Billboard cover" },
  { key: "topFiveThatWeek", label: "Top 5 that week" },
  { key: "songsAboveBelow", label: "Songs above / below" },
  { key: "historicalEvents", label: "Historical events" },
  { key: "tvAppearances", label: "TV appearances" },
  { key: "albumSales", label: "Album sales" },
  { key: "certifications", label: "Certifications" },
  { key: "retroverseConnections", label: "Retroverse connections" },
];

function enrichmentStatus(value: unknown): "ready" | "pending" {
  if (value == null) return "pending";
  if (Array.isArray(value) && value.length === 0) return "pending";
  if (typeof value === "string" && !value.trim()) return "pending";
  return "ready";
}

export function ChartJourneyTimelineExplorer({
  weeks,
  focusWeekIndex,
  onFocusWeek,
  onJumpToChapter,
  onSwitchMode,
}: Props) {
  const rowRefs = useRef<Map<number, HTMLLIElement>>(new Map());

  useEffect(() => {
    if (focusWeekIndex == null) return;
    const el = rowRefs.current.get(focusWeekIndex);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusWeekIndex]);

  return (
    <section className="cj-timeline" aria-label="Chart history — every week">
      <header className="cj-timeline__head">
        <h2>Timeline Mode</h2>
        <p>The definitive historical record — every chart week preserved.</p>
        <p className="cj-timeline__count">{weeks.length} weeks on chart</p>
      </header>

      <ol className="cj-timeline__rows">
        {weeks.map((week) => {
          const focused = focusWeekIndex === week.weekIndex;
          return (
            <li
              key={`${week.issueDate}-${week.rank}`}
              ref={(node) => {
                if (node) rowRefs.current.set(week.weekIndex, node);
              }}
              className={focused ? "cj-timeline__row-item is-focused" : "cj-timeline__row-item"}
            >
              {week.reentryGapWeeks != null && week.reentryGapWeeks > 0 ? (
                <div className="cj-timeline__gap" role="separator">
                  Returned after {week.reentryGapWeeks} week{week.reentryGapWeeks === 1 ? "" : "s"}
                </div>
              ) : null}

              <button
                type="button"
                className="cj-timeline__row"
                onClick={() => onFocusWeek(week.weekIndex)}
                aria-expanded={focused}
              >
                <span className="cj-timeline__date">{week.dateLabel}</span>
                <span className="cj-timeline__bar-wrap" aria-hidden>
                  <span
                    className="cj-timeline__bar"
                    style={{ width: `${week.barWidthPct}%`, backgroundColor: week.barColor }}
                  />
                </span>
                <span className="cj-timeline__rank">#{week.rank}</span>
              </button>

              {focused ? (
                <div className="cj-timeline__detail">
                  <dl className="cj-timeline__facts">
                    <div>
                      <dt>Week ending</dt>
                      <dd>{week.issueDate.slice(0, 10)}</dd>
                    </div>
                    <div>
                      <dt>Billboard position</dt>
                      <dd>#{week.rank}</dd>
                    </div>
                    <div>
                      <dt>Movement</dt>
                      <dd>{week.movementLabel}</dd>
                    </div>
                    <div>
                      <dt>Weeks on chart</dt>
                      <dd>{week.weeksOnChart}</dd>
                    </div>
                    <div>
                      <dt>Peak to date</dt>
                      <dd>#{week.peakToDate}</dd>
                    </div>
                  </dl>

                  {week.badges.length > 0 ? (
                    <ul className="cj-timeline__badges">
                      {week.badges.map((badge) => (
                        <li key={badge}>{badge}</li>
                      ))}
                    </ul>
                  ) : null}

                  {week.linkedChapterIds.length > 0 && onJumpToChapter ? (
                    <div className="cj-timeline__story-links">
                      <p>Story moments this week:</p>
                      {week.linkedChapterIds.map((id) => (
                        <button
                          key={id}
                          type="button"
                          className="cj-timeline__story-link"
                          onClick={() => {
                            onSwitchMode?.("experience");
                            onJumpToChapter(id);
                          }}
                        >
                          ← Back to {id.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="cj-timeline__enrichment">
                    <h3>Progressive enrichment</h3>
                    <ul>
                      {ENRICHMENT_LABELS.map(({ key, label }) => {
                        const status = enrichmentStatus(week.enrichment[key]);
                        return (
                          <li key={key} className={status === "ready" ? "is-ready" : "is-pending"}>
                            <span>{label}</span>
                            <span>{status === "ready" ? "Available" : "Awaiting Retrograph"}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {week.chartWeekHref ? (
                    <Link href={week.chartWeekHref} className="cj-timeline__portal">
                      View chart week portal →
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
