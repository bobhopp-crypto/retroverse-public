# Retroverse Navigation Map

**Date:** 2026-06-01  
**Scope:** Deployed public site + ops routes (audit only — no redesign)  
**Production URL:** https://retroverse.live  
**Prior doc:** `docs/PUBLIC_NAVIGATION_MAP.md` (2026-05-27) — still useful for overlay detail

---

## Route inventory (33 pages)

| URL pattern | Purpose | Type |
|-------------|---------|------|
| `/` | Home directory board; search overlay; Charts pad → RV | Static |
| `/search` | Full search results page | Static |
| `/artist/[slug]` | Artist exhibit (hub) | SSG + dynamic |
| `/artist/[slug]/songs` | Artist songs (canonical song list) | Dynamic |
| `/artist/[slug]/tracks` | **Redirect → `/songs`** | Redirect |
| `/artist/[slug]/charts` | Artist chart history drill | Dynamic |
| `/artist/[slug]/library` | Collected recordings (nav: “Collected”) | Dynamic |
| `/artist/[slug]/explore` | More / explore pills | Dynamic |
| `/artist/[slug]/albums` | Full discography browser | Dynamic |
| `/artist/[slug]/related` | Related artists | Dynamic |
| `/artist/[slug]/years` | Chart activity by year | Dynamic |
| `/album/[id]` | Album exhibit | Dynamic |
| `/track/[id]` | Track exhibit | Dynamic |
| `/rv/[year]` | RV year chronicle | Dynamic |
| `/rv/[year]/[month]` | RV month drill | Dynamic |
| `/rv/[year]/[month]/[week]` | RV week (week = `YYYY-MM-DD`) | Dynamic |
| `/week/[date]` | Chart neighborhood portal (from track rail) | Dynamic |
| `/charts` | **Redirect → `/rv/*`** (legacy) | Redirect |
| `/browse/*` | **Redirect → `/`** | Redirect |
| `/inspect` | Dev inspect (gated) | Static |
| `/control-center` | Dev route catalog | Static |
| `/internal/ops-pin` | Ops PIN gate | Static |
| `/ops` | Ops hub | Gated |
| `/ops/review/covers` | Cover integrity review | Gated |
| `/ops/covers/backfill` | Cover acquisition backfill | Gated |
| `/ops/covers/corrections` | Cover corrections workbench | Gated |
| `/ops/covers` | **Redirect → `/ops/review/covers`** | Redirect |
| `/ops/covers/train` | **Redirect → `/ops/review/covers`** | Redirect |
| `/ops/covers/embed` | Embed iframe target | Gated |
| `/ops/healing` | Healing review | Gated |
| `/ops/acquisition` | Acquisition console | Gated |
| `/ops/media-sync` | Media sync review | Gated |
| `/ops/year/[year]` | Year workspace | Gated |
| `/ops/rvtags-review/[year]` | RV tags review | Gated |

---

## Page-by-page link map

### Home `/`

| | |
|--|--|
| **Purpose** | Landing; terminal search overlay; discovery pads |
| **Inbound** | Footer on all exhibits; control-center |
| **Outbound** | `/rv/1978` (Charts pad); overlay → `/artist/*`, `/album/*`, `/track/*`, `/rv/*`; `/ops` (if enabled); mailto feedback |
| **Gaps** | No link to `/search` page — overlay bypasses it |

### Search `/search`

| | |
|--|--|
| **Purpose** | Full search with scoped panels |
| **Inbound** | Exhibit footers; RV/week footers; explore pills |
| **Outbound** | `/`, entity cards, view-all → `/artist/.../songs`, `#essential-albums` **[broken anchor]**, `/rv/1978` |
| **Gaps** | `#essential-albums` missing — should be `#artist-albums-hub` |

### Artist exhibit `/artist/[slug]`

| | |
|--|--|
| **Purpose** | Primary artist discovery hub |
| **Nav pills** | Exhibit · Songs · Charts · Collected · More |
| **Outbound** | `/songs`, `/albums`, `/charts`, `/library`, `/related`, `/explore`, `/album/*`, `/track/*`, `/search?q=` |
| **Orphan subroutes** | `/albums`, `/related`, `/years` — not in nav pills |

### Artist Songs `/artist/[slug]/songs`

| | |
|--|--|
| **Purpose** | Canonical song list (performance-sorted) |
| **Inbound** | Nav; search view-all; `/tracks` redirect |
| **Outbound** | `/track/*`, SongActions → artist/rv/charts |

### Artist Albums `/artist/[slug]/albums`

| | |
|--|--|
| **Purpose** | Full chronological discography |
| **Inbound** | Exhibit “All albums →” only |
| **Outbound** | `/album/*` |
| **Gaps** | Not in nav pills — easy to miss |

### Artist Charts `/artist/[slug]/charts`

| | |
|--|--|
| **Purpose** | Artist chart history (year/month/week) |
| **Outbound** | `/rv/{y}/{m}/{week}`, `/album/*`, `/track/*` |

### Album `/album/[id]`

| | |
|--|--|
| **Purpose** | Album exhibit |
| **Outbound** | `/`, `/search`, `/artist/{slug}`, `/track/*`, `/rv/*` |

### Track `/track/[id]`

| | |
|--|--|
| **Purpose** | Track exhibit |
| **Outbound** | `/`, `/search`, `/artist/{slug}`, `/album/*`, `/rv/*`, **`/week/{date}`** chart portal |

### RV Year / Month / Week `/rv/...`

| | |
|--|--|
| **Purpose** | Canonical public chronology |
| **Inbound** | Home Charts pad; search; `/charts` redirect |
| **Outbound** | Year nav; month cards; week entries; chart drill → album/track |
| **Gaps** | Does not link to `/week/[date]` portal |

### Week portal `/week/[date]`

| | |
|--|--|
| **Purpose** | Focused chart neighborhood from track chart rail |
| **Inbound** | **Only** from track chart-run rail |
| **Outbound** | `/`, `/search`, `/track/*`, **`/rv/{y}/{m}/{date}`** (“Open full week”) |
| **Note** | Parallel to `/rv/.../week` — different UX depth |

### Ops `/ops` (PIN + `RETROVERSE_OPS=1`)

| | |
|--|--|
| **Purpose** | Internal operations hub |
| **Outbound** | media-sync, year workspace, rvtags, acquisition, healing, **review/covers**, **covers/backfill**, corrections |
| **Not linked** | `/ops/covers/embed` |

### Cover Review `/ops/review/covers`

| | |
|--|--|
| **Purpose** | Cover integrity review + training batch |
| **Inbound** | Ops hub; redirects from `/ops/covers`, `/ops/covers/train` |
| **Outbound** | `/ops`, corrections tab |

### Cover Backfill `/ops/covers/backfill`

| | |
|--|--|
| **Purpose** | Safe cover acquisition backfill dashboard |
| **Inbound** | Ops hub |
| **Outbound** | `/ops` |

---

## Redirects summary

| From | To |
|------|-----|
| `/browse/*` | `/` |
| `/charts?year=&month=&week=` | `/rv/...` (default year 1978) |
| `/artist/[slug]/tracks` | `/artist/[slug]/songs` |
| `/ops/covers` | `/ops/review/covers` |
| `/ops/covers/train` | `/ops/review/covers` |
| Unauthed `/ops/*` | `/internal/ops-pin?next=...` |

---

## Navigation problems (Phase 3)

### High priority

1. **Home bypasses `/search`** — overlay goes straight to entities; `/search` is footer-only entry.
2. **Broken search view-all anchor** — `#essential-albums` does not exist on artist page.
3. **Orphan artist subroutes** — `/albums`, `/related`, `/years` exist but are not in nav pills.
4. **Dual week routes** — `/week/[date]` vs `/rv/.../week` — same date, different pages; asymmetric linking.

### Medium priority

5. **Library vs Albums confusion** — both show albums; library in nav, albums only via exhibit footer.
6. **Songs vs Tracks naming** — `/tracks` redirects but naming persists in code/comments.
7. **Charts legacy** — `/charts` redirect-only; no inbound links; dead `charts-explore-view` UI.
8. **Ops stale link** — corrections page links to `/ops/covers/train` → redirect loop feel.

### Low priority

9. **`/browse/*` redirects** — intentional removal but may confuse old bookmarks.
10. **Play/queue buttons** — disabled on SongActions (UX dead end, not a route).
11. **Inspect/control-center** — dev routes linked from explore, not main chrome.

---

## Recommended simplification priorities (do not implement yet)

| Priority | Action |
|----------|--------|
| P0 | Fix `#essential-albums` → `#artist-albums-hub` on search view-all |
| P1 | Unify week UX: document when to use `/week` vs `/rv/.../week`; add cross-link from RV week → portal or deprecate portal |
| P2 | Nav pills: add Albums OR merge library+albums into one clear “Discography” |
| P3 | Remove or redirect orphan `/years`; fold into Charts |
| P4 | Home: add explicit “Advanced search → /search” or accept overlay-only model |
| P5 | Ops: update corrections link to `/ops/review/covers` directly |
| P6 | Delete unreachable `/charts` page UI artifacts |

---

## Visual map

See **`docs/retroverse-navigation-map.svg`** for major flow diagram.

---

## Major flows (text)

```
Home → Artist → Songs → Track → Chart history → /week portal → RV week
Home → Artist → Albums → Album → Track
Home → RV Year → Month → Week → Album / Track
Ops → Cover Review | Cover Backfill
```
