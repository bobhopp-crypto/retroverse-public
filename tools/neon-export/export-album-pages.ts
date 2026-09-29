/** One-time export of exact album page data, partitioned by RVAL. */
import { mkdir, rename, writeFile, access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { inspectQuery, getInspectPool } from "@/lib/inspect/pg";
import { loadAlbumPage } from "./legacy-load-album-page";

async function main() {
  const output = join(process.cwd(), "data/static-graph/albums");
  const onlyPrefix = process.argv.includes("--prefix") ? process.argv[process.argv.indexOf("--prefix") + 1] : null;
  const onlyRval = process.argv.includes("--rval") ? process.argv[process.argv.indexOf("--rval") + 1] : null;
  const firstPrefix = process.argv.includes("--first-prefix") ? process.argv[process.argv.indexOf("--first-prefix") + 1] : "00";
  const lastPrefix = process.argv.includes("--last-prefix") ? process.argv[process.argv.indexOf("--last-prefix") + 1] : "99";
  const rows = await inspectQuery<{ rval: string }>(
    "SELECT DISTINCT upper(trim(external_key)) AS rval FROM album_external_keys WHERE upper(trim(external_key)) ~ '^RVAL[0-9]{6}$' ORDER BY rval",
  );
  const indexed = JSON.parse(gunzipSync(await readFile(join(process.cwd(), "data/static-graph/album-identities.json.gz"))).toString("utf8")) as Array<{ rval: string }>;
  const expected = new Set(indexed.map((row) => row.rval));
  if (rows.length !== expected.size || rows.some((row) => !expected.has(row.rval))) {
    throw new Error(`Album source differs from verified public index: ${rows.length} rows versus ${expected.size} identities`);
  }
  const shards = new Map<string, string[]>();
  for (const { rval } of rows) {
    if (onlyRval && rval !== onlyRval) continue;
    const prefix = rval.slice(4, 6);
    if (onlyPrefix && prefix !== onlyPrefix) continue;
    if (prefix < firstPrefix || prefix > lastPrefix) continue;
    shards.set(prefix, [...(shards.get(prefix) ?? []), rval]);
  }
  await mkdir(output, { recursive: true });
  let completed = 0;
  let failures = 0;
  for (const [prefix, ids] of shards) {
    const target = join(output, `${prefix}.json`);
    if (process.argv.includes("--resume")) {
      try { await access(target); completed += ids.length; continue; } catch { /* export */ }
    }
    const values: Record<string, unknown> = {};
    const errors: string[] = [];
    let cursor = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (cursor < ids.length) {
        const rval = ids[cursor++]!;
        try {
          const album = await loadAlbumPage(rval);
          if (!album) throw new Error("unresolved");
          values[rval] = album;
        } catch (error) {
          errors.push(rval);
          if (errors.length === 1) console.error(`first album error ${rval}: ${error instanceof Error ? error.message : "unknown"}`);
        }
      }
    }));
    if (errors.length) {
      failures += errors.length;
      await writeFile(join(output, `${prefix}.errors.json`), JSON.stringify(errors));
      console.error(`album shard ${prefix}: ${errors.length} failures`);
      continue;
    }
    const temp = `${target}.tmp`;
    await writeFile(temp, JSON.stringify(values));
    await rename(temp, target);
    completed += ids.length;
    console.log(`album shard ${prefix}: ${ids.length}; ${completed}/${rows.length}`);
  }
  await getInspectPool().end();
  if (failures) throw new Error(`${failures} album exports failed`);
  console.log(`album pages complete: ${completed}`);
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : "album export failed"); process.exitCode = 1; });
