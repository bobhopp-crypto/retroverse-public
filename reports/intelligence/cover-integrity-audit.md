# Cover Integrity Audit

Generated: 2026-06-17T13:28:41.977Z

## Intelligence hold

**Active.** Overnight intelligence scaling is paused until cover integrity is repaired.

## Executive summary

| Artist | Albums | Canonical | Review | Broken | Missing |
| --- | ---: | ---: | ---: | ---: | ---: |
| Fleetwood Mac | 26 | 11 | 2 | 9 | 4 |
| Gary Wright | 5 | 2 | 0 | 3 | 0 |

### Root cause distribution (quarantined albums)

- **r2_publish_gap**: 12
- **missing_assignment**: 4
- **reused_cover_cache**: 2

## Findings

### Gary Wright
- Graph paths are **RVAL-correct** per album (Dream Weaver / Light of Smiles / Headin' Home each have distinct paths).
- **3 broken** on public CDN: Light of Smiles, Headin' Home, The Right Place (paths assigned, **CDN 404**; staging exists locally).
- **The Dream Weaver** and **Touch And Gone** are canonical with CDN **200**.

### Fleetwood Mac
- **4** albums have no cover assignment.
- **9** albums have paths but **CDN 404** (local dossier only — invisible on public site).
- **The Dance** + **Tango In The Night** share the **same image hash** (reused cover cache) — likely wrong art on at least one.
- **In Chicago**: metadata/title path OK, CDN 200 — if cover looks wrong visually, suspect **wrong bytes in correct RVAL file** (needs manual visual QA).

## Cover matching logic (current system)

| Surface | Match key | Risk |
| --- | --- | --- |
| Artist album grid | RVAL → artwork_links → canonical path | Low if RVAL-scoped |
| Album page | album_id via RVAL | Low |
| RVTR package cover | RVTR → first album track position | Medium — wrong album link poisons track |
| Cover recovery (intelligence) | External probes; 78+ auto-accept | **High** — artist-only iTunes fuzzy at 55–68 |
| Artist page track fallback | First album cover on discography | **High** — unlinked RVTRs get wrong art |

**Not root cause for album tiles:** UI rendering bug, loose RVAL join (paths are per-album).

**Primary root causes:** CDN publish gap, missing assignments, cover recovery threshold too low for artist-only hits.

## Safety rule (new)

Album canonical covers require **strong album-title evidence** in the assigned filename/path:
- Title exact match OR (partial + artist + RVAL path match)
- Deliverable asset on public CDN (**HTTP 200**)
- **Artist-only matching is not allowed** for album-level canonical covers

Weak evidence → **REVIEW NEEDED** (quarantine), not canonical.

## Quarantine list

18 albums quarantined (no data mutated).

| Artist | Album | Year | RVAL | Status | Reasons |
| --- | --- | ---: | --- | --- | --- |
| Fleetwood Mac | Fleetwood Mac (1968) | 1968 | RVAL697707 | broken | cover_asset_missing_on_cdn |
| Fleetwood Mac | English Rose | 1969 | RVAL820762 | missing | missing_cover_assignment |
| Fleetwood Mac | Black Magic Woman | 1971 | RVAL892597 | missing | missing_cover_assignment |
| Fleetwood Mac | Bare Trees | 1972 | RVAL013903 | broken | cover_asset_missing_on_cdn |
| Fleetwood Mac | Penguin | 1973 | RVAL191876 | broken | cover_asset_missing_on_cdn |
| Fleetwood Mac | Fleetwood Mac | 1975 | RVAL554256 | broken | cover_asset_missing_on_cdn |
| Fleetwood Mac | Vintage Years | 1975 | RVAL188614 | missing | missing_cover_assignment |
| Fleetwood Mac | Tango In The Night | 1987 | RVAL510721 | review_needed | same_artist_different_album_shared_image |
| Fleetwood Mac | Behind The Mask | 1990 | RVAL356182 | broken | cover_asset_missing_on_cdn |
| Fleetwood Mac | The Dance | 1997 | RVAL768327 | review_needed | same_artist_different_album_shared_image |
| Fleetwood Mac | Say You Will | 2003 | RVAL067876 | broken | cover_asset_missing_on_cdn |
| Fleetwood Mac | Live In Boston | 2004 | RVAL530983 | broken | cover_asset_missing_on_cdn |
| Fleetwood Mac | Extended Play (EP) | 2013 | RVAL264515 | broken | cover_asset_missing_on_cdn |
| Fleetwood Mac | Opus Collection | 2013 | RVAL101352 | missing | missing_cover_assignment |
| Fleetwood Mac | 50 Years: Don't Stop | 2018 | RVAL335875 | broken | cover_asset_missing_on_cdn |
| Gary Wright | Light Of Smiles | 1977 | RVAL994644 | broken | cover_asset_missing_on_cdn |
| Gary Wright | Headin' Home | 1979 | RVAL721748 | broken | cover_asset_missing_on_cdn |
| Gary Wright | The Right Place | 1981 | RVAL503005 | broken | cover_asset_missing_on_cdn |

## Fleetwood Mac

| Metric | Count |
| --- | ---: |
| Albums in graph | 26 |
| With RVAL | 26 |
| Canonical covers | 11 |
| Review needed | 2 |
| Broken (path but no asset) | 9 |
| Missing assignment | 4 |

### Discography

| Year | Album | RVAL | CDN | Status | Title match | Source | Root cause |
| ---: | --- | --- | ---: | --- | --- | --- | --- |
| 1968 | Fleetwood Mac (1968) | RVAL697707 | 404 | broken | yes | dossier | r2_publish_gap |
| 1969 | English Rose | RVAL820762 | — | missing | no | — | missing_assignment |
| 1969 | Then Play On | RVAL619790 | 200 | canonical | yes | dossier | review_needed |
| 1970 | Kiln House | RVAL069759 | 200 | canonical | yes | dossier | review_needed |
| 1971 | Black Magic Woman | RVAL892597 | — | missing | no | — | missing_assignment |
| 1971 | Fleetwood Mac In Chicago | RVAL110155 | 200 | canonical | yes | dossier | review_needed |
| 1971 | Future Games | RVAL215855 | 200 | canonical | yes | dossier | review_needed |
| 1972 | Bare Trees | RVAL013903 | 404 | broken | yes | dossier | r2_publish_gap |
| 1973 | Mystery To Me | RVAL334965 | 200 | canonical | yes | dossier | review_needed |
| 1973 | Penguin | RVAL191876 | 404 | broken | yes | dossier | r2_publish_gap |
| 1974 | Heroes Are Hard To Find | RVAL189880 | 200 | canonical | yes | dossier | review_needed |
| 1975 | Fleetwood Mac | RVAL554256 | 404 | broken | yes | dossier | r2_publish_gap |
| 1975 | Vintage Years | RVAL188614 | — | missing | no | — | missing_assignment |
| 1977 | Rumours | RVAL000003 | 200 | canonical | yes | dossier | review_needed |
| 1979 | Tusk | RVAL346650 | 200 | canonical | yes | dossier | review_needed |
| 1982 | Mirage | RVAL106014 | 200 | canonical | yes | dossier | review_needed |
| 1987 | Tango In The Night | RVAL510721 | 200 | review_needed | yes | dossier | reused_cover_cache |
| 1988 | Greatest Hits | RVAL261741 | 200 | canonical | yes | dossier | review_needed |
| 1990 | Behind The Mask | RVAL356182 | 404 | broken | yes | dossier | r2_publish_gap |
| 1997 | The Dance | RVAL768327 | 200 | review_needed | yes | dossier | reused_cover_cache |
| 2002 | The Very Best Of Fleetwood Mac | RVAL741776 | 200 | canonical | yes | dossier | review_needed |
| 2003 | Say You Will | RVAL067876 | 404 | broken | yes | dossier | r2_publish_gap |
| 2004 | Live In Boston | RVAL530983 | 404 | broken | yes | dossier | r2_publish_gap |
| 2013 | Extended Play (EP) | RVAL264515 | 404 | broken | yes | dossier | r2_publish_gap |
| 2013 | Opus Collection | RVAL101352 | — | missing | no | — | missing_assignment |
| 2018 | 50 Years: Don't Stop | RVAL335875 | 404 | broken | yes | dossier | r2_publish_gap |

### Spotlight albums

**Fleetwood Mac In Chicago** (1971) · id 34693 · RVAL110155
- Assigned: https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev/retroverse/covers/RVAL110155/RVAL110155__fleetwood-mac__fleetwood-mac-in-chicago.jpg
- Status: **canonical** · review_needed
- Reasons: strong_album_title_evidence

**Rumours** (1977) · id 34703 · RVAL000003
- Assigned: https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev/retroverse/covers/RVAL000003/RVAL000003__fleetwood-mac__rumours.jpg
- Status: **canonical** · review_needed
- Reasons: strong_album_title_evidence

**The Dance** (1997) · id 34706 · RVAL768327
- Assigned: https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev/retroverse/covers/RVAL768327/RVAL768327__fleetwood-mac__the-dance.jpg
- Status: **review_needed** · reused_cover_cache
- Reasons: same_artist_different_album_shared_image

## Gary Wright

| Metric | Count |
| --- | ---: |
| Albums in graph | 5 |
| With RVAL | 5 |
| Canonical covers | 2 |
| Review needed | 0 |
| Broken (path but no asset) | 3 |
| Missing assignment | 0 |

### Discography

| Year | Album | RVAL | CDN | Status | Title match | Source | Root cause |
| ---: | --- | --- | ---: | --- | --- | --- | --- |
| 1975 | The Dream Weaver | RVAL741570 | 200 | canonical | yes | dossier | review_needed |
| 1977 | Light Of Smiles | RVAL994644 | 404 | broken | yes | dossier | r2_publish_gap |
| 1977 | Touch And Gone | RVAL809360 | 200 | canonical | yes | dossier | review_needed |
| 1979 | Headin' Home | RVAL721748 | 404 | broken | yes | dossier | r2_publish_gap |
| 1981 | The Right Place | RVAL503005 | 404 | broken | yes | dossier | r2_publish_gap |

### Spotlight albums

**The Dream Weaver** (1975) · id 22807 · RVAL741570
- Assigned: https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev/retroverse/covers/RVAL741570/RVAL741570__gary-wright__the-dream-weaver.jpg
- Status: **canonical** · review_needed
- Reasons: strong_album_title_evidence

**Light Of Smiles** (1977) · id 22806 · RVAL994644
- Assigned: https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev/retroverse/covers/RVAL994644/RVAL994644__gary-wright__light-of-smiles.jpg
- Status: **broken** · r2_publish_gap
- Reasons: cover_asset_missing_on_cdn

**Headin' Home** (1979) · id 22805 · RVAL721748
- Assigned: https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev/retroverse/covers/RVAL721748/RVAL721748__gary-wright__headin-home.jpg
- Status: **broken** · r2_publish_gap
- Reasons: cover_asset_missing_on_cdn

## Recommendations (no auto-fix applied)

1. Publish missing R2 assets for broken assignments (Gary Wright + Fleetwood Mac 404s).
2. Raise intelligence cover recovery floor — require album title match, not artist-only.
3. Quarantine REVIEW NEEDED covers before package/artifact generation.
4. Clear `cover-integrity-hold.json` only after spotlight albums pass CDN + title checks.

