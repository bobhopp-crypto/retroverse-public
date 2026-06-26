# Browser Plus 3.0 — Phase A Report

**Date:** 2026-06-24  
**Scope:** UX, terminology, navigation, information architecture — no data pipeline changes

---

## Summary

Phase A unifies Retroverse song intelligence under **Song → Research → Experience**. Browser Plus 3.0 is the primary workspace; Research Center and Song Research replace Package Center and Song Package naming.

---

## Before → After

### Mental model

| Before | After |
|---|---|
| RVTR → PK → DK → Deck → Package | Song → Research → Experience |
| Multiple product names | One domain, three zoom levels |

### Browser Plus inspector order

| Before | After |
|---|---|
| Recovery at top | Story first |
| Package / Experience bundled | Research Summary (split fields) |
| 7 panels + placeholders | Header → Story → Research → Actions → VDJ → Repair |
| Summary chips + metrics mixed | Metrics only (5 counts) |
| Open Song Experience / Open Package | Open Song / Open Research |

### Visual classes (BP 3.0 CSS)

| Class | Use |
|---|---|
| `.bp2__metric` | Summary counts — not clickable |
| `.bp2__filter` | Left sidebar only |
| `.bp2__badge` | Status pills — not clickable |
| `.bp2__action` | Buttons and real links |
| `.bp2__nav-link` | Header navigation — text links |

---

## New capabilities (display only)

**Research Score (0–100)** — computed from story, facts, sources, cover, chart, artifacts, etc.  
**Experience Score (0–100)** — cover + story + facts + renderability  
**Coverage level** — Identified / Basic research / Research complete / Rich research / Experience ready

No schema or API changes. Scores derived in `lib/ops/song-intelligence-labels.ts`.

---

## Navigation model

```
Ops Command Center
├── Browser Plus 3.0 (/ops/browser-plus-2)
│   ├── Open Song → /retroverse-2/song/[rvtr]
│   └── Open Research → /ops/intelligence/package/[rvtr]
├── Research Center (/ops/intelligence)
│   └── Song Research (/ops/intelligence/package/[rvtr])
└── Classic Browser+ (/ops/browser-plus) [legacy]
```

---

## Screenshots

Phase A code is merged; capture **after** states locally:

1. `/ops/browser-plus-2` — select a processed row, verify inspector hierarchy  
2. `/ops/intelligence` — Research Center dashboard  
3. `/ops/intelligence/package/RVTR######` — Song Research page  

Store under `reports/browser-plus-3/after/` when captured.

**Before** reference: see git history pre Phase A or `UX-UNIFICATION-AUDIT.md` descriptions.

---

## Out of scope (Phase B+)

- Sources reader-mode redesign  
- Song Research section reorder  
- Full breadcrumb component on all routes  
- Route renames  
- Album/Artist action links  

---

## Related docs

- `UX-UNIFICATION-AUDIT.md` — original audit  
- `IMPLEMENTATION-PLAN.md` — phased roadmap  
- `TERMINOLOGY-INVENTORY.md` — screen-by-screen labels
