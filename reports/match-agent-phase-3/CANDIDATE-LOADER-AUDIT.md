# Match Agent Phase 3A — Candidate Loader Audit

Read-only audit of `loadMatchCandidates()` and downstream ranking.

---

## Findings

### 1. `identity_source` was ignored in SQL

`SELECT_DISPLAY` pulled from `canonical_track_display` without selecting or ordering on `identity_source`.
All tiers returned `hot100`, `hot100_vdj`, and `vdj` rows into the same pool.

**Location:** `lib/sunday-nights/match-candidates.ts` — `ORDER_DISPLAY` previously sorted only by `has_hot100`, peak, and title alphabetically.

### 2. Tier A prefers filename-shaped titles

`tierExactNormalized()` matches when:

- `canonical_title ILIKE` full filename title (including suffixes)
- OR compact key equals filename compact key

VDJ rows minted from local files embed suffix tokens (**Color**, **Extended**, **Muppet Show 1977**, **Promo Only**) in `canonical_title`. Those rows score **100** title similarity against the filename. Chart canonical titles do not include suffixes, so they often **fail Tier A entirely**.

### 3. Queue ranking was score-only

`resolveQueueItem()` in `match-queue.ts` sorted candidates by `combinedMatchScore` only.
Higher title similarity to the **filename** (not the canonical song title) always won — even when a Hot 100 sibling existed.

### 4. Candidate cap hid canonical siblings

Match queue loaded only **5** candidates. When Tier A filled the pool with VDJ variants, chart canonicals discovered in later tiers never surfaced.

---

## Why VDJ rows outranked canonical siblings

| Mechanism | Effect |
|-----------|--------|
| Tier A ILIKE on full filename title | VDJ row matches; chart row often does not |
| Title similarity scoring | VDJ title ≈ filename → 100 score |
| No identity_source ordering | VDJ and chart rows treated equally when both match |
| Score-only sort in queue | Highest filename similarity wins |

---

## Post-fix behavior (Phase 3B)

1. New first tier: **canonical base title + artist** (`hot100` / `hot100_vdj` only)
2. SQL `ORDER BY` prefers `hot100` / `hot100_vdj` before `vdj`; shorter titles before longer
3. Loader re-sorts by identity tier before returning
4. Queue sorts by: identity tier → match tier → artist → title → year proximity

---

## Live examples (after Phase 3B)

### Elton John — Goodbye Yellow Brick Road (Muppet Show 1977)

| Rank | RVTR | identity_source | Tier | titleScore | Peak |
|-----:|------|-----------------|------|----------:|-----:|
| 1 | `RVTR483649` | hot100_vdj | A | 93 | 2 |
| 2 | `RVTR852528` | vdj | A | 100 | — |

- VDJ sibling: `RVTR852528` (vdj)
- Chart canonical: `RVTR483649` (hot100_vdj, peak #2)
- **Top pick after Phase 3B:** `RVTR483649` (hot100_vdj)

### Killers — Mr. Brightside

| Rank | RVTR | identity_source | Tier | titleScore | Peak |
|-----:|------|-----------------|------|----------:|-----:|
| 1 | `RVTR989769` | hot100 | A | 100 | 10 |
| 2 | `RVTR989768` | vdj | A | 100 | — |
| 3 | `RVTR843135` | vdj | A | 100 | — |
| 4 | `RVTR214710` | vdj | B | 96 | — |

- VDJ sibling: `RVTR843135` (vdj)
- Chart canonical: `RVTR989769` (hot100, peak #10)
- **Top pick after Phase 3B:** `RVTR989769` (hot100)

### The Animals — Please Don't Let Me Be Misunderstood (Color)

| Rank | RVTR | identity_source | Tier | titleScore | Peak |
|-----:|------|-----------------|------|----------:|-----:|
| 1 | `RVTR147877` | hot100 | A | 95 | 15 |
| 2 | `RVTR548989` | hot100 | E | 95 | 15 |
| 3 | `RVTR764188` | vdj | A | 80 | — |
| 4 | `RVTR619129` | vdj | A | 100 | — |
| 5 | `RVTR587175` | vdj | E | 33 | — |
| 6 | `RVTR147878` | vdj | E | 95 | — |
| 7 | `RVTR788424` | vdj | E | 95 | — |

- VDJ sibling: `RVTR619129` (vdj)
- Chart canonical: `RVTR147877` (hot100, peak #15)
- **Top pick after Phase 3B:** `RVTR147877` (hot100)


---

## Outputs

- `reports/match-agent-phase-3/CANDIDATE-LOADER-AUDIT.md` (this file)
- `reports/match-agent-phase-3/conflict-reassignment.csv`
- `reports/match-agent-phase-3/VALIDATION.md`
