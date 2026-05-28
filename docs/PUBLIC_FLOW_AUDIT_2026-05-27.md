# Public Flow Audit + Functional Linkage Pass

Date: 2026-05-27  
Scope: Production-first audit of `https://retroverse.live` + key flow codepaths in `RETROVERSE_PUBLIC`  
Non-goals: UI redesign, search architecture rewrite, ops system changes

---

## Audit summary

- Core public flow is mostly stable: homepage -> overlay -> entity routes is working and repeatable.
- No critical break found in the 10-query production smoke matrix.
- Biggest weaknesses are continuity and linkage, not outright breakage:
  - `/search` keyboard Enter behavior is effectively a no-op.
  - Year chronology flow is partially disconnected from search/entity loop.
  - Back/session continuity from overlay search is not preserved.

---

## Evidence snapshot

- `npm run smoke:public-search` on production: **PASS** (10/10 queries, repeat pass yes).
- Key production route probes:
  - `/` 200
  - `/search?q=madonna` 200
  - `/rv/1978` 200
  - `/artist/madonna` 200
  - `/track/RVTR336241` 200
  - `/album/RVAL000003` 200
  - `/ops` 404 (expected when ops not enabled)
  - `/api/events` 404 (expected local-only)
- Suggestion href shape audit (top items across test queries): **valid** (`/artist|/album|/track|/rv` only).
- Top suggestion target page checks: **all 200 + contains "From the archive"**.

---

## Findings (ranked)

## CRITICAL

- None observed in this pass.

## HIGH

- **`/search` Enter key creates dead interaction**
  - Severity: High
  - Route: `/search`
  - Repro:
    1. Open `/search?q=madonna`.
    2. Focus search input.
    3. Type a different query and press Enter.
  - Actual: Enter is prevented with no explicit action.
  - Likely cause: `search-header.tsx` blocks Enter (`if (e.key === "Enter") e.preventDefault();`) without route commit or jump-to-top behavior.
  - Proposed fix: On Enter, either (a) submit current query to URL (`/search?q=`) or (b) trigger deterministic "first useful result" navigation pattern used in overlay.
  - Public trust impact: **Yes** (keyboard/mobile soft-key users get ambiguous behavior).

- **Chronology entry is weakly linked back to search loop**
  - Severity: High
  - Route: `/rv/1978`
  - Repro:
    1. Home -> Charts pad (`/rv/1978`).
    2. Try to continue via search-centric journey.
  - Actual: Primary nav links are year prev/next and home "Explore"; no strong direct search CTA in top nav.
  - Likely cause: `rv-year-view.tsx` top nav optimizes year stepping, not entity-search loop continuity.
  - Proposed fix: Add explicit "Search entities" action near top controls (without changing chronology model).
  - Public trust impact: **Yes** (first-time users can feel route-isolated).

## MEDIUM

- **Back/session continuity from overlay is not preserved**
  - Severity: Medium
  - Route: Home overlay (`/`) -> entity -> browser back
  - Repro:
    1. Open homepage overlay, search, click entity.
    2. Hit browser back.
  - Actual: Return path can lose prior overlay state/query (fresh home board state).
  - Likely cause: Overlay state and query are local component state and cleared on dismiss/unmount.
  - Proposed fix: Optional URL-backed overlay/query state (`?q=` + scope) to restore prior session when backing out.
  - Public trust impact: **Partial** (not a hard break, but harms browsing flow).

- **Dual chronology IA (`/charts` and `/rv/[year]`) can confuse first-time flow**
  - Severity: Medium
  - Routes: `/charts`, `/rv/1978`
  - Repro:
    1. Enter chronology from home pad (`/rv/1978`).
    2. Separately open `/charts`.
  - Actual: Two chronology experiences with different interaction patterns and linkage.
  - Likely cause: Legacy exploratory charts route coexists with year-world route.
  - Proposed fix: Define one canonical chronology entry and clearly position the other as tool/sub-view.
  - Public trust impact: **Moderate** (IA ambiguity, not outage).

## LOW

- **Poster-era residue remains in codebase**
  - Severity: Low
  - Path: `app/components/home-poster-frame.tsx`
  - Repro: Search references in repo.
  - Actual: Component remains but is unused by homepage route.
  - Likely cause: retained legacy component after directory-board migration.
  - Proposed fix: remove or mark deprecated to reduce drift and future accidental reuse.
  - Public trust impact: No immediate user-facing impact.

---

## What already works well

- Homepage pads now correctly act as scoped accelerators (artists/albums/tracks), and charts goes to `/rv/1978`.
- Suggestion routing integrity is strong: no bad href shapes in audited result samples.
- Fail-open entity rendering behavior is holding for tested artist/album/track paths.
- Production smoke workflow is meaningful and currently passing repeatedly.
- Ops gating does not leak publicly by default (`/ops` 404 on production probe).

---

## Biggest current public weakness

Flow continuity after the first successful click: search/session context and chronology linkage are weaker than initial landing/search reliability.

---

## Fastest improvements

1. Fix `/search` Enter-key behavior (clear user action outcome).
2. Add explicit search CTA on `/rv/[year]` top region to reconnect chronology -> entity loop.
3. Add URL-backed optional home overlay state restore for back-button continuity.

---

## Structural risks

- Multiple navigation paradigms (home overlay, `/search`, `/charts`, `/rv/[year]`) can drift unless one canonical flow is explicitly prioritized.
- Session continuity is currently mostly component-state based, which is fragile across back/forward expectations.

---

## Technical debt risks

- Legacy poster component and older route patterns can reintroduce drift during future edits.
- Mixed chronology surfaces risk duplicated fixes and inconsistent behavior.
- Untracked large ops surface in working tree increases incidental merge/cherry-pick risk even for public-only tasks.

---

## Recommended next 3 stabilization passes

1. **Search Input Contract Pass**  
   Normalize Enter, clear, and URL sync behavior on `/search` and overlay.

2. **Chronology Linkage Pass**  
   Make `/rv/[year]` and `/charts` continuity explicit (search/entity return paths).

3. **Back-State Continuity Pass**  
   Add optional URL/session restoration for home overlay query + scope.

---

## Smoke test result

- Command: `npm run smoke:public-search`
- Result: **PASS**
- Query set: aretha franklin, elton john, madonna, bee gees, fleetwood mac, thriller, stand by me, supremes, donna summer, eagles
- Repeat pass: **YES** for all rows

---

## Deployment impact

Documentation only. No runtime changes in this audit pass.
