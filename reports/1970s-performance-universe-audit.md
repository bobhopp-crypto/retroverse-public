# 1970s Performance Universe Audit

**Date:** 2026-06-15  
**Source:** VirtualDJ `VIDEO/1970's` folder (Postgres `media_assets` + VDJ `database.xml` PlayCount)  
**Grain:** One row per **matched** video file (graph link present)  
**Method:** `tools/run-1970s-performance-universe-audit.ts`

---

## Executive summary

| Metric | Value |
|--------|------:|
| Matched videos in 1970's folder | 581 |
| Distinct RVTR identities | 549 |
| Play count known (VDJ) | 406 (70%) |
| RVTR resolved on graph link | 579 |
| Average exhibit completeness | 65% |
| High completeness (≥75%) | 309 |
| Low completeness (<40%) | 79 |
| Movie linkage (proxy) | 0 |
| TV linkage (proxy) | 0 |

**Queue thesis:** Rank by **DJ rotation (PlayCount) × enrichment gap** — prioritize tracks you actually play that still lack exhibit depth.

---

## Scoring methodology

| Dimension | 0 | 0.5–0.75 | 1 |
|-----------|---|----------|---|
| **Cover** | No linked album | Albums without cover art | Album with resolved cover |
| **Chart** | No Hot 100 | Peak or weeks only | Hot 100 + peak + multi-week run |
| **Album** | No album graph link | Album without cover | Multiple albums + cover |
| **Commentary** | No tags / class | VDJ User2 hint or 1 tag | 2+ canonical Retroverse Tags |

**Completeness %** = average of four dimension scores × 100.

**Enrichment priority** = `max(playCount, 0.5) × (100 − completeness%) / 100`

**Movie / TV linkage** (boolean proxies — no graph edge yet):
- **TV:** `TVTheme` / `TVFavorite` tag, or path keywords (Soul Train, Bandstand, Midnight Special, etc.)
- **Movie:** path keywords (movie, film, soundtrack, trailer), or `Novelty` tag

---

## Most played / least complete (top 25)

Tracks with **PlayCount ≥ 3** ranked by enrichment priority.

| Play | Complete | Priority | Artist | Title | RVTR | Peak | Cover | Chart | Album | Tags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 37 | 25% | 27.8 | Fleetwood Mac | Rhiannon | RVTR097615 | 11 | 0 | 1 | 0 | none |
| 85 | 69% | 26.4 | Bob Seger | Night Moves | RVTR347287 | 4 | 1 | 1 | 0.75 | none |
| 30 | 23% | 23.1 | Billy Preston | My Sweet Lord | RVTR692555 | 90 | 0 | 0.9 | 0 | none |
| 28 | 25% | 21.0 | Exile | Kiss You All Over | RVTR597526 | 1 | 0 | 1 | 0 | none |
| 22 | 25% | 16.5 | Linda Ronstadt | It's So Easy | RVTR935321 | 5 | 0 | 1 | 0 | none |
| 61 | 75% | 15.3 | Aerosmith | Sweet Emotion | RVTR572817 | 36 | 1 | 1 | 1 | none |
| 20 | 25% | 15.0 | Rod Stewart | Maggie May | RVTR364467 | 1 | 0 | 1 | 0 | none |
| 27 | 48% | 14.0 | Stampeders | Sweet City Woman | RVTR062287 | 8 | 0.5 | 1 | 0.4 | none |
| 53 | 75% | 13.3 | Dire Straits | Sultans Of Swing | RVTR086340 | 4 | 1 | 1 | 1 | none |
| 15 | 25% | 11.3 | The Staple Singers | Respect Yourself | RVTR595035 | 12 | 0 | 1 | 0 | none |
| 40 | 75% | 10.0 | Golden Earring | Radar Love | RVTR842181 | 13 | 1 | 1 | 1 | none |
| 13 | 25% | 9.8 | The Staple Singers | Respect Yourself | RVTR595035 | 12 | 0 | 1 | 0 | none |
| 35 | 75% | 8.8 | Electric Light Orchestra | Evil Woman | RVTR931823 | 10 | 1 | 1 | 1 | none |
| 27 | 69% | 8.4 | Nick Lowe | Cruel To Be Kind | RVTR792858 | 12 | 1 | 1 | 0.75 | none |
| 11 | 25% | 8.3 | Andy Kim | Rock Me Gently | RVTR808142 | 1 | 0 | 1 | 0 | none |
| 11 | 25% | 8.3 | Jim Croce | Operator | RVTR686026 | 17 | 0 | 1 | 0 | none |
| 11 | 25% | 8.3 | Joe Walsh | Life's Been Good | RVTR621535 | 12 | 0 | 1 | 0 | none |
| 26 | 69% | 8.1 | Ram Jam | Black Betty | RVTR422480 | 18 | 1 | 1 | 0.75 | none |
| 31 | 75% | 7.8 | Billy Joel | Piano Man | RVTR113069 | 25 | 1 | 1 | 1 | none |
| 10 | 25% | 7.5 | Marvin Gaye | Got To Give It Up | RVTR588513 | 1 | 0 | 1 | 0 | none |
| 10 | 25% | 7.5 | Tanya Tucker | Delta Dawn | RVTR574307 | 72 | 0 | 1 | 0 | none |
| 24 | 69% | 7.4 | Gary Wright | Dream Weaver | RVTR893127 | 2 | 1 | 1 | 0.75 | none |
| 23 | 69% | 7.1 | Mungo Jerry | In The Summertime | RVTR219284 | 3 | 1 | 1 | 0.75 | none |
| 22 | 69% | 6.8 | Boston | More Than A Feeling | RVTR028969 | 5 | 1 | 1 | 0.75 | none |
| 9 | 25% | 6.8 | Linda Ronstadt | Just One Look | RVTR193936 | 44 | 0 | 1 | 0 | none |

---

## Top 100 enrichment candidates

Full queue for decade-based enrichment (all matched rows).

| # | Priority | Play | Complete | RVTR | Artist | Title | Peak | Movie | TV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 27.8 | 37 | 25% | RVTR097615 | Fleetwood Mac | Rhiannon | 11 |  |  |
| 2 | 26.4 | 85 | 69% | RVTR347287 | Bob Seger | Night Moves | 4 |  |  |
| 3 | 23.1 | 30 | 23% | RVTR692555 | Billy Preston | My Sweet Lord | 90 |  |  |
| 4 | 21.0 | 28 | 25% | RVTR597526 | Exile | Kiss You All Over | 1 |  |  |
| 5 | 16.5 | 22 | 25% | RVTR935321 | Linda Ronstadt | It's So Easy | 5 |  |  |
| 6 | 15.3 | 61 | 75% | RVTR572817 | Aerosmith | Sweet Emotion | 36 |  |  |
| 7 | 15.0 | 20 | 25% | RVTR364467 | Rod Stewart | Maggie May | 1 |  |  |
| 8 | 14.0 | 27 | 48% | RVTR062287 | Stampeders | Sweet City Woman | 8 |  |  |
| 9 | 13.3 | 53 | 75% | RVTR086340 | Dire Straits | Sultans Of Swing | 4 |  |  |
| 10 | 11.3 | 15 | 25% | RVTR595035 | The Staple Singers | Respect Yourself | 12 |  |  |
| 11 | 10.0 | 40 | 75% | RVTR842181 | Golden Earring | Radar Love | 13 |  |  |
| 12 | 9.8 | 13 | 25% | RVTR595035 | The Staple Singers | Respect Yourself | 12 |  |  |
| 13 | 8.8 | 35 | 75% | RVTR931823 | Electric Light Orchestra | Evil Woman | 10 |  |  |
| 14 | 8.4 | 27 | 69% | RVTR792858 | Nick Lowe | Cruel To Be Kind | 12 |  |  |
| 15 | 8.3 | 11 | 25% | RVTR808142 | Andy Kim | Rock Me Gently | 1 |  |  |
| 16 | 8.3 | 11 | 25% | RVTR686026 | Jim Croce | Operator | 17 |  |  |
| 17 | 8.3 | 11 | 25% | RVTR621535 | Joe Walsh | Life's Been Good | 12 |  |  |
| 18 | 8.1 | 26 | 69% | RVTR422480 | Ram Jam | Black Betty | 18 |  |  |
| 19 | 7.8 | 31 | 75% | RVTR113069 | Billy Joel | Piano Man | 25 |  |  |
| 20 | 7.5 | 10 | 25% | RVTR588513 | Marvin Gaye | Got To Give It Up | 1 |  |  |
| 21 | 7.5 | 10 | 25% | RVTR574307 | Tanya Tucker | Delta Dawn | 72 |  |  |
| 22 | 7.4 | 24 | 69% | RVTR893127 | Gary Wright | Dream Weaver | 2 |  |  |
| 23 | 7.1 | 23 | 69% | RVTR219284 | Mungo Jerry | In The Summertime | 3 |  |  |
| 24 | 6.8 | 22 | 69% | RVTR028969 | Boston | More Than A Feeling | 5 |  |  |
| 25 | 6.8 | 9 | 25% | RVTR193936 | Linda Ronstadt | Just One Look | 44 |  |  |
| 26 | 6.5 | 21 | 69% | RVTR003639 | Orleans | Still The One | 5 |  |  |
| 27 | 6.0 | 8 | 25% | RVTR135333 | Don McLean | American Pie | 1 |  |  |
| 28 | 6.0 | 8 | 25% | RVTR404535 | Lobo | I'd Love You To Want Me | 2 |  |  |
| 29 | 6.0 | 8 | 25% | RVTR261890 | The Temptations | Ball Of Confusion | 3 |  |  |
| 30 | 5.5 | 22 | 75% | RVTR096039 | Kiss | I Was Made For Lovin' You | 11 |  |  |
| 31 | 5.3 | 17 | 69% | RVTR839545 | George McCrae | Rock Your Baby | 1 |  |  |
| 32 | 5.3 | 17 | 69% | RVTR356489 | Sammy Johns | Chevy Van | 5 |  |  |
| 33 | 5.3 | 7 | 25% | RVTR078147 | Creedence Clearwater Revival | Have You Ever Seen The Rain | 8 |  |  |
| 34 | 5.3 | 7 | 25% | RVTR977215 | Giorgio Moroder | Chase | 33 |  |  |
| 35 | 5.3 | 7 | 25% | RVTR182309 | Jim Croce | You Don't Mess Around With Jim | 8 |  |  |
| 36 | 5.3 | 7 | 25% | RVTR337279 | John Stewart | Gold | 5 |  |  |
| 37 | 5.1 | 19 | 73% | RVTR935422 | Queen | Somebody To Love | 16 |  |  |
| 38 | 4.8 | 19 | 75% | RVTR569927 | Fleetwood Mac | Dreams | 1 |  |  |
| 39 | 4.7 | 15 | 69% | RVTR846133 | Neil Diamond | Sweet Caroline | 4 |  |  |
| 40 | 4.5 | 18 | 75% | RVTR008301 | America | A Horse With No Name | 1 |  |  |
| 41 | 4.5 | 18 | 75% | RVTR275965 | Electric Light Orchestra | Don't Bring Me Down | 4 |  |  |
| 42 | 4.5 | 18 | 75% | RVTR404950 | Peter Frampton | Show Me The Way | 6 |  |  |
| 43 | 4.5 | 18 | 75% | RVTR678114 | Stevie Wonder | Superstition | 1 |  |  |
| 44 | 4.5 | 6 | 25% | RVTR460879 | Dave Edmunds | I Hear You Knocking | 4 |  |  |
| 45 | 4.3 | 14 | 69% | RVTR220805 | Journey | Lovin', Touchin', Squeezin' | 16 |  |  |
| 46 | 4.2 | 8 | 48% | RVTR673714 | Paper Lace | The Night Chicago Died | 1 |  |  |
| 47 | 4.0 | 16 | 75% | RVTR300772 | Aerosmith | Dream On | 6 |  |  |
| 48 | 4.0 | 16 | 75% | RVTR840141 | Glen Campbell | Rhinestone Cowboy | 1 |  |  |
| 49 | 4.0 | 16 | 75% | RVTR833121 | Heart | Crazy On You | 35 |  |  |
| 50 | 4.0 | 16 | 75% | RVTR620162 | Melanie | Brand New Key | 1 |  |  |
| 51 | 4.0 | 16 | 75% | RVTR976054 | Queen | Bohemian Rhapsody | 2 |  |  |
| 52 | 3.8 | 15 | 75% | RVTR300772 | Aerosmith | Dream On | 6 |  |  |
| 53 | 3.7 | 12 | 69% | RVTR960733 | Brewer And Shipley | One Toke Over The Line | 10 |  |  |
| 54 | 3.7 | 12 | 69% | RVTR496488 | George Harrison | Crackerbox Palace | 19 |  |  |
| 55 | 3.7 | 12 | 69% | RVTR047843 | Looking Glass | Brandy | 1 |  |  |
| 56 | 3.7 | 12 | 69% | RVTR511394 | Redbone | Come And Get Your Love | 5 |  |  |
| 57 | 3.5 | 14 | 75% | RVTR429997 | Chicago | 25 or 6 to 4 | 4 |  |  |
| 58 | 3.5 | 14 | 75% | RVTR250327 | Peter Gabriel | Solsbury Hill | 68 |  |  |
| 59 | 3.3 | 13 | 75% | RVTR506000 | ABBA | Dancing Queen | 1 |  |  |
| 60 | 3.3 | 13 | 75% | RVTR734067 | Chic | Le Freak | 1 |  |  |
| 61 | 3.3 | 13 | 75% | RVTR921168 | Lou Reed | Walk On The Wild Side | 16 |  |  |
| 62 | 3.3 | 13 | 75% | RVTR018811 | The Who | Behind Blue Eyes | 34 |  |  |
| 63 | 3.2 | 12 | 73% | RVTR480919 | George Harrison | My Sweet Lord | 94 |  |  |
| 64 | 3.1 | 6 | 48% | RVTR794515 | Bee Gees | Night Fever | 1 |  |  |
| 65 | 3.1 | 10 | 69% | RVTR329491 | Albert Hammond | It Never Rains In Southern California | 5 |  |  |
| 66 | 3.0 | 12 | 75% | RVTR044043 | Blondie | Heart Of Glass | 1 |  |  |
| 67 | 3.0 | 12 | 75% | RVTR309611 | Chicago | Saturday In The Park | 3 |  |  |
| 68 | 3.0 | 12 | 75% | RVTR601662 | Elton John | Rocket Man | 6 |  |  |
| 69 | 3.0 | 12 | 75% | RVTR924295 | John Denver | Take Me Home, Country Roads | 2 |  |  |
| 70 | 3.0 | 4 | 25% | RVTR508123 | Burton Cummings | Break It To Them Gently | 85 |  |  |
| 71 | 3.0 | 4 | 25% | RVTR073174 | James Brown | Sex Machine | 61 |  |  |
| 72 | 3.0 | 4 | 25% | RVTR190477 | Suzi Quatro | Stumblin' in | 4 |  |  |
| 73 | 3.0 | 4 | 25% | RVTR588559 | Terry Jacks | Seasons In The Sun | 1 |  |  |
| 74 | 3.0 | 4 | 25% | RVTR435391 | Three Dog Night | The Show Must Go On | 4 |  |  |
| 75 | 2.8 | 9 | 69% | RVTR633955 | Hot Chocolate | You Sexy Thing | 3 |  |  |
| 76 | 2.8 | 9 | 69% | RVTR537424 | Maria Muldaur | Midnight At The Oasis | 6 |  |  |
| 77 | 2.8 | 9 | 69% | RVTR183540 | Rod Stewart | Ooh La La | 39 |  |  |
| 78 | 2.8 | 9 | 69% | RVTR604353 | Starbuck | Moonlight Feels Right | 3 |  |  |
| 79 | 2.8 | 11 | 75% | RVTR028160 | Bee Gees | Nights On Broadway | 7 |  |  |
| 80 | 2.8 | 11 | 75% | RVTR633797 | Electric Light Orchestra | Mr. Blue Sky | 35 |  |  |
| 81 | 2.8 | 11 | 75% | RVTR897961 | Meat Loaf | Paradise By The Dashboard Light | 39 |  |  |
| 82 | 2.8 | 11 | 75% | RVTR408614 | Neil Diamond | Song Sung Blue | 1 |  |  |
| 83 | 2.5 | 10 | 75% | RVTR044043 | Blondie | Heart of Glass | 1 |  |  |
| 84 | 2.5 | 10 | 75% | RVTR127797 | Lynn Anderson | Rose Garden | 3 |  |  |
| 85 | 2.5 | 8 | 69% | RVTR193931 | Badfinger | Day After Day | 4 |  |  |
| 86 | 2.5 | 8 | 69% | RVTR402112 | Elton John | Mama Can't Buy You Love | 9 |  |  |
| 87 | 2.3 | 9 | 75% | RVTR677504 | Donna Summer | I Feel Love | 6 |  |  |
| 88 | 2.3 | 9 | 75% | RVTR784662 | Eagles | One Of These Nights | 1 |  |  |
| 89 | 2.3 | 9 | 75% | RVTR738638 | Kansas | Carry On Wayward Son | 11 |  |  |
| 90 | 2.3 | 9 | 75% | RVTR423929 | Little River Band | Lonesome Loser | 6 |  |  |
| 91 | 2.3 | 9 | 75% | RVTR286704 | Styx | Come Sail Away | 8 |  |  |
| 92 | 2.3 | 3 | 25% | RVTR401615 | Carole King | Corazón | 37 |  |  |
| 93 | 2.3 | 3 | 25% | RVTR648969 | Pink Floyd | Another Brick In The Wall | 1 |  |  |
| 94 | 2.3 | 3 | 25% | RVTR540755 | Reunion | Life Is A Rock | 8 |  |  |
| 95 | 2.3 | 3 | 25% | RVTR710690 | Rose Royce | Do Your Dance | 39 |  |  |
| 96 | 2.3 | 3 | 25% | RVTR226910 | The Hollies | The Air That I Breathe | 6 |  |  |
| 97 | 2.2 | 7 | 69% | RVTR462471 | 10cc | Dreadlock Holiday | 44 |  |  |
| 98 | 2.2 | 7 | 69% | RVTR441661 | Al Stewart | Year Of The Cat | 8 |  |  |
| 99 | 2.2 | 7 | 69% | RVTR193931 | Badfinger | Day After Day | 4 |  |  |
| 100 | 2.1 | 4 | 48% | RVTR804974 | April Wine | Roller | 34 |  |  |

---

## Completeness distribution

| Bucket | Count | % of matched |
|--------|------:|-------------:|
| High (≥75%) | 309 | 53.2% |
| Mid (40–74%) | 193 | 33.2% |
| Low (<40%) | 79 | 13.6% |

---

## Dimension averages

| Dimension | Avg score (0–1) |
|-----------|----------------:|
| Cover | 0.85 |
| Chart | 1.00 |
| Album | 0.77 |
| Commentary | 0.00 |

---

## Operational notes

1. **PlayCount** is VDJ's rotation signal (`Infos PlayCount` in `database.xml`) — DJ usage proxy, not literal spins.
2. **Matched** = `media_track_links` present; RVTR from `canonical_track_display`.
3. **Commentary** uses canonical Retroverse Tags (`ops/retroverse-tags-by-rvtr.json`) + year-workspace classification — no standalone commentary field in graph yet.
4. **Movie/TV linkage** are path/tag proxies until media-graph edges exist.
5. Re-run after VDJ sync or tag passes: `npx tsx tools/run-1970s-performance-universe-audit.ts`

---

## JSON artifact

Machine-readable queue: `reports/1970s-performance-universe-audit.json`
