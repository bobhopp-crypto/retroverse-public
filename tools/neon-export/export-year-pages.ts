/** One-time exact snapshot of public RV year history and destination. */
import { mkdir, writeFile, rename, access } from "node:fs/promises";
import { join } from "node:path";
import { inspectQuery, getInspectPool } from "@/lib/inspect/pg";
import { loadRvYearChartHistoryCore } from "./legacy-load-chart-history";
import { buildRvYearDestination, enrichRvYearDestination } from "@/lib/rv-year/enrich-rv-year-destination";

async function main() {
  const output = join(process.cwd(), "data/static-graph/years");
  const rows = await inspectQuery<{ year: number }>(
    "SELECT DISTINCT extract(year from chart_date)::int AS year FROM chart_appearances WHERE chart_date IS NOT NULL AND extract(year from chart_date) BETWEEN 1950 AND 2035 ORDER BY year",
  );
  await mkdir(output, { recursive: true });
  let done = 0;
  for (const { year } of rows) {
    const target = join(output, `${year}.json`);
    if (process.argv.includes("--resume")) {
      try { await access(target); done++; continue; } catch { /* export */ }
    }
    const history = await loadRvYearChartHistoryCore(year, new Map(), null);
    if (!history) throw new Error(`No chart history for ${year}`);
    const destination = await enrichRvYearDestination(buildRvYearDestination(history, year));
    const temp = `${target}.tmp`;
    await writeFile(temp, JSON.stringify({ year, history, destination }));
    await rename(temp, target);
    done++;
    console.log(`year ${year}: ${done}/${rows.length}`);
  }
  await getInspectPool().end();
  console.log(`year pages complete: ${done}`);
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : "year export failed"); process.exitCode = 1; });
