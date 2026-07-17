import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getInspectPool } from "@/lib/inspect/pg";

type CandidateRow = {
  rvtr: string;
  title: string;
  artist_name: string;
  first_chart_date: string | null;
  chart_year: number | null;
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
  release_year: number | null;
  rval: string | null;
  artist_id: string;
  artist_canonical_name: string;
  candidate_count: string;
};

type ClassifiedRow = CandidateRow & {
  bucket: Bucket;
  final_confidence: number;
  recommendation: "promote_to_100" | "bob_review" | "remain_unresolved";
  evidence: string[];
  conflict_flags: string[];
};

type Bucket =
  | "A_original_studio_album_clearly_identifiable"
  | "B_compilation_only"
  | "C_multiple_studio_album_candidates"
  | "D_live_recording"
  | "E_remix_or_alternate_version"
  | "F_re_recording"
  | "G_artist_identity_conflict"
  | "H_album_title_ambiguity"
  | "I_insufficient_evidence"
  | "J_other";

const APPLY = process.argv.includes("--apply");
const OUT_DIR = path.join(process.cwd(), "reports/data-repair");
const SOURCE = "canonical_album_relationship_95_review_2026_07_15";

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

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bpt\b/g, "part")
    .replace(/\bno\b/g, "number")
    .replace(/\bim\b/g, "i am")
    .replace(/\bwere\b/g, "we are")
    .replace(/\bwhod\b/g, "who would")
    .replace(/\bwhats\b/g, "what is")
    .replace(/\bdont\b/g, "do not")
    .replace(/\bdoesnt\b/g, "does not")
    .replace(/\bcant\b/g, "can not")
    .replace(/\byoure\b/g, "you are")
    .replace(/\byouve\b/g, "you have")
    .replace(/\byoud\b/g, "you would")
    .replace(/\byoull\b/g, "you will")
    .replace(/\bill\b/g, "i will")
    .replace(/\blets\b/g, "let us")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function hasAny(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

const compilationPatterns = [
  /\bgreatest\b/i,
  /\bbest of\b/i,
  /\bvery best\b/i,
  /\bessential/i,
  /\bcollection\b/i,
  /\banthology\b/i,
  /\bhits\b/i,
  /\bsingles\b/i,
  /\bnumber ones\b/i,
  /\bopus collection\b/i,
  /\bretrospective\b/i,
  /\bultimate\b/i,
  /\bdeluxe redux\b/i,
  /\banniversary\b/i,
  /\bbox set\b/i,
];

const livePatterns = [
  /\blive\b/i,
  /\bin concert\b/i,
  /\ben concert\b/i,
  /\bstorytellers\b/i,
  /\bunplugged\b/i,
  /\bsessions?\b/i,
  /\bat the\b/i,
];

const alternatePatterns = [
  /\bremix\b/i,
  /\bedit\b/i,
  /\bversion\b/i,
  /\bradio\b/i,
  /\bdub\b/i,
  /\bacoustic\b/i,
  /\bdemo\b/i,
  /\bmono\b/i,
  /\bstereo\b/i,
  /\bkaraoke\b/i,
];

const rerecordPatterns = [
  /\bre-?record/i,
  /\brevisited\b/i,
  /\bnew recording\b/i,
  /\btaylor's version\b/i,
];

function classify(row: CandidateRow): ClassifiedRow {
  const evidence: string[] = [
    "same canonical artist identity",
    "unique album-track candidate slot",
    "empty canonical_track_key target slot",
  ];
  const conflictFlags: string[] = [];
  const titleMatches = normalize(row.title) === normalize(row.slot_title);
  const albumTitle = row.album_title;
  const titleText = `${row.title} ${row.slot_title} ${albumTitle}`;
  const hasRval = /^RVAL\d{6}$/i.test(row.rval ?? "");

  if (titleMatches) evidence.push("exact normalized track title");
  else conflictFlags.push("normalized_title_mismatch");
  if (hasRval) evidence.push("existing RVAL relationship");
  else conflictFlags.push("missing_rval");
  if (row.release_year != null) evidence.push(`album release year ${row.release_year}`);
  else conflictFlags.push("missing_album_release_year");
  if (row.chart_year != null) {
    evidence.push(`chart year ${row.chart_year}`);
    if (row.release_year != null) {
      const delta = Math.abs(row.chart_year - row.release_year);
      evidence.push(`chart/album year delta ${delta}`);
      if (delta > 2) conflictFlags.push(`chart_album_year_delta_${delta}`);
    }
  } else {
    conflictFlags.push("missing_chart_year");
  }

  let bucket: Bucket = "A_original_studio_album_clearly_identifiable";
  if (row.artist_name.trim().toLowerCase() !== row.artist_canonical_name.trim().toLowerCase()) {
    bucket = "G_artist_identity_conflict";
    conflictFlags.push("artist_display_differs_from_canonical_row");
  }
  if (!titleMatches) bucket = "H_album_title_ambiguity";
  if (hasAny(titleText, rerecordPatterns)) bucket = "F_re_recording";
  if (hasAny(titleText, alternatePatterns)) bucket = "E_remix_or_alternate_version";
  if (hasAny(albumTitle, livePatterns)) bucket = "D_live_recording";
  if (hasAny(albumTitle, compilationPatterns)) bucket = "B_compilation_only";
  if (bucket === "A_original_studio_album_clearly_identifiable" && (!hasRval || row.release_year == null)) {
    bucket = "I_insufficient_evidence";
  }

  const safeOriginal =
    bucket === "A_original_studio_album_clearly_identifiable" &&
    titleMatches &&
    hasRval &&
    row.release_year != null &&
    !conflictFlags.some((flag) => flag.startsWith("chart_album_year_delta_"));

  return {
    ...row,
    bucket,
    final_confidence: safeOriginal ? 1 : bucket === "B_compilation_only" || bucket === "D_live_recording" ? 0.8 : 0.95,
    recommendation: safeOriginal ? "promote_to_100" : bucket === "B_compilation_only" || bucket === "D_live_recording" || bucket === "H_album_title_ambiguity" ? "remain_unresolved" : "bob_review",
    evidence,
    conflict_flags: conflictFlags,
  };
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
        ar.id AS artist_id,
        ar.canonical_name AS artist_canonical_name
      FROM missing m
      JOIN artists ar
        ON lower(regexp_replace(trim(ar.canonical_name), '^the[[:space:]]+', '', 'i')) =
           lower(regexp_replace(trim(m.artist_name), '^the[[:space:]]+', '', 'i'))
      JOIN albums al
        ON al.artist_id = ar.id
      JOIN canonical_album_tracks cat
        ON cat.album_id = al.id
       AND (cat.canonical_track_key IS NULL OR trim(cat.canonical_track_key) = '')
      WHERE lower(regexp_replace(trim(cat.title), '[^a-z0-9]+', '', 'g')) =
            lower(regexp_replace(trim(m.title), '[^a-z0-9]+', '', 'g'))
    ),
    ranked AS (
      SELECT *, count(*) OVER (PARTITION BY rvtr) AS candidate_count
      FROM candidates
    )
    SELECT ranked.*, aek.external_key AS rval
    FROM ranked
    LEFT JOIN LATERAL (
      SELECT external_key
      FROM album_external_keys aek
      WHERE aek.album_id = ranked.album_id
        AND aek.external_key ~* '^RVAL[0-9]{6}$'
      ORDER BY external_key
      LIMIT 1
    ) aek ON true
    WHERE candidate_count = 1
      AND NOT (
        chart_year IS NOT NULL
        AND release_year IS NOT NULL
        AND abs(chart_year - release_year) <= 1
      )
    ORDER BY rvtr
  `;
}

function rollbackSql(rows: ClassifiedRow[], timestamp: string): string {
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
  return `-- Roll back Canonical Album Relationship 95 Review ${timestamp}\nBEGIN;\n${updates.join("\n")}\nCOMMIT;\n`;
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
    const candidates = (await client.query<CandidateRow>(candidateSql())).rows.map(classify);
    const targetCounts = candidates.reduce<Record<string, number>>((acc, row) => {
      acc[row.cat_id] = (acc[row.cat_id] ?? 0) + 1;
      return acc;
    }, {});
    for (const row of candidates) {
      if (targetCounts[row.cat_id] > 1) {
        row.bucket = "C_multiple_studio_album_candidates";
        row.final_confidence = 0.95;
        row.recommendation = "bob_review";
        row.conflict_flags.push("multiple_rvtrs_target_same_album_track_slot");
      }
    }
    const promoted = candidates.filter((row) => row.recommendation === "promote_to_100");
    const review = candidates.filter((row) => row.recommendation === "bob_review");
    const unresolved = candidates.filter((row) => row.recommendation === "remain_unresolved");
    const bucketCounts = candidates.reduce<Record<string, number>>((acc, row) => {
      acc[row.bucket] = (acc[row.bucket] ?? 0) + 1;
      return acc;
    }, {});

    const dryRunRows = candidates.map((row) => ({
      rvtr: row.rvtr,
      song_title: row.title,
      artist: row.artist_name,
      current_album_relationships: "none",
      proposed_primary_album: row.album_title,
      album_id: row.album_id,
      rval: row.rval,
      position: row.position,
      slot_title: row.slot_title,
      evidence: row.evidence.join("; "),
      conflict_flags: row.conflict_flags.join("; "),
      bucket: row.bucket,
      final_confidence: row.final_confidence,
      write_recommendation: row.recommendation,
    }));

    const backupRows = promoted.map((row) => ({
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
        confidence: row.final_confidence,
        reason: row.evidence.join("; "),
      },
      timestamps: {
        exported_at: timestamp,
        old_created_at: row.old_created_at,
        old_updated_at: row.old_updated_at,
      },
    }));

    const dryRunPath = path.join(OUT_DIR, `canonical-album-relationship-95-dry-run-${stamp}.json`);
    const dryRunCsvPath = path.join(OUT_DIR, `canonical-album-relationship-95-dry-run-${stamp}.csv`);
    const jsonPath = path.join(OUT_DIR, `canonical-album-relationship-95-rollback-${stamp}.json`);
    const csvPath = path.join(OUT_DIR, `canonical-album-relationship-95-rollback-${stamp}.csv`);
    const rollbackPath = path.join(OUT_DIR, `canonical-album-relationship-95-rollback-${stamp}.sql`);
    const appliedPath = path.join(OUT_DIR, `canonical-album-relationship-95-applied-${stamp}.json`);

    await writeFile(
      dryRunPath,
      `${JSON.stringify(
        {
          generated_at: timestamp,
          sprint: "canonical-album-relationship-repair-95-review",
          candidates: candidates.length,
          bucket_counts: bucketCounts,
          safe_to_promote: promoted.length,
          bob_review: review.length,
          remain_unresolved: unresolved.length,
          rows: dryRunRows,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await writeFile(dryRunCsvPath, toCsv(dryRunRows), "utf8");
    await writeFile(
      jsonPath,
      `${JSON.stringify(
        {
          generated_at: timestamp,
          sprint: "canonical-album-relationship-repair-95-review",
          mode: APPLY ? "prewrite-rollback-export" : "dry-run",
          rows: backupRows,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await writeFile(
      csvPath,
      toCsv(
        promoted.map((row) => ({
          canonical_album_tracks_id: row.cat_id,
          rvtr: row.rvtr,
          old_canonical_track_key: row.old_canonical_track_key,
          proposed_canonical_track_key: row.rvtr,
          album_id: row.album_id,
          album_title: row.album_title,
          rval: row.rval,
          position: row.position,
          slot_title: row.slot_title,
          confidence: row.final_confidence,
          reason: row.evidence.join("; "),
          old_canonical_source: row.old_canonical_source,
          old_confidence_score: row.old_confidence_score,
          old_review_flag: row.old_review_flag,
          old_updated_at: row.old_updated_at,
        })),
      ),
      "utf8",
    );
    await writeFile(rollbackPath, rollbackSql(promoted, timestamp), "utf8");

    if (!APPLY) {
      await client.query("ROLLBACK");
      console.log(JSON.stringify({ status: "dry_run", candidates: candidates.length, bucketCounts, safe_to_promote: promoted.length, bob_review: review.length, remain_unresolved: unresolved.length, dryRunPath, dryRunCsvPath, jsonPath, csvPath, rollbackPath }, null, 2));
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
      [JSON.stringify(promoted.map((row) => ({ cat_id: row.cat_id, rvtr: row.rvtr }))), SOURCE],
    );

    if (update.rowCount !== promoted.length) {
      throw new Error(`Expected to update ${promoted.length} rows, updated ${update.rowCount ?? 0}`);
    }

    await writeFile(
      appliedPath,
      `${JSON.stringify(
        {
          generated_at: timestamp,
          rows_updated: update.rowCount,
          dry_run_json: dryRunPath,
          dry_run_csv: dryRunCsvPath,
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
    console.log(JSON.stringify({ status: "applied", rows_updated: update.rowCount, bucketCounts, bob_review: review.length, remain_unresolved: unresolved.length, dryRunPath, dryRunCsvPath, backup_json: jsonPath, backup_csv: csvPath, rollback_sql: rollbackPath, applied_json: appliedPath }, null, 2));
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
