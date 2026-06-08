/**
 * Read-only public cover audit — row counts, homepage strip failures, URL HTTP checks.
 * Run: npx tsx tools/cover-audit-public.ts
 */
import { coverPathToUrl, getRetroverseCoverBaseUrl } from "../lib/artist/cover-url";
import { inspectPing, inspectQuery } from "../lib/inspect/pg";
import { loadFeaturedYearCovers } from "../lib/home/load-featured-year-covers";

const R2_PUBLIC =
  process.env.NEXT_PUBLIC_RETROVERSE_COVER_BASE_URL?.trim() ||
  process.env.RETROVERSE_COVER_BASE_URL?.trim() ||
  "https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev";

async function headUrl(url: string): Promise<number | "err"> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.status;
  } catch {
    return "err";
  }
}

async function inventory() {
  const tables = [
    {
      name: "albums",
      sql: `SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE nullif(trim(canonical_cover_path),'') IS NOT NULL)::int AS with_canonical_path
      FROM albums`,
    },
    {
      name: "album_artwork_links",
      sql: `SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE nullif(trim(canonical_cover_path),'') IS NOT NULL)::int AS with_path,
        count(*) FILTER (WHERE nullif(trim(r2_cover_key),'') IS NOT NULL)::int AS with_r2_key
      FROM album_artwork_links`,
    },
    {
      name: "album_external_keys (RVAL)",
      sql: `SELECT count(*)::int AS total FROM album_external_keys WHERE external_key ~* '^RVAL[0-9]{6}$'`,
    },
    {
      name: "media_assets (VDJ)",
      sql: `SELECT count(*)::int AS total FROM media_assets`,
    },
  ];

  console.log("\n=== PART 1 — INVENTORY ===\n");
  for (const t of tables) {
    try {
      const [row] = await inspectQuery<Record<string, number>>(t.sql, []);
      console.log(t.name, row);
    } catch (e) {
      console.log(t.name, "ERR", e instanceof Error ? e.message : e);
    }
  }

  const cols = await inspectQuery<{ table_name: string; column_name: string }>(
    `
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        column_name ILIKE '%cover%'
        OR column_name ILIKE '%artwork%'
        OR column_name ILIKE '%thumb%'
      )
    ORDER BY table_name, column_name
    `,
    [],
  );
  console.log("\nCover-related columns:", cols.length);
  for (const c of cols) console.log(`  ${c.table_name}.${c.column_name}`);
}

async function homepageFailureAnalysis() {
  console.log("\n=== PART 4 — HOMEPAGE STRIP FAILURE ANALYSIS ===\n");
  console.log("getRetroverseCoverBaseUrl():", getRetroverseCoverBaseUrl() ?? "(null → relative /retroverse/covers/)");
  console.log("R2_PUBLIC (audit reference):", R2_PUBLIC);

  const rows = await inspectQuery<{
    album_id: number;
    title: string;
    release_year: number | null;
    cover_path: string | null;
    artwork_path: string | null;
    r2_cover_key: string | null;
    rval: string | null;
  }>(
    `
    SELECT DISTINCT ON (al.id)
      al.id AS album_id,
      al.title,
      al.release_year,
      al.canonical_cover_path AS cover_path,
      (
        SELECT aal.canonical_cover_path FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
        LIMIT 1
      ) AS artwork_path,
      (
        SELECT aal.r2_cover_key FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
        LIMIT 1
      ) AS r2_cover_key,
      (
        SELECT upper(trim(aek.external_key)) FROM album_external_keys aek
        WHERE aek.album_id = al.id AND aek.external_key ~* '^RVAL[0-9]{6}$'
        LIMIT 1
      ) AS rval
    FROM albums al
    LEFT JOIN chart_appearances ca ON ca.album_id = al.id
    WHERE (al.release_year = 1967 OR extract(year FROM ca.chart_date)::int = 1967)
      AND (
        nullif(trim(al.canonical_cover_path), '') IS NOT NULL
        OR EXISTS (
          SELECT 1 FROM album_artwork_links aal
          WHERE aal.album_id = al.id
            AND (nullif(trim(aal.canonical_cover_path), '') IS NOT NULL OR nullif(trim(aal.r2_cover_key), '') IS NOT NULL)
        )
      )
    ORDER BY al.id, ca.chart_position ASC NULLS LAST
    LIMIT 5
    `,
    [],
  );

  for (const row of rows) {
    const relUrl =
      coverPathToUrl(row.artwork_path, row.r2_cover_key) ??
      coverPathToUrl(row.cover_path) ??
      null;
    const r2Url = relUrl?.startsWith("/")
      ? `${R2_PUBLIC.replace(/\/+$/, "")}${relUrl}`
      : relUrl;
    const relStatus = relUrl ? await headUrl(`http://localhost:3099${relUrl.startsWith("http") ? "" : relUrl}`) : null;
    const r2Status = r2Url ? await headUrl(r2Url) : null;
    console.log({
      album_id: row.album_id,
      rval: row.rval,
      title: row.title.slice(0, 40),
      cover_path: row.cover_path?.slice(0, 60),
      generated_relative: relUrl,
      relative_http: relStatus,
      r2_url: r2Url?.slice(0, 90),
      r2_http: r2Status,
    });
  }

  const strips = await loadFeaturedYearCovers();
  console.log("\nloadFeaturedYearCovers() output:");
  for (const s of strips) {
    console.log(`  ${s.year}: ${s.coverUrls.length} urls`);
    for (const u of s.coverUrls.slice(0, 2)) {
      const rel = u.startsWith("http") ? u : `http://localhost:3099${u}`;
      const r2 = u.startsWith("http") ? u : `${R2_PUBLIC.replace(/\/+$/, "")}${u}`;
      console.log(`    rel ${u} → ${await headUrl(rel)}`);
      console.log(`    r2  ${r2.slice(0, 85)} → ${await headUrl(r2)}`);
    }
  }
}

async function publicPageSample() {
  console.log("\n=== PART 3 — PUBLIC PAGE SAMPLES ===\n");
  const samples = [
    { label: "with cover", rval: "RVAL281995" },
    { label: "with cover", rval: "RVAL817194" },
    { label: "no cover", rval: "RVAL683990" },
  ];
  for (const s of samples) {
    const [row] = await inspectQuery<{
      title: string;
      cover_path: string | null;
      artwork_path: string | null;
      r2_cover_key: string | null;
    }>(
      `
      SELECT al.title, al.canonical_cover_path AS cover_path,
        (SELECT aal.canonical_cover_path FROM album_artwork_links aal WHERE aal.album_id = al.id
         ORDER BY (aal.review_flag IN ('curated','ok')) DESC LIMIT 1) AS artwork_path,
        (SELECT aal.r2_cover_key FROM album_artwork_links aal WHERE aal.album_id = al.id
         ORDER BY (aal.review_flag IN ('curated','ok')) DESC LIMIT 1) AS r2_cover_key
      FROM album_external_keys aek
      JOIN albums al ON al.id = aek.album_id
      WHERE upper(trim(aek.external_key)) = upper(trim($1))
      LIMIT 1
      `,
      [s.rval],
    );
    const url =
      coverPathToUrl(row?.artwork_path, row?.r2_cover_key) ??
      coverPathToUrl(row?.cover_path) ??
      null;
    const r2Full = url?.startsWith("/") ? `${R2_PUBLIC}${url}` : url;
    console.log(s.label, s.rval, row?.title, {
      url,
      r2_http: r2Full ? await headUrl(r2Full) : null,
    });
  }
}

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error("Postgres offline", ping.error);
    process.exit(1);
  }
  await inventory();
  await publicPageSample();
  await homepageFailureAnalysis();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
