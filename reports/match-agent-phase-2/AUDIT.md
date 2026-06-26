# Match Agent Phase 2

**Date:** 2026-06-24  
**Latest live run:** `reports/match-agent-phase-2/2026-06-24T01-28-05-401Z/`

---

## What it does

Batch agent for **all unmatched VIDEO-folder** VirtualDJ tracks (excludes `/MUSIC/` and `/VIDEO VAULT/`). Scores each row against the canonical graph, classifies into three buckets, and **auto-assigns RVTR labels** for high-confidence matches without manual confirmation.

## Buckets

| Bucket | Criteria | Action |
|--------|----------|--------|
| **Auto-Matched** | Tier A (exact artist + normalized title) OR combined score ≥ 95 | Label written to `database.xml` with backup |
| **Needs Review** | Candidate found, below auto threshold | Exported for Browser Plus Match Queue |
| **No Candidate** | No graph match returned | Exported for manual search |

## Live run results (2026-06-24)

| Metric | Count |
|--------|------:|
| Unmatched VIDEO scanned | 1428 |
| Auto-Matched | 1067 |
| Needs Review | 228 |
| No Candidate | 133 |
| Labels written | 1067 |
| Assign failed | 0 |
| Assign skipped | 0 |

**Backup:** `/Users/bobhopp/Library/Application Support/VirtualDJ/backups/database-before-match-agent-phase-2-2026-06-24T01-28-05-294Z.xml`

## Run commands

```bash
# Preview (no writes)
npm run ops:match-agent -- --dry-run

# Limit sample
npm run ops:match-agent -- --dry-run --limit 50

# Live — all unmatched VIDEO tracks
npm run ops:match-agent
```

## Key files

| File | Role |
|------|------|
| `lib/ops/browser-plus/load-unmatched-video-tracks.ts` | Parse `database.xml` for unmatched VIDEO rows |
| `lib/ops/browser-plus/match-agent-types.ts` | Bucket types + auto-match rules (≥95 / tier A) |
| `lib/ops/browser-plus/match-agent.ts` | Orchestrator + report writer |
| `lib/ops/browser-plus/vdj-label-write.ts` | Batch label writes with `match-agent-phase-2` backup tag |
| `tools/run-match-agent-phase-2.ts` | CLI entry |

## Outputs per run

Each run writes a timestamped folder under `reports/match-agent-phase-2/`:

- `REPORT.md` — summary
- `results.json` — full structured report
- `auto-matched.csv` — assigned rows
- `needs-review.csv` — queue for human review
- `no-candidate.csv` — no graph hit

## Threshold note

Browser Plus UI **Auto-Match Ready** uses tier A OR combined ≥92 (with artist ≥80, title ≥88). Match Agent Phase 2 is stricter: tier A OR **combined ≥ 95** only.
