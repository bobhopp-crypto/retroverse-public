# Graph Integrity Audit — Feat Tokenization Corruption

**Scanned:** 2026-07-15T23:30:12.659Z  
**Affected RVTRs:** 370  
Read-only — no graph or assignment modifications.

---

## Pattern

Corrupted `canonical_title` values contain internal **` Feat `** tokens where the substring **`ft`** or **`feat`** appeared inside an English word:

| Clean title | Corrupted canonical_title |
|-------------|---------------------------|
| Fifteen | Fi Feat Een |
| Afternoon Delight | A Feat Ernoon Delight |
| Day After Day | Day A Feat Er Day |
| Drift Away | Dri Feat Away |
| Killing Me Softly With His Song | Killing Me So Feat Ly With His Song |

**Origin:** Canonical ingest title-casing replaces in-word "ft"/"feat" with " Feat " before capitalizing (simulation matches 0/370 hot100 rows with clean graph titles). Corruption is present in staging_canonical_track_imports — predates graph display view.

---

## Tables affected

| Table / field | Corrupt rows | Notes |
|---------------|-------------:|-------|
| `canonical_track_display` | 370 | Primary read surface for matching + UI |
| `canonical_tracks` | 370 | Identical canonical_title to display (0 mismatches) |
| `staging_canonical_track_imports` | 370 | Corruption present at import staging — origin layer |
| `tracks (graph primary)` | 0 | 0 corrupt RVTRs have clean graph titles; 370 have no primary graph track |
| `normalized_title_key` | 0 | 0 keys match clean graph title — field was NOT corrupted |

---

## By identity_source

| identity_source | Count | % |
|-----------------|------:|--:|
| `vdj` | 370 | 100% |

---

## Does matching use corrupted values?

**Yes.** Match scoring and candidate SQL query `canonical_track_display.canonical_title` directly:

- `lib/sunday-nights/match-candidates.ts — ILIKE + compact compare on canonical_title`
- `lib/ops/browser-plus/match-queue.ts — matchSimilarityScore(file, canonical_title)`
- `lib/ops/browser-plus/browser-plus-artist-match.ts — combinedMatchScore`
- `lib/ops/intelligence/video-identification.ts — title/artist index from canonical_title`
- `lib/ops/intelligence/vdj-rvtr-resolve.ts — exact title match on canonical_title`

`normalized_title_key` and primary `tracks.title` are clean but **not used** by the match agent path today.

---

## VIDEO match impact

| Metric | Count |
|--------|------:|
| Matched VIDEO files (total) | 8,476 |
| Files labeled to corrupt RVTR | 2 |
| Title score &lt; 50 (file vs corrupt canonical) | 0 |
| Combined score &lt; 68 | 0 |
| In least-trustworthy-500 list | 0 |

---

## Examples — corrupt canonical vs clean graph title



---

## Examples — matched VIDEO files hurt by corruption



---

## Recommendation (audit only)

Fix `canonical_title` from clean `tracks.title` or chart source **before** conflict reassignment or new matching. Matching on `normalized_title_key` or graph title would bypass corruption but does not repair canonical display.

---

## Outputs

- `graph-integrity-audit.json`
- `feat-corruption-rvtrs.csv`
