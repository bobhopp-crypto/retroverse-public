# 1970's Performance Universe — Visual Prototype (Mockup)

**Date:** 2026-06-15  
**Status:** Design only — not implementation  
**Viewport:** Desktop-first · 1440 × 900 · **no scroll above the fold**  
**Data source:** `reports/1970s-performance-universe-audit.md` + Postgres crate counts  
**Visual reference:** `reports/1970s-universe-mockup.png`

---

## Design intent

This screen is a **decade atlas page** in the Retroverse collectible universe — not an ops dashboard.

| Feel like | Not like |
|-----------|----------|
| Record-store wall chart | Admin console |
| VIP pass / tour poster | SaaS metrics grid |
| Trading-card shelf | Gray tables |
| Sunday Nights program guide | DevOps status page |

**Voice:** “Here’s your 1970’s universe — what you own, what’s missing, what to enrich next.”

---

## Above-the-fold grid (1440 × 900)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1970's                          ┌──────────┐                               │
│  PERFORMANCE UNIVERSE            │   65%    │  DECADE COMPLETE            │
│  (hero, 96px)                    │  (ring)  │  exhibit depth on owned     │
├──────────────────┬──────────────────┬───────────────────────────────────────┤
│                  │                  │  MOST VALUABLE TARGETS                │
│      OWNED       │     MISSING      │  (vinyl-card stack)                   │
│       581        │       779        │  ① Rhiannon · 37 plays · 25%         │
│  songs in crate  │ awaiting identity│  ② Night Moves · 85 plays · 69%      │
│  549 RVTR        │  in your folder  │  ③ My Sweet Lord · 30 plays · 23%    │
│  1,360 on shelf  │                  │                                       │
├──────────────────┴──────────────────┴───────────────────────────────────────┤
│  RECENT GAINS          │  NEXT MISSION                                      │
│  +12 tags · +4 covers  │  Restore Rhiannon's album shelf                    │
│  Rhiannon chart linked │  RVTR097615 · GO →                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

All six content zones visible without scrolling.

---

## Typography (desktop)

| Role | Spec | Example |
|------|------|---------|
| Decade hero | 96px / 900 / tight tracking | `1970's` |
| Zone numbers | 72px / 800 | `581`, `779`, `65%` |
| Zone labels | 14px / 700 / uppercase / teal | `OWNED` |
| Card titles | 22px / 700 | `Fleetwood Mac` |
| Card subtitles | 16px / 500 | `Rhiannon` |
| Mission CTA | 28px / 800 | `Restore Rhiannon's album shelf` |
| Micro metadata | 13px / 600 (minimum — never smaller) | `RVTR097615` |

**Font direction:** Display serif or rounded grotesk for hero; readable sans for labels. No 11px ops captions.

---

## Color & surface

| Token | Use |
|-------|-----|
| Paper `#F4EED8` | Page background (texture grain optional) |
| Ink `#1A1A1A` | Outlines, primary text |
| Teal `#2A9D8F` | Labels, progress ring, secondary accents |
| Signal orange `#E85D04` | Priority stars, mission CTA, “missing” emphasis |
| Card cream `#FFF8EC` | Collectible panels |
| Rule | 3px solid ink borders on all cards |

No glass, no gray-on-gray, no floating SaaS shadows.

---

## Zone 1 — Decade completion

**Position:** Top-right badge  
**Primary number:** `65%`  
**Label:** DECADE COMPLETE  
**Subcopy:** Exhibit depth across owned performances  

**Meaning (from audit):** Average completeness (cover + chart + album + commentary) on **581 matched** videos — not “% of Billboard owned.”

**Visual:** Thick-ring progress stamp (like a wax seal / tour badge), not a thin analytics donut.

**Optional secondary ring (muted):** `43%` crate linked — 581 of 1,360 folder files have graph identity. Shown as smaller caption, not competing with 65%.

---

## Zone 2 — Owned songs

**Position:** Center-left, largest stat card  

| Element | Value | Source |
|---------|------:|--------|
| Hero number | **581** | Matched videos with graph link |
| Headline | songs in your crate | |
| Sub | **549** canonical identities | Distinct RVTR |
| Sub | **1,360** files on shelf | All VIDEO/1970's assets in PG |

**Card styling:** Oversized number, album-shelf illustration silhouette in corner, teal “OWNED” tab like a price sticker.

---

## Zone 3 — Missing songs

**Position:** Center, equal weight to Owned  

| Element | Value | Source |
|---------|------:|--------|
| Hero number | **779** | Videos in folder **without** graph match |
| Headline | awaiting identity | Actionable DJ gap |
| Sub | **4,869** chart peaks beyond the crate | Hot 100 1970–79 not linked to your 1970's videos |

**Tone:** Missing is not failure — it’s **universe left to discover**. Orange accent, treasure-map energy.

**Do not show:** Raw SQL labels, “unmatched media_assets,” or reconciliation jargon.

---

## Zone 4 — Most valuable enrichment targets

**Position:** Right column · 3 stacked **vinyl-card** tiles (not a table)

Ranked by audit **enrichment priority** = PlayCount × (100 − completeness%).

| # | Artist | Title | Plays | Complete | Why |
|---|--------|-------|------:|---------:|-----|
| 1 | Fleetwood Mac | Rhiannon | 37 | 25% | High rotation, no album/cover |
| 2 | Bob Seger | Night Moves | 85 | 69% | Most played; album gap |
| 3 | Billy Preston | My Sweet Lord | 30 | 23% | Chart present, thin exhibit |

**Card anatomy (each):**
- Small square cover placeholder (or dominant album color block)
- Artist / title large
- Play count as **rotation signal** badge (turntable icon)
- Completeness as segmented bar (4 ticks: cover · chart · album · tags)
- Orange ★ on #1 only

**Interaction (future):** Click card → track exhibit + enrichment drawer. Not in mockup.

---

## Zone 5 — Recent gains

**Position:** Bottom-left horizontal strip  

Editorial chips — feels like **tour dates added to the poster**, not an activity log.

| Chip | Example copy |
|------|----------------|
| Tags | `+12 Retroverse Tags` |
| Covers | `+4 album covers verified` |
| Link | `Rhiannon → chart linked` |

**Data note:** Placeholder narrative for prototype; wire to real enrichment apply log in implementation phase.

**Visual:** Rounded pills, thick outline, small sparkle icon — celebration, not audit trail.

---

## Zone 6 — Next mission

**Position:** Bottom-right · dominant CTA panel (largest interactive affordance)

```
NEXT MISSION
Restore Rhiannon's album shelf
RVTR097615 · 37 plays · cover + album gap
GO →
```

**Logic (from audit):** Top enrichment-priority target where gap is structural (album + cover = 0).

**Visual:** Mission card looks like a **quest ticket** or **main-pub door stamp** — orange border, arrow CTA, no “Submit” button.

---

## What we deliberately hide above the fold

- Ops navigation / sidebar
- Year-match tables
- Postgres status
- Filter dropdowns
- Scrollable queues
- Technical dimension scores (0.75, etc.)

Those live **below the fold** or on drill-down — this screen is the **decade cover story**.

---

## Below-the-fold (out of scope for mockup, noted for IA)

- Full top-100 enrichment queue
- Per-year breakdown (1970…1979)
- Unmatched file browser
- Chart-universe expansion map

---

## Copy glossary (collectible ↔ technical)

| UI copy | Internal meaning |
|---------|------------------|
| Decade complete | Avg exhibit completeness on owned |
| Songs in your crate | Graph-linked performances |
| Awaiting identity | Folder videos without RVTR link |
| Chart peaks beyond the crate | Hot 100 titles not in owned set |
| Rotation signal | VDJ PlayCount |
| Mission | Top enrichment-priority RVTR |

---

## Success criteria

1. User grasps **universe state in 3 seconds** (65% · 581 owned · 779 missing).
2. User knows **what to do next** without reading a table (Rhiannon mission).
3. Screen feels like **opening a decade chapter** in Retroverse, not logging into ops.
4. **Zero scroll** required to see all six zones on 1440×900.

---

## Files

| Artifact | Path |
|----------|------|
| Visual mockup image | `reports/1970s-universe-mockup.png` |
| This spec | `reports/1970s-universe-mockup.md` |
| Audit data | `reports/1970s-performance-universe-audit.md` |

*Prototype only — no code.*
