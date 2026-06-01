/**
 * Read-only cover integrity audit. Writes JSON to /tmp/cover-audit.json
 * Usage: RETROVERSE_PG_SSL=0 node --env-file=.env.local tools/cover-integrity-audit.mjs
 */
import fs from "fs";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  host: process.env.RETROVERSE_PG_HOST ?? "localhost",
  port: Number(process.env.RETROVERSE_PG_PORT ?? "5432"),
  database: process.env.RETROVERSE_PG_DATABASE ?? "retroverse",
  user: process.env.RETROVERSE_PG_USER ?? "bobhopp",
  password: process.env.RETROVERSE_PG_PASSWORD ?? "",
  ssl: process.env.RETROVERSE_PG_SSL === "0" ? undefined : { rejectUnauthorized: false },
  max: 3,
});

async function q(text, params) {
  const r = await pool.query(text, params);
  return r.rows;
}

async function head(url) {
  try {
    const r = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(6000) });
    return r.status;
  } catch (e) {
    return `ERR:${e.cause?.code ?? e.message?.slice(0, 30)}`;
  }
}

async function mapPool(items, limit, fn) {
  const out = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const R2_BASE = (
  process.env.NEXT_PUBLIC_RETROVERSE_COVER_BASE_URL ||
  process.env.RETROVERSE_COVER_BASE_URL ||
  "https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev"
).replace(/\/+$/, "");

function r2Url(path) {
  return `${R2_BASE}/${String(path).replace(/^\/+/, "")}`;
}

async function main() {
  const totals = (await q(`
    SELECT count(*)::int AS total_albums,
      count(*) FILTER (WHERE nullif(trim(al.canonical_cover_path), '') IS NOT NULL)::int AS albums_with_canonical_path,
      count(*) FILTER (WHERE nullif(trim(al.canonical_cover_path), '') IS NULL)::int AS albums_without_canonical_path,
      count(DISTINCT al.id) FILTER (WHERE aek.external_key IS NOT NULL)::int AS albums_with_rval,
      count(DISTINCT al.id) FILTER (WHERE NOT EXISTS (SELECT 1 FROM album_external_keys x WHERE x.album_id = al.id))::int AS albums_without_rval
    FROM albums al LEFT JOIN album_external_keys aek ON aek.album_id = al.id
  `))[0];

  const artwork = (await q(`
    SELECT count(DISTINCT al.id)::int AS albums_with_artwork_link
    FROM albums al JOIN album_artwork_links aal ON aal.album_id = al.id
    WHERE nullif(trim(coalesce(aal.canonical_cover_path, aal.r2_cover_key)), '') IS NOT NULL
  `))[0];

  const rvalStats = (await q(`
    SELECT count(DISTINCT al.id)::int AS total_rval_albums,
      count(DISTINCT al.id) FILTER (WHERE nullif(trim(al.canonical_cover_path), '') IS NOT NULL)::int AS with_album_canonical_path,
      count(DISTINCT al.id) FILTER (
        WHERE nullif(trim(al.canonical_cover_path), '') IS NULL AND EXISTS (
          SELECT 1 FROM album_artwork_links aal WHERE aal.album_id = al.id
            AND nullif(trim(coalesce(aal.canonical_cover_path, aal.r2_cover_key)), '') IS NOT NULL)
      )::int AS artwork_link_only,
      count(DISTINCT al.id) FILTER (
        WHERE nullif(trim(al.canonical_cover_path), '') IS NULL AND NOT EXISTS (
          SELECT 1 FROM album_artwork_links aal WHERE aal.album_id = al.id
            AND nullif(trim(coalesce(aal.canonical_cover_path, aal.r2_cover_key)), '') IS NOT NULL)
      )::int AS no_cover_in_db
    FROM albums al JOIN album_external_keys aek ON aek.album_id = al.id
    WHERE nullif(trim(aek.external_key), '') IS NOT NULL
  `))[0];

  const gybr = await q(`
    SELECT aek.external_key AS rval, al.id AS pg_album_id, ar.canonical_name AS artist_name,
      al.title AS album_title, al.release_year, al.canonical_cover_path
    FROM albums al JOIN artists ar ON ar.id = al.artist_id
    LEFT JOIN album_external_keys aek ON aek.album_id = al.id
    WHERE lower(trim(al.title)) LIKE '%goodbye yellow brick road%'
    ORDER BY al.id
  `);

  const gybrArt = gybr.length
    ? await q(
        `SELECT aal.* FROM album_artwork_links aal WHERE aal.album_id = ANY($1::int[])
         ORDER BY aal.album_id, (aal.review_flag IN ('curated','ok')) DESC, aal.confidence_score DESC`,
        [gybr.map((r) => Number(r.pg_album_id))],
      )
    : [];

  const dupGroups = (await q(`
    SELECT count(*)::int AS duplicate_album_groups FROM (
      SELECT ar.canonical_name, al.title, al.release_year FROM albums al
      JOIN artists ar ON ar.id = al.artist_id JOIN album_external_keys aek ON aek.album_id = al.id
      GROUP BY ar.canonical_name, al.title, al.release_year HAVING count(DISTINCT aek.external_key) > 1
    ) t
  `))[0];

  const dupTop = await q(`
    SELECT ar.canonical_name, al.title, al.release_year, count(DISTINCT aek.external_key)::int AS rval_count,
      array_agg(DISTINCT aek.external_key ORDER BY aek.external_key) AS rvals,
      array_agg(DISTINCT al.id ORDER BY al.id) AS album_ids
    FROM albums al JOIN artists ar ON ar.id = al.artist_id JOIN album_external_keys aek ON aek.album_id = al.id
    GROUP BY ar.canonical_name, al.title, al.release_year HAVING count(DISTINCT aek.external_key) > 1
    ORDER BY rval_count DESC LIMIT 20
  `);

  const sameCoverShared = (await q(`
    SELECT count(*)::int AS cover_paths_shared_by_multiple_albums FROM (
      SELECT canonical_cover_path FROM albums WHERE nullif(trim(canonical_cover_path),'') IS NOT NULL
      GROUP BY canonical_cover_path HAVING count(DISTINCT id) > 1
    ) t
  `))[0];

  const multiArtwork = (await q(`
    SELECT count(*)::int AS albums_with_multiple_artwork_links FROM (
      SELECT al.id FROM albums al JOIN album_artwork_links aal ON aal.album_id = al.id
      GROUP BY al.id HAVING count(aal.id) > 1
    ) t
  `))[0];

  const missingSample = await q(`
    SELECT aek.external_key AS rval, al.id AS pg_album_id, ar.canonical_name, al.title, al.release_year
    FROM albums al JOIN artists ar ON ar.id = al.artist_id JOIN album_external_keys aek ON aek.album_id = al.id
    WHERE nullif(trim(aek.external_key), '') IS NOT NULL
      AND nullif(trim(al.canonical_cover_path), '') IS NULL
      AND NOT EXISTS (SELECT 1 FROM album_artwork_links aal WHERE aal.album_id = al.id
        AND nullif(trim(coalesce(aal.canonical_cover_path, aal.r2_cover_key)), '') IS NOT NULL)
    ORDER BY ar.canonical_name, al.title LIMIT 30
  `);

  const orphanPaths = (await q(`
    WITH all_paths AS (
      SELECT DISTINCT path FROM (
        SELECT nullif(trim(al.canonical_cover_path), '') AS path FROM albums al
        UNION SELECT nullif(trim(aal.canonical_cover_path), '') FROM album_artwork_links aal
        UNION SELECT nullif(trim(aal.r2_cover_key), '') FROM album_artwork_links aal
      ) p WHERE path IS NOT NULL
    ), path_rvals AS (
      SELECT path, upper(substring(path from 'RVAL[0-9]{6}')) AS path_rval FROM all_paths
    )
    SELECT count(*)::int AS db_paths_with_unknown_rval FROM path_rvals pr
    WHERE pr.path_rval IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM album_external_keys aek WHERE upper(trim(aek.external_key)) = pr.path_rval)
  `))[0];

  const orphanSamples = await q(`
    WITH all_paths AS (
      SELECT DISTINCT path FROM (
        SELECT nullif(trim(al.canonical_cover_path), '') AS path FROM albums al
        UNION SELECT nullif(trim(aal.canonical_cover_path), '') FROM album_artwork_links aal
        UNION SELECT nullif(trim(aal.r2_cover_key), '') FROM album_artwork_links aal
      ) p WHERE path IS NOT NULL
    ), path_rvals AS (
      SELECT path, upper(substring(path from 'RVAL[0-9]{6}')) AS path_rval FROM all_paths
    )
    SELECT path, path_rval FROM path_rvals pr
    WHERE pr.path_rval IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM album_external_keys aek WHERE upper(trim(aek.external_key)) = pr.path_rval)
    LIMIT 15
  `);

  const distinctPaths = (await q(`
    SELECT count(*)::int AS distinct_cover_paths FROM (
      SELECT DISTINCT path FROM (
        SELECT nullif(trim(al.canonical_cover_path), '') AS path FROM albums al
        UNION SELECT nullif(trim(aal.canonical_cover_path), '') FROM album_artwork_links aal
        UNION SELECT nullif(trim(aal.r2_cover_key), '') FROM album_artwork_links aal
      ) p WHERE path IS NOT NULL
    ) d
  `))[0];

  const withPaths = await q(`
    SELECT DISTINCT ON (aek.external_key)
      aek.external_key AS rval, al.id AS pg_album_id, ar.canonical_name, al.title, al.release_year,
      coalesce(nullif(trim(al.canonical_cover_path), ''),
        (SELECT nullif(trim(aal.canonical_cover_path), '') FROM album_artwork_links aal WHERE aal.album_id = al.id
         ORDER BY (aal.review_flag IN ('curated','ok')) DESC, aal.confidence_score DESC NULLS LAST LIMIT 1),
        (SELECT nullif(trim(aal.r2_cover_key), '') FROM album_artwork_links aal WHERE aal.album_id = al.id
         ORDER BY (aal.review_flag IN ('curated','ok')) DESC, aal.confidence_score DESC NULLS LAST LIMIT 1)
      ) AS cover_path
    FROM albums al JOIN artists ar ON ar.id = al.artist_id JOIN album_external_keys aek ON aek.album_id = al.id
    WHERE nullif(trim(aek.external_key), '') IS NOT NULL
    ORDER BY aek.external_key, al.id
  `);

  const pathRows = withPaths.filter((r) => r.cover_path);
  const headResults = await mapPool(pathRows, 25, async (row) => {
    const url = r2Url(row.cover_path);
    const status = await head(url);
    return { ...row, r2_url: url, r2_status: status };
  });

  const r2Ok = headResults.filter((r) => r.r2_status === 200).length;
  const r2Broken = headResults.filter((r) => r.r2_status !== 200).length;
  const brokenSample = headResults.filter((r) => r.r2_status !== 200).slice(0, 25);

  const noPathRvals = withPaths.filter((r) => !r.cover_path);

  const gybrTrace = [];
  for (const row of gybr) {
    const art = gybrArt.filter((a) => Number(a.album_id) === Number(row.pg_album_id));
    const path = row.canonical_cover_path || art[0]?.canonical_cover_path || art[0]?.r2_cover_key || null;
    const url = path ? r2Url(path) : null;
    gybrTrace.push({
      album: row,
      artwork_links: art.map((a) => ({
        link_id: a.id,
        canonical_cover_path: a.canonical_cover_path,
        r2_cover_key: a.r2_cover_key,
        review_flag: a.review_flag,
        confidence_score: a.confidence_score,
        source: a.source,
      })),
      resolved_cover_path: path,
      r2_url: url,
      r2_status: url ? await head(url) : null,
      failure_point:
        !row.rval
          ? "no RVAL in album_external_keys"
          : !path
            ? "no canonical_cover_path on albums and no album_artwork_links path"
            : url && (await head(url)) !== 200
              ? "R2 object missing or unreachable"
              : null,
    });
  }

  const total = Number(totals.total_albums);
  const withCanonical = Number(totals.albums_with_canonical_path);
  const rvalTotal = Number(rvalStats.total_rval_albums);
  const noCoverDb = Number(rvalStats.no_cover_in_db);

  const out = {
    generated_at: new Date().toISOString(),
    r2_base_used: R2_BASE,
    coverage: {
      total_albums: total,
      albums_with_canonical_cover_path: withCanonical,
      albums_without_canonical_cover_path: Number(totals.albums_without_canonical_path),
      albums_with_artwork_link: Number(artwork.albums_with_artwork_link),
      albums_with_rval: Number(totals.albums_with_rval),
      albums_without_rval: Number(totals.albums_without_rval),
      coverage_pct_canonical_path: total ? +((100 * withCanonical) / total).toFixed(2) : 0,
      rval_albums: rvalStats,
      coverage_pct_rval_with_db_path: rvalTotal
        ? +((100 * (rvalTotal - noCoverDb)) / rvalTotal).toFixed(2)
        : 0,
    },
    gybr_trace: gybrTrace,
    duplicates: {
      same_album_title_artist_year_multiple_rvals: Number(dupGroups.duplicate_album_groups),
      top_examples: dupTop,
      same_cover_path_multiple_albums: Number(sameCoverShared.cover_paths_shared_by_multiple_albums),
      albums_with_multiple_artwork_links: Number(multiArtwork.albums_with_multiple_artwork_links),
    },
    orphans: {
      db_paths_referencing_unknown_rval: Number(orphanPaths.db_paths_with_unknown_rval),
      note: "Full R2 orphan inventory requires bucket listing; not performed in this pass.",
      samples: orphanSamples,
    },
    broken_covers: {
      rval_albums_with_resolved_path: pathRows.length,
      r2_head_ok: r2Ok,
      r2_head_broken: r2Broken,
      rval_albums_with_no_path: noPathRvals.length,
      broken_sample: brokenSample,
      no_path_sample: noPathRvals.slice(0, 25),
    },
    missing_cover_sample: missingSample,
    distinct_cover_paths_in_db: Number(distinctPaths.distinct_cover_paths),
  };

  fs.writeFileSync("/tmp/cover-audit.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out.coverage, null, 2));
  console.log("broken", out.broken_covers.r2_head_ok, out.broken_covers.r2_head_broken, "no_path", out.broken_covers.rval_albums_with_no_path);
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
