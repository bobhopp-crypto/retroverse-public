# RVTR Coverage Audit

**Date:** 2026-06-23  
**Sources:** Local Postgres `canonical_track_display`, `chart_appearances`, VirtualDJ `database.xml`  
**No data modified.**

---

## 1. Total RVTR records

| Metric | Count |
|--------|------:|
| **Total RVTR records** (`canonical_track_display`) | **49,187** |

All records use `RVTR######` format via `retroverse_track_id` / `track_id`.

---

## 2. RVTR with Billboard history

| Metric | Count |
|--------|------:|
| **With Billboard Hot 100 history** (`has_hot100 = true` or `peak_hot100_position` set) | **32,187** |

Backed by 32,269 distinct tracks in `chart_appearances` with `chart_name ILIKE '%hot 100%'`.

---

## 3. RVTR without Billboard history

| Metric | Count |
|--------|------:|
| **Without Billboard Hot 100 history** | **17,000** |

All 17,000 have `identity_source = 'vdj'` and `has_vdj_media = true`.  
Zero non-Hot100 RVTRs lack VDJ media flag.

---

## 4. VDJ Browser Plus counts

Parsed from `~/Library/Application Support/VirtualDJ/database.xml` (same source as Browser Plus).

| Metric | Count |
|--------|------:|
| **Total entries** | **32,208** |
| **Entries with RVTR** (Label contains `RVTR######`) | **24,707** |
| **Entries without RVTR** | **7,501** |
| Distinct RVTRs represented in VDJ | 19,001 |
| RVTRs with multiple VDJ files | 3,970 (+5,706 extra file rows) |

Multiple files per RVTR = expected (video + audio, edits, alternates).

---

## 5. Sample classification (100 Browser Plus entries)

Evenly sampled across 32,208 entries. Classification uses RVTR graph join + title heuristics.

| Class | Count | % of sample |
|-------|------:|------------:|
| **Billboard song** | 37 | 37% |
| **Non-Billboard song** | 30 | 30% |
| **Unknown** (no RVTR label) | 22 | 22% |
| **Album track** (filename/title heuristics) | 8 | 8% |
| **DJ edit/remix** | 3 | 3% |

### Examples

**Billboard song**
- Waka Flocka Flame — No Hands (`RVTR763111`)
- Gabrielle — Dreams (`RVTR283373`)
- Sheppard — Geronimo (`RVTR711003`)
- Justin Timberlake — Can't Stop The Feeling! (`RVTR182672`)

**Non-Billboard song**
- Bob Sinclar — Rock The Boat (`RVTR047199`)
- Jack Johnson — All At Once (`RVTR631951`)
- Jon Secada — Stop (`RVTR788498`)
- Buckcherry — Lit Up (`RVTR236431`)

**DJ edit/remix**
- 30 Seconds To Mars — Hurricane (Promo Only No Break Edit) — **no RVTR**
- Son of Dave — How To Make a Voodoo Doll (`RVTR354616`)
- The Archies — Sugar, Sugar (Lyrics) — **no RVTR**

**Unknown (no RVTR)**
- Flash Cadillac — Muleskinner Blues
- Digable Planets — Rebirth of Slick
- Rolling Stones — Brown Sugar [Montage Video]
- Chris Stapleton & Justin Timberlake — Tennessee Whiskey & Drink You Away

**Browser Plus without RVTR (more examples)**
- Paul Hardcastle — You're The One For Me (DJ Funkouse Edit)
- Stacie Orrico — Stuck (DJ Funkouse Thunderpuss Club Mix)
- Marshall Jefferson — Move Your Body (House Music Anthem)

---

## 6. Answers

### A. Is every VDJ Browser Plus item backed by an RVTR?

**No.**

| | Count | % |
|--|------:|--:|
| With RVTR | 24,707 | 76.7% |
| **Without RVTR** | **7,501** | **23.3%** |

Unlabeled items skew toward DJ edits, live cuts, montage videos, and legacy imports.  
All RVTR labels in VDJ resolve to graph records (0 orphan RVTRs).

---

### B. Does every RVTR represent a Billboard/Hot 100 song?

**No.**

| | Count | % |
|--|------:|--:|
| Hot 100 chart history | 32,187 | 65.4% |
| **No Hot 100 history** | **17,000** | **34.6%** |

Identity source breakdown:

| Source | Count | Meaning |
|--------|------:|---------|
| `hot100` | 26,666 | Chart-only canonical tracks |
| `hot100_vdj` | 5,521 | Chart + local VDJ media |
| `vdj` | 17,000 | VDJ library only, no chart row |

Examples without Hot 100: `'N Sync — Gone`, `"weird al" yankovic — Bohemian Polka`, `? — 96 Tears` (non-chart VDJ identity).

---

### C. What percentage of RVTRs have chart history?

**65.4%** (32,187 / 49,187)

---

### D. What percentage exist solely to support VirtualDJ integration?

**34.6%** (17,000 / 49,187)

These RVTRs are:
- `identity_source = 'vdj'`
- `has_hot100 = false`
- `has_vdj_media = true`
- No rows in `chart_appearances`

They exist to give canonical IDs to local performance files not tied to Hot 100 chart history.

Additional context:
- **61.4%** of graph RVTRs (30,186) have **no** VDJ file label at all — chart-first catalog entries
- **38.6%** of graph RVTRs (19,001) appear in VDJ library

---

## Summary table

| Question | Answer |
|----------|--------|
| Total RVTRs | 49,187 |
| With Billboard | 32,187 (65.4%) |
| Without Billboard | 17,000 (34.6%) |
| Browser Plus total | 32,208 |
| Browser Plus with RVTR | 24,707 (76.7%) |
| Browser Plus without RVTR | 7,501 (23.3%) |
| VDJ-only RVTRs | 17,000 (34.6%) |
