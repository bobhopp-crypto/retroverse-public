# VirtualDJ database.xml — Integration Audit

Generated: 2026-06-17

## Path

```text
~/Library/Application Support/VirtualDJ/database.xml
```

Override: `RETROVERSE_VDJ_DATABASE`

## Existing Code (reused)

| Module | Role |
| --- | --- |
| `lib/ops/intelligence/vdj-database.ts` | **New central scanner** — full library parse, mtime cache, path normalize |
| `lib/ops/rvtags-review/vdj-lookup.ts` | Re-exports `loadVdjMetaForPaths` → now backed by full scan |
| `lib/ops/intelligence/load-song-metadata.ts` | Per-RVTR metadata; VDJ PlayCount via path lookup |
| `lib/ops/year-workspace/enrich-vdj-meta.ts` | Batch User2 + PlayCount for year workspace rows |
| `lib/ops/load-vdj-candidates.ts` | Video candidates via Postgres `media_assets` (not XML) |
| `lib/ops/ops-video-media.ts` | Video detection: `/VIDEO/` path + mp4/mkv/mov/avi/m4v |
| `lib/ops/show-builder/vdj-paths.ts` | MyLists `.vdjfolder` paths only |
| `tools/write-rvtags-pilot.mjs` | One-off User2 write-back to database.xml |

## Parser

- **Location:** `lib/ops/intelligence/vdj-database.ts`
- **Method:** Regex on `<Song FilePath="…">` blocks (same pattern family as legacy `vdj-lookup.ts`)
- **Fields:** Author, Title, Album, Year, Genre, User2, PlayCount
- **Cache:** In-memory, invalidated on file mtime change
- **Typical parse:** single-digit ms per MB on M-series Mac (full file read)

## RVTR Mapping

VDJ `FilePath` → Postgres join:

```text
database.xml FilePath
  → media_assets.source_path
  → media_track_links
  → canonical_track_display.track_id / retroverse_track_id
  → RVTR
```

Implemented in `lib/ops/intelligence/vdj-rvtr-resolve.ts`.

**Note:** User2 holds Retroverse Tags import hints, not RVTR IDs. Graph linkage is path-based.

## Video Detection

1. **XML scan:** `isOpsPlayableVideoPath(filePath)` — `/VIDEO/` + extension
2. **Graph:** `canonical_track_display.has_vdj_media` + `media_track_links`

## Performance Impact

| Operation | Cost |
| --- | --- |
| Full XML scan | One `readFile` per request until mtime changes |
| Dashboard `/ops/intelligence/backfill` | Scan + one batched RVTR SQL query + package index reads |
| Per-song pipeline | Unchanged — still uses `loadSongMetadata` + Ollama |
| Batch backfill | Sequential forced pipeline (~40–80s/song) |

**Recommendation:** Do not scan XML on every song-sheet page view. Backfill dashboard scans once per load; batch CLI refreshes queue at start.

## Intelligence Backfill (new)

| Piece | Path |
| --- | --- |
| Coverage loader | `lib/ops/intelligence/backfill-coverage.ts` |
| Queue builder | `lib/ops/intelligence/backfill-queue.ts` |
| Batch processor | `lib/ops/intelligence/backfill-processor.ts` |
| Dashboard | `/ops/intelligence/backfill` |
| Queue file | `RETROVERSE_DATA/ops/intelligence/backfill-queue.json` |
| State file | `RETROVERSE_DATA/ops/intelligence/backfill-state.json` |

## Commands

```bash
npm run intelligence:next10
npm run intelligence:next100
npm run intelligence:all
npm run intelligence:vdj-validation
```
