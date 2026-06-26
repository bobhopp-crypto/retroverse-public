import { formatChartJourneyDate } from "./build-chart-journey";
import type { ChartJourneyModel, ChartJourneyMilestone } from "./types";

export type ExperienceTimelineEvent = {
  id: string;
  date: string | null;
  year: number | null;
  label: string;
  kind: "release" | "chart_debut" | "peak" | "reentry" | "final_week" | "milestone";
};

function yearFromDate(value: string | null): number | null {
  if (!value?.trim()) return null;
  const y = Number(value.slice(0, 4));
  return Number.isFinite(y) && y > 0 ? y : null;
}

export function buildChartTimelineEvents(input: {
  model: ChartJourneyModel;
  releaseYear?: number | null;
  releaseDate?: string | null;
  extraMilestones?: ChartJourneyMilestone[];
}): ExperienceTimelineEvent[] {
  const { model, releaseYear, releaseDate, extraMilestones = [] } = input;
  const events: ExperienceTimelineEvent[] = [];
  const { metrics, rows, runs } = model;

  if (releaseDate || releaseYear) {
    events.push({
      id: "release",
      date: releaseDate?.slice(0, 10) ?? null,
      year: releaseYear ?? yearFromDate(releaseDate ?? null),
      label: "Released",
      kind: "release",
    });
  }

  if (metrics.firstChartDate) {
    events.push({
      id: "chart-debut",
      date: metrics.firstChartDate,
      year: yearFromDate(metrics.firstChartDate),
      label: "Entered Chart",
      kind: "chart_debut",
    });
  }

  if (metrics.peakPosition != null) {
    const peakWeek = rows.find((row) => row.week.rank === metrics.peakPosition);
    if (peakWeek) {
      events.push({
        id: "peak",
        date: peakWeek.week.issueDate,
        year: yearFromDate(peakWeek.week.issueDate),
        label: `Reached Peak (#${metrics.peakPosition})`,
        kind: "peak",
      });
    }
  }

  for (const run of runs.filter((entry) => entry.reentry)) {
    events.push({
      id: `reentry-${run.startDate}`,
      date: run.startDate,
      year: yearFromDate(run.startDate),
      label:
        run.weeksAbsent > 0
          ? `Returned After ${run.weeksAbsent} Week${run.weeksAbsent === 1 ? "" : "s"} Off`
          : "Returned to Chart",
      kind: "reentry",
    });
  }

  if (metrics.lastChartDate && metrics.lastChartDate !== metrics.firstChartDate) {
    events.push({
      id: "final-week",
      date: metrics.lastChartDate,
      year: yearFromDate(metrics.lastChartDate),
      label: "Final Chart Week",
      kind: "final_week",
    });
  }

  for (const milestone of extraMilestones) {
    events.push({
      id: milestone.id,
      date: milestone.date.slice(0, 10),
      year: yearFromDate(milestone.date),
      label: milestone.label,
      kind: "milestone",
    });
  }

  const seen = new Set<string>();
  return events
    .filter((event) => {
      const key = `${event.date ?? ""}|${event.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const da = a.date ?? `${a.year ?? 0}-01-01`;
      const db = b.date ?? `${b.year ?? 0}-01-01`;
      return da.localeCompare(db);
    });
}

export function formatTimelineEventDate(event: ExperienceTimelineEvent): string {
  if (event.date) return formatChartJourneyDate(event.date);
  if (event.year) return String(event.year);
  return "—";
}
