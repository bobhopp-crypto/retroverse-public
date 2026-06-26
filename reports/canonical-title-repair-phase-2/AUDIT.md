# Canonical Title Repair — Phase 2

**Executed:** 2026-06-24T04:52:09.014Z  
Repairs **hot100** `normalized_key_mismatch` rows only. No VDJ identities touched. No label or matching changes.

---

## Summary

| Metric | Count |
|--------|------:|
| Key-mismatch candidates (hot100) | 40 |
| Repair plans | 40 |
| **Rows repaired** | **40** |
| Skipped during planning | 0 |

---

## Validation

| Check | Count |
|-------|------:|
| Remaining hot100 `normalized_key_mismatch` | **0** |
| Remaining hot100 feat-corruption RVTRs | **0** |

✓ No remaining hot100 normalized_key_mismatch rows.

---

## Before / After examples

| RVTR | Artist | Before canonical | After canonical | Before key | After key |
|------|--------|------------------|-----------------|------------|-----------|
| `RVTR846822` | zayn / taylor swift | I Don'T Wanna Live Forever Fi Feat Y Shades Darker | I Don't Wanna Live Forever (Fifty Shades Darker) | i don t wanna live forever  fifty shades darker | i don't wanna live forever fifty shades darker |
| `RVTR747880` | rita coolidge | Your Love Has Li Feat Ed Me Higher And Higher | (Your Love Has Lifted Me) Higher And Higher | your love has lifted me  higher and higher | your love has lifted me higher and higher |
| `RVTR232446` | The Weeknd | Earned It Fi Feat Y Shades Of Grey | Earned It (Fifty Shades Of Grey) | earned it  fifty shades of grey | earned it fifty shades of grey |
| `RVTR696237` | cher | A Feat Er All Love Theme From Chances Are | After All (Love Theme From "Chances Are") | after all  love theme from "chances are" | after all love theme from chances are |
| `RVTR094257` | nick lachey | What'S Le Feat Of Me | What's Left Of Me | what s left of me | what's left of me |
| `RVTR057173` | jackie wilson | Your Love Keeps Li Feat Ing Me Higher And Higher | (Your Love Keeps Lifting Me) Higher And Higher | your love keeps lifting me  higher and higher | your love keeps lifting me higher and higher |
| `RVTR235294` | engelbert humperdinck | A Feat Er The Lovin' | After The Lovin' | after the lovin | after the lovin' |
| `RVTR134604` | david ruffin | My Whole World Ended The Moment You Le Feat Me | My Whole World Ended (The Moment You Left Me) | my whole world ended  the moment you left me | my whole world ended the moment you left me |
| `RVTR844978` | The Temptations | I Could Never Love Another A Feat Er Loving You | I Could Never Love Another (After Loving You) | i could never love another  after loving you | i could never love another after loving you |
| `RVTR337730` | patti page | Le Feat Right Out Of Your Heart Hi Lee Hi Lo Hi Lup Up Up | Left Right Out Of Your Heart (Hi Lee Hi Lo Hi Lup Up Up) | left right out of your heart  hi lee hi lo hi lup up up | left right out of your heart hi lee hi lo hi lup up up |
| `RVTR203662` | The Moody Blues | Tuesday A Feat Ernoon Forever A Feat Ernoon | Tuesday Afternoon (Forever Afternoon) | tuesday afternoon  forever afternoon | tuesday afternoon forever afternoon |
| `RVTR797262` | brian hyland | Warmed Over Kisses Le Feat Over Love | Warmed Over Kisses (Left Over Love) | warmed over kisses  left over love | warmed over kisses left over love |
| `RVTR253053` | frank sinatra | So Feat Ly As I Leave You | Softly, As I Leave You | softly, as i leave you | softly as i leave you |
| `RVTR153333` | rufus | At Midnight My Love Will Li Feat You Up | At Midnight (My Love Will Lift You Up) | at midnight  my love will lift you up | at midnight my love will lift you up |
| `RVTR315437` | andy williams | Love Theme From The Godfather Speak So Feat Ly Love | Love Theme From "The Godfather" (Speak Softly Love) | love theme from "the godfather"  speak softly love | love theme from the godfather speak softly love |
| `RVTR778571` | pc quest | A Feat Er The Summer'S Gone | After The Summer's Gone | after the summer s gone | after the summer's gone |
| `RVTR167151` | The Byrds | 5 D Fi Feat H Dimension | 5 D (Fifth Dimension) | 5 d  fifth dimension | 5 d fifth dimension |
| `RVTR017747` | bobby goldsboro | I'M A Dri Feat Er | I'm A Drifter | i m a drifter | i'm a drifter |
| `RVTR086674` | dierks bentley | Lot Of Leavin' Le Feat To Do | Lot Of Leavin' Left To Do | lot of leavin  left to do | lot of leavin' left to do |
| `RVTR674411` | jeffrey osborne | She'S On The Le Feat | She's On The Left | she s on the left | she's on the left |


_Showing 20 of 40 repaired rows._


---

## Source of truth

- `tracks.title` (primary graph track) → `canonical_title`
- Same title → rebuilt `normalized_title_key`

Backup: `/Users/bobhopp/RETROVERSE_PUBLIC/reports/canonical-title-repair-phase-2/hot100-key-repair-backup-2026-06-24T04-52-08-286Z.json`

---

## Outputs

- `AUDIT.md`
- `repair-result.json`
- `repair-plans.csv`
