# Album Chart Journey Similarity

**Status:** Canonical (Album page v1)  
**Implementation:** `lib/album/album-chart-similarity.ts`, `lib/album/album-chart-features.ts`  
**Index:** `data/album-chart-features.json` (build-time)

## Purpose

Surface four albums whose **Billboard 200 chart behavior** most closely resembles the current album. This is chart-trajectory similarity, not genre or artist similarity.

## Feature vector

Each album with at least four B200 chart weeks gets an `AlbumChartFeatures` fingerprint:

| Feature | Description |
|---------|-------------|
| `debutRank` | First chart week position |
| `peakRank` | Best (lowest) B200 position |
| `weeksToPeak` | Weeks from debut to peak (primary run) |
| `totalChartWeeks` | Total weeks on chart |
| `weeksAtNumberOne` | Weeks at #1 |
| `weeksAtPeak` | Weeks at peak rank |
| `reEntryCount` | Number of chart returns after falling off |
| `longestGapOffChart` | Longest absence before a return (weeks) |
| `reboundCount` | Re-entries that reach a better peak than prior run |
| `declineRate` | Average weekly rank drop after peak |
| `longevityAfterPeak` | Weeks on chart after peak week |

Features are derived from the same `buildChartJourney` / `detectChartRuns` pipeline used by the Chart Journey UI.

## Normalization

Each dimension is compared as:

```
delta = |a - b| / NORMALIZER[feature]
```

Normalizers (approximate chart scales):

- debutRank / peakRank → 200
- weeksToPeak → 40
- totalChartWeeks → 80
- weeksAtNumberOne / weeksAtPeak → 20
- reEntryCount → 5
- longestGapOffChart → 200
- reboundCount → 3
- declineRate → 15
- longevityAfterPeak → 60

## Weighted distance

```
distance = Σ (weight[feature] × delta) / Σ weight[feature]
```

Weights (emphasis on peak shape and endurance):

| Feature | Weight |
|---------|--------|
| peakRank | 1.4 |
| weeksAtNumberOne | 1.3 |
| totalChartWeeks | 1.2 |
| weeksToPeak | 1.1 |
| longevityAfterPeak | 1.1 |
| debutRank | 0.9 |
| reEntryCount | 1.0 |
| longestGapOffChart | 1.0 |
| weeksAtPeak | 0.8 |
| reboundCount | 0.7 |
| declineRate | 0.6 |

Lower distance = closer match.

## Exclusions

- Current album (`rval`)
- Duplicate editions: same normalized `titleKey` (lowercase alphanumeric title)
- Candidates without a navigable `/album/{RVAL}` href
- Albums with fewer than four B200 chart weeks (insufficient data)

## Match reason (public copy)

After ranking, a short reason is chosen deterministically from the closest matching traits, e.g.:

- "Similar slow climb and long post-peak run."
- "Similar fast rise and multiple returns to the chart."
- "Comparable chart arc on the Billboard 200."

## Build-time index

Regenerate after chart ingest changes:

```bash
npx tsx tools/album/build-chart-features-index.ts
```

Writes `data/album-chart-features.json` with one row per qualifying album. Runtime loads this file once (module cache) and computes distance only for the current album.

## Runtime flow

1. `loadAlbumPage` builds current album features from live chart rows.
2. `loadAlbumChartFeaturesIndex` provides candidate pool.
3. `rankSimilarAlbumChartJourneys` returns top 4 with reasons.
4. Cover URLs resolved in a single batch query for the four RVALs.

## Known limitations

- Similarity uses B200 only (not Hot 100 or international charts).
- Pre-1980 sparse chart history may produce thin fingerprints.
- Wiki/source metadata does not influence similarity — chart behavior only.
- Albums without `album_external_keys` RVAL are excluded from the candidate pool.
