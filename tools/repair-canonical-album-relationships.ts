import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PoolClient } from "pg";

import { getInspectPool } from "@/lib/inspect/pg";

type CatRow = {
  id: number | string;
  album_id: number | string;
  album_title: string;
  release_year: number | null;
  position: number | string;
  track_title: string;
  canonical_track_key: string | null;
  canonical_source: string | null;
  confidence_score: number | null;
  review_flag: string | null;
};

const RVTRS = ["RVTR708312", "RVTR797460", "RVTR015986", "RVTR456826"] as const;
const APPLY = process.argv.includes("--apply");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Safety assertion failed: ${message}`);
}

async function rows<T extends Record<string, unknown>>(
  client: PoolClient,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return (await client.query(sql, params)).rows as T[];
}

async function loadAffectedRows(client: PoolClient): Promise<CatRow[]> {
  return rows<CatRow>(
    client,
    `
      SELECT cat.id, cat.album_id, al.title AS album_title, al.release_year,
             cat.position, cat.title AS track_title, cat.canonical_track_key,
             cat.canonical_source, cat.confidence_score, cat.review_flag
      FROM canonical_album_tracks cat
      JOIN albums al ON al.id = cat.album_id
      WHERE upper(trim(coalesce(cat.canonical_track_key, ''))) = ANY($1::text[])
         OR (cat.album_id = 34041 AND cat.position = 1)
         OR (cat.album_id = 34709 AND cat.position = 5)
      ORDER BY cat.album_id, cat.position, cat.id
      FOR UPDATE OF cat, al
    `,
    [RVTRS],
  );
}

function byRvtr(rows: CatRow[], rvtr: string) {
  return rows.filter((row) => row.canonical_track_key?.trim().toUpperCase() === rvtr);
}

function isSlot(row: CatRow, albumId: number, position: number) {
  return Number(row.album_id) === albumId && Number(row.position) === position;
}

function assertInitialState(affected: CatRow[]) {
  const sweet = byRvtr(affected, "RVTR708312");
  const dontLook = byRvtr(affected, "RVTR797460");
  const sara = byRvtr(affected, "RVTR015986");
  const tusk = byRvtr(affected, "RVTR456826");
  const sweetOriginal = affected.filter((row) => isSlot(row, 27125, 1));
  const dontLookOriginal = affected.filter((row) => isSlot(row, 34041, 1));
  const saraOriginal = affected.filter((row) => isSlot(row, 34709, 5));

  assert(sweet.length === 6, `Sweet Home Alabama expected 6 keyed rows, found ${sweet.length}`);
  assert(sweetOriginal.length === 1 && sweetOriginal[0].canonical_track_key?.trim().toUpperCase() === "RVTR708312", "Second Helping slot 1 must be the keyed Sweet Home Alabama original");
  assert(dontLook.length === 0, `Don't Look Back expected no keyed rows, found ${dontLook.length}`);
  assert(dontLookOriginal.length === 1 && !dontLookOriginal[0].canonical_track_key && dontLookOriginal[0].track_title === "Don’t Look Back", "Don't Look Back album 34041 slot 1 must be the unkeyed verified original slot");
  assert(sara.length === 1, `Sara expected one competing keyed row, found ${sara.length}`);
  assert(Number(sara[0].album_id) !== 34709, "Sara must not already point at Tusk before repair");
  assert(saraOriginal.length === 1 && !saraOriginal[0].canonical_track_key && saraOriginal[0].track_title === "Sara (edit)", "Tusk slot 5 must be the unkeyed Sara (edit) candidate");
  assert(tusk.length === 2 && tusk.every((row) => Number(row.album_id) !== 34709), "Tusk must remain unresolved: expected two non-original keyed rows");

  return { sweet, dontLookOriginal: dontLookOriginal[0], sara, saraOriginal: saraOriginal[0], tusk };
}

async function writeBackup(client: PoolClient, affected: CatRow[], timestamp: string, environment: string) {
  const report = {
    timestamp,
    database_environment: environment,
    affected_rvtrs: RVTRS,
    rows: affected.map((row) => ({
      rvtr_relationship: row.canonical_track_key,
      album_id: row.album_id,
      album_title: row.album_title,
      album_year: row.release_year,
      canonical_album_tracks_row_id: row.id,
      track_position: row.position,
      track_title: row.track_title,
      canonical_track_key_before_migration: row.canonical_track_key,
    })),
  };
  const dir = path.join(process.cwd(), "reports/data-migrations/canonical-album-repair");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `prewrite-${timestamp.replace(/[:.]/g, "-")}.json`);
  await writeFile(file, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return file;
}

async function assertFinalState(client: PoolClient) {
  const finalRows = await loadAffectedRows(client);
  const sweet = byRvtr(finalRows, "RVTR708312");
  const dontLook = byRvtr(finalRows, "RVTR797460");
  const sara = byRvtr(finalRows, "RVTR015986");
  const tusk = byRvtr(finalRows, "RVTR456826");
  assert(sweet.length === 1 && isSlot(sweet[0], 27125, 1), "Sweet Home Alabama must resolve only to Second Helping slot 1");
  assert(dontLook.length === 1 && isSlot(dontLook[0], 34041, 1), "Don't Look Back must resolve only to album 34041 slot 1");
  assert(sara.length === 1 && isSlot(sara[0], 34709, 5), "Sara must resolve only to Tusk slot 5");
  assert(tusk.length === 2 && tusk.every((row) => Number(row.album_id) !== 34709), "Tusk must remain unresolved and unchanged");
  return finalRows;
}

async function main() {
  const pool = getInspectPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const identity = await rows<{ database: string; host: string | null; port: number | null; version: string }>(
      client,
      "SELECT current_database() AS database, inet_server_addr()::text AS host, inet_server_port() AS port, version() AS version",
    );
    const db = identity[0];
    const host = db.host ?? "unix-socket";
    const environment = `local:${db.database}@${host}:${db.port ?? "default"}`;
    assert(db.database === "retroverse", `database must be local retroverse, found ${db.database}`);
    assert(["::1/128", "127.0.0.1/32"].includes(host), `server must be loopback local, found ${host}`);
    assert(/Homebrew/i.test(db.version), "server must be the local Homebrew PostgreSQL instance");

    const affected = await loadAffectedRows(client);
    const alreadyFinal = await (async () => {
      try { await assertFinalState(client); return true; } catch { return false; }
    })();
    if (alreadyFinal) {
      await client.query("ROLLBACK");
      console.log(JSON.stringify({ status: "already_final_noop", environment }, null, 2));
      return;
    }

    let initial;
    try {
      initial = assertInitialState(affected);
    } catch (error) {
      console.error(JSON.stringify({ environment, affected }, null, 2));
      throw error;
    }
    if (!APPLY) {
      await client.query("ROLLBACK");
      console.log(JSON.stringify({ status: "dry_run_ok", environment, affected }, null, 2));
      return;
    }

    const backup = await writeBackup(client, affected, new Date().toISOString(), environment);
    const sweetCompetingIds = initial.sweet.filter((row) => Number(row.album_id) !== 27125).map((row) => row.id);
    const clearSweet = await client.query("UPDATE canonical_album_tracks SET canonical_track_key = NULL WHERE id = ANY($1::bigint[]) AND upper(trim(canonical_track_key)) = 'RVTR708312'", [sweetCompetingIds]);
    assert(clearSweet.rowCount === 5, `expected to clear 5 Sweet Home Alabama competing rows, cleared ${clearSweet.rowCount}`);
    const keyDontLook = await client.query("UPDATE canonical_album_tracks SET canonical_track_key = 'RVTR797460' WHERE id = $1 AND canonical_track_key IS NULL", [initial.dontLookOriginal.id]);
    assert(keyDontLook.rowCount === 1, `expected to key one Don't Look Back row, changed ${keyDontLook.rowCount}`);
    const clearSara = await client.query("UPDATE canonical_album_tracks SET canonical_track_key = NULL WHERE id = $1 AND upper(trim(canonical_track_key)) = 'RVTR015986'", [initial.sara[0].id]);
    assert(clearSara.rowCount === 1, `expected to clear one Sara compilation row, cleared ${clearSara.rowCount}`);
    const keySara = await client.query("UPDATE canonical_album_tracks SET canonical_track_key = 'RVTR015986' WHERE id = $1 AND canonical_track_key IS NULL", [initial.saraOriginal.id]);
    assert(keySara.rowCount === 1, `expected to key one Sara original row, changed ${keySara.rowCount}`);

    const finalRows = await assertFinalState(client);
    await client.query("COMMIT");
    console.log(JSON.stringify({ status: "applied", environment, backup, before: affected, after: finalRows }, null, 2));
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
