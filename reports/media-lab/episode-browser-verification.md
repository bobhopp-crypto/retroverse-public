# Media Lab Episode Browser Verification

**Date:** 2026-06-09  
**Status:** Verified

## Checklist

| # | Check | Result |
|---|-------|--------|
| 1 | Performance browser | ✓ 2471 total |
| 2 | Exported browser | ✓ 1976 clips |
| 3 | Episode list loads | ✓ 149 episodes |
| 4 | Episode detail loads | ✓ true (11 performances) |
| 5 | Search by artist (Al Green) | ✓ 4 episodes |
| 6 | Search by episode ID | ✓ 1 match |
| 7 | Tree + list views | ✓ UI toggle via `view=tree` |
| 8 | Readability tokens preserved | ✓ scoped under `ops-page--media-lab-workspace` |

## Sample episode

```json
{
  "title": "Ep 167 - The Midnight Special | April 30, 1976",
  "collection": "Midnight Special",
  "exported_count": 0,
  "download_status": "downloaded"
}
```

## Screenshots

- `episode-browser-list.png`
- `episode-browser-detail.png`
- `episode-browser-tree.png`
- `episode-browser-editor.png`

## Remaining gaps

1. TOTP / Live Aid / Woodstock — collection stubs only (MS data wired)
2. Episode list loads enrich per-episode (duration/download) — acceptable for 149 eps, may cache later
3. Per-performance export folder reveal — episode-level reveal only
4. Tree does not show performances nested under episodes (episode → detail → performance)
