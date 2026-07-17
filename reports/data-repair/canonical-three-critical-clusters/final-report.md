# Canonical Data Remediation - Three Critical Clusters

Local-only sprint. No deployment. No UI redesign. No resolver architecture changes. No search rebuild.

## Cluster 1

RVTR: `RVTR280043`  
Title: `Reunited`  
Current canonical artist ID: `4128`  
Current canonical artist: `peaches`

Evidence trace:

- `canonical_track_display`: `RVTR280043`, canonical track `88692`, graph track `31565`, track family `12368`, artist ID `4128`, artist `peaches`, first chart date `1979-03-17`, `has_hot100=true`, source `hot100`, confidence `0.92`.
- `tracks`: graph track `31565`, title `Reunited`, artist ID `4128`, no album ID.
- `artists`: no row exists for `Peaches & Herb`, `Peaches Herb`, or `Peaches and Herb`.
- `artist_aliases`: artist ID `4128` only has alias `Peaches`; no `Peaches & Herb` alias exists.
- `canonical_track_versions`: separate non-chart versions exist with source artists `Peaches & Herb` (`RVTR979276`, acoustic source album `2-hot`) and `Peaches Herb` (`RVTR386049`), but the public chart RVTR remains `RVTR280043 -> graph_track:31565 -> artist_id:4128`.

Current relationship:

- `RVTR280043 -> canonical_track_display.artist_id=4128 -> artists.canonical_name='peaches'`.
- No original album relationship.
- No RVAL-backed primary album.

Proposed relationship:

- The public experience should eventually be `RVTR280043 -> Peaches & Herb -> 2 Hot!`, but the required canonical artist row and album relationship do not exist locally.

Reason:

- The identity break is structural: the charting graph track is assigned to the solo `peaches` artist, while separate media/acoustic versions carry `Peaches & Herb` as labels only. Creating or merging the missing canonical artist would violate this sprint's no-merge/no-invent-data boundary.

Confidence:

- High confidence on the diagnosis.
- No write performed.

Rollback information:

- None needed; no rows updated.

## Cluster 2

RVTR: `RVTR044043`  
Title: `Heart Of Glass`  
Canonical artist ID: `1332`  
Canonical artist: `blondie`

Evidence:

- `canonical_track_display`: canonical track `65009`, graph track `23565`, track family `1423`, first chart date `1979-02-17`, peak `#1`, 21 weeks.
- Original album: album ID `24695`, RVAL `RVAL506727`, `Parallel Lines`, artist ID `1332`, release year `1978`, cover `retroverse/covers/RVAL506727/RVAL506727__blondie__parallel-lines.jpg`.
- Primary relationship: `canonical_track_album_links.id=1270`, track family `1423`, album ID `24695`, relationship `appears_on`, track number `8`, confidence `105`, source `acoustics`, review flag `ok`.
- Secondary sequence rows:
  - `canonical_album_tracks.id=497245`, album `24698`, RVAL `RVAL128935`, `The Best Of Blondie`, position `1`, `RVTR044043`.
  - `canonical_album_tracks.id=460819`, album `24692`, RVAL `RVAL574561`, `Blondie 4(0)-Ever...`, position `1`, `RVTR044043`.

Current relationship:

- Primary resolves to `Parallel Lines` through the existing original album link.
- Secondary albums are greatest-hits/compilation appearances and are legitimate secondary relationships.

Proposed relationship:

- Keep `Parallel Lines` as primary.
- Keep `The Best Of Blondie` and `Blondie 4(0)-Ever...` as secondary.

Reason:

- The resolver now correctly ranks the original studio album ahead of greatest-hits/compilation sequence rows. No incorrect primary behavior remained in the data after the resolver sprint, so deleting secondary rows would remove legitimate discography evidence.

Confidence:

- High.

Rollback information:

- None needed; no rows updated.

## Cluster 3

RVTR: `RVTR859552`  
Title: `Crimson And Clover`  
Canonical artist ID: `48`  
Canonical artist: `tommy james and the shondells`

Evidence before repair:

- `canonical_track_display`: canonical track `95902`, graph track `27405`, track family `14744`, first chart date `1968-12-14`, peak `#1`, 16 weeks.
- Existing compilation primary candidate: album ID `21805`, RVAL `RVAL545550`, `The Essentials`, artist ID `48`, release year `2011`, sequence row `366343`, position `6`, `RVTR859552`.
- Existing original album candidate: album ID `34358`, RVAL `RVAL398140`, `Crimson & Clover`, release year `1969`, cover `retroverse/covers/RVAL398140/RVAL398140__tommy-james__crimson-clover.jpg`.
- Original album defect: album ID `34358` was assigned to artist ID `5528` (`tommy james`) and its two `Crimson and Clover` sequence rows (`513865`, `477649`) pointed to `RVTR157295`, a non-chart duplicate with no graph track/year.

Current relationship before repair:

- `RVTR859552 -> RVAL545550 / The Essentials` was the only same-artist album candidate, so it became the public primary album.

Proposed relationship applied:

- `albums.id=34358`: `artist_id 5528 -> 48`.
- `canonical_album_tracks.id IN (477649, 513865)`: `canonical_track_key RVTR157295 -> RVTR859552`.

Reason:

- The original studio album already existed locally with an RVAL and cover. Its sequence title exactly matched `Crimson and Clover`, while the target charting RVTR is the canonical Hot 100 identity with graph track, chart year, and canonical artist. Reassigning the existing album and existing sequence slots avoids creating albums, merging artists, or inventing new records.

Confidence:

- Medium-high. The structural evidence is deterministic inside the local catalog, but the pre-existing `tommy james` / `tommy james and the shondells` split remains a broader catalog issue.

Rollback information:

- Rollback SQL: `reports/data-repair/canonical-three-critical-clusters/rollback-crimson-and-clover.sql`

## Rows Updated

- `albums`: 1 row
  - `id=34358`, `title='Crimson & Clover'`, `artist_id 5528 -> 48`.
- `canonical_album_tracks`: 2 rows
  - `id=513865`, album ID `34358`, position `2`, `canonical_track_key RVTR157295 -> RVTR859552`.
  - `id=477649`, album ID `34358`, position `8`, `canonical_track_key RVTR157295 -> RVTR859552`.

No rows were updated for `RVTR280043` or `RVTR044043`.

## Rollback Files

- Apply SQL: `reports/data-repair/canonical-three-critical-clusters/apply-crimson-and-clover.sql`
- Rollback SQL: `reports/data-repair/canonical-three-critical-clusters/rollback-crimson-and-clover.sql`

## Validation

Type and unit validation:

- `npx tsc -p apps/live/tsconfig.json --noEmit`: passed.
- `npx tsx --test packages/shared/lib/public/primary-album-policy.test.ts packages/shared/lib/search/resolve-search-destination.test.ts`: 6/6 passed.
- `git diff --check` on new SQL files: passed.

Public route validation on local server:

- Homepage `/`: `200`, 0.141s.
- `RVTR280043` song: `200`, 0.354s. Still renders artist `Peaches`, no primary album, no album cover. This is the documented remaining data gap.
- `RVTR044043` song: `200`, 0.406s. Renders `Blondie`, primary album `Parallel Lines`, cover `RVAL506727`, year `1979`, canonical navigation.
- `RVTR859552` song: `200`, 0.392s. Renders `Tommy James And The Shondells`, primary album `Crimson & Clover`, cover `RVAL398140`, year `1968`, canonical navigation.
- Artist `/artist/48`: `200`, 2.384s.
- Artist `/artist/1332`: `200`, 1.222s.
- Album `/album/RVAL398140`: `200`, 2.462s.
- Album `/album/RVAL506727`: `200`, 1.578s.
- Year `/rv/1968`: `200`, 1.156s.
- Year `/rv/1979`: `200`, 2.629s.
- Search `Heart Of Glass`: best match `RVTR044043`, artist `Blondie`, cover `RVAL506727`.
- Search `Crimson And Clover`: best match `RVTR859552`, artist `Tommy James And The Shondells`, cover `RVAL398140`; album result `RVAL398140`.
- Search `Reunited`: best match remains `RVTR280043`, artist `Peaches`; separate fragmented matches exist for `RVTR979276` and `RVTR386049` with `Peaches & Herb` labels.

Discovery:

- `RVTR044043`: discovery uses canonical artist/album sources; `Parallel Lines` primary is correct. Known Blondie catalog cover contamination remains visible through `RVAL086313`, unchanged because it is unrelated to primary behavior.
- `RVTR859552`: discovery now has original album `RVAL398140` as the primary album and `The Essentials` as secondary.
- `RVTR280043`: discovery remains limited/incorrect because canonical identity and album relationship are missing.

## Resolver Trace

`RVTR280043`:

- `RVTR:RVTR280043 -> canonical_track:88692 -> artist_id:4128 -> album_id:none -> canonical_year:1979 -> chart_relationships:23 -> render`
- Primary album: none.
- Local trace timings sampled: canonical track 19.08ms, relationships 23.84ms, primary album policy 0.00ms.

`RVTR044043`:

- `RVTR:RVTR044043 -> canonical_track:65009 -> artist_id:1332 -> album_id:24695 -> canonical_year:1979 -> chart_relationships:21 -> render`
- Primary album: `Parallel Lines`.
- Local trace timings sampled: canonical track 32.08ms, relationships 20.84ms, primary album policy 0.02ms.

`RVTR859552`:

- Post-repair candidates: `RVAL398140 / Crimson & Clover` and `RVAL545550 / The Essentials`.
- Resolver policy selects `Crimson & Clover` because it is same artist, non-compilation, original-era release, and has RVAL/cover evidence.
- Search and album routes confirm `RVAL398140` now renders as `Tommy James And The Shondells`.

No performance regression was observed in local route timings.

## Remaining Known Catalog Problems

- `Reunited` needs a future artist/track-family remediation sprint. Missing local canonical artist: `Peaches & Herb`. Current charting graph track is assigned to `peaches`, while non-chart media/acoustic records carry `Peaches & Herb` labels under separate RVTRs.
- `Reunited` still lacks the original album relationship and verified cover.
- `RVTR157295` remains as a duplicate/non-chart `Crimson And Clover` identity under artist ID `5528`; it was not merged or deleted.
- `tommy james` and `tommy james and the shondells` remain split artist identities beyond the one album reassignment needed for this cluster.
- Blondie album/catalog contamination remains outside this sprint: `RVAL086313` is still attached under Blondie with a Roy Clark cover path.

## Recommendation For Deployment

Do not deploy yet.

The Crimson And Clover data repair is locally validated and deployable after review, but Reunited still has a structural canonical identity gap that requires a dedicated, evidence-backed artist/track-family remediation sprint. Search was intentionally not rebuilt.
