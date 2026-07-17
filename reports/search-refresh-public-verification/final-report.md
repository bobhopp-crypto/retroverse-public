# Canonical Search Refresh and Public Verification — Final Report

Local-only sprint. No deployment. No production changes. No VirtualDJ writes. No resolver architecture changes. No UI redesign.

## Search Refresh

Search was refreshed against the repaired local canonical catalog.

The runtime Search path now uses the refreshed `search_entities` materialized view when present. The inline fallback was kept, but brought into the same contract so local/dev fallback behavior matches the refreshed artifact.

Search-layer changes made:

- `search_entities` now carries numeric canonical artist IDs for Artist routing.
- Track rows marked `duplicate_of:*` are excluded from Search sources.
- Search ranking now includes chart-strength fields for tracks:
  - `peak_hot100_position`
  - `chart_weeks`
  - `has_hot100`
  - `has_vdj_media`
- Best Match now prefers exact canonical songs over exact-title albums.
- Autocomplete no longer uses the old soft artist anchor that could prefer a cover/alternate because it had more title variants.

## Search Artifacts Rebuilt

Rebuilt locally:

- Postgres materialized view: `search_entities`
- Indexes:
  - `search_entities_norm_prefix`
  - `search_entities_normalized_trgm`
  - `search_entities_type_norm`

Verification:

- `pg_trgm`: enabled
- `search_entities`: materialized view present
- row count: `80,122`

Entity counts:

- albums: `21,887`
- artists: `8,982`
- tracks: `49,185`
- years: `68`

No generated experiences, packages, broadcasts, or VirtualDJ files were rebuilt.

## Duplicate Search Results Removed

Target checks after refresh:

| Query | Canonical Best Match | Autocomplete First Song | Duplicate media hidden |
|---|---|---|---|
| Reunited | `RVTR280043` — Peaches & Herb | `RVTR280043` | yes |
| Heart Of Glass | `RVTR044043` — Blondie | `RVTR044043` | yes |
| Crimson And Clover | `RVTR859552` — Tommy James And The Shondells | `RVTR859552` | yes |
| Sweet Home Alabama | `RVTR708312` — Lynyrd Skynyrd | `RVTR708312` | yes |
| Dizzy | `RVTR148724` — Tommy Roe | `RVTR148724` | yes |

Legitimate cover/alternate recordings may still appear as secondary Search results. Duplicate media marker rows do not appear as separate canonical destinations.

## Public Verification

Verified locally on Public V3 dev server at `127.0.0.1:3100`.

Surface status:

- Home: `200`
- Song: `200`
- Artist: `200`
- Album: `200` where a canonical album exists
- Year: source data resolves correctly; year links were not always exposed as direct hrefs in the song HTML
- Search: `200`

Route checks:

| RVTR | Song | Artist | Album | Year | Notes |
|---|---|---|---|---|---|
| `RVTR280043` | Reunited | Peaches & Herb | missing | 1979 | corrected artist; original album still missing by catalog evidence |
| `RVTR044043` | Heart Of Glass | Blondie | Parallel Lines | 1979 | cover present |
| `RVTR859552` | Crimson And Clover | Tommy James And The Shondells | Crimson & Clover | 1968 | cover present |
| `RVTR708312` | Sweet Home Alabama | Lynyrd Skynyrd | Second Helping | 1974 | cover present |
| `RVTR148724` | Dizzy | Tommy Roe | Dizzy | 1969 | cover present |

No invented relationships were introduced. Reunited remains album-incomplete because the prior remediation sprint found no deterministic local original-album evidence.

## Design Studio Verification

Existing Public V3 Design Studio route verified:

- `/review/public-v3?trace=1`: `200`
- Six panes present:
  - Home
  - Song
  - Artist
  - Album
  - Year
  - Search

No UI or styling changes were made.

## Search Performance

Measured locally after refresh.

Full Search API:

| Query | First / sampled search | Warm search |
|---|---:|---:|
| Reunited | `131.7 ms` after server warmup; initial cold sample `295.9 ms` | `50.6 ms` |
| Heart Of Glass | `49.8–61.3 ms` | `50.6 ms` |
| Crimson And Clover | `80.7–83.0 ms` | `82.9 ms` |
| Sweet Home Alabama | `50.9–55.2 ms` | `53.2 ms` |
| Dizzy | `50.5–52.2 ms` | `56.7 ms` |

Autocomplete suggestions:

| Query | Suggestions |
|---|---:|
| Reunited | `11.0–18.4 ms` after warmup |
| Heart Of Glass | `8.8 ms` |
| Crimson And Clover | `66.9 ms` first after overlay change |
| Sweet Home Alabama | `14.9 ms` |
| Dizzy | `10.3 ms` |

Compared with the pre-refresh Reunited Search API sample around `~1,000 ms`, the refreshed matview path is materially faster and stable on warm requests.

## VirtualDJ Readiness Report

Readiness only; no VirtualDJ files were read, written, or modified.

Definitions used:

- Canonical RVTR: `canonical_track_display` row not marked `duplicate_of:*`.
- Complete public experience: canonical artist identity, chart year, album relationship, and album cover.
- Suitable for automatic VirtualDJ mapping: canonical artist identity, track family, chart year, and at least one VirtualDJ media version.

Counts:

- Total canonical RVTRs: `49,185`
- Tracks with complete public experience: `7,449`
- Tracks missing album: `41,138`
- Tracks missing cover where an album exists: `598`
- Tracks missing artist identity: `7,642`
- Tracks with duplicate media versions: `4,068`
- Tracks suitable for automatic VirtualDJ mapping: `5,522`

Supporting source counts:

- `canonical_track_versions` acoustic: `33,163`
- `canonical_track_versions` graph_track: `32,209`
- `canonical_track_versions` vdj_media: `28,224`

## Remaining Catalog Problems

- Reunited still lacks a verified original album relationship and cover path.
- Search still exposes legitimate cover/alternate recordings as secondary results; these are not duplicate-media rows.
- Some canonical tracks still lack artist identity, album relationships, or cover coverage.
- Sweet Home Alabama still has internal alternate/misspelled media rows, but Search ranks the canonical Lynyrd Skynyrd RVTR first.

## Recommendation For Production Deployment

Do not deploy directly from this sprint alone.

Recommended production sequence:

1. Apply the approved catalog remediation migration package.
2. Run the updated `search_entities` refresh against production.
3. Verify Search API reports `entitySource=matview`.
4. Smoke-test the five target queries in production/staging.
5. Only then deploy the Search-layer code changes.

Stop before deployment.
