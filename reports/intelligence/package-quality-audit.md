# Package Quality Audit

Generated: 2026-06-17T16:57:17.004Z

Scope: existing Song Packages only. This audit does **not** modify package generation, package data, routes, UI, or review workflow.

## Summary

| Metric | Count |
| --- | ---: |
| Packages audited | **87** |
| Average quality score | **66** |
| Album failures | **38** |
| Story issue packages | **87** |
| Fact relevance issue packages | **64** |
| Source coverage issue packages | **87** |

## Reference Example — RVTR974150

| Field | Value |
| --- | --- |
| Artist | Herb Alpert And The Tijuana Brass |
| Title | A Taste Of Honey |
| Score | 34 |
| Album detected | Whipped Cream & Other Delights |
| Album issues | metadata_albumTitle_null, relationship_unknown_album, multiple_albums_referenced |
| Weak facts | 7 |
| Sources | 4 (75% Wikipedia) |
| Primary issues | metadata_albumTitle_null, relationship_unknown_album, multiple_albums_referenced, wikipedia_dominant, missing_secondary_sources, weak_facts_7, repeated_story_facts_6, unknown_album_relationship |

## Top 50 Weakest Packages

| Score | RVTR | Artist | Title | Album | Weak Facts | Sources | Issues |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 29 | RVTR577946 | Earth, Wind & Fire | September | — | 7/13 | 4 src / 75% wiki | metadata_albumTitle_null, relationship_unknown_album, wikipedia_dominant, missing_secondary_sources, weak_facts_7 |
| 34 | RVTR974150 | Herb Alpert And The Tijuana Brass | A Taste Of Honey | Whipped Cream & Other Delights | 7/18 | 4 src / 75% wiki | metadata_albumTitle_null, relationship_unknown_album, multiple_albums_referenced, wikipedia_dominant, missing_secondary_sources |
| 37 | RVTR961157 | Los Del Rio | Macarena Bayside Boys Mix | — | 2/6 | 2 src / 50% wiki | metadata_albumTitle_null, relationship_unknown_album, low_source_count, missing_secondary_sources, weak_facts_2 |
| 38 | RVTR889968 | Steve Earle | Copperhead Road | — | 6/16 | 4 src / 75% wiki | metadata_albumTitle_null, relationship_unknown_album, wikipedia_dominant, missing_secondary_sources, weak_facts_6 |
| 39 | RVTR097615 | Fleetwood Mac | Rhiannon Will You Ever Win | — | 10/19 | 7 src / 43% wiki | metadata_albumTitle_null, relationship_unknown_album, missing_secondary_sources, weak_facts_10, repeated_story_facts_7 |
| 41 | RVTR738810 | Red Hot Chili Peppers | Love Rollercoaster | — | 2/13 | 3 src / 67% wiki | metadata_albumTitle_null, relationship_unknown_album, low_source_count, missing_secondary_sources, weak_facts_2 |
| 41 | RVTR189191 | Walter Murphy | A Fi Feat H Of Beethoven | — | 3/12 | 3 src / 67% wiki | metadata_albumTitle_null, relationship_unknown_album, low_source_count, missing_secondary_sources, weak_facts_3 |
| 45 | RVTR102445 | Chaka Demus & Pliers | Twist And Shout | — | 0/10 | 3 src / 67% wiki | metadata_albumTitle_null, relationship_unknown_album, low_source_count, missing_secondary_sources, unknown_album_relationship |
| 45 | RVTR844613 | Brenda Lee | Rockin' Around The Christmas Tree | Jingle Bell Rock | 7/16 | 4 src / 75% wiki | multiple_albums_referenced, wikipedia_dominant, missing_secondary_sources, weak_facts_7, repeated_story_facts_9 |
| 46 | RVTR341888 | Bette Midler | Wind Beneath My Wings From Beaches | — | 0/2 | 1 src / 0% wiki | metadata_albumTitle_null, relationship_unknown_album, low_source_count, missing_secondary_sources, canonical_only |
| 51 | RVTR288743 | The Four Tops | I Can't Help Myself | Stop in the Name of Love | 6/20 | 4 src / 75% wiki | metadata_albumTitle_null, relationship_unknown_album, wikipedia_dominant, missing_secondary_sources, weak_facts_6 |
| 51 | RVTR317808 | Ini Kamoze | Here Comes The Hotstepper From Ready To Wear | Here Comes the Hotstepper | 5/14 | 5 src / 40% wiki | metadata_albumTitle_null, relationship_unknown_album, missing_secondary_sources, weak_facts_5, repeated_story_facts_13 |
| 51 | RVTR563439 | Lmfao | Party Rock Anthem | Sorry For Party Rocking | 6/15 | 4 src / 75% wiki | multiple_albums_referenced, wikipedia_dominant, missing_secondary_sources, weak_facts_6, repeated_story_facts_7 |
| 52 | RVTR765818 | Teddy Swims | Lose Control | Swims' official YouTube channel | 2/7 | 4 src / 75% wiki | metadata_albumTitle_null, relationship_unknown_album, wikipedia_dominant, missing_secondary_sources, weak_facts_2 |
| 52 | RVTR521711 | Gotye | Somebody That I Used To Know | Making Mirrors | 2/12 | 4 src / 75% wiki | multiple_albums_referenced, wikipedia_dominant, missing_secondary_sources, weak_facts_2, repeated_story_facts_5 |
| 53 | RVTR148782 | Bee Gees | How Deep Is Your Love | Bee Gees: Opus Collection | 7/14 | 4 src / 75% wiki | wikipedia_dominant, missing_secondary_sources, weak_facts_7, repeated_story_facts_7 |
| 53 | RVTR261615 | The Doors | Light My Fire | 13 | 1/15 | 4 src / 75% wiki | multiple_albums_referenced, conflicting_album_sources, wikipedia_dominant, missing_secondary_sources, weak_facts_1 |
| 55 | RVTR239584 | Peter Gabriel | In Your Eyes Theme From Say Anything | So won a record nine MTV Awards at the 1987 MTV Video Music Awards | 2/8 | 5 src / 40% wiki | metadata_albumTitle_null, relationship_unknown_album, missing_secondary_sources, weak_facts_2, repeated_story_facts_7 |
| 55 | RVTR758008 | Frankie Goes To Hollywood | Relax | Welcome to the Pleasuredome | 3/8 | 5 src / 40% wiki | metadata_albumTitle_null, relationship_unknown_album, missing_secondary_sources, weak_facts_3, repeated_story_facts_7 |
| 57 | RVTR605797 | T Spoon | Sex On The Beach | Harvest Moon | 0/8 | 4 src / 75% wiki | metadata_albumTitle_null, relationship_unknown_album, wikipedia_dominant, missing_secondary_sources, unknown_album_relationship |
| 58 | RVTR311683 | Blanco Brown | The Git Up | — | 0/8 | 5 src / 40% wiki | metadata_albumTitle_null, relationship_unknown_album, missing_secondary_sources, repeated_story_facts_4, unknown_album_relationship |
| 58 | RVTR037060 | Mariah Carey | All I Want For Christmas Is You | Merry Christmas | 5/12 | 4 src / 75% wiki | multiple_albums_referenced, wikipedia_dominant, missing_secondary_sources, weak_facts_5, repeated_story_facts_3 |
| 61 | RVTR718018 | Depeche Mode | Personal Jesus | Violator | 1/15 | 6 src / 33% wiki | multiple_albums_referenced, missing_secondary_sources, weak_facts_1, repeated_story_facts_11 |
| 63 | RVTR848446 | Night Ranger | Sister Christian | Midnight Madness | 7/15 | 7 src / 43% wiki | multiple_albums_referenced, missing_secondary_sources, weak_facts_7, repeated_story_facts_11 |
| 63 | RVTR597526 | Exile | Kiss You All Over | Mixed Emotions | 1/5 | 6 src / 50% wiki | metadata_albumTitle_null, relationship_unknown_album, missing_secondary_sources, weak_facts_1, repeated_story_facts_5 |
| 63 | RVTR461411 | Ub40 | Red Red Wine | Labour Of Love | 0/9 | 3 src / 67% wiki | multiple_albums_referenced, low_source_count, missing_secondary_sources, repeated_story_facts_3 |
| 64 | RVTR413146 | The Romantics | What I Like About You | The Romantics | 2/10 | 7 src / 43% wiki | multiple_albums_referenced, missing_secondary_sources, weak_facts_2, repeated_story_facts_9 |
| 65 | RVTR245782 | U2 | I Still Haven't Found What I'm Looking For | U218: Singles | 3/10 | 6 src / 33% wiki | missing_secondary_sources, weak_facts_3, repeated_story_facts_9 |
| 66 | RVTR930155 | Blue Oyster Cult | Don't Fear The Reaper | Some Enchanted Evening | 4/11 | 6 src / 50% wiki | missing_secondary_sources, weak_facts_4, repeated_story_facts_7 |
| 67 | RVTR417678 | The Hollies | Long Cool Woman In A Black Dress | Distant Light | 5/16 | 7 src / 43% wiki | missing_secondary_sources, weak_facts_5, repeated_story_facts_9 |
| 67 | RVTR092496 | Men At Work | Down Under | Business As Usual | 3/16 | 7 src / 43% wiki | multiple_albums_referenced, missing_secondary_sources, weak_facts_3, repeated_story_facts_9 |
| 68 | RVTR269180 | Los Lonely Boys | Heaven | Los Lonely Boys | 4/10 | 6 src / 33% wiki | multiple_albums_referenced, missing_secondary_sources, weak_facts_4, repeated_story_facts_5 |
| 68 | RVTR113069 | Billy Joel | Piano Man | The Essential Billy Joel | 5/10 | 6 src / 33% wiki | missing_secondary_sources, weak_facts_5, repeated_story_facts_5 |
| 69 | RVTR853147 | Modern English | I Melt With You | Pillow Lips | 5/14 | 7 src / 43% wiki | missing_secondary_sources, weak_facts_5, repeated_story_facts_9 |
| 69 | RVTR478078 | Talking Heads | Once In A Lifetime | Remain In Light | 7/19 | 7 src / 43% wiki | missing_secondary_sources, weak_facts_7, repeated_story_facts_11 |
| 70 | RVTR770049 | Elvis Presley | Little Sister | Golden Records Vol. 3 | 4/13 | 7 src / 43% wiki | conflicting_album_sources, missing_secondary_sources, weak_facts_4, repeated_story_facts_13 |
| 70 | RVTR605006 | Fleetwood Mac | Everywhere | The Dance | 5/15 | 7 src / 43% wiki | missing_secondary_sources, weak_facts_5, repeated_story_facts_9 |
| 70 | RVTR386689 | James | Laid | Laid | 4/11 | 6 src / 33% wiki | missing_secondary_sources, weak_facts_4, repeated_story_facts_7 |
| 70 | RVTR514537 | Thompson Twins | Hold Me Now | Into The Gap | 4/11 | 7 src / 43% wiki | missing_secondary_sources, weak_facts_4, repeated_story_facts_7 |
| 71 | RVTR656396 | Snow | Informer | 12 Inches Of Snow | 2/13 | 6 src / 33% wiki | multiple_albums_referenced, missing_secondary_sources, weak_facts_2, repeated_story_facts_11 |
| 71 | RVTR704483 | Cypress Hill | Insane In The Brain | Black Sunday | 3/11 | 7 src / 43% wiki | missing_secondary_sources, weak_facts_3, repeated_story_facts_9 |
| 71 | RVTR898688 | Savage Garden | I Want You | Savage Garden | 4/12 | 6 src / 33% wiki | missing_secondary_sources, weak_facts_4, repeated_story_facts_7 |
| 71 | RVTR931823 | Electric Light Orchestra | Evil Woman | ELO's Greatest Hits | 3/11 | 7 src / 43% wiki | missing_secondary_sources, weak_facts_3, repeated_story_facts_9 |
| 71 | RVTR394955 | Bee Gees | Alone | Still Waters | 2/10 | 6 src / 33% wiki | missing_secondary_sources, weak_facts_2, repeated_story_facts_11 |
| 71 | RVTR572817 | Aerosmith | Sweet Emotion | Live Bootleg | 4/14 | 7 src / 43% wiki | missing_secondary_sources, weak_facts_4, repeated_story_facts_11 |
| 72 | RVTR328750 | The Black Crowes | Hard To Handle | Greatest Hits 1990--1999: A Tribute To A Work In Progress... | 0/10 | 7 src / 43% wiki | multiple_albums_referenced, missing_secondary_sources, repeated_story_facts_9 |
| 72 | RVTR652282 | Greg Kihn Band | The Breakup Song They Don't Write 'Em | Rockihnroll | 2/15 | 6 src / 33% wiki | missing_secondary_sources, weak_facts_2, repeated_story_facts_9 |
| 72 | RVTR671133 | The Time | Jungle Love | Ice Cream Castle | 2/15 | 7 src / 43% wiki | multiple_albums_referenced, missing_secondary_sources, weak_facts_2, repeated_story_facts_11 |
| 72 | RVTR381289 | Peter Gabriel | Sledgehammer | So | 0/15 | 6 src / 33% wiki | multiple_albums_referenced, conflicting_album_sources, missing_secondary_sources, repeated_story_facts_11 |
| 72 | RVTR957415 | The Black Eyed Peas | I Gotta Feeling | The E.N.D. | 0/3 | 1 src / 0% wiki | conflicting_album_sources, low_source_count, missing_secondary_sources, canonical_only, repeated_story_facts_1 |

## Album Resolution Report

| RVTR | Artist | Title | Album detected | Album confidence | Resolution issue |
| --- | --- | --- | --- | --- | --- |
| RVTR577946 | Earth, Wind & Fire | September | — | 0 | metadata_albumTitle_null, relationship_unknown_album |
| RVTR974150 | Herb Alpert And The Tijuana Brass | A Taste Of Honey | Whipped Cream & Other Delights | 35 | metadata_albumTitle_null, relationship_unknown_album, multiple_albums_referenced |
| RVTR961157 | Los Del Rio | Macarena Bayside Boys Mix | — | 0 | metadata_albumTitle_null, relationship_unknown_album |
| RVTR889968 | Steve Earle | Copperhead Road | — | 0 | metadata_albumTitle_null, relationship_unknown_album |
| RVTR097615 | Fleetwood Mac | Rhiannon Will You Ever Win | — | 0 | metadata_albumTitle_null, relationship_unknown_album |
| RVTR738810 | Red Hot Chili Peppers | Love Rollercoaster | — | 0 | metadata_albumTitle_null, relationship_unknown_album |
| RVTR189191 | Walter Murphy | A Fi Feat H Of Beethoven | — | 0 | metadata_albumTitle_null, relationship_unknown_album |
| RVTR102445 | Chaka Demus & Pliers | Twist And Shout | — | 0 | metadata_albumTitle_null, relationship_unknown_album |
| RVTR844613 | Brenda Lee | Rockin' Around The Christmas Tree | Jingle Bell Rock | 95 | multiple_albums_referenced |
| RVTR341888 | Bette Midler | Wind Beneath My Wings From Beaches | — | 0 | metadata_albumTitle_null, relationship_unknown_album |
| RVTR288743 | The Four Tops | I Can't Help Myself | Stop in the Name of Love | 55 | metadata_albumTitle_null, relationship_unknown_album |
| RVTR317808 | Ini Kamoze | Here Comes The Hotstepper From Ready To Wear | Here Comes the Hotstepper | 55 | metadata_albumTitle_null, relationship_unknown_album |
| RVTR563439 | Lmfao | Party Rock Anthem | Sorry For Party Rocking | 95 | multiple_albums_referenced |
| RVTR765818 | Teddy Swims | Lose Control | Swims' official YouTube channel | 55 | metadata_albumTitle_null, relationship_unknown_album |
| RVTR521711 | Gotye | Somebody That I Used To Know | Making Mirrors | 95 | multiple_albums_referenced |
| RVTR261615 | The Doors | Light My Fire | 13 | 95 | multiple_albums_referenced, conflicting_album_sources |
| RVTR239584 | Peter Gabriel | In Your Eyes Theme From Say Anything | So won a record nine MTV Awards at the 1987 MTV Video Music Awards | 55 | metadata_albumTitle_null, relationship_unknown_album |
| RVTR758008 | Frankie Goes To Hollywood | Relax | Welcome to the Pleasuredome | 55 | metadata_albumTitle_null, relationship_unknown_album |
| RVTR605797 | T Spoon | Sex On The Beach | Harvest Moon | 55 | metadata_albumTitle_null, relationship_unknown_album |
| RVTR311683 | Blanco Brown | The Git Up | — | 0 | metadata_albumTitle_null, relationship_unknown_album |
| RVTR037060 | Mariah Carey | All I Want For Christmas Is You | Merry Christmas | 95 | multiple_albums_referenced |
| RVTR718018 | Depeche Mode | Personal Jesus | Violator | 95 | multiple_albums_referenced |
| RVTR848446 | Night Ranger | Sister Christian | Midnight Madness | 95 | multiple_albums_referenced |
| RVTR597526 | Exile | Kiss You All Over | Mixed Emotions | 55 | metadata_albumTitle_null, relationship_unknown_album |
| RVTR461411 | Ub40 | Red Red Wine | Labour Of Love | 95 | multiple_albums_referenced |
| RVTR413146 | The Romantics | What I Like About You | The Romantics | 95 | multiple_albums_referenced |
| RVTR092496 | Men At Work | Down Under | Business As Usual | 95 | multiple_albums_referenced |
| RVTR269180 | Los Lonely Boys | Heaven | Los Lonely Boys | 95 | multiple_albums_referenced |
| RVTR770049 | Elvis Presley | Little Sister | Golden Records Vol. 3 | 95 | conflicting_album_sources |
| RVTR656396 | Snow | Informer | 12 Inches Of Snow | 95 | multiple_albums_referenced |
| RVTR328750 | The Black Crowes | Hard To Handle | Greatest Hits 1990--1999: A Tribute To A Work In Progress... | 95 | multiple_albums_referenced |
| RVTR671133 | The Time | Jungle Love | Ice Cream Castle | 95 | multiple_albums_referenced |
| RVTR381289 | Peter Gabriel | Sledgehammer | So | 95 | multiple_albums_referenced, conflicting_album_sources |
| RVTR957415 | The Black Eyed Peas | I Gotta Feeling | The E.N.D. | 95 | conflicting_album_sources |
| RVTR782544 | Olivia Newton-john | I Honestly Love You | Magic: The Very Best Of Olivia Newton-John | 95 | multiple_albums_referenced |
| RVTR849979 | Shaggy | Hope | Hotshot | 95 | multiple_albums_referenced |
| RVTR792858 | Nick Lowe | Cruel To Be Kind | Labour Of Lust | 95 | multiple_albums_referenced |
| RVTR888414 | The Mccoys | Hang On Sloopy | Hang On Sloopy | 95 | conflicting_album_sources |

## Story Duplication Report

| RVTR | Title | Stories | Duplicates | Repeated Facts | Example |
| --- | --- | --- | --- | --- | --- |
| RVTR577946 | September | 6 | 0 | 0 | Where Did That Name Come From? — Retroverse track identity: RVTR577946. |
| RVTR577946 | September | 6 | 0 | 0 | Still Showing Up in Pop Culture — The song was added to the Library of Congress's National Recording Registry in 2018. |
| RVTR974150 | A Taste Of Honey | 7 | 0 | 6 | Where Did That Name Come From? — Retroverse track identity: RVTR974150. |
| RVTR974150 | A Taste Of Honey | 7 | 0 | 6 | What Critics Said — The album Going Places spent six weeks at number one in 1966 according to AllMusic critic Rick Ginell. |
| RVTR961157 | Macarena Bayside Boys Mix | 3 | 0 | 3 | Chart Peak: #1 — The song peaked at #1 on the Billboard Hot 100 and spent 60 weeks on the chart. |
| RVTR961157 | Macarena Bayside Boys Mix | 3 | 0 | 3 | Album Context — Los Del Río have released over 20 albums since their formation. |
| RVTR889968 | Copperhead Road | 5 | 0 | 4 | Where Did That Name Come From? — Retroverse track identity: RVTR889968. |
| RVTR889968 | Copperhead Road | 5 | 0 | 4 | Album Context — Steve Earle has released twenty-one studio albums. |
| RVTR097615 | Rhiannon Will You Ever Win | 5 | 0 | 7 | Where Did That Name Come From? — Retroverse track identity: RVTR097615. |
| RVTR097615 | Rhiannon Will You Ever Win | 5 | 0 | 7 | Chart Peak: #11 — The song peaked at #11 on the Billboard Hot 100 and spent 18 weeks on the chart. |
| RVTR738810 | Love Rollercoaster | 5 | 0 | 0 | Where Did That Name Come From? — Retroverse track identity: RVTR738810. |
| RVTR738810 | Love Rollercoaster | 5 | 0 | 0 | How High Did It Chart? — The band holds the records for most number-one singles (15), most cumulative weeks at number one (91), and most top... |
| RVTR189191 | A Fi Feat H Of Beethoven | 4 | 0 | 5 | Chart Peak: #1 — The song peaked at #1 on the Billboard Hot 100 and spent 28 weeks on the chart. |
| RVTR189191 | A Fi Feat H Of Beethoven | 4 | 0 | 5 | Album Context — Walter Murphy composed the instrumental 'A Fifth of Beethoven', a disco adaptation of Beethoven's Fifth Symphony. |
| RVTR102445 | Twist And Shout | 5 | 0 | 0 | Where Did That Name Come From? — Retroverse track identity: RVTR102445. |
| RVTR102445 | Twist And Shout | 5 | 0 | 0 | Still Showing Up in Pop Culture — The Beatles' version of 'Twist and Shout' was included on the Anthology 1 compilation album. |
| RVTR844613 | Rockin' Around The Christmas Tree | 7 | 0 | 9 | Where Did That Name Come From? — Brenda Lee's father died in 1953 after being struck by a hammer during a construction job. |
| RVTR844613 | Rockin' Around The Christmas Tree | 7 | 0 | 9 | Chart Peak: #1 — The song peaked at #1 on the Billboard Hot 100 and spent 69 weeks on the chart. |
| RVTR341888 | Wind Beneath My Wings From Beaches | 1 | 0 | 0 | Chart Peak: #1 — The song peaked at #1 on the Billboard Hot 100 and spent 29 weeks on the chart. |
| RVTR288743 | I Can't Help Myself | 5 | 0 | 4 | Where Did That Name Come From? — Retroverse track identity: RVTR288743. |
| RVTR288743 | I Can't Help Myself | 5 | 0 | 4 | Album Context — The song was released on the Motown label. |
| RVTR317808 | Here Comes The Hotstepper From Ready To Wear | 8 | 0 | 13 | Where Did That Name Come From? — Retroverse track identity: RVTR317808. |
| RVTR317808 | Here Comes The Hotstepper From Ready To Wear | 8 | 0 | 13 | Chart Peak: #1 — The song peaked at #1 on the Billboard Hot 100 and spent 30 weeks on the chart. |
| RVTR563439 | Party Rock Anthem | 6 | 0 | 7 | Where Did That Name Come From? — Redfoo was sued by a previous management company for $7 million in 2012. |
| RVTR563439 | Party Rock Anthem | 6 | 0 | 7 | Chart Peak: #1 — The song peaked at #1 on the Billboard Hot 100 and spent 68 weeks on the chart. |
| RVTR765818 | Lose Control | 5 | 0 | 7 | Chart Peak: #1 — The song peaked at #1 on the Billboard Hot 100 and spent 112 weeks on the chart. |
| RVTR765818 | Lose Control | 5 | 0 | 7 | Album Context — Teddy Swims released his debut single "Night Off" in August 2019. |
| RVTR521711 | Somebody That I Used To Know | 6 | 0 | 5 | The Grammy-Winning Album — The album Making Mirrors won the 2013 Grammy for Best Alternative Music Album. |
| RVTR521711 | Somebody That I Used To Know | 6 | 0 | 5 | Chart Peak: #1 — The song peaked at #1 on the Billboard Hot 100 and spent 59 weeks on the chart. |
| RVTR148782 | How Deep Is Your Love | 6 | 0 | 7 | Chart Peak: #1 — The song peaked at #1 on the Billboard Hot 100 and spent 33 weeks on the chart. |

## Fact Relevance Report

| RVTR | Artist | Title | Reason | Fact |
| --- | --- | --- | --- | --- |
| RVTR577946 | Earth, Wind & Fire | September | not_culturally_relevant_to_song | The song was added to the Library of Congress's National Recording Registry in 2018. |
| RVTR577946 | Earth, Wind & Fire | September | not_culturally_relevant_to_song | Rolling Stone included the song at No. 65 on their updated list of the "500 Greatest Songs of All Time" in 2021. |
| RVTR577946 | Earth, Wind & Fire | September | artist_biography_only | Earth, Wind & Fire is an American musical group that spans multiple genres including jazz, R&B, soul, funk, disco, pop, Latin, and Afro-pop. |
| RVTR974150 | Herb Alpert And The Tijuana Brass | A Taste Of Honey | artist_biography_or_family_trivia | Paul McCartney was inspired to compose “Your Mother Should Know” based on a line taken from the screenplay. |
| RVTR974150 | Herb Alpert And The Tijuana Brass | A Taste Of Honey | artist_biography_or_family_trivia | Herb Alpert was born on March 31, 1935, in Boyle Heights, Los Angeles. |
| RVTR974150 | Herb Alpert And The Tijuana Brass | A Taste Of Honey | artist_biography_or_family_trivia | Herb Alpert's father was a tailor and a mandolin player. |
| RVTR961157 | Los Del Rio | Macarena Bayside Boys Mix | artist_biography_only | Los Del Río are a Spanish Latin pop and dance duo formed in Dos Hermanas, Andalusia, in 1962. |
| RVTR961157 | Los Del Rio | Macarena Bayside Boys Mix | artist_biography_only | The duo consists of Antonio Romero Monge and Rafael Ruiz Perdigones. |
| RVTR889968 | Steve Earle | Copperhead Road | not_culturally_relevant_to_song | The Tennessee General Assembly passed an act recognizing the song as the 11th official state song of Tennessee on April 20, 2023. |
| RVTR889968 | Steve Earle | Copperhead Road | generic_trivia_not_song_specific | The song's narrator is named John Lee Pettimore III. |
| RVTR889968 | Steve Earle | Copperhead Road | not_culturally_relevant_to_song | The song's blend of country and Southern rock has influenced several artists including Eric Church and Travis Tritt. |
| RVTR097615 | Fleetwood Mac | Rhiannon Will You Ever Win | not_song_specific | The song was originally recorded for Fleetwood Mac's 1975 eponymous album. |
| RVTR097615 | Fleetwood Mac | Rhiannon Will You Ever Win | not_song_specific | The song was ranked number six on Rolling Stone's list of the 50 greatest Fleetwood Mac songs. |
| RVTR097615 | Fleetwood Mac | Rhiannon Will You Ever Win | not_culturally_relevant_to_song | Nicks mentioned that fans told her "Rhiannon" had a spiritual effect on their lives. |
| RVTR738810 | Red Hot Chili Peppers | Love Rollercoaster | artist_biography_only | The band has been nominated for 19 Grammy Awards, winning six. |
| RVTR738810 | Red Hot Chili Peppers | Love Rollercoaster | generic_trivia_not_song_specific | The album's demo versions were preferred by Kiedis and Flea. |
| RVTR189191 | Walter Murphy | A Fi Feat H Of Beethoven | not_song_specific | Walter Murphy composed the instrumental 'A Fifth of Beethoven', a disco adaptation of Beethoven's Fifth Symphony. |
| RVTR189191 | Walter Murphy | A Fi Feat H Of Beethoven | not_culturally_relevant_to_song | The song 'A Fifth of Beethoven' was featured on the Saturday Night Fever soundtrack. |
| RVTR189191 | Walter Murphy | A Fi Feat H Of Beethoven | artist_biography_or_family_trivia | Walter Murphy was born on December 19, 1952, in New York City. |
| RVTR844613 | Brenda Lee | Rockin' Around The Christmas Tree | generic_biography | The song was inducted into the Grammy Hall of Fame in 2019. |
| RVTR844613 | Brenda Lee | Rockin' Around The Christmas Tree | not_song_specific | Brenda Lee rerecorded the song for the album A Brenda Lee Christmas in 1991. |
| RVTR844613 | Brenda Lee | Rockin' Around The Christmas Tree | not_culturally_relevant_to_song | Netflix film Falling for Christmas as a nod to her performance of the track in 2004's teen comedy Mean Girls. |
| RVTR288743 | The Four Tops | I Can't Help Myself | not_culturally_relevant_to_song | The song was covered by Bonnie Pointer in 1980. |
| RVTR288743 | The Four Tops | I Can't Help Myself | not_culturally_relevant_to_song | The song was covered by La Toya Jackson for her album Stop in the Name of Love. |
| RVTR288743 | The Four Tops | I Can't Help Myself | artist_biography_only | The Four Tops were formed in Detroit, Michigan, in 1953 as the Four Aims. |
| RVTR317808 | Ini Kamoze | Here Comes The Hotstepper From Ready To Wear | generic_trivia_not_song_specific | Albert Hammond's follow-up single "I'm a Train" was dismissed as "totally forgotten" even though it charted at number 31 in 1974. |
| RVTR317808 | Ini Kamoze | Here Comes The Hotstepper From Ready To Wear | generic_trivia_not_song_specific | Entertainment Weekly mentions Frank Zappa as a one-hit wonder because his only Top 40 hit was "Valley Girl" in 1982. |
| RVTR317808 | Ini Kamoze | Here Comes The Hotstepper From Ready To Wear | not_song_specific | Ini Kamoze's song "Here Comes the Hotstepper" was featured on the soundtrack of the 1994 film Prêt-à-Porter. |
| RVTR563439 | Lmfao | Party Rock Anthem | not_culturally_relevant_to_song | The song is the best-selling single of all time in Australia. |
| RVTR563439 | Lmfao | Party Rock Anthem | not_culturally_relevant_to_song | The song was the third best-selling digital single of 2011 with sales of 9.7 million copies. |
| RVTR563439 | Lmfao | Party Rock Anthem | not_culturally_relevant_to_song | The song is the third best-selling digital song in US history. |
| RVTR765818 | Teddy Swims | Lose Control | not_song_specific | Teddy Swims released his debut single "Night Off" in August 2019. |
| RVTR765818 | Teddy Swims | Lose Control | artist_biography_only | The song was written by Teddy Swims along with Alexander Izquierdo, Ed Drewett, Joshua Coleman, Julian Bunetta, and Rosie Danvers. |
| RVTR521711 | Gotye | Somebody That I Used To Know | not_culturally_relevant_to_song | The song was certified multi-platinum in ten countries, including diamond in Australia. |
| RVTR521711 | Gotye | Somebody That I Used To Know | not_culturally_relevant_to_song | The song has been streamed more than 2.3 billion times on Spotify as of October 2024. |
| RVTR148782 | Bee Gees | How Deep Is Your Love | not_song_specific | ITV viewers voted it The Nation's Favourite Bee Gees Song in a 2011 British TV special. |
| RVTR148782 | Bee Gees | How Deep Is Your Love | not_song_specific | Barry Gibb stated it was his favourite Bee Gees song in a 2001 Billboard magazine interview. |
| RVTR148782 | Bee Gees | How Deep Is Your Love | not_song_specific | The Bee Gees have sold over 120 million records worldwide. |
| RVTR261615 | The Doors | Light My Fire | generic_trivia_not_song_specific | The band agreed to a deal with Buick in October 1968 to adapt the song for a commercial, but Jim Morrison later threatened to smash a Buick ... |
| RVTR239584 | Peter Gabriel | In Your Eyes Theme From Say Anything | artist_biography_only | Peter Gabriel was part of the band Garden Wall while attending Charterhouse School in Surrey, England. |

## Source Coverage Report

| RVTR | Artist | Title | Sources | Canonical | Wikipedia | Secondary | Issues |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RVTR577946 | Earth, Wind & Fire | September | 4 | 1 | 3 | 0 | wikipedia_dominant, missing_secondary_sources |
| RVTR974150 | Herb Alpert And The Tijuana Brass | A Taste Of Honey | 4 | 1 | 3 | 0 | wikipedia_dominant, missing_secondary_sources |
| RVTR961157 | Los Del Rio | Macarena Bayside Boys Mix | 2 | 1 | 1 | 0 | low_source_count, missing_secondary_sources |
| RVTR889968 | Steve Earle | Copperhead Road | 4 | 1 | 3 | 0 | wikipedia_dominant, missing_secondary_sources |
| RVTR097615 | Fleetwood Mac | Rhiannon Will You Ever Win | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR738810 | Red Hot Chili Peppers | Love Rollercoaster | 3 | 1 | 2 | 0 | low_source_count, missing_secondary_sources |
| RVTR189191 | Walter Murphy | A Fi Feat H Of Beethoven | 3 | 1 | 2 | 0 | low_source_count, missing_secondary_sources |
| RVTR102445 | Chaka Demus & Pliers | Twist And Shout | 3 | 1 | 2 | 0 | low_source_count, missing_secondary_sources |
| RVTR844613 | Brenda Lee | Rockin' Around The Christmas Tree | 4 | 1 | 3 | 0 | wikipedia_dominant, missing_secondary_sources |
| RVTR341888 | Bette Midler | Wind Beneath My Wings From Beaches | 1 | 1 | 0 | 0 | low_source_count, missing_secondary_sources, canonical_only |
| RVTR288743 | The Four Tops | I Can't Help Myself | 4 | 1 | 3 | 0 | wikipedia_dominant, missing_secondary_sources |
| RVTR317808 | Ini Kamoze | Here Comes The Hotstepper From Ready To Wear | 5 | 3 | 2 | 0 | missing_secondary_sources |
| RVTR563439 | Lmfao | Party Rock Anthem | 4 | 1 | 3 | 0 | wikipedia_dominant, missing_secondary_sources |
| RVTR765818 | Teddy Swims | Lose Control | 4 | 1 | 3 | 0 | wikipedia_dominant, missing_secondary_sources |
| RVTR521711 | Gotye | Somebody That I Used To Know | 4 | 1 | 3 | 0 | wikipedia_dominant, missing_secondary_sources |
| RVTR148782 | Bee Gees | How Deep Is Your Love | 4 | 1 | 3 | 0 | wikipedia_dominant, missing_secondary_sources |
| RVTR261615 | The Doors | Light My Fire | 4 | 1 | 3 | 0 | wikipedia_dominant, missing_secondary_sources |
| RVTR239584 | Peter Gabriel | In Your Eyes Theme From Say Anything | 5 | 3 | 2 | 0 | missing_secondary_sources |
| RVTR758008 | Frankie Goes To Hollywood | Relax | 5 | 3 | 2 | 0 | missing_secondary_sources |
| RVTR605797 | T Spoon | Sex On The Beach | 4 | 1 | 3 | 0 | wikipedia_dominant, missing_secondary_sources |
| RVTR311683 | Blanco Brown | The Git Up | 5 | 3 | 2 | 0 | missing_secondary_sources |
| RVTR037060 | Mariah Carey | All I Want For Christmas Is You | 4 | 1 | 3 | 0 | wikipedia_dominant, missing_secondary_sources |
| RVTR718018 | Depeche Mode | Personal Jesus | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR848446 | Night Ranger | Sister Christian | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR597526 | Exile | Kiss You All Over | 6 | 3 | 3 | 0 | missing_secondary_sources |
| RVTR461411 | Ub40 | Red Red Wine | 3 | 1 | 2 | 0 | low_source_count, missing_secondary_sources |
| RVTR413146 | The Romantics | What I Like About You | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR245782 | U2 | I Still Haven't Found What I'm Looking For | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR930155 | Blue Oyster Cult | Don't Fear The Reaper | 6 | 3 | 3 | 0 | missing_secondary_sources |
| RVTR417678 | The Hollies | Long Cool Woman In A Black Dress | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR092496 | Men At Work | Down Under | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR269180 | Los Lonely Boys | Heaven | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR113069 | Billy Joel | Piano Man | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR853147 | Modern English | I Melt With You | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR478078 | Talking Heads | Once In A Lifetime | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR770049 | Elvis Presley | Little Sister | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR605006 | Fleetwood Mac | Everywhere | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR386689 | James | Laid | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR514537 | Thompson Twins | Hold Me Now | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR656396 | Snow | Informer | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR704483 | Cypress Hill | Insane In The Brain | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR898688 | Savage Garden | I Want You | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR931823 | Electric Light Orchestra | Evil Woman | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR394955 | Bee Gees | Alone | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR572817 | Aerosmith | Sweet Emotion | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR328750 | The Black Crowes | Hard To Handle | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR652282 | Greg Kihn Band | The Breakup Song They Don't Write 'Em | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR671133 | The Time | Jungle Love | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR381289 | Peter Gabriel | Sledgehammer | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR957415 | The Black Eyed Peas | I Gotta Feeling | 1 | 1 | 0 | 0 | low_source_count, missing_secondary_sources, canonical_only |
| RVTR923939 | Ace Of Base | The Sign | 1 | 1 | 0 | 0 | low_source_count, missing_secondary_sources, canonical_only |
| RVTR782544 | Olivia Newton-john | I Honestly Love You | 3 | 1 | 2 | 0 | low_source_count, missing_secondary_sources |
| RVTR860827 | The Righteous Brothers | Unchained Melody | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR849979 | Shaggy | Hope | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR661272 | Tom Petty And The Heartbreakers | Mary Jane's Last Dance | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR239934 | Soft Cell | Tainted Love | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR893127 | Gary Wright | Dream Weaver | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR860336 | Elvis Presley | Bridge Over Troubled Water | 5 | 3 | 2 | 0 | missing_secondary_sources |
| RVTR086340 | Dire Straits | Sultans Of Swing | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR792762 | Toto | Africa | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR347287 | Bob Seger | Night Moves | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR285085 | Paul Simon | You Can Call Me Al | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR094210 | 311 | All Mixed Up | 6 | 3 | 3 | 0 | missing_secondary_sources |
| RVTR990727 | Dire Straits | Money For Nothing | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR283044 | The Guess Who | These Eyes | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR025701 | Tony Joe White | Polk Salad Annie | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR252006 | Rick Astley | Never Gonna Give You Up | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR422480 | Ram Jam | Black Betty | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR792858 | Nick Lowe | Cruel To Be Kind | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR143275 | Biz Markie | Just A Friend | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR669909 | Chris Stapleton | Tennessee Whiskey | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR604727 | Bee Gees | To Love Somebody | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR842181 | Golden Earring | Radar Love | 7 | 4 | 3 | 0 | missing_secondary_sources |
| RVTR219284 | Mungo Jerry | In The Summertime | 5 | 4 | 1 | 0 | missing_secondary_sources |
| RVTR025347 | The Band | Atlantic City | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR472172 | Spin Doctors | Two Princes | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR667448 | Cher | If I Could Turn Back Time | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR563160 | Roxette | Joyride | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR888414 | The Mccoys | Hang On Sloopy | 5 | 4 | 1 | 0 | missing_secondary_sources |
| RVTR205493 | Roger Miller | King Of The Road | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR062287 | Stampeders | Sweet City Woman | 5 | 4 | 1 | 0 | missing_secondary_sources |
| RVTR769348 | The Black Crowes | Jealous Again | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR100391 | A Flock Of Seagulls | Space Age Love Song | 5 | 4 | 1 | 0 | missing_secondary_sources |
| RVTR793170 | Sublime | What I Got | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR733448 | Golden Earring | Twilight Zone | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR741425 | George Harrison | Got My Mind Set On You | 6 | 4 | 2 | 0 | missing_secondary_sources |
| RVTR376001 | Bow Wow Wow | I Want Candy | 6 | 4 | 2 | 0 | missing_secondary_sources |

## Recommended Fixes Ranked By Impact

1. **Album resolution before external research** — recover `metadata.albumTitle` / RVAL album context so relationship maps stop rendering Unknown Album and album facts are anchored.
2. **Fact relevance filter before auto-approval** — block artist-family, childhood, parent occupation, and generic biography facts unless they directly support the song.
3. **Song-first source targeting** — prefer song/recording/chart/video sources before generic artist pages; require at least one non-Wikipedia secondary source for high-quality packages.
4. **Story dedupe by fact set** — prevent multiple story headlines from using the same primary/supporting fact cluster.
5. **Relationship completeness score in review UI** — surface missing album, missing cover, missing chart, and missing VDJ media as separate quality warnings without blocking package creation.
