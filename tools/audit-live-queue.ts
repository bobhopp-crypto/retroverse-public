/**
 * Audit live channel queue size, uniqueness, and advance behavior.
 * Usage: npx tsx tools/audit-live-queue.ts
 */
import { buildLiveQueue } from "@/lib/live-control/queue";
import { loadLiveControlState } from "@/lib/live-control/state";
import { DEFAULT_LIVE_CONTROL_CONFIG } from "@/lib/live-control/types";

function repeatAnalysis(rvtrs: string[]) {
  const counts = new Map<string, number>();
  for (const rvtr of rvtrs) counts.set(rvtr, (counts.get(rvtr) ?? 0) + 1);
  const duplicates = [...counts.entries()].filter(([, n]) => n > 1);
  return {
    unique: counts.size,
    total: rvtrs.length,
    duplicates,
  };
}

async function main() {
  const stored = await loadLiveControlState();

  const demo1971 = await buildLiveQueue({
    ...DEFAULT_LIVE_CONTROL_CONFIG,
    mode: "demo",
    contentSource: "year",
    year: 1971,
    readyOnly: true,
    order: "random",
    durationSeconds: 60,
    running: false,
    version: 1,
    queueRvtrs: [],
    queueCursor: 0,
    nextAdvanceAt: null,
    lastChangeAt: null,
    updatedAt: new Date().toISOString(),
  });

  console.log("# Live Channel Queue Audit\n");
  console.log("## Stored production/local state");
  console.log(`running: ${stored.running}`);
  console.log(`queue size: ${stored.queueRvtrs.length}`);
  console.log(`cursor: ${stored.queueCursor}`);
  console.log(`duration: ${stored.durationSeconds}s`);
  console.log(`last change: ${stored.lastChangeAt ?? "null"}`);
  console.log(`next advance: ${stored.nextAdvanceAt ?? "null"}`);
  if (stored.queueRvtrs.length) {
    const analysis = repeatAnalysis(stored.queueRvtrs);
    console.log(`unique RVTRs in stored queue: ${analysis.unique}`);
    console.log(`stored queue: ${stored.queueRvtrs.join(", ")}`);
  }

  console.log("\n## Fresh build (Demo · Year 1971 · Ready Only · Random)");
  console.log(`queue size: ${demo1971.length}`);
  const built = repeatAnalysis(demo1971);
  console.log(`unique RVTRs: ${built.unique}`);
  console.log(`RVTRs: ${demo1971.join(", ")}`);

  console.log("\n## Why only 5–6 songs overnight (likely causes)");
  console.log("1. LAZY ADVANCE: maybeAdvanceLiveChannel() only runs when /api/sunday-nights/current or a page load hits the server — no background timer.");
  console.log("2. LOW TRAFFIC: Zero polls overnight = zero song advances.");
  console.log("3. SMALL QUEUE: Year 1971 + Ready Only typically yields ~10 songs (not hundreds).");
  console.log("4. CHANNEL STOPPED: If channel.running=false, no rotation occurs.");
  console.log("5. WRAP REPEAT: Same queue cycles; unique count = queue size, repeats after full pass.");
  console.log("\n## Overnight math example (60s rotation, queue=10, polls active)");
  console.log("Active 8 hours with steady polling: ~480 advances → same 10 songs repeat ~48 times each.");
  console.log("No polling 8 hours: 0 advances.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
