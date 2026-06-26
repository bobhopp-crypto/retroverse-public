# Retroverse Trust Audit — Can We Trust RVTR Labels?

**Scanned:** 2026-06-24  
**Read-only** — no code changes.

**Purpose:** Determine whether VirtualDJ `Tags.Label` RVTR values are trustworthy enough to be authoritative before architecture changes.

---

## Executive summary

| Metric | Value |
|--------|------:|
| VIDEO files labeled (code scan) | 8,476 |
| Label vs best-match agreement | **99.8%** (8,457 / 8,476) |
| Remaining simulation disagreements | **19** (0.2%) |
| Exact + High confidence (post-cleanup) | **56.9%** (4,823) |
| Medium bucket (mostly VDJ identity) | **42.1%** (3,572) |
| Suspicious | **0.4%** (37) |

### Recommendation: **B — Trusted but verify periodically**

Labels are operationally reliable **after the 2026-06-24 cleanup**, but historical Phase 2 bias (82% VDJ-layer auto-assigns), 3,497 medium-tier VDJ identities, and intelligence paths that ignore Label prevent treating them as immutable truth without validation.

---

## 1. Code paths that write RVTR label formats

All writers ultimately use `lib/ops/browser-plus/vdj-label-write.ts`. Label format is resolved by `resolveRetroverseLabelForRvtr()`:

- No package → bare `RVTR######`
- Package exists → `PK_RVTR######`
- Package + deck ready → `DK_RVTR######`

| File | Function | Purpose | Active? | Intro (evidence) |
|------|----------|---------|---------|------------------|
| `lib/ops/browser-plus/vdj-label-write.ts` | `assignVdjLabelByFilePath` | Single-file label write | **Yes** | Core module; backup tag per call |
| `lib/ops/browser-plus/vdj-label-write.ts` | `assignVdjLabelsBatch` | Batch label write (one backup) | **Yes** | Used by all bulk writers |
| `lib/ops/browser-plus/match-agent.ts` | `runMatchAgentPhase2` | Auto-assign high-confidence unmatched VIDEO | **Yes** | `reports/match-agent-phase-2/` — **2026-06-24** |
| `lib/ops/apply-simulation-reassignments.ts` | `applySimulationReassignments` | Simulation-approved RVTR swaps | **Yes** | `reports/match-cleanup-execution/` — **2026-06-24** |
| `app/api/ops/browser-plus/assign/route.ts` | `POST` | Manual single assign from Browser Plus UI | **Yes** | No confidence gate — operator-supplied RVTR |
| `app/api/ops/browser-plus/assign-batch/route.ts` | `POST` | Manual batch assign (≤200) | **Yes** | No confidence gate |
| `tools/intelligence/label-vdj-packages.ts` | `main` | Upgrade bare RVTR → PK_/DK_ from package/deck index | **Yes** | Uses **graph identity coverage**, not existing Label |
| `components/ops/browser-plus/BrowserPlusMatchQueue.tsx` | via assign APIs | Queue approve / Approve All | **Yes** | Manual or semi-auto from queue |

**Not label writers:** `write-rvtags-pilot.mjs` writes `User2` only. Graph title repair tools (`repair-feat-corruption`, `repair-hot100-title-keys`) modify Postgres canonical titles — **not** VDJ labels.

**Git history:** Limited — most Browser Plus / match-agent files appear in recent work (June 2026 audit reports). No older commit history surfaced for `vdj-label-write.ts` in this repo snapshot.

---

## 2. How the labeled population was created

### Current VIDEO label inventory (automated scan, `/VIDEO/` scope)

| Label format | Count |
|--------------|------:|
| Bare `RVTR######` | 7,214 |
| `PK_RVTR######` | 415 |
| `DK_RVTR######` | 848 |
| Blank (no RVTR) | 444 |
| **Total VIDEO rows** | **8,921** |

*Your manual full-library count (PK 610 · DK 885 · RVTR 8,996 · Blank 361) includes non-VIDEO paths (MUSIC, VAULT, etc.).*

### Traceable sources (8,476 labeled VIDEO files)

| Source | Count | Evidence |
|--------|------:|----------|
| **Match Agent Phase 2 auto** | **1,067** | `reports/match-agent-phase-2/2026-06-24T01-28-05-401Z/` — paths in `auto-matched.csv` still in matched set |
| **Cleanup reassignment (RVTR swap)** | **762** | `reports/match-cleanup-execution/` — labels **modified**, not newly created |
| **Legacy / manual / unknown** | **~7,409** | 8,476 − 1,067 Phase 2 new labels; predates documented automation |
| Manual Browser Plus assign | Unknown | No provenance log in `database.xml` |
| `label-vdj-packages.ts` PK/DK upgrade | Unknown | Reformats existing RVTR; does not mint new RVTRs |
| Bulk migration script | **Not found** | No dedicated RVTR migration tool in repo |

### Phase 2 auto-match identity quality (1,067 labels written)

From `reports/match-agent-phase-2/rvtr-identity-audit.json`:

| identity_source assigned | Count | % |
|--------------------------|------:|--:|
| vdj | 877 | 82.2% |
| hot100_vdj | 110 | 10.3% |
| hot100 | 80 | 7.5% |

**252 wrong-layer conflicts** detected (VDJ assigned when chart canonical existed). These were a major trust risk **before cleanup**.

---

## 3. Timeline — major events affecting RVTR labels

| Date | Event | Labels modified? | Trust impact |
|------|-------|------------------|--------------|
| Pre-2026-06-23 | Legacy manual labeling (~7,400+ VIDEO files) | Yes (unknown process) | Unknown quality |
| 2026-06-23 | `rvtr-coverage-audit.md` — 24,707 RVTR labels full VDJ library | No | Baseline inventory |
| 2026-06-24 | **Match Agent Phase 2** — 1,067 auto-assigns | **Yes** (+1,067) | Mixed — 82% VDJ layer |
| 2026-06-24 | RVTR identity audit — 252 wrong-layer conflicts identified | No | Exposed VDJ bias |
| 2026-06-24 | Match-engine simulation — 781 reassignment opportunities | No | Identified label errors |
| 2026-06-24 | **Match cleanup** — 762 simulation reassignments | **Yes** (762 swaps) | **Increased trust** |
| 2026-06-24 | Graph title repair phase 1 — 137 hot100 canonical titles | **No** (graph only) | Improved match validation |
| 2026-06-24 | Graph title repair phase 2 — 40 hot100 keys | **No** (graph only) | Improved match validation |
| 2026-06-24 | Post-cleanup confidence audit | No | Exact+High 49% → 57% |

### Backups on record (VDJ `database.xml`)

| Backup tag | When |
|------------|------|
| `database-before-match-agent-phase-2-*` | Phase 2 live run |
| `database-before-match-cleanup-reassign-*` | 762 cleanup swaps |
| `database-before-browser-plus-assign-*` | Per batch assign |
| `*.retroverse-package-label-backup-*` | `label-vdj-packages.ts` |

**Rollback operations:** Backups exist; no automated rollback tool found. Manual restore from backup XML only.

**Label corruption:** Graph `canonical_title` feat-tokenization (547 RVTRs) — affected **match scoring**, not Label field values.

---

## 4. The 177 graph repairs vs 762 label reassignments

User referenced **177 corruption repairs** — this is **137 (phase 1) + 40 (phase 2) = 177** Postgres `canonical_title` / `normalized_title_key` repairs. **VDJ labels were not modified.**

### Graph title repairs (177 total)

| Phase | Count | What was wrong | Source trusted | VDJ labels? | Trust impact |
|-------|------:|----------------|----------------|-------------|--------------|
| Phase 1 | 137 | `canonical_title` feat corruption (`Fi Feat Y`, etc.) | `tracks.title` (graph) | **No** | Indirect ↑ — validation scores improved |
| Phase 2 | 40 | hot100 key mismatch (title corrupt, key partial) | `tracks.title` | **No** | Indirect ↑ — matching validation improved |

### Label reassignments (762)

| Metric | Detail |
|--------|--------|
| What was wrong | Label pointed to **VDJ RVTR** when **hot100/hot100_vdj** canonical match existed (simulation 100% containment) |
| Source trusted | Match-engine simulation (artist catalog + title containment + identity preference) |
| VDJ labels modified? | **Yes** — 762 `Tags.Label` updates via `assignVdjLabelsBatch` |
| Trust impact | **Increased** — canonical identity share 4,214 → 4,967 (+753); disagreements 781 → 19 |

---

## 5. Historical low-confidence label writes

### Match Agent Phase 2 (documented auto-writer)

**Auto-write threshold:** Tier **A** (exact normalized artist+title) **OR** combined score **≥ 95** (`match-agent-types.ts`).

**Evidence of high-confidence-but-wrong-layer writes:**

- 776 Tier-A assigns went to **VDJ** identity (`rvtr-identity-audit.json`)
- Tier A = exact normalized match — not fuzzy — but matched **VDJ graph row** instead of hot100 when both existed
- **No** evidence Phase 2 auto-wrote below 95 combined except via Tier A (which can still be wrong-layer)

**Not auto-written by Phase 2:** 228 needs-review + 133 no-candidate — exported only.

### Manual assign paths (no confidence gate)

- `POST /api/ops/browser-plus/assign` — any RVTR operator supplies
- `POST /api/ops/browser-plus/assign-batch` — up to 200, no scoring
- Browser Plus Match Queue manual approve

### `label-vdj-packages.ts`

- Writes PK_/DK_/RVTR based on **`loadVdjIdentityCoverage`** (path + title/artist graph match)
- **Does not read existing Label**
- Can overwrite Retroverse labels; skips non-Retroverse labels

### Fuzzy / bulk without review

| Pattern | Found? |
|---------|--------|
| Fuzzy auto-write below 95 | **No** in match-agent |
| Bulk without review | Phase 2 auto (1,067) — no human confirm |
| Heuristic-only assign | **Possible** via manual API only |

---

## 6. Current label quality — Label RVTR vs best match

**Method:** Re-ran `runMatchEngineSimulation()` post-cleanup (containment scoring + canonical identity preference).

| Outcome | Count | % |
|---------|------:|--:|
| **Exact agreement** (label RVTR = simulated best) | **8,457** | **99.8%** |
| **Disagreement** (simulation proposes different RVTR) | **19** | **0.2%** |
| **Unresolved** (no label) | 399 | — |

Pre-cleanup simulation had **781** reassignment opportunities; cleanup reduced remaining disagreements by **97.6%**.

---

## 7. Confidence distribution (all 8,476 labeled VIDEO files)

### Audit buckets (post-cleanup, `video-match-confidence-audit`)

| Bucket | Count | % |
|--------|------:|--:|
| Exact | 4,158 | 49.0% |
| High | 665 | 7.8% |
| Medium | 3,571 | 42.1% |
| Low | 46 | 0.5% |
| Suspicious | 36 | 0.4% |

### Combined score bands (file vs assigned graph metadata)

| Band | Count | % |
|------|------:|--:|
| 99–100 | 7,460 | 88.0% |
| 95–98 | 740 | 8.7% |
| 90–94 | 195 | 2.3% |
| 80–89 | 13 | 0.2% |
| Below 80 | 68 | 0.8% |

### Trust score bands (includes identity-source penalty)

| Band | Count | % |
|------|------:|--:|
| 99–100 | 3,994 | 47.1% |
| 95–98 | 699 | 8.2% |
| 90–94 | 194 | 2.3% |
| 80–89 | 3,508 | 41.4% |
| Below 80 | 81 | 1.0% |

**Note:** 3,497 labeled files point to `identity_source = vdj` — capped at Medium bucket by design even when file metadata matches exactly. Trust score 80–89 band is largely **VDJ identity penalty**, not necessarily wrong RVTR.

---

## 8. Do systems assume Label RVTR is authoritative?

| System | Assumes authoritative? | Evidence |
|--------|------------------------|----------|
| **Browser Plus grid** | **Yes** | `matchMethod: rvtr ? "Label" : "Unmatched"` — no re-match |
| **Match Agent / queue** | **Yes (gate)** | Skips labeled files; matching only for blank |
| **Coverage audits** | **Yes** | `loadMatchedVideoTracks()` — label-only RVTR source |
| **Confidence audit** | **Yes (validate)** | Trusts label RVTR; scores file vs graph |
| **Match-engine simulation** | **No** | Re-simulates all files; proposes alternates |
| **Intelligence / video-ID** | **No** | `scanVdjDatabase()` ignores Label |
| **Package pipeline audits** | **No** | Uses `auditVideoIdentification` (label-blind) |
| **Sunday Nights resolve** | **No** | Path/alias/chart match |

**Split verdict:** Ops layer treats Label as authoritative. Intelligence layer treats it as invisible.

---

## 9. Final determination

### Should Label RVTR be authoritative?

| Option | Verdict |
|--------|---------|
| A. Authoritative source of truth | **Too strong** — historical wrong-layer, 42% medium VDJ, intelligence ignores Label |
| **B. Trusted but verify periodically** | **✓ Recommended** |
| C. Advisory only | **Too weak** — 99.8% post-cleanup agreement, ops already depend on Label |
| D. Not trustworthy | **Rejected** — cleanup fixed 762 errors; 37 suspicious / 19 disagreements |

---

## Trust score assessment

| Dimension | Score | Notes |
|-----------|------:|-------|
| Label ↔ best-match agreement | **A** | 99.8% post-cleanup |
| Metadata fit (combined score) | **A** | 88% at 99–100 |
| Identity layer quality | **C+** | 41% VDJ-only labels; 0 exact bucket for vdj |
| Historical write quality | **C** | Phase 2 82% VDJ bias; 252 wrong-layer before cleanup |
| Provenance / auditability | **C** | No label history in XML; ~87% legacy source unknown |
| Cross-system consistency | **C** | Intelligence ignores Label |

**Overall: B (7/10)** — trustworthy for ops after cleanup, with periodic validation and intelligence alignment still needed.

---

## Known risks

1. **3,497 VDJ-layer labels** — structurally capped at Medium confidence; may miss chart canonical RVTR (764 fixed in cleanup; 19 remain).
2. **Legacy ~7,400 labels** — no provenance; assumed correct until simulation/cleanup proved otherwise.
3. **Intelligence blind spot** — package/backfill audits can disagree with Label silently.
4. **Manual assign** — no confidence gate on API writes.
5. **`label-vdj-packages.ts`** — can rewrite labels from graph identity coverage, not from Label.
6. **No native VDJ row ID** — identity is path-based; file moves break linkage unless re-labeled.

---

## Recommendation

**Adopt B: Trusted but verify periodically.**

1. **Treat Label as authoritative at the VDJ boundary** for Browser Plus, coverage, execution, and playback — 99.8% validated.
2. **Run confidence + simulation audits on a schedule** — watch the 19 disagreements + 36 suspicious + 399 blank.
3. **Align intelligence** to read Label first before path/title matching (architecture audit recommendation).
4. **Do not re-run bulk matching on labeled files** — matching engine is for blank/`RV_PACKAGE` only.
5. **Keep VDJ backups** before any batch label operation — rollback is manual XML restore only.

---

## Outputs referenced

- `reports/match-agent-phase-2/`
- `reports/match-engine-simulation/`
- `reports/match-cleanup-execution/`
- `reports/match-agent-phase-3/VIDEO-MATCH-CONFIDENCE-AUDIT.md`
- `reports/rvtr-architecture-audit/AUDIT.md`
