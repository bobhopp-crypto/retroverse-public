# Sunday Night Status Audit

Generated: 2026-06-21T22:00Z

Sources inspected:
- `RETROVERSE_DATA/ops/intelligence/video-work-queue.json`
- `RETROVERSE_DATA/ops/intelligence/package-index.json`
- `RETROVERSE_DATA/ops/intelligence/packages/*.json`
- `RETROVERSE_PUBLIC/data/ops/intelligence/deck-index.json`
- `RETROVERSE_PUBLIC/reports/intelligence/top-played-backfill-report.json`
- Local route probes against `http://localhost:3000`
- Production route probes against `https://retroverse.live`
- Mobile viewport probe at `390x844`

## Current State

### Package Factory Coverage

Operational universe: VIDEO factory queue.

| Metric | Count | Percent |
|---|---:|---:|
| VIDEO rows | 10,926 | n/a |
| Unique VIDEO RVTRs | 7,548 | 100.0% |
| Complete VIDEO RVTRs | 686 | 9.1% |
| Have package | 1,249 | 16.5% |
| Have cover | 7,538 | 99.9% |
| Have deck | 757 | 10.0% |
| Have song sheet | 1,249 | 16.5% |
| Have mobile viewer/deck route | 757 | 10.0% |

Notes:
- `Song Sheet` has no separate persisted inventory file found. `/rvtr/[rvtr]/song-sheet` loads from package data via `loadSongSheet`, so package count is the operational proxy.
- `Mobile Viewer` has no separate persisted inventory file found. `/rvtr/[rvtr]/deck` loads via `loadPerformanceDeck`, so deck availability is the operational proxy.
- Package store files: 1,308.
- Package index entries: 1,308.
- Deck index entries: 763.
- Package statuses in `package-index.json`: review 913, published 64, cards_ready 200, draft 131.

### Factory Health

Factory process status:
- `npm run video-factory:loop` is running.
- Active process evidence:
  - PID 62878: `npm run video-factory:loop`
  - PID 62890: `npm exec tsx tools/intelligence/video-factory.ts loop`
  - PID 62908: `node ... tsx tools/intelligence/video-factory.ts loop`
  - PID 62909: `node --require ... tools/intelligence/video-factory.ts loop`
- Process start: Sat Jun 20 21:52:54 2026.
- Expected loop log file `reports/intelligence/video-factory-loop.log` was not present.

Recent factory data:
- Queue updated: `2026-06-21T21:59:50.760Z`
- Package index updated: `2026-06-21T21:59:49.198Z`
- Deck index updated: `2026-06-21T16:39:42.453Z`
- Last successful package record found: `RVTR827738` — Blind Faith, `Concert In Hyde Park`
- Last successful package status: `review`
- Last successful package updated: `2026-06-21T21:59:49.197Z`
- Last successful package processed: `2026-06-21T21:59:49.195Z`
- Successful package records updated in last 24 hours: 672.
- Average successful package updates over last 24 hours: 28/hour.

Blockers currently visible in data:

| Blocker | Count | Source |
|---|---:|---|
| Missing identity / unmatched VIDEO rows | 2,911 | `video-work-queue.json` |
| Missing cover | 10 | `video-work-queue.json` |
| Failed package | 0 | package JSON status scan |
| Failed deck / missing deck after package | 492 | `video-work-queue.json` scan |
| Missing metadata in package files | 571 | package JSON scan for missing artist/title/year/cover |

### Sunday Nights Readiness

Readiness derived from current VIDEO queue rows matching the requested labels in title/path/artist.

| Set | Songs | Matched RVTRs | Packages complete | Decks complete | Missing package | Missing deck | Missing cover | Missing thumbnail |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1967 | 3 | 3 | 2 | 2 | 1 | 1 | 0 | 3 |
| 1978 | 1 | 1 | 1 | 1 | 0 | 0 | 0 | 0 |
| 1992 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Live Aid | 2 | 2 | 0 | 0 | 2 | 2 | 0 | 0 |

1967 missing assets:
- `RVTR537082` — The Monkees, `Pleasant Valley Sunday`: missing package, deck, thumbnail.
- `RVTR961588` — Al Martino, `Spanish Eyes`: missing thumbnail.
- `RVTR328447` — Lulu, `Loves Loves To Love Love`: missing thumbnail.

1978 missing assets:
- None in the matched queue subset.

1992 missing assets:
- No queue rows matched the 1992 filter used for this audit.

Live Aid missing assets:
- `RVTR506011` — Live Aid, `The Whistlestop Tour`: missing package, deck.
- `RVTR678938` — Queen, `Live Aid`: missing package, deck.

### Deployment Audit

Local server:
- Active at `http://localhost:3000`.
- Source terminal reports `npm run dev`, Next.js ready.

Local route probe results:

| Route | Local status |
|---|---:|
| `/` | 200 |
| `/live` | 200 |
| `/sunday-nights` | 200 |
| `/rvtr/RVTR069405/song-sheet` | 200 |
| `/rvtr/RVTR069405/deck` | 200 |
| `/track/RVTR069405` | 200 |
| `/ops` | 307 to `/internal/ops-pin?next=%2Fops` |
| `/ops/automation-factory` | 307 to ops PIN |
| `/ops/intelligence/package/RVTR069405` | 307 to ops PIN |

Local API probe results:

| Route | Local status |
|---|---:|
| `/api/sunday-nights/current` | 200 |
| `/api/live-now-playing` | 200 |
| `/api/search/suggestions?q=aretha` | 200 |

Production route probe results:

| Route | Production status |
|---|---:|
| `/` | 402 |
| `/live` | 402 |
| `/sunday-nights` | 402 |
| `/rvtr/RVTR069405/song-sheet` | 402 |
| `/rvtr/RVTR069405/deck` | 402 |
| `/track/RVTR069405` | 402 |
| `/ops` | 402 |
| `/ops/automation-factory` | 402 |
| `/ops/intelligence/package/RVTR069405` | 402 |
| `/api/sunday-nights/current` | 402 |
| `/api/live-now-playing` | 402 |
| `/api/search/suggestions?q=aretha` | 402 |

Production response body for API probes:
- `Payment required DEPLOYMENT_DISABLED ...`

Deployment facts:
- The tested routes exist and respond locally.
- All tested production routes return `402 Payment required DEPLOYMENT_DISABLED`.
- Because production is disabled, this audit cannot distinguish routes missing from production from routes blocked by deployment/account state.
- No local 404s were found in the tested public route set.

### Mobile Audit

Mobile viewport probe:
- Viewport: 390 x 844.
- Routes tested:
  - `/`
  - `/live`
  - `/rvtr/RVTR069405/song-sheet`
  - `/rvtr/RVTR069405/deck`

| Surface | Status | Horizontal overflow | Console errors | Tiny/short touch targets observed |
|---|---:|---|---|---|
| Home page | 200 | no | none | `Send feedback` h=16, `Ops` h=16, `Archive Ops` h=24 |
| Live page | 200 | no | none | `Retroverse` brand link h=14 |
| Song package viewer | 200 | no | none | artist link h=23, `Full song journey` h=18 |
| Deck viewer | 200 | no | none | topbar/back/chip links h=25-38; several below 44px |

Code/CSS facts:
- `app/public-mobile-width.css` contains mobile overflow containment for home/entity/search/year pages.
- `/live` CSS is explicitly mobile-first and uses column actions.
- Song sheet CSS is narrow/mobile-first with max-width 640px and no horizontal overflow in probe.
- Deck viewer intentionally uses horizontal swipe: `.performance-deck__viewport { overflow-x: auto; scroll-snap-type: x mandatory; }`.
- Deck page has no page-level horizontal overflow beyond its intended swipe viewport in the probe.
- Deck chip/link touch targets are below 44px high in several cases.

## What's Working

- Local Next.js dev server is running and serving key pages.
- Sunday Nights current/live APIs return 200 locally.
- Search suggestions API returns 200 locally.
- Package factory loop process is active.
- Package and queue data are updating today.
- Covers are nearly complete for VIDEO RVTRs: 7,538 / 7,548.
- 1978 matched queue subset is complete for package, deck, cover, and thumbnail.
- Local song sheet and deck routes work for a complete sample RVTR: `RVTR069405`.
- Mobile probe found no horizontal overflow on the four requested surfaces.

## What's Broken

- Production is unavailable: every tested `https://retroverse.live` route returned `402 Payment required DEPLOYMENT_DISABLED`.
- Live Aid is not package/deck ready: 0 / 2 packages, 0 / 2 decks.
- 1967 is not fully ready: 1 / 3 missing package, 1 / 3 missing deck, 3 / 3 missing thumbnails.
- 1992 returned no matched rows from the queue filter used in this audit.
- There are 2,911 unmatched VIDEO rows in the factory queue.
- There are 492 missing decks after package availability.
- There are 571 package files missing at least one of artist/title/year/cover metadata.
- Expected factory loop log `reports/intelligence/video-factory-loop.log` was absent, despite loop process activity.
- Mobile touch targets below 44px were observed on home, live, song sheet, and deck viewer.

## What Is Blocking Progress

1. Production deployment/account state: `retroverse.live` returns `402 DEPLOYMENT_DISABLED`.
2. Identity backlog: 2,911 unmatched VIDEO rows.
3. Deck backlog: 492 missing decks after packages exist.
4. Package backlog: 6,300 missing packages in the current VIDEO queue.
5. Metadata gaps: 571 package files missing artist/title/year/cover fields.
6. Live Aid readiness: both matched Live Aid RVTRs lack package and deck.
7. 1967 readiness: one matched 1967 RVTR lacks package/deck; all three matched 1967 rows lack thumbnails.
8. Observability gap: active factory process exists, but the expected loop log file is missing.
9. Mobile accessibility gap: several interactive targets are under 44px high.
10. Top-played report age: `top-played-backfill-report.json` was scanned at `2026-06-17T02:56:21.842Z`, older than the current queue/package files.

## Top 10 Highest Impact Fixes

1. Re-enable production deployment for `https://retroverse.live` so public and API routes stop returning `402 DEPLOYMENT_DISABLED`.
2. Generate packages for Live Aid RVTRs `RVTR506011` and `RVTR678938`.
3. Generate/promote decks for Live Aid RVTRs `RVTR506011` and `RVTR678938`.
4. Resolve 1967 `RVTR537082` package/deck gap.
5. Generate thumbnails for the three matched 1967 rows.
6. Continue package factory against the 6,300 missing-package queue.
7. Continue deck promotion against the 492 missing-deck queue.
8. Resolve identity labels for the 2,911 unmatched VIDEO rows.
9. Add or restore factory loop logging to `reports/intelligence/video-factory-loop.log`.
10. Increase mobile touch target heights for home footer links, live brand link, song sheet text links, and deck chips.

## Recommended Next Step

Re-enable or restore production deployment first. Local readiness is measurable and key local routes work, but `retroverse.live` currently returns `402 DEPLOYMENT_DISABLED` for every tested route and API, which blocks Sunday Nights public visibility regardless of package/deck progress.

After production is reachable, the next data-backed content step is Live Aid: both matched Live Aid RVTRs are missing package and deck.

## Top 100 Most-Played RVTRs Missing Packages

Source: `reports/intelligence/top-played-backfill-report.json`, scanned `2026-06-17T02:56:21.842Z`.

| # | RVTR | Plays | Artist | Title | Cover |
|---:|---|---:|---|---|---|
| 1 | RVTR347287 | 85 | Bob Seger | Night Moves | yes |
| 2 | RVTR102445 | 75 | Chaka Demus & Pliers | Twist and Shout | no |
| 3 | RVTR792762 | 67 | Toto | Africa | yes |
| 4 | RVTR758008 | 67 | Frankie Goes To Hollywood | Relax | no |
| 5 | RVTR478078 | 64 | Talking Heads | Once in a Lifetime | yes |
| 6 | RVTR572817 | 61 | Aerosmith | Sweet Emotion | yes |
| 7 | RVTR239934 | 58 | Soft Cell | Tainted Love | yes |
| 8 | RVTR738810 | 56 | Red Hot Chili Peppers | Love Rollercoaster | no |
| 9 | RVTR514537 | 56 | Thompson Twins | Hold Me Now | yes |
| 10 | RVTR086340 | 53 | Dire Straits | Sultans Of Swing | yes |
| 11 | RVTR245782 | 51 | U2 | I Still Haven't Found What I'm Looking For | yes |
| 12 | RVTR376001 | 51 | Bow Wow Wow | I Want Candy | yes |
| 13 | RVTR833355 | 50 | Nancy Sinatra | These Boots Are Made For Walking | no |
| 14 | RVTR472172 | 49 | Spin Doctors | Two Princes | yes |
| 15 | RVTR435218 | 48 | 4 Non Blondes | What's Up | no |
| 16 | RVTR092496 | 48 | Men At Work | Down Under | yes |
| 17 | RVTR734755 | 47 | Coasters | Down In Mexico | no |
| 18 | RVTR394955 | 46 | Bee Gees | Alone | yes |
| 19 | RVTR889968 | 46 | Steve Earle | Copperhead Road | no |
| 20 | RVTR733448 | 43 | Golden Earring | Twilight Zone | yes |
| 21 | RVTR800065 | 41 | Eddy Grant | Electric Avenue | no |
| 22 | RVTR741425 | 41 | George Harrison | Got My Mind Set On You | yes |
| 23 | RVTR381289 | 41 | Peter Gabriel | Sledgehammer | yes |
| 24 | RVTR842181 | 40 | Golden Earring | Radar Love | yes |
| 25 | RVTR563160 | 40 | Roxette | Joyride | yes |
| 26 | RVTR671133 | 38 | Time | Jungle Love | yes |
| 27 | RVTR386689 | 37 | James | Laid | yes |
| 28 | RVTR097615 | 37 | Fleetwood Mac | Rhiannon | no |
| 29 | RVTR025701 | 37 | Tony Joe White | Polk Salad Annie | yes |
| 30 | RVTR109015 | 36 | Cornershop | Brimful of Asha | no |
| 31 | RVTR930155 | 36 | Blue Oyster Cult | Don't Fear the Reaper | yes |
| 32 | RVTR605797 | 35 | T Spoon | Sex On The Beach | no |
| 33 | RVTR718018 | 35 | Depeche Mode | Personal Jesus | yes |
| 34 | RVTR317808 | 35 | Ini Kamoze | Here Comes The Hotstepper | no |
| 35 | RVTR931823 | 35 | Electric Light Orchestra | Evil Woman | yes |
| 36 | RVTR931242 | 35 | Dexy's Midnight Runners | Come On Eileen | no |
| 37 | RVTR604727 | 35 | Bee Gees | To Love Somebody | yes |
| 38 | RVTR669909 | 33 | Chris Stapleton | Tennessee Whiskey | yes |
| 39 | RVTR283044 | 33 | Guess Who | These Eyes | yes |
| 40 | RVTR793170 | 32 | Sublime | What I Got | yes |
| 41 | RVTR100391 | 32 | A Flock Of Seagulls | Space Age Love Song | yes |
| 42 | RVTR652282 | 32 | Greg Kihn Band | The Breakup Song (They Don't Write 'Em) | yes |
| 43 | RVTR113069 | 31 | Billy Joel | Piano Man | yes |
| 44 | RVTR143275 | 31 | Biz Markie | Just A Friend | yes |
| 45 | RVTR692555 | 30 | Billy Preston | My Sweet Lord | no |
| 46 | RVTR898688 | 30 | Savage Garden | I Want You | yes |
| 47 | RVTR769348 | 30 | Black Crowes | Jealous Again | yes |
| 48 | RVTR990727 | 30 | Dire Straits | Money For Nothing | yes |
| 49 | RVTR606992 | 29 | Sonia Dada | Lover | no |
| 50 | RVTR028968 | 29 | Vulfmon | I Can't Party | no |
| 51 | RVTR417678 | 29 | The Hollies | Long Cool Woman In A Black Dress | yes |
| 52 | RVTR597526 | 28 | Exile | Kiss You All Over | no |
| 53 | RVTR025347 | 28 | The Band | Atlantic City | yes |
| 54 | RVTR413146 | 28 | Romantics | What I Like About You | yes |
| 55 | RVTR062287 | 27 | Stampeders | Sweet City Woman | yes |
| 56 | RVTR600056 | 27 | Elvis vs. JXL | A Little Less Conversation | no |
| 57 | RVTR311683 | 27 | Blanco Brown | The Git Up | no |
| 58 | RVTR239584 | 27 | Peter Gabriel | In Your Eyes | no |
| 59 | RVTR154413 | 27 | Roger Hodgson | Give A Little Bit | no |
| 60 | RVTR704483 | 27 | Cypress Hill | Insane In The Brain | yes |
| 61 | RVTR860336 | 27 | Elvis Presley | Bridge Over Troubled Water | yes |
| 62 | RVTR792858 | 27 | Nick Lowe | Cruel To Be Kind | yes |
| 63 | RVTR422480 | 26 | Ram Jam | Black Betty | yes |
| 64 | RVTR605006 | 26 | Fleetwood Mac | Everywhere | yes |
| 65 | RVTR661272 | 25 | Tom Petty And The Heartbreakers | Mary Jane's Last Dance | yes |
| 66 | RVTR972615 | 25 | Soggy Bottom Boys | I Am A Man Of Constant Sorrow | no |
| 67 | RVTR667448 | 25 | Cher | If I Could Turn Back Time | yes |
| 68 | RVTR770049 | 25 | Elvis Presley | Little Sister | yes |
| 69 | RVTR848446 | 25 | Night Ranger | Sister Christian | yes |
| 70 | RVTR577946 | 25 | Earth, Wind & Fire | September | no |
| 71 | RVTR269180 | 24 | Los Lonely Boys | Heaven | yes |
| 72 | RVTR849979 | 24 | Shaggy | Hope | yes |
| 73 | RVTR094210 | 24 | 311 | All Mixed Up | yes |
| 74 | RVTR252006 | 24 | Rick Astley | Never Gonna Give You Up | yes |
| 75 | RVTR853147 | 24 | Modern English | I Melt With You | yes |
| 76 | RVTR893127 | 24 | Gary Wright | Dream Weaver | yes |
| 77 | RVTR707718 | 24 | Little River Band | Lady 1978 | no |
| 78 | RVTR656396 | 23 | Snow | Informer | yes |
| 79 | RVTR328750 | 23 | Black Crowes | Hard To Handle | yes |
| 80 | RVTR219284 | 23 | Mungo Jerry | In The Summertime | yes |
| 81 | RVTR907843 | 23 | Glass Tiger | Don't Forget Me When I'm Gone | yes |
| 82 | RVTR254309 | 23 | Big Country | In A Big Country | yes |
| 83 | RVTR013681 | 23 | Walker Hayes | Fancy Like | no |
| 84 | RVTR028969 | 22 | Boston | More Than A Feeling | yes |
| 85 | RVTR607356 | 22 | Seals & Crofts | Diamond Girl | no |
| 86 | RVTR935321 | 22 | Linda Ronstadt | It's So Easy | no |
| 87 | RVTR846133 | 22 | Neil Diamond | Sweet Caroline | yes |
| 88 | RVTR281638 | 22 | Nitty Gritty Dirt Band | Fishing In The Dark | no |
| 89 | RVTR129172 | 22 | Rednex | Cotton Eye Joe | yes |
| 90 | RVTR096039 | 22 | Kiss | I Was Made For Lovin' You | yes |
| 91 | RVTR920433 | 21 | EMF | Unbelievable | yes |
| 92 | RVTR003639 | 21 | Orleans | Still The One | yes |
| 93 | RVTR900474 | 21 | Tears For Fears | Shout | yes |
| 94 | RVTR353865 | 21 | Nickelback | How You Remind Me | yes |
| 95 | RVTR442816 | 21 | Midnight Oil | Beds Are Burning | yes |
| 96 | RVTR478043 | 21 | Marshall Tucker Band | Can't You See | no |
| 97 | RVTR316416 | 21 | Whitney Houston | I Wanna Dance With Somebody | yes |
| 98 | RVTR123703 | 20 | Lila McCann | Down Came A Blackbird | yes |
| 99 | RVTR838016 | 20 | Old Crow Medicine Show | Wagon Wheel | no |
| 100 | RVTR540714 | 20 | Elton John | I Guess That's Why They Call It The Blues | yes |
