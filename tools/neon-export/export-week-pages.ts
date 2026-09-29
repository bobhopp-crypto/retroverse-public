/** One-time exact snapshot of full Billboard Hot 100 week contexts. */
import { mkdir, writeFile, rename, access } from "node:fs/promises";
import { join } from "node:path";
import { inspectQuery, getInspectPool } from "@/lib/inspect/pg";
import { loadChartWeekContext } from "./legacy-load-chart-week-context";

async function main() {
  const output = join(process.cwd(), "data/static-graph/weeks");
  const rows = await inspectQuery<{ date: string }>(
    "SELECT DISTINCT chart_date::date::text AS date FROM chart_appearances WHERE chart_name = 'Billboard Hot 100' ORDER BY date",
  );
  const byYear = new Map<string, string[]>();
  const onlyYear = process.argv.includes("--year") ? process.argv[process.argv.indexOf("--year") + 1] : null;
  for (const { date } of rows) {
    const year = date.slice(0, 4);
    if (onlyYear && year !== onlyYear) continue;
    byYear.set(year, [...(byYear.get(year) ?? []), date]);
  }
  await mkdir(output, { recursive: true });
  let completed = 0;
  for (const [year, dates] of byYear) {
    const target = join(output, `${year}.json`);
    if (process.argv.includes("--resume")) {
      try { await access(target); completed += dates.length; continue; } catch { /* export */ }
    }
    const data: Record<string, Awaited<ReturnType<typeof loadChartWeekContext>>> = {};
    let cursor = 0;
    const missing: string[] = [];
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (cursor < dates.length) {
        const date = dates[cursor++]!;
        try {
          const context = await loadChartWeekContext({ chartDate: date });
          if (context) data[date] = context;
          else missing.push(date);
        } catch (error) {
          missing.push(date);
          if (missing.length === 1) console.error(`first week error ${date}: ${error instanceof Error ? error.message : "unknown"}`);
        }
      }
    }));
    if (missing.length) {
      await writeFile(join(output, `${year}.errors.json`), JSON.stringify(missing));
      throw new Error(`${year}: ${missing.length} week contexts failed`);
    }
    const temp = `${target}.tmp`;
    await writeFile(temp, JSON.stringify(data));
    await rename(temp, target);
    completed += dates.length;
    console.log(`week year ${year}: ${dates.length}; ${completed}/${rows.length}`);
  }
  await getInspectPool().end();
  console.log(`week contexts complete: ${completed}`);
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : "week export failed"); process.exitCode = 1; });
