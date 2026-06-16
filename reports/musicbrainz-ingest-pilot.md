# MusicBrainz Ingest Pilot — Phase 5A

**Generated:** 2026-06-15T20:01:38.609Z  
**Mode:** Design pilot — no imports, no DB writes  
**Sample:** 400 Bucket C tracks where MusicBrainz returns recoverable metadata (Phase 4D criteria)

---

## Executive summary

Smallest viable pipeline: **RVTR → MB recording search → release pick → tracklist extract → staging row → human approve → albums + RVAL + canonical_album_tracks + RVTR slot link**.

| Pilot metric | Value |
|--------------|------:|
| MB-recoverable C tracks sampled | 400 |
| Would create **new RVAL** | 247 (61.8%) |
| Auto-ingestable (high confidence) | 322 (80.5%) |
| Needs human review | 78 (19.5%) |

**Effort to recover first 500 album relationships via MusicBrainz:** ~**2,084 MB lookups** (~2 hours API time at 1 req/s) + **~97 human reviews** (~3 hours at 2 min/review) + **~403 auto-applies**. Expect **2–3 dev days** for minimal staging + approval UI; **1–2 curator days** for first 500 batch.

---

## 1. Exact data fields needed

### From MusicBrainz (per candidate)

| Field | MB entity | Required |
|-------|-----------|----------|
| Recording MBID | `recording.id` | yes — audit trail |
| Release MBID | `release.id` | yes — idempotent re-fetch |
| Artist credit | `release.artist-credit` | yes — maps to RVAR |
| Album title | `release.title` | yes — `albums.title` |
| Release year | `release.date` (YYYY) | yes — `albums.release_year` |
| Track position | `media[].tracks[].position` | yes — `canonical_album_tracks.position` |
| Slot title | `media[].tracks[].title` | yes — `canonical_album_tracks.title` |
| Full tracklist | all `media[].tracks[]` | yes — seed all slots |
| Release group MBID | `release-group.id` (optional inc) | nice — dedupe editions |

### Retroverse write surface (not executed in pilot)

| Target | Fields |
|--------|--------|
| `albums` | `artist_id`, `title`, `release_year` |
| `album_external_keys` | new `RVAL######`, `album_id`, `source='musicbrainz'`, `confidence_score` |
| `canonical_album_tracks` | `album_id`, `position`, `title`, `canonical_track_key` (RVTR on matched slot only) |
| Staging (proposed) | `rvtr`, `mb_release_id`, `mb_recording_id`, `proposed_album_title`, `proposed_year`, `chart_year`, `confidence`, `signals[]`, `status` |

### Identity anchors (already in graph)

| Field | Source |
|-------|--------|
| `rvtr` | `canonical_track_display.track_id` |
| `artist_id` | `canonical_track_display.artist_id` (RVAR bridge) |
| Chart context | `chart_year`, `chart_weeks` from Hot 100 |

---

## 2. MusicBrainz → Retroverse entity map

| MusicBrainz | Retroverse | Notes |
|-------------|------------|-------|
| Artist | **RVAR** (`artists.id`) | Match via `canonical_name` normalize; never create artist in pilot |
| Release group | **RVAL** album identity | One RVAL per studio album; editions collapse later |
| Release | `albums` row + `album_external_keys` | Pick one primary release per ingest |
| Recording | **RVTR** slot match | Chart track must appear on release tracklist |
| Medium / track position | `canonical_album_tracks.position` | Preserve disc order |
| Track title on release | `canonical_album_tracks.title` | May differ from Hot 100 display title |
| Release date | `albums.release_year` | Year only for pilot |

**Not mapped in v1:** label, barcode, cover art (defer to RV12), ISRC, release country.

---

## 3. How many of 50 could be ingested automatically?

| Confidence | Count | % | Auto? |
|------------|------:|--:|-------|
| **High** | 322 | 80.5% | yes |
| Medium | 28 | 7.0% | no — curator pick release |
| Low | 36 | 9.0% | no — likely wrong album shape |
| Reject | 14 | 3.5% | no — compilation / incomplete |

**322 of 400 (80.5%)** could auto-ingest under proposed gates: studio album, year Δ≤1, tracklist ≥8, no compilation/festival/live-session title.

Scaled to Phase 4D MB C recovery (~1,789): **~1,440** auto-eligible of full MB-recoverable C population.

---

## 4. Confidence signals

| Signal | Auto-ingest gate | Review trigger |
|--------|------------------|----------------|
| `year_delta_0_1` | required | — |
| `year_delta_2_3` | — | medium tier |
| `year_delta_4+` | — | low tier |
| `tracklist_8_plus` | required for auto | short EP/single |
| `compilation_release_title` | reject | — |
| `non_studio_release_shape` | reject/low | festival, iTunes Session, Live |
| `artist_match` | required | collaboration splits |
| `track_on_tracklist` + position | required | — |
| `mb_release=…` | audit | re-fetch idempotency |

---

## 5. Human approval workflow (proposed)

```
1. STAGE — MB lookup produces ingest_candidate row (rvtr, mb_release_id, album, year, tracklist JSON, confidence, signals)
2. QUEUE — /ops/healing/ingest-candidates sorted by chart_weeks DESC
3. REVIEW CARD — show: RVTR title, MB album, year, tracklist preview, highlight matched slot, compilation flags
4. ACTIONS
   - Approve → create albums + RVAL + tracklist + link RVTR slot
   - Swap release → pick alternate MB release from recording
   - Reject → mark rejected + reason
   - Defer → leave staged
5. AUDIT — log actor, mb_release_id, rval assigned, timestamp
```

**Auto path (high only):** batch approve with daily cap (e.g. 50) + post-apply spot-check sample.

---

## Pilot cohort — 50 tracks

| RVTR | Artist | Track | MB album | Year | Pos | Tracks | New RVAL? | Confidence | Auto? |
|------|--------|-------|----------|-----:|----:|------:|-----------|------------|-------|
| RVTR765818 | teddy swims | Lose Control | I've Tried Everything but Therapy (Part 1) | 2023 | 2 | 10 | yes | high | yes |
| RVTR564021 | shaboozey | A Bar Song Tipsy | Where I’ve Been, isn’t Where I’m Going | 2024 | 2 | 12 | yes | high | yes |
| RVTR584203 | chappell roan | Pink Pony Club | 2024-06-16_ Bonnaroo Music and Arts Festival | 2024 | 15 | 15 | yes | reject | no |
| RVTR190132 | zach bryan | Something In The Orange | Open the Gate | 2022 | 2 | 6 | no | medium | no |
| RVTR191556 | rema | Calm Down | Rave & Roses | 2022 | 4 | 16 | yes | high | yes |
| RVTR312229 | fun | Some Nights | iTunes Session | 2012 | 3 | 7 | yes | low | no |
| RVTR384994 | bailey zimmerman | Rock And A Hard Place | Rock and a Hard Place | 2022 | 1 | 5 | no | low | no |
| RVTR724910 | zach bryan | I Remember Everything | Zach Bryan | 2023 | 11 | 16 | no | high | yes |
| RVTR681164 | doja cat | Woman | Planet Her | 2021 | 1 | 13 | no | high | yes |
| RVTR107547 | mustard | Ballin' | Perfect Ten | 2019 | 9 | 10 | no | high | yes |
| RVTR485869 | lizzo | Truth Hurts | Cuz I Love You | 2019 | 13 | 14 | yes | high | yes |
| RVTR083729 | jimmy harnen | Where Are You Now | Can't Fight the Midnight | 1989 | 11 | 11 | yes | medium | no |
| RVTR403107 | iyaz | Replay | Replay | 2009 | 1 | 5 | yes | low | no |
| RVTR291160 | kool | Celebration | Great and Remixed ’91 | 1991 | 3 | 9 | yes | low | no |
| RVTR384534 | The Harry Simeone Chorale | The Little Drummer Boy | The Little Drummer Boy: A Christmas Festival | 1966 | 19 | 31 | yes | reject | no |
| RVTR718588 | leblanc | Falling | Midnight Light | 1977 | 2 | 10 | yes | high | yes |
| RVTR811791 | lord tariq | Deja Vu Uptown Baby | Make It Reign | 1998 | 11 | 19 | no | high | yes |
| RVTR531432 | captain | Do That To Me One More Time | Make Your Move | 1979 | 5 | 8 | yes | high | yes |
| RVTR940076 | marilyn mccoo | You Don'T Have To Be A Star To Be In My Show | I Hope We Get to Love in Time | 1976 | 1 | 10 | yes | high | yes |
| RVTR984204 | seals | Get Closer | Get Closer | 1976 | 2 | 8 | yes | high | yes |
| RVTR731301 | sheila e | The Glamorous Life | The Glamorous Life | 1984 | 6 | 6 | yes | medium | no |
| RVTR717913 | jaya | If You Leave Me Now | Jaya | 1989 | 1 | 8 | yes | high | yes |
| RVTR901139 | *nsync | This I Promise You | Live From Madison Square Garden | 2000 | 12 | 14 | no | low | no |
| RVTR287922 | england dan | I'D Really Love To See You Tonight | Nights Are Forever | 1976 | 1 | 11 | yes | high | yes |
| RVTR132734 | doja cat | Need To Know | 100% Doja Cat | 2021 | 35 | 50 | no | high | yes |
| RVTR749780 | shaboozey | Good News | Where I’ve Been, Isn’t Where I’m Going | 2025 | 17 | 18 | yes | high | yes |
| RVTR870340 | doja cat | Kiss Me More | 100% Doja Cat | 2021 | 44 | 50 | no | high | yes |
| RVTR007163 | doja cat | You Right | 100% Doja Cat | 2021 | 38 | 50 | no | high | yes |
| RVTR966121 | lil nas x | Industry Baby | MONTERO | 2021 | 3 | 15 | no | high | yes |
| RVTR818263 | pop smoke | What You Know Bout Love | Shoot for the Stars Aim for the Moon | 2020 | 15 | 19 | no | high | yes |
| RVTR326074 | gracie abrams | That'S So True | The Secret of Us (deluxe) | 2024 | 15 | 20 | no | high | yes |
| RVTR871973 | doja cat | Paint The Town Red | Scarlet | 2023 | 1 | 17 | no | high | yes |
| RVTR663624 | jelly roll | Save Me | Self Medicated | 2020 | 2 | 18 | no | medium | no |
| RVTR773987 | doja cat | Get Into It Yuh | Planet Her | 2021 | 4 | 13 | no | high | yes |
| RVTR161549 | lil nas x | Montero Call Me By Your Name | MONTERO | 2021 | 1 | 15 | no | high | yes |
| RVTR561163 | zach top | I Never Lie | Cold Beer & Country Music | 2024 | 11 | 12 | no | high | yes |
| RVTR413430 | bailey zimmerman | Fall In Love | Fall in Love | 2022 | 1 | 4 | no | low | no |
| RVTR876953 | hudson westbrook | House Again | Texas Forever | 2025 | 7 | 17 | no | high | yes |
| RVTR806795 | keith urban duet | One Too Many | The Speed of Now, Part 1 | 2020 | 2 | 16 | no | high | yes |
| RVTR099370 | jvke | Golden Hour | this is what ____ feels like, Vol. 1-4 | 2022 | 3 | 13 | no | high | yes |
| RVTR583904 | jimin | Who | Muse | 2024 | 6 | 7 | yes | medium | no |
| RVTR114151 | nicky youre | Sunroof | Sunroof (Remixes) | 2022 | 1 | 6 | yes | medium | no |
| RVTR937884 | lil nas x | Panini | 7 | 2019 | 2 | 8 | no | high | yes |
| RVTR836575 | lola young | Messy | This Wasn’t Meant For You Anyway | 2024 | 5 | 10 | no | high | yes |
| RVTR708359 | jelly roll | I Am Not Okay | Beautifully Broken | 2024 | 4 | 14 | no | high | yes |
| RVTR083111 | corey kent | Wild As Her | Blacktop | 2023 | 1 | 10 | no | high | yes |
| RVTR006517 | sam barber | Indigo | Restless Mind | 2024 | 18 | 28 | no | high | yes |
| RVTR740918 | jessie j, ariana grande | Bang Bang | My Everything | 2014 | 13 | 15 | yes | high | yes |
| RVTR647958 | lizzo | Good As Hell | Coconut Oil | 2022 | 5 | 6 | yes | medium | no |
| RVTR433840 | dababy | Bop | KIRK | 2019 | 3 | 13 | no | high | yes |
| RVTR384339 | offset | Ric Flair Drip | Without Warning | 2017 | 3 | 10 | no | high | yes |
| RVTR133983 | olivia rodrigo | Deja Vu | SOUR | 2021 | 5 | 11 | no | high | yes |
| RVTR637112 | internet money | Lemonade | B4 the Storm | 2020 | 17 | 17 | no | high | yes |
| RVTR790556 | doechii | What It Is Block Boy | What It Is (Versions) | 2023 | 1 | 6 | no | medium | no |
| RVTR594393 | benson boone | Slow It Down | Fireworks & Rollerblades | 2024 | 3 | 15 | no | high | yes |
| RVTR008277 | real boston richey | Help Me | Richey Rich | 2024 | 9 | 24 | no | high | yes |
| RVTR231901 | olivia rodrigo | Drivers License | SOUR | 2021 | 3 | 15 | no | high | yes |
| RVTR999347 | megan thee stallion | Savage | Suga | 2020 | 2 | 9 | no | high | yes |
| RVTR863901 | usher, summer walker | Good Good | COMING HOME | 2024 | 2 | 20 | yes | high | yes |
| RVTR379810 | megan moroney | Tennessee Orange | Lucky | 2023 | 3 | 13 | no | high | yes |
| RVTR348967 | jelly roll | Son Of A Sinner | City Sessions (Amazon Music Live) | 2022 | 2 | 5 | no | low | no |
| RVTR752773 | jay z | Holy Grail | Magna Carta… Holy Grail | 2013 | 1 | 16 | no | high | yes |
| RVTR761264 | toosii | Favorite Song | NAUJOUR | 2023 | 7 | 19 | no | high | yes |
| RVTR434258 | polo g | Pop Out | Die a Legend | 2019 | 5 | 14 | no | high | yes |
| RVTR339718 | benson boone | Mystical Magical | American Heart | 2025 | 4 | 10 | no | high | yes |
| RVTR629242 | tate mcrae | Revolving Door | So Close to What | 2025 | 2 | 16 | no | high | yes |
| RVTR288699 | rod wave | Heart On Ice | PTSD | 2019 | 4 | 12 | no | high | yes |
| RVTR645161 | black eyed peas x j balvin | Ritmo Bad Boys For Life | TRANSLATION | 2020 | 1 | 15 | yes | high | yes |
| RVTR096393 | calboy | Envy Me | Wildboy | 2019 | 1 | 10 | no | high | yes |
| RVTR000415 | bailey zimmerman | Where It Ends | Where It Ends | 2022 | 1 | 5 | no | low | no |
| RVTR052810 | The Anxiety: Willow | Meet Me At Our Spot | THE ANXIETY | 2020 | 8 | 10 | no | high | yes |
| RVTR715270 | max mcnown | Better Me For You Brown Eyes | Night Diving (The Cost of Growing Up) | 2025 | 2 | 21 | no | high | yes |
| RVTR060615 | shaboozey | Amen | 2025-06-29: Glastonbury Festival, Pilton, UK | 2025 | 8 | 10 | yes | reject | no |
| RVTR580363 | ernest | Flower Shops | FLOWER SHOPS (THE ALBUM) | 2022 | 6 | 11 | no | high | yes |
| RVTR975929 | don toliver | No Pole | Love Sick | 2023 | 1 | 20 | no | high | yes |
| RVTR668403 | *nsync | It'S Gonna Be Me | No Strings Attached (special UK edition) | 2000 | 2 | 16 | no | high | yes |
| RVTR822129 | zach bryan | Pink Skies | The Great American Bar Scene | 2024 | 18 | 19 | no | high | yes |
| RVTR117657 | jay-z + mr. hudson | Young Forever | The Blueprint 3 | 2009 | 15 | 15 | no | high | yes |
| RVTR209202 | bailey zimmerman | Religiously | Religiously. The Album. | 2023 | 1 | 16 | no | high | yes |
| RVTR128342 | trillville | Some Cut | The King of Crunk & BME Recordings Present Welcome to Trillville USA | 2004 | 19 | 21 | no | high | yes |
| RVTR874378 | chappell roan | Hot To Go | Live at Lollapalooza 2024 | 2024 | 7 | 14 | yes | reject | no |
| RVTR869751 | justin timberlake duet | Until The End Of Time | FutureSex/LoveSounds | 2007 | 10 | 28 | no | high | yes |
| RVTR987717 | blake shelton duet | Nobody But You | Fully Loaded: God’s Country | 2019 | 3 | 12 | no | high | yes |
| RVTR867656 | niko moon | Good Time | GOOD TIME | 2020 | 1 | 5 | yes | low | no |
| RVTR644690 | flipp dinero | Leave Me Alone | LOVE FOR GUALA | 2019 | 12 | 13 | no | high | yes |
| RVTR673279 | mustard | Pure Water | Perfect Ten | 2019 | 2 | 10 | no | high | yes |
| RVTR305431 | glorilla | Yeah Glo | Yeah Glo! (alternate versions) | 2024 | 1 | 10 | no | high | yes |
| RVTR679935 | megan moroney | 6 Months Later | Cloud 9 | 2026 | 3 | 17 | no | high | yes |
| RVTR806093 | hardy | One Beer | A ROCK | 2020 | 7 | 12 | no | high | yes |
| RVTR028780 | yk osiris | Worth It | The Golden Child | 2019 | 1 | 15 | no | high | yes |
| RVTR328969 | kool | Misled | Emergency | 1984 | 3 | 7 | yes | medium | no |
| RVTR772227 | k-ci | Crazy | X | 2000 | 4 | 13 | no | high | yes |
| RVTR543061 | *nsync | Gone | Celebrity | 2001 | 6 | 14 | no | high | yes |
| RVTR653779 | glorilla | Wanna Be | Ehhthang Ehhthang | 2024 | 5 | 12 | no | high | yes |
| RVTR996232 | ella langley | Weren'T For The Wind | still hungover | 2024 | 16 | 19 | no | high | yes |
| RVTR026373 | noah kahan | Dial Drunk | Stick Season (We’ll All Be Here Forever) | 2023 | 16 | 21 | no | high | yes |
| RVTR723877 | ella langley | You Look Like You Love Me | hungover | 2024 | 3 | 14 | no | high | yes |
| RVTR053492 | p. diddy | I Need A Girl Part One | P. Diddy & Bad Boy Records Present… We Invented the Remix | 2002 | 5 | 14 | yes | reject | no |
| RVTR462112 | johnny horton | North To Alaska | North to Alaska | 1960 | 1 | 4 | yes | low | no |
| RVTR681698 | lana del rey vs. cedric gervais | Summertime Sadness | Video Collection | 2015 | 13 | 19 | yes | reject | no |
| RVTR744211 | pooh shiesty | Back In Blood | Shiesty Season | 2021 | 2 | 17 | no | high | yes |
| RVTR445499 | tate mcrae | Sports Car | So Close to What | 2025 | 6 | 16 | no | high | yes |
| RVTR910463 | yung bleu | You'Re Mines Still | Love Scars: The 5 Stages of Emotions | 2020 | 3 | 6 | yes | medium | no |
| RVTR978606 | gabby barrett | The Good Ones | Goldmine (Deluxe) | 2021 | 7 | 17 | yes | high | yes |
| RVTR467439 | lainey wilson | Heart Like A Truck | Bell Bottom Country | 2022 | 9 | 16 | no | high | yes |
| RVTR935228 | louis armstrong and the all stars | Hello Dolly | “Satchmo”: Ambassador of Jazz | 2011 | 12 | 189 | yes | low | no |
| RVTR534540 | lil tjay | Calling My Phone | Destined 2 Win | 2021 | 3 | 21 | no | high | yes |
| RVTR163787 | *nsync | God Must Have Spent A Little More Time On You | *NSYNC | 1998 | 5 | 13 | no | high | yes |
| RVTR416958 | glorilla | Tomorrow 2 | Anyways, Life’s Great… | 2022 | 3 | 9 | no | high | yes |
| RVTR434044 | cj | Whoopty | Loyalty Over Royalty | 2021 | 4 | 8 | no | high | yes |
| RVTR748529 | captain | You Never Done It Like That | Dream | 1978 | 2 | 11 | yes | high | yes |
| RVTR934731 | rod wave | Tombstone | SoulFly | 2021 | 5 | 19 | no | high | yes |
| RVTR236748 | glorilla | Whatchu Kno About Me | GLORIOUS | 2024 | 5 | 15 | no | high | yes |
| RVTR004081 | glorilla | Tgif | TGIF (alternate versions) | 2024 | 1 | 5 | no | low | no |
| RVTR442172 | kirko bangz | Drank In My Cup | Progression 2: A Young Texas Playa | 2012 | 2 | 13 | no | high | yes |
| RVTR288868 | parker mccollum | Pretty Heart | Hollywood Gold | 2020 | 3 | 6 | yes | medium | no |
| RVTR619107 | forrest frank | Your Way'S Better | CHILD OF GOD II | 2025 | 2 | 20 | no | high | yes |
| RVTR051387 | lloyd price | Stagger Lee | Stagger Lee | 1976 | 2 | 9 | yes | low | no |
| RVTR584076 | percy faith and his orchestra | The Theme From A Summer Place | A Summer Place | 1971 | 1 | 10 | yes | low | no |
| RVTR933807 | natural selection | Do Anything | Natural Selection | 1991 | 1 | 10 | no | high | yes |
| RVTR226085 | prince and the n.p.g | Diamonds And Pearls | Sound & Vision 2 | 1996 | 3 | 40 | yes | low | no |
| RVTR189848 | migos, nicki minaj | Motorsport | Essentials | 2019 | 11 | 30 | yes | medium | no |
| RVTR143709 | t.i | Bring Em Out | Urban Legend | 2004 | 13 | 19 | no | high | yes |
| RVTR656114 | flo milli | Never Lose Me | Fine Ho, Stay | 2024 | 5 | 14 | no | high | yes |
| RVTR233564 | gracie abrams | I Love You I'M Sorry | The Secret of Us (deluxe) | 2024 | 4 | 22 | no | high | yes |
| RVTR600025 | men | Pop Goes The World | Pop Goes the World | 1987 | 2 | 13 | yes | high | yes |
| RVTR222495 | ta mara | Everybody Dance | Ta Mara and The Seen | 1985 | 1 | 8 | yes | high | yes |
| RVTR915511 | katseye | Gabriela | BEAUTIFUL CHAOS | 2025 | 2 | 5 | yes | low | no |
| RVTR052886 | bob beckham | Just As Much As Ever | Just As Much As Ever | 1959 | 4 | 12 | yes | high | yes |
| RVTR021293 | lainey wilson | Somewhere Over Laredo | Whirlwind (deluxe) | 2025 | 15 | 19 | no | high | yes |
| RVTR093737 | tems | Free Mind | For Broken Ears | 2020 | 3 | 7 | yes | medium | no |
| RVTR027070 | gracie abrams | Close To You | The Secret of Us | 2024 | 13 | 13 | no | high | yes |
| RVTR505130 | fuerza regida | Marlboro Rojo | 111XPANTIA | 2025 | 9 | 12 | no | high | yes |
| RVTR810883 | prince and the n.p.g | Cream | Sound & Vision 2 | 1996 | 9 | 40 | yes | low | no |
| RVTR995152 | earth, wind | Shining Star | Gratitude | 1975 | 1 | 13 | yes | high | yes |
| RVTR207600 | polo g | Rapstar | Hall of Fame | 2021 | 2 | 20 | no | high | yes |
| RVTR281326 | captain | Muskrat Love | Song of Joy | 1976 | 8 | 11 | yes | high | yes |
| RVTR623021 | ice spice | Princess Diana | Like..? | 2023 | 2 | 6 | yes | medium | no |
| RVTR595549 | silk sonic | Smokin Out The Window | An Evening With Silk Sonic | 2021 | 5 | 9 | no | high | yes |
| RVTR546593 | karol g x shakira | Tqg | MAÑANA SERÁ BONITO | 2023 | 6 | 17 | yes | high | yes |
| RVTR299193 | doechii | Anxiety | Alligator Bites Never Heal | 2025 | 20 | 20 | no | high | yes |
| RVTR715869 | olivia rodrigo | Get Him Back | GUTS | 2023 | 8 | 12 | no | high | yes |
| RVTR148995 | pop smoke | The Woo | Meet the Woo, v.1 Mixtape | 2019 | 1 | 9 | no | reject | no |
| RVTR067949 | young thug, j. cole | The London | So Much Fun | 2019 | 19 | 19 | yes | high | yes |
| RVTR110050 | rod wave | Rags2Riches | Pray 4 Love | 2020 | 6 | 14 | no | high | yes |
| RVTR427814 | megan thee stallion | Body | Good News | 2020 | 8 | 17 | no | high | yes |
| RVTR561333 | zach bryan | Hey Driver | Zach Bryan | 2023 | 5 | 16 | no | high | yes |
| RVTR916833 | zach bryan | 28 | The Great American Bar Scene | 2024 | 4 | 19 | no | high | yes |
| RVTR959225 | becky g x karol g | Mamiii | ESQUEMAS | 2022 | 14 | 14 | yes | high | yes |
| RVTR034194 | megan thee stallion | Thot Shit | Something for Thee Hotties | 2021 | 20 | 21 | no | high | yes |
| RVTR273187 | doja cat | Streets | Hot Pink | 2021 | 9 | 30 | no | high | yes |
| RVTR371002 | rod wave | Fight The Feeling | Nostalgia | 2023 | 9 | 18 | no | high | yes |
| RVTR315273 | pop smoke | Mood Swings | Shoot for the Stars Aim for the Moon | 2020 | 13 | 19 | no | high | yes |
| RVTR015921 | sexyy red | Get It Sexyy | Get It Sexyy - Versions EP | 2024 | 1 | 8 | yes | high | yes |
| RVTR743475 | tate mcrae | It'S Ok I'M Ok | So Close to What | 2025 | 10 | 16 | no | high | yes |
| RVTR697074 | fun | Carry On | Before Shane Went to Bangkok: Live in the USA | 2013 | 3 | 6 | yes | medium | no |
| RVTR095957 | The Fuzz | I Love You For All Seasons | The Fuzz | 1971 | 13 | 13 | yes | high | yes |
| RVTR856858 | jay rock, kendrick lamar, future | King'S Dead | Black Panther: The Album (Music From and Inspired By) | 2018 | 9 | 14 | yes | high | yes |
| RVTR255148 | lainey wilson | Watermelon Moonshine | Bell Bottom Country | 2023 | 4 | 16 | no | high | yes |
| RVTR105372 | nate smith | World On Fire | NATE SMITH (DELUXE) | 2023 | 21 | 27 | yes | high | yes |
| RVTR278085 | saweetie | My Type | ICY | 2019 | 3 | 7 | yes | medium | no |
| RVTR525265 | dababy | Vibez | KIRK | 2019 | 4 | 13 | no | high | yes |
| RVTR947783 | oscar maydon | Tu Boda | rico o muerto, vol. 1 | 2025 | 7 | 12 | no | high | yes |
| RVTR012021 | t.i | U Don'T Know Me | Urban Legend | 2005 | 3 | 18 | no | high | yes |
| RVTR751333 | brooks | Ain'T Nothing 'Bout You | Steers and Stripes | 2001 | 8 | 15 | no | high | yes |
| RVTR685685 | brooks | Red Dirt Road | Red Dirt Road | 2003 | 5 | 15 | no | high | yes |
| RVTR070534 | ahmad | Back In The Day | Ahmad | 1994 | 2 | 12 | no | high | yes |
| RVTR217791 | lidell townsell | Nu Nu | Nu Nu | 1992 | 1 | 6 | yes | medium | no |
| RVTR841223 | cali swag district | Teach Me How To Dougie | The Kickback | 2010 | 4 | 12 | no | high | yes |
| RVTR417908 | megan thee stallion | Cry Baby | Good News | 2020 | 3 | 17 | no | high | yes |
| RVTR386579 | t.i | Top Back | King | 2006 | 9 | 17 | no | high | yes |
| RVTR048231 | bailey zimmerman | Backup Plan | Different Night Same Rodeo | 2025 | 9 | 18 | no | high | yes |
| RVTR310233 | parmalee x blanco brown | Just The Way | For You | 2021 | 2 | 13 | yes | high | yes |
| RVTR150633 | mooski | Track Star | Melodic Therapy 4 the Broken | 2022 | 3 | 13 | no | high | yes |
| RVTR152390 | she moves | Breaking All The Rules | Breaking All the Rules | 1997 | 1 | 12 | no | high | yes |
| RVTR881310 | machine gun kelly x blackbear | My Ex'S Best Friend | Tickets to My Downfall | 2020 | 11 | 15 | yes | high | yes |
| RVTR178137 | olivia rodrigo | Good 4 U | SOUR | 2021 | 6 | 11 | no | high | yes |
| RVTR432083 | jack harlow | Whats Poppin | Sweet Action | 2020 | 1 | 7 | yes | medium | no |
| RVTR029636 | latto | Big Energy | 777 | 2022 | 4 | 13 | yes | high | yes |
| RVTR728668 | metro boomin, the weeknd | Creepin' | HEROES & VILLAINS | 2022 | 10 | 15 | yes | high | yes |
| RVTR491036 | jelly roll | Need A Favor | Whitsitt Chapel | 2023 | 11 | 13 | no | high | yes |
| RVTR621886 | lil nas x | Thats What I Want | MONTERO | 2021 | 4 | 15 | no | high | yes |
| RVTR289772 | pop smoke | For The Night | Shoot for the Stars Aim for the Moon | 2020 | 3 | 19 | no | high | yes |
| RVTR738687 | tucker wetmore | Wind Up Missin' You | Waves on a Sunset | 2024 | 4 | 8 | no | high | yes |
| RVTR366039 | dababy | Rockstar | BLAME IT ON BABY | 2020 | 7 | 13 | no | high | yes |
| RVTR966372 | lizzo | About Damn Time | Special | 2022 | 2 | 12 | yes | high | yes |
| RVTR477621 | hardy | Truck Bed | the mockingbird & THE CROW | 2023 | 12 | 17 | no | high | yes |
| RVTR949161 | megan moroney | Am I Okay | Am I Okay? | 2024 | 1 | 14 | no | high | yes |
| RVTR323637 | The Kid Laroi | Without You | F*CK LOVE (SAVAGE) | 2020 | 7 | 22 | yes | high | yes |
| RVTR130508 | riley green | Worst Way | Way Out Here | 2024 | 7 | 7 | yes | medium | no |
| RVTR132639 | sombr | Back To Friends | I Barely Know Her | 2025 | 4 | 10 | yes | high | yes |
| RVTR107414 | steve lacy | Bad Habit | Gemini Rights | 2022 | 5 | 10 | yes | high | yes |
| RVTR270272 | t.i | Whatever You Like | Paper Trail | 2008 | 6 | 21 | no | high | yes |
| RVTR498516 | voices of theory | Say It | Voices of Theory | 1998 | 4 | 12 | yes | high | yes |
| RVTR061822 | jack harlow | First Class | Come Home the Kids Miss You | 2022 | 4 | 17 | yes | high | yes |
| RVTR557197 | bigxthaplug | All The Way | I Hope You're Happy (Commentary Version) | 2025 | 5 | 16 | yes | high | yes |
| RVTR719866 | mariah the scientist | Burning Blue | Hearts Sold Separately | 2025 | 5 | 10 | yes | high | yes |
| RVTR773442 | tony! toni! tone! | Feels Good | The Revival | 1990 | 1 | 14 | yes | high | yes |
| RVTR705174 | jelly roll | Liar | Beautifully Broken | 2024 | 7 | 14 | no | high | yes |
| RVTR772849 | billie ray martin | Your Loving Arms | Deadline for My Memories | 1995 | 12 | 14 | yes | high | yes |
| RVTR654172 | mumford | Little Lion Man | 2010-06-20: Telluride Bliegrass Festival, Telluride, CO | 2010 | 7 | 14 | yes | reject | no |
| RVTR687475 | megan thee stallion | Sweetest Pie | Traumazine | 2022 | 18 | 18 | no | high | yes |
| RVTR606256 | donnie brooks | Mission Bell | The Happiest | 1961 | 3 | 12 | yes | high | yes |
| RVTR699308 | The Kiki Dee Band | I'Ve Got The Music In Me | I’ve Got the Music in Me | 1974 | 1 | 9 | yes | high | yes |
| RVTR151707 | boy krazy | That'S What Love Can Do | Boy Krazy | 1993 | 1 | 10 | yes | high | yes |
| RVTR587162 | mumford | The Cave | 2010-06-20: Telluride Bliegrass Festival, Telluride, CO | 2010 | 2 | 14 | yes | reject | no |
| RVTR395644 | brooks | Only In America | Steers and Stripes | 2001 | 1 | 14 | no | high | yes |
| RVTR506672 | jack harlow | Tyler Herro | That’s What They All Say | 2020 | 11 | 15 | yes | high | yes |
| RVTR116862 | tate mcrae | Exes | THINK LATER | 2023 | 7 | 14 | no | high | yes |
| RVTR955989 | steve azar | I Don'T Have To Be Me 'Til Monday | Waitin’ on Joe | 2002 | 1 | 11 | yes | high | yes |
| RVTR823758 | peso pluma, gabito ballesteros | Lady Gaga | GÉNESIS | 2023 | 10 | 17 | yes | high | yes |
| RVTR052723 | lisa keith | Better Than You | Walkin' in the Sun | 1993 | 2 | 15 | yes | high | yes |
| RVTR493550 | big | Lost In This Moment | Big & Rich's Super Galactic Fan Pak 2 | 2008 | 5 | 17 | yes | high | yes |
| RVTR179618 | nle choppa | Shotta Flow | Cottonwood | 2019 | 8 | 9 | yes | high | yes |
| RVTR871674 | megan thee stallion | Cash Shit | Fever | 2019 | 4 | 14 | no | high | yes |
| RVTR344180 | nle choppa | Camelot | Top Shotta | 2020 | 4 | 20 | yes | high | yes |
| RVTR528626 | summer walker x drake | Girls Need Love | Last Day of Summer | 2019 | 3 | 13 | yes | high | yes |
| RVTR902222 | nate smith | Bulletproof | Through the Smoke | 2024 | 1 | 7 | yes | medium | no |
| RVTR188643 | nle choppa | Walk Em Down | Top Shotta | 2020 | 5 | 20 | yes | high | yes |
| RVTR310377 | hootie | Tucker'S Town | Fairweather Johnson | 1996 | 3 | 14 | yes | high | yes |
| RVTR465393 | brooks | You Can'T Take The Honky Tonk Out Of The Girl | Red Dirt Road | 2003 | 1 | 15 | no | high | yes |
| RVTR599016 | offset | Clout | FATHER OF 4 | 2019 | 12 | 16 | no | high | yes |
| RVTR421471 | brooks | The Long Goodbye | Steers and Stripes | 2001 | 3 | 14 | no | high | yes |
| RVTR818297 | rupee | Tempted To Touch | 1 on 1 | 2004 | 1 | 14 | yes | high | yes |
| RVTR177955 | fuerza regida | Harley Quinn | Pa Las Baby's y Belikeada | 2023 | 15 | 30 | no | high | yes |
| RVTR502762 | chappell roan | Red Wine Supernova | 2024-06-16_ Bonnaroo Music and Arts Festival | 2024 | 12 | 15 | yes | reject | no |
| RVTR368055 | gina thompson | The Things That You Do | Nobody Does It Better | 1996 | 2 | 15 | yes | high | yes |
| RVTR218265 | keyshia cole introducing amina | Shoulda Let You Go | Just Like You | 2007 | 6 | 15 | yes | high | yes |
| RVTR045340 | doja cat | Juicy | Amala (deluxe) | 2019 | 14 | 16 | no | high | yes |
| RVTR451554 | brent faiyaz | All Mine | WASTELAND | 2022 | 6 | 19 | yes | high | yes |
| RVTR964066 | h.e.r | Slide | Back of My Mind | 2021 | 21 | 21 | yes | high | yes |
| RVTR762746 | neton vega | Loco | Mi Vida Mi Muerte | 2025 | 10 | 21 | yes | high | yes |
| RVTR850333 | young thug and travis scott | Pick Up The Phone | JEFFERY | 2016 | 10 | 10 | yes | high | yes |
| RVTR449188 | myke towers | Lala | LA VIDA ES UNA | 2023 | 4 | 23 | yes | high | yes |
| RVTR180181 | gary barlow | So Help Me Girl | Open Road | 1997 | 2 | 14 | yes | high | yes |
| RVTR844154 | h.e.r | Damage | Back of My Mind | 2021 | 4 | 22 | yes | high | yes |
| RVTR701686 | rich gang | Tapout | Rich Gang | 2013 | 3 | 18 | yes | high | yes |
| RVTR156269 | iv xample | I'D Rather Be Alone | For Example | 1995 | 1 | 13 | yes | high | yes |
| RVTR868863 | brooks | Cowgirls Don'T Cry | Cowboy Town | 2008 | 4 | 15 | no | high | yes |
| RVTR950486 | chayce beckham | 23 | Bad for Me | 2024 | 13 | 13 | yes | high | yes |
| RVTR051867 | lainey wilson | 4X4Xu | Good Horses | 2024 | 3 | 4 | no | low | no |
| RVTR421921 | fun factory | I Wanna B With U | Fun-Tastic | 1995 | 7 | 12 | yes | high | yes |
| RVTR511739 | 4.0 | Have A Little Mercy | 4.0 | 1997 | 2 | 14 | yes | high | yes |
| RVTR479269 | icy blu | I Wanna Be Your Girl | Icy Blu | 1991 | 3 | 10 | yes | high | yes |
| RVTR024757 | loverance | Up | Freak Of The Industry | 2012 | 2 | 26 | yes | high | yes |
| RVTR766464 | k-ci | Last Night'S Letter | Love Always | 1997 | 2 | 12 | no | high | yes |
| RVTR276687 | l.a.d | Ridin' Low | Ridin' Low | 1995 | 1 | 11 | yes | high | yes |
| RVTR786036 | ingrid andress | Wishful Drinking | Apple Music Sessions: Ingrid Andress | 2022 | 2 | 6 | yes | medium | no |
| RVTR437742 | The Kid Laroi | Nights Like This | THE FIRST TIME | 2024 | 4 | 28 | yes | high | yes |
| RVTR889645 | fuerza regida | Me Jalo | MALA MÍA | 2025 | 1 | 5 | no | low | no |
| RVTR345187 | bossman dlow | Get In With Me | Mr. Beat the Road | 2024 | 5 | 17 | yes | high | yes |
| RVTR654405 | lisette melendez | A Day In My Life Without You | Together Forever | 1991 | 2 | 12 | yes | high | yes |
| RVTR444264 | lil tecca | 500Lbs | TEC | 2023 | 4 | 16 | yes | high | yes |
| RVTR519720 | The Movement | Jump | The Movement | 1992 | 1 | 10 | yes | high | yes |
| RVTR530242 | huey lewis | But It'S Alright | Four Chords & Several Years Ago | 1994 | 5 | 17 | yes | high | yes |
| RVTR259860 | maddie | Girl In A Country Song | Maddie & Tae EP | 2014 | 1 | 4 | yes | low | no |
| RVTR719913 | yankee grey | All Things Considered | Untamed | 1999 | 1 | 10 | yes | high | yes |
| RVTR842820 | dababy | Baby Sitter | Baby On Baby (Chopped Not Slopped by Slim K) | 2019 | 13 | 13 | no | high | yes |
| RVTR915646 | mc luscious | Boom I Got Your Boyfriend | Boom! | 1991 | 1 | 9 | yes | high | yes |
| RVTR801923 | nu flavor | Sweet Sexy Thing | Nu Flavor | 1997 | 2 | 23 | yes | high | yes |
| RVTR773031 | coco jones | Icu | What I Didn’t Tell You (Deluxe) | 2023 | 4 | 11 | yes | high | yes |
| RVTR616394 | bigxthaplug | Mmhmm | THE BIGGEST | 2023 | 3 | 7 | yes | medium | no |
| RVTR600117 | morray | Quicksand | Street Sermons | 2021 | 3 | 14 | yes | high | yes |
| RVTR107529 | grupo frontera | El Amor De Su Vida | El comienzo | 2023 | 7 | 11 | yes | high | yes |
| RVTR548768 | The Red Clay Strays | Wondering Why | Moment of Truth | 2022 | 4 | 12 | yes | high | yes |
| RVTR548658 | zach bryan | Oklahoma Smokeshow | Summertime Blues | 2022 | 4 | 9 | no | high | yes |
| RVTR552200 | too short | Shake That Monkey | Mack or Die Bootleg | 2006 | 6 | 30 | yes | medium | no |
| RVTR419346 | sly | Everyday People | The History of Rock, Volume Seventeen | 1983 | 9 | 25 | yes | low | no |
| RVTR958773 | bill | Lean On Me | Still Bill | 1972 | 5 | 10 | yes | high | yes |
| RVTR423237 | paul mccartney and stevie wonder | Ebony And Ivory | Tug of War | 1982 | 12 | 12 | yes | high | yes |
| RVTR165316 | joey dee | Peppermint Twist Part I | Doin’ the Twist at the Peppermint Lounge | 1961 | 1 | 10 | yes | high | yes |
| RVTR457310 | jung kook | Standing Next To You | GOLDEN | 2023 | 4 | 14 | yes | high | yes |
| RVTR160185 | olivia rodrigo | Bad Idea Right | GUTS | 2023 | 2 | 12 | no | high | yes |
| RVTR521270 | mouth | How Do You Do | The Best Of | 1980 | 1 | 12 | yes | reject | no |
| RVTR547601 | ray parker jr | I Still Can'T Get Over Loving You | Woman Out Of Control | 1983 | 2 | 8 | yes | high | yes |
| RVTR726260 | baby keem | Family Ties | The Melodic Blue | 2021 | 10 | 16 | yes | high | yes |
| RVTR933285 | roger voudouris | Get Used To It | Radio Dream | 1979 | 1 | 9 | yes | high | yes |
| RVTR058331 | jameson rodgers | Cold Beer Calling My Name | Bet You’re From a Small Town | 2021 | 12 | 15 | yes | high | yes |
| RVTR997176 | elvie shane | My Boy | Backslider | 2021 | 10 | 15 | yes | high | yes |
| RVTR796558 | metro boomin, travis scott | Trance | HEROES & VILLAINS | 2022 | 6 | 15 | yes | high | yes |
| RVTR997353 | billy lawrence | Come On | Paradise | 1997 | 2 | 13 | yes | high | yes |
| RVTR726428 | yung l.a | Ain'T I | Offset Shawty | 2010 | 7 | 42 | yes | high | yes |
| RVTR300969 | 310babii | Soak City | Lottery Pick | 2023 | 14 | 15 | yes | high | yes |
| RVTR667495 | rod wave | By Your Side | Beautiful Mind | 2022 | 23 | 24 | no | high | yes |
| RVTR012919 | brooks | Believe | Ephemeral | 2005 | 13 | 14 | no | high | yes |
| RVTR870651 | bigxthaplug | The Largest | TAKE CARE | 2024 | 12 | 15 | yes | high | yes |
| RVTR323352 | dee dee sharp | Mashed Potato Time | It's Mashed Potato Time | 1962 | 7 | 12 | yes | high | yes |
| RVTR493120 | seals | Summer Breeze | Summer Breeze | 1972 | 4 | 10 | yes | high | yes |
| RVTR501659 | seals | Diamond Girl | Diamond Girl | 1973 | 1 | 10 | yes | high | yes |
| RVTR450936 | The Fantastic Johnny C | Boogaloo Down Broadway | Boogaloo Down Broadway | 1968 | 1 | 12 | yes | high | yes |
| RVTR818554 | earth, wind | Serpentine Fire | All 'n All | 1977 | 1 | 8 | yes | high | yes |
| RVTR735015 | scarlett | You Don'T Know | Scarlett and Black | 1988 | 1 | 10 | yes | high | yes |
| RVTR996488 | think | Once You Understand | Encounter | 1971 | 1 | 8 | yes | high | yes |
| RVTR785627 | megan thee stallion | Girls In The Hood | Good News | 2020 | 16 | 17 | no | high | yes |
| RVTR853371 | run-d.m.c | You Be Illin' | Raising Hell | 1986 | 9 | 12 | yes | high | yes |
| RVTR797858 | mashmakhan | As The Years Go By | Mashmakhan | 1970 | 3 | 10 | yes | high | yes |
| RVTR585454 | henry mancini and his orchestra | Days Of Wine And Roses | Our Man in Hollywood | 1963 | 1 | 12 | yes | high | yes |
| RVTR428982 | ike | I Want To Take You Higher | What You Hear Is What You Get - Live At Carnegie Hall | 1971 | 4 | 17 | yes | reject | no |
| RVTR334846 | don toliver | Bandit | HARDSTONE PSYCHO | 2024 | 1 | 16 | no | high | yes |
| RVTR004813 | nice | Sometimes I Rhyme Slow | Ain’t a Damn Thing Changed | 1991 | 4 | 12 | yes | high | yes |
| RVTR498971 | peso pluma | La Patrulla | ÉXODO | 2024 | 3 | 24 | yes | high | yes |
| RVTR281674 | doja cat | Like That | 100% Doja Cat | 2021 | 24 | 50 | no | high | yes |
| RVTR124673 | bryan martin | We Ride | Poets & Old Souls | 2023 | 2 | 9 | yes | high | yes |
| RVTR522711 | dis `n' dat | Freak Me Baby | Bumpin' | 1994 | 4 | 10 | yes | high | yes |
| RVTR138069 | h.e.r | Come Through | Prime Day Show x H.E.R. | 2021 | 3 | 6 | yes | medium | no |
| RVTR085645 | The Last Goodnight | Pictures Of You | Poison Kiss | 2007 | 3 | 12 | yes | high | yes |
| RVTR692835 | eminem, dr. dre | Crack A Bottle | Relapse | 2009 | 18 | 26 | yes | high | yes |
| RVTR287431 | hamilton, joe frank | Fallin' In Love | Fallin' in Love | 1975 | 5 | 10 | yes | high | yes |
| RVTR363414 | kathy young | A Thousand Stars | The Sound of Kathy Young | 1961 | 1 | 12 | yes | high | yes |
| RVTR716829 | earth, wind | Sing A Song | The Complete Columbia Masters | 1987 | 48 | 200 | yes | low | no |
| RVTR149313 | james newton howard | The Hanging Tree | The Hunger Games: Mockingjay, Pt. 1 (Original Motion Picture Score) | 2014 | 11 | 23 | yes | high | yes |
| RVTR475352 | sly | If You Want Me To Stay | Fresh | 1973 | 2 | 11 | yes | high | yes |
| RVTR198125 | stone poneys | Different Drum | Evergreen, Vol. 2 | 1967 | 7 | 12 | yes | high | yes |
| RVTR057917 | ray parker jr | Jamie | Chartbusters | 1984 | 1 | 9 | yes | high | yes |
| RVTR631037 | fancy | Wild Thing | Wild Thing | 1974 | 1 | 10 | yes | high | yes |
| RVTR808263 | frankie avalon | I'Ll Wait For You | The Hit Makers | 1960 | 3 | 12 | yes | medium | no |
| RVTR445621 | bia | Whole Lotta Money | FOR CERTAIN (deluxe) | 2021 | 3 | 14 | yes | high | yes |
| RVTR871178 | The Buoys | Timothy | The Buoys | 1971 | 6 | 10 | yes | high | yes |
| RVTR955840 | aly | Potential Breakup Song | Insomniatic | 2007 | 1 | 12 | yes | high | yes |
| RVTR560353 | central cee | Band4Band | CAN’T RUSH GREATNESS | 2025 | 13 | 17 | yes | high | yes |
| RVTR208900 | carl dobkins, jr | Lucky Devil | My Heart Is an Open Book | 1994 | 5 | 30 | yes | low | no |
| RVTR345009 | lil tecca | Dark Thoughts | DOPAMINE : THE RUSH | 2025 | 1 | 21 | yes | high | yes |
| RVTR498864 | v.i.c | Get Silly | Beast | 2008 | 6 | 19 | yes | high | yes |
| RVTR181667 | rod wave | Great Gatsby | Nostalgia | 2023 | 13 | 18 | no | high | yes |
| RVTR561183 | The Original Caste | One Tin Soldier | One Tin Soldier | 1969 | 1 | 10 | yes | high | yes |
| RVTR744471 | brooks | Play Something Country | Hillbilly Deluxe | 2005 | 1 | 13 | no | high | yes |
| RVTR752449 | yc | Racks | Got Racks | 2011 | 6 | 17 | yes | high | yes |
| RVTR426236 | sexyy red | U My Everything | In Sexyy We Trust | 2024 | 4 | 14 | yes | high | yes |
| RVTR655407 | sleepy hallow | 2055 | Still Sleep? | 2021 | 4 | 14 | yes | high | yes |
| RVTR635293 | twice | Strategy | #TWICE5 | 2025 | 8 | 8 | yes | high | yes |
| RVTR207720 | gavin adcock | Last One To Know | Own Worst Enemy | 2025 | 8 | 24 | yes | high | yes |
| RVTR854152 | chaka demus | Murder She Wrote | All She Wrote | 1993 | 2 | 14 | yes | high | yes |
| RVTR252753 | sound factory | Understand This Groove | Understand This Groove | 1992 | 1 | 4 | yes | low | no |
| RVTR491671 | lunay, daddy yankee | Soltera | Épico | 2019 | 7 | 14 | yes | high | yes |
| RVTR629261 | ari lennox | Pressure | age/sex/location | 2022 | 4 | 12 | yes | high | yes |
| RVTR948748 | domenico modugno | Nel Blu Dipinto Di Blu Volare | Tutto Modugno | 1972 | 8 | 72 | yes | low | no |
| RVTR211789 | bill | Ain'T No Sunshine | Just As I Am | 1971 | 2 | 12 | yes | high | yes |
| RVTR366201 | The String-a-longs | Wheels | Pick a Hit | 1961 | 1 | 12 | yes | high | yes |
| RVTR429305 | huey lewis | Hip To Be Square | Fore! | 1986 | 5 | 11 | yes | high | yes |
| RVTR284474 | clarence henry | But I Do | You Always Hurt the One You Love | 1961 | 1 | 12 | yes | high | yes |
| RVTR648460 | The Bell Notes | I'Ve Had It | I've Had It | 1959 | 1 | 4 | yes | low | no |
| RVTR302717 | frankie avalon | Just Ask Your Heart | A Whole Lotta Frankie | 1961 | 11 | 17 | yes | medium | no |
| RVTR987020 | donny | Morning Side Of The Mountain | I'm Leaving It All Up to You | 1974 | 6 | 10 | yes | high | yes |
| RVTR107326 | john cougar mellencamp | Crumblin' Down | Uh‐Huh | 1983 | 1 | 9 | yes | high | yes |
| RVTR865311 | reg owen | Manhattan Spiritual | Manhattan Spiritual | 1958 | 1 | 4 | yes | low | no |
| RVTR392165 | england dan | Nights Are Forever Without You | Nights Are Forever | 1976 | 6 | 11 | yes | high | yes |
| RVTR512977 | The Mcguire Sisters | May You Always | May You Always | 1959 | 1 | 12 | yes | high | yes |
| RVTR896781 | voices that care | Voices That Care | Voices That Care | 1991 | 1 | 4 | yes | low | no |
| RVTR980245 | earth, wind | That'S The Way Of The World | The Complete Columbia Masters | 1987 | 30 | 200 | yes | low | no |
| RVTR267751 | duane eddy and the rebelettes | Dance With The Guitar Man | The Best of Duane Eddy | 1966 | 7 | 12 | yes | reject | no |
| RVTR255528 | d.j. jazzy jeff | A Nightmare On My Street | He’s the DJ, I’m the Rapper | 1988 | 1 | 18 | yes | high | yes |
| RVTR744656 | tommy edwards | Love Is All We Need | The Morning Side Of The Mountain | 1959 | 2 | 4 | yes | low | no |
| RVTR165533 | new colony six | Things I'D Like To Say | Revelations | 1968 | 9 | 11 | yes | high | yes |
| RVTR349964 | The Blue Ridge Rangers | Jambalaya On The Bayou | Jambalaya (On the Bayou) | 1973 | 1 | 4 | yes | low | no |
| RVTR947364 | seals | You'Re The Love | Takin' It Easy | 1978 | 4 | 10 | yes | high | yes |
| RVTR573164 | kool | Emergency | Live: Let’s Go Dancing | 1999 | 13 | 13 | yes | low | no |
| RVTR958565 | england dan | It'S Sad To Belong | Dowdy Ferry Road | 1977 | 2 | 10 | yes | high | yes |
| RVTR982957 | The Bar-kays | Shake Your Rump To The Funk | Too Hot to Stop | 1976 | 5 | 8 | yes | high | yes |
| RVTR153682 | gene redding | This Heart | Blood Brother | 1974 | 5 | 9 | yes | high | yes |
| RVTR508169 | fuerza regida | Sabor Fresa | Pa Las Baby's y Belikeada | 2023 | 27 | 30 | no | high | yes |
| RVTR065302 | leslie pearl | If The Love Fits Wear It | Words & Music | 1982 | 2 | 10 | yes | high | yes |
| RVTR076170 | paul humphrey | Cool Aid | Paul Humphrey and the Cool-Aid Chemists | 1969 | 1 | 10 | yes | medium | no |
| RVTR953345 | voices of theory | Wherever You Go | Voices of Theory | 1998 | 5 | 12 | yes | high | yes |
| RVTR470500 | l.t.d | Shine On | Shine On | 1980 | 6 | 9 | yes | high | yes |
| RVTR746978 | lainey wilson | Wildflowers And Wild Horses | Bell Bottom Country | 2024 | 6 | 16 | no | high | yes |
| RVTR621185 | tenille arts | Somebody Like That | Love, Heartbreak, & Everything in Between | 2020 | 1 | 12 | yes | high | yes |
| RVTR585817 | pluto | Whim Whamiee | BOTH WAYS | 2025 | 5 | 9 | yes | high | yes |
| RVTR050489 | aftershock | Going Through The Motions | Aftershock | 1990 | 4 | 13 | yes | high | yes |
| RVTR855494 | keith martin | Never Find Someone Like You | Never Find Someone Like You | 1995 | 1 | 5 | yes | low | no |
| RVTR653943 | bailey zimmerman | Holy Smokes | Different Night Same Rodeo | 2025 | 6 | 18 | no | high | yes |
| RVTR791958 | j'son | I'Ll Never Stop Loving You | J'son | 1996 | 3 | 12 | yes | high | yes |
| RVTR595342 | rod wave | Girl Of My Dreams | Pray 4 Love | 2020 | 12 | 14 | no | high | yes |
| RVTR098129 | greg bates | Did It For The Girl | Greg Bates EP | 2012 | 5 | 5 | yes | low | no |
| RVTR820998 | bobby arvon | Until Now | Until Now | 1978 | 1 | 10 | yes | high | yes |
| RVTR687985 | vedo | You Got It | For You | 2020 | 7 | 13 | yes | high | yes |
| RVTR425591 | jay z | Part Ii On The Run | Magna Carta… Holy Grail | 2013 | 11 | 16 | no | high | yes |
| RVTR724082 | t.w.d.y | Players Holiday | Drinks on Me | 1999 | 3 | 5 | yes | low | no |
| RVTR871438 | u.s. bonds | Quarter To Three | Dance 'til Quarter to Three With U.S. Bonds | 1960 | 1 | 12 | yes | high | yes |
| RVTR931274 | peter, paul | Blowin' In The Wind | In the Wind | 1963 | 12 | 12 | yes | high | yes |
| RVTR997484 | freddy cannon | Palisades Park | Palisades Park | 1962 | 1 | 12 | yes | high | yes |
| RVTR861760 | huey lewis | Perfect World | Small World | 1988 | 3 | 10 | yes | high | yes |
| RVTR314361 | donny | I'M Leaving It All Up To You | I'm Leaving It All Up to You | 1974 | 1 | 10 | yes | high | yes |
| RVTR785053 | The Orlons | Don'T Hang Up | All the Hits by the Orlons | 1963 | 3 | 12 | yes | high | yes |
| RVTR715926 | grand funk | Bad Time | All the Girls in the World Beware!!! | 1974 | 9 | 10 | yes | high | yes |
| RVTR780022 | sonny | All I Ever Need Is You | All I Ever Need Is You | 1972 | 1 | 10 | yes | high | yes |
| RVTR260877 | ferrante | Midnight Cowboy | Midnight Cowboy | 1969 | 1 | 12 | yes | high | yes |
| RVTR751683 | robin mcnamara | Lay A Little Lovin' On Me | Lay a Little Lovin' on Me | 1970 | 11 | 11 | yes | high | yes |
| RVTR920617 | austin roberts | Something'S Wrong With Me | Austin Roberts | 1972 | 6 | 10 | yes | high | yes |
| RVTR868466 | kalin twins | Forget Me Not | The Kalin Twins | 1958 | 7 | 12 | yes | high | yes |
| RVTR938068 | delaney | Never Ending Song Of Love | Motel Shot | 1971 | 9 | 12 | yes | high | yes |
| RVTR065517 | sniff 'n' the tears | Driver'S Seat | Fickle Heart | 1979 | 1 | 11 | yes | high | yes |
| RVTR877240 | keedy | Save Some Love | Chase the Clouds | 1991 | 1 | 10 | yes | high | yes |
| RVTR997381 | The Demensions | Over The Rainbow | My Foolish Heart | 1963 | 9 | 12 | yes | medium | no |
| RVTR304608 | The Ames Brothers | Pussy Cat | The Very Best of the Ames Brothers | 1998 | 16 | 20 | yes | reject | no |
| RVTR513956 | dee clark | Just Keep It Up | Hey Little Girl | 1995 | 8 | 20 | yes | low | no |
| RVTR935829 | seals | I'Ll Play For You | I'll Play for You | 1975 | 1 | 9 | yes | high | yes |
| RVTR682124 | jay | Walkin' In The Rain | Wax Museum | 1970 | 1 | 12 | yes | high | yes |
| RVTR147178 | ray parker jr | That Old Song | A Woman Needs Love | 1981 | 3 | 8 | yes | high | yes |
| RVTR362535 | hamilton, joe frank | Winners And Losers | Fallin' in Love | 1975 | 1 | 10 | yes | high | yes |
| RVTR084621 | james ray | If You Gotta Make A Fool Of Somebody | James Ray | 1961 | 6 | 12 | yes | high | yes |

### High-confidence examples

- **teddy swims** — "Lose Control" → *I've Tried Everything but Therapy (Part 1)* (2023), slot 2, 10 tracks
- **shaboozey** — "A Bar Song Tipsy" → *Where I’ve Been, isn’t Where I’m Going* (2024), slot 2, 12 tracks
- **rema** — "Calm Down" → *Rave & Roses* (2022), slot 4, 16 tracks
- **zach bryan** — "I Remember Everything" → *Zach Bryan* (2023), slot 11, 16 tracks
- **doja cat** — "Woman" → *Planet Her* (2021), slot 1, 13 tracks
- **mustard** — "Ballin'" → *Perfect Ten* (2019), slot 9, 10 tracks
- **lizzo** — "Truth Hurts" → *Cuz I Love You* (2019), slot 13, 14 tracks
- **leblanc** — "Falling" → *Midnight Light* (1977), slot 2, 10 tracks

---

## Effort model — first 500 recoveries

| Step | Estimate | Assumption |
|------|----------|------------|
| MB API lookups | ~2,084 | 24% yield (Phase 4D C rate) |
| API wall time | ~115 min | 3 calls/lookup, 1.1s each |
| Auto-applies | ~403 | 80.5% high-confidence rate |
| Human reviews | ~97 | medium + low + reject re-picks |
| Curator time | ~3 hours | 2 min/review |
| Dev (minimal pipeline) | 2–3 days | staging table + ops queue + apply script |

**Critical path:** release-picker quality (compilation filter). Pilot shows 50 of 400 MB-"recoverable" rows fail studio-album gate — picker tuning before scale.

---

## Artifacts

- JSON: `tools/out/musicbrainz-ingest-pilot.json`
- Re-run: `npx tsx tools/healing/musicbrainz-ingest-pilot.ts`
- ROI source: `tools/out/external-catalog-roi-experiment.json`
