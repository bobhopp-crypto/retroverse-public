# VIDEO Linkage Reality Check

Generated: 2026-06-17T02:51:20.473Z
VDJ source: `/Users/bobhopp/Library/Application Support/VirtualDJ/database.xml`
VIDEO files scanned: 10,878

## Verdict

**B — Counting/query problem.** The 206-style direct-link metric undercounts Retroverse-identifiable videos.

Prior dashboard metric **Videos with RVTR** counted **direct `media_track_links` path matches only** (plus a 300-song title/artist cap). This audit evaluates **all Retroverse identification paths**.

## Identification Buckets (VIDEO files)

| Category | Count | % of VIDEO |
| --- | ---: | ---: |
| Direct RVTR Link (`media_track_links`) | 3,823 | 35% |
| Has `media_track_links` (any) | 3,829 | 35% |
| Path Match (`media_assets`) | 8,633 | 79% |
| Cover Match | 4,106 | 38% |
| Title/Artist Match | 7,832 | 72% |
| **Total Identifiable Videos** | **9,282** | **85%** |

## Pipeline Readiness

| Stage | Count |
| --- | ---: |
| Research-ready (VDJ artist + title) | 10,852 |
| Package-ready (identifiable or cover) | 4,106 |
| Unique RVTRs resolved | 7,548 |
| Legacy linked-only metric | 3,823 |

## Top 100 Most-Played VIDEO Tracks

| Metric | Count | % of top 100 |
| --- | ---: | ---: |
| Direct RVTR | 54 | 54% |
| Identifiable (any path) | 100 | 100% |
| Cover | 56 | 56% |
| Research-ready | 100 | 100% |
| Package-ready | 56 | 56% |

## Top 25 by Play Count

| Plays | Title | Artist | RVTR | Methods | Priority |
| ---: | --- | --- | --- | --- | ---: |
| 90 | How Do You Do? | Mouth & MacNeal | — | path | 9,200 |
| 85 | Night Moves | Bob Seger | RVTR347287 | RVTR+path+title+cover | 8,850 |
| 83 | You Can Call Me Al | Paul Simon | RVTR285085 | RVTR+path+title+cover | 8,650 |
| 75 | Twist and Shout | Chaka Demus & Pliers | RVTR102445 | path+title | 7,700 |
| 74 | In The Air Tonight (Live) | Phil Collins | — | path | 7,600 |
| 67 | Africa | Toto | RVTR792762 | RVTR+path+title+cover | 7,050 |
| 67 | Relax | Frankie Goes To Hollywood | RVTR758008 | RVTR+path+title | 6,900 |
| 64 | Once in a Lifetime | Talking Heads | RVTR478078 | RVTR+path+title+cover | 6,750 |
| 61 | Sweet Emotion | Aerosmith | RVTR572817 | RVTR+path+title+cover | 6,450 |
| 58 | Tainted Love | Soft Cell | RVTR239934 | RVTR+path+title+cover | 6,150 |
| 56 | Love Rollercoaster | Red Hot Chili Peppers | RVTR738810 | path+title | 5,800 |
| 56 | Hold Me Now | Thompson Twins | RVTR514537 | RVTR+path+title+cover | 5,950 |
| 53 | Afternoon Delight (Anchorman) | Will Ferrell & The Channel 4 News Team | — | path | 5,500 |
| 53 | Sultans Of Swing | Dire Straits | RVTR086340 | RVTR+path+title+cover | 6,150 |
| 51 | I Still Haven't Found What I'm Looking For | U2 | RVTR245782 | RVTR+path+title+cover | 5,450 |
| 51 | I Want Candy | Bow Wow Wow | RVTR376001 | RVTR+path+title+cover | 5,450 |
| 50 | These Boots Are Made For Walking | Nancy Sinatra | RVTR833355 | path+title | 5,200 |
| 49 | Two Princes | Spin Doctors | RVTR472172 | RVTR+path+title+cover | 5,250 |
| 48 | What's Up | 4 Non Blondes | RVTR435218 | RVTR+path+title | 5,000 |
| 48 | Down Under | Men At Work | RVTR092496 | RVTR+path+title+cover | 5,150 |
| 47 | Down In Mexico | Coasters | RVTR734755 | path+title | 4,900 |
| 46 | Alone | Bee Gees | RVTR394955 | RVTR+path+title+cover | 4,950 |
| 46 | Copperhead Road | Steve Earle | RVTR889968 | path+title | 4,800 |
| 43 | Twilight Zone | Golden Earring | RVTR733448 | RVTR+path+title+cover | 4,650 |
| 41 | Electric Avenue | Eddy Grant | RVTR800065 | RVTR+path+title | 4,300 |

## Intelligence Rule

Research does **not** require RVTR. Any VIDEO with VDJ **Artist + Title** may enter:

```text
VIDEO → Artist → Title → Research → Candidate Package
```

RVTR remains preferred for canon. VDJ metadata is captured first (VDJ-first).

## Recommendation

1. Use **Total Identifiable** as the planning number, not direct-link only
2. Sort all queues by **Priority Score** (play count + Sunday Nights + workspace + cover)
3. Expand `media_track_links` for high-priority unlinked paths still in `media_assets`

