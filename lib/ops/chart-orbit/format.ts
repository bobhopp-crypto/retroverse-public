import type { ChartOrbitNeighborRow, ChartOrbitReport } from "./types";

function csvEscape(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function csvRow(values: (string | number | null | undefined)[]): string {
  return values.map(csvEscape).join(",");
}

function focusLabel(report: ChartOrbitReport): string {
  const { focus } = report;
  const id = focus.rvtr ?? focus.graphTrackId;
  return `${id} · ${focus.title} · ${focus.artistName}`;
}

export function formatChartOrbitSummaryTable(report: ChartOrbitReport): string {
  const { focusStats } = report;
  const lines = [
    "Chart Orbit — summary",
    "=====================",
    `Focus: ${focusLabel(report)}`,
    `Peak: #${focusStats.peakPosition ?? "—"}`,
    `Chart run: ${focusStats.firstChartDate ?? "—"} → ${focusStats.lastChartDate ?? "—"}`,
    `Total chart weeks: ${report.totalChartWeeks}`,
    `Unique neighboring songs: ${report.uniqueNeighbors}`,
    `Neighbor observations: ${report.weekDetails.length}`,
    "",
  ];
  return lines.join("\n");
}

export function formatChartOrbitNeighborsTable(
  report: ChartOrbitReport,
  limit = 20,
): string {
  const lines = [
    "Orbit companions (playlist-ranked)",
    "==================================",
    padRow([
      "Rank",
      "Score",
      "Ovlp",
      "Ovlp%",
      "Peak",
      "Weeks",
      "Prox",
      "RVTR",
      "Title",
      "Fate",
    ]),
    padRow(["----", "-----", "----", "-----", "----", "-----", "----", "----", "-----", "----"]),
  ];

  report.neighborRows.slice(0, limit).forEach((row, index) => {
    lines.push(
      padRow([
        String(index + 1),
        row.playlistScore.toFixed(1),
        String(row.weeksOverlapping),
        `${row.overlapPctOfFocus.toFixed(1)}%`,
        row.peakPosition != null ? `#${row.peakPosition}` : "—",
        String(row.totalChartWeeks),
        row.avgProximity.toFixed(2),
        row.rvtr ?? row.graphTrackId,
        row.title,
        row.fateLabel,
      ]),
    );
  });

  if (report.neighborRows.length > limit) {
    lines.push(`… ${report.neighborRows.length - limit} more neighbors`);
  }

  return lines.join("\n");
}

function padRow(cols: string[]): string {
  const widths = [4, 5, 4, 6, 5, 5, 5, 12, 24, 16];
  return cols
    .map((col, i) => {
      const w = widths[i] ?? 14;
      return col.length > w ? `${col.slice(0, w - 1)}…` : col.padEnd(w);
    })
    .join("  ");
}

export function formatChartOrbitReport(report: ChartOrbitReport): string {
  return [
    formatChartOrbitSummaryTable(report),
    formatChartOrbitNeighborsTable(report),
  ].join("\n\n");
}

const NEIGHBOR_ANALYSIS_COLUMNS = [
  "rank",
  "playlist_score",
  "fate_label",
  "weeks_overlapping",
  "frequency",
  "avg_proximity",
  "min_proximity",
  "max_proximity",
  "overlap_pct_of_neighbor",
  "overlap_pct_of_focus",
  "overlap_first_date",
  "overlap_last_date",
  "neighbor_peak_position",
  "neighbor_total_chart_weeks",
  "neighbor_first_chart_date",
  "neighbor_last_chart_date",
  "neighbor_rvtr",
  "neighbor_graph_track_id",
  "neighbor_title",
  "neighbor_artist",
] as const;

function neighborAnalysisValues(row: ChartOrbitNeighborRow, rank: number) {
  return [
    rank,
    row.playlistScore.toFixed(2),
    row.fateLabel,
    row.weeksOverlapping,
    row.frequency,
    row.avgProximity.toFixed(3),
    row.minProximity,
    row.maxProximity,
    row.overlapPctOfNeighbor.toFixed(1),
    row.overlapPctOfFocus.toFixed(1),
    row.overlapFirstDate,
    row.overlapLastDate,
    row.peakPosition,
    row.totalChartWeeks,
    row.firstChartDate,
    row.lastChartDate,
    row.rvtr,
    row.graphTrackId,
    row.title,
    row.artistName,
  ];
}

export function chartOrbitSummaryCsv(report: ChartOrbitReport): string {
  const header = [
    "focus_rvtr",
    "focus_graph_track_id",
    "focus_title",
    "focus_artist",
    "focus_peak_position",
    "focus_total_chart_weeks",
    "focus_first_chart_date",
    "focus_last_chart_date",
    "unique_neighbors",
    "neighbor_observations",
    "generated_at",
  ].join(",");

  const row = csvRow([
    report.focus.rvtr,
    report.focus.graphTrackId,
    report.focus.title,
    report.focus.artistName,
    report.focusStats.peakPosition,
    report.focusStats.totalChartWeeks,
    report.focusStats.firstChartDate,
    report.focusStats.lastChartDate,
    report.uniqueNeighbors,
    report.weekDetails.length,
    report.generatedAt,
  ]);

  return `${header}\n${row}\n`;
}

/** Legacy neighbor export — kept for backward compatibility. */
export function chartOrbitNeighborsCsv(report: ChartOrbitReport): string {
  const header = NEIGHBOR_ANALYSIS_COLUMNS.join(",");
  const rows = report.neighborRows.map((row, index) =>
    csvRow(neighborAnalysisValues(row, index + 1)),
  );
  return `${header}\n${rows.join("\n")}\n`;
}

export function chartOrbitWeeksCsv(report: ChartOrbitReport): string {
  const header = [
    "chart_date",
    "focus_position",
    "neighbor_position",
    "proximity",
    "neighbor_key",
    "neighbor_title",
    "neighbor_artist",
  ].join(",");

  const rows = report.weekDetails.map((row) =>
    csvRow([
      row.chartDate,
      row.focusPosition,
      row.neighborPosition,
      row.proximity,
      row.neighborKey,
      row.neighborTitle,
      row.neighborArtist,
    ]),
  );

  return `${header}\n${rows.join("\n")}\n`;
}

/** DJ-ready playlist derived from orbit companions. */
export function chartOrbitPlaylistCsv(report: ChartOrbitReport, limit = 30): string {
  const header = [
    "playlist_rank",
    "playlist_score",
    "rvtr",
    "graph_track_id",
    "title",
    "artist",
    "weeks_overlapping",
    "avg_proximity",
    "overlap_pct_of_focus",
    "peak_position",
    "total_chart_weeks",
    "first_chart_date",
    "last_chart_date",
    "fate_label",
    "focus_rvtr",
    "focus_title",
    "focus_artist",
  ].join(",");

  const rows = report.neighborRows.slice(0, limit).map((row, index) =>
    csvRow([
      index + 1,
      row.playlistScore.toFixed(2),
      row.rvtr,
      row.graphTrackId,
      row.title,
      row.artistName,
      row.weeksOverlapping,
      row.avgProximity.toFixed(3),
      row.overlapPctOfFocus.toFixed(1),
      row.peakPosition,
      row.totalChartWeeks,
      row.firstChartDate,
      row.lastChartDate,
      row.fateLabel,
      report.focus.rvtr,
      report.focus.title,
      report.focus.artistName,
    ]),
  );

  return `${header}\n${rows.join("\n")}\n`;
}

/** Full companion analysis — all neighbors, all metrics. */
export function chartOrbitCompanionAnalysisCsv(report: ChartOrbitReport): string {
  const header = [
    "focus_rvtr",
    "focus_title",
    "focus_artist",
    "focus_peak_position",
    "focus_total_chart_weeks",
    "focus_first_chart_date",
    "focus_last_chart_date",
    ...NEIGHBOR_ANALYSIS_COLUMNS,
  ].join(",");

  const rows = report.neighborRows.map((row, index) =>
    csvRow([
      report.focus.rvtr,
      report.focus.title,
      report.focus.artistName,
      report.focusStats.peakPosition,
      report.focusStats.totalChartWeeks,
      report.focusStats.firstChartDate,
      report.focusStats.lastChartDate,
      ...neighborAnalysisValues(row, index + 1),
    ]),
  );

  return `${header}\n${rows.join("\n")}\n`;
}

/** Chart fate of each companion relative to the focus run. */
export function chartOrbitFateReportCsv(report: ChartOrbitReport): string {
  const header = [
    "focus_rvtr",
    "focus_title",
    "focus_peak_position",
    "focus_total_chart_weeks",
    "focus_first_chart_date",
    "focus_last_chart_date",
    "neighbor_rvtr",
    "neighbor_title",
    "neighbor_artist",
    "neighbor_peak_position",
    "neighbor_total_chart_weeks",
    "neighbor_first_chart_date",
    "neighbor_last_chart_date",
    "weeks_overlapping",
    "avg_proximity",
    "overlap_pct_of_neighbor",
    "overlap_pct_of_focus",
    "overlap_first_date",
    "overlap_last_date",
    "overlap_span_weeks",
    "fate_label",
    "playlist_score",
    "relationship_summary",
  ].join(",");

  const rows = report.neighborRows.map((row) => {
    const overlapSpanWeeks =
      row.overlapFirstDate && row.overlapLastDate
        ? Math.max(
            1,
            Math.round(
              (Date.parse(row.overlapLastDate) - Date.parse(row.overlapFirstDate)) /
                (7 * 24 * 60 * 60 * 1000),
            ) + 1,
          )
        : 0;

    const relationshipSummary = buildRelationshipSummary(report, row);

    return csvRow([
      report.focus.rvtr,
      report.focus.title,
      report.focusStats.peakPosition,
      report.focusStats.totalChartWeeks,
      report.focusStats.firstChartDate,
      report.focusStats.lastChartDate,
      row.rvtr,
      row.title,
      row.artistName,
      row.peakPosition,
      row.totalChartWeeks,
      row.firstChartDate,
      row.lastChartDate,
      row.weeksOverlapping,
      row.avgProximity.toFixed(3),
      row.overlapPctOfNeighbor.toFixed(1),
      row.overlapPctOfFocus.toFixed(1),
      row.overlapFirstDate,
      row.overlapLastDate,
      overlapSpanWeeks,
      row.fateLabel,
      row.playlistScore.toFixed(2),
      relationshipSummary,
    ]);
  });

  return `${header}\n${rows.join("\n")}\n`;
}

function buildRelationshipSummary(
  report: ChartOrbitReport,
  row: ChartOrbitNeighborRow,
): string {
  const parts: string[] = [];

  if (row.weeksOverlapping >= 4) parts.push("sustained orbit");
  else if (row.weeksOverlapping >= 2) parts.push("repeat adjacency");
  else parts.push("brief adjacency");

  if (row.overlapPctOfFocus >= 20) parts.push("high share of focus run");
  else if (row.overlapPctOfFocus >= 10) parts.push("moderate share of focus run");

  if (row.avgProximity <= 1.25) parts.push("usually adjacent");
  else if (row.avgProximity <= 1.75) parts.push("nearby on chart");

  if (
    row.firstChartDate &&
    report.focusStats.firstChartDate &&
    row.lastChartDate &&
    report.focusStats.lastChartDate
  ) {
    const neighborStartsBefore =
      row.firstChartDate < report.focusStats.firstChartDate;
    const neighborEndsAfter = row.lastChartDate > report.focusStats.lastChartDate;
    if (neighborStartsBefore && neighborEndsAfter) parts.push("longer chart life than focus");
    else if (neighborStartsBefore) parts.push("charted before focus");
    else if (neighborEndsAfter) parts.push("charted after focus");
  }

  return parts.join("; ");
}
