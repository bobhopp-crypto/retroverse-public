import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { WINNING_ARTWORK_LINK_ORDER } from "@/lib/artwork/winning-artwork-link-sql";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { buildFeaturedYearsFromConfig } from "@/lib/ops/event-control/featured-years";
import { loadEventControlConfig } from "@/lib/ops/event-control/store";

import type { YearCoverStrip } from "./home-featured-years";

/** Covers shown per year card when enough valid artwork exists. */
export const FEATURED_YEAR_COVER_COUNT = 5;

/** DB candidates to scan — extras absorb R2 404s without empty slots. */
const CANDIDATE_POOL = 36;

type CoverRow = {
  cover_path: string | null;
  artwork_path: string | null;
  r2_cover_key: string | null;
};

async function verifyCoverUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.ok;
  } catch {
    return false;
  }
}

async function loadCoverCandidatesForYear(year: number, pool: number): Promise<CoverRow[]> {
  return inspectQuery<CoverRow>(
    `
    WITH album_rank AS (
      SELECT
        al.id AS album_id,
        min(ca.chart_position) FILTER (
          WHERE ca.chart_name = 'Billboard 200'
            AND extract(year FROM ca.chart_date)::int = $1
        ) AS b200_peak,
        max(ca.weeks_on_chart) FILTER (
          WHERE ca.chart_name = 'Billboard 200'
            AND extract(year FROM ca.chart_date)::int = $1
        ) AS b200_weeks,
        min(ca.chart_position) FILTER (
          WHERE ca.chart_name = 'Hot 100'
            AND extract(year FROM ca.chart_date)::int = $1
        ) AS hot_peak,
        max(ca.weeks_on_chart) FILTER (
          WHERE ca.chart_name = 'Hot 100'
            AND extract(year FROM ca.chart_date)::int = $1
        ) AS hot_weeks
      FROM albums al
      LEFT JOIN chart_appearances ca ON ca.album_id = al.id
      WHERE (
        al.release_year = $1
        OR extract(year FROM ca.chart_date)::int = $1
      )
      GROUP BY al.id
    )
    SELECT
      al.canonical_cover_path AS cover_path,
      (
        SELECT aal.canonical_cover_path FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ${WINNING_ARTWORK_LINK_ORDER}
      ) AS artwork_path,
      (
        SELECT aal.r2_cover_key FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ${WINNING_ARTWORK_LINK_ORDER}
      ) AS r2_cover_key
    FROM albums al
    JOIN album_rank ar ON ar.album_id = al.id
    WHERE (
      nullif(trim(al.canonical_cover_path), '') IS NOT NULL
      OR EXISTS (
        SELECT 1 FROM album_artwork_links aal
        WHERE aal.album_id = al.id
          AND (
            nullif(trim(aal.canonical_cover_path), '') IS NOT NULL
            OR nullif(trim(aal.r2_cover_key), '') IS NOT NULL
          )
      )
    )
    ORDER BY
      ar.b200_peak ASC NULLS LAST,
      ar.hot_peak ASC NULLS LAST,
      ar.b200_weeks DESC NULLS LAST,
      ar.hot_weeks DESC NULLS LAST,
      al.id
    LIMIT $2
    `,
    [year, pool],
  );
}

async function loadVerifiedCoversForYear(
  year: number,
  desired = FEATURED_YEAR_COVER_COUNT,
): Promise<string[]> {
  const rows = await loadCoverCandidatesForYear(year, CANDIDATE_POOL);
  const valid: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (valid.length >= desired) break;
    const url = resolveAlbumCoverUrlFromRow(row);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    if (await verifyCoverUrl(url)) {
      valid.push(url);
    }
  }

  return valid;
}

/** Homepage year strips — only HTTP-verified covers (no blanks, no fallbacks). */
export async function loadFeaturedYearCovers(): Promise<YearCoverStrip[]> {
  const [ping, eventConfig] = await Promise.all([inspectPing(), loadEventControlConfig()]);
  const entries = buildFeaturedYearsFromConfig(eventConfig);

  if (!ping.ok) {
    return entries.map((entry) => ({ year: entry.year, coverUrls: [] }));
  }

  const strips = await Promise.all(
    entries.map(async (entry) => ({
      year: entry.year,
      coverUrls: await loadVerifiedCoversForYear(entry.year),
    })),
  );

  return strips;
}
