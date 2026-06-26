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
  const panelClass = ["rv-exp-cj", `rv-exp-cj--${variant}`, className].filter(Boolean).join(" ");
  const label = chartLabel.replace(/^Billboard\s+/i, "");

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

  return (
    <section className={panelClass} aria-labelledby="rv-exp-cj-heading">
      <header className="rv-exp-cj__head">
        <div>
          <p className="rv-exp-cj__eyebrow">Chart Journey</p>
          <h2 id="rv-exp-cj-heading">{label}</h2>
        </div>
      </header>

      <ChartJourneySummary model={model} summary={summary} />

      <div className="rv-exp-cj__fingerprint" aria-label={`${label} chart fingerprint`}>
        <ol className="rv-exp-cj__rows">
          {rows.map((row, index) => (
            <ChartJourneyRowView
              key={`${row.week.issueDate}-${index}`}
              row={row}
              model={model}
              gap={gapBeforeRow.get(index)}
              timelineLabels={[
                ...new Set([
                  ...(timelineByDate.get(row.week.issueDate.slice(0, 10)) ?? []),
                  ...(milestoneByDate.get(row.week.issueDate.slice(0, 10))
                    ? [milestoneByDate.get(row.week.issueDate.slice(0, 10))!]
                    : []),
                ]),
              ]}
            />
          ))}
        </ol>
      </div>

      {hideTimeline ? null : <Timeline events={timeline} className="rv-exp-cj__timeline" />}
    </section>
  );
}
