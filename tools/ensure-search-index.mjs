/**
 * Ensures search_entities matview exists on production Postgres during Vercel build.
 * Skips when PG is unavailable or matview already present.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function env(name) {
  return process.env[name]?.trim() ?? "";
}

async function main() {
  if (process.env.VERCEL_ENV !== "production") {
    console.log("[ensure-search-index] skip (not production build)");
    return;
  }

  const host = env("RETROVERSE_PG_HOST");
  if (!host) {
    console.log("[ensure-search-index] skip (no RETROVERSE_PG_HOST)");
    return;
  }

  const pool = new Pool({
    host,
    port: Number(env("RETROVERSE_PG_PORT") || "5432"),
    database: env("RETROVERSE_PG_DATABASE") || "retroverse",
    user: env("RETROVERSE_PG_USER") || "bobhopp",
    password: env("RETROVERSE_PG_PASSWORD"),
    ssl:
      host !== "localhost" && host !== "127.0.0.1"
        ? { rejectUnauthorized: false }
        : undefined,
    max: 1,
    connectionTimeoutMillis: 15_000,
  });

  try {
    const check = await pool.query(
      `SELECT relkind FROM pg_class WHERE relname = 'search_entities'`,
    );
    const hasMatview = check.rows.some((r) => r.relkind === "m");
    if (hasMatview) {
      console.log("[ensure-search-index] search_entities matview already present");
      return;
    }

    console.log("[ensure-search-index] applying tools/sql/search_entities.sql …");
    const sql = readFileSync(join(root, "tools/sql/search_entities.sql"), "utf8");
    await pool.query(sql);
    const count = await pool.query(`SELECT count(*)::int AS n FROM search_entities`);
    console.log("[ensure-search-index] done — rows:", count.rows[0]?.n ?? "?");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("[ensure-search-index] failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
