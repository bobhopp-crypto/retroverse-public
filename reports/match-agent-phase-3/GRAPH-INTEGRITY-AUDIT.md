# Graph Integrity Audit — Feat Tokenization Corruption

**Scanned:** 2026-06-24T04:33:23.445Z  
**Affected RVTRs:** 410  
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

**Origin:** Canonical ingest title-casing replaces in-word "ft"/"feat" with " Feat " before capitalizing (simulation matches 4/410 hot100 rows with clean graph titles). Corruption is present in staging_canonical_track_imports — predates graph display view.

---

## Tables affected

| Table / field | Corrupt rows | Notes |
|---------------|-------------:|-------|
| `canonical_track_display` | 410 | Primary read surface for matching + UI |
| `canonical_tracks` | 410 | Identical canonical_title to display (0 mismatches) |
| `staging_canonical_track_imports` | 410 | Corruption present at import staging — origin layer |
| `tracks (graph primary)` | 0 | 40 corrupt RVTRs have clean graph titles; 370 have no primary graph track |
| `normalized_title_key` | 0 | 0 keys match clean graph title — field was NOT corrupted |

---

## By identity_source

| identity_source | Count | % |
|-----------------|------:|--:|
| `vdj` | 370 | 90.2% |
| `hot100` | 40 | 9.8% |

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
| Files labeled to corrupt RVTR | 5 |
| Title score &lt; 50 (file vs corrupt canonical) | 1 |
| Combined score &lt; 68 | 1 |
| In least-trustworthy-500 list | 2 |

---

## Examples — corrupt canonical vs clean graph title

- **zayn / taylor swift** — graph: "I Don't Wanna Live Forever (Fifty Shades Darker)" · canonical: "I Don'T Wanna Live Forever Fi Feat Y Shades Darker" · `RVTR846822` (#2)
- **rita coolidge** — graph: "(Your Love Has Lifted Me) Higher And Higher" · canonical: "Your Love Has Li Feat Ed Me Higher And Higher" · `RVTR747880` (#2)
- **The Weeknd** — graph: "Earned It (Fifty Shades Of Grey)" · canonical: "Earned It Fi Feat Y Shades Of Grey" · `RVTR232446` (#3)
- **cher** — graph: "After All (Love Theme From "Chances Are")" · canonical: "A Feat Er All Love Theme From Chances Are" · `RVTR696237` (#6)
- **nick lachey** — graph: "What's Left Of Me" · canonical: "What'S Le Feat Of Me" · `RVTR094257` (#6)
- **jackie wilson** — graph: "(Your Love Keeps Lifting Me) Higher And Higher" · canonical: "Your Love Keeps Li Feat Ing Me Higher And Higher" · `RVTR057173` (#6)
- **engelbert humperdinck** — graph: "After The Lovin'" · canonical: "A Feat Er The Lovin'" · `RVTR235294` (#8)
- **david ruffin** — graph: "My Whole World Ended (The Moment You Left Me)" · canonical: "My Whole World Ended The Moment You Le Feat Me" · `RVTR134604` (#9)
- **The Temptations** — graph: "I Could Never Love Another (After Loving You)" · canonical: "I Could Never Love Another A Feat Er Loving You" · `RVTR844978` (#13)
- **patti page** — graph: "Left Right Out Of Your Heart (Hi Lee Hi Lo Hi Lup Up Up)" · canonical: "Le Feat Right Out Of Your Heart Hi Lee Hi Lo Hi Lup Up Up" · `RVTR337730` (#13)
- **The Moody Blues** — graph: "Tuesday Afternoon (Forever Afternoon)" · canonical: "Tuesday A Feat Ernoon Forever A Feat Ernoon" · `RVTR203662` (#24)
- **brian hyland** — graph: "Warmed Over Kisses (Left Over Love)" · canonical: "Warmed Over Kisses Le Feat Over Love" · `RVTR797262` (#25)
- **frank sinatra** — graph: "Softly, As I Leave You" · canonical: "So Feat Ly As I Leave You" · `RVTR253053` (#27)
- **rufus** — graph: "At Midnight (My Love Will Lift You Up)" · canonical: "At Midnight My Love Will Li Feat You Up" · `RVTR153333` (#30)
- **andy williams** — graph: "Love Theme From "The Godfather" (Speak Softly Love)" · canonical: "Love Theme From The Godfather Speak So Feat Ly Love" · `RVTR315437` (#34)

---

## Examples — matched VIDEO files hurt by corruption

- **The Moody Blues — Tuesday Afternoon** → `RVTR203662` · titleScore 20 · canonical "Tuesday A Feat Ernoon Forever A Feat Ernoon" · graph "Tuesday Afternoon (Forever Afternoon)"

---

## Recommendation (audit only)

Fix `canonical_title` from clean `tracks.title` or chart source **before** conflict reassignment or new matching. Matching on `normalized_title_key` or graph title would bypass corruption but does not repair canonical display.

---

## Outputs

- `graph-integrity-audit.json`
- `feat-corruption-rvtrs.csv`
