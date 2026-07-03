import { inspectQuery } from "@/lib/inspect/pg";

/** Healthy control — album links + cover present. */
export const HEALING_HEALTHY_CONTROL_RVTR = "RVTR336241";

/** Primary degraded fixture from production audit. */
export const STAND_BY_ME_PRIMARY_RVTR = "RVTR430551";

export type StandByMeClusterRow = {
  track_id: string;
  canonical_title: string;
  canonical_artist_name: string;
  chart_weeks: number;
  peak_hot100_position: number | null;
  missing_album_link: boolean;
};

/**
 * Hot 100 "Stand By Me" title cluster — capped for manual review.
 * Includes linked + unlinked rows so reviewers see contrast.
 */
export async function loadStandByMeClusterRvtrs(
  limit = 20,
): Promise<string[]> {
  const rows = await inspectQuery<StandByMeClusterRow>(
    `
    SELECT
      ctd.track_id,
      ctd.canonical_title,
      ctd.canonical_artist_name,
      ctd.chart_weeks,
      ctd.peak_hot100_position,
      NOT EXISTS (
        SELECT 1 FROM canonical_album_tracks cat
        WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))
      ) AS missing_album_link
    FROM canonical_track_display ctd
    WHERE ctd.has_hot100 = true
      AND lower(trim(ctd.canonical_title)) LIKE '%stand by me%'
    ORDER BY
      missing_album_link DESC,
      ctd.chart_weeks DESC,
      ctd.peak_hot100_position ASC NULLS LAST
    LIMIT $1
    `,
    [limit],
  );

  const rvtrs = rows.map((r) => r.track_id.trim().toUpperCase());
  if (!rvtrs.includes(STAND_BY_ME_PRIMARY_RVTR)) {
    rvtrs.unshift(STAND_BY_ME_PRIMARY_RVTR);
  }
  return [...new Set(rvtrs)].slice(0, limit);
}

export async function loadStandByMeClusterMeta(): Promise<StandByMeClusterRow[]> {
  const rvtrs = await loadStandByMeClusterRvtrs(20);
  if (rvtrs.length === 0) return [];

  const rows = await inspectQuery<StandByMeClusterRow>(
    `
    SELECT
      ctd.track_id,
      ctd.canonical_title,
      ctd.canonical_artist_name,
      ctd.chart_weeks,
      ctd.peak_hot100_position,
      NOT EXISTS (
        SELECT 1 FROM canonical_album_tracks cat
        WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))
      ) AS missing_album_link
    FROM canonical_track_display ctd
    WHERE upper(trim(ctd.track_id)) = ANY($1::text[])
    ORDER BY
      missing_album_link DESC,
      ctd.chart_weeks DESC,
      ctd.peak_hot100_position ASC NULLS LAST
    `,
    [rvtrs],
  );
  return rows;
}
