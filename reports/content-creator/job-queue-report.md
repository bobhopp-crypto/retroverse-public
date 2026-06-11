# Content Creator — Job Queue Report

**Date:** 2026-06-08

## What was built

Lightweight **disk-backed job queue** for Content Creator generation and variation batches.

### Storage

```
RETROVERSE_DATA/content_creator/jobs/
  index.json          # ordered job IDs
  runner.lock         # single-runner guard (15 min stale)
  job-{id}.json       # per-job state
```

### Job states

| Status | Meaning |
|--------|---------|
| `queued` | Waiting for runner |
| `running` | Worker active |
| `completed` | Success — `result` has runId / runIds / batchId |
| `failed` | Error message in `job.error` |

### Job types

- **`generate`** — full VNext front + back (`runVNextGenerate`)
- **`variations`** — `generateVariationsFromParent` (1–10)

### API

| Endpoint | Purpose |
|----------|---------|
| `GET /api/ops/content-creator/jobs` | Queue panel data (generating / waiting / completed / failed) |
| `GET /api/ops/content-creator/jobs/{id}` | Single job poll |
| `POST /api/ops/content-creator/vnext/generate` + `background: true` | Enqueue generate |
| `POST /api/ops/content-creator/library/{id}/variations` + `background: true` | Enqueue variations |

### Runner

- Spawned detached: `npx tsx tools/content-creator/run-jobs.ts`
- Pattern matches TOTP harvest (`lib/ops/media-collections/totp/spawn-harvest.ts`)
- Processes queued jobs **one at a time** per lock

### UI

- **`JobQueuePanel`** — fixed bottom-right on Library + Create pages
- Shows thumbnail, title, step, progress bar, elapsed time
- Links to result (create page or batch view)

## Usage

**Generate (default in UI):** Create page sends `background: true`, polls job until complete.

**Variations:** Library card → Variations → queued; monitor in Queue panel.

**Manual worker (if spawn fails):**

```bash
npx tsx tools/content-creator/run-jobs.ts
```

## Limitations

1. **Local ops only** — detached spawn requires Node host (not serverless-friendly).
2. **No mid-run progress** for generate (front/back steps not checkpointed yet).
3. **Stuck `running`** if process killed — needs stale lock recovery or manual job reset.
4. **No concurrency cap** across multiple hosts.
5. **Variation progress** is batch-level, not per-image.

## Recommended next steps

1. Write `status: running` manifest checkpoint after front completes.
2. Job stale sweeper on app startup.
3. Per-variation progress updates in `generateVariationsFromParent`.
4. Max concurrent AI calls semaphore.
