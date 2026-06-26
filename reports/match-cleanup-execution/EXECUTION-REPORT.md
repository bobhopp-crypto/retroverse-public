# Match Cleanup Execution Report

**Executed:** 2026-06-24T04:31:57.132Z  
**Mode:** LIVE

---

## Step 1 — Canonical title repair

| Metric | Value |
|--------|------:|
| Corrupt RVTRs scanned | 547 |
| Repair plans (graph title + key validated) | 137 |
| Repaired | 137 |
| Skipped (no source / already clean) | 410 |
| Backup | `/Users/bobhopp/RETROVERSE_PUBLIC/reports/match-cleanup-execution/canonical-title-backup-2026-06-24T04-31-52-909Z.json` |

Remaining feat-corruption RVTRs after repair: **410** (was 547)

---

## Step 2 — Simulation reassignments

| Metric | Value |
|--------|------:|
| CSV rows | 781 |
| Eligible (exact/high, canonical, ≥95%) | 762 |
| Labels changed | 762 |
| Already correct | 0 |
| Blocked / skipped | 0 |
| Failed | 0 |
| VDJ backup | `/Users/bobhopp/Library/Application Support/VirtualDJ/backups/database-before-match-cleanup-reassign-2026-06-24T04-31-56-474Z.xml` |

---

## Before / After — Match confidence

| Bucket | Before | After | Δ |
|--------|-------:|------:|--:|
| Exact | 3935 | 4157 | +222 |
| High | 234 | 663 | +429 |
| Medium | 4029 | 3572 | -457 |
| Low | 261 | 47 | -214 |
| Suspicious | 17 | 37 | +20 |

---

## Coverage & inventory

| Metric | Before | After | Δ |
|--------|-------:|------:|--:|
| Unresolved VIDEO (no RVTR) | 361 | 361 | +0 |
| Browser Plus unmatched | 361 | 361 | +0 |
| Chart/canonical assigned labels | 4214 | 4967 | +753 |
| Hot 100 label-owned video | 4039 | 4597 | +558 |
| Hot 100 coverage % | 12.5% | 14.3% | +1.8pp |
| Review count (medium bucket) | 4029 | 3572 | -457 |

---

## Identity distribution (assigned VIDEO labels)

| Source | Before | After |
|--------|-------:|------:|
| hot100 | 979 | 1482 |
| hot100_vdj | 3235 | 3485 |
| vdj | 4262 | 3509 |

---

No package generation. Stop here.
