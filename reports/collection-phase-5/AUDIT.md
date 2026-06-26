# Retroverse Phase 5 — Collection Manager

**Date:** 2026-06-24

Turns matched VIDEO library data into actionable collection management — without new tables or systems.

---

## Deliverables

| # | Item | Status |
|---|------|--------|
| 5A | Coverage dashboard (library / year / artist) | ✅ Browser Plus |
| 5B | Missing mode in Browser Plus | ✅ Renamed + YouTube flags |
| 5C | Artist coverage + Show Missing Songs | ✅ `/artist/[slug]/songs` |
| 5D | Package priority audit | ✅ `reports/package-priority-audit/` |
| — | Mobile screenshots | ✅ `reports/collection-phase-5/*.png` |
| — | Build verification | `npx tsc --noEmit` ✅ |

---

## 5A — Coverage Dashboard

**Location:** Browser Plus header → `BrowserPlusCoverageDashboard`

**Metrics (Hot 100 chart universe):**
- Owned Videos (VIDEO folder RVTR match count)
- Hot 100 Owned
- YouTube Available
- Missing
- Coverage %

**Breakdowns:** Year table + Artist table (expandable)

**Key files:**
- `lib/charts/coverage-summary.ts`
- `lib/charts/load-coverage-summary.ts`
- `components/ops/browser-plus/BrowserPlusCoverageDashboard.tsx`

---

## 5B — Missing View

**Modes:** `MY VIDEOS` · `RETROVERSE` · `MISSING` (was "Gaps")

**Missing definition:** Hot 100 chart songs without owned VIDEO file. YouTube-only tracks stay in Missing with `YOUTUBE` coverage flag.

**Key files:**
- `lib/ops/browser-plus/chart-universe.ts` — YouTube enrichment on gap rows
- `components/ops/browser-plus/VirtualDjBrowserPlus.tsx` — mode labels

---

## 5C — Artist Coverage

**Example:** `/artist/joe-cocker/songs`

```
Owned · YouTube · Missing · Coverage %
[Show missing songs]
```

Each song row shows OWNED / YOUTUBE / MISSING badge.

Charts page (`/artist/[slug]/charts`) shows read-only coverage header; "Show missing songs →" links to songs page filter.

**Key files:**
- `lib/artist/load-artist-coverage-summary.ts`
- `app/artist/[slug]/artist-songs-coverage-client.tsx`
- `app/components/chart-history-song-row.tsx` — coverage badges

---

## 5D — Package Priority Audit

**Run:** `npm run ops:package-priority-audit`

**Latest results:**

| Metric | Count | % |
|--------|------:|--:|
| Owned VIDEO + RVTR | 7,206 | — |
| Package | 287 | 4% |
| Cover | 3,435 | 48% |
| Chart history | 3,876 | 54% |
| Artist data | 7,206 | 100% |
| Playback link | 4,196 | 58% |
| Fully ready | 136 | 2% |

**Outputs:** `reports/package-priority-audit/AUDIT.md`, `summary.json`, `owned-videos-readiness.csv`

**Recommendation:** Prioritize owned VIDEO tracks before expanding to full 49k graph — package gap is the dominant bottleneck (96% without package).

---

## Success criteria

| Question | Where |
|----------|-------|
| What do I own? | Browser Plus dashboard · artist coverage panel |
| What am I missing? | Browser Plus **Missing** mode |
| What should I acquire next? | Missing mode sorted by chart peak |
| How complete is an artist? | `/artist/[slug]/songs` coverage % |

---

## Commands

```bash
npx tsc --noEmit
npm run ops:package-priority-audit
node tools/phase-5-screenshots.mjs   # dev server + ops gate required
```
