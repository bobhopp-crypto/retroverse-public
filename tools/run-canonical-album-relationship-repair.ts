import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getInspectPool } from "@/lib/inspect/pg";

type CandidateRow = {
  rvtr: string;
  title: string;
  artist_name: string;
  first_chart_date: string;
  chart_year: number;
  cat_id: string;
  album_id: string;
  position: number;
  slot_title: string;
  old_canonical_track_key: string | null;
  old_canonical_source: string | null;
  old_confidence_score: string | null;
  old_review_flag: string | null;
  old_created_at: string | null;
  old_updated_at: string | null;
  album_title: string;
  release_year: number;
  rval: string | null;
  artist_id: string;
  artist_canonical_name: string;
  candidate_count: string;
  confidence: string;
  reason: string;
};

const APPLY = process.argv.includes("--apply");
const OUT_DIR = path.join(process.cwd(), "reports/data-repair");
const SOURCE = "canonical_album_relationship_repair_2026_07_15";

function csvEscape(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function toCsv(rows: Record<string, unknown>[]): string {
  const columns = Object.keys(rows[0] ?? {});
  return `${[
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n")}\n`;
}

function sqlString(value: unknown): string {
  if (value == null) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlNumber(value: unknown): string {
  return value == null || value === "" ? "NULL" : String(value);
}

function sqlTimestamp(value: unknown): string {
  if (!value) return "NULL";
  return `${sqlString(String(value).replace("T", " ").replace("Z", ""))}::timestamp`;
}

function candidateSql(): string {
  return `
    WITH missing AS (
      SELECT
        ctd.track_id AS rvtr,
        ctd.canonical_title AS title,
        ctd.canonical_artist_name AS artist_name,
        ctd.first_chart_date::text AS first_chart_date,
        extract(year FROM ctd.first_chart_date)::int AS chart_year
      FROM canonical_track_display ctd
      WHERE NOT EXISTS (
        SELECT 1
        FROM canonical_album_tracks cat
        WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))
      )
    ),
    candidates AS (
      SELECT
        m.*,
        cat.id AS cat_id,
        cat.album_id,
        cat.position,
        cat.title AS slot_title,
        cat.canonical_track_key AS old_canonical_track_key,
        cat.canonical_source AS old_canonical_source,
        cat.confidence_score AS old_confidence_score,
        cat.review_flag AS old_review_flag,
        cat.created_at::text AS old_created_at,
        cat.updated_at::text AS old_updated_at,
        al.title AS album_title,
        al.release_year,
        aek.external_key AS rval,
        ar.id AS artist_id,
        ar.canonical_name AS artist_canonical_name
      FROM missing m
      JOIN artists ar
        ON lower(regexp_replace(trim(ar.canonical_name), '^the\\s+', '', 'i')) =
           lower(regexp_replace(trim(m.artist_name), '^the\\s+', '', 'i'))
      JOIN albums al
        ON al.artist_id = ar.id
      JOIN canonical_album_tracks cat
        ON cat.album_id = al.id
       AND (cat.canonical_track_key IS NULL OR trim(cat.canonical_track_key) = '')
      LEFT JOIN album_external_keys aek
        ON aek.album_id = al.id
       AND aek.external_key ~* '^RVAL[0-9]{6}$'
      WHERE lower(regexp_replace(trim(cat.title), '[^a-z0-9]+', '', 'g')) =
            lower(regexp_replace(trim(m.title), '[^a-z0-9]+', '', 'g'))
    ),
    ranked AS (
      SELECT *, count(*) OVER (PARTITION BY rvtr) AS candidate_count
      FROM candidates
    )
    SELECT
      *,
      1.0::numeric AS confidence,
      'same canonical artist; exact normalized album-track title; unique unkeyed slot; chart year within one year of album release'::text AS reason
    FROM ranked
    WHERE candidate_count = 1
      AND chart_year IS NOT NULL
      AND release_year IS NOT NULL
      AND abs(chart_year - release_year) <= 1
    ORDER BY rvtr
    FOR UPDATE
  `;
}

function rollbackSql(rows: CandidateRow[], timestamp: string): string {
  const updates = rows.map((row) => {
    return [
      "UPDATE canonical_album_tracks SET",
      `canonical_track_key = ${sqlString(row.old_canonical_track_key)},`,
      `canonical_source = ${sqlString(row.old_canonical_source)},`,
      `confidence_score = ${sqlNumber(row.old_confidence_score)},`,
      `review_flag = ${sqlString(row.old_review_flag)},`,
      `updated_at = ${sqlTimestamp(row.old_updated_at)}`,
      `WHERE id = ${row.cat_id} AND canonical_track_key = ${sqlString(row.rvtr)};`,
    ].join(" ");
  });
  return `-- Roll back Canonical Album Relationship Repair ${timestamp}\nBEGIN;\n${updates.join("\n")}\nCOMMIT;\n`;
}

async function main() {
  const pool = getInspectPool();
  const client = await pool.connect();
  const timestamp = new Date().toISOString();
  const stamp = timestamp.replace(/[:.]/g, "-");
  await mkdir(OUT_DIR, { recursive: true });

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '60s'");
    const candidates = (await client.query<CandidateRow>(candidateSql())).rows;

    const backupRows = candidates.map((row) => ({
      canonical_album_tracks_id: row.cat_id,
      canonical_track_key: row.old_canonical_track_key,
      rvtr: row.rvtr,
      existing_album_relationship: {
        album_id: row.album_id,
        album_title: row.album_title,
        rval: row.rval,
        position: row.position,
        slot_title: row.slot_title,
        canonical_track_key: row.old_canonical_track_key,
        canonical_source: row.old_canonical_source,
        confidence_score: row.old_confidence_score,
        review_flag: row.old_review_flag,
        created_at: row.old_created_at,
        updated_at: row.old_updated_at,
      },
      proposed_album_relationship: {
        album_id: row.album_id,
        album_title: row.album_title,
        rval: row.rval,
        position: row.position,
        slot_title: row.slot_title,
        canonical_track_key: row.rvtr,
        confidence: Number(row.confidence),
        reason: row.reason,
      },
      timestamps: {
        exported_at: timestamp,
        old_created_at: row.old_created_at,
        old_updated_at: row.old_updated_at,
      },
    }));

    const backup = {
      generated_at: timestamp,
      sprint: "canonical-album-relationship-repair",
      mode: APPLY ? "prewrite-rollback-export" : "dry-run",
      selection_rule:
        "missing RVTR, same canonical artist, exact normalized album-track title, unique unkeyed slot, chart year within one year of album release",
      rows: backupRows,
    };

    const jsonPath = path.join(OUT_DIR, `canonical-album-relationship-rollback-${stamp}.json`);
    const csvPath = path.join(OUT_DIR, `canonical-album-relationship-rollback-${stamp}.csv`);
    const rollbackPath = path.join(OUT_DIR, `canonical-album-relationship-rollback-${stamp}.sql`);
    const appliedPath = path.join(OUT_DIR, `canonical-album-relationship-applied-${stamp}.json`);

    await writeFile(jsonPath, `${JSON.stringify(backup, null, 2)}\n`, "utf8");
    await writeFile(
      csvPath,
      toCsv(
        candidates.map((row) => ({
          canonical_album_tracks_id: row.cat_id,
          rvtr: row.rvtr,
          old_canonical_track_key: row.old_canonical_track_key,
          proposed_canonical_track_key: row.rvtr,
          album_id: row.album_id,
          album_title: row.album_title,
          rval: row.rval,
          position: row.position,
          slot_title: row.slot_title,
          confidence: row.confidence,
          reason: row.reason,
          old_canonical_source: row.old_canonical_source,
          old_confidence_score: row.old_confidence_score,
          old_review_flag: row.old_review_flag,
          old_updated_at: row.old_updated_at,
        })),
      ),
      "utf8",
    );
    await writeFile(rollbackPath, rollbackSql(candidates, timestamp), "utf8");

    if (!APPLY) {
      await client.query("ROLLBACK");
      console.log(JSON.stringify({ status: "dry_run", candidates: candidates.length, jsonPath, csvPath, rollbackPath }, null, 2));
      return;
    }

    const update = await client.query(
      `
      WITH payload AS (
        SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(cat_id bigint, rvtr text)
      )
      UPDATE canonical_album_tracks cat
      SET canonical_track_key = payload.rvtr,
          canonical_source = $2,
          confidence_score = 1.0,
          review_flag = 'curated',
          updated_at = now()
      FROM payload
      WHERE cat.id = payload.cat_id
        AND (cat.canonical_track_key IS NULL OR trim(cat.canonical_track_key) = '')
      RETURNING cat.id, cat.album_id, cat.position, cat.title, cat.canonical_track_key
      `,
      [JSON.stringify(candidates.map((row) => ({ cat_id: row.cat_id, rvtr: row.rvtr }))), SOURCE],
    );

    if (update.rowCount !== candidates.length) {
      throw new Error(`Expected to update ${candidates.length} rows, updated ${update.rowCount ?? 0}`);
    }

    await writeFile(
      appliedPath,
      `${JSON.stringify(
        {
          generated_at: timestamp,
          rows_updated: update.rowCount,
          backup_json: jsonPath,
          backup_csv: csvPath,
          rollback_sql: rollbackPath,
          updated: update.rows,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    await client.query("COMMIT");
    console.log(
      JSON.stringify(
        {
          status: "applied",
          rows_updated: update.rowCount,
          backup_json: jsonPath,
          backup_csv: csvPath,
          rollback_sql: rollbackPath,
          applied_json: appliedPath,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
