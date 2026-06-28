import { deriveRowBadges } from "@/lib/chart-journey/derive-row-badges";
import type { ChartJourneyGap, ChartJourneyModel } from "@/lib/chart-journey/types";

import type { ChartJourneyTimelineWeek, ChartJourneyWeekEnrichment } from "./types";

function emptyEnrichment(): ChartJourneyWeekEnrichment {
  return {
    billboardCover: null,
    topFiveThatWeek: null,
    songsAboveBelow: null,
    historicalEvents: null,
    tvAppearances: null,
    albumSales: null,
    certifications: null,
    retroverseConnections: null,
  };
}

function movementLabel(delta: number | null): string {
  if (delta == null) return "Debut week";
  if (delta === 0) return "No change";
  if (delta > 0) return `▲ ${delta}`;
  return `▼ ${Math.abs(delta)}`;
}

function gapBeforeIndex(
  gaps: ChartJourneyGap[],
  rows: ChartJourneyModel["rows"],
  index: number,
): number | null {
  const row = rows[index];
  if (!row) return null;
  const gap = gaps.find((g) => g.returnDate === row.week.issueDate);
  return gap?.weeksAbsent ?? null;
}

/** Build authoritative week-by-week timeline from chart model — never collapses weeks. */
export function buildTimelineWeeks(model: ChartJourneyModel): ChartJourneyTimelineWeek[] {
  const weeks = model.rows.map((row) => row.week);
  const peak = model.metrics.peakPosition;
  let peakToDate = model.maxRank;

  return model.rows.map((row, index) => {
    peakToDate = Math.min(peakToDate, row.week.rank);
    const previous = index > 0 ? model.rows[index - 1] : null;
    const movement =
      row.detail.movementFromPrevious ??
      (previous != null ? previous.week.rank - row.week.rank : null);

    const hooks = row.context;
    const enrichment: ChartJourneyWeekEnrichment = {
      ...emptyEnrichment(),
      retroverseConnections: hooks.href ? [`Chart week portal: ${hooks.href}`] : null,
    };

    return {
      weekIndex: index,
      issueDate: row.week.issueDate,
      dateLabel: row.dateLabel,
      rank: row.week.rank,
      movementFromPrevious: movement,
      movementLabel: movementLabel(movement),
      weeksOnChart: row.weekNumber,
      peakToDate,
      badges: deriveRowBadges({ week: row.week, weekIndex: index, weeks, peakPosition: peak }),
      barWidthPct: row.barWidthPct,
      barColor: row.barColor,
      heatBand: row.heatBand,
      reentryGapWeeks: gapBeforeIndex(model.gaps, model.rows, index),
      enrichment,
      linkedChapterIds: [],
      chartWeekHref: hooks.href || null,
    };
  });
}
