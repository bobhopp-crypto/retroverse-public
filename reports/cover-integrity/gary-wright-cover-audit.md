# Gary Wright Album Cover Diagnostic

Generated: 2026-06-17T13:22:41.390Z

## Executive Summary

- **Graph assignment (Postgres):** Each album has a distinct RVAL-scoped cover path. No shared paths across the three albums.
- **Dream Weaver cover ownership:** Album id **22807** / **RVAL741570** only.
- **Visible issue:** **R2 CDN delivery gap** — Dream Weaver image exists (HTTP 200); Light of Smiles and Headin' Home return **HTTP 404** at assigned URLs.
- **Not the cause:** Wrong RVAL join, cross-album path sharing, or home-search override (search API unavailable in audit).
- **Secondary UI behavior:** Artist-page track cards without album linkage inherit **first album cover** (Dream Weaver, 1975) — affects unlinked RVTRs only, not album tiles.

## Cover Matching Logic

| Surface | Match key | Priority |
| --- | --- | --- |
| Artist album grid | RVAL | home-search override → artwork_links → albums.canonical |
| Album page | album_id via RVAL | artwork_links → albums.canonical → r2_key |
| RVTR cover loader | RVTR → canonical_album_tracks.position ASC → album_id | same resolver |

Not used for album covers: album title fuzzy match, artist-only match, RVTR on album row.

## Album Findings

| Album | Year | Album ID | RVAL | Assigned URL | R2 HTTP | Expected | Root cause |
| --- | ---: | ---: | --- | --- | ---: | --- | --- |
| The Dream Weaver | 1975 | 22807 | RVAL741570 | https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev/retroverse/covers/RVAL741570/RVAL741570__gary-wright__the-dream-weaver.jpg | 200 | Correct The Dream Weaver artwork at RVAL path | ok |
| Light Of Smiles | 1977 | 22806 | RVAL994644 | https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev/retroverse/covers/RVAL994644/RVAL994644__gary-wright__light-of-smiles.jpg | 404 | Correct Light Of Smiles artwork at RVAL path | r2_asset_missing — DB path correct, CDN object not published |
| Headin' Home | 1979 | 22805 | RVAL721748 | https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev/retroverse/covers/RVAL721748/RVAL721748__gary-wright__headin-home.jpg | 404 | Correct Headin' Home artwork at RVAL path | r2_asset_missing — DB path correct, CDN object not published |

## Dream Weaver Cover Owner

Only **album_id 22807** (RVAL741570) references `RVAL741570__gary-wright__the-dream-weaver.jpg`.

## Staging Assets (local, not CDN)

- `RETROVERSE_DATA/logs/itunes-artwork-fill/.../RVAL994644__gary-wright__light-of-smiles.jpg` — exists locally, not on R2
- `RETROVERSE_DATA/logs/itunes-artwork-fill/.../RVAL721748__gary-wright__headin-home.jpg` — exists locally, not on R2
- Staging hashes differ from Dream Weaver R2 file (not duplicate bytes mis-assigned).

## Tracks per Album

### The Dream Weaver

- RVTR502074 · Made To Love You (pos 2)
- RVTR923611 · Love Is Alive (pos 6)
- RVTR893127 · Dream Weaver (pos 9)

### Light Of Smiles

- RVTR340832 · Phantom Writer (pos 11)

### Headin' Home

_No canonical_album_tracks rows._


## Verdict

| Issue type | Applies? |
| --- | --- |
| Bad cover assignment data (wrong RVAL/path on wrong album) | **No** |
| Incorrect SQL join | **No** |
| Incorrect fallback showing Dream Weaver on other album tiles | **No** (404 → placeholder, not cross-album swap) |
| UI rendering bug | **No** |
| **R2 publish gap** (paths assigned, objects missing) | **Yes** — Light of Smiles + Headin' Home |
