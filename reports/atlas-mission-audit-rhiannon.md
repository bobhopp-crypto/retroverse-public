# Mission Loop Audit — Rhiannon (RVTR097615)

**Date:** 2026-06-15  
**Method:** Code trace + audit JSON + UI flow analysis  
**Goal:** World Map → Territory → Mission → every action target  
**Verdict:** Mission **starts** as a guided quest; **breaks on first action** into generic ops with no return path.

---

## Rhiannon ground truth (audit)

| Field | Value |
|-------|------:|
| RVTR | RVTR097615 |
| Artist / Title | Fleetwood Mac — Rhiannon |
| Performance year | **1976** |
| Play count | 37 |
| Completeness | 25% |
| Priority | 27.8 · **#1** in top100 |
| coverScore | 0 |
| albumScore | 0 |
| chartScore | 1 |
| commentaryScore | 0 |
| tv / movie | false |

**Open checklist tasks:** Album linkage, Album cover, Commentary, TV, Movie  
**Auto-done tasks:** RVTR linked, Track identified, Related exhibits (chart)

---

## Journey map

```
World Map (/ops/atlas)
  ├─ "What matters most" hero ──────────► /ops/atlas/mission/RVTR097615 ✓
  ├─ Next move strip ───────────────────► /ops/atlas/mission/RVTR097615 ✓
  └─ 1970s territory CARD (click) ──────► /ops/atlas/1970s          (extra hop)

1970s Territory (/ops/atlas/1970s)
  ├─ Hero mission card ─────────────────► /ops/atlas/mission/RVTR097615 ✓
  ├─ Mission stack cards (×3) ──────────► /ops/atlas/mission/{rvtr}   ✓
  └─ Next move strip ───────────────────► /ops/atlas/mission/RVTR097615 ✓

Mission (/ops/atlas/mission/RVTR097615)
  ├─ ← Back to 1970s Territory ─────────► /ops/atlas/1970s          ✓
  ├─ Next mission ──────────────────────► /ops/atlas/mission/RVTR347287 ✓
  │
  └─ Checklist actions (5 open):
       Build Album Shelf ───────────────► /ops/year/1978            ✗ BREAK
       Restore Album Cover ─────────────► /ops/review/covers        ✗ DUMP
       Write Exhibit Placard ───────────► /ops/rvtags-review/1978  ✗ BREAK?
       Search TV & Film Archive (TV) ───► /ops/media-lab            ✗ DUMP
       Search TV & Film Archive (Movie) ► /ops/media-collections    ✗ DUMP
```

---

## Severity summary

| Severity | Count | Theme |
|----------|------:|-------|
| **Critical** | 4 | Wrong target, quest ends, can't find song |
| **High** | 6 | Generic ops dump, no return path, visual whiplash |
| **Medium** | 5 | Confusing metrics, jargon, fake progress |
| **Low** | 3 | Extra clicks, hardcoded IDs, static data |

---

## Critical breaks

### C1 — Build Album Shelf sends you to the wrong year

**Action:** Build Album Shelf → `/ops/year/1978`  
**Problem:** Rhiannon's **performance year is 1976** (`performanceYear: 1976` in audit). Year workspace filters by `vdjPerformanceYearSql(1978)` — only files classified as **1978** in the 1970's folder.

**Result:** Rhiannon is **not on that grid**. User cannot complete the mission task they clicked.

**Fix direction:** Link to `/ops/year/1978` only when performance year matches; otherwise deep-link to track-scoped workspace row, or a mission-scoped album tool with `?rvtr=RVTR097615`.

---

### C2 — No return path from any action target

**Problem:** Every checklist link is a plain `<Link href="/ops/...">` with **no mission query param** and **no "Return to mission" chrome** on destination pages.

**Result:** User lands in ops dark theme → must use browser back or manually find Atlas again. Quest context is lost.

**Fix direction:** Append `?fromMission=RVTR097615&task=album` to all action hrefs; show mission banner on ops pages when param present.

---

### C3 — Checklist progress is static (never updates)

**Problem:** Mission state comes from **frozen audit JSON** on disk. Completing work in Cover Review / Year Workspace does not refresh checklist, points, or status stamp.

**Result:** User returns to mission page — **same 3/8 tasks, same READY stamp**. Enrichment feels pointless.

**Fix direction:** Recompute checklist from live graph on mission page load (same scoring as audit runner), or "Refresh mission" after workshop action.

---

### C4 — Write Exhibit Placard → wrong year queue

**Action:** Write Exhibit Placard → `/ops/rvtags-review/1978`  
**Problem:** RV Tags review is **year-scoped to 1978 pilot**, not performance year 1976. Rhiannon may not appear in that queue (queue loads by year workspace cohort).

**Result:** User searches a 1978 tag board for a 1976 performance — same class of break as C1.

---

## High — generic tool dumps

### H1 — Restore Album Cover → batch QA factory

**Target:** `/ops/review/covers`  
**What user sees:** "Cover Review · RVAL" — integrity batch 001, hash matches, train/acquire tabs. **No mention of Rhiannon, Fleetwood Mac, or mission.**

**Ops chrome:** Dark `ops-page`, "← Ops console" — full admin panel.

**Gap:** Cover review is **batch-queue driven**, not track-targeted. Rhiannon may not be in current batch.

---

### H2 — Search TV & Film Archive → entire Media Lab

**Target:** `/ops/media-lab`  
**What user sees:** Editorial clip harvest, Midnight Special browser, performance library — **zero mission context**, no pre-filter for Rhiannon.

**Same label for TV and Movie** but different URLs (media-lab vs media-collections) — confusing duplicate copy.

---

### H3 — Search TV & Film Archive (Movie) → Media Collections index

**Target:** `/ops/media-collections`  
**What user sees:** Collection acquisition console — TV archive ops, not "find Rhiannon in a movie."

---

### H4 — Visual whiplash: Atlas → Ops

| Layer | Atlas mission | Ops destination |
|-------|---------------|-----------------|
| Theme | Cream paper, teal/orange | Dark broadcast console |
| Nav | Performance Universe rail | Ops topbar / console link |
| Language | Conquer, Deploy, Territory Points | Review Universe, RVAL, integrity batch |
| Realities plaque | Studio ↔ Stage visible | **Gone** |

**Result:** Feels like leaving the game to open a database admin panel.

---

### H5 — Atlas rail "Ops" link exits the quest entirely

**Target:** `/ops` (37-card directory)  
**Available on every Atlas page** including mission.

**Result:** One misclick dumps user into the exact thing Phase A–C was designed to replace.

---

### H6 — Public track page is outside the mission loop

If "Open Exhibit" were shown (Rhiannon has chart done, so it's hidden), `/track/RVTR097615` uses **public exhibit chrome** — Home, Search, Sunday Nights — no mission breadcrumb.

---

## Medium — confusion & context loss

### M1 — Two different "Coverage" numbers on same screen

| Location | Value | Meaning |
|----------|------:|---------|
| Hero stat pill | **43%** | Territory shelf identity (581/1360) |
| Why this song matters | **25%** | Exhibit completeness for this track |

**Result:** User cannot tell if they're winning or losing.

**Fix:** Rename pills — `Territory coverage 43%` vs `Exhibit depth 25%`.

---

### M2 — Mission progress inflated by auto-complete tasks

**Shows:** 3/8 tasks · 38% · 2 points earned  
**Done without user action:** RVTR linked, Track identified, Related exhibits

**Result:** Progress bar suggests work done; **5 real gaps remain**. Feels gamified but dishonest.

**Fix:** Split "Foundation" (auto) vs "Campaign tasks" (user actions); progress bar only on campaign tasks.

---

### M3 — Database jargon on checklist

**Items:** `RVTR linked`, `Track identified`  
**Violates:** Atlas plain-language rule (also Phase C spec: no raw DB terms above fold).

**Fix:** `Song claimed for collection`, `Identity confirmed`.

---

### M4 — Related exhibits ✓ but cover/album ✗

Chart linked (chartScore 1) marks "Related exhibits" complete while album cover and shelf are empty.

**Result:** User thinks exhibit is "related" and done, but **the visible gaps are cover + album** — cognitive dissonance with 25% completeness.

---

### M5 — Points don't connect to territory

**Shows:** +5 Territory Points, territory 65% → 66% after completion  
**Reality:** Points are **placeholder** — not persisted, not reflected on World Map or Territory board.

**Result:** Reward system reads as fiction on return to atlas.

---

## Low — friction & polish

### L1 — Extra hop: 1970s card → Territory → Deploy

1970s **game card** links to `/ops/atlas/1970s`, not mission. Only Deploy strips / hero mission go direct.

**Fix:** Emphasized territory card click → mission directly (territory secondary).

---

### L2 — Hardcoded RVTR097615 on World Map

`WorldMapBoard.tsx` hardcodes `atlasMissionHref("RVTR097615")` instead of deriving from focus territory mission RVTR.

**Risk:** Breaks when top mission changes after re-audit.

---

### L3 — Territory page shows only top 3 missions

Audit has **100 ranked missions**; territory shows 3. No "view full queue" without going to mission #3 then next repeatedly.

---

## Action target scorecard

| # | Task | Label | Target | Finds Rhiannon? | Mission context? | Return path? | Quest feel |
|---|------|-------|--------|-----------------|----------------|--------------|------------|
| 1 | Album | Build Album Shelf | `/ops/year/1978` | **No** (1976) | No | No | Broken |
| 2 | Cover | Restore Album Cover | `/ops/review/covers` | Maybe in batch | No | No | Admin dump |
| 3 | Commentary | Write Exhibit Placard | `/ops/rvtags-review/1978` | **Unlikely** | No | No | Broken |
| 4 | TV | Search TV & Film Archive | `/ops/media-lab` | Manual search | No | No | Admin dump |
| 5 | Movie | Search TV & Film Archive | `/ops/media-collections` | Manual search | No | No | Admin dump |
| — | Exhibits | (done) | — | — | — | — | N/A |

---

## What works (keep)

| Step | Works because |
|------|----------------|
| World Map → Deploy | Clear CTA, lands on mission page |
| Territory hero → Deploy | Same mission card language |
| Mission hero | Title, plays, stamp, checklist, context copy |
| Mission queue | Next → Night Moves maintains ranked flow |
| Back link | Returns to 1970s territory (atlas chrome preserved) |
| Workshop rooms | Still link to real tools (good backend; bad framing) |

---

## Guided quest vs current experience

| Ideal quest step | Current behavior |
|------------------|------------------|
| 1. See priority on map | ✓ Works |
| 2. Deploy to mission briefing | ✓ Works |
| 3. Pick ONE task | ✓ Checklist clear |
| 4. Do work **on this song** | ✗ Wrong year / batch / library |
| 5. See task complete + points | ✗ Static JSON |
| 6. Return to briefing | ✗ Manual navigation |
| 7. Complete mission → next | Partial (next link only) |

**Loop breaks at step 4.**

---

## Recommended fixes (priority order)

No implementation in this audit — ordered for maximum quest recovery.

### P0 — Unbreak the loop

1. **Mission-aware deep links** — all action hrefs include `?mission=RVTR097615&task={id}`  
2. **Mission banner on ops pages** — when param present: "Conquer Rhiannon · Build Album Shelf · ← Return to mission"  
3. **Fix year routing** — use `performanceYear` (1976) or RVTR-scoped year workspace search, not blind `/ops/year/1978`  
4. **Live checklist** — recompute from graph on mission load (reuse audit dimension logic)

### P1 — Reduce dump feeling

5. **Track-scoped cover action** — link to cover fix path filtered to Rhiannon's RVAL if resolvable  
6. **Track-scoped tags action** — open rvtags or year workspace **filtered to RVTR097615**  
7. **Atlas chrome strip on ops** — minimal cream breadcrumb when `fromMission` set (don't full re-skin ops)

### P2 — Clarify progress

8. **Rename coverage fields** — territory vs exhibit depth  
9. **Progress bar = open campaign tasks only** (5 items for Rhiannon)  
10. **Plain-language checklist** — drop RVTR from user-facing labels

### P3 — Polish

11. **1970s card → mission** directly  
12. **Derive World Map deploy RVTR** from audit, not hardcoded  
13. **Persist or recompute territory points** on task completion

---

## Success test (Rhiannon)

| Question | Today | After P0–P1 |
|----------|-------|-------------|
| Why this song matters? | ✓ Yes | ✓ |
| What is missing? | ✓ Yes (checklist) | ✓ |
| What action improves it? | ⚠ Label yes, target wrong | Fix year/scope |
| What reward is earned? | ⚠ Shown but not real | Live recompute |
| What mission comes next? | ✓ Next link | ✓ |

---

## Test script (manual)

```bash
RETROVERSE_OPS=1 npm run dev
# PIN → /ops/atlas
```

1. World Map → Deploy → Rhiannon — confirm mission page  
2. Click **Build Album Shelf** — confirm whether Rhiannon appears on 1978 grid (expect **no**)  
3. Back → **Restore Album Cover** — confirm no Rhiannon, no return banner  
4. Back → **Write Exhibit Placard** — confirm 1978 queue, search Rhiannon  
5. Return via ← Back to 1970s — confirm checklist unchanged  
6. Next mission → Night Moves — confirm queue works  

---

*Audit complete. Mission briefing works; action targets break the guided quest.*
