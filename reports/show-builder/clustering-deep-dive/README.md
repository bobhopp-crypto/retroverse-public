# Set Builder Clustering Deep Dive

Generated: 2026-06-03T23:07:33.365Z

## Goal

Compare clustering strategies for **DJ set-building association** — not genre taxonomy.
Tested on VirtualDJ MyLists year pools: **1967**, **1978**, **1992**.

## Methods Compared

### Method A — Cultural Association + k-means
Year-aware cultural co-presence vectors (artist/title anchors per era) → farthest-first k-means centroids → merge tiny clusters.
- **5 passes:** k=5/6/7 with merge thresholds, plus k7-merge2 and k6-merge4 variants.

### Method B — Iterative Outlier Removal
Human-like pile building: find cultural hub → grow core → repeatedly peel songs that don't fit → save pile → repeat on remainder.
- **5 passes:** outlier thresholds 0.38–0.50, plus minClusterSize=4 variant.

### Method C — Farthest-First Seed Similarity
Pick seed songs maximally spread in cultural space (hub first, then farthest from prior seeds) → assign each song to nearest seed by similarity.
- **5 passes:** 5–8 seeds.

## Scoring (DJ-oriented heuristics)

| Metric | Weight | Meaning |
|--------|--------|---------|
| Anchor pairs | 40% | Known "should be together" song pairs land in same cluster |
| Cohesion | 20% | Intra-cluster cultural similarity |
| Separation | 15% | Clusters are distinct from each other |
| Silhouette | 10% | Songs fit their cluster vs neighbors |
| Balance | 15% | Avoid singletons and one giant catch-all cluster |

Anchor pairs are defined per year in `lib/ops/show-builder/clustering/evaluate.ts`.

## Results Summary

**Total runs:** 45 (15 passes × 3 years)

### Best method per year

#### 1967 → Method **C** (`seeds-8`)
- Composite score: **0.889**
- Anchors: 5/5
- Clusters: 8

| Cluster | Count | Seed / Sample |
|---------|-------|---------------|
| Cluster A (Green) | 12 | Seed: Niki Hoeky; Niki Hoeky, The Oogum Boogum Song, Let's Live For Today |
| Cluster B (Purple) | 6 | Seed: You Got To Me (American Bandstand); You Got To Me (American Bandstand), Something Stupid, Can't Take My Eyes Off You |
| Cluster C (Gold) | 6 | Seed: The Wind Cries Mary; White Rabbit, The Wind Cries Mary, Just Dropped In |
| Cluster D (Blue) | 5 | Seed: Creque Alley; Never My Love, I'm A Believer, Happy Together |
| Cluster E (Pink) | 5 | Seed: The Letter; Brown Eyed Girl, The Letter, Love Is All Around |
| Cluster F (Orange) | 4 | Seed: Hello, Goodbye; To Love Somebody, Ruby Tuesday, Hello, Goodbye |
| Cluster G (Teal) | 1 | Seed: I've Been Loving You Too Long; I've Been Loving You Too Long |
| Cluster H (Red) | 1 | Seed: For What It's Worth (Extended); For What It's Worth (Extended) |

#### 1978 → Method **A** (`k7-merge3`)
- Composite score: **0.752**
- Anchors: 5/6
- Clusters: 6

| Cluster | Count | Seed / Sample |
|---------|-------|---------------|
| Cluster A (Green) | 16 | —; Runnin' Outta Moonlight, Werewolves Of London, Surrender |
| Cluster B (Purple) | 11 | —; Magnet and Steel, Thank You For Being A Friend, Only The Good Die Young |
| Cluster C (Gold) | 6 | —; Mammas Don't Let Your Babies Grow Up To Be Cowboys, Kiss You All Over, The Gambler |
| Cluster D (Blue) | 6 | —; Rivers of Babylon, Tragedy, Le Freak |
| Cluster E (Pink) | 6 | —; Heart Of Glass, (I Can't Get No) Satisfaction, Hot Child In The City |
| Cluster F (Orange) | 4 | —; Take A Chance On Me, Dreadlock Holiday, Grease |

#### 1992 → Method **A** (`k6-merge3`)
- Composite score: **0.882**
- Anchors: 6/6
- Clusters: 6

| Cluster | Count | Seed / Sample |
|---------|-------|---------------|
| Cluster A (Green) | 13 | —; Rump Shaker, Cantaloop, Baby Got Back |
| Cluster B (Purple) | 10 | —; Everything About You, Give It Away, Man On The Moon |
| Cluster C (Gold) | 9 | —; 7, More & More, Twilight Zone |
| Cluster D (Blue) | 7 | —; Right Now, Bed Of Roses, Tears In Heaven |
| Cluster E (Pink) | 5 | —; Walking on Broken Glass, I Got You Babe, Free Your Mind |
| Cluster F (Orange) | 4 | —; Chattahoochee, Achy Breaky Heart, Seminole Wind |

### Best pass per method per year

| Year | Method A | Method B | Method C |
|------|----------|----------|----------|
| 1967 | k6-merge3 (0.880) | outlier-0.38 (0.798) | seeds-8 (0.889) |
| 1978 | k7-merge3 (0.752) | outlier-0.42-min4 (0.656) | seeds-8 (0.618) |
| 1992 | k6-merge3 (0.882) | outlier-0.42-min4 (0.677) | seeds-6 (0.872) |

### Overall best single run

**1967 / Method C / `seeds-8`** — composite 0.889, anchors 5/5

## Pros & Cons

### Method A (Cultural + k-means)
**Pros:** Fast, stable, good when association vectors are accurate; produces balanced cluster counts.
**Cons:** k-means can split natural piles or merge unlike songs when vectors are sparse; sensitive to k.

### Method B (Outlier Removal)
**Pros:** Mimics human "what doesn't belong?" thinking; cores feel coherent; good for obvious cultural piles.
**Cons:** Order-dependent; leftover assignment can blur edges; fewer tuning params but threshold-sensitive.

### Method C (Farthest-First Seeds)
**Pros:** Interpretable (seed songs visible); seeds stay diverse; strong when era has clear cultural poles.
**Cons:** Seed choice dominates; fringe songs drift to wrong seed; cluster sizes can be uneven.

## Recommendation

**Wire into Set Builder UI:** Method **A** as default, with year-aware cultural vectors.

Rationale (avg best-pass composite across years):
- Method A: 0.838
- Method B: 0.710
- Method C: 0.793

### Practical DJ recommendation

| Year | Best score | Best for scanning | Notes |
|------|------------|-------------------|-------|
| 1967 | C (0.889) | **A k6** (0.880) | C seeds-8 creates singleton clusters (Otis, Buffalo Springfield alone) — bad for pile scanning |
| 1978 | **A k7** (0.752) | **A k7** | B/C miss disco anchor pairs; A separates disco vs soft rock vs arena |
| 1992 | **A k6** (0.882) | **A k6** | Perfect 6/6 anchors; hip-hop, grunge, dance, country, ballads separated |

**Production default:** Method **A**, `k=6`, `mergeMinSize=3`, year-aware cultural vectors for 1967/1978/1992.

**Optional future:** Method C seed titles in tooltip for interpretability; Method B outlier peel as a second pass on Method A clusters.

## Output Files

```
reports/show-builder/clustering-deep-dive/
├── README.md                 (this file)
├── summary.json              (all runs ranked)
├── 1967/
│   ├── method-A/             (JSON per pass)
│   ├── method-B/
│   ├── method-C/
│   ├── debug/                (CSV debug tables)
│   └── best-*.json
├── 1978/ ...
└── 1992/ ...
```

## Debug UI

`/ops/show-builder?clusterCompare=1` — side-by-side Method A/B/C for active year.

## Constraints honored

- No genre labels in UI
- No play counts, playlist history, or VDJ co-occurrence
- No automatic set creation or XML writes
