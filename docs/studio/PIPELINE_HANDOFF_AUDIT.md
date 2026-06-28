# Sprint 3.12 — Pipeline Handoff Audit

## Root cause: Director idle while Editor completes

| Issue | Cause |
| --- | --- |
| Director never auto-ran | Collector overnight batch runs Collector only; no orchestrator consumed Editor → Director queue |
| Handoff file missing | Editor `submitted` status without `director-handoff.json` on disk → `runAndSaveDirector()` returned null |
| Vague queue reasons | `needs_pipeline` hid whether Editor, Director, or Publisher was blocking |
| Publisher bypass risk | Production could evaluate/publish when render spec existed even if Editor handoff was never written in current pass |
| Dashboard mismatch | Director queue counted `directorHandoff.submittedAt` only, not `editorialStatus === submitted` |

## Fixes

1. **`ensureDirectorHandoff()`** — auto-submits Editor + writes handoff file before Director runs
2. **`assessPackagePipelineStage()`** — single queue source with specific reasons per stage
3. **`runProductionSong()`** — transition log for every stage; Publisher blocked without Director render spec
4. **`pipeline-snapshot.ts`** — Running / Waiting / Complete per department + Published total
5. **`PipelineDiagnosticsPanel`** — Studio dashboard (`/ops/studio`)

## Transition log format

```
RVTR285085
Collector ✓
Editor queued
Editor started
Editor ✓ (0.1s)
Director queued
Director started
Director ✓ (4.2s)
Publisher queued
Publisher started
Publisher ✓ (0.3s)
Published
```

Written to `reports/studio/PIPELINE_AUDIT_LOG.md` on each production run.
