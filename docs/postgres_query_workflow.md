# Retroverse Postgres Query Workflow (Read-Only)

**Database:** `retroverse` @ `localhost:5432`  
**User:** `bobhopp`  
**Primary search surface:** `canonical_track_display` (view over `canonical_tracks`)

This workflow is for **inspection and validation only**. It does not replace `integrity_console/sql` execute pipelines or app loaders.

See also: [postgres_graph_audit.md](./postgres_graph_audit.md), [RETROVERSE_PROJECT_CONTEXT.md](./RETROVERSE_PROJECT_CONTEXT.md)

---

## Safety rules (non-negotiable)

Retroverse local Postgres is **canonical graph truth** for authoring and track search.

| Do | Do not |
|----|--------|
| `SELECT`, `EXPLAIN`, `COUNT`, `LIMIT` | `INSERT`, `UPDATE`, `DELETE` |
| Read-only reports in `tools/sql/` | `ALTER`, `DROP`, `TRUNCATE` |
| Dry-run SQL in `integrity_console/sql/*_dry_run.sql` | `*_execute.sql`, `npm run graph:*:load` |
| Additive enrichment via reviewed pipelines | Casual graph edits from Cursor |

Prefer: **inspection → validation → diagnostics →** then (separately) reviewed writes in welcome/integrity tooling.

---

## Prerequisites

1. PostgreSQL running locally with database `retroverse` populated.
2. `psql` on your PATH.
3. Optional: `retroverse-welcome` `.env.local` with `RETROVERSE_PG_*` (for app-side pings only).

**Connection (read-only session):**

```bash
psql -h localhost -p 5432 -U bobhopp -d retroverse
```

If password auth is enabled on your cluster, set `PGPASSWORD` in your shell (never commit it).

**Run a safe query file:**

```bash
cd /Users/bobhopp/RETROVERSE_PUBLIC
psql -h localhost -p 5432 -U bobhopp -d retroverse -f tools/sql/track_lookup.sql
```

**One-liner smoke test (matches search infra doc):**

```bash
psql -h localhost -U bobhopp -d retroverse -c "SELECT count(*) FROM canonical_track_display;"
```

---

## How to safely inspect the graph

### 1. Ping connectivity

```sql
SELECT 1 AS ok;
SELECT count(*) AS canonical_tracks FROM canonical_track_display;
```

### 2. Layered inspection order

| Layer | Tables / views | Question |
|-------|----------------|----------|
| Artist | `artists` | Who is the graph artist row? (`canonical_name`) |
| Album | `albums`, `album_external_keys` | What is the RVAL and internal `album_id`? |
| Track (RVTR) | `canonical_track_display` | What songs exist for search ranking? |
| Album sequence | `canonical_album_tracks` | What is the ordered tracklist + `canonical_track_key`? |
| Charts | `chart_appearances` | Hot 100 / B200 facts |
| Linkage | `canonical_track_album_links`, `chart_track_album_links` | Cross-entity bridges |
| Artwork | `album_artwork_links`, `albums.canonical_cover_path` | Cover / R2 linkage |
| Media (ops) | `media_assets`, `media_track_links` | VDJ/R2 — not song identity |

### 3. Use packaged examples

All files under `tools/sql/` are **SELECT-only**. Start with the lookup matching your ID type, then open the debug scripts.

### 4. Cross-check the app (no SQL writes)

```bash
cd /Users/bobhopp/RETROVERSE_v2/apps/retroverse-welcome
curl -s "http://localhost:3000/api/home-search?q=Fleetwood%20Mac" | jq '{artists,albums: .albums[0:3],tracks: .tracks[0:6]}'
```

Compare JSON `href` values (`/tracks/RVTR…`, `/albums/RVAL…`) to SQL rows.

### 5. Integrity console (welcome app)

With `npm run dev` on welcome, open `/integrity` — read-only explorer over the same pool. Use SQL files here when you need reproducible, copy-paste queries in Cursor.

---

## SELECT-only query patterns

### By canonical ID

| ID | Pattern |
|----|---------|
| **RVAL** | `album_external_keys.external_key = 'RVAL######'` → join `albums`, `artists` |
| **RVTR** | `canonical_track_display.track_id = 'RVTR######'` (or `retroverse_track_id`) |
| **RVAR** | Not stored in local PG bridge tables; resolve via **artist name** on `artists.canonical_name` or Supabase `retroverse_artists` |

### By name (fuzzy)

Always add `LIMIT` and prefer `ILIKE` with trimmed literals:

```sql
SELECT track_id, canonical_title, canonical_artist_name, peak_hot100_position
FROM canonical_track_display
WHERE lower(trim(canonical_artist_name)) = lower(trim('Fleetwood Mac'))
ORDER BY has_hot100 DESC, peak_hot100_position ASC NULLS LAST
LIMIT 20;
```

This mirrors `searchCanonicalTracksByArtist` in welcome.

### Explain plans (safe)

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT … LIMIT 10;
```

Use on heavy joins only; still read-only.

---

## Validating entity relationships

**Album ↔ RVAL ↔ sequence**

1. `album_external_keys` → `album_id`
2. `canonical_album_tracks` ordered by `position`
3. Check `canonical_track_key` populated (RVTR link)

**Track ↔ RVTR ↔ albums**

1. `canonical_track_display` for identity + chart flags
2. `canonical_track_album_links` or `canonical_album_tracks` for album context
3. `resolve-primary-track-album` logic is approximated in `search_expansion_debug.sql`

**Chart ↔ track**

```sql
SELECT ca.chart_name, ca.chart_date, ca.chart_position, ca.weeks_on_chart, t.title
FROM chart_appearances ca
JOIN tracks t ON t.id = ca.track_id
WHERE ca.chart_name = 'Billboard Hot 100'
LIMIT 20;
```

**Artwork**

```sql
SELECT aek.external_key, aal.r2_cover_key, aal.review_flag, al.canonical_cover_path
FROM album_external_keys aek
JOIN albums al ON al.id = aek.album_id
LEFT JOIN album_artwork_links aal ON aal.album_id = al.id
WHERE aek.external_key = 'RVAL000003'
LIMIT 5;
```

---

## Debugging search expansion

Home-search path (welcome, read in code — do not mutate):

1. Resolve **primary artist** (Supabase + dossier JSON).
2. If artist-first → `buildArtistExpandedSearch` (graph tracks + dossier albums + Hot 100).
3. Else merge Supabase panels + graph track search + Hot 100 fallback.

**SQL side for tracks (always local PG when graph on):**

- Artist match: `lower(canonical_artist_name) = lower($artist)` on `canonical_track_display`
- Title match: `canonical_title ILIKE '%needle%'`
- Order: `has_hot100 DESC`, `peak_hot100_position ASC NULLS LAST`, `chart_weeks DESC`

Run `tools/sql/search_expansion_debug.sql` and `fleetwood_mac_debug.sql` after setting variables at top of file.

**Flags that empty graph reads in app (not SQL):**

- `RETROVERSE_CANONICAL_GRAPH=0` in welcome env
- Postgres down → `canonicalGraphPing()` false
- Supabase skipped → artists/albums thin; tracks may still come from PG

---

## Inspecting canonical IDs

| Prefix | Local PG | Typical check |
|--------|----------|----------------|
| RVAL | `album_external_keys` | `SELECT * FROM album_external_keys WHERE external_key ~* '^RVAL[0-9]{6}$' … LIMIT` |
| RVTR | `canonical_track_display.track_id` | `WHERE track_id = 'RVTR######'` |
| RVAR | Usually **Supabase** / JSON dossier | Local: `artists.canonical_name`; compare to app `/artists/RVAR######` |

Validate format:

```sql
SELECT track_id FROM canonical_track_display
WHERE track_id !~ '^RVTR[0-9]{6}$'
LIMIT 10;
```

---

## Tooling map

| Tool | Location | Writes? |
|------|----------|---------|
| Safe examples | `RETROVERSE_PUBLIC/tools/sql/*.sql` | No |
| Integrity phased SQL | `retroverse-welcome/integrity_console/sql/` | Many **execute** files — avoid |
| Graph reports | `*_report.sql`, `*_dry_run.sql` | Reports: no |
| App diag | `scripts/diag_search_infra.ts` | Read queries; also hits Supabase |
| This workflow | `docs/postgres_query_workflow.md` | N/A |

---

## Optional: Cursor DB integration (document only — not installed)

No project-level Postgres MCP exists today. When you choose to add one:

1. **Postgres MCP** or **SQLTools** extension in Cursor/VS Code.
2. Connection: `localhost:5432`, database `retroverse`, user `bobhopp`.
3. Use a **read-only** DB role if available; otherwise discipline: only open `tools/sql/` files.
4. Keep credentials in **user-level** MCP config (`~/.cursor/mcp.json`), not in git.
5. Do not point MCP at Supabase production with service-role keys for ad-hoc exploration.

**Straightforward doc-only snippet** (add to user MCP when ready):

```json
{
  "mcpServers": {
    "retroverse-pg-readonly": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://bobhopp@localhost:5432/retroverse"],
      "comment": "READ ONLY — use SELECT from tools/sql only; never run execute/migrate scripts"
    }
  }
}
```

Verify the MCP server respects read-only at the role level before trusting it for safety.

---

## Recommended inspection session (15 min)

1. `SELECT count(*) FROM canonical_track_display;`
2. `psql … -f tools/sql/fleetwood_mac_debug.sql`
3. Compare `curl` home-search for `Fleetwood Mac`
4. If mismatch: `search_expansion_debug.sql` + check welcome `RETROVERSE_CANONICAL_GRAPH` and Supabase gate

---

## If something looks wrong

- **Missing RVAL:** `album_external_keys` gap — see welcome `repair_missing_album_external_keys` script (writes — run outside Cursor SQL).
- **Missing RVTR on sequence:** `1103_canonical_album_tracks_report.sql` pattern (read-only report in welcome).
- **Search empty but SQL has rows:** port/proxy mismatch (PUBLIC vs welcome) — see `docs/cursor_setup_audit.md` §11.

Do not “fix” data from ad-hoc SQL in Cursor. File a note and use integrity dry-run → reviewed execute on welcome.
