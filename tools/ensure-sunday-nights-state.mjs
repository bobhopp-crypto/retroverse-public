/**
 * Ensures sunday_nights_state table exists on production Postgres during Vercel build.
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
    console.log("[ensure-sunday-nights-state] skip (not production build)");
    return;
  }

  const host = env("RETROVERSE_PG_HOST");
  if (!host) {
    console.log("[ensure-sunday-nights-state] skip (no RETROVERSE_PG_HOST)");
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
      `SELECT to_regclass('public.sunday_nights_state') AS reg`,
    );
    if (check.rows[0]?.reg) {
      console.log("[ensure-sunday-nights-state] table already present");
      return;
    }

    console.log("[ensure-sunday-nights-state] applying docs/migrations/sunday-nights-state.sql …");
    const sql = readFileSync(
      join(root, "docs/migrations/sunday-nights-state.sql"),
      "utf8",
    );
    await pool.query(sql);
    console.log("[ensure-sunday-nights-state] done");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(
    "[ensure-sunday-nights-state] failed:",
    e instanceof Error ? e.message : e,
  );
  process.exit(1);
});
