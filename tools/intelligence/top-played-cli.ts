#!/usr/bin/env npx tsx
/**
 * Top Played backfill — highest-play VIDEO tracks, play count DESC.
 *
 * Usage:
 *   npm run intelligence:top100
 *   npm run intelligence:top25
 */
import { runTopPlayedBackfillBatch } from "../../lib/ops/intelligence/top-played-processor.ts";

function parseOptions(argv: string[]) {
  let cohort: 25 | 50 | 100 = 100;
  let limit = 10;
  if (argv.includes("--top25")) {
    cohort = 25;
    limit = 25;
  } else if (argv.includes("--top50")) {
    cohort = 50;
    limit = 50;
  } else if (argv.includes("--top100") || argv.includes("--all")) {
    cohort = 100;
    limit = 100;
  }
  const limitFlag = argv.findIndex((a) => a === "--limit");
  if (limitFlag >= 0 && argv[limitFlag + 1]) limit = Number(argv[limitFlag + 1]);
  return { cohort, limit, resume: !argv.includes("--no-resume") };
}

async function main() {
  const { cohort, limit, resume } = parseOptions(process.argv.slice(2));
  console.log(`\nTop Played Backfill — cohort ${cohort} · next ${limit}`);
  console.log(`  VIDEO/ · identifiable · play count DESC · cover required\n`);

  const summary = await runTopPlayedBackfillBatch({ limit, cohort, resume });

  console.log(`Processed:  ${summary.processed}`);
  console.log(`Review:     ${summary.review}`);
  console.log(`Published:  ${summary.published}`);
  console.log(`Skipped:    ${summary.skipped}`);
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
