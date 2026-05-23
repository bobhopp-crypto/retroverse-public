# Retroverse Local Postgres Graph Audit

**Date:** 2026-05-22  
**Mode:** Read-only inspection (no code changes, no installs, no live DB connections, no commits)  
**Primary codebase:** `/Users/bobhopp/RETROVERSE_v2/apps/retroverse-welcome`  
**This repo (`RETROVERSE_PUBLIC`):** No Postgres client or graph logic—search proxies to welcome.

---

## Executive summary

Retroverse’s **canonical authoring graph** lives in a **local-only** PostgreSQL database named **`retroverse`**, reached at **`localhost`** (default port **5432**) as OS user **`bobhopp`**, via a single shared `pg.Pool` in `lib/integrity-console/pg.ts`. The app does **not** configure SSL or a custom port. Password is **optional** (`RETROVERSE_PG_PASSWORD`, default empty string)—typical for local macOS trust/peer auth.

This database is **separate from hosted Supabase** (`retroverse_*` tables). Local PG is the SQL-first merge/integrity layer; Supabase is the deployed entity API. **Home-search track panels prefer local PG** (`canonical_track_display`); **artist/album panels prefer Supabase** with dossier JSON fallbacks.

There is **no Docker Compose** or project-level **MCP Postgres** config in either repo. Inspection tooling exists: **`/integrity`**, **`integrity_console/sql/*` reports**, **`scripts/diag_search_infra.ts`**, and architecture docs—not a formal ER diagram.

---

## Connection configuration (verified from code + env)

### Environment variables

| Variable | In `welcome/.env.local`? | Code default | Notes |
|----------|-------------------------|--------------|-------|
| `RETROVERSE_PG_HOST` | Yes | `localhost` | |
| `RETROVERSE_PG_DATABASE` | Yes | `retroverse` | |
| `RETROVERSE_PG_USER` | Yes | `bobhopp` | Matches `psql` examples in docs/scripts |
| `RETROVERSE_PG_PASSWORD` | **No** (not in local file) | `""` (empty) | Supported in `pg.ts`; scripts also pass it |
| `RETROVERSE_PG_PORT` | **No** | *(unset)* | `node-pg` → **5432** |
| `RETROVERSE_CANONICAL_GRAPH` | Not listed in env audit | enabled unless `=0` | Disables all graph reads in app |

**`RETROVERSE_PUBLIC`:** `.env.example` only documents `SEARCH_UPSTREAM_BASE_URL`—no Postgres vars.

**`welcome`:** `.env.local` exists; keys observed (names only): `RETROVERSE_PG_HOST`, `RETROVERSE_PG_USER`, `RETROVERSE_PG_DATABASE`, plus Supabase/R2/Discogs keys. No committed `.env.example` in welcome (per `docs/cursor_setup_audit.md`).

### Client setup (single pool)

```7:14:/Users/bobhopp/RETROVERSE_v2/apps/retroverse-welcome/lib/integrity-console/pg.ts
    pool = new Pool({
      host: process.env.RETROVERSE_PG_HOST ?? "localhost",
      database: process.env.RETROVERSE_PG_DATABASE ?? "retroverse",
      user: process.env.RETROVERSE_PG_USER ?? "bobhopp",
      password: process.env.RETROVERSE_PG_PASSWORD ?? "",
      max: 5,
    });
```

- **SSL:** not set → local non-TLS assumption.
- **Consumers:** `integrityQuery()` → `lib/integrity-console/*`, `lib/canonical-graph/*`, `lib/load-canonical-track-graph.ts`, `lib/load-track-acoustic-profile.ts`, `lib/resolve-primary-track-album.ts`, etc.
- **Re-export:** `lib/canonical-graph/pg.ts` adds `isCanonicalGraphEnabled()` and `canonicalGraphPing()`.

### How the DB is expected to run

| Question | Finding |
|----------|---------|
| **Local-only?** | **Yes** for dev/authoring. Defaults are `localhost` + macOS username. Vercel deploy does not bundle this DB; graph routes on Vercel only work if env points at a reachable host (unusual). |
| **Docker?** | **No** `docker-compose` or container docs under `RETROVERSE_v2`. |
| **Postgres.app vs Homebrew?** | **Not specified in repo.** All tooling assumes `psql -h localhost -U bobhopp -d retroverse`—compatible with either native install. |
| **Startup assumption** | Developer runs PostgreSQL locally, database `retroverse` already created and populated via `integrity_console/sql` + `npm run graph:*` / Python export scripts. Next.js loads `.env.local` on `npm run dev`. |

### Package.json / CLI references

`retroverse-welcome/package.json` invokes **`psql -h localhost -U bobhopp -d retroverse`** for graph loads (e.g. `graph:canonical-tracks:load`, `graph:canonical-track-graph:load`, VDJ staging). No `pg` CLI wrapper beyond that.

**Dependency:** `"pg": "^8.21.0"` (welcome only). `RETROVERSE_PUBLIC` has no `pg` dependency.

---

## MCP and external DB tooling

| Location | Result |
|----------|--------|
| `retroverse-welcome/.cursor/` | No MCP config found |
| `RETROVERSE_PUBLIC/.cursor/` | Rules only (`retroverse-design.mdc`, `retroverse-data.mdc`) |
| Project `mcp.json` | **None** in either Retroverse repo |

Cursor DB access would be **manual** (user-level MCP or DB extension)—not pre-wired in these projects.

---

## Data plane: where truth lives

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         AUTHORING / INTEGRITY                             │
│  Local PostgreSQL `retroverse` @ localhost                               │
│  • artists, albums, tracks, chart_appearances (facts)                    │
│  • canonical_tracks / canonical_track_versions (RVTR layer)              │
│  • canonical_album_tracks, album_external_keys (RVAL bridge)             │
│  • staging_* buffers, media_assets, linkage tables                       │
│  • SQL: integrity_console/sql/001–912                                    │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ export / sync / bridge (scripts)
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Hosted Supabase (retroverse_artists, retroverse_albums,                 │
│  retroverse_tracks, chart tables, artwork) — deployed read/write API      │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
┌───────────────────────────────┴──────────────────────────────────────────┐
│  JSON bundles (public/data/*), SQLite (Hot100/B200), R2 covers, VDJ XML   │
│  Experience / fallback / ingest sources — not the PG authoring graph        │
└──────────────────────────────────────────────────────────────────────────┘
```

### Authoritative systems (by concern)

| Concern | Authoritative | Notes |
|---------|-------------|-------|
| Graph merges, duplicate analysis, B200 ingest into PG | **Local PG** | `integrity_console/README.md` |
| Chart facts on PG | **`chart_appearances`** | “never rewritten” in analysis phases |
| Public RVTR identity in app (when graph on) | **`canonical_tracks` / `canonical_track_display`** | Hot 100 + VDJ eligibility per `docs/canonical_track_graph_architecture.md` |
| RVAL ↔ Postgres `album_id` | **`album_external_keys`** | Bridge from dossier RVALs |
| Deployed search artists/albums | **Supabase** first | Dossier JSON fallback |
| Deployed search tracks (when graph reachable) | **Local PG view** first | Then Supabase `retroverse_tracks` |
| What you play (paths, cues) | **VirtualDJ `database.xml`** | Operational—not canonical identity |
| Album dossier UX (acoustic, editorial copy) | **JSON** `album-dossiers.json` | Overlaps graph for sequences |

---

## Canonical tables and views (local PG)

From `integrity_console/README.md`, `docs/retroverse_system_architecture_audit.md`, and SQL migrations:

### Core canonical entities

| Object | Role |
|--------|------|
| `artists` | Artist identity (internal `artist_id`) |
| `albums`, `album_editions` | Album identity |
| `tracks` | Graph track rows (pre-RVTR lineage) |
| `chart_appearances` | Historical chart facts |
| `track_families`, `track_family_members` | Variant grouping |

### RVTR / RVAL graph layer

| Object | Role |
|--------|------|
| `canonical_tracks` | Public song identity (`RVTR######`) |
| `canonical_track_versions` | Recordings, VDJ, acoustic, graph track rows |
| **`canonical_track_display`** | **View** — primary app/search read surface |
| `canonical_album_tracks` | Album sequence + `canonical_track_key` (RVTR) |
| `album_external_keys` | `RVAL######` ↔ `album_id` |
| `album_artwork_links` | Cover linkage + R2 keys |

### Linkage & operational (non-identity)

| Object | Role |
|--------|------|
| `canonical_track_album_links`, `chart_track_album_links` | Bridge tables |
| `staging_billboard_200_*`, `staging_virtualdj_tracks`, `staging_*_import_buffer` | Ingest buffers |
| `media_assets`, `media_track_links` | Playback files (VDJ/R2) |

### Staging → load pipeline (examples)

- `1201` / `1203` — canonical track graph schema + populate  
- `1101`–`1104` — canonical album track sequences + RVTR backfill  
- `1001`–`1003` — album artwork bridge  
- `910`–`912` — VDJ instances/cues staging (in flight per git status)

---

## What powers search and entity expansion

Documented in `docs/search_local_infra.md` and implemented in `lib/home-search/`.

### Track search (local PG — graph first)

| Function | SQL surface |
|----------|-------------|
| `searchCanonicalTracksByArtist` | `FROM canonical_track_display WHERE lower(canonical_artist_name) = …` |
| `searchCanonicalTracksByTitle` | `FROM canonical_track_display WHERE canonical_title ILIKE …` |
| `loadCanonicalTrackById` | `canonical_track_display` by `track_id` (RVTR) |

Called from `lib/home-search/supabase.ts` **before** Supabase track queries. Artist expansion (`expand-artist-universe.ts`) loads graph tracks via `searchCanonicalTracksByArtist`.

### Album / artist context in expansion

| Source | Used for |
|--------|----------|
| `canonical_album_tracks` + `album_external_keys` | Album track routes, linked album subtitles in search (`load-canonical-track-graph.ts`, `resolve-primary-track-album.ts`) |
| `getAlbumDossier` / `artist-universe.json` | Artist-first expansion when graph/Supabase thin |
| Supabase `retroverse_artists` / `retroverse_albums` | Primary artist/album panels |
| SQLite Hot 100 DB | Chart weeks + track fallback when no primary artist |

### Year album browse (not search, but graph)

`lib/canonical-graph/queries.ts` reads `albums`, `album_external_keys`, chart aggregates for `/albums?year=` when graph enabled.

### Feature flag

`RETROVERSE_CANONICAL_GRAPH=0` → all `integrityQuery` graph paths short-circuit; search falls back to Supabase/dossier/Hot100 only.

---

## Data flow (search example)

```
User query
    → retroverse-welcome runHomeSearch()
        → [optional] buildArtistExpandedSearch()  (dossier + graph tracks + Hot100)
        → Supabase artists/albums (unless skipped)
        → searchTracksForCanonicalArtistName / searchSupabaseTracks
              → searchCanonicalTracksBy*  →  LOCAL PG canonical_track_display
              → else retroverse_tracks (Supabase REST)
        → merge + rank + panel limits
    → JSON HomeSearchPayload

RETROVERSE_PUBLIC /api/search
    → proxy GET …/api/home-search
    → mapHomeSearchToPanels (UI only)
```

---

## Inspection and schema documentation

| Asset | Type |
|-------|------|
| `integrity_console/README.md` | Phased SQL catalog (001–912), run order, mutate vs read-only |
| `docs/canonical_track_graph_architecture.md` | RVTR layer + load commands |
| `docs/retroverse_system_architecture_audit.md` | Full data-plane topology |
| `docs/search_local_infra.md` | Local verify: `SELECT count(*) FROM canonical_track_display` |
| `docs/retroverse_album_coverage_audit.md` | PG vs Supabase corpus counts |
| `app/integrity` + `lib/integrity-console/*` | Read-only explorer over PG (operator UI) |
| `scripts/diag_search_infra.ts` | `canonicalGraphPing()` + sample graph/search probes |
| `integrity_console/sql/*_report.sql`, `*_dry_run.sql` | SQL inspection (prefer dry-run files) |

**No** dedicated ER/schema diagram file was found in the repo (`*schema*diagram*` glob empty).

---

## READ-ONLY safety

| Safe | Avoid |
|------|-------|
| `SELECT` on views/tables (`canonical_track_display`, reports in `*_report.sql`) | `npm run graph:*:load`, `*_execute.sql`, `*_population_execute.sql` |
| `canonicalGraphPing()` / `diag_search_infra.ts` (read queries; script also hits Supabase) | `003_artist_merge_execute.sql`, bulk merges, TRUNCATE staging in package.json |
| `/integrity` explorer (read paths) | Running populate scripts without dry-run review |
| SQL files marked **“Modifies data? No”** in integrity README | Sharing write credentials into Cursor MCP |

**Password auth:** Not required in current `.env.local` (empty password default). If your cluster uses password auth, set `RETROVERSE_PG_PASSWORD` locally—do not commit.

**SSL:** Not used for local pool; do not point local env at remote PG without adding SSL options (not implemented in code today).

---

## RETROVERSE_PUBLIC vs welcome (Postgres)

| | RETROVERSE_PUBLIC | retroverse-welcome |
|---|-------------------|-------------------|
| Postgres | **None** | **Yes** — full graph |
| Search data | Proxies to welcome | Computes home-search |
| Env | `SEARCH_UPSTREAM_BASE_URL` only | `RETROVERSE_PG_*` + Supabase |

---

## Safest next step for Cursor DB access

1. **Confirm local Postgres is running** (outside this audit): `psql -h localhost -U bobhopp -d retroverse -c "SELECT 1"` — only on your machine, when you choose to connect.

2. **Use a read-only role or read-only session** if your cluster supports it; otherwise restrict to `SELECT` and dry-run SQL files.

3. **Start with documented smoke queries** from `docs/search_local_infra.md`:
   - `SELECT count(*) FROM canonical_track_display;`
   - Sample: `SELECT track_id, canonical_title, canonical_artist_name FROM canonical_track_display LIMIT 5;`

4. **Use app-level ping without writes:** `npx tsx scripts/diag_search_infra.ts` (loads `.env.local`; hits PG + Supabase—run only when you accept network to Supabase).

5. **Browse structure via SQL catalog:** `integrity_console/sql/405_album_graph_preview.sql`, `1202_canonical_track_graph_report.sql` (report-only).

6. **For Cursor MCP:** add a **project-local** Postgres MCP (or DB extension) pointing at `localhost:5432/retroverse`, user `bobhopp`, **read-only** credentials—document connection in your user MCP config, not in git. Mirror keys in a future `welcome/.env.example` (keys only) if desired.

7. **Do not** point production Supabase credentials at local PG tooling; keep the two databases mentally separate.

---

## Gaps / unknowns (not guessed)

- Exact PostgreSQL distribution (Postgres.app vs Homebrew vs other) is **not** recorded in repo.
- Live row counts, migration version, and whether `retroverse` DB exists on this machine were **not** checked (no connection per audit rules).
- Whether `RETROVERSE_PG_PASSWORD` is set in shell profile vs `.env.local`—only `.env.local` was key-scanned; password key absent there.
- Remote/graph-on-Vercel PG hosting is **not** a documented production path; default assumption remains **local dev**.

---

## Related files (quick index)

| Path | Purpose |
|------|---------|
| `lib/integrity-console/pg.ts` | Pool + `integrityQuery` |
| `lib/canonical-graph/pg.ts` | Enable flag + ping |
| `lib/load-canonical-track-graph.ts` | RVTR loaders + search queries |
| `lib/home-search/supabase.ts` | Graph-before-Supabase track search |
| `integrity_console/sql/1201_canonical_track_graph_schema.sql` | `canonical_track_display` definition |
| `package.json` scripts `graph:*` | psql load pipelines |
| `docs/search_local_infra.md` | Operator smoke tests |
