# RV04-04 Billboard Identity Chain Audit

Audit date: 2026-07-29  
Scope: Billboard Hot 100, 1978; current Postgres chart identity chain; current VirtualDJ database.xml; current audio/video matcher replay.  
Mode: read-only. No media, XML, canonical, or matcher changes were made.

## Executive finding

The four reported misses are not one defect. Billboard identity survives through `chart_appearances → tracks/artists → canonical_tracks → canonical_track_display` for all four known songs, with RVTRs present and `review_flag=ok`. The failures split into three causes:

| Song | Billboard/canonical identity | XML/media evidence | Current replay | Primary root cause |
|---|---|---|---|---|
| King Tut | RVTR774207; canonical artist is `steve martin and the toot uncommons` | Local video exists as `Steve Martin - King Tut (SNL).mp4`, but title is `King Tut (SNL)`, artist is only `Steve Martin`, and there is no exact RVTR | Audio missing; video missing | Identity/version disagreement: XML metadata is a live/SNL variant and omits the chart artist/band, so reciprocal matching rejects it |
| Hopelessly Devoted to You | RVTR193154; `olivia newton-john` | Local video exists with exact RVTR; no managed MUSIC candidate; XML also contains a separate `Grease` soundtrack audio with RVTR741415 | Audio missing; video ready | Audio asset/identity coverage gap; video chain is healthy |
| The Load-Out / Stay | RVTR277584; canonical title `Stay The Load Out` | Local audio is `Jackson Browne - Loadout Stay.mp3`, but it carries RVTR531185 (different track) and the title order differs; no matching RVTR277584 candidate | Audio missing; video missing | Wrong RVTR assignment plus title-order/version identity mismatch |
| Magnet and Steel | RVTR933991; exact canonical identity | Local video exists with exact RVTR and readable path; a second duplicate video path is stale/missing; audio is `Walter Eagan` with RVTR281923 | Audio missing; video ready | Audio is a stale/wrong-artist/wrong-RVTR asset; video chain is healthy |

## Chain trace

The active Billboard target builder reads Postgres `chart_appearances` and joins `tracks`, `artists`, `canonical_tracks`, and `canonical_track_display`. For the four songs, the chart rows resolve to one graph track each: 9626, 15930, 25899, and 23141. Their canonical records are respectively 93846/RVTR774207, 87619/RVTR193154, 77462/RVTR277584, and 97210/RVTR933991. Each record has `identity_source` (`hot100` or `hot100_vdj`), confidence 0.92 or 0.98, and `review_flag=ok`.

The earliest recoverable source in this installation is `chart_appearances`; it contains chart date, position, chart name, and track ID, but no preserved raw Billboard title/artist payload or import-batch/source URL. Therefore raw-source provenance cannot be independently reconstituted beyond the imported `tracks.title` and `artists.canonical_name` values. This is a provenance gap, not evidence of chart corruption.

`canonical_track_versions` contains one primary `graph_track`/`album_cut` row for each known song, with no media asset attached. `media_track_links` is empty for King Tut, Hopelessly Devoted, and Load-Out/Stay; Magnet and Steel has two review-required video links, both artist/title exact, but no audio link.

## Normalization replay

Current normalization is NFKD/diacritic removal, `& → and`, removal of a leading `the`, removal of feat/ft/with tails, apostrophe removal, lowercasing, and punctuation-to-space collapse. Representative before/after values:

| Before | Normalized |
|---|---|
| `Olivia Newton-John` | `olivia newton john` |
| `Steve Martin and the Toot Uncommons` | `steve martin and toot uncommons` |
| `Stay/The Load-Out` | `stay load out` |
| `The Load-Out / Stay` | `load out stay` |
| `Walter Eagan` | `walter eagan` (does not equal `walter egan`) |
| `King Tut (SNL)` | `king tut snl` (does not equal `king tut`) |

The reciprocal-confirmation rule requires a title-first or artist-first candidate to contain evidence from the other identity component. That protects against false positives, but it deliberately excludes King Tut’s `Steve Martin`/`King Tut (SNL)` candidate and Load-Out/Stay’s differently ordered title with the wrong RVTR. Exact RVTR candidates are accepted, explaining the two healthy video results.

## Candidate inventory and replay

The XML inventory contains 32,790 parsed Song entries. Replay results:

- King Tut: no accepted candidate; the plausible local SNL video is present on disk but fails chart artist/title/version reciprocity and has no chart RVTR.
- Hopelessly Devoted: one exact-RVTR video candidate, local and ready (score 100); no managed MUSIC candidate for Olivia Newton-John. The separate `Grease` MP3 is not the same chart identity.
- Load-Out/Stay: plausible audio exists, but its RVTR531185 identifies another canonical track; no candidate for RVTR277584 is accepted.
- Magnet and Steel: two exact-RVTR videos are indexed; one local path is ready and one stale path is missing. The audio candidate is not accepted as this identity and the visible audio is tagged `Walter Eagan`/RVTR281923.

## Control sample

Twenty additional random rows from the 1978-07-29 Hot 100 were inspected through the same chart and canonical joins. The sample was used as a corruption control, not as a coverage estimate: identities retained their source title/artist, graph track, canonical record, and RVTR where present. No evidence was found that the four failures arise from a chart-wide date/position or join-key corruption. The observed pattern is asset-level identity disagreement and missing media linkage.

## Smallest next fix

1. Add a review-only identity reconciliation for known alternate media labels/versions (King Tut SNL; Load-Out/Stay title order), preserving the chart RVTR and recording the alternate title/artist as a version—not a global fuzzy-match rule.
2. Correct or quarantine the wrong RVTR assignments for Load-Out/Stay and Magnet and Steel audio, then relink only the verified media assets.
3. Add raw Billboard import provenance (source URL/snapshot and original title/artist) to the chart ingestion record so future audits can prove the first hop.
4. Leave the matcher’s reciprocal-confirmation and normalization rules unchanged until those data corrections are reviewed.

## Audit conclusion

The primary defect is not Billboard chart corruption. It is a small set of media identity/version and RVTR assignment problems, plus one genuine audio-coverage gap. The safest next change is targeted data/provenance repair with review, followed by a replay of this audit; broad matching relaxation would risk converting the exact false-positive cases this audit exposed.
