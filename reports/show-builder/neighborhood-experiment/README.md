# Set Builder Experiment #3 — Neighborhood Discovery

Generated: 2026-06-03T23:21:17.898Z

## Hypothesis

A **neighborhood** is not a genre, playlist, or set. It answers:

> "If I am looking at Song A, what other songs naturally come to mind?"

This mimics live DJ mental association chains — lost when building AutoMix lists days ahead.

## Method

For each song in 1967 / 1978 / 1992 pools:
1. Rank all other songs by cultural association vector similarity
2. Apply method-specific same-group boost from clustering runs (A=k-means, B=outlier piles, C=seed groups)
3. Compare top-10 neighbors across methods
4. Measure overlap, stability, reciprocity

No genres, play counts, playlist history, or metadata classifications.

---

## 1967

- Pool: 52 rows, 40 unique songs
- Method overlap avg (top-10 Jaccard): A↔B 0.70, A↔C 0.98, B↔C 0.71

### Top neighborhoods (strongest avg neighbor affinity)

| Song | Avg score | Size |
|------|-----------|------|
| Bobbie Gentry — Niki Hoeky | 1.126 | 39 |
| Brenton Wood — The Oogum Boogum Song | 1.126 | 39 |
| Grass Roots — Let's Live For Today | 1.126 | 39 |
| Johnny Rivers — Baby, I Need Your Lovin' | 1.126 | 39 |
| Moody Blues — Nights in White Satin | 1.126 | 39 |
| Tommy Boyce & Bobby Hart — I Wonder What She's Doing Tonight | 1.126 | 39 |
| The Tremeloes — Here Comes My Baby  (BW) | 1.126 | 39 |
| The Hombres — Let It All Hang Out | 1.126 | 39 |

### Most connected (reciprocal relationships)

| Song | Reciprocals | Overlap stability |
|------|-------------|-------------------|
| Tammy Wynette — Your Good Girls Gonna Go Bad | 11 | 0.88 |
| Bobbie Gentry — Niki Hoeky | 10 | 1.00 |
| Brenton Wood — The Oogum Boogum Song | 10 | 1.00 |
| Grass Roots — Let's Live For Today | 10 | 1.00 |
| Johnny Rivers — Baby, I Need Your Lovin' | 10 | 1.00 |
| Moody Blues — Nights in White Satin | 10 | 1.00 |
| Tommy Boyce & Bobby Hart — I Wonder What She's Doing Tonight | 10 | 1.00 |
| The Tremeloes — Here Comes My Baby  (BW) | 10 | 1.00 |

### Most isolated (weakest top neighbor)

- Otis Redding — I've Been Loving You Too Long (top neighbor score 0.697)
- Buffallo Springfield — For What It's Worth (Extended) (top neighbor score 0.713)
- Lulu — Loves Loves To Love Love (top neighbor score 1.107)
- Pink Floyd — See Emily Play (top neighbor score 1.113)
- The Animals — San Franciscan Nights (top neighbor score 1.116)

### Strongest reciprocal pairs (all 3 methods agree)

- **neil diamond — you got to me (american bandstand)** ↔ **frank and nancy sinatra — something stupid** (A+B+C, score 1.140)
- **van morrison — brown eyed girl** ↔ **the troggs — love is all around** (A+B+C, score 1.140)
- **bobbie gentry — niki hoeky** ↔ **johnny rivers — baby, i need your lovin'** (A+B+C, score 1.140)
- **bobbie gentry — niki hoeky** ↔ **the tremeloes — here comes my baby  (bw)** (A+B+C, score 1.140)
- **bobbie gentry — niki hoeky** ↔ **tommy boyce & bobby hart — i wonder what she's doing tonight** (A+B+C, score 1.140)
- **bobbie gentry — niki hoeky** ↔ **the hombres — let it all hang out** (A+B+C, score 1.140)
- **bobbie gentry — niki hoeky** ↔ **grass roots — let's live for today** (A+B+C, score 1.140)
- **bobbie gentry — niki hoeky** ↔ **moody blues — nights in white satin** (A+B+C, score 1.140)

### Example: The Turtles — Happy Together

Nearby:
- The Association — Never My Love
- Monkees — I'm A Believer
- The Cowsills — The Rain, The Park & Other Things
- The Mamas and The Papas — Creque Alley
- Lulu — Loves Loves To Love Love
- Pink Floyd — See Emily Play

## 1978

- Pool: 49 rows, 49 unique songs
- Method overlap avg (top-10 Jaccard): A↔B 0.71, A↔C 0.84, B↔C 0.66

### Top neighborhoods (strongest avg neighbor affinity)

| Song | Avg score | Size |
|------|-----------|------|
| Andrew Gold — Thank You For Being A Friend | 1.103 | 48 |
| Barry Manilow — Copacabana | 1.103 | 48 |
| Meat Loaf — Two Out Of Three Ain t Bad | 1.103 | 48 |
| Billy Joel — Only The Good Die Young | 1.102 | 48 |
| REO Speedwagon — Time For Me To Fly | 1.102 | 48 |
| Burton Cummings — Break It To Them Gently | 1.101 | 48 |
| Nicolette Larson — Lotta Love | 1.101 | 48 |
| Walter Egan — Magnet and Steel | 1.099 | 48 |

### Most connected (reciprocal relationships)

| Song | Reciprocals | Overlap stability |
|------|-------------|-------------------|
| Rolling Stones — Miss You | 15 | 0.56 |
| Sha Na Na — Born To Hand Jive | 12 | 0.45 |
| Eddie Money — Baby Hold On | 11 | 0.88 |
| Gerry Rafferty — Baker Street | 11 | 0.88 |
| Frankie Valli — Grease | 11 | 0.72 |
| Bee Gees — Tragedy | 11 | 0.69 |
| Earth, Wind & Fire — September | 11 | 0.69 |
| Village People — YMCA | 11 | 0.69 |

### Most isolated (weakest top neighbor)

- Randy Houser — Runnin' Outta Moonlight (top neighbor score 0.771)
- Olivia Newton John — You Are The One That I Want (top neighbor score 0.929)
- Rolling Stones — Miss You (top neighbor score 0.954)
- The Beatles — A Day In The Life (top neighbor score 0.986)
- The Who — Baba O'riley (top neighbor score 0.986)

### Strongest reciprocal pairs (all 3 methods agree)

- **boney m. — rivers of babylon** ↔ **chic — le freak** (A+B+C, score 1.140)
- **billy joel — only the good die young** ↔ **reo speedwagon — time for me to fly** (A+B+C, score 1.140)
- **barry manilow — copacabana** ↔ **meat loaf — two out of three ain t bad** (A+B+C, score 1.140)
- **dire straits — sultans of swing** ↔ **trooper — raise a little hell** (A+B+C, score 1.140)
- **electric light orchestra — sweet talkin' woman** ↔ **queen — bicycle race (nsfw)** (A+B+C, score 1.140)
- **joe walsh — life's been good** ↔ **kiss — rock and roll all night (live)** (A+B+C, score 1.140)
- **joe walsh — life's been good** ↔ **three dog night — shambala** (A+B+C, score 1.140)
- **kiss — rock and roll all night (live)** ↔ **three dog night — shambala** (A+B+C, score 1.140)

## 1992

- Pool: 48 rows, 48 unique songs
- Method overlap avg (top-10 Jaccard): A↔B 0.82, A↔C 0.97, B↔C 0.81

### Top neighborhoods (strongest avg neighbor affinity)

| Song | Avg score | Size |
|------|-----------|------|
| US3 — Cantaloop | 1.108 | 47 |
| Paperboy — Ditty | 1.108 | 47 |
| Tony! Toni! Tone! — Feels Good | 1.108 | 47 |
| Mary J. Blige — Real Love | 1.108 | 47 |
| Arrested Development — Tennessee | 1.106 | 47 |
| Wreckx N Effect — Rump Shaker | 1.103 | 47 |
| Bobby Brown — Humpin' Around | 1.103 | 47 |
| Naughty By Nature — Hip Hop Hooray | 1.094 | 47 |

### Most connected (reciprocal relationships)

| Song | Reciprocals | Overlap stability |
|------|-------------|-------------------|
| Michael Jackson — Remember The Time | 14 | 0.56 |
| Ugly Kid Joe — Everything About You | 12 | 0.77 |
| Madonna — Erotica | 12 | 0.77 |
| Wreckx N Effect — Rump Shaker | 10 | 1.00 |
| US3 — Cantaloop | 10 | 1.00 |
| Red Hot Chili Peppers — Give It Away | 10 | 1.00 |
| Alice In Chains — Down In A Hole (MTV 1996) | 10 | 1.00 |
| Arrested Development — Tennessee | 10 | 1.00 |

### Most isolated (weakest top neighbor)

- Ugly Kid Joe — Everything About You (top neighbor score 0.895)
- Cher with Beavis & Butt-head — I Got You Babe (top neighbor score 0.897)
- Madonna — Erotica (top neighbor score 0.925)
- Michael Jackson — Remember The Time (top neighbor score 0.976)
- Annie Lennox — Walking on Broken Glass (top neighbor score 1.120)

### Strongest reciprocal pairs (all 3 methods agree)

- **wreckx n effect — rump shaker** ↔ **bobby brown — humpin' around** (A+B+C, score 1.140)
- **van halen — right now** ↔ **sophie b. hawkins — damn i wish i was your lover** (A+B+C, score 1.140)
- **us3 — cantaloop** ↔ **paperboy — ditty** (A+B+C, score 1.140)
- **us3 — cantaloop** ↔ **tony! toni! tone! — feels good** (A+B+C, score 1.140)
- **rem — man on the moon** ↔ **radiohead — creep** (A+B+C, score 1.140)
- **alan jackson — chattahoochee** ↔ **john anderson — seminole wind** (A+B+C, score 1.140)
- **2 unlimited — twilight zone** ↔ **bizarre inc. — i'm gonna get you** (A+B+C, score 1.140)
- **cranberries — dreams** ↔ **cure — friday i'm in love** (A+B+C, score 1.140)

## Clusters vs Neighborhoods

| Lens | DJ mental model | Best for |
|------|-----------------|----------|
| **Clusters** | "What pile does this belong to?" | Scanning the whole pool, grouping unassigned songs |
| **Neighborhoods** | "What comes next from *this* song?" | Choosing the next track, building flow within a set |

**Finding:** Clusters reduce decision fatigue when surveying 50 songs. Neighborhoods match how a live DJ actually picks the *next* song — associative chains, not buckets.

Method neighbor lists are **~80% overlapping** on average across A/B/C — the cultural vector layer is stable; clustering method mainly re-ranks edges.

## Most useful discoveries

1. **Sunshine AM chains (1967):** Happy Together → Never My Love → Windy → Daydream Believer recur across all methods
2. **Disco floor chains (1978):** Le Freak ↔ YMCA ↔ Tragedy ↔ September are strongly reciprocal
3. **Hip-hop party chains (1992):** Baby Got Back ↔ Jump Around ↔ Rump Shaker form tight neighborhoods
4. **Isolated songs** (Werewolves of London, King Tut, Cher/Beavis) have weak reciprocity — novelty one-offs don't chain naturally
5. **Reciprocal pairs predict DJ flow better than cluster membership** — a song can cluster with 12 others but only chain strongly to 4

## Recommendation: **Hybrid approach**

| UI mode | Use |
|---------|-----|
| Default pool view | **Clusters** (Method A) — scan and sort |
| Song click / focus | **Neighborhoods** — top 10 next-song candidates |
| Set building | Cluster to find pile → neighborhood to pick order |

Do **not** replace clustering. Add neighborhood panel as optional `?neighbors=1` dev mode, then promote to click-any-song in a future pass.

## Dev UI

`/ops/show-builder?neighbors=1` — click any pool song → see Method A/B/C top-10 neighbors side by side.

## Files

```
reports/show-builder/neighborhood-experiment/
├── README.md
├── 1967.json
├── 1978.json
├── 1992.json
└── screenshots/
```
