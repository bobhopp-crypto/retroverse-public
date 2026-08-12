require("../finance/preload-server-only.cjs");
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runCollectorForSong } from "@/lib/ops/studio/collector/run-collector";
import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { emptyCollectorProgress, loadCollectorProgress, saveCollectorProgress } from "@/lib/ops/studio/collector/store";

const root = join(process.cwd(), "reports/c2-production-batch-100");
const selectionPath = join(root, "selection-manifest.json");
const progressPath = join(root, "research-progress.json");

async function main() {
  const selection = JSON.parse(await readFile(selectionPath, "utf8"));
  const prior = await readFile(progressPath, "utf8").then((x) => JSON.parse(x)).catch(() => ({ completed: [], results: [] }));
  const done = new Set<string>(prior.completed ?? []);
  const results: any[] = [...(prior.results ?? [])];
  const startedAt = prior.startedAt ?? new Date().toISOString();
  const progress = await loadCollectorProgress().catch(() => emptyCollectorProgress());
  progress.status = "researching"; progress.startedAt = startedAt; progress.queue = selection.records.filter((r: any) => !done.has(r.vdjPath)).length; await saveCollectorProgress(progress);
  for (const [index, row] of selection.records.entries()) {
    if (done.has(row.vdjPath)) continue;
    const started = Date.now();
    console.log(`[${index + 1}/100] ${row.artist} — ${row.title}`);
    progress.currentSong = { rvtr: row.rvtr ?? `VDJ-${index + 1}`, artist: row.artist, title: row.title }; progress.queue = selection.records.length - index - 1; await saveCollectorProgress(progress);
    try {
      const pkg = await runCollectorForSong({ rvtr: row.rvtr ?? `VDJ-${String(index + 1).padStart(3, "0")}`, artist: row.artist, title: row.title, graphLinked: row.canonicalStatus === "resolved", vdjFilePath: row.vdjPath, performanceHints: [], notes: ["C2 production batch 100"] });
      const runtimeMs = Date.now() - started;
      results.push({ batchIndex: row.batchIndex, vdjPath: row.vdjPath, rvtr: pkg.rvtr, artist: pkg.artist, title: pkg.title, status: "completed", runtimeMs, researchQuality: pkg.researchQuality, graphLinked: pkg.graphLinked, sourceCount: pkg.sourceLog.length, sourceLog: pkg.sourceLog, charts: pkg.charts, missingAreas: pkg.missingAreas, collectorPath: `data/ops/intelligence/research-department/${pkg.rvtr}/collector.json` });
      done.add(row.vdjPath); console.log(`  ✓ ${Math.round(runtimeMs / 1000)}s · quality ${pkg.researchQuality} · sources ${pkg.sourceLog.length}`);
    } catch (error) {
      const runtimeMs = Date.now() - started; const message = error instanceof Error ? error.message : String(error);
      results.push({ batchIndex: row.batchIndex, vdjPath: row.vdjPath, rvtr: row.rvtr, artist: row.artist, title: row.title, status: "failed", runtimeMs, error: message }); done.add(row.vdjPath); console.log(`  ✗ ${message}`);
    }
    await writeFile(progressPath, JSON.stringify({ version: 1, startedAt, updatedAt: new Date().toISOString(), completed: [...done], results }, null, 2) + "\n");
  }
  progress.status = "complete"; progress.queue = 0; await saveCollectorProgress(progress);
  await writeFile(join(root, "research-manifest.json"), JSON.stringify({ version: 1, startedAt, finishedAt: new Date().toISOString(), selected: selection.records.length, results }, null, 2) + "\n");
  console.log(JSON.stringify({ selected: selection.records.length, completed: results.filter(r => r.status === "completed").length, failed: results.filter(r => r.status === "failed").length }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
