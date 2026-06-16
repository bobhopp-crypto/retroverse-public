# MB-CANARY-25 — Apply Readiness Review

**Generated:** 2026-06-15T18:13:16.774Z  
**Phase:** 5G — Apply readiness (read-only validation)  
**Mode:** **No apply** · **No canonical writes**

---

## Executive summary

| Verdict | Count | Proposal IDs |
|---------|------:|--------------|
| **READY** | **0** | — |
| **NEEDS_REVIEW** | **17** | 26, 51, 49, 52, 53, 50, 107, 115, 116, 146, 121, 131, 154, 42, 43, 44, 45 |
| **BLOCKED** | **1** | 47 |

**Apply gate:** `RETROVERSE_MB_INGEST_APPLY=1` (currently **disabled**)

All 18 approved proposals re-validated against live Postgres at report time.

---

## Per-proposal validation (23 approved)

Checks: (1) RVTR unlinked · (2) album absent · (3) RVAL free · (4) track on tracklist · (5) studio-eligible · (6) no duplicate group

| ID | Verdict | Primary RVTR | Artist | Track | Album | Proposed RVAL | Weeks | RVTRs | 1 | 2 | 3 | 4 | 5 | 6 | Advisories |
|----|---------|--------------|--------|-------|-------|---------------|------:|------:|:-:|:-:|:-:|:-:|:-:|:-:|:-----------|
| 26 | NEEDS_REVIEW | RVTR765818 | teddy swims | Lose Control | I've Tried Everything but Therapy (Part 1) | RVAL1000000 | 112 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | album_title_has_part_suffix — confirm canonical LP title; rval_low_number — gap-fill allocator used sub-100k slot |
| 47 | BLOCKED | RVTR718588 | leblanc | Falling | Midnight Light | RVAL1000001 | 28 | 1 | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 51 | NEEDS_REVIEW | RVTR531432 | captain | Do That To Me One More Time | Make Your Move | RVAL1000002 | 27 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 49 | NEEDS_REVIEW | RVTR940076 | marilyn mccoo | You Don'T Have To Be A Star To Be In My Show | I Hope We Get to Love in Time | RVAL1000003 | 26 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 52 | NEEDS_REVIEW | RVTR984204 | seals | Get Closer | Get Closer | RVAL1000004 | 26 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 53 | NEEDS_REVIEW | RVTR717913 | jaya | If You Leave Me Now | Jaya | RVAL1000005 | 26 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 50 | NEEDS_REVIEW | RVTR287922 | england dan | I'D Really Love To See You Tonight | Nights Are Forever | RVAL1000006 | 24 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 107 | NEEDS_REVIEW | RVTR748529 | captain | You Never Done It Like That | Dream | RVAL1000007 | 22 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 115 | NEEDS_REVIEW | RVTR600025 | men | Pop Goes The World | Pop Goes the World | RVAL1000008 | 21 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 116 | NEEDS_REVIEW | RVTR052886 | bob beckham | Just As Much As Ever | Just As Much As Ever | RVAL1000009 | 21 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 146 | NEEDS_REVIEW | RVTR222495 | ta mara | Everybody Dance | Ta Mara and The Seen | RVAL1000010 | 21 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 121 | NEEDS_REVIEW | RVTR281326 | captain | Muskrat Love | Song of Joy | RVAL1000011 | 20 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 131 | NEEDS_REVIEW | RVTR095957 | The Fuzz | I Love You For All Seasons | The Fuzz | RVAL1000012 | 20 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 154 | NEEDS_REVIEW | RVTR015921 | sexyy red | Get It Sexyy | Get It Sexyy - Versions EP | RVAL1000013 | 20 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | rval_low_number — gap-fill allocator used sub-100k slot |
| 42 | NEEDS_REVIEW | RVTR048972 | doja cat | Agora Hills | Scarlet | RVAL1000014 | 0 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | low_chart_weeks — weaker Hot 100 signal; rval_low_number — gap-fill allocator used sub-100k slot |
| 43 | NEEDS_REVIEW | RVTR109504 | d.r.a.m | Broccoli | Big Baby D.R.A.M. | RVAL1000015 | 0 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | low_chart_weeks — weaker Hot 100 signal; rval_low_number — gap-fill allocator used sub-100k slot |
| 44 | NEEDS_REVIEW | RVTR367295 | dababy | Suge | Baby on Baby | RVAL1000016 | 0 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | low_chart_weeks — weaker Hot 100 signal; rval_low_number — gap-fill allocator used sub-100k slot |
| 45 | NEEDS_REVIEW | RVTR107414 | steve lacy | Bad Habit | Gemini Rights | RVAL1000017 | 0 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | low_chart_weeks — weaker Hot 100 signal; rval_low_number — gap-fill allocator used sub-100k slot |

---

## READY (0)

_None_

---

## NEEDS_REVIEW (17)

| 26 | NEEDS_REVIEW | RVTR765818 | teddy swims | Lose Control | I've Tried Everything but Therapy (Part 1) | RVAL1000000 | 112 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | album_title_has_part_suffix — confirm canonical LP title; rval_low_number — gap-fill allocator used sub-100k slot |
| 51 | NEEDS_REVIEW | RVTR531432 | captain | Do That To Me One More Time | Make Your Move | RVAL1000002 | 27 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 49 | NEEDS_REVIEW | RVTR940076 | marilyn mccoo | You Don'T Have To Be A Star To Be In My Show | I Hope We Get to Love in Time | RVAL1000003 | 26 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 52 | NEEDS_REVIEW | RVTR984204 | seals | Get Closer | Get Closer | RVAL1000004 | 26 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 53 | NEEDS_REVIEW | RVTR717913 | jaya | If You Leave Me Now | Jaya | RVAL1000005 | 26 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 50 | NEEDS_REVIEW | RVTR287922 | england dan | I'D Really Love To See You Tonight | Nights Are Forever | RVAL1000006 | 24 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 107 | NEEDS_REVIEW | RVTR748529 | captain | You Never Done It Like That | Dream | RVAL1000007 | 22 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 115 | NEEDS_REVIEW | RVTR600025 | men | Pop Goes The World | Pop Goes the World | RVAL1000008 | 21 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 116 | NEEDS_REVIEW | RVTR052886 | bob beckham | Just As Much As Ever | Just As Much As Ever | RVAL1000009 | 21 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 146 | NEEDS_REVIEW | RVTR222495 | ta mara | Everybody Dance | Ta Mara and The Seen | RVAL1000010 | 21 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 121 | NEEDS_REVIEW | RVTR281326 | captain | Muskrat Love | Song of Joy | RVAL1000011 | 20 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 131 | NEEDS_REVIEW | RVTR095957 | The Fuzz | I Love You For All Seasons | The Fuzz | RVAL1000012 | 20 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |
| 154 | NEEDS_REVIEW | RVTR015921 | sexyy red | Get It Sexyy | Get It Sexyy - Versions EP | RVAL1000013 | 20 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | rval_low_number — gap-fill allocator used sub-100k slot |
| 42 | NEEDS_REVIEW | RVTR048972 | doja cat | Agora Hills | Scarlet | RVAL1000014 | 0 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | low_chart_weeks — weaker Hot 100 signal; rval_low_number — gap-fill allocator used sub-100k slot |
| 43 | NEEDS_REVIEW | RVTR109504 | d.r.a.m | Broccoli | Big Baby D.R.A.M. | RVAL1000015 | 0 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | low_chart_weeks — weaker Hot 100 signal; rval_low_number — gap-fill allocator used sub-100k slot |
| 44 | NEEDS_REVIEW | RVTR367295 | dababy | Suge | Baby on Baby | RVAL1000016 | 0 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | low_chart_weeks — weaker Hot 100 signal; rval_low_number — gap-fill allocator used sub-100k slot |
| 45 | NEEDS_REVIEW | RVTR107414 | steve lacy | Bad Habit | Gemini Rights | RVAL1000017 | 0 | 1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | low_chart_weeks — weaker Hot 100 signal; rval_low_number — gap-fill allocator used sub-100k slot |

---

## BLOCKED (1)

| 47 | BLOCKED | RVTR718588 | leblanc | Falling | Midnight Light | RVAL1000001 | 28 | 1 | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | pre_1990_catalog — vintage MB metadata; lower chart relevance; rval_low_number — gap-fill allocator used sub-100k slot |

---

## First production apply recommendations

### Apply 5 (recommended first wave)

**Proposal IDs:** **26, 51, 49, 52, 53**

| ID | RVTR | Artist | Track | RVAL | Weeks |
|----|------|--------|-------|------|------:|
| 26 | RVTR765818 | teddy swims | Lose Control | RVAL1000000 | 112 |
| 51 | RVTR531432 | captain | Do That To Me One More Time | RVAL1000002 | 27 |
| 49 | RVTR940076 | marilyn mccoo | You Don'T Have To Be A Star To Be In My Show | RVAL1000003 | 26 |
| 52 | RVTR984204 | seals | Get Closer | RVAL1000004 | 26 |
| 53 | RVTR717913 | jaya | If You Leave Me Now | RVAL1000005 | 26 |

**Justification:** Highest chart-weeks cohort; single-RVTR studio albums where possible; all six pre-apply gates pass at read time; smallest rollback surface for first production proof. Run rollback drill on proposal **26** before wave 2.

### Apply 10 (second wave)

**Proposal IDs:** **26, 51, 49, 52, 53, 50, 107, 115, 116, 146**

**Justification:** Expands to next tier of chart significance after wave-5 rollback passes. Includes merged multi-RVTR albums (Shaboozey, Doja Planet Her, Pop Smoke) — one transaction per album, multiple RVTR links. Hold if any wave-5 rollback fails.

### Apply all 23 (full canary)

**Proposal IDs:** **26, 51, 49, 52, 53, 50, 107, 115, 116, 146, 121, 131, 154, 42, 43, 44, 45** (17 non-blocked)

**Justification:** Entire hardened approve set minus blocked rows. Requires: (1) wave-5 rollback proven, (2) wave-10 stable, (3) RVAL re-allocation decision (see below), (4) vintage catalog rows (51, 49, 52, 53, 50, 107, 115, 116, 146, 121, 131) accepted as lower-risk graph enrichment.

**Do not apply today:** blocked IDs 47 · 5 review-tier proposals (IDs see review section) remain in human queue per 5E.

---

## RVAL numbering strategy

| Item | Value |
|------|-------|
| Canonical RVAL range | RVAL000003 → RVAL999992 |
| Canary proposed range | RVAL000004 → RVAL999999 |
| Allocator | Gap-fill from 1..999999 (`allocateProposedRvals`) |
| Low-number proposals | 101 (RVAL000004, RVAL000005, RVAL000006, RVAL000008, RVAL000009…) |

**Assessment:** Gap-fill allocator assigned low-number RVALs (RVAL000001+). Valid 6-digit format but unconventional vs production max ~RVAL999993. Recommend re-allocate from max+1 gap before first apply.

**Recommendation before apply:** Re-stage with `max+1` allocator (continue from ~`RVAL999992`) OR explicitly accept low-number RVALs as first MusicBrainz ingest IDs. Low numbers are valid 6-digit but may confuse ops tooling expecting high-range IDs.

---

## Rollback strategy

| Item | Design |
|------|--------|
| Scope | Per proposal (`rollbackMbIngest(proposalId)`) — future `lib/healing/apply-mb-ingest.ts` |
| Tables | DELETE `canonical_album_tracks` where `canonical_source = 'musicbrainz_ingest_approved'`; DELETE `album_external_keys` where `source = 'musicbrainz_ingest'`; DELETE `albums` if no other CAT rows |
| Multi-RVTR | Rollback clears all linked RVTRs from merged group in one transaction |
| Guard | Only rows tagged `musicbrainz_ingest_approved` — no collateral Bucket A links |
| Proof required | Rollback **one** wave-5 proposal before scaling past 5 |

**Status:** Rollback function **not yet implemented** (Phase 5C design only). **Block production apply until rollback is coded and tested on staging.**

---

## Audit trail strategy

| Layer | Path / table | Status |
|-------|--------------|--------|
| Proposal staging | `mb_album_ingest_proposals` | ✅ 29 rows (28 staged + 1 rejected) |
| Stage audit | `/Users/bobhopp/RETROVERSE_DATA/ops/healing/mb-ingest-audit.jsonl` | ✅ JSONL per stage/reject |
| Apply audit | `healing-audit.jsonl` (planned `mb_ingest_apply`) | ⏳ Not wired |
| Proposal status | `staged → approved → applied → rolled_back` | Schema ready |
| Actor tagging | CLI actor string per action | ✅ |

**Recommendation:** Append `mb_ingest_apply` + `mb_ingest_rollback` to audit JSONL on every apply/rollback; store `applied_cat_row_ids[]` on proposal row for surgical undo.

---

## Safest first production batch

**Recommended:** Apply **5** — IDs **26, 51, 49, 52, 53**

**Pre-flight checklist:**
1. Implement + test `rollbackMbIngest` on ID 26
2. Decide RVAL allocator strategy (gap-fill vs max+1)
3. Set `RETROVERSE_MB_INGEST_APPLY=1` only after rollback test
4. Re-run this readiness report immediately before apply
5. Mark proposals `approved` in staging table (human gate)

---

## Artifacts

- Hardened batch: `reports/mb-canary-25-hardened.md`
- JSON: `tools/out/mb-canary-25-apply-readiness.json`
- Pipeline design: `reports/musicbrainz-recovery-pipeline-design.md`

```bash
npm run mb:canary:apply-readiness
```
