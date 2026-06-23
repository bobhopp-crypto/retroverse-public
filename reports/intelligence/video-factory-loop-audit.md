# VIDEO Factory Loop Audit

Generated: 2026-06-20 21:52 local

## Summary

`video-factory:loop` is not running because it has not been started in any active terminal or detached supervisor. The current active terminal is `npm run dev`; recent VIDEO factory commands were `video-factory:run-once`, and both completed with exit code `0`.

## 1. Exact Command Path

NPM script:

```bash
npm run video-factory:loop
```

`package.json` maps it to:

```bash
npx --yes tsx tools/intelligence/video-factory.ts loop
```

Source file:

`/Users/bobhopp/RETROVERSE_PUBLIC/tools/intelligence/video-factory.ts`

## 2. Exact Startup Path

Startup flow:

1. `npm run video-factory:loop`
2. `npx --yes tsx tools/intelligence/video-factory.ts loop`
3. `main()`
4. `mode === "loop"`
5. `loop()`
6. Registers `SIGINT` and `SIGTERM` handlers.
7. Enters:

```ts
while (!stop) {
  await runOnce();
  if (stop) break;
  console.log(`Sleeping ${Math.round(LOOP_SLEEP_MS / 1000)}s. Ctrl+C to stop.`);
  await sleep(LOOP_SLEEP_MS);
}
```

Each cycle runs:

1. `refreshVideoFactoryQueue()`
2. RVTR label matcher if `matchableUnmatchedVideoRows > 0`
3. queue-driven cover worker if `missingCover > 0`
4. queue-driven package worker if `missingPackage > 0`
5. queue-driven deck worker if `missingDeck > 0`
6. thumbnail skipped until implemented
7. sleep, default `30s`

Environment controls:

- `VIDEO_FACTORY_LOOP_SLEEP_MS`, default `30000`
- `VIDEO_FACTORY_PACKAGE_BATCH_SIZE`, default `1`
- `VIDEO_FACTORY_DECK_BATCH_SIZE`, default `25`

## 3. Exact Stop Condition

Code-level stop conditions:

- Receives `SIGINT`
- Receives `SIGTERM`
- `runOnce()` throws an uncaught error
- Node/npm/terminal process exits
- Mac shuts down, sleeps in a way that suspends the process, or the terminal session is killed

Important behavior:

- `SIGINT` / `SIGTERM` do not stop immediately mid-worker.
- They set `stop = true`.
- The loop exits after the current `runOnce()` cycle completes.
- There is no built-in max cycles condition.

## 4. Last Successful Run

Last observed VIDEO factory run:

```text
command: npm run video-factory:run-once
started: 2026-06-21T02:16:50.829Z
ended:   2026-06-21T02:18:16.712Z
exit:    0
```

Result:

```text
cover-recovery: attempted=10, recovered=0, review=9, failed=1
package-worker: attempted=1, generated=0, skipped_existing=0, review=1, failed=0, runtime=29s, batch_size=1
Missing package before=6971, after=6970
```

The run succeeded and reduced missing packages by `1`.

## 5. Last Failure

No failed `video-factory:loop` run was found.

Observed history:

- `npm run video-factory:run-once` at `2026-06-21T01:33:23.733Z`: exit code `0`
- `npm run video-factory:run-once` at `2026-06-21T02:16:50.829Z`: exit code `0`
- No active or completed `video-factory:loop` terminal record found.

The only current process check matches were the `ps | rg` audit command itself, not a factory loop.

## 6. Can It Safely Run Unattended?

Yes, with current Phase 3 behavior, it is safe enough to run unattended overnight with these caveats:

- Scope is VIDEO-only via `video-work-queue.json`.
- Package worker uses existing package pipeline.
- Package batch size defaults to `1`, limiting blast radius per cycle.
- Package worker skips if a live package file already exists.
- Deck worker only promotes existing renderable packages into `deck-index.json`; no new deck format is generated.
- Cover worker is queue-driven and only processes `state.cover=false` rows.
- Matcher writes VirtualDJ XML only if matchable unmatched rows exist, and it creates a backup first.

Caveats:

- If `runOnce()` throws an uncaught error, the loop exits.
- No supervisor restarts it.
- No runtime heartbeat file exists yet.
- Package generation still depends on local services such as Ollama when candidate fact extraction runs.

## 7. Does It Survive Terminal Close?

No, not by default.

`npm run video-factory:loop` runs in the foreground of the terminal that starts it. If that terminal process is closed or killed, the loop stops.

To survive terminal close, it must be started under a process manager or detached shell wrapper such as `nohup`, `tmux`, `screen`, `launchd`, or a proper macOS service.

## 8. Does It Survive Mac Sleep?

No reliable guarantee.

During Mac sleep:

- Node execution pauses.
- Network/local service connections can break.
- Ollama or other dependent services may stop or become unavailable.
- Terminal sessions may remain but the loop will not make progress while asleep.

If the Mac wakes and all processes survived, the loop may continue. It is not designed as a sleep-resilient daemon.

For unattended overnight processing, the Mac should be kept awake.

## 9. Does It Resume After Interruption?

Partially, yes.

Resume behavior comes from the queue and idempotent checks:

- `refreshVideoFactoryQueue()` rebuilds `video-work-queue.json`.
- Package worker skips live package files that already exist.
- Cover worker reprocesses current `state.cover=false` rows.
- Deck worker skips entries already present in `deck-index.json`.
- Matcher can rerun and uses the approved XML backup/write path.

Not present:

- No persisted loop cursor.
- No persisted current worker/current RVTR state.
- No automatic restart after process failure.
- No retry ledger for failed package RVTRs inside the factory loop.

If interrupted, rerunning the loop starts from the refreshed queue state, not from an in-memory checkpoint.

## 10. Exact Overnight Command To Run Continuously

Foreground command:

```bash
npm run video-factory:loop
```

Recommended overnight command with log file:

```bash
mkdir -p reports/intelligence && VIDEO_FACTORY_LOOP_SLEEP_MS=30000 npm run video-factory:loop 2>&1 | tee -a reports/intelligence/video-factory-loop.log
```

Keep the Mac awake while it runs.

## Why It Is Not Running Right Now

Current process check:

```text
No video-factory:loop process found.
Only the audit search command matched.
```

Active terminal evidence:

```text
pid 2491: npm run dev
```

Completed factory terminal evidence:

```text
npm run video-factory:run-once exited 0
npm run video-factory:run-once exited 0
```

Conclusion:

`video-factory:loop` is not running because it was never started as a persistent foreground or detached process after the Phase 3 implementation. The factory workers have only been exercised through one-shot commands.
