#!/usr/bin/env npx tsx
/**
 * Chart Journey re-entry audit — scans Hot 100 trajectories for runs, gaps, showcase records.
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

import { inspectQuery } from "../../lib/inspect/pg";
import {
  buildChartJourney,
  detectChartRuns,
} from "../../lib/chart-journey/build-chart-journey";
import { chartsToTrajectoryWeeks } from "../../lib/track/charts-to-trajectory-weeks";

const REPORT_DIR = join(process.cwd(), "reports/chart-journey");

type TrackRow = {
  track_id: string;
  canonical_title: string;
  canonical_artist_name: string;
  peak_hot100_position: number | null;
  chart_weeks: number;
};

type ChartRow = {
  track_id: string;
  chart_date: string;
  chart_position: number;
  weeks_on_chart: number | null;
};

type AuditEntry = {
  id: string;
  kind: "song" | "album";
  title: string;
  artist: string;
  peak: number | null;
  weeksOnChart: number;
  chartRunCount: number;
  reEntryCount: number;
  longestGapWeeks: number;
  biggestClimb: number | null;
  biggestDrop: number | null;
  fingerprint: string;
};

function fingerprint(model: NonNullable<ReturnType<typeof buildChartJourney>>): string {
  const shorthand: Record<string, string> = {
    numberOne: "1",
    top10: "R",
    top20: "O",
    top40: "Y",
    hot100: "G",
  };
  return model.rows.map((row) => shorthand[row.heatBand] ?? "?").join("");
}

function classifyJourney(entry: AuditEntry): string[] {
  const tags: string[] = [];
  if (entry.reEntryCount > 0) tags.push("re-entry");
  if (entry.weeksOnChart >= 30) tags.push("long-runner");
  if (entry.weeksOnChart <= 2) tags.push("one-week-wonder");
  if (entry.biggestClimb != null && entry.biggestClimb >= 20) tags.push("rocket-ship");
  if (entry.biggestDrop != null && entry.biggestDrop >= 20) tags.push("crash-and-burn");
  if (entry.chartRunCount === 1 && entry.weeksOnChart >= 10) tags.push("slow-climber");
  if (entry.reEntryCount > 0 && entry.longestGapWeeks >= 8) tags.push("comeback");
  return tags;
}

async function auditSongs(limit = 8000): Promise<AuditEntry[]> {
  const tracks = await inspectQuery<TrackRow>(
    `
    SELECT track_id, canonical_title, canonical_artist_name, peak_hot100_position, chart_weeks
    FROM canonical_track_display
    WHERE has_hot100 = true
      AND chart_weeks > 0
    ORDER BY chart_weeks DESC, peak_hot100_position ASC NULLS LAST
    LIMIT $1
    `,
    [limit],
  );

  if (tracks.length === 0) return [];

  const ids = tracks.map((t) => t.track_id);
  const chartRows = await inspectQuery<ChartRow>(
    `
    SELECT upper(trim(ct.track_id)) AS track_id,
           ca.chart_date::text AS chart_date,
           ca.chart_position,
           ca.weeks_on_chart
    FROM chart_appearances ca
    JOIN canonical_tracks ct ON ct.graph_track_id = ca.track_id
    WHERE upper(trim(ct.track_id)) = ANY($1::text[])
      AND ca.chart_name ILIKE '%Hot 100%'
    ORDER BY ca.chart_date ASC
    `,
    [ids],
  );

  const byTrack = new Map<string, ChartRow[]>();
  for (const row of chartRows) {
    const key = row.track_id.toUpperCase();
    const list = byTrack.get(key) ?? [];
    list.push(row);
    byTrack.set(key, list);
  }

  const entries: AuditEntry[] = [];

  for (const track of tracks) {
    const rows = byTrack.get(track.track_id.toUpperCase()) ?? [];
    if (rows.length === 0) continue;

    const weeks = chartsToTrajectoryWeeks(
      rows.map((row) => ({
        chart_date: row.chart_date.slice(0, 10),
        chart_position: row.chart_position,
        weeks_on_chart: row.weeks_on_chart,
      })),
    );
    const runs = detectChartRuns(weeks);
    const model = buildChartJourney({
      weeks,
      peak: track.peak_hot100_position,
      chartLabel: "Billboard Hot 100",
      focusTrackId: track.track_id,
    });
    if (!model) continue;

    const longestGapWeeks = runs.reduce(
      (max, run) => Math.max(max, run.weeksAbsent),
      0,
    );

    entries.push({
      id: track.track_id.toUpperCase(),
      kind: "song",
      title: track.canonical_title,
      artist: track.canonical_artist_name,
      peak: model.metrics.peakPosition,
      weeksOnChart: model.metrics.weeksOnChart,
      chartRunCount: model.metrics.chartRunCount,
      reEntryCount: model.metrics.reEntryCount,
      longestGapWeeks,
      biggestClimb: model.metrics.biggestWeeklyClimb,
      biggestDrop: model.metrics.biggestWeeklyDrop,
      fingerprint: fingerprint(model),
    });
  }

  return entries;
}

async function auditAlbums(limit = 2000): Promise<AuditEntry[]> {
  const albums = await inspectQuery<{
    rval: string;
    title: string;
    artist_name: string;
    b200_peak: number | null;
    chart_weeks: number;
  }>(
    `
    SELECT aek.external_key AS rval,
           al.title,
           ar.canonical_name AS artist_name,
           min(ca.chart_position) AS b200_peak,
           max(coalesce(ca.weeks_on_chart, 0))::int AS chart_weeks
    FROM albums al
    JOIN artists ar ON ar.id = al.artist_id
    JOIN album_external_keys aek ON aek.album_id = al.id
    JOIN chart_appearances ca ON ca.album_id = al.id
    WHERE ca.chart_name = 'Billboard 200'
      AND aek.external_key ~ '^RVAL[0-9]{6}$'
    GROUP BY aek.external_key, al.title, ar.canonical_name
    HAVING count(*) > 1
    ORDER BY max(coalesce(ca.weeks_on_chart, 0)) DESC
    LIMIT $1
    `,
    [limit],
  );

  const entries: AuditEntry[] = [];

  for (const album of albums) {
    const chartRows = await inspectQuery<{
      chart_date: string;
      chart_position: number;
      weeks_on_chart: number | null;
    }>(
      `
      SELECT ca.chart_date::text AS chart_date, ca.chart_position, ca.weeks_on_chart
      FROM chart_appearances ca
      JOIN albums al ON al.id = ca.album_id
      JOIN album_external_keys aek ON aek.album_id = al.id
      WHERE upper(trim(aek.external_key)) = upper(trim($1))
        AND ca.chart_name = 'Billboard 200'
      ORDER BY ca.chart_date ASC
      `,
      [album.rval],
    );

    if (chartRows.length < 2) continue;

    const weeks = chartsToTrajectoryWeeks(
      chartRows.map((row) => ({
        chart_date: row.chart_date.slice(0, 10),
        chart_position: row.chart_position,
        weeks_on_chart: row.weeks_on_chart,
      })),
      { maxRank: 200 },
    );
    const runs = detectChartRuns(weeks);
    const model = buildChartJourney({
      weeks,
      peak: album.b200_peak,
      chartLabel: "Billboard 200",
      maxRank: 200,
    });
    if (!model) continue;

    entries.push({
      id: album.rval.toUpperCase(),
      kind: "album",
      title: album.title,
      artist: album.artist_name,
      peak: model.metrics.peakPosition,
      weeksOnChart: model.metrics.weeksOnChart,
      chartRunCount: model.metrics.chartRunCount,
      reEntryCount: model.metrics.reEntryCount,
      longestGapWeeks: runs.reduce((max, run) => Math.max(max, run.weeksAbsent), 0),
      biggestClimb: model.metrics.biggestWeeklyClimb,
      biggestDrop: model.metrics.biggestWeeklyDrop,
      fingerprint: fingerprint(model),
    });
  }

  return entries;
}

function mdTable(rows: string[][]): string {
  if (rows.length === 0) return "_None found._\n";
  const header = rows[0]!;
  const body = rows.slice(1);
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...body.map((row) => `| ${row.join(" | ")} |`),
  ];
  return `${lines.join("\n")}\n`;
}

async function main() {
  mkdirSync(REPORT_DIR, { recursive: true });

  const [songs, albums] = await Promise.all([auditSongs(), auditAlbums()]);
  const songReentries = songs.filter((e) => e.reEntryCount > 0);
  const albumReentries = albums.filter((e) => e.reEntryCount > 0);

  const showcaseRvtrs = [
    "RVTR044043", // Heart Of Glass
    "RVTR023559", // Dreams
    "RVTR891825", // American Pie
    "RVTR048992", // Hotel California (guess - verify)
    "RVTR097615", // Rumours track? 
  ];

  const showcase = songs.filter((s) =>
    showcaseRvtrs.includes(s.id) ||
    /heart of glass|dreams|american pie|hotel california|rumours|night fever/i.test(
      `${s.title} ${s.artist}`,
    ),
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    songCount: songs.length,
    albumCount: albums.length,
    songReEntryCount: songReentries.length,
    albumReEntryCount: albumReentries.length,
    topWeeksOnChart: [...songs].sort((a, b) => b.weeksOnChart - a.weeksOnChart).slice(0, 25),
    topReEntries: [...songReentries].sort((a, b) => b.reEntryCount - a.reEntryCount).slice(0, 25),
    largestReturnGaps: [...songReentries]
      .sort((a, b) => b.longestGapWeeks - a.longestGapWeeks)
      .slice(0, 25),
    mostRuns: [...songs].sort((a, b) => b.chartRunCount - a.chartRunCount).slice(0, 25),
    showcase,
  };

  writeFileSync(join(REPORT_DIR, "reentry-audit.json"), JSON.stringify(payload, null, 2));

  const md = `# Chart Journey — Re-Entry Audit

**Generated:** ${payload.generatedAt.slice(0, 10)}

## Summary

| Metric | Songs | Albums |
|--------|------:|-------:|
| Scanned | ${songs.length} | ${albums.length} |
| With re-entries | ${songReentries.length} | ${albumReentries.length} |

## Showcase Candidates

${mdTable([
  ["RVTR/RVAL", "Title", "Artist", "Peak", "Weeks", "Runs", "Re-Entries", "Tags"],
  ...showcase.slice(0, 12).map((e) => [
    e.id,
    e.title,
    e.artist,
    e.peak != null ? `#${e.peak}` : "—",
    String(e.weeksOnChart),
    String(e.chartRunCount),
    String(e.reEntryCount),
    classifyJourney(e).join(", ") || "—",
  ]),
])}

## Most Weeks On Chart (Songs)

${mdTable([
  ["RVTR", "Title", "Artist", "Peak", "Weeks", "Runs", "Re-Entries"],
  ...payload.topWeeksOnChart.map((e) => [
    e.id,
    e.title,
    e.artist,
    e.peak != null ? `#${e.peak}` : "—",
    String(e.weeksOnChart),
    String(e.chartRunCount),
    String(e.reEntryCount),
  ]),
])}

## Largest Return Gaps (Songs)

${mdTable([
  ["RVTR", "Title", "Artist", "Gap (weeks)", "Re-Entries", "Peak"],
  ...payload.largestReturnGaps.map((e) => [
    e.id,
    e.title,
    e.artist,
    String(e.longestGapWeeks),
    String(e.reEntryCount),
    e.peak != null ? `#${e.peak}` : "—",
  ]),
])}

## Most Chart Runs (Songs)

${mdTable([
  ["RVTR", "Title", "Artist", "Runs", "Re-Entries", "Weeks"],
  ...payload.mostRuns.map((e) => [
    e.id,
    e.title,
    e.artist,
    String(e.chartRunCount),
    String(e.reEntryCount),
    String(e.weeksOnChart),
  ]),
])}

## Album Re-Entries (Top 15)

${mdTable([
  ["RVAL", "Title", "Artist", "Peak", "Weeks", "Runs", "Re-Entries", "Longest Gap"],
  ...albumReentries
    .sort((a, b) => b.reEntryCount - a.reEntryCount)
    .slice(0, 15)
    .map((e) => [
      e.id,
      e.title,
      e.artist,
      e.peak != null ? `#${e.peak}` : "—",
      String(e.weeksOnChart),
      String(e.chartRunCount),
      String(e.reEntryCount),
      String(e.longestGapWeeks),
    ]),
])}

## Journey Shapes (Fingerprint Legend)

- **R** = Top 10 (deep red)
- **O** = 11–25 (orange)
- **Y** = 26–50 (yellow)
- **G** = 51–75 (green)
- **D** = 76–100 (dark green)

Patrons read shape before numbers. Re-entry gaps render as labeled separators in Chart Journey UI.

`;

  writeFileSync(join(REPORT_DIR, "REENTRY-AUDIT.md"), md);
  console.log(`Wrote ${join(REPORT_DIR, "REENTRY-AUDIT.md")}`);
  console.log(`Songs with re-entries: ${songReentries.length}/${songs.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
