# Track album-link recovery + human-in-the-loop healing

**Phase:** canonical enrichment healing (first pass). **No bulk auto-writes.**

## Problem

~56% of Hot 100 rows in `canonical_track_display` have **zero** `canonical_album_tracks` rows keyed by RVTR. Route + chart hydration work; **cover + album shelf** do not.

| Fixture | RVTR | Role |
|---------|------|------|
| Stand By Me · ben e. king | `RVTR430551` | Primary degraded (35 weeks, 0 links) |
| Stand By Me · david | `RVTR898681` | Wrong artist + missing links |
| Thriller | `RVTR336241` | Healthy control (links + cover) |

## Architecture (layer separation)

| Layer | Responsibility |
|-------|----------------|
| Search | Fast lookup — **locked** |
| Entity pages | Heavy hydration |
| `lib/track/album-link-recovery/` | Audit, candidate ranking, guarded apply |
| `lib/healing/` | Review sets, audit log, revalidate, cover preview |
| `/ops/healing` | Human review surface (local, `RETROVERSE_OPS=1`) |

## Review workflow

1. **Identify** — `loadHealingReviewSet("stand_by_me")` or `npm run healing:review`
2. **Propose** — deterministic `rankCandidates()` → confidence + `reasons[]`
3. **Review** — `/ops/healing` or JSON from `tools/out/healing-review-set.json`
4. **Approve** — explicit button / POST (no auto-apply)
5. **Apply** — `applyHealingAlbumLink()` → INSERT `canonical_album_tracks` + proposal log
6. **Rollback** — `rollbackHealingAlbumLink(proposalId)` deletes row where `canonical_source = 'healing_approved'`

Audit trail (always): `RETROVERSE_DATA/ops/healing/healing-audit.jsonl`  
Optional PG log: `tools/sql/track_album_link_healing_schema.sql`

## Candidate ranking (deterministic)

1. Same canonical artist (`same_artist_album`)
2. Tracklist title match (`tracklist_title_match` / `tracklist_title_unlinked`)
3. `canonical_track_album_links` via `track_family_id`
4. Release year near `first_chart_date`
5. `canonical_cover_path` / `album_artwork_links` (evidence only)

Approval threshold: **confidence ≥ 0.45** (`guardrails.ts`). Ben E. King top candidates are ~0.59–0.60 on **compilation slots** — human must verify era (1961 vs 1975+).

## Commands

```bash
# Stand By Me cluster review (≤20 tracks) + JSON
npm run healing:review

# Single RVTR audit
npm run track:audit-album-links -- RVTR430551

# Ops UI (local)
# RETROVERSE_OPS=1 RETROVERSE_HEALING_APPLY=1 npm run dev
# → /internal/ops-pin → /ops/healing
```

## APIs (ops-gated)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/ops/healing/review` | Cluster or `?rvtr=` audit + cover preview |
| POST | `/api/ops/healing/apply` | Human-approved INSERT (needs `RETROVERSE_HEALING_APPLY=1`) |
| POST | `/api/ops/healing/rollback` | Roll back by `proposalId` |

Dev preview (control center): `GET /api/healing/album-links?rvtr=…`

## Safe apply

- Env: `RETROVERSE_HEALING_APPLY=1`
- No replace if link exists; no slot steal if another RVTR occupies position
- Insert: `canonical_source = 'healing_approved'`, `review_flag = 'curated'`
- Revalidate: `/track/[rvtr]`

## Cover enrichment (preview only)

`auditCoverForRvtr(rvtr)` — if album linked but `canonical_cover_path` empty, lists `album_artwork_links` candidates. Route to welcome curator; **no auto-download or auto-approve**.

## Stand By Me diagnosis (2026-05)

- **RVTR430551** (ben e. king): charts OK; **0 album links**; no 1961 studio album in graph — top candidates are other artists' tracklist slots titled "Stand By Me" (confidence ~0.59). **Needs album ingest** (e.g. *Don't Play That Song*) before high-confidence link.
- **RVTR898681** (david): metadata collision; weak same-artist comedy albums ~0.73 — **do not apply** without artist fix.
- Cluster: 10 Hot 100 title matches; **8 degraded** missing links in first pass sample.

## Guardrails

- No destructive merges
- No replacing existing valid links
- No bulk apply
- Rollback only deletes `healing_approved` rows
