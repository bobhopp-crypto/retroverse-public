# Set Builder Experiment #4 — Neighborhood Explorer

**Date:** 2026-06-04  
**UI:** Click any song card in Set Builder → Neighborhood panel  
**Debug:** `?neighborsDebug=1` shows Method A / B / C side-by-side

## What shipped

- Click pool or set song → **Neighborhood** panel (Method A top 10)
- Click neighbor → panel recalculates (walk chains)
- **+ Add to Set N** buttons (manual assign only)
- Cluster color dots on neighbors when **AI Clustering** is on
- Legacy dev mode `?neighbors=1` unchanged

Clustering code untouched.

## Example neighborhood chains (Method A, current pools)

### 1967

**Happy Together → Never My Love → …**

```
Happy Together — The Turtles
→ Never My Love — The Association
→ The Rain, The Park & Other Things — The Cowsills
```

**Happy Together** top neighbors: Never My Love · I'm A Believer · The Rain, The Park & Other Things · Creque Alley · Loves Loves To Love Love

**Never My Love** top neighbors: Happy Together · The Rain, The Park & Other Things · Creque Alley · I'm A Believer · Loves Loves To Love Love

**White Rabbit** top neighbors: The Wind Cries Mary · San Francisco · Just Dropped In · See Emily Play · (psych/outlier pile — different cluster colors from sunshine AM chain)

*Note: Daydream Believer and Windy are not in the 1967 MyLists pool; chains stop at songs that exist in the pool.*

### 1978

**Le Freak → YMCA → September**

```
Le Freak — Chic
→ YMCA — Village People
→ September — Earth, Wind & Fire
```

All three reciprocate in Method A (disco floor chain).

### 1992

**Baby Got Back → Rump Shaker → Humpin' Around**

```
Baby Got Back — Sir Mix A Lot
→ Rump Shaker — Wreckx N Effect
→ Humpin' Around — Bobby Brown
```

**Jump Around** (separate chain): Jump Around → Real Love → Cantaloop

## Screenshot

`screenshots/neighborhood-explorer-1967.png` — AI Clustering on, Happy Together selected, walked to Never My Love.

## Files

```
components/ops/show-builder/NeighborhoodExplorerPanel.tsx  (new)
components/ops/show-builder/ShowBuilderWorkspace.tsx
components/ops/show-builder/ShowSongChip.tsx
app/ops/show-builder.css
```
