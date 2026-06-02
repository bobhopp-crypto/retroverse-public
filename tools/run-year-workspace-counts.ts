import { loadYearWorkspace } from "../lib/ops/load-year-workspace";

const year = Number(process.argv[2] ?? 1967);

async function main() {
  const data = await loadYearWorkspace(year);
  console.log(`Year ${data.year} workspace`);
  console.log(`  Billboard:  ${data.stats.billboardTotal}`);
  console.log(`  In Both:    ${data.stats.inBoth}`);
  console.log(`  Chart Only: ${data.stats.chartOnly}`);
  console.log(`  VDJ Only:   ${data.stats.vdjOnly}`);
  console.log(`  VDJ total:  ${data.stats.vdjTotal}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
