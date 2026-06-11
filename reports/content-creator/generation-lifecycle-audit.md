# Content Creator — Generation Lifecycle Audit

**Date:** 2026-06-08  
**Method:** Code-path inspection (no guessing)

## Summary

Generation is **request-scoped** today. Completed artifacts persist on disk; **in-flight work does not survive client disconnect** unless routed through the new **disk-backed job queue** (`content_creator/jobs/`).

---

## Answers

### 1. Does generation continue after page refresh?

**Before queue:** No — `VNextWorkspace` held a blocking `fetch`; refresh aborted the client. Server work may orphan depending on Node abort behavior; no explicit resume.

**After queue (`background: true`):** Yes — job record stays on disk; detached runner (`tools/content-creator/run-jobs.ts`) continues processing. UI reconnects via `GET /api/ops/content-creator/jobs` poll.

**Evidence:** `components/ops/content-creator/VNextWorkspace.tsx` (`pollJobUntilDone`), `lib/ops/content-creator/jobs/runner.ts`, `app/api/ops/content-creator/vnext/generate/route.ts`

### 2. After tab close?

**Sync path:** No.  
**Queued path:** Yes — if detached runner process is still alive on the host.

### 3. After browser close?

Same as tab close. No service worker or client-side persistence.

### 4. After server restart?

**In-flight HTTP handlers:** Terminated.  
**Queued jobs on disk:** Survive — runner picks up `status: "queued"` on next spawn.  
**Completed runs:** Survive in `creative_lab/vnext/{runId}/` and `content_creator/`.

**Gap:** Jobs marked `running` during crash stay stuck until lock stale (15 min) or manual fix.

### 5. Can UI reconnect to active jobs?

**Yes (new):** `JobQueuePanel` polls `/api/ops/content-creator/jobs` every 3s. Generate flow polls `/api/ops/content-creator/jobs/{id}` until complete.

**Classic debug workspace:** `generationProgress` in `project.json` is written but not auto-resumed on mount.

### 6. Are jobs persisted on disk?

| Artifact | Path | When |
|----------|------|------|
| VNext manifest | `RETROVERSE_DATA/creative_lab/vnext/{runId}/manifest.json` | End of successful run |
| Library index | `content_creator/manifests/index.json` | After `syncGenerationFromVNext` |
| Job records | `content_creator/jobs/{jobId}.json` | On enqueue + updates |
| Job index | `content_creator/jobs/index.json` | On enqueue |

### 7. Is there currently a queue?

**Yes (implemented this phase):** Lightweight file-backed queue + detached `tsx` runner. Not Redis/Bull.

### 8. Can multiple generations run simultaneously?

**Uncoordinated:** Multiple API requests or runners can overlap. Runner uses `runner.lock` so **one runner process** drains queue sequentially. Multiple spawns are mostly no-ops if lock held.

**Risk:** Parallel manual sync generates (without queue) still possible if `background: false`.

### 9. Can variation batches run unattended?

**Yes (queued):** `POST .../variations` with `background: true` enqueues job; tab can close.

**Sync path:** Still blocks until HTTP completes (up to 600s).

### 10. Failure recovery path?

| Failure | Behavior | Recovery |
|---------|----------|----------|
| VNext generate throws | Job → `failed` or HTTP 502 | Retry generate |
| Partial VNext (front only) | Orphan PNG, no manifest | Manual cleanup |
| Variation batch mid-fail | Prior variations may already be in library | Re-run from favorite |
| Missing library entries | — | `GET /library?backfill=1` |
| Stuck `running` job | Lock stale after 15 min | Re-spawn runner |

No automatic retry or dead-letter queue yet.

---

## Key files

| Role | Path |
|------|------|
| VNext runner | `lib/ops/content-creator/vnext-run.ts` |
| Generate API | `app/api/ops/content-creator/vnext/generate/route.ts` |
| Variations | `lib/ops/content-creator/library/variations.ts` |
| Job store | `lib/ops/content-creator/jobs/store.ts` |
| Job runner | `lib/ops/content-creator/jobs/runner.ts` |
| Spawn | `lib/ops/content-creator/jobs/spawn-runner.ts` |
| CLI worker | `tools/content-creator/run-jobs.ts` |
| Production UI | `components/ops/content-creator/VNextWorkspace.tsx` |
| Queue UI | `components/ops/content-creator/JobQueuePanel.tsx` |
