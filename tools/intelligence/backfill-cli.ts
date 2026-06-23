#!/usr/bin/env npx tsx
/**
 * Process next N VIDEO tracks from package queue (RVTR + cover, play count DESC).
 *
 * Usage:
 *   npm run intelligence:next10
 *   npm run intelligence:next100
 *   npm run intelligence:all
 */
import { runBackfillBatch } from "../../lib/ops/intelligence/backfill-processor.ts";

function parseLimit(argv: string[]): number {
  if (argv.includes("--all")) return 100_000;
  const limitFlag = argv.findIndex((a) => a === "--limit");
  if (limitFlag >= 0 && argv[limitFlag + 1]) return Number(argv[limitFlag + 1]);
  if (argv.includes("--next100")) return 100;
  return 10;
}

async function main() {
  const argv = process.argv.slice(2);
  const limit = parseLimit(argv);
  const resume = !argv.includes("--no-resume");

  console.log(`\nVIDEO Intelligence Backfill — next ${limit === 100_000 ? "ALL" : limit}`);
  console.log(`  scope=VIDEO/ · cover required · play count DESC · resume=${resume} · failure skip after 3\n`);

  const summary = await runBackfillBatch({ limit, resume });

  console.log(`Processed:  ${summary.processed}`);
  console.log(`Review:     ${summary.review}`);
  console.log(`Published:  ${summary.published}`);
  console.log(`Skipped:    ${summary.skipped} (already done / failed out)`);
  console.log(`Failed:     ${summary.failed}`);
  console.log(`Runtime:    ${Math.round(summary.totalRuntimeMs / 1000)}s`);
  console.log(`Est. left:  ~${summary.estimatedRemainingMinutes} min\n`);

  for (const job of summary.jobs) {
    const extra = job.error ? ` — ${job.error}` : job.runtimeMs ? ` (${Math.round(job.runtimeMs / 1000)}s)` : "";
    console.log(`  · ${job.rvtr}: ${job.status}${extra}`);
  }

  if (summary.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
