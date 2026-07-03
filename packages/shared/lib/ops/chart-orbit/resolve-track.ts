import { inspectQuery } from "@/lib/inspect/pg";

import type { ChartOrbitTrackRef } from "./types";

const RE_RVTR = /^RVTR\d{6}$/i;
const RE_GRAPH_ID = /^\d+$/;

type DisplayRow = {
  track_id: string;
  rvtr: string | null;
  canonical_title: string;
  canonical_artist_name: string;
  peak_hot100_position: number | null;
  chart_weeks: number;
};

function mapRow(row: DisplayRow): ChartOrbitTrackRef {
  return {
    rvtr: row.rvtr?.trim().toUpperCase() ?? null,
    graphTrackId: row.track_id.trim(),
    title: row.canonical_title.trim(),
    artistName: row.canonical_artist_name.trim(),
  };
}

async function loadByRvtr(rvtr: string): Promise<ChartOrbitTrackRef | null> {
  const rows = await inspectQuery<DisplayRow>(
    `
    SELECT ctd.track_id,
           upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) AS rvtr,
           ctd.canonical_title,
           ctd.canonical_artist_name,
           ctd.peak_hot100_position,
           ctd.chart_weeks
    FROM canonical_track_display ctd
    WHERE upper(trim(ctd.track_id)) = upper(trim($1))
       OR upper(trim(coalesce(ctd.retroverse_track_id, ''))) = upper(trim($1))
    LIMIT 1
    `,
    [rvtr],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

async function loadByGraphId(graphTrackId: string): Promise<ChartOrbitTrackRef | null> {
  const rows = await inspectQuery<DisplayRow>(
    `
    SELECT ctd.track_id,
           upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) AS rvtr,
           ctd.canonical_title,
           ctd.canonical_artist_name,
           ctd.peak_hot100_position,
           ctd.chart_weeks
    FROM canonical_track_display ctd
    WHERE ctd.track_id::text = $1
    LIMIT 1
    `,
    [graphTrackId],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

async function loadByTitle(title: string, artistHint?: string): Promise<ChartOrbitTrackRef | null> {
  const needle = title.trim();
  if (!needle) return null;

  const rows = artistHint?.trim()
    ? await inspectQuery<DisplayRow>(
        `
        SELECT ctd.track_id,
               upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) AS rvtr,
               ctd.canonical_title,
               ctd.canonical_artist_name,
               ctd.peak_hot100_position,
               ctd.chart_weeks
        FROM canonical_track_display ctd
        WHERE ctd.canonical_title ILIKE $1
          AND ctd.canonical_artist_name ILIKE $2
        ORDER BY ctd.peak_hot100_position ASC NULLS LAST, ctd.chart_weeks DESC
        LIMIT 1
        `,
        [needle, `%${artistHint.trim()}%`],
      )
    : await inspectQuery<DisplayRow>(
        `
        SELECT ctd.track_id,
               upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) AS rvtr,
               ctd.canonical_title,
               ctd.canonical_artist_name,
               ctd.peak_hot100_position,
               ctd.chart_weeks
        FROM canonical_track_display ctd
        WHERE ctd.canonical_title ILIKE $1
        ORDER BY ctd.peak_hot100_position ASC NULLS LAST, ctd.chart_weeks DESC
        LIMIT 1
        `,
        [needle],
      );

  return rows[0] ? mapRow(rows[0]) : null;
}

export async function resolveChartOrbitTrack(
  input: string,
  options?: { artistHint?: string },
): Promise<ChartOrbitTrackRef | null> {
  const raw = input.trim();
  if (!raw) return null;

  if (RE_RVTR.test(raw)) return loadByRvtr(raw.toUpperCase());
  if (RE_GRAPH_ID.test(raw)) return loadByGraphId(raw);
  return loadByTitle(raw, options?.artistHint);
}
