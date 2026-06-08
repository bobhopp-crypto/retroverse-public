import { loadVideoUniverseRows } from "../../lib/ops/year-workspace/load-video-universe";

async function main() {
  const rows = await loadVideoUniverseRows(1967);
  const byKey = new Map<string, number>();
  for (const r of rows) {
    byKey.set(r.workspaceKey, (byKey.get(r.workspaceKey) ?? 0) + 1);
  }
  const dups = [...byKey.entries()].filter(([, n]) => n > 1);
  if (dups.length > 0) {
    console.error("FAIL duplicate workspaceKeys:", dups);
    process.exit(1);
  }
  if (rows.length !== byKey.size) {
    console.error("FAIL row count !== unique keys", rows.length, byKey.size);
    process.exit(1);
  }
  console.log(`OK ${rows.length} rows, ${byKey.size} unique workspaceKeys`);
}

void main();
