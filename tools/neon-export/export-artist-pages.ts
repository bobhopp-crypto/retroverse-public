/** One-time faithful snapshot of artist page and coverage views. */
import { mkdir, rename, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { inspectQuery, getInspectPool } from "@/lib/inspect/pg";
import { loadArtistPage } from "./legacy-load-artist-page";
import { loadArtistCoverageSummary } from "./legacy-load-artist-coverage-summary";

async function main() {
const output = join(process.cwd(), "data/static-graph/artists");
const requested = process.argv.includes("--prefix") ? process.argv[process.argv.indexOf("--prefix") + 1] : null;
const ids = await inspectQuery<{ rvar: string }>(
  "SELECT upper(trim(rvar)) AS rvar FROM artists WHERE upper(trim(rvar)) ~ '^RVAR[0-9]{6}$' ORDER BY rvar",
);
const shards = new Map<string, string[]>();
for (const { rvar } of ids) {
  const prefix = rvar.slice(4, 8);
  if (requested && prefix !== requested) continue;
  shards.set(prefix, [...(shards.get(prefix) ?? []), rvar]);
}
await mkdir(output, { recursive: true });
let completed = 0;
let failures = 0;
for (const [prefix, members] of shards) {
  const target = join(output, `${prefix}.json`);
  if (process.argv.includes("--resume")) {
    try { await access(target); completed += members.length; continue; } catch { /* export */ }
  }
  const pages: Record<string, unknown> = {};
  const errors: string[] = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < members.length) {
      const rvar = members[cursor++]!;
      try {
        const [page, coverage] = await Promise.all([
          loadArtistPage(rvar), loadArtistCoverageSummary(rvar),
        ]);
        if (!page.artistId || !coverage.displayName || coverage.displayName === "Unknown artist") throw new Error("unresolved");
        pages[rvar] = { page, coverage };
      } catch (error) {
        errors.push(rvar);
        if (errors.length === 1) console.error(`first artist error ${rvar}: ${error instanceof Error ? error.message : "unknown"}`);
      }
    }
  }));
  if (errors.length) {
    failures += errors.length;
    await writeFile(join(output, `${prefix}.errors.json`), JSON.stringify(errors));
    console.error(`artist shard ${prefix}: ${errors.length} failures`);
    continue;
  }
  const temp = `${target}.tmp`;
  await writeFile(temp, JSON.stringify(pages));
  await rename(temp, target);
  completed += members.length;
  console.log(`artist shard ${prefix}: ${members.length}; ${completed}/${ids.length}`);
}
await getInspectPool().end();
if (failures) throw new Error(`${failures} artist page exports failed`);
console.log(`artist pages complete: ${completed}`);

}
void main().catch((error) => { console.error(error instanceof Error ? error.message : "artist export failed"); process.exitCode = 1; });
