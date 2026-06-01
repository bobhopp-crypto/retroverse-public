# Cover Integrity Audit

Generated: 2026-05-31  
Database: `retroverse` (local Postgres via `RETROVERSE_PG_*`)  
R2 bucket checked: `https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev`  
Audit script: `tools/cover-integrity-audit.mjs` (read-only)

---

## 1. Coverage summary

| Metric | Count |
|--------|------:|
| **Total albums** (`albums`) | 21,800 |
| **Albums with cover path** (`albums.canonical_cover_path` set) | 7,052 |
| **Albums without cover path** | 14,748 |
| **Coverage %** (canonical path on `albums`) | **32.35%** |

### RVAL-scoped albums (`album_external_keys`)

| Metric | Count |
|--------|------:|
| Albums with RVAL | 21,670 |
| Albums without RVAL | 130 |
| RVAL albums with DB cover path | 7,052 |
| RVAL albums with **no** cover path anywhere in DB | 14,618 |
| **RVAL coverage %** (path resolvable from DB) | **32.54%** |

### Artwork linkage

| Metric | Count |
|--------|------:|
| Albums with `album_artwork_links` row containing a path | 7,052 |
| Albums with artwork link but **no** `albums.canonical_cover_path` | **0** |
| Distinct cover paths referenced in DB | 7,060 |

When a cover exists, `albums.canonical_cover_path` and the top-ranked `album_artwork_links` row are always in sync (except **8** albums with mismatched paths — see duplicates).

---

## 2. Root causes (ranked)

### Root cause A — Incomplete dossier ingest (primary)

**14,618 RVAL albums (67.5%)** have:

- `albums.canonical_cover_path` = NULL  
- no `album_artwork_links` row with a path  

The UI has nothing to resolve. This is a **data gap**, not a rendering bug.

Example: *Goodbye Yellow Brick Road (Super Deluxe)* — see trace below.

### Root cause B — Local delivery misconfiguration (secondary, dev only)

For albums **with** a DB path, production resolves to R2 and images load.

Local dev often fails because:

- `RETROVERSE_COVER_BASE_URL` / `NEXT_PUBLIC_RETROVERSE_COVER_BASE_URL` not set in `.env.local`
- `coverPathToUrl()` emits relative `/retroverse/covers/...`
- file not in `public/`
- `next.config.js` rewrites to `SEARCH_UPSTREAM_BASE_URL` (`localhost`) which is unreachable

Data is present; **delivery path is broken locally**.

### Root cause C — R2 object missing for assigned path (rare)

Full HEAD audit of all **7,060 distinct DB paths** against R2:

| R2 status | Count |
|-----------|------:|
| 200 OK | 7,054 |
| 404 Not Found | **6** |
| Other | 0 |

**0.08%** of assigned paths point to objects that do not exist in R2.

Confirmed example: `RVAL084302` → `...rock-n-roll-music.jpeg` → **404**

When DB path exists, R2 object is present **>99.9%** of the time.

---

## 3. Trace: Goodbye Yellow Brick Road

### Album 1 — canonical 1973 release

| Step | Record |
|------|--------|
| **RVAL** | `RVAL817194` |
| **`album_external_keys`** | `external_key = RVAL817194` → `album_id = 37619` |
| **`albums`** | `title = Goodbye Yellow Brick Road`, `artist = elton john`, `release_year = 1973`, `canonical_cover_path = retroverse/covers/RVAL817194/RVAL817194__elton-john__goodbye-yellow-brick-road.jpg` |
| **`album_artwork_links`** | `link_id = 5887`, same path in `canonical_cover_path` and `r2_cover_key`, `source = dossier`, `review_flag = ok`, `confidence_score = 85` |
| **Expected cover path** | `retroverse/covers/RVAL817194/RVAL817194__elton-john__goodbye-yellow-brick-road.jpg` |
| **R2 object** | **200 OK** at `https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev/retroverse/covers/RVAL817194/RVAL817194__elton-john__goodbye-yellow-brick-road.jpg` |
| **Production render** | Resolves via `coverPathToUrl()` + R2 base → image loads |
| **First failure point (local dev)** | **Delivery** — relative URL + missing local file + dead rewrite upstream. **Not a DB or R2 gap.** |

### Album 2 — Super Deluxe edition

| Step | Record |
|------|--------|
| **RVAL** | `RVAL683990` |
| **`albums`** | `album_id = 37620`, `title = Goodbye Yellow Brick Road (Super Deluxe)`, `release_year = 2014`, `canonical_cover_path = NULL` |
| **`album_artwork_links`** | **no rows** |
| **First failure point** | **Database** — no cover path assigned. Ingest never ran for this edition. |

---

## 4. Reference trace: Fleetwood Mac — Rumours

| Step | Record |
|------|--------|
| **RVAL** | `RVAL000003` |
| **`albums`** | `id = 34703`, `release_year = 1977`, `canonical_cover_path = retroverse/covers/RVAL000003/RVAL000003__fleetwood-mac__rumours.jpg` |
| **`album_artwork_links`** | same path, `source = dossier`, `review_flag = ok` |
| **R2 object** | **200 OK** |
| **Failure (local dev only)** | Same delivery issue as GYBR — data and R2 object are valid |

---

## 5. RV ID audit — can cover resolve from RVAL alone?

**No.** The public app resolves covers via:

```
album_external_keys.external_key (RVAL)
  → albums.canonical_cover_path
  → fallback: album_artwork_links.canonical_cover_path / r2_cover_key
  → coverPathToUrl() → R2 base + path
```

Every album page requires:

| Field | Source table |
|-------|----------------|
| RVAL | `album_external_keys` |
| Title | `albums.title` |
| Artist | `artists.canonical_name` |
| Release year | `albums.release_year` |
| Cover path | `albums.canonical_cover_path` or `album_artwork_links` |

You **cannot** derive a cover from RVAL alone. The filename convention (`RVAL######__artist-slug__album-slug.jpg`) is stored explicitly in the DB after dossier ingest — it is not computed at render time.

For **67.5% of RVAL albums**, that path was never written.

---

## 6. Duplicate album audit

| Check | Count |
|-------|------:|
| Same artist + title + year → multiple RVALs | **0** groups |
| Same `albums.id` → multiple RVAL keys | **0** |
| Same `canonical_cover_path` → multiple albums | **0** |
| Same album → multiple `album_artwork_links` | **8** |
| `albums.canonical_cover_path` ≠ top artwork link path | **8** |

Duplication is not a meaningful source of missing covers.

---

## 7. Orphan cover audit

| Check | Count |
|-------|------:|
| DB paths whose embedded `RVAL######` is not in `album_external_keys` | **0** |

**R2 bucket orphan inventory** (objects in storage with no RVAL attachment) was **not performed** — requires R2 bucket listing API, outside Postgres lineage.

---

## 8. Broken cover audit

### DB path missing (14,618 RVAL albums)

No path to resolve. See missing-cover sample in audit JSON (`/tmp/cover-audit.json`).

First rows (alphabetical):

| RVAL | Artist | Album |
|------|--------|-------|
| RVAL307012 | 10cc | 100 CC |
| RVAL564131 | 10cc | Deceptive Bends |
| RVAL671509 | 10cc | How Dare You |
| … | … | … |

### DB path assigned, R2 object missing (6 paths / 0.08%)

Full HEAD of 7,060 distinct paths: **6 × 404**.

Example:

| RVAL | Path | R2 status |
|------|------|-----------|
| RVAL084302 | `.../RVAL084302__the-beatles__rock-n-roll-music.jpeg` | 404 |

### DB path assigned, R2 object present, still not visible (local dev)

Path and object exist (e.g. RVAL817194, RVAL000003). Failure is **runtime URL resolution** — missing `RETROVERSE_COVER_BASE_URL` locally.

---

## 9. Tables involved

| Table | Role |
|-------|------|
| `artists` | Canonical artist name |
| `albums` | Title, release year, **`canonical_cover_path`** (published cover) |
| `album_external_keys` | **RVAL** bridge (`external_key`) |
| `album_artwork_links` | Dossier ingest candidates, **`r2_cover_key`**, `review_flag`, `confidence_score`, `source` |
| `canonical_album_tracks` | Track sequence (not cover source) |

### Resolution code (public app)

| File | Function |
|------|----------|
| `lib/artist/cover-url.ts` | `coverPathToUrl()`, `getRetroverseCoverBaseUrl()` |
| `lib/album/load-album-page.ts` | `pickCoverUrl(cover_path, artwork_path, r2_cover_key)` |
| `lib/artist/load-artist-page.ts` | Same pattern for exhibit album tiles |
| `next.config.js` | Rewrites `/retroverse/covers/*` → upstream origin |

---

## 10. Recommended source of truth

1. **`albums.canonical_cover_path`** — single published cover per album (what the site should render).
2. **`album_artwork_links`** — provenance queue only; top row with `review_flag IN ('curated','ok')` should match `albums.canonical_cover_path` after promotion.
3. **R2 object at `r2_cover_key`** — binary must exist before marking `review_flag = ok`.
4. **`album_external_keys.external_key` (RVAL)** — stable public ID; does not imply cover exists.

### Integrity rules to enforce (future, not implemented here)

- No `review_flag = ok` without R2 HEAD 200  
- Dossier ingest must backfill `albums.canonical_cover_path` for all charted / library albums  
- Production must set `NEXT_PUBLIC_RETROVERSE_COVER_BASE_URL` to R2 public URL  
- Local dev must set the same or serve `public/retroverse/covers/`  

---

## 11. Why covers are missing — one sentence

**67.5% of RVAL albums were never assigned a cover path in Postgres; the remaining 32.5% almost always have a valid R2 object — local “missing cover” on ingested albums is a dev URL/rewrite configuration problem, not missing data.**
