# Title Repair Skip Audit

**Scanned:** 2026-06-24T04:37:42.880Z  
**Read-only** — no graph or label modifications.

Inspects the **410** canonical_title repairs skipped during Match Cleanup Execution.

---

## Summary

| Metric | Count |
|--------|------:|
| Skipped repairs | 410 |
| Remaining feat-corruption RVTRs | 410 |

### Internal repair skip reasons

| Reason | Count |
|--------|------:|
| `no_graph_title` | 370 |
| `normalized_key_mismatch` | 40 |

### Grouped skip causes

| Group | Count | % |
|-------|------:|--:|
| No tracks.title source | 0 | 0% |
| No graph song exists | 0 | 0% |
| VDJ-only identity | 370 | 90.2% |
| Corrupted title still present | 0 | 0% |
| Other | 40 | 9.8% |

---
## No tracks.title source (0)

_None._

---

## No graph song exists (0)

_None._

---

## VDJ-only identity (370)

| RVTR | Artist | Identity | Canonical title | Graph title | Detail |
|------|--------|----------|-----------------|-------------|--------|
| `RVTR300674` | tinashe | `vdj` | 2 On Feat Schoolboy Q | — | VDJ identity with no primary graph track — local filename-derived title |
| `RVTR527010` | 2012 (feat. Nicki Minaj) | `vdj` | 2012 It Ain'T The End Feat Nicki Minaj | — | VDJ identity with no primary graph track — local filename-derived title |
| `RVTR666546` | meek mill | `vdj` | 24 7 Feat Ella Mai | — | VDJ identity with no primary graph track — local filename-derived title |
| `RVTR533588` | madonna | `vdj` | 4 Minutes Feat Justin Timberlake And Timbaland | — | VDJ identity with no primary graph track — local filename-derived title |
| `RVTR653684` | nena | `vdj` | 99 Lu Feat Ballons | — | VDJ identity with no primary graph track — local filename-derived title |
| `RVTR082692` | nena | `vdj` | 99 Lu Feat Balloons English | — | VDJ identity with no primary graph track — local filename-derived title |
| `RVTR854354` | nena | `vdj` | 99 Lu Feat Balloons German Version | — | VDJ identity with no primary graph track — local filename-derived title |
| `RVTR142559` | Cher & Peter Cetra | `vdj` | A Feat Er All | — | VDJ identity with no primary graph track — local filename-derived title |
| `RVTR743539` | Sylver (Jonathan Peters Mix) | `vdj` | A Feat Er All This Time | — | VDJ identity with no primary graph track — local filename-derived title |
| `RVTR665343` | journey | `vdj` | A Feat Er The Fall | — | VDJ identity with no primary graph track — local filename-derived title |
| `RVTR438772` | Der Kommissar | `vdj` | A Feat Er The Fire | — | VDJ identity with no primary graph track — local filename-derived title |
| `RVTR577502` | Al Hibbler | `vdj` | A Feat Er The Lights Go Down Low | — | VDJ identity with no primary graph track — local filename-derived title |
| `RVTR791649` | Earth, Wind & Fire | `vdj` | A Feat Er The Love Has Gone | — | VDJ identity with no primary graph track — local filename-derived title |
| `RVTR964664` | Princess | `vdj` | A Feat Er The Love Has Gone | — | VDJ identity with no primary graph track — local filename-derived title |
| `RVTR674312` | Earth Wind Fire | `vdj` | A Feat Er The Love Has Gone | — | VDJ identity with no primary graph track — local filename-derived title |
| `RVTR213995` | engelbert humperdinck | `vdj` | A Feat Er The Lovin | — | VDJ identity with no primary graph track — local filename-derived title |
| `RVTR235293` | engelbert humperdinck | `vdj` | A Feat Er The Lovin' | — | VDJ identity with no primary graph track — local filename-derived title |
| `RVTR568510` | nelson | `vdj` | A Feat Er The Rain | — | VDJ identity with no primary graph track — local filename-derived title |
| `RVTR421156` | Chuck Wagon Gang | `vdj` | A Feat Er The Sunrise | — | VDJ identity with no primary graph track — local filename-derived title |
| `RVTR588464` | Wilkinson | `vdj` | A Feat Erglow | — | VDJ identity with no primary graph track — local filename-derived title |

_Showing 20 of 370._

---

## Corrupted title still present (0)

_None._

---

## Other (40)

| RVTR | Artist | Identity | Canonical title | Graph title | Detail |
|------|--------|----------|-----------------|-------------|--------|
| `RVTR846822` | zayn / taylor swift | `hot100` | I Don'T Wanna Live Forever Fi Feat Y Shades Darker | I Don't Wanna Live Forever (Fifty Shades Darker) | Clean graph title fails normalized_title_key validation |
| `RVTR747880` | rita coolidge | `hot100` | Your Love Has Li Feat Ed Me Higher And Higher | (Your Love Has Lifted Me) Higher And Higher | Clean graph title fails normalized_title_key validation |
| `RVTR232446` | The Weeknd | `hot100` | Earned It Fi Feat Y Shades Of Grey | Earned It (Fifty Shades Of Grey) | Clean graph title fails normalized_title_key validation |
| `RVTR696237` | cher | `hot100` | A Feat Er All Love Theme From Chances Are | After All (Love Theme From "Chances Are") | Clean graph title fails normalized_title_key validation |
| `RVTR094257` | nick lachey | `hot100` | What'S Le Feat Of Me | What's Left Of Me | Clean graph title fails normalized_title_key validation |
| `RVTR057173` | jackie wilson | `hot100` | Your Love Keeps Li Feat Ing Me Higher And Higher | (Your Love Keeps Lifting Me) Higher And Higher | Clean graph title fails normalized_title_key validation |
| `RVTR235294` | engelbert humperdinck | `hot100` | A Feat Er The Lovin' | After The Lovin' | Clean graph title fails normalized_title_key validation |
| `RVTR134604` | david ruffin | `hot100` | My Whole World Ended The Moment You Le Feat Me | My Whole World Ended (The Moment You Left Me) | Clean graph title fails normalized_title_key validation |
| `RVTR844978` | The Temptations | `hot100` | I Could Never Love Another A Feat Er Loving You | I Could Never Love Another (After Loving You) | Clean graph title fails normalized_title_key validation |
| `RVTR337730` | patti page | `hot100` | Le Feat Right Out Of Your Heart Hi Lee Hi Lo Hi Lup Up Up | Left Right Out Of Your Heart (Hi Lee Hi Lo Hi Lup Up Up) | Clean graph title fails normalized_title_key validation |
| `RVTR203662` | The Moody Blues | `hot100` | Tuesday A Feat Ernoon Forever A Feat Ernoon | Tuesday Afternoon (Forever Afternoon) | Clean graph title fails normalized_title_key validation |
| `RVTR797262` | brian hyland | `hot100` | Warmed Over Kisses Le Feat Over Love | Warmed Over Kisses (Left Over Love) | Clean graph title fails normalized_title_key validation |
| `RVTR253053` | frank sinatra | `hot100` | So Feat Ly As I Leave You | Softly, As I Leave You | Clean graph title fails normalized_title_key validation |
| `RVTR153333` | rufus | `hot100` | At Midnight My Love Will Li Feat You Up | At Midnight (My Love Will Lift You Up) | Clean graph title fails normalized_title_key validation |
| `RVTR315437` | andy williams | `hot100` | Love Theme From The Godfather Speak So Feat Ly Love | Love Theme From "The Godfather" (Speak Softly Love) | Clean graph title fails normalized_title_key validation |
| `RVTR778571` | pc quest | `hot100` | A Feat Er The Summer'S Gone | After The Summer's Gone | Clean graph title fails normalized_title_key validation |
| `RVTR167151` | The Byrds | `hot100` | 5 D Fi Feat H Dimension | 5 D (Fifth Dimension) | Clean graph title fails normalized_title_key validation |
| `RVTR017747` | bobby goldsboro | `hot100` | I'M A Dri Feat Er | I'm A Drifter | Clean graph title fails normalized_title_key validation |
| `RVTR086674` | dierks bentley | `hot100` | Lot Of Leavin' Le Feat To Do | Lot Of Leavin' Left To Do | Clean graph title fails normalized_title_key validation |
| `RVTR674411` | jeffrey osborne | `hot100` | She'S On The Le Feat | She's On The Left | Clean graph title fails normalized_title_key validation |

_Showing 20 of 40._

---

## Classification rules

Priority order (first match wins):

1. **Corrupted title still present** — graph `tracks.title` also contains ` Feat ` tokenization
2. **No tracks.title source** — graph track linked but `tracks.title` empty
3. **No graph song exists** — hot100/chart row with no primary graph track link
4. **VDJ-only identity** — `identity_source = vdj`, no repair source available
5. **Other** — normalized key mismatch, already clean, unclassified

---

## Outputs

- `AUDIT.md`
- `skip-audit.json`
- `skip-audit.csv`