import { readFile } from "node:fs/promises";
import { loadEnvFile } from "node:process";

import { getPassPool } from "../packages/shared/lib/retroverse-pass/pg";

async function counts(client: { query: (text: string) => Promise<{ rows: Array<Record<string, unknown>> }> }) {
  const result = await client.query(`
    SELECT
      (SELECT count(*)::int FROM retroverse_passes) AS passes,
      (SELECT count(*)::int FROM retroverse_visitors) AS visitors,
      (SELECT count(*)::int FROM retroverse_pass_activity) AS activity
  `);
  return result.rows[0];
}

async function allowancePrimaryKey(
  client: { query: (text: string) => Promise<{ rows: Array<Record<string, unknown>> }> },
) {
  const result = await client.query(`
    SELECT pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conrelid = 'retroverse_request_allowances'::regclass
      AND contype = 'p'
  `);
  return result.rows[0]?.definition ?? null;
}

async function main() {
  loadEnvFile(".env.local");
  const migration = await readFile("docs/migrations/retroverse-song-requests.sql", "utf8");
  const pool = getPassPool();
  const client = await pool.connect();
  try {
    const before = await counts(client);
    await client.query("BEGIN");
    await client.query(migration);
    await client.query("COMMIT");
    const after = await counts(client);
    const primaryKey = await allowancePrimaryKey(client);
    process.stdout.write(`${JSON.stringify({
      ok: true,
      existingPassData: { before, after },
      allowancePrimaryKey: primaryKey,
    }, null, 2)}\n`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
