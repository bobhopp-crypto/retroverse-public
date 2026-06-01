/**
 * Resumable cover acquisition backfill — safe runner (main queue + deferred retry).
 *
 * Usage:
 *   RETROVERSE_PG_SSL=0 npx tsx tools/run-cover-backfill.ts
 *   RETROVERSE_PG_SSL=0 npx tsx tools/run-cover-backfill.ts --once
 *   RETROVERSE_PG_SSL=0 npx tsx tools/run-cover-backfill.ts --once --limit 100
 *   RETROVERSE_PG_SSL=0 npx tsx tools/run-cover-backfill.ts --reset
 */
import { BACKFILL_BATCH_SIZE } from "@/lib/covers/backfill/paths";
import { loadBackfillStatus } from "@/lib/covers/backfill/metrics";
import { loadMissingCoverQueue } from "@/lib/covers/backfill/queue";
import { runCoverBackfillSafeSession } from "@/lib/covers/backfill/safe-run";
import { loadBackfillState, resetBackfillState, saveBackfillState } from "@/lib/covers/backfill/state";

const argv = process.argv.slice(2);
const args = new Set(argv);
const once = args.has("--once");
const reset = args.has("--reset");
const retryFailures = args.has("--retry-failures");

let limit: number | null = null;
const limitEq = argv.find((a) => a.startsWith("--limit="));
const limitIdx = argv.indexOf("--limit");
if (limitEq) limit = Number.parseInt(limitEq.split("=")[1] ?? "", 10);
else if (limitIdx >= 0) limit = Number.parseInt(argv[limitIdx + 1] ?? "", 10);

const pauseMs = Number(process.env.COVER_BACKFILL_BATCH_PAUSE_MS ?? "5000");

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const queue = await loadMissingCoverQueue();
  console.log(`Cover backfill queue: ${queue.length} albums missing covers`);

  if (reset) {
    await resetBackfillState(queue.length);
    console.log("State reset.");
    if (!once && limit == null) return;
  }

  if (once || limit != null) {
    const session = await runCoverBackfillSafeSession({
      limit: once && limit == null ? BACKFILL_BATCH_SIZE : limit,
      retryFailures,
      writeReport: true,
    });
    console.log(
      `Session done: ${session.sessionProcessed} processed, ${session.sessionSuccess} ok, ${session.sessionFailure} fail, cursor ${session.mainCursorBefore}→${session.mainCursorAfter}`,
    );
    const status = await loadBackfillStatus();
    console.log(JSON.stringify(status.metrics, null, 2));
    return;
  }

  let state = await loadBackfillState(queue.length);

  do {
    if (state.paused) {
      console.log("Paused — exiting runner.");
      break;
    }

    const remaining = (await loadMissingCoverQueue()).length;
    if (remaining <= 0) {
      console.log("Queue exhausted.");
      state.running = false;
      await saveBackfillState(state);
      break;
    }

    const session = await runCoverBackfillSafeSession({
      limit: BACKFILL_BATCH_SIZE,
      retryFailures,
      writeReport: true,
    });
    state = session.state;

    console.log(
      `  batch ok=${session.sessionSuccess} fail=${session.sessionFailure} cursor=${state.mainCursor} retry=${state.retryQueue.length}`,
    );

    const status = await loadBackfillStatus();
    console.log(
      `  remaining=${status.metrics.coversRemaining} unique_rate=${status.metrics.uniqueSuccessRate}% today=${status.metrics.coversAcquiredToday}`,
    );

    if (state.paused) break;

    await sleep(pauseMs);
  } while (true);

  const final = await loadBackfillStatus();
  console.log(JSON.stringify(final.metrics, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
