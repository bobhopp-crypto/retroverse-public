# Browser Plus 3.0 — UX Unification & Terminology Audit

**Date:** 2026-06-24  
**Scope:** Audit and design only — no implementation  
**Baseline:** Browser Plus 2.1 (`/ops/browser-plus-2`), Classic Browser Plus, Intelligence/Package routes, Song Experience

---

## Executive Summary

Browser Plus 2.1 is functionally solid but presents **three mental models at once**:

1. **Library Browser** — find/filter/inspect VDJ videos  
2. **Research** — sources, facts, stories, artifacts (currently labeled “Package” everywhere)  
3. **Experience** — patron-facing song presentation  

Operators currently navigate **RVTR → PK → DK → Deck → Package** instead of **Song → Research → Experience**.

This audit inventories visible terminology, maps navigation, identifies visual class collisions, and proposes a **minimal-change migration** focused on labels, inspector hierarchy, and CSS role separation — not new data pipelines.

---

## 1. Terminology Inventory

Legend: **Proposed** = recommended Browser Plus 3.0 patron/operator language. Internal code names (PK, DK, `deckStatus`) stay in code; they should not appear in operator UI.

### 1.1 Browser Plus 2.1 (`/ops/browser-plus-2`)

| Visible text | Location | Purpose | Proposed replacement |
|---|---|---|---|
| Browser Plus 2.1 | Page title | Product name | **Browser Plus 3.0** (or drop version from title) |
| Song Inspector + Library Browser · Metadata Recovery | Subtitle | Describes layout | **Library + Inspector** (drop version suffix) |
| Classic Browser+ | Header link | Legacy route | Keep until Classic retired |
| Active Videos / Identified / Processed / Unidentified | Summary metrics | Library counts | Keep (Metrics class) |
| Missing Metadata / Recoverable Metadata | Summary chips | Metadata orphan counts | Keep; move to filter-adjacent, not mixed with story/cover chips |
| Missing Cover / Missing Story / Experience Ready | Summary chips | Work queue hints | **Filters only** — remove from summary strip (duplicate of filter panel) |
| Missing Artist/Title Metadata | Filter | Metadata orphans | **Missing Metadata** (shorter) |
| Processed Legacy | Filter + status badge | DK-labeled rows | **Legacy** (badge); filter: **Processed (Legacy)** |
| Processed | Filter + status badge | PK-labeled rows | Keep |
| Metadata Recovery Report | Report section | Orphan audit table | **Metadata Recovery Report** (keep; ops-only) |
| Song Story | Inspector panel | Story blurbs | **Story** |
| No story fragments yet | Inspector empty state | No content | **No story yet** |
| Loading package… | Inspector loading | Fetching research JSON | **Loading research…** |
| Requires an existing package | Story line gate | No research file | **Requires research on this song** |
| Quick Add Story Line | Inspector panel | Operator input | **Add Story Line** |
| Artifacts | Inspector panel | Readiness checklist | **Artifacts** (keep) |
| Cover detail: "Package" | Artifact row | Cover from package JSON | **Research** or **Canonical** |
| Package / Experience | Inspector panel title | Split section | Split → **Research Status** + **Experience Status** |
| Package status | Inspector field | `prettyStatus()` output | **Research status** |
| Package artifacts | Inspector field | Artifact count | **Artifact count** |
| Song Experience renderable | Inspector field | Renderability yes/no | **Experience ready** |
| VirtualDJ Fields | Inspector panel | Raw VDJ metadata | **VirtualDJ** (shorter) |
| VDJ Label | Inspector header | Shows PK_/DK_/RVTR label | **Label** (tooltip: internal VDJ label) |
| Open Song Experience | Action | Patron page | Keep |
| Open Package | Action | Research detail route | **Open Research** |
| Regenerate Package (placeholder) | Action | Disabled | **Regenerate Research (placeholder)** |
| Open Video (placeholder) | Action | Disabled | Hide until wired, or demote to text link |
| Copy RVTR | Action | Clipboard | Keep |
| Processed Legacy | Table status badge | Identity from label prefix | **Legacy** |

**Not shown in 2.1 (good):** PK, DK, Deck, Performance Deck, Cards Ready, Deck Ready.

**Still visible via derived data (not labels but values):** `Missing Package`, `Needs Review`, `Cards Ready`, `Published` — these come from `load-browser-plus.ts` `prettyStatus()` / `workStatus()` and appear in **Package status** field when a row has RVTR.

| Visible value | Source | Proposed display value |
|---|---|---|
| Missing Package | `prettyStatus(null)` | **No research** |
| Needs Review | package status `review` / `draft` | **Needs review** |
| Cards Ready | package status `cards_ready` | **Story ready** (drop “Cards”) |
| Ready To Publish | package status `approved` | **Approved** |
| Published | package status `published` | **Published** |
| Experience Ready | `deckStatus` internal | **Experience ready** |
| Not Renderable | `deckStatus` internal | **Not experience-ready** |
| No Package | `deckStatus` when no JSON | **No research** |

---

### 1.2 Classic Browser Plus (`/ops/browser-plus`)

| Visible text | Location | Purpose | Proposed |
|---|---|---|---|
| PK | Stat pill + filter | Count DK/PK labels | **Remove from UI** — use Processed / Legacy in 2.x only |
| DK | Stat pill + filter | Legacy label count | **Remove from UI** |
| Missing Experience | Health metric | `missingDeck` stat | **Not experience-ready** |
| Generate Package / Generate Deck | Planned work actions | Batch ops | **Generate Research** / remove Deck action |
| View Package | Inspector link | Research route | **Open Research** |
| View Deck | Inspector link | Legacy deck route | **Open Song Experience** (deck redirects today) |
| Package | Inspector field | Package status | **Research status** |
| Experience | Inspector field | `deckStatus` column label | **Experience status** |
| Raw Missing Package | Saved filter | Filter label | **No research** |
| Package Candidates | Coverage dashboard | Queue stat | **Research candidates** |

Classic Browser Plus remains the **noisiest** surface for PK/DK/Deck/Package terminology. 3.0 plan: **freeze Classic**; do not unify visually — link out as “Classic (legacy)”.

---

### 1.3 Research / Intelligence routes

| Visible text | Route / component | Purpose | Proposed |
|---|---|---|---|
| Package Center | `/ops/intelligence` H1 | Hub name | **Research Vault** (hub) |
| Packages | Ops Command Center card | Nav label | **Research Vault** |
| Dashboard, gallery, queue, maintenance | Package Center nav anchors | Hub sections | **Overview, Songs, Queue, Maintenance** |
| Song Package | Package viewer kicker | Per-song page type | **Song Research** |
| Package Review | Section on package page | Fact/story approval UI | **Research Review** |
| Research Vault | Section on package page | Source excerpts | **Sources** (section) — avoid same name as hub |
| Fact Library | Section | Grouped facts | **Facts** |
| Story Library | Section | Candidate stories | **Story** |
| Generate Artifacts / Artifact Studio | Links | Visual outputs | **Artifacts** |
| Package Health | Section | Coverage metrics | **Research coverage** |
| Package Maintenance | Section | Rebuild/delete | **Research maintenance** |
| Approve Package | Review client button | Workflow | **Approve research** |
| Build Cards / Cards / storyCards UI | Review client tabs | Story card editing | **Story lines** or **Story cards** (pick one; prefer **Story** for operator, “cards” internal) |
| Edit Card / Hide Card / Lock Card / Regenerate Card | Package Center gallery | Card mutations | **Edit story line** / etc. |
| Generate Packages | Queue actions | Batch processSong | **Generate research** |
| Missing Package / Package Exists | Filters & stats | Management view | **No research** / **Has research** |
| Song Package Backfill | Backfill route title | Batch backfill | **Research backfill** |
| Overnight Song Package Build | Runs route | Batch job | **Overnight research build** |
| ← Package Center | Back links | Navigation | **← Research Vault** |
| Performance Deck | `/rvtr/[rvtr]/deck` metadata | Legacy route (redirects) | **Remove label**; redirect only |
| Rebuild Deck | Song Control data page | Disabled button | **Remove** |
| Rebuild Package | Song Control data page | Action | **Rebuild research** |

---

### 1.4 Song Experience (patron)

| Visible text | Location | Purpose | Proposed |
|---|---|---|---|
| Song Experience | RV2 song page kicker | Patron view label | **Song Experience** (keep — this is the brand) |
| Experience Ready | Badge on song page | Renderability | **Experience ready** (consistent casing) |
| Song Control / data page | `/retroverse-2/song/[rvtr]/data` | Ops overlay on patron page | **Song research (ops)** — optional rename |

Patron layer is **already closest to target language**. Ops should link **into** Experience, not parallel “Deck” routes.

---

### 1.5 Terms audit: Package / Deck / DK / PK / Card / Performance Deck

| Term | Visible in BP 2.1? | Visible elsewhere? | Recommendation |
|---|---|---|---|
| **Package** | Yes (status, actions, loading copy) | Intelligence hub, Classic BP, loaders | Replace with **Research** in all operator UI |
| **Deck** | No | Classic BP, Song Control, route metadata | Remove from UI; **Experience** only |
| **DK** | No (uses “Processed Legacy”) | Classic BP filters/stats | Never show; keep **Legacy** badge |
| **PK** | No (uses “Processed”) | Classic BP filters/stats | Never show; keep **Processed** badge |
| **Card** | No (“fragments”) | Package Center gallery, Review client | Use **Story** / **Story line** in UI |
| **Performance Deck** | No | `/rvtr/.../deck` page title only | Remove title; redirect to Experience |

---

## 2. Navigation Inventory

### 2.1 Current operator paths (song-centric)

```
Ops Command Center (/ops)
├── Browser Plus 2.1 (/ops/browser-plus-2)     ← Library + Inspector [PRIMARY]
├── Classic Browser Plus (/ops/browser-plus)      ← Legacy workstation
├── Package Center (/ops/intelligence)            ← Research hub (white UI)
│   ├── ?rvtr=…#gallery                           ← Deep link to song row
│   ├── /ops/intelligence/package/[rvtr]          ← Per-song research detail
│   │   └── /ops/intelligence/package/[rvtr]/artifacts
│   ├── /ops/intelligence/backfill
│   └── /ops/intelligence/runs/current
└── Song Experience (/retroverse-2/song/[rvtr])   ← Patron view
    └── /retroverse-2/song/[rvtr]/data            ← Ops song control (overlap with research)
```

### 2.2 Competing entry points to the same research JSON

| Action label | From | Lands on |
|---|---|---|
| Open Package | BP 2.1 inspector | `/ops/intelligence/package/[rvtr]` |
| Open Research (proposed) | same | same |
| View Package | Classic BP | same |
| Gallery row click | Package Center | same |
| Package Review | Section embed | same page (in-page) |

**Conclusion:** One canonical research detail route already exists:  
`/ops/intelligence/package/[rvtr]` — only the **name** is wrong, not the architecture.

### 2.3 Competing entry points to Experience

| Action label | From | Lands on |
|---|---|---|
| Open Song Experience | BP 2.1 | `/retroverse-2/song/[rvtr]` ✓ |
| View Deck | Classic BP | `/rvtr/[rvtr]/deck` → redirects to Experience ✓ |
| Patron browse | Public | `/retroverse-2/song/[rvtr]` ✓ |

**Conclusion:** Experience path is unified in 2.1; Classic still says “Deck”.

---

## 3. Visual Consistency Issues (Browser Plus 2.1)

### 3.1 Four classes requested vs current state

| Class | Intended | Current BP 2.1 behavior | Issue |
|---|---|---|---|
| **Metrics** | Read-only counts | `.bp2__metric` — correct | Summary **chips** reuse filter semantics but look like metrics |
| **Filters** | Left panel only | `.bp2__filter` — correct | Same topics (Missing Cover, Experience Ready) appear in **both** chips and filters |
| **Status badges** | Non-clickable | `.bp2__status--*` on table + header | **Processed Legacy** is long; competes with action buttons visually |
| **Actions** | Clearly clickable | `.bp2__btn` on primary actions | **Header links** (Classic, Ops) use same button styling as actions; **disabled placeholders** look like broken actions |

### 3.2 “Multiple applications stitched together”

| Surface | Visual system | Feels like |
|---|---|---|
| BP 2.1 | Dark blue RV2 ops (`browser-plus-2.css`) | Modern inspector |
| Classic BP | Black/red VDJ workstation (`browser-plus.css`) | Different product |
| Package Center | White intelligence UI (`intelligence.css`) | Admin dashboard |
| Song Experience | RV2 public gradient | Patron app |

**Expected:** Research can stay white (editorial workspace). Browser Plus 3.0 should **not** re-skin Research — only **name and link language** should connect them.

### 3.3 Inspector information hierarchy (current vs target)

**Current order (2.1):**
1. Header (title, artist, year, RVTR, status, VDJ label)
2. Metadata Recovery (conditional, full-width)
3. Song Story | Quick Add Story Line
4. Artifacts | Package / Experience
5. VirtualDJ Fields
6. Actions (mixed with placeholders)

**Problems:**
- **VDJ Label** exposes PK/DK/RVTR plumbing in primary header
- **Package / Experience** bundles two domains
- **VirtualDJ Fields** is as prominent as Story
- **Metadata Recovery Report** sits above workspace (global report + per-row panel = duplicate concepts)
- Placeholder actions compete with real actions

**Target hierarchy (BP 3.0):**

```
WHAT IS THIS SONG?
  Cover · Title · Artist · Year · RVTR · Status badge

WHAT DO WE KNOW?
  Story · Facts (future) · Artifacts · Research status · Experience ready

WHAT CAN I DO?
  Open Song Experience · Open Research · Copy RVTR · Refresh

DETAILS (collapsed)
  VirtualDJ · Metadata Recovery (if orphan)
```

---

## 4. Proposed Naming System

### 4.1 Domain model (operator-facing)

| Domain | Operator name | Internal/code | Description |
|---|---|---|---|
| Library | **Library** | VDJ rows | Video files in VirtualDJ |
| Song identity | **Song** | RVTR | Canonical song ID |
| Research | **Research** | Song package JSON | Sources, facts, story, artifacts |
| Experience | **Song Experience** | Renderability + RV2 page | Patron presentation |
| Label prefix | **Processed** / **Legacy** | PK_ / DK_ | Never show PK/DK strings |

### 4.2 Approved replacements (from brief + audit refinements)

| Current | Proposed | Notes |
|---|---|---|
| Package Center | **Research Vault** | Hub at `/ops/intelligence` |
| Open Package | **Open Research** | Same href |
| Package Status | **Research status** | Values also softened (see below) |
| Package artifacts | **Artifact count** | |
| Story fragments | **Story** | |
| Performance Deck / View Deck | **Song Experience** | Remove deck from UI |
| Deck Ready | **Experience ready** | Already used in 2.1 |
| Missing Package | **No research** | Display string only |
| Cards Ready | **Story ready** | Display string only |
| Package Review | **Research review** | In-page section |
| Research Vault (section) | **Sources** | Avoid hub/section name collision |
| PK / DK | *(hidden)* | **Processed** / **Legacy** badges only |

### 4.3 Research status display strings (operator)

Map internal package status → operator label (display layer only):

| Internal | Operator label |
|---|---|
| (no file) | No research |
| draft | Draft |
| processing | Processing |
| review | Needs review |
| cards_ready | Story ready |
| approved | Approved |
| published | Published |

Experience renderability (separate from research status):

| Condition | Label |
|---|---|
| `isSongExperienceRenderable` | Experience ready |
| else | Not experience-ready |

---

## 5. Proposed Browser Plus 3.0 Information Architecture

### 5.1 Single mental model

```
┌─────────────────────────────────────────────────────────┐
│  BROWSER PLUS 3.0                                        │
│  Library (find) + Inspector (understand) + Actions (go)   │
├─────────────────────────────────────────────────────────┤
│  FILTERS          │  INSPECTOR (primary)                 │
│  (left, only)     │  What is this song?                  │
│                   │  What do we know?                    │
│                   │  What can I do?                      │
├───────────────────┴──────────────────────────────────────┤
│  LIBRARY TABLE (browse/select)                          │
└─────────────────────────────────────────────────────────┘
         │ Open Research              │ Open Song Experience
         ▼                            ▼
   RESEARCH VAULT                 SONG EXPERIENCE
   /ops/intelligence              /retroverse-2/song/[rvtr]
   /package/[rvtr]                (patron)
```

### 5.2 Route map (unchanged URLs, unified names)

| Route | BP 3.0 name | Role |
|---|---|---|
| `/ops/browser-plus-2` | **Browser Plus** | Primary library + inspector |
| `/ops/intelligence` | **Research Vault** | Hub / queue / gallery |
| `/ops/intelligence/package/[rvtr]` | **Song Research — {title}** | Per-song research detail |
| `/ops/intelligence/package/[rvtr]/artifacts` | **Artifacts — {title}** | Visual artifact studio |
| `/retroverse-2/song/[rvtr]` | **Song Experience** | Patron view |
| `/ops/browser-plus` | **Classic Browser+** | Legacy (frozen) |

Optional future alias (not required for 3.0): `/ops/research` → redirect to `/ops/intelligence`.

### 5.3 Research view: are Package Center, Song Package, and Research Vault the same thing?

| Name | What it actually is |
|---|---|
| **Package Center** | **Hub** — multi-song dashboard, queue, batch generate |
| **Song Package** (page kicker) | **Per-song research record** — one RVTR’s JSON rendered as sections |
| **Research Vault** (section) | **Sources list** — `researchVault[]` excerpts on the per-song page |

**They are not the same UI**, but they are **one domain** (Research) at three zoom levels:

1. **Vault (hub)** — all songs with research state  
2. **Song Research (detail)** — one song’s full research  
3. **Sources (section)** — raw captured excerpts for that song  

**Recommendation:**  
- Rename hub → **Research Vault**  
- Rename per-song page → **Song Research**  
- Rename per-song “Research Vault” section → **Sources**  
- Keep **Artifacts** as sibling section + studio route  

Do **not** merge hub and detail into one route — different jobs.

---

## 6. Migration Plan (Minimal Code Changes)

Phased so each phase is shippable without new data collection, matching, or package generation.

### Phase A — String layer only (1–2 days)

**Browser Plus 2.1**
- Rename visible strings per §4.2 in:
  - `BrowserPlus2Client.tsx`
  - `MetadataRecoveryPanel.tsx`
  - `MetadataRecoveryReport.tsx`
  - `status.ts` filter labels
- Add display mapper `researchStatusLabel()` / `experienceStatusLabel()` — wrap existing `prettyStatus` / `deckStatus` values; **no loader changes**
- Inspector reorder (markup only): header → know → actions → collapsible VDJ/recovery
- Remove duplicate chips from summary (keep 4 metrics only; move Missing Cover / Missing Story / Experience Ready to filters-only)
- Hide or demote disabled placeholder buttons (Open Video, Regenerate, Mark Missing Cover)

**Ops Command Center**
- `Packages` card → **Research Vault**
- Link label Browser Plus 2.1 → **Browser Plus**

**Intelligence hub + viewer**
- `Package Center` H1 → **Research Vault**
- `Song Package` kicker → **Song Research**
- `Open Package` equivalents → **Open Research**
- Section `Research Vault` → **Sources**

**Classic Browser Plus**
- No redesign — add banner: “Legacy workstation — use Browser Plus for daily work”

### Phase B — Visual class enforcement (1 day)

In `browser-plus-2.css` only:

| Class | Apply to |
|---|---|
| `.bp2-metric` | Summary counts only |
| `.bp2-filter` | Left panel buttons only |
| `.bp2-badge` | Status pills (table + header) |
| `.bp2-action` | Real actions only |
| `.bp2-link` | Navigation (Ops, Classic, Research) — not filled buttons |
| `.bp2-placeholder` | Disabled future actions — muted text, not buttons |

Remove `.bp2__chip` from summary strip or style as non-interactive metrics distinct from filters.

### Phase C — Navigation polish (½ day)

- BP 2.1 actions: only **Open Song Experience**, **Open Research**, **Copy RVTR**, **Refresh**
- Intelligence back links: **← Research Vault**
- Classic BP: replace `View Deck` → `Open Song Experience`; `View Package` → `Open Research`

### Phase D — Deferred (explicitly out of scope for 3.0)

- Route renames (`/ops/browser-plus-3`, `/ops/research`)
- Merging Song Control (`/retroverse-2/song/.../data`) into Research Vault
- Retiring Classic Browser Plus
- Collapsing Metadata Recovery Report into inspector-only (no global strip)
- White/dark UI unification between Research Vault and Browser Plus

### Files touched (estimate)

| Phase | Files | Risk |
|---|---|---|
| A | ~8 TSX + 1 small display helper | Low — strings only |
| B | `browser-plus-2.css`, component classNames | Low |
| C | `VirtualDjBrowserPlus.tsx`, intelligence TSX, `ops/page.tsx` | Low |
| D | — | — |

### Acceptance checks (post-migration)

1. No visible **Package**, **Deck**, **PK**, or **DK** on Browser Plus 3.0  
2. Inspector answers What / Know / Do in < 3 seconds  
3. Summary strip = metrics only; filters live in left panel only  
4. **Open Research** and **Open Song Experience** are the only primary actions  
5. Research hub and per-song page use consistent **Research** vocabulary  
6. Classic BP still works but is labeled legacy  

---

## Appendix A — Browser Plus 2.1 filter inventory

| Filter | Count shown | Proposed keep? |
|---|---|---|
| All Videos | yes | yes |
| Unidentified | yes | yes |
| Identified | yes | yes |
| Processed | yes | yes |
| Processed Legacy | yes | rename badge **Legacy** |
| Missing Cover | yes | yes |
| Missing Artist/Title Metadata | yes | shorten to **Missing Metadata** |
| Missing Story | yes | yes |
| Experience Ready | yes | yes |
| Top Played | yes | yes |
| Recently Added | yes | yes |

---

## Appendix B — What not to change (per brief)

- No new data collection  
- No new package generation  
- No matching pipeline changes  
- No PK/DK identity logic changes  
- No VDJ XML writes  
- Internal field names (`packageStatus`, `deckStatus`, `storyCards`) remain in code/API  

---

*End of audit — ready for Browser Plus 3.0 implementation pass when approved.*
