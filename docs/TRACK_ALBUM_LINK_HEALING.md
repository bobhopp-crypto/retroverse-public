# Track album-link recovery + on-the-fly healing

Preview-only phase. **No bulk auto-writes.**

## Problem

~56% of Hot 100 rows in `canonical_track_display` have **zero** `canonical_album_tracks` rows keyed by RVTR. Route + chart hydration work; **cover + album shelf** do not.

Canonical example: **RVTR430551** (Stand By Me · ben e. king) — 35 Hot 100 weeks, `graph_track_id` present, **0 album links**, no Ben E. King studio album in `albums` for the 1961 era.

Healthy control: **RVTR336241** (Thriller) — 5 `canonical_album_tracks` rows, cover + shelf OK.

## Tables

| Table | Role |
|--------|------|
| `canonical_track_display` | Search + track page identity |
| `canonical_album_tracks` | Album sequence; `canonical_track_key` = RVTR |
| `canonical_tracks` | RVTR ↔ `graph_track_id` for charts |
| `chart_appearances` | Song journey |
| `albums` / `album_artwork_links` | Cover candidates |
| `canonical_track_album_links` | Optional family ↔ album bridge |
| `track_album_link_proposals` | Optional approval log (see SQL schema) |

## Audit tooling

```bash
# Full preview report + JSON
npm run track:audit-album-links

# Single RVTR
npm run track:audit-album-links -- RVTR430551

# Read-only SQL samples
psql ... -f tools/sql/album_link_recovery_audit.sql
```

Dev API (no writes): `GET /api/healing/album-links?rvtr=RVTR430551`

Output: `tools/out/album-link-recovery-report.json`

## Candidate ranking (deterministic)

1. Same canonical artist
2. Tracklist title match on `canonical_album_tracks`
3. Unlinked tracklist slot (title match, `canonical_track_key` empty) — backfill candidate
4. `canonical_track_album_links` via `track_family_id`
5. Release year near `first_chart_date`
6. `canonical_cover_path` / `album_artwork_links`

Each candidate includes `confidence`, `score`, `reasons[]`, `album_id`, `rvtr`.

## On-the-fly healing architecture (next)

```
track page load
  → loadTrackPage()
  → detectTrackHealingGaps(rvtr)     # lib/track/album-link-recovery/detect-gaps.ts
  → if missing_album_links:
        surface top 3 candidates (dev/curator UI later)
        human approves
        applyApprovedAlbumLinkProposal()  # gated
        revalidate /track/[rvtr]
```

## Cover-art healing (plan)

If album exists but `canonical_cover_path` is null:

1. Detect via linked album rows
2. Surface candidates from `album_artwork_links` (existing curator pipeline)
3. Log to `track_cover_healing_proposals`
4. **No auto-approve** — human sets cover after review

## Guardrails

- No destructive rewrites
- No replacing existing valid `canonical_album_tracks`
- No bulk apply without preview
- Writes require `RETROVERSE_HEALING_APPLY=1` + approved proposal log
- `apply-proposal.ts` inserts with `review_flag = 'curated'`, `canonical_source = 'healing_approved'`
- Rollback: mark proposal `rolled_back`; delete inserted row by `applied_cat_row_id` (manual/SQL for now)

## Recommended write path (when ready)

1. Curator runs audit → reviews top candidate + reasons
2. Approve in proposal log (`status = approved`)
3. Apply single row: `canonical_album_tracks(album_id, position, title, canonical_track_key)`
4. Or **backfill** existing tracklist row: `UPDATE canonical_album_tracks SET canonical_track_key = $rvtr WHERE id = $slot`
5. Re-fetch track page — cover should resolve from album

## Stand By Me diagnosis

- RVTR routing: OK
- Charts: OK (35 weeks)
- Album links: **missing**
- Ben E. King `albums` graph: only later compilation ("Supernatural", 1975) — **no 1961 studio album ingested**
- No tracklist row titled "Stand By Me" for Ben E. King to backfill
- Recovery requires **album ingest** (e.g. *Don't Play That Song*) or accepted compilation link with low confidence
