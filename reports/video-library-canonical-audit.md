# Video Library Canonical Audit

**Date:** 2026-06-23  
**Source of truth:** `~/DJ MEDIA/VIDEO` only  
**Excluded:** `DJ MEDIA/MUSIC`, audio-only, non-video VDJ entries, `VIDEO VAULT`

Method:
- Video files = filesystem walk under `DJ MEDIA/VIDEO` (playable extensions: mp4, m4v, mov, avi, mkv, mpg, mpeg, vob, wmv)
- Excluded subfolders matching intelligence rules: karaoke, samples, stingers, utility, scratch, fx
- RVTR = VDJ `Label` tag on matching file path
- Hot 100 = `canonical_track_display.has_hot100 = true`
- Chart year = `first_chart_date` calendar year

No data modified.

---

## 1. Total video files

| Metric | Count |
|--------|------:|
| **Total video files** (filesystem) | **8,796** |
| With RVTR label | 7,357 |
| Without RVTR label | 1,439 |

---

## 2. Distinct RVTRs represented by video files

| Metric | Count |
|--------|------:|
| **Distinct video RVTRs** | **7,149** |

Multiple files per RVTR is normal (alt cuts, re-encodes, TV vs promo).

---

## 3. Hot 100 songs represented by video files

| Metric | Count |
|--------|------:|
| **Hot 100 RVTRs with video file** | **3,864** |
| Video RVTRs that are Hot 100 | 3,864 / 7,149 = **54.0%** |

Examples:
- RVTR727463 — Alannah Myles — Black Velvet (#1)
- RVTR469359 — The Police — Every Breath You Take (#1)
- RVTR261615 — The Doors — Light My Fire (#1, 1967)
- RVTR276702 — The Beatles — All You Need Is Love (#1, 1967)

---

## 4. Hot 100 songs missing from video files

| Metric | Count |
|--------|------:|
| **Hot 100 RVTRs with no video file** | **28,323** |
| Missing rate | 28,323 / 32,187 = **88.0%** |

Examples (1971 #1 hits missing video):
- RVTR497230 — Cher — Gypsys Tramps & Thieves
- RVTR582739 — James Taylor — You've Got A Friend
- RVTR930557 — Nilsson — Without You
- RVTR173036 — Janis Joplin — Me And Bobby McGee

---

## 5. Top Hot 100 coverage by year

Year bucket = `first_chart_date` year.

| Year | Video | Hot 100 total | Coverage |
|------|------:|--------------:|---------:|
| **1967** | 52 | 734 | **7.1%** |
| **1971** | 44 | 611 | **7.2%** |
| **1978** | 82 | 441 | **18.6%** |
| **1992** | 70 | 358 | **19.6%** |

### Strongest years (≥50 Hot 100 songs/year)

| Year | Coverage |
|------|----------|
| 1984 | **27.4%** (118/430) |
| 1983 | 26.1% (115/440) |
| 1987 | 25.8% (100/388) |
| 1988 | 24.5% (93/379) |
| 2014 | 23.5% (85/361) |
| 2011 | 23.4% (113/483) |

### Weakest years (≥50 Hot 100 songs/year)

| Year | Coverage |
|------|----------|
| 1962 | 1.2% (8/657) |
| 1961 | 1.5% (10/676) |
| 1960 | 1.6% (10/607) |
| 2023 | 1.8% (11/601) |
| 1963 | 2.0% (13/662) |
| 1958 | 2.0% (7/352) |
| 2024 | 2.3% (14/612) |
| 2025 | 0.5% (3/587) |

Pattern: **1980s–2010s video-era hits best covered**; **pre-1965 and 2020s+ weakest**.

---

## 6. Comparison: Entire Retroverse vs Video Library

| Metric | A. Entire Retroverse | B. Video Library only |
|--------|---------------------:|----------------------:|
| Total RVTRs | 49,187 | 7,149 |
| Hot 100 RVTRs | 32,187 | 3,864 |
| Non–Hot 100 RVTRs | 17,000 | 3,285 |
| Hot 100 + Video overlap | 3,864 | 3,864 |
| Hot 100 not in Video | 28,323 | — |
| Video RVTR count | — | **7,149** |
| Files without RVTR | — | 1,439 |

### Percentages

| Question | Answer |
|----------|--------|
| **Video RVTR count** | **7,149** distinct |
| **Hot100 + Video overlap** | **3,864** (12.0% of all Hot 100; 54.0% of video RVTRs) |
| **Hot100 not in Video** | **28,323** (88.0% of Hot 100 catalog) |
| **Years strongest** | 1983–1988, 2010–2014 (~22–27%) |
| **Years weakest** | 1958–1963, 2022–2025 (<3%) |

### Video library composition

| Segment | Count | % of video RVTRs |
|---------|------:|-----------------:|
| Hot 100 + video | 3,864 | 54.0% |
| VDJ-only (no Hot 100) | 3,285 | 46.0% |

Non–Hot 100 video examples:
- RVTR000174 — Leon Russell — A Song For You
- RVTR001896 — Joan Jett — Do Ya Wanna Touch
- RVTR002635 — Supafly Inc — Moving Too Fast

Video files without RVTR (1,439) — recent/unlinked imports:
- Paul Cauthen — Country as F***
- Justin Bieber — Red Eye ft. TroyBoi
- David Guetta — Baby Don't Hurt Me

---

## Summary

The **VIDEO folder is a performance subset**, not a mirror of Retroverse:

- Covers **12%** of Hot 100 canon (3,864 / 32,187)
- **46%** of video RVTRs are non–Hot 100 (local/DJ performance tracks)
- **1,439** video files still lack RVTR labels
- Best decade for video coverage: **1980s** (~25%)
- Worst: **early chart era (1958–1963)** and **current decade (2022–2025)**
