# Reunited Canonical Identity Remediation - Dry Run

## Proposed Row Changes

1. `artists`
   - Insert canonical artist `Peaches & Herb` only if no exact row exists.
   - Reason: artist ID `4128` is mixed; it owns solo Peaches albums (`Impeach My Bush`, `I Feel Cream`) and cannot be safely renamed.
   - Confidence: 100.

2. `artist_aliases`
   - Insert aliases for the new artist:
     - `Peaches & Herb`
     - `Peaches Herb`
     - `Peaches and Herb`
   - Reason: these exact labels exist in local VirtualDJ/acoustic source rows for Reunited and other Peaches & Herb tracks.
   - Confidence: 100.

3. `tracks`
   - `id=31565`, title `Reunited`: `artist_id 4128 -> Peaches & Herb artist ID`.
   - Reason: this is the authoritative charting graph track for `RVTR280043`; local media/acoustic evidence names the artist as `Peaches & Herb`.
   - Confidence: 100.

4. `track_families`
   - `id=12368`, `canonical_artist_id 4128 -> Peaches & Herb artist ID`.
   - `normalized_family_key 4128::reunited -> <new artist id>::reunited`.
   - Reason: this family belongs to the authoritative charting Reunited identity.
   - Confidence: 100.

5. `canonical_tracks`
   - `id=88692`, `RVTR280043`: `artist_id 4128 -> Peaches & Herb artist ID`, `canonical_artist_name peaches -> Peaches & Herb`, `has_vdj_media false -> true`, `identity_source hot100 -> hot100_vdj`.
   - `id=54777`, `RVTR979276`: keep `artist_id=NULL`, normalize `canonical_artist_name` to `Peaches & Herb`, keep title/RVTR, set `review_flag=duplicate_of:RVTR280043`.
   - `id=54779`, `RVTR386049`: keep `artist_id=NULL`, normalize `canonical_artist_name` to `Peaches & Herb`, keep title/RVTR, set `review_flag=duplicate_of:RVTR280043`.
   - Reason: public chart identity remains `RVTR280043`; media-only RVTRs become explicit duplicate source identities rather than conflicting public identities. Their `artist_id` remains null to preserve the `canonical_tracks` uniqueness rule for one artist/title canonical identity.
   - Confidence: 100 for artist normalization and duplicate marking.

6. `canonical_track_versions`
   - `id IN (100835,100836,100840)`: `canonical_track_id 54777/54779 -> 88692`.
   - `id=166905`: `source_artist peaches -> Peaches & Herb`.
   - Reason: VirtualDJ/acoustic observations should attach to the authoritative charting canonical track.
   - Confidence: 100.

7. `media_track_links`
   - Insert links for media asset `8876` and `7657` to graph track `31565` / family `12368` if missing.
   - Reason: both media assets are local VirtualDJ Reunited observations and currently have no track link.
   - Confidence: 100.

## Explicit Non-Changes

- Do not rename artist ID `4128`; it owns unrelated solo Peaches albums.
- Do not move albums `30903` or `30904`; they are solo Peaches records.
- Do not create an album for `2 Hot!`; no local album/RVAL/sequence row exists.
- Do not delete duplicate RVTR records.
- Do not rebuild search.
