# Midnight Special Structured Pipeline — Validation Report

**Generated:** 2026-06-09T01:09:51.483Z  
**Sample:** 10 stratified episodes (seed 42) across years 1972, 1973, 1974, 1975, 1976  
**Note:** Downloaded collection spans **1972, 1973, 1974, 1975, 1976** only (no 1977–1981 episodes in archive).  
**Full scan:** 161 downloaded episodes

## Sample episode results

| Year | Episode ID | Chapters | Performances | Exact | High | Low | Failed parses | Automation |
|------|------------|----------|--------------|-------|------|-----|---------------|------------|
| 1972 | `itkwPhZFAHQ` | 17 | 16 | 0 | 15 | 1 | 1 | 93.8% |
| 1973 | `_Lf8SILaKwM` | 20 | 19 | 19 | 0 | 0 | 0 | 100% |
| 1973 | `rR_XNR6QwMg` | 16 | 15 | 14 | 0 | 1 | 1 | 93.3% |
| 1973 | `o96gG_6uMbY` | 18 | 17 | 17 | 0 | 0 | 0 | 100% |
| 1974 | `yxgut9pmopU` | 15 | 14 | 14 | 0 | 0 | 0 | 100% |
| 1974 | `CYCFyuswC4U` | 19 | 18 | 18 | 0 | 0 | 0 | 100% |
| 1975 | `hMuMmGP3bOg` | 18 | 16 | 16 | 0 | 0 | 0 | 100% |
| 1975 | `37X-9CB0PRc` | 19 | 18 | 18 | 0 | 0 | 0 | 100% |
| 1976 | `19OCl5KTUQ0` | 19 | 18 | 17 | 0 | 1 | 1 | 94.4% |
| 1976 | `aHZq4yAMOnQ` | 17 | 16 | 15 | 0 | 1 | 1 | 93.8% |

### Sample aggregates

| Metric | Value |
|--------|------:|
| Episodes | 10 |
| Total performances | 167 |
| Avg performances / episode | 16.7 |
| **Automation (exact + high)** | **97.6%** |
| Exact-only rate | 88.6% |
| Failed parses | 4 |

## Full collection scan (161 episodes)

| Metric | Value |
|--------|------:|
| Episodes with chapters | 149 |
| Episodes missing chapters | 12 |
| Parse errors | 0 |
| Total performances detected | 2471 |
| **Avg performances / episode** | **16.6** |
| **Automation (exact + high)** | **90.6%** |
| Exact-only rate | 82.4% |
| Failed parses (total) | 232 |

## Projections (161 episodes)

| Metric | Estimate |
|--------|----------|
| **Total performances** | **~2673** |
| Auto-eligible (exact + high) | ~2422 |
| Manual review required | ~252 |
| Structured review time | ~22.7 hours |
| Fully manual baseline (8 min/perf) | ~356.4 hours |
| **Hours saved** | **~333.7 hours** |

### Review workload assumptions

- Auto-eligible: 0.25 min/performance (bulk accept + spot check)
- Manual: 3 min/performance (preview + adjust)
- Manual baseline: 8 min/performance (watch + mark in/out + export)

## Accept All Exact Matches workflow (automation 90.6% > 85%)

**Trigger:** Episode review opens with exact-match banner.

**Flow:**
1. Parser generates candidates (`ms-structured-pipeline.ts` or API).
2. Review UI shows summary: *N exact · M need review*.
3. **Accept All Exact** button → bulk-sets `review_status: accepted` for `confidence === "exact"`.
4. Non-exact rows stay `pending` for Preview / Adjust / Reject.
5. Optional: **Export All Accepted** queues ffmpeg trims for exact batch only.

**Exact-only coverage:** 82.4% of performances are exact — safe for one-click approve without listening.

**Guardrails:**
- Skip if `chapters_aligned === false`
- Skip if `failed_parses > 0` on episode
- Log accepted IDs to `RETROVERSE_DATA/.../review-log/{episode}.json`

## Batch processing — not yet (collection 90.6% ≤ 95%)

Full-collection automation is above the **Accept All Exact** threshold but below full batch auto-export.

**Recommended path:**
1. Ship **Accept All Exact** + manual queue for high/medium/low.
2. Re-extract chapters for 12 episodes missing yt-dlp markers (`--write-info-json` refresh).
3. Add comedy/tribute skip rules + quoted-title parser (`Artist "Song"`) to recover ~9% failed parses.
4. Re-validate; batch export when collection automation exceeds 95%.

**Partial batch today:** Auto-export **exact-only** performances (82.4%) without listening — ~2203 clips with minimal review.


## Failure analysis

### Episodes missing yt-dlp chapters (12)

- `mkdRLtfMCeE` — Baby, I Love Your Way - Peter Frampton | The Midnight Special
- `kj9XLS1fYkI` — Ep 139 - The Midnight Special Episode |  October 10, 1975
- `4ibphiUxVwY` — Ep 148 - The Midnight Special Episode |  December 12, 1975
- `JxHfm8IaJ9U` — Ep 159 - The Midnight Special Episode | February 27, 1976
- `xkbuWLrQKq0` — Ep 170 - The Midnight Special Episode | May 22, 1976
- `5WYp4ChvszM` — Ep 172 - The Midnight Special Episode | June 4, 1976
- `gTwZ4OOEsso` — Ep 3 - The Midnight Special | February 16, 1973
- `O2tP0tXSJhc` — Ep 32 - The Midnight Special Episode | September 7, 1973
- `M3oqb-fe2Qo` — Ep 4 - The Midnight Special | February 23, 1973
- `19z9JSaTm8c` — Ep 78 - The Midnight Special | July 16, 1974
- `jHJ-h2AezjA` — Ep 79 - The Midnight Special | August 2, 1974
- `O1EK6aRkqOw` — Ep 84 - The Midnight Special | September 6, 1974

### Top failed chapter titles (no `Artist - Song` parse)

| Chapter title | Occurrences |
|---------------|------------:|
| Billy Braver [Comedy Segment] | 4 |
| David Steinberg | 4 |
| Al Green [Prologue] | 3 |
| Leon Russell Tribute | 2 |
| Leave Me Alone (Ruby Red Dress) | 2 |
| I Don't Know How To Love Him | 2 |
| Delta Dawn | 2 |
| Jimmie Walker [Comedy Segment] | 2 |
| Freddie Prinze [Comedy Segment] | 2 |
| The Committee [Sketch Comedy Segment] | 2 |
| Elton John Tribute | 2 |
| Steve Martin | 2 |
| The Ace Trucking Company | 2 |
| Kentucky Fried Theater | 2 |
| The Committee Comedy | 2 |
| Helen Reddy "I Am Woman" | 1 |
| Ike and Tina Turner "I Can't Turn You Loose" | 1 |
| George Carlin "Welcome to My Job", "Occupation: Foole", "White Harlem" | 1 |
| Curtis Mayfield "Superfly" | 1 |
| Don McLean "Dreidel" | 1 |

Most failures are **comedy segments**, **tributes**, or **song-only** titles. These are skippable non-music chapters or need a secondary parser.

## Sample episode titles

- **1972** — The Midnight Special Pilot - August 19, 1972 (`itkwPhZFAHQ`)
- **1973** — Ep 28 - The Midnight Special | August 10, 1973 (`_Lf8SILaKwM`)
- **1973** — Ep 12 - The Midnight Special | April 20, 1973 (`rR_XNR6QwMg`)
- **1973** — Ep 22 - The Midnight Special | June 29, 1973 (`o96gG_6uMbY`)
- **1974** — Ep 71 - The Midnight Special | June 7, 1974 (`yxgut9pmopU`)
- **1974** — Ep 80 - The Midnight Special | August 9, 1974 (`CYCFyuswC4U`)
- **1975** — Ep 101 - The Midnight Special | January 3, 1975 (`hMuMmGP3bOg`)
- **1975** — Ep 103 - The Midnight Special Episode | January 17, 1975 (`37X-9CB0PRc`)
- **1976** — Ep 153 - The Midnight Special Episode |  January 16, 1976 (`19OCl5KTUQ0`)
- **1976** — Ep 163 - The Midnight Special | April 2, 1976 (`aHZq4yAMOnQ`)
