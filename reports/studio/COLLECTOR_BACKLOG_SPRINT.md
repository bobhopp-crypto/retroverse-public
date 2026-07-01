# Collector Backlog Production Sprint

**Started:** 2026-06-28  
**Command:** `npm run research:studio:collector-backlog`  
**Log:** `reports/studio/collector-backlog-run.log`  
**Progress:** `reports/studio/collector-backlog-progress.json`  
**Report (on completion):** `reports/studio/COLLECTOR_BACKLOG_REPORT.md`

---

## Initial pipeline snapshot

| Stage | Count |
| --- | ---: |
| Collector complete | 5217 |
| Editor complete | 989 |
| Director complete | 989 |
| Creative Review complete | 1 |
| Published | 84 |
| **Backlog remaining** (collector done, not published) | **5133** |

Queue size for this run: **5133 songs** (all collector-complete packages not yet published).

---

## Assembly line

Collector output is the queue source. Each song runs through:

```
runProductionSong (skipCollector: true)
  → Editor (+ Retrograph + handoff)
  → Director (if render spec missing)
  → Creative Review (runCreativeReviewForRvtr)
  → Publisher (Visual Producer + evaluate + autoPublishStandard)
  → Published
```

Failures are logged; processing continues with the next song.

Progress reports every **50 songs** to stdout and the log file.

---

## Monitor

```bash
tail -f reports/studio/collector-backlog-run.log

# Progress file (processed + failed RVTRs)
cat reports/studio/collector-backlog-progress.json | head -40

# Live counts
npm run research:studio:collector-backlog -- --status-only
```

Resume after interrupt (default):

```bash
npm run research:studio:collector-backlog
```

Fresh run (ignore prior progress):

```bash
npm run research:studio:collector-backlog -- --no-resume
```

Cap batch size:

```bash
npm run research:studio:collector-backlog -- --limit 100
```

---

## Chart Journey

No Chart Journey or Song DNA code was modified. Published patron experiences retain the existing chart-journey visualization path (`/retroverse-2/song/[rvtr]#chart-journey`).

---

## Files added / changed

| File | Purpose |
| --- | --- |
| `lib/ops/studio/production/scan-pipeline-counts.ts` | Full-disk stage counts |
| `lib/ops/studio/production/build-collector-backlog-queue.ts` | Queue from collector.json dirs |
| `tools/research/studio-collector-backlog-run.ts` | Batch runner + 50-song reports |
| `lib/ops/studio/production/run-song.ts` | Creative Review step before Publisher |
| `package.json` | `research:studio:collector-backlog` script |

---

## Execution State

**IN PROGRESS** — backlog drain running in background (5133 songs queued).
