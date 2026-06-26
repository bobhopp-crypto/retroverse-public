# Browser Plus 3.0 — Implementation Plan

**Status:** Phase A complete (2026-06-24)  
**Principle:** Song → Research → Experience (internal PK/DK/Package/Deck hidden)

---

## Phase A — Shipped

| Area | Change |
|---|---|
| **Browser Plus 3.0** | Inspector reordered; terminology; 4 visual classes; research/experience scores |
| **Research Center** | Hub renamed from Package Center |
| **Song Research** | Per-song page renamed from Song Package |
| **Classic Browser+** | PK/DK → Processed/Legacy; Open Research / Open Song |
| **Ops nav** | Links updated |
| **Live / Sunday Nights** | Open Research / Open Song |

**Not changed:** schemas, loaders (internal values), matching, scraping, package generation logic.

---

## Phase B — Sources redesign (next)

- Background reader mode for source excerpts (default)
- Expandable provenance panel (Wikipedia, Discogs, etc.)
- No raw URLs in default view

**Files:** `IntelligencePackageViewer.tsx`, `intelligence.css`, optional `SourceReader.tsx`

---

## Phase C — Research page layout (next)

Reorder Song Research sections to match IA:

1. Overview  
2. Story  
3. Facts  
4. Sources  
5. Artifacts  
6. Related Songs / Artists  
7. Coverage  
8. Maintenance  

**Files:** `IntelligencePackageViewer.tsx` (markup reorder only)

---

## Phase D — Navigation breadcrumbs (next)

Every ops screen shows: **Browser Plus › Song › Research › Experience**

Add shared `SongIntelligenceCrumb` component.

---

## Phase E — Deferred

- Route aliases (`/ops/research`)
- Retire Classic Browser Plus
- Merge Song Control data page into Research Center
- Album/Artist action links (need RVAL/RVAR routes)

---

## Key files (Phase A)

| File | Role |
|---|---|
| `lib/ops/song-intelligence-labels.ts` | Display labels + research/experience scores |
| `components/ops/browser-plus-2/BrowserPlus2Client.tsx` | Primary workspace |
| `app/ops/browser-plus-2/browser-plus-2.css` | Metrics / filters / badges / actions |
| `components/ops/intelligence/IntelligencePackageViewer.tsx` | Song Research page |
| `components/ops/intelligence/SongPackagesCommandCenter.tsx` | Research Center hub |

---

## Acceptance (Phase A)

- [x] No visible PK, DK, Deck, Package in BP 3.0 inspector actions
- [x] Inspector: Song header → Story → Research Summary → Actions → VDJ → Data Repair
- [x] Summary strip = metrics only (5 counts)
- [x] Placeholder actions removed from inspector
- [x] Metadata Recovery at inspector footer, conditional
- [x] Research Center + Song Research naming on intelligence routes

---

## Screenshots

Capture manually after loading `/ops/browser-plus-2` and `/ops/intelligence/package/[rvtr]`:

- `before/` — use git history pre Phase A if needed
- `after/` — post Phase A states

Suggested filenames: `bp3-inspector.png`, `bp3-research-center.png`, `bp3-song-research.png`
