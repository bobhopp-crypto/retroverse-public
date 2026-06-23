#!/usr/bin/env npx tsx
/**
 * Batch intelligence production pipeline.
 *
 * Usage:
 *   npm run intelligence:batch
 *   npm run intelligence:batch -- --limit 25
 *   npm run intelligence:batch -- --all
 *   npm run intelligence:batch -- --resume
 *   npm run intelligence:batch -- RVTR285085 RVTR123456
 */
import { runIntelligenceBatch } from "../../lib/ops/intelligence/batch-runner.ts";

function parseArgs(argv: string[]) {
  let limit = 10;
  let all = false;
  let resume = true;
  let force = false;
  const rvtrs: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--all") all = true;
    else if (arg === "--resume") resume = true;
    else if (arg === "--no-resume") resume = false;
    else if (arg === "--force") force = true;
    else if (arg === "--limit" && argv[i + 1]) limit = Number(argv[++i]);
    else if (/^RVTR\d{6}$/i.test(arg)) rvtrs.push(arg.toUpperCase());
  }

  return { limit, all, resume, force, rvtrs };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  console.log("\nRetroverse Intelligence Batch");
  console.log(
    `  limit=${opts.all ? "ALL" : opts.limit} resume=${opts.resume} force=${opts.force}`,
  );
  if (opts.rvtrs.length) console.log(`  rvtrs=${opts.rvtrs.join(", ")}`);
  console.log("");

  const summary = await runIntelligenceBatch({
    limit: opts.limit,
    all: opts.all,
    resume: opts.resume,
    force: opts.force,
    rvtrs: opts.rvtrs.length ? opts.rvtrs : undefined,
  });

  console.log(`Processed: ${summary.processed}`);
  console.log(`Published: ${summary.published}`);
  console.log(`Skipped:   ${summary.skipped}`);
  console.log(`Failed:    ${summary.failed}`);
  console.log(
    `Runtime:   ${Math.round(summary.totalRuntimeMs / 1000)}s (avg ${summary.processed ? Math.round(summary.totalRuntimeMs / summary.processed / 1000) : 0}s/song)`,
  );

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
