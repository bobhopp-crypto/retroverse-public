#!/usr/bin/env node

import { Pool } from "pg";

function pgConfig() {
  const host = process.env.RETROVERSE_PG_HOST ?? "localhost";
  const local = host === "localhost" || host === "127.0.0.1";
  return {
    host,
    port: Number(process.env.RETROVERSE_PG_PORT ?? "5432"),
    database: process.env.RETROVERSE_PG_DATABASE ?? "retroverse",
    user: process.env.RETROVERSE_PG_USER ?? "bobhopp",
    password: process.env.RETROVERSE_PG_PASSWORD ?? "",
    ssl:
      local || process.env.RETROVERSE_PG_SSL === "0"
        ? undefined
        : { rejectUnauthorized: false },
    max: 2,
  };
}

function norm(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function yearPriority(year) {
  if (year >= 1958 && year <= 1962) return 1;
  if (year === 1967) return 3;
  if (year === 2019) return 4;
  if (year >= 2020 && year <= 2025) return 5;
  return 2;
}

const APPLY = process.argv.includes("--apply");

const pool = new Pool(pgConfig());

async function ensureArtist(client, cache, sourceArtist) {
  const key = norm(sourceArtist);
  if (cache.has(key)) return { id: cache.get(key), created: false };

  const found = await client.query(
    `
    SELECT id::bigint AS id
    FROM artists
    WHERE regexp_replace(lower(canonical_name), '[^a-z0-9]+', '', 'g') = $1
    ORDER BY id ASC
    LIMIT 1
    `,
    [key],
  );
  if (found.rows[0]?.id) {
    cache.set(key, found.rows[0].id);
    return { id: found.rows[0].id, created: false };
  }

  const inserted = await client.query(
    `
    INSERT INTO artists (canonical_name)
    VALUES ($1)
    RETURNING id::bigint AS id
    `,
    [sourceArtist.trim()],
  );
  const id = inserted.rows[0].id;
  cache.set(key, id);
  return { id, created: true };
}

async function ensureAlbum(client, cache, artistId, sourceAlbum) {
  const key = `${artistId}:${norm(sourceAlbum)}`;
  if (cache.has(key)) return { id: cache.get(key), created: false };

  const found = await client.query(
    `
    SELECT id::bigint AS id
    FROM albums
    WHERE artist_id = $1
      AND regexp_replace(lower(title), '[^a-z0-9]+', '', 'g') = $2
    ORDER BY id ASC
    LIMIT 1
    `,
    [artistId, norm(sourceAlbum)],
  );
  if (found.rows[0]?.id) {
    cache.set(key, found.rows[0].id);
    return { id: found.rows[0].id, created: false };
  }

  const inserted = await client.query(
    `
    INSERT INTO albums (artist_id, title, release_year, canonical_cover_path)
    VALUES ($1, $2, NULL, NULL)
    RETURNING id::bigint AS id
    `,
    [artistId, sourceAlbum.trim()],
  );
  const id = inserted.rows[0].id;
  cache.set(key, id);
  return { id, created: true };
}

async function loadMissingRows(client) {
  const result = await client.query(
    `
    WITH hot_dates AS (
      SELECT DISTINCT chart_date::date AS d
      FROM chart_appearances
      WHERE chart_name = 'Billboard Hot 100'
        AND chart_position = 1
    ),
    missing_dates AS (
      SELECT h.d
      FROM hot_dates h
      LEFT JOIN chart_appearances a
        ON a.chart_name = 'Billboard 200'
       AND a.chart_position = 1
       AND a.chart_date = h.d
      WHERE a.id IS NULL
    )
    SELECT
      s.chart_date::date AS chart_date,
      EXTRACT(YEAR FROM s.chart_date)::int AS year,
      s.source_artist,
      s.source_album,
      s.weeks_on_chart
    FROM staging_billboard_200_weekly s
    JOIN missing_dates m ON m.d = s.chart_date
    WHERE s.chart_position = 1
    ORDER BY
      CASE
        WHEN EXTRACT(YEAR FROM s.chart_date)::int BETWEEN 1958 AND 1962 THEN 1
        WHEN EXTRACT(YEAR FROM s.chart_date)::int = 1967 THEN 3
        WHEN EXTRACT(YEAR FROM s.chart_date)::int = 2019 THEN 4
        WHEN EXTRACT(YEAR FROM s.chart_date)::int BETWEEN 2020 AND 2025 THEN 5
        ELSE 2
      END,
      s.chart_date ASC
    `,
  );
  return result.rows;
}

async function coverage(client) {
  const result = await client.query(
    `
    WITH hot AS (
      SELECT DISTINCT chart_date::date AS d
      FROM chart_appearances
      WHERE chart_name = 'Billboard Hot 100'
        AND chart_position = 1
    ),
    alb AS (
      SELECT DISTINCT chart_date::date AS d
      FROM chart_appearances
      WHERE chart_name = 'Billboard 200'
        AND chart_position = 1
    )
    SELECT
      COUNT(*)::int AS expected_weeks,
      COUNT(alb.d)::int AS album_weeks,
      (COUNT(*) - COUNT(alb.d))::int AS missing_weeks
    FROM hot
    LEFT JOIN alb ON alb.d = hot.d
    `,
  );
  const row = result.rows[0];
  const expected = Number(row.expected_weeks);
  const album = Number(row.album_weeks);
  const missing = Number(row.missing_weeks);
  const pct = expected > 0 ? (album / expected) * 100 : 0;
  return { expected, album, missing, pct };
}

async function main() {
  const client = await pool.connect();
  const artistCache = new Map();
  const albumCache = new Map();
  const counters = {
    insertedRows: 0,
    insertedArtists: 0,
    insertedAlbums: 0,
    byYear: new Map(),
  };

  try {
    const before = await coverage(client);
    const rows = await loadMissingRows(client);

    if (!APPLY) {
      console.log(
        JSON.stringify(
          {
            mode: "dry-run",
            before,
            candidate_rows_from_authoritative_source: rows.length,
            priority_breakdown: rows.reduce((acc, row) => {
              const y = Number(row.year);
              const k = `p${yearPriority(y)}`;
              acc[k] = (acc[k] ?? 0) + 1;
              return acc;
            }, {}),
            note: "Run with --apply to execute inserts",
          },
          null,
          2,
        ),
      );
      return;
    }

    await client.query("BEGIN");

    for (const row of rows) {
      const year = Number(row.year);
      const artistResult = await ensureArtist(client, artistCache, row.source_artist);
      if (artistResult.created) counters.insertedArtists += 1;
      const albumResult = await ensureAlbum(
        client,
        albumCache,
        artistResult.id,
        row.source_album,
      );
      if (albumResult.created) counters.insertedAlbums += 1;

      const inserted = await client.query(
        `
        INSERT INTO chart_appearances (track_id, album_id, chart_date, chart_name, chart_position, weeks_on_chart)
        SELECT NULL, $1, $2, 'Billboard 200', 1, $3
        WHERE NOT EXISTS (
          SELECT 1
          FROM chart_appearances ca
          WHERE ca.chart_name = 'Billboard 200'
            AND ca.chart_position = 1
            AND ca.chart_date = $2
        )
        RETURNING id
        `,
        [albumResult.id, row.chart_date, row.weeks_on_chart],
      );
      if (inserted.rowCount > 0) {
        counters.insertedRows += 1;
        counters.byYear.set(year, (counters.byYear.get(year) ?? 0) + 1);
      }
    }

    await client.query("COMMIT");
    const after = await coverage(client);
    console.log(
      JSON.stringify(
        {
          mode: "apply",
          before,
          after,
          inserted_rows: counters.insertedRows,
          inserted_artists_estimate: counters.insertedArtists,
          inserted_albums_estimate: counters.insertedAlbums,
          repaired_by_year: Object.fromEntries(
            [...counters.byYear.entries()].sort((a, b) => a[0] - b[0]),
          ),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
