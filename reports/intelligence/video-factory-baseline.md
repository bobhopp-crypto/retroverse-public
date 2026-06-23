# VIDEO Factory Baseline

Generated: 2026-06-20 21:48 local

Authority: `/Users/bobhopp/RETROVERSE_DATA/ops/intelligence/video-work-queue.json`

Queue updated: `2026-06-21T02:20:02.089Z`

## 1. Current Counts

| Metric | Count |
| --- | ---: |
| Total VIDEO RVTRs | 7,548 |
| Matched VIDEO RVTRs | 7,548 |
| Unmatched VIDEO rows | 2,911 |
| Complete | 240 |
| Missing Package | 6,970 |
| Missing Deck | 306 |
| Missing Cover | 10 |
| Missing Thumbnail | 635 |

Notes:

- `Matched` is counted at RVTR level from queue items.
- `Unmatched` is counted at VIDEO row level from `queue.counts.unmatchedVideoRows`.
- `videoRows` in the queue is `10,926`.

## 2. Worker Throughput

Window: last 24 hours of observed VIDEO factory worker runs.

| Worker | Count | Average / Hour | Peak / Hour |
| --- | ---: | ---: | ---: |
| Packages generated or materialized | 1 | 0.04 | 1 |
| Decks promoted | 1 | 0.04 | 1 |
| Covers recovered | 0 | 0.00 | 0 |
| Thumbnails generated | 0 | 0.00 | 0 |

Notes:

- Package count is based on queue delta: Missing Package `6,971 -> 6,970`.
- Deck count is based on queue-driven deck worker result: Missing Deck `307 -> 306`.
- Cover worker attempted 10 and recovered 0.
- Thumbnail worker is not implemented; generated count is 0.
- There is no persistent factory runtime/activity ledger yet, so this section uses completed factory worker runs visible from the current run history, not Browser+ or legacy dashboard reports.

## 3. Backlog Forecast

At current observed throughput:

| Backlog | Remaining | Current Rate | Forecast |
| --- | ---: | ---: | --- |
| Packages | 6,970 | 1/day | 6,970 days |
| Decks | 306 | 1/day | 306 days |
| Covers | 10 | 0/day | Not clearable at current throughput |
| Thumbnails | 635 | 0/day | Not clearable until thumbnail worker exists |
| All VIDEO RVTRs | n/a | mixed | Not forecastable until cover and thumbnail throughput are non-zero |

## 4. Deck Analysis

Rule tested: for every queue row with `state.package=true`, call `loadPerformanceDeck(rvtr)`.

| Metric | Count |
| --- | ---: |
| Package RVTRs | 578 |
| Can render deck today | 272 |
| Fail to render deck | 306 |

Top failure reasons:

| Reason | Count |
| --- | ---: |
| `loadPerformanceDeck returned null` | 306 |

Example failures:

| RVTR | Artist | Title | Reason |
| --- | --- | --- | --- |
| RVTR747496 | Chubby Checker & California Jubilee | Let's Twist Again | loadPerformanceDeck returned null |
| RVTR499866 | 10cc | I'm Not In Love | loadPerformanceDeck returned null |
| RVTR321677 | 70's Disco | Various Mix | loadPerformanceDeck returned null |
| RVTR100391 | A Flock Of Seagulls | Space Age Love Song | loadPerformanceDeck returned null |
| RVTR227410 | ABBA | Chiquitita | loadPerformanceDeck returned null |
| RVTR744809 | ABBA | I Do, I Do, I Do, I Do, I Do | loadPerformanceDeck returned null |
| RVTR016328 | ABBA | Mamma Mia | loadPerformanceDeck returned null |
| RVTR165042 | ABBA | S.O.S. | loadPerformanceDeck returned null |
| RVTR651238 | AC/DC | Its a Long Way to the Top | loadPerformanceDeck returned null |
| RVTR557094 | Ace | How Long | loadPerformanceDeck returned null |

## 5. Thumbnail Analysis

Exact VIDEO RVTRs missing thumbnails: `635`

Root cause grouping from queue `videoFiles` and current sidecar checks:

| Root Cause | Count |
| --- | ---: |
| missing sidecar | 437 |
| missing source image | 0 |
| path mismatch | 11 |
| other | 187 |

Notes:

- `missing sidecar`: source video path exists, no expected `.jpg/.jpeg/.png` sidecar candidate exists.
- `path mismatch`: no listed source video file exists at the queue path.
- `other`: at least one expected sidecar exists, but the RVTR remains `state.thumbnail=false`; likely mixed multi-file RVTR state or sidecar mismatch not represented in the queue schema.
- `missing source image` is 0 because the current queue does not track a separate source-image concept.

## 6. Cover Analysis

Remaining `cover=false` RVTRs: `10`

| RVTR | Artist | Title | Current Recovery Status | Last Failure / Review Reason |
| --- | --- | --- | --- | --- |
| RVTR747496 | Chubby Checker & California Jubilee | Let's Twist Again | failed | no_cover_found |
| RVTR749029 | Chubby Checkers | Let's Twist Again | review_needed | pending_review · iTunes Track Artwork |
| RVTR187192 | Glenn Campbell | Wichita Lineman | review_needed | pending_review · iTunes Track Artwork |
| RVTR660602 | Johnny Rivers | Memphis Tennesee | review_needed | pending_review · iTunes Track Artwork |
| RVTR400515 | Justified And Ancient [All Bound For Mu Mu Land] | The KLF | review_needed | pending_review · iTunes Track Artwork |
| RVTR912228 | Kiss | Rock And Roll All Nite | review_needed | pending_review · iTunes Track Artwork |
| RVTR255602 | Mamas and The Papas | California Dreamin | review_needed | pending_review · iTunes Track Artwork |
| RVTR061219 | Stray Cat Strut | Stray Cats | review_needed | pending_review · iTunes Track Artwork |
| RVTR733940 | The Music Explosion | Little Bit O Soul | review_needed | pending_review · iTunes Artwork |
| RVTR563309 | Todd Rundgren | Hello Its Me | review_needed | pending_review · iTunes Track Artwork |

## 7. Package Analysis

Top 50 most-played VIDEO RVTRs still missing packages:

The current authoritative queue does not contain `playCount`, so true most-played ordering cannot be computed from `video-work-queue.json` alone. The list below is the first 50 queue-authoritative missing-package RVTRs in current queue order, with play count marked unavailable.

| # | RVTR | Artist | Title | Play Count |
| ---: | --- | --- | --- | --- |
| 1 | RVTR187192 | Glenn Campbell | Wichita Lineman | unavailable in queue |
| 2 | RVTR660602 | Johnny Rivers | Memphis Tennesee | unavailable in queue |
| 3 | RVTR400515 | Justified And Ancient [All Bound For Mu Mu Land] | The KLF | unavailable in queue |
| 4 | RVTR912228 | Kiss | Rock And Roll All Nite | unavailable in queue |
| 5 | RVTR255602 | Mamas and The Papas | California Dreamin | unavailable in queue |
| 6 | RVTR061219 | Stray Cat Strut | Stray Cats | unavailable in queue |
| 7 | RVTR733940 | The Music Explosion | Little Bit O Soul | unavailable in queue |
| 8 | RVTR563309 | Todd Rundgren | Hello Its Me | unavailable in queue |
| 9 | RVTR069405 | 10,000 Maniacs | Like the Weather | unavailable in queue |
| 10 | RVTR973394 | 10,000 Maniacs | These Are The Days | unavailable in queue |
| 11 | RVTR588073 | 10,000 Maniacs | Trouble Me | unavailable in queue |
| 12 | RVTR358909 | 112 | Dance With Me | unavailable in queue |
| 13 | RVTR917359 | 2 Live Crew | Me So Horny | unavailable in queue |
| 14 | RVTR608023 | 2 Live Crew | Move Somethin | unavailable in queue |
| 15 | RVTR588175 | 2 Unlimited | Get Ready For This | unavailable in queue |
| 16 | RVTR863630 | 2 Unlimited | Tribal Dance | unavailable in queue |
| 17 | RVTR320281 | 20 Fingers | Short Dick Man | unavailable in queue |
| 18 | RVTR696966 | 21 Pilots | Heathens | unavailable in queue |
| 19 | RVTR299289 | 21 Savage & Metro Boomin | No Heart | unavailable in queue |
| 20 | RVTR860501 | 2Pac feat. Talent | Changes | unavailable in queue |
| 21 | RVTR195978 | 3 Doors Down | Here Without You | unavailable in queue |
| 22 | RVTR763508 | 3 Doors Down | Kryptonite | unavailable in queue |
| 23 | RVTR305267 | 311 | Amber | unavailable in queue |
| 24 | RVTR521876 | 311 | Down | unavailable in queue |
| 25 | RVTR809033 | 311 | Love Song | unavailable in queue |
| 26 | RVTR538877 | 38 Special | Back Where You Belong | unavailable in queue |
| 27 | RVTR791353 | 38 Special | Caught Up In You | unavailable in queue |
| 28 | RVTR140412 | 38 Special | Hold On Loosely | unavailable in queue |
| 29 | RVTR886362 | 3OH!3 | Double Vision | unavailable in queue |
| 30 | RVTR091014 | 3OH!3 | Touchin' On My | unavailable in queue |
| 31 | RVTR195188 | 3OH!3 f./Ke$ha | My First Kiss | unavailable in queue |
| 32 | RVTR660809 | 3rd Bass | Pop Goes The Weasel | unavailable in queue |
| 33 | RVTR455389 | 3rd Bass | Problem Child | unavailable in queue |
| 34 | RVTR903477 | 3rd Bass | Product Of The Environment | unavailable in queue |
| 35 | RVTR248826 | 3rd Bass | The Gas Face | unavailable in queue |
| 36 | RVTR023516 | 3rd Bass | Triple Stage Darkness | unavailable in queue |
| 37 | RVTR435218 | 4 Non Blondes | What's Up | unavailable in queue |
| 38 | RVTR690653 | 5 Seconds Of Summer | Amnesia | unavailable in queue |
| 39 | RVTR774840 | 5 Seconds Of Summer | Easier | unavailable in queue |
| 40 | RVTR441860 | 50 Cent | Candy Shop | unavailable in queue |
| 41 | RVTR161636 | 50 Cent | In Da Club | unavailable in queue |
| 42 | RVTR582041 | 50 Cent | Just A Lil Bit | unavailable in queue |
| 43 | RVTR192585 | 50 Cent f./Ne-Yo | Baby By Me | unavailable in queue |
| 44 | RVTR792432 | 69 Boyz | Tootsie Roll | unavailable in queue |
| 45 | RVTR069519 | 702 | Where My Girls At | unavailable in queue |
| 46 | RVTR104244 | 98 Degrees | Because Of You | unavailable in queue |
| 47 | RVTR933932 | 98 Degrees | I Do | unavailable in queue |
| 48 | RVTR127900 | A Flock Of Seagulls | I Ran | unavailable in queue |
| 49 | RVTR617604 | A Goofy Movie | Eye to Eye | unavailable in queue |
| 50 | RVTR753403 | A Perfect Circle | The Outsider | unavailable in queue |

## 8. Automation Reality Check

Is `video-factory:loop` currently running?

No.

Why:

- Process check found no running `video-factory:loop` command.
- The only match from `ps` was the search command itself.
- Current terminal records show:
  - `npm run dev` is running.
  - previous `video-factory:run-once` commands completed successfully.
  - no active `video-factory:loop` terminal is present.

Loop status:

| Field | Value |
| --- | --- |
| pid | none |
| started | none |
| current worker | none |
| current RVTR | none |
| last completed RVTR | not available from active loop; last observed package worker was `RVTR749029` |
