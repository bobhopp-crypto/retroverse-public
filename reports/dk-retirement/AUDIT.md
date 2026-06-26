# DK Layer Retirement — Audit & Implementation

**Date:** 2026-06-24  
**Goal:** One content source (Package) → Song Experience. No DK-driven rendering.

---

## 1. Runtime rendering paths

| Path | File | Patron-facing? | Status after retirement |
|------|------|----------------|-------------------------|
| Song Experience (canonical) | `app/retroverse-2/song/[rvtr]/page.tsx` | **Yes** | **Only patron presentation path** — loads graph + package |
| Legacy deck route | `app/rvtr/[rvtr]/deck/page.tsx` | Redirect only | **Redirects** to `/retroverse-2/song/[rvtr]` — never renders deck UI |
| PerformanceDeckView | `components/rvtr/performance-deck/PerformanceDeckView.tsx` | **No** | **Orphaned** — zero imports in active routes |
| loadPerformanceDeck | `lib/ops/intelligence/load-performance-deck.ts` | Indirect | Package projection only; used by deck route metadata + retired deck-worker |
| Live / Sunday Nights | `app/live/live-now-playing.tsx`, `lib/sunday-nights/live-payload.ts` | **Yes** | Resolves to **EXPERIENCE** only |
| Live shell actions | `lib/live-experience/shell-model.ts` | Ops/patron shell | **Song Experience** href; no `/deck` link |
| Track page | `app/track/[id]/page.tsx` | Yes | Graph view — not deck |
| Ops package editor | `app/ops/intelligence/package/[rvtr]/` | Ops only | Package CRUD — unchanged |

**Conclusion:** No patron route can render cream `performance-deck` UI. `/rvtr/.../deck` is a permanent redirect.

---

## 2. User-facing routes — legacy deck UI

| Route | Legacy deck UI? | Actual behavior |
|-------|-----------------|-----------------|
| `/retroverse-2/song/[rvtr]` | No | Song Experience (tabs: overview, story, artist, …) |
| `/rvtr/[rvtr]/deck` | No | `redirect(liveSongExperienceHref(rvtr))` |
| `/live` | No | Live shell → Song Experience CTA |
| `/sunday-nights` | No | Track embed + Song Experience CTA |
| `/track/[id]` | No | Chart/track graph page |

Screenshots: prior DK audit captured redirect behavior (`reports/dk-audit/AUDIT.md`). No code path mounts `PerformanceDeckView`.

---

## 3. DK / deck checks — classification

| Location | Signal | Class | After change |
|----------|--------|-------|--------------|
| `load-browser-plus.ts` | `label.startsWith("DK_")` → deckReady | **Presentation / Workflow** | **`isSongExperienceRenderable(pkg.status)`** |
| `vdj-label-write.ts` | deck-index → `DK_` label | **Workflow** | **Always `PK_` when package exists** |
| `label-vdj-packages.ts` | deck-index → `DK_` | **Workflow** | **Always `PK_` when package exists** |
| `video-factory.ts` deck-worker | Promote to deck-index | **Workflow** | **Frozen (retired)** |
| `video-factory.ts` state.deck | deck-index ∪ DK label | **Coverage** | **Package renderability** |
| `deck-index.json` | RVTR membership | **Legacy registry** | Read-only; no new writes |
| `live-control/queue.ts` | `hasDeck` = deck-index | **Coverage filter** | **`hasExperience`** = renderable package |
| `shell-model.ts` | `hasDeck` → Deck status/link | **Presentation** | **`experienceReady` → Song Experience** |
| `live-payload.ts` | deck-index for destination | **Presentation** | **Always EXPERIENCE** |
| `live-companion/page.tsx` | deck-index display | **Analytics** | **Song Experience ready flag** |
| Browser Plus `dkCount` / `dk` filter | Label prefix | **Analytics (legacy)** | Kept for inventory; not used for rendering |
| `automation-factory` | missingDeck backlog | **Analytics** | Counts non-renderable packages (field name unchanged in queue JSON) |
| `execution-adapters` generate-deck | Pipeline action | **Legacy** | **Blocked** |
| `search/entity-routes.ts` | Strips DK_/PK_ prefix | **Routing** | Unchanged — ID normalization only |
| `osc-sensor.hasDeckData()` | VDJ OSC deck slots | **Unrelated** | VirtualDJ hardware — not Retroverse DK |

---

## 4–7. Target architecture & changes applied

```
RVTR → Package → Song Experience / View
```

| Requirement | Implementation |
|-------------|----------------|
| Remove DK as rendering decision | Browser Plus, live shell, live queue use `song-experience-renderability.ts` |
| Preserve package content | No package JSON mutations |
| Freeze DK creation | `resolveRetroverseLabelForRvtr` + label matcher emit **PK only** |
| Stop deck-index growth | deck-worker retired in `video-factory.ts` |
| Shared renderability gate | `lib/ops/intelligence/song-experience-renderability.ts` — `published` \| `review` |

---

## 8. Migration report (pre-relabel)

**Tool:** `npm run ops:dk-retirement-migration-report`  
**Output:** `reports/dk-retirement/MIGRATION-REPORT.md`

| Metric | Count |
|--------|------:|
| Distinct DK RVTR | 797 |
| Distinct PK RVTR | 465 |
| DK file labels (all) | 1,539 |
| VIDEO DK files | 848 |
| deck-index entries | 833 |
| DK RVTR with renderable package | 797 |
| DK RVTR without package | 0 |

All 797 DK RVTRs have renderable packages — **no content loss** on relabel.

---

## 9. Relabel recommendation (not executed)

| Option | Recommendation |
|--------|----------------|
| **A. Leave DK untouched** | Safe short-term; labels become cosmetic |
| **B. Convert DK → PK** | **Recommended** after this code deploy — 797 RVTRs, zero package orphans |
| **C. Convert to bare RVTR** | Not needed — no DK RVTR lacks a package |

**Do not relabel until** you confirm Browser Plus + live queue behave correctly with package-only gates in production.

---

## Files changed

- `lib/ops/intelligence/song-experience-renderability.ts` (new)
- `lib/ops/browser-plus/vdj-label-write.ts`
- `lib/ops/browser-plus/load-browser-plus.ts`
- `lib/ops/browser-plus/execution-adapters.ts`
- `components/ops/browser-plus/VirtualDjBrowserPlus.tsx`
- `lib/live-experience/shell-model.ts`
- `components/live-experience/LiveExperienceShell.tsx`
- `lib/live-control/queue.ts`, `types.ts`, `state.ts`
- `lib/sunday-nights/live-payload.ts`
- `app/ops/live-control/LiveControlClient.tsx`
- `app/ops/live-companion/page.tsx`
- `app/live/live-now-playing.tsx`
- `app/sunday-nights/sunday-nights-live.tsx`
- `tools/intelligence/label-vdj-packages.ts`
- `tools/intelligence/video-factory.ts`
- `tools/ops/dk-retirement-migration-report.ts` (new)

## Deferred (intentional)

- Mass DK → PK label conversion in VDJ
- Deleting `PerformanceDeckView.tsx` / `deck-index.json` (safe to remove later)
- Renaming queue JSON field `missingDeck` → `missingExperience`
