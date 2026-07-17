# Reunited Canonical Identity Remediation — Final Report

Local-only sprint. No deployment, no search rebuild, no UI redesign, no resolver architecture changes, no broad artist merge.

## Cluster Inventory

- Target RVTR: `RVTR280043`
- Title: `Reunited`
- Chart graph track: `tracks.id=31565`
- Track family: `track_families.id=12368`
- Pre-repair public artist: `artists.id=4128`, canonical name `peaches`
- Post-repair public artist: `artists.id=9051`, canonical name `Peaches & Herb`
- Duplicate media-only canonical rows retained:
  - `canonical_tracks.id=54777`, `track_id=RVTR979276`
  - `canonical_tracks.id=54779`, `track_id=RVTR386049`
- Media evidence attached to the canonical chart track:
  - `media_assets.id=8876`, VirtualDJ video, source artist `Peaches & Herb`
  - `media_assets.id=7657`, VirtualDJ audio, source artist `Peaches Herb`

## Canonical Artist Decision

Decision: create a new canonical artist, `Peaches & Herb`, instead of renaming or merging `artists.id=4128`.

Reason: `artists.id=4128` also owns unrelated solo Peaches albums. Renaming that artist would contaminate valid solo Peaches data. The structural break was that the charting track, family, and canonical RVTR for `Reunited` pointed to the solo Peaches artist while media/acoustic evidence carried Peaches & Herb naming.

New canonical artist:

- `artists.id=9051`
- `canonical_name=Peaches & Herb`

Aliases inserted for the new artist:

- `Peaches & Herb` preferred
- `Peaches Herb`
- `Peaches and Herb`

Confidence: high for artist identity; the charting hit, local media assets, and duplicate canonical observations all converge on Peaches & Herb.

## Track Family Decision

Decision: preserve `RVTR280043` as the authoritative public RVTR and move the Reunited chart graph/family identity to `artists.id=9051`.

Post-repair canonical state:

- `RVTR280043`
  - `canonical_tracks.id=88692`
  - `artist_id=9051`
  - `canonical_artist_name=Peaches & Herb`
  - `graph_track_id=31565`
  - `track_family_id=12368`
  - `has_hot100=true`
  - `has_vdj_media=true`
  - `identity_source=hot100_vdj`
  - `review_flag=ok`
  - versions: `4`

Duplicate rows were not deleted:

- `RVTR979276` remains as a media-only duplicate marker with `review_flag=duplicate_of:RVTR280043` and zero versions.
- `RVTR386049` remains as a media-only duplicate marker with `review_flag=duplicate_of:RVTR280043` and zero versions.

## Original Album Finding

No original studio album relationship was repaired in this sprint.

Finding: the expected original Peaches & Herb album evidence was not present locally as a deterministic canonical album/RVAL relationship. The local album rows under the old `peaches` artist are solo Peaches albums and were deliberately left unchanged.

Conclusion: original album remains missing/unresolved in local canonical data. No album was created, renamed, merged, or linked.

## Backup Files

Created under [reports/data-repair/reunited-canonical-remediation](</Users/bobhopp/RETROVERSE_PUBLIC/reports/data-repair/reunited-canonical-remediation>):

- `backup-before.json`
- `backup-before.csv`
- `dry-run-report.md`
- `apply-reunited-local.sql`
- `rollback-reunited-local.sql`
- `production-apply-crimson-and-reunited.sql`
- `production-rollback-crimson-and-reunited.sql`
- `production-verification-queries.sql`

## Rows Changed

Local rows changed:

- `artists`: 1 inserted
- `artist_aliases`: 3 inserted
- `tracks`: 1 updated
- `track_families`: 1 updated
- `canonical_tracks`: 3 updated
- `canonical_track_versions`: 4 updated
- `media_track_links`: 2 inserted

Inserted media links:

- `media_track_links.id=10697`, `media_asset_id=8876`, `track_id=31565`, `track_family_id=12368`, `confidence_score=100`
- `media_track_links.id=10698`, `media_asset_id=7657`, `track_id=31565`, `track_family_id=12368`, `confidence_score=100`

No album rows were changed.

## Rows Deliberately Unchanged

- `artists.id=4128` remains `peaches`.
- Existing solo Peaches album rows remain unchanged.
- Duplicate canonical rows `RVTR979276` and `RVTR386049` were retained, not deleted.
- No canonical album relationship was invented.
- No search index or generated search artifact was rebuilt.
- No resolver architecture or public UI styling was changed.

## Local Validation

Validated locally against the existing resolver.

- Song: `RVTR280043` resolves to `Peaches & Herb`, artist id `9051`, canonical track `88692`.
- Artist: `/artist/9051` renders `Peaches & Herb` and includes `Reunited`.
- Year: 1979 chart source now resolves the four #1 weeks for `Reunited` to `Peaches & Herb`.
- Search API: best match for `Reunited` is now `RVTR280043` by `Peaches & Herb`.
- Type checks passed:
  - live TypeScript check
  - studio TypeScript check
- Existing focused resolver/search tests passed.

Known local validation note: search suggestions can still surface duplicate media RVTRs until a future targeted search refresh/filter pass. That was intentionally not performed in this sprint.

## Search Impact Before Refresh

Search was not rebuilt.

Current impact:

- The best match is corrected to canonical `RVTR280043`.
- Duplicate media-only RVTRs can still appear in search result panels because search still reads existing canonical display rows and the sprint explicitly stopped before search refresh.
- Source rows now carry `duplicate_of:RVTR280043`, so the next search sprint has a deterministic marker to filter or collapse them.

## Production Migration Package

Prepared but not executed:

- [production-apply-crimson-and-reunited.sql](</Users/bobhopp/RETROVERSE_PUBLIC/reports/data-repair/reunited-canonical-remediation/production-apply-crimson-and-reunited.sql>)
- [production-rollback-crimson-and-reunited.sql](</Users/bobhopp/RETROVERSE_PUBLIC/reports/data-repair/reunited-canonical-remediation/production-rollback-crimson-and-reunited.sql>)
- [production-verification-queries.sql](</Users/bobhopp/RETROVERSE_PUBLIC/reports/data-repair/reunited-canonical-remediation/production-verification-queries.sql>)

These files include the prior Crimson repair package plus the Reunited remediation package so production can apply both in order when approved.

## Rollback Procedure

Local rollback file:

- [rollback-reunited-local.sql](</Users/bobhopp/RETROVERSE_PUBLIC/reports/data-repair/reunited-canonical-remediation/rollback-reunited-local.sql>)

Rollback restores:

- `tracks.id=31565` to artist `4128`
- `track_families.id=12368` to artist `4128`
- `RVTR280043` to pre-repair artist metadata
- canonical media/acoustic versions back to their prior duplicate rows
- duplicate canonical track review flags to their prior state
- media links inserted by this sprint are marked rolled back
- the new `Peaches & Herb` artist/aliases are removed only if no remaining references block removal

## Remaining Risks

- Original album remains unresolved because deterministic local album evidence is missing.
- Cover remains unresolved for the original album path because there is no verified original album relationship.
- Search still needs a future refresh/collapse pass to hide or merge duplicate media-only RVTR suggestions.
- Year/month UI may need a cache restart or targeted generated artifact refresh if a running dev server holds stale chart-history payloads; the database source itself now resolves Reunited’s May 1979 #1 weeks to `Peaches & Herb`.

## Recommended Next Sprint

Run a targeted “Reunited album evidence” sprint:

1. Locate or ingest the original Peaches & Herb studio album evidence for `Reunited`.
2. Link `RVTR280043` to the verified original album only if a deterministic RVAL/album row exists or is created from source-backed data.
3. Refresh only the affected search/generated artifacts.
4. Add duplicate-RVTR collapse behavior to search using `duplicate_of:RVTR280043`.

Stop before deployment.
