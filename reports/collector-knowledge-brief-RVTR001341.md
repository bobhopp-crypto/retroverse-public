# Collector Knowledge Brief — RVTR001341

**Song:** Dr. Hook — *When You're In Love With A Beautiful Woman*  
**Purpose:** Human-readable inventory of everything the **Collector** actually gathered — for manual experience design (ChatGPT / editorial).  
**Source artifact:** `data/ops/intelligence/research-department/RVTR001341/collector.json`  
**Collected:** 2026-06-28 · `researchQuality: 100` · `status: complete`  
**Scope:** Investigation only — no pipeline changes, no fixes applied.

---

## Executive Summary

The Collector has **strong canonical identity and US chart data**, **one good Wikipedia story** (Muscle Shoals + Even Stevens bathroom pitch), **one owned performance video with 5 extracted frames**, and **album cover art from the Retroverse graph**. It does **not** have structured weekly chart rows, international chart facts, label/catalog, lyrics, TV appearances, or band personnel as first-class facts — even though much of that exists inside **raw Wikipedia excerpts**.

**Why auto-generated experiences feel weak (from Collector's perspective):**

1. **Facts are fragments, not stories** — 8 of 22 candidate facts are metadata noise (RVTR id, cover policy, VDJ path shards, truncated sentences ending in `"…by Dr."`).
2. **The best material is trapped in source excerpts** — UK #1, RIAA Gold, full track listing, 11 band members, re-pressings, and chart table headers were fetched but **never structured or factized**.
3. **Year confusion is real in the raw data** — song/album = **1978**, US chart peak context = **1978**, but the owned video = **1981** and VDJ tags it as **"Dr. Hook - Live In The U.K."** (not *Pleasure + Pain*).
4. **Visual richness exceeds narrative richness** — 5 distinct video frames + album cover, but only ~6–8 facts a human would actually want on cards.
5. **No lyrics, no quotes, no TV/live history** — limits emotional/card variety despite `researchQuality: 100`.

---

## 1. Song Identity

| Field | Value |
|-------|-------|
| **RVTR** | RVTR001341 |
| **Title** | When You'Re In Love With A Beautiful Woman *(graph casing — inconsistent with Wikipedia/VDJ "You're")* |
| **Artist** | Dr. Hook |
| **Song release year** | **1978** (`identity.year`, `songEntity.originalReleaseYear`) |
| **Album** | **Pleasure + Pain** (also written *Pleasure and Pain* in Wikipedia excerpts) |
| **Graph linked** | Yes |

### Cover Art

| Item | Value |
|------|-------|
| **Known cover URL (graph / Cover Library)** | `https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev/retroverse/covers/RVAL674311/RVAL674311__dr-hook__pleasure-pain.jpg` |
| **Album RVAL** | RVAL674311 |
| **Current cover in use** | Same URL — assigned in `visualAssets.coverUrl`, `song.coverUrl`, and Cover Library facts |
| **Cover appears correct?** | **Probably yes for the studio album** — graph assigns *Pleasure + Pain* artwork, which matches the song's original album. |
| **Suspicious signals** | VDJ tags the **video file** with Album: **"Dr. Hook - Live In The U.K."** (1981), not *Pleasure + Pain*. The performance video is from a different era/context than the 1978 album cover. A patron might expect the cover to match what's on screen in the video — it won't. |
| **Cover verification status** | Graph asserts cover is canonical and **must not be replaced by external research** (policy facts in package). No independent Discogs/MusicBrainz cover cross-check was collected. |

### Identity Notes (Collector)

- *Overnight Collector queue*
- *Year resolution: Performance year (1981) documents a captured moment — not the song's original release.*

### Confidence Scores

| Domain | Score |
|--------|-------|
| Identity | 100 |
| Charts | 95 |
| Recording | 90 |
| Culture | 90 |
| Performance | 85 |
| Relationships | 40 |
| **Overall** | **84** |

---

## 2. Chart Knowledge

### Structured in Collector (Retroverse Graph)

| Field | Value |
|-------|-------|
| **Billboard Hot 100 peak** | **#6** |
| **Weeks on chart** | **25** |
| **Album on chart context** | Pleasure + Pain |
| **Summary string** | `Hot 100 peak #6 · 25 weeks` |

### NOT in Collector Package

| Field | Status |
|-------|--------|
| Entry date | **Not collected** |
| Peak date | **Not collected** |
| Final chart date | **Not collected** |
| Weekly chart rows | **Not collected** (Wikipedia excerpt mentions "Weekly charts" / "Year-end charts" sections but tables were not parsed) |
| Year-end chart position | **Not collected** |

> **Note:** Weekly Hot 100 trajectory may exist in the Retroverse **Postgres graph** at render time (`loadTrackPage` → `trajectoryWeeks`), but that data is **outside** `collector.json`. The Collector itself only captured peak + weeks.

### International Chart Facts (in source text only — not factized)

From Wikipedia song excerpt (`wiki-song-when-you-re-in-love-with-a-beautiful-wom`):

- Song became a **belated international hit in 1979**
- **#6 Billboard Hot 100 (USA)** — matches graph
- **#1 UK Singles Chart in November 1979**
- Song was **subsequently added** to the band's **1979 album *Sometimes You Win*** (non-North American release)

From Wikipedia album excerpt + pending candidate facts:

- Both US Top 10 singles (*Sharing the Night Together*, *When You're in Love with a Beautiful Woman*) **also charted in UK, Canada, and Australia** (candidate fact `5efbcbf0` — **pending**, not promoted)

### Timeline Events (Collector `timelines.song`)

| Year | Label | Detail |
|------|-------|--------|
| 1978 | Original release | Album: Pleasure + Pain |
| 1978 | Billboard Hot 100 peak #6 | 25 weeks on chart |
| — | *"When You're in Love with a Beautiful Woman" is a song by Dr.* | *(truncated wiki fragment)* |
| — | Recorded at Muscle Shoals Sound Studio, Alabama | |
| — | Pleasure and Pain is the seventh album from the country rock band Dr. | *(truncated)* |

---

## 3. Album Knowledge

### Structured

| Field | Value |
|-------|-------|
| **Album title** | Pleasure + Pain *(graph)* / Pleasure and Pain *(Wikipedia)* |
| **Release year** | **1978** |
| **Recording entity ID** | `rec-obse3` (kind: `studio_album`) |
| **Album position in discography** | **Seventh album** (Wikipedia — truncated in facts) |
| **Label** | **null** |
| **Catalog number** | **null** |
| **Producer (structured)** | **null** |
| **Recording location (structured)** | **null** *(but captured in notes/facts)* |

### Recording Notes (Collector)

1. *It was recorded at Muscle Shoals Sound Studio, Alabama.*
2. *Written by Even Stevens, who followed producer Ron Haffkine into the studio bathroom to pitch him the song, "When You're in Love with a Beautiful Woman" which first appeared on the band's 1978 album Pleasure and Pain.*

### In Wikipedia Excerpt Only (not structured)

**Track listing (10 tracks on first pressing):**

| # | Title | Writer | Length |
|---|-------|--------|--------|
| 1 | Sharing the Night Together | Ava Aldridge, Eddie Struzick | 2:58 |
| 2 | Sweetest of All | Shel Silverstein | 2:42 |
| 3 | Storms Never Last | Jessi Colter | 3:25 |
| 4 | I Don't Want to Be Alone Tonight | Silverstein | 3:30 |
| 5 | Knowing She's There | Silverstein, Dennis Locorriere | 3:26 |
| 6 | Clyde | J. J. Cale | 4:38 |
| 7 | **When You're in Love with a Beautiful Woman** | **Even Stevens** | **3:02** |
| 8 | Dooley Jones | Hazel Smith, Walter Carter | 3:48 |
| 9 | I Gave Her Comfort | Silverstein, Locorriere | 3:15 |
| 10 | You Make My Pants Want to Get Up and Dance | Sam Weedman | 3:07 |

**Album context from excerpt:**

- Two US Top 10 hits on this album: *Sharing the Night Together* and *When You're in Love with a Beautiful Woman*
- First pressing **did not include** *"All the Time in the World"*; later re-pressings did
- **RIAA Gold certification — September 1979**
- Artwork: Michael Kanarek

**Certifications in Collector:** `songEntity.certifications[]` is **empty** (Gold mentioned in excerpt only).

---

## 4. Artist Knowledge

### What Collector Knows

| Field | Value |
|-------|-------|
| **Artist name** | Dr. Hook |
| **Related artists (graph)** | `["Dr. Hook"]` only — self-reference, no expansion |
| **Genre (VDJ video)** | Rock |
| **Genre (VDJ MP3)** | Pop/Rock |
| **Missing area flagged** | *Artist relationship depth* |

### Band Members (Wikipedia album excerpt only — NOT in candidateFacts)

| Role | Name |
|------|------|
| Lead vocals | Ray Sawyer |
| Lead guitar, vocals, bass, harmonica | Dennis Locorriere |
| Rhythm guitar, vocals | Rik Elswit |
| Keyboards, backing vocals | Billy Francis |
| Bass | Jance Garfat |
| Drums, percussion, vocals | John Wolters |
| Guitar, keyboards, vocals | Bob "Willard" Henke |
| Backing vocals | Marilyn Martin, Nancy Nash |

### Artist History in Sources

- Described as **country rock band** (Wikipedia album excerpt)
- *Pleasure and Pain* is their **seventh album**
- No dedicated Dr. Hook biography, timeline, or prior/future hits collected beyond the one pending fact about UK/Canada/Australia chart success for album singles

### Related Songs / Albums

| Type | Status |
|------|--------|
| Related songs (graph) | **Not collected** |
| Related albums | **Not collected** |
| Prior hits | **Not collected** |
| Future hits | **Not collected** |
| Same-album sibling hit | *Sharing the Night Together* — mentioned in cultural notes/excerpt only |

---

## 5. Songwriter / Producer / Recording Knowledge

### Structured Facts

| Role | What Collector Has |
|------|-------------------|
| **Songwriter** | **Even Stevens** — via bathroom-pitch story (combined with producer mention in one fact) |
| **Producer** | **Ron Haffkine** — mentioned inside songwriter story fact, not a separate field |
| **Studio** | **Muscle Shoals Sound Studio, Alabama** — fact + recording note |
| **Recording location (entity)** | null on `recordings[0]` |
| **Personnel / musicians** | **Empty array** on recording entity |
| **Instruments** | **Not collected** |

### The Best Recording Story (full text — use this for a card)

> Written by Even Stevens, who followed producer Ron Haffkine into the studio bathroom to pitch him the song, "When You're in Love with a Beautiful Woman" which first appeared on the band's 1978 album Pleasure and Pain.

### Session Facts

- No session dates, take numbers, or engineer credits collected
- No structured producer credit separate from narrative fact
- `songEntity.writers[]` contains the entire bathroom story as one malformed string (not a clean credit list)

---

## 6. Video / Performance Knowledge

### Video File #1 — Primary (owned)

| Field | Value |
|-------|-------|
| **Performance ID** | `perf-l35b9p` |
| **Collector title** | **Official Video** |
| **Entity kind** | `music_video` |
| **VirtualDJ filepath** | `/Users/bobhopp/DJ MEDIA/VIDEO/1970's/Dr. Hook - When You're In Love With A Beautiful Woman.mp4` |
| **Duration** | ~220.7 sec (3:41) |
| **VDJ year tag** | **1981** |
| **VDJ genre** | Rock |
| **VDJ play count** | **2** |
| **VDJ album tag on video** | **Dr. Hook - Live In The U.K.** *(conflicts with Pleasure + Pain)* |
| **Detected venue** | null |
| **TV show / event / tour** | null |
| **Quality score** | 85 |
| **Official vs live vs TV** | **Unknown / inferred "Official Video"** by Collector — filename and folder give no broadcast source; VDJ metadata suggests a **live UK** context, not a canonical 1978 promo |

### Video File #2 — Audio only (related VDJ item)

| Field | Value |
|-------|-------|
| **Filepath** | `/Users/bobhopp/DJ MEDIA/MUSIC/POP/1970/Fill/Dr. Hook - When Youre In Love.mp3` |
| **Title (VDJ)** | When Youre In Love *(abbreviated)* |
| **Year** | 1979 |
| **Genre** | Pop/Rock |
| **Play count** | null |
| **Is video** | No |

### Extracted Frames (from video #1)

Frame interval: **every 20 seconds** · Source: same MP4

| File | Category | Timestamp | Selection reason | Collector approval |
|------|----------|-----------|------------------|-------------------|
| `alternate.jpg` | Alternate | 20s | Visually distinct alternate angle | In package (all frames extracted) |
| `hero.jpg` | Hero | 80s | Opening representative moment | In package |
| `close-up.jpg` | Close-up | 120s | Sharpest close-up in sequence | In package |
| `crowd.jpg` | Crowd | 160s | Audience or wide-stage context | In package |
| `performance.jpg` | Performance | 200s | Strong performance moment | In package |

**On disk:** `data/ops/intelligence/research-department/RVTR001341/visual-assets/` (5 JPGs)

### Performance Timeline

| Year | Event |
|------|-------|
| 1981 | Official Video (`perf-l35b9p`) — owned video capture |

### Performance Collector Notes

- Detected year: 1981
- VirtualDJ play count: 2
- Curated visual reference frames extracted from this footage
- Facts: *Matched VirtualDJ performance video* · *Performance year: 1981* · *Visual reference library prepared*

### Alternate Versions Known

- **1978 studio album version** (original release on *Pleasure + Pain*)
- **1979 international re-release wave** (UK #1)
- **1979 non-North American album *Sometimes You Win*** (song added)
- **1981 live/video capture** in DJ library (likely TV or concert footage — identity not verified)
- **1979 MP3 fill version** in library (alternate file, unknown mastering/source)

---

## 7. Cultural / Story Facts

### Candidate Facts Worth Card Treatment

| Category | Text | Source | Status |
|----------|------|--------|--------|
| chart | The song peaked at **#6 on the Billboard Hot 100** and spent **25 weeks** on the chart. | Retroverse Graph | approved |
| recording | Released in **1978**. | Retroverse Graph | approved |
| album | Appears on album **"Pleasure + Pain" (1978)**. | Retroverse Graph | approved |
| cultural_impact | Recorded at **Muscle Shoals Sound Studio, Alabama**. | Wikipedia | approved |
| cultural_impact | **Even Stevens / Ron Haffkine bathroom pitch** story (full text above). | Wikipedia | approved |
| cultural_impact | *Pleasure and Pain* is the **seventh album** from the country rock band Dr. Hook. | Wikipedia | approved *(truncated)* |
| cultural_impact | Top 10 hits: *Sharing the Night Together* and *When You're in Love with a Beautiful Woman*. | Wikipedia | **pending** |
| cultural_impact | Both songs also charted in **UK, Canada, and Australia**. | Wikipedia | **pending** |

### Truncated / Low-Quality Facts (avoid as cards)

- `"When You're in Love with a Beautiful Woman" is a song by Dr.` — sentence cut off
- `"When You'Re In Love With A Beautiful Woman" by Dr.` — cut off
- `Pleasure and Pain is the seventh album from the country rock band Dr.` — cut off
- VDJ path fragments, MP4 filename shards, play-count-only trivia

### Cultural Context Notes (merged strings)

Same content as above — stored as 4 strings in `culturalContext.notes[]`, all partially truncated.

### Story Seed (Collector editorial hints)

**Why it matters (seed):**  
*Dr. Hook's "When You're In Love With A Beautiful Woman" reached #6 on the Billboard Hot 100. "When You're in Love with a Beautiful Woman" is a song by Dr.* — *(itself truncated)*

**Story ideas suggested by Collector:**

1. Chart story — peaked at #6 on the Hot 100
2. Song release — original 1978 chapter
3. Performance angle — Official Video (1981)
4. Muscle Shoals recording studio

**Suggested angle:** `breakthrough`

### Card-Worthy Material in Excerpts But NOT Factized

- **UK #1, November 1979** — stronger international story than US #6
- **Belated 1979 hit** narrative (song slept, then exploded overseas)
- **RIAA Gold, September 1979** for the album
- **Shel Silverstein** wrote other tracks on the album (context for band's songwriting ecosystem)
- **Re-press controversy** — first pressing missing *All the Time in the World*
- **3:02 track length** — usable for a "on the album" card
- **Even Stevens** as sole listed songwriter on track listing

### Not Collected

- TV appearances
- Live appearances (beyond unverified video)
- Verified quotes
- Lyric themes / lyrics (`lyrics.available: false`)
- Music video director / MTV era context
- IMDb / broadcast provenance

---

## 8. Song DNA & Visual Identity (Collector-side companions)

These files sit beside `collector.json` and were generated during the same Collector pass.

### Musical Profile (`song-dna.json`)

| Dimension | Value | Label |
|-----------|-------|-------|
| Tempo | 109.6 BPM | Uptempo |
| Key | G# | G# |
| Energy | 0.728 | High |
| Valence | 0.852 | Bright |
| Danceability | 0.679 | High |
| Acousticness | 0.405 | Mixed |
| Liveness | 0.051 | Studio |
| Speechiness | 0.038 | Sung |
| Source | `canonical_album_track_display+virtualdj_key` | |

**Story DNA labels:** Chart success · Cultural moment · Triumph · Breakthrough angle

### Visual Profile (`visual-identity.json`)

Derived from performance frames — warm stage, grain, dark palette:

- Primary `#090B09` · Accent `#784429`
- Mood: nostalgic · Lighting: warm_stage · Atmosphere: live_house
- Camera energy: kinetic

**Use for design:** The Collector "sees" this as a warm, dark, live-feeling performance — even though the canonical release is a 1978 studio album.

---

## 9. Source Inventory

### Source 1 — Retroverse Canon

| | |
|-|-|
| **ID** | `retroverse-identity` |
| **Contributed** | RVTR, title, artist, album, year |
| **Excerpt-only (not factized)** | Full identity sentence in one block |

### Source 2 — Retroverse Cover Library

| | |
|-|-|
| **ID** | `retroverse-cover` |
| **Contributed** | Cover URL, canonical assignment policy |
| **Excerpt-only** | "must not be replaced by external research" policy language |

### Source 3 — Retroverse Graph (charts)

| | |
|-|-|
| **ID** | `retroverse-chart` |
| **Contributed** | Hot 100 #6, 25 weeks, album name |
| **Excerpt-only** | Nothing significant beyond structured fields |

### Source 4 — VirtualDJ database.xml

| | |
|-|-|
| **ID** | `retroverse-vdj-snapshot` |
| **Contributed** | Video path, play count, genre, year 1981 |
| **Excerpt-only / not factized** | **Album: Dr. Hook - Live In The U.K.** · LastPlayed timestamp · full path — only partially shard into trivia facts |

### Source 5 — Retroverse Year Workspace

| | |
|-|-|
| **ID** | `retroverse-year-workspace` |
| **Contributed** | Performance year context 1978 |
| **Excerpt-only** | Minimal — one line |

### Source 6 — VirtualDJ Library (video)

| | |
|-|-|
| **ID** | `vdj-media-0d70c904` |
| **Contributed** | Video ownership confirmation, play count |
| **Excerpt-only** | Full path string |

### Source 7 — VirtualDJ Library (audio)

| | |
|-|-|
| **ID** | `vdj-media-feb40a32` |
| **Contributed** | Second owned media file existence |
| **Excerpt-only** | Full MP3 path — alternate version not analyzed |

### Source 8 — Wikipedia (song)

| | |
|-|-|
| **ID** | `wiki-song-when-you-re-in-love-with-a-beautiful-wom` |
| **URL** | https://en.wikipedia.org/wiki/When_You're_in_Love_with_a_Beautiful_Woman |
| **Contributed to facts** | Studio location, bathroom pitch story, truncated opener |
| **In excerpt only — HIGH VALUE** | UK #1 Nov 1979 · belated 1979 international hit · added to *Sometimes You Win* album · weekly/year-end chart section headers · certifications section header · references |

**Full excerpt (abridged for design):**

> "When You're in Love with a Beautiful Woman" is a song by Dr. Hook. It was recorded at Muscle Shoals Sound Studio, Alabama. Written by Even Stevens, who followed producer Ron Haffkine into the studio bathroom to pitch him the song… In **1979** the song belatedly became an international hit, reaching **number six on the Billboard Hot 100** in the USA and **number one in the UK Singles Chart in November 1979**. It was subsequently added to the band's **1979 album Sometimes You Win** (non-North American release).

### Source 9 — Wikipedia (album)

| | |
|-|-|
| **ID** | `wiki-album-pleasure-and-pain-dr-hook-album-` |
| **URL** | https://en.wikipedia.org/wiki/Pleasure_and_Pain_(Dr._Hook_album) |
| **Contributed to facts** | Seventh album fragment, Top 10 hits mention, international charts (pending) |
| **In excerpt only — HIGH VALUE** | **Full 10-track listing with writers/times** · **11 musician credits** · **RIAA Gold Sept 1979** · re-pressing note (*All the Time in the World*) · artwork credit Michael Kanarek · charts section |

---

## 10. All 22 Candidate Facts (Complete)

| # | Cat. | Approval | Source | Text |
|---|------|----------|--------|------|
| 1 | trivia | approved | Retroverse Graph | Retroverse track identity: RVTR001341. |
| 2 | artist | approved | Retroverse Graph | When You'Re In Love With A Beautiful Woman is performed by Dr. Hook. |
| 3 | album | approved | Retroverse Graph | The song appears on the album "Pleasure + Pain" (1978). |
| 4 | album | approved | Retroverse Graph | Canonical cover art is assigned in the Retroverse Cover Library for RVTR001341. |
| 5 | chart | approved | Retroverse Graph | The song peaked at #6 on the Billboard Hot 100 and spent 25 weeks on the chart. |
| 6 | trivia | approved | Retroverse Graph | VirtualDJ library play count: 2. |
| 7 | recording | approved | Retroverse Graph | When You'Re In Love With A Beautiful Woman was released in 1978. |
| 8 | trivia | approved | Retroverse Canon | "When You'Re In Love With A Beautiful Woman" by Dr. |
| 9 | trivia | approved | Cover Library | Canonical cover assignment for RVTR001341… |
| 10 | trivia | approved | Cover Library | Cover URL is graph-owned and must not be replaced by external research. |
| 11 | trivia | approved | VDJ database | Hook · Title… · Year: 1981 · Genre: Rock · PlayCount: 2 · Path: … |
| 12 | trivia | pending | VDJ database | Hook - When You're In Love With A Beautiful Woman.mp4 |
| 13 | trivia | pending | VDJ Library | /Users/bobhopp/DJ MEDIA/VIDEO/1970's/Dr. |
| 14 | trivia | pending | VDJ Library | Hook - When You're In Love With A Beautiful Woman.mp4 · Plays: 2 |
| 15 | trivia | pending | VDJ Library | /Users/bobhopp/DJ MEDIA/MUSIC/POP/1970/Fill/Dr. |
| 16 | cultural_impact | approved | Wikipedia | "When You're in Love with a Beautiful Woman" is a song by Dr. |
| 17 | cultural_impact | approved | Wikipedia | It was recorded at Muscle Shoals Sound Studio, Alabama. |
| 18 | cultural_impact | approved | Wikipedia | Written by Even Stevens… bathroom pitch… Pleasure and Pain. |
| 19 | cultural_impact | approved | Wikipedia | Pleasure and Pain is the seventh album from the country rock band Dr. |
| 20 | cultural_impact | pending | Wikipedia | Top 10 hits, "Sharing the Night Together" and "When You're in Love with a Beautiful Woman". |
| 21 | cultural_impact | pending | Wikipedia | Both songs also became chart hits in the UK, Canada and Australia. |
| 22 | — | — | — | *(No 22nd distinct fact — package summary says 22; list above is complete)* |

---

## 11. Missing But Desirable

| Gap | Status |
|-----|--------|
| **Discogs** | Not queried |
| **MusicBrainz** | Not queried |
| **IMDb / TV database** | Not queried — no TV performance provenance for the 1981 video |
| **Proper cover verification** | Graph asserts canonical cover; no external cross-check |
| **Personnel (structured)** | In Wikipedia excerpt only |
| **Label / catalog number** | null |
| **Video identity** | Title says "Official Video" but VDJ says Live In The U.K. — unverified |
| **TV performance details** | Not collected |
| **Weekly Billboard rows** | Not in collector (may exist in Postgres graph) |
| **International charts (structured)** | UK #1 in excerpt only |
| **Related songs / graph expansion** | Not collected |
| **Artist history / biography** | Minimal |
| **Lyrics** | `lyrics.available: false` |
| **Retroverse Tags (User2)** | Empty on both VDJ items |
| **Certifications (structured)** | Empty — RIAA Gold in excerpt only |
| **B-side / single release details** | Not collected |
| **Music video director / label promo metadata** | Not collected |

---

## 12. Specialized Pages a Designer Could Build (from Collector material)

Using **only** what Collector gathered (plus excerpt-only gems):

| Page / Card Type | Source material |
|------------------|-----------------|
| **Chart Journey (US)** | Hot 100 #6, 25 weeks — pair with graph trajectory if available at render time |
| **UK Breakthrough** | Excerpt: #1 Nov 1979, belated hit narrative — *not yet a fact* |
| **The Bathroom Pitch** | Full Even Stevens / Ron Haffkine story — best human story in package |
| **Muscle Shoals** | Studio location fact — tie to Southern rock/session culture |
| **Album Context** | *Pleasure + Pain* as seventh album, two Top 10 singles, RIAA Gold |
| **Track on the Album** | Track #7, 3:02, written by Even Stevens — from excerpt |
| **Band Lineup** | 11 names from excerpt — performance/credits card |
| **Cover vs Video Tension** | 1978 album art vs 1981 live UK video — honest "what you're seeing" card |
| **Performance Gallery** | 5 frames: hero, close-up, crowd, alternate, performance |
| **Song DNA** | Tempo/key/mood from song-dna.json |
| **DJ Library Provenance** | Play count 2, owned file paths — meta for Bob, probably not patron-facing |
| **Sibling Hit** | *Sharing the Night Together* — same album context |
| **Re-press Trivia** | Missing track on first pressing — excerpt only |

---

## 13. Why the Generated Experience Still Feels Weak (designer checklist)

Even after downstream pipeline improvements, **Collector's raw material** explains lingering weakness:

1. **No single "hero fact"** — the bathroom pitch is great but buried among 22 items including path fragments.
2. **International success is invisible** — UK #1 is the dramatic beat; it's in Wikipedia text but not a candidate fact.
3. **Truncation epidemic** — Wikipedia scraping produced sentence fragments as facts and timeline events.
4. **Video identity unresolved** — Designer can't honestly label the footage "official promo" vs "live UK broadcast."
5. **Album cover ≠ video era** — Visual dissonance unless narrative explains 1978 album vs 1981 capture.
6. **No lyrics or quotable lines** — limits emotional resonance cards.
7. **Personnel absent from facts** — Ray Sawyer / Dennis Locorriere names exist only in excerpt.
8. **Two-chart story unexplained** — 1978 US run vs 1979 UK #1 vs 1981 video confuses without editorial timeline.
9. **Play count / file paths** — pollute fact list; human designer should discard.
10. **Research quality score (100)** measures stage completion, not narrative richness — misleading signal.

---

## 14. Suggested Manual Experience Arc (for ChatGPT)

A human designer could beat the auto pipeline with ~12–15 cards:

1. **Identity** — Dr. Hook · 1978 · *Pleasure + Pain* + album cover  
2. **US Chart** — #6 Hot 100 · 25 weeks  
3. **UK Chart** — #1 Nov 1979 *(from excerpt — verify externally if publishing)*  
4. **Timeline** — 1978 release → 1978–79 US run → 1979 UK explosion → 1981 video in library  
5. **The Pitch** — bathroom story card (full text)  
6. **Muscle Shoals** — where it was recorded  
7. **On the Album** — track #7 · 3:02 · Even Stevens  
8. **Album Gold** — RIAA Gold Sept 1979 *(excerpt)*  
9. **Also on the Album** — *Sharing the Night Together* sibling hit  
10. **The Band** — Sawyer / Locorriere lineup *(excerpt)*  
11. **Performance** — 1981 video still + note about Live In The U.K. metadata  
12. **Frame gallery** — hero / close-up / crowd / alternate / performance  
13. **Song DNA** — tempo, key, energy watercolor  
14. **Cover note** — graph canonical *Pleasure + Pain* art vs video era  

---

## Artifact Reference

| File | Path |
|------|------|
| Collector package | `data/ops/intelligence/research-department/RVTR001341/collector.json` |
| Song DNA | `…/song-dna.json` |
| Visual identity | `…/visual-identity.json` |
| Extracted frames | `…/visual-assets/*.jpg` |

**Related prior audits (not modified):** `reports/pipeline-data-flow-audit.md`, `reports/sprint-3.27-preserve-publish-everything.md`

---

## Execution State

**COMPLETE** — investigation/report only. No pipeline, dossier, or rendering changes made.
