# Browser Plus — Match Queue Workflow

**Date:** 2026-06-24

---

## Queue modes

| Tab | Criteria | Action |
|-----|----------|--------|
| **Auto-Match Ready** | Tier A or combined ≥92, artist ≥80, title ≥88 | **Match** · **Approve All** |
| **Needs Review** | Combined ≥68 | **Match** + alt chips |
| **Search** | Below threshold | Prev/Next · manual search chips |

Card layout only — no scrolling tables.

---

## Throughput (1,428+ unmatched)

- Batch score: 35 rows/request, background progress
- Bulk assign: single `database.xml` write (up to 200 labels)
- Queue replaces center grid; inspector hidden

---

## APIs

- `POST /api/ops/browser-plus/match-batch`
- `POST /api/ops/browser-plus/assign-batch`
- `POST /api/ops/browser-plus/assign`

---

## Entry

**Match Queue** toolbar · **Unmatched Videos** pill · **Unmatched** filter

---

## Reused

- `loadMatchCandidates` · `vdj-label-write.ts` · `browser-plus-artist-match.ts`
