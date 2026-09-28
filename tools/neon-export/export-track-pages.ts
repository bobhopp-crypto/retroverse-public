/** One-time export of public track views. Never runs in the deployed application. */
import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { inspectQuery, getInspectPool } from "@/lib/inspect/pg";
import { loadTrackPage } from "./legacy-load-track-page";

const OUTPUT = join(process.cwd(), "data/static-graph/tracks");
const RVTR = /^RVTR\d{6}$/;
const CONCURRENCY = 8;

async function main() {
  const rows = await inspectQuery<{ rvtr: string }>(
    "SELECT DISTINCT upper(trim(ctd.track_id)) AS rvtr FROM canonical_track_display ctd JOIN artists ar ON ar.id = ctd.artist_id WHERE upper(trim(ctd.track_id)) ~ '^RVTR[0-9]{6}$' ORDER BY rvtr",
  );
  const byPrefix = new Map<string, string[]>();
  const onlyPrefix = process.argv.includes("--prefix") ? process.argv[process.argv.indexOf("--prefix") + 1] : null;
  for (const { rvtr } of rows) {
    if (!RVTR.test(rvtr)) continue;
    const prefix = rvtr.slice(4, 6);
    if (onlyPrefix && prefix !== onlyPrefix) continue;
    byPrefix.set(prefix, [...(byPrefix.get(prefix) ?? []), rvtr]);
  }
  await mkdir(OUTPUT, { recursive: true });
  let completed = 0;
  let failures = 0;
  for (const [prefix, ids] of [...byPrefix].sort(([a], [b]) => a.localeCompare(b))) {
    if (process.argv.includes("--resume")) {
      const { access } = await import("node:fs/promises");
      try { await access(join(OUTPUT, `${prefix}.json`)); completed += ids.length; continue; } catch { /* export this shard */ }
    }
    const values: Record<string, Awaited<ReturnType<typeof loadTrackPage>>> = {};
    let cursor = 0;
    const errors: string[] = [];
    await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
      while (cursor < ids.length) {
        const rvtr = ids[cursor++]!;
        try {
          const track = await loadTrackPage(rvtr);
          if (track) values[rvtr] = track;
          else errors.push(rvtr);
        } catch (error) {
          if (errors.length === 0) console.error(`first export error ${rvtr}: ${error instanceof Error ? error.message : "unknown"}`);
          errors.push(rvtr);
        }
      }
    }));
    if (errors.length) {
      failures += errors.length;
      await writeFile(join(OUTPUT, `${prefix}.errors.json`), JSON.stringify(errors));
      console.error(`shard ${prefix}: ${errors.length} missing or failed; refusing to mark complete`);
      continue;
    }
    const temp = join(OUTPUT, `${prefix}.json.tmp`);
    await writeFile(temp, JSON.stringify(values));
    await rename(temp, join(OUTPUT, `${prefix}.json`));
    completed += ids.length;
    console.log(`shard ${prefix}: ${ids.length} tracks; ${completed}/${rows.length}`);
  }
  await getInspectPool().end();
  if (failures) throw new Error(`${failures} track exports failed`);
  console.log(`complete: ${completed} tracks`);
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : "export failed"); process.exitCode = 1; });
