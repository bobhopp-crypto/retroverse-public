/**
 * Apply Sunday Nights Postgres migration locally.
 * Usage: npx tsx tools/sunday-nights/run-migration.ts
 */
import { readFile } from "fs/promises";
import { join } from "path";

import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error("Postgres offline:", ping.error ?? "unknown");
    process.exit(1);
  }

  const sql = await readFile(
    join(process.cwd(), "docs/migrations/sunday-nights-state.sql"),
    "utf8",
  );
  await inspectQuery(sql);
  console.log("Migration applied: sunday_nights_state");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
