import type { InBothAuditRow } from "./audit";

function csvEscape(value: string | number | boolean | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

export function inBothAuditCsv(rows: InBothAuditRow[]): string {
  const header = [
    "billboard_title",
    "billboard_artist",
    "graph_track_id",
    "rvtr",
    "year_match_status",
    "vdj_performance_universe_status",
    "workspace_bucket_current",
    "workspace_bucket_correct",
    "exclusion_category",
    "reason_excluded_from_in_both",
    "has_ops_video_link",
    "manual_override",
    "linked_media_count",
    "best_match_label",
    "best_match_year_text",
    "best_match_source_path",
    "parsed_vdj_year",
    "passes_performance_year_filter",
    "passes_decade_folder_filter",
    "passes_ops_video_filter",
  ].join(",");

  const body = rows.map((row) =>
    [
      row.billboardTitle,
      row.billboardArtist,
      row.graphTrackId,
      row.rvtr,
      row.yearMatchStatus,
      row.vdjPerformanceUniverseStatus,
      row.workspaceBucket,
      row.workspaceBucketCorrect,
      row.exclusionCategory,
      row.reasonExcludedFromInBoth,
      row.hasOpsVideoLink,
      row.manualOverride,
      row.linkedMediaCount,
      row.bestMatchLabel,
      row.bestMatchYearText,
      row.bestMatchSourcePath,
      row.parsedVdjYear,
      row.passesPerformanceYearFilter,
      row.passesDecadeFolderFilter,
      row.passesOpsVideoFilter,
    ]
      .map(csvEscape)
      .join(","),
  );

  return `${header}\n${body.join("\n")}\n`;
}

export function formatInBothAuditSummary(
  rows: InBothAuditRow[],
  categoryCounts: [string, number][],
): string {
  const lines = [
    "1967 In Both Reconciliation Audit",
    "=================================",
    `Matched songs audited: ${rows.length}`,
    `In Both (workspace current): ${rows.filter((r) => r.workspaceBucket === "in_both").length}`,
    `In Both (correct): ${rows.filter((r) => r.workspaceBucketCorrect === "in_both").length}`,
    `Chart Only (current): ${rows.filter((r) => r.workspaceBucket === "chart_only").length}`,
    `Missing RVTR: ${rows.filter((r) => !r.rvtr).length}`,
    `Manual overrides: ${rows.filter((r) => r.manualOverride).length}`,
    "",
    "Exclusion categories:",
  ];

  for (const [cat, count] of categoryCounts) {
    lines.push(`  ${cat}: ${count}`);
  }

  lines.push("", "Sample rows (first 10):");
  for (const row of rows.slice(0, 10)) {
    lines.push(
      `  ${row.billboardArtist} — ${row.billboardTitle} · ${row.exclusionCategory} · ${row.reasonExcludedFromInBoth.slice(0, 80)}`,
    );
  }

  return lines.join("\n");
}
