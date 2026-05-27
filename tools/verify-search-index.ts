#!/usr/bin/env npx tsx
/**
 * Verify search_entities matview + pg_trgm on the configured Postgres.
 * Usage: RETROVERSE_PG_HOST=… RETROVERSE_PG_PASSWORD=… npx tsx tools/verify-search-index.ts
 */
import { Pool } from "pg";

function env(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

async function main() {
  const host = env("RETROVERSE_PG_HOST", "localhost");
  const port = Number(env("RETROVERSE_PG_PORT", "5432"));
  const database = env("RETROVERSE_PG_DATABASE", "retroverse");
  const user = env("RETROVERSE_PG_USER", "bobhopp");
  const password = env("RETROVERSE_PG_PASSWORD");

  const ssl =
    host !== "localhost" && host !== "127.0.0.1" && env("RETROVERSE_PG_SSL", "1") !== "0"
      ? { rejectUnauthorized: false }
      : undefined;

  const pool = new Pool({ host, port, database, user, password, ssl, max: 1 });

  try {
    const trgm = await pool.query(
      `SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'`,
    );
    const matview = await pool.query(
      `SELECT relname, relkind FROM pg_class WHERE relname = 'search_entities'`,
    );
    const indexes = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'search_entities' ORDER BY indexname`,
    );
    const count = await pool.query(`SELECT count(*)::int AS n FROM search_entities`).catch(() => ({
      rows: [{ n: null }],
    }));

    const report = {
      host,
      database,
      pgTrgm: trgm.rows.length > 0,
      searchEntitiesMatview: matview.rows.some((r) => r.relkind === "m"),
      indexCount: indexes.rows.length,
      indexes: indexes.rows.map((r) => r.indexname),
      rowCount: count.rows[0]?.n ?? null,
    };

    console.log(JSON.stringify(report, null, 2));

    if (!report.pgTrgm || !report.searchEntitiesMatview) {
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
