import { Fragment } from "react";
import type { ChartJourneyMilestone } from "@/lib/chart-journey/types";
import type { TimelineEvent } from "@/lib/ops/intelligence/song-package-types";
import type { TrackTrajectoryWeek } from "@/lib/track/track-trajectory-types";

import { buildChartExperience } from "@/lib/retroverse/experience/load-chart-experience";

import { ChartJourneyRowView } from "./ChartJourneyRow";
import { ChartJourneySummary } from "./ChartJourneySummary";
import { Timeline } from "./Timeline";

import "./chart-journey.css";

type Props = {
  weeks: TrackTrajectoryWeek[];
  peak: number | null;
  chartLabel?: string;
  maxRank?: number;
  focusTrackId?: string | null;
  releaseYear?: number | null;
  releaseDate?: string | null;
  milestones?: ChartJourneyMilestone[];
  packageTimelineEvents?: TimelineEvent[];
  variant?: "rv2" | "exhibit";
  className?: string;
  /** Hide the inline timeline (song page uses Beyond the Charts instead). */
  hideTimeline?: boolean;
  /** Museum experience — fingerprint only, no headers or narrative. */
  museumMinimal?: boolean;
  /** Precomputed narrative from experience.json — skips runtime story assembly. */
  summary?: string | null;
};

export function ChartJourney({
  weeks,
  peak,
  chartLabel = "Billboard Hot 100",
  maxRank = 100,
  focusTrackId = null,
  releaseYear = null,
  releaseDate = null,
  milestones = [],
  packageTimelineEvents = [],
  variant = "exhibit",
  className,
  hideTimeline = false,
  museumMinimal = false,
  summary = null,
}: Props) {
  const experience = buildChartExperience({
    weeks,
    peak,
    chartLabel,
    maxRank,
    focusTrackId,
    releaseYear,
    releaseDate,
    milestones,
    packageTimelineEvents,
  });

  if (!experience) return null;

  const { model, timeline } = experience;
  const { rows, gaps } = model;
  const simplified = variant === "rv2";
  const panelClass = [
    "rv-exp-cj",
    `rv-exp-cj--${variant}`,
    simplified ? "rv-exp-cj--simplified" : null,
    museumMinimal ? "rv-exp-cj--museum" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const gapBeforeRow = new Map<number, (typeof gaps)[number]>();
  for (const gap of gaps) {
    const rowIndex = rows.findIndex((row) => row.week.issueDate === gap.returnDate);
    if (rowIndex >= 0) gapBeforeRow.set(rowIndex, gap);
  }

  const milestoneByDate = new Map(
    model.milestones.map((milestone) => [milestone.date.slice(0, 10), milestone.label]),
  );

  const timelineByDate = new Map<string, string[]>();
  for (const event of timeline) {
    if (!event.date) continue;
    const key = event.date.slice(0, 10);
    const bucket = timelineByDate.get(key) ?? [];
    bucket.push(event.label);
    timelineByDate.set(key, bucket);
  }

  const firstPeakIndex = rows.findIndex((row) => row.week.rank === model.metrics.peakPosition);
  const journeyMarkers = (index: number): string[] => {
    const row = rows[index]!;
    const previous = index > 0 ? rows[index - 1]! : null;
    const markers: string[] = [];
    if (index === 0) markers.push("Chart Debut");
    if (row.week.reentry || gapBeforeRow.has(index)) markers.push("Return to Chart");
    if (row.week.rank <= 40 && (!previous || previous.week.rank > 40)) markers.push("Top 40");
    if (row.week.rank <= 10 && (!previous || previous.week.rank > 10)) markers.push("Top 10");
    if (row.week.rank === 1 && previous?.week.rank !== 1) markers.push("#1");
    if (index === firstPeakIndex && row.week.rank !== 1) markers.push("Peak Position");
    if (index === rows.length - 1) markers.push("Final Week");
    return markers;
  };

  return (
    <section className={panelClass} aria-labelledby={museumMinimal ? undefined : "rv-exp-cj-heading"}>
      {museumMinimal ? null : (
        <header className="rv-exp-cj__head">
          <h2 id="rv-exp-cj-heading">Chart Journey</h2>
        </header>
      )}

      {museumMinimal || simplified ? null : <ChartJourneySummary model={model} />}

      <div className="rv-exp-cj__fingerprint" aria-label="Chart Journey">
        <ol className="rv-exp-cj__rows">
          {rows.map((row, index) => {
            const previous = index > 0 ? rows[index - 1]! : null;
            const year = row.week.issueDate.slice(0, 4);
            const previousYear = previous?.week.issueDate.slice(0, 4);
            const yearChanged = simplified && previousYear && previousYear !== year;

            return (
              <Fragment key={`cj-row-${row.week.issueDate}-${row.week.rank}-${index}`}>
                {yearChanged ? (
                  <li className="rv-exp-cj__year-divider" aria-label={`Chart year ${year}`}>
                    <span className="rv-exp-cj__year-divider-line" aria-hidden />
                    <span className="rv-exp-cj__year-divider-label">{year}</span>
                    <span className="rv-exp-cj__year-divider-line" aria-hidden />
                  </li>
                ) : null}
                <ChartJourneyRowView
                  row={row}
                  model={model}
                  gap={gapBeforeRow.get(index)}
                  showGap={!simplified}
                  timelineLabels={[
                    ...new Set([
                      ...(timelineByDate.get(row.week.issueDate.slice(0, 10)) ?? []),
                      ...(milestoneByDate.get(row.week.issueDate.slice(0, 10))
                        ? [milestoneByDate.get(row.week.issueDate.slice(0, 10))!]
                        : []),
                    ]),
                  ]}
                  milestones={simplified ? [] : journeyMarkers(index)}
                />
              </Fragment>
            );
          })}
        </ol>
      </div>

      {hideTimeline ? null : <Timeline events={timeline} className="rv-exp-cj__timeline" />}
    </section>
  );
}
