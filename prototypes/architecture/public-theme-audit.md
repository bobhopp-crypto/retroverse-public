# Public Theme Audit — Explorer Layout v1

**Audit date:** 2026-07-09  
**Production commit:** `9fcfa16e6`  
**Base URL:** https://retroverse.live  
**Canonical reference:** [explorer-design-system.md](./explorer-design-system.md)

Automated check: `VERIFY_BASE=https://retroverse.live npx tsx tools/experience/verify-public-theme.mjs`

---

## Production routes audited (sprint scope)

| Route | URL tested | Status | Notes |
|-------|------------|--------|-------|
| **Home / Live** | https://retroverse.live/ | **PASS** | `Rv2PublicShell` + Explorer-scoped `live-home.css`; broadcast composer mapped to `--ex-*` tokens. |
| **Chart Week** | https://retroverse.live/week/1986-05-10?focus=RVTR044043&rank=3 | **PASS** | Full Explorer Layout v1. Dark Broadcast bg, purple focus row, aqua library, canonical row actions. |
| **Song** | https://retroverse.live/retroverse-2/song/RVTR569927 | **PASS** | `Rv2PublicShell` + migrated `retroverse-song-2.css`. Purple/aqua tokens applied. Chart Journey uses its own row component (not Explorer rows) — acceptable, same palette. |
| **Artist** | https://retroverse.live/artist/fleetwood-mac | **PASS** | Explorer hero, top-song rows (Play + ✓/+), purple/aqua accents, dark Broadcast shell. |
| **Search** | https://retroverse.live/search?q=fleetwood | **PASS** | RV2 shell, migrated panel overrides, no legacy blue panels detected. |
| **Year** | https://retroverse.live/rv/1976 | **PASS** | RV2 chronology under migrated `rv-rv2-overrides.css`. Purple borders and dark surfaces consistent. |

---

## Extended public route inventory

| Route | Status | Notes |
|-------|--------|-------|
| `/week/[date]` | **PASS** | Explorer v1 canonical |
| `/artist/[slug]` | **PASS** | Explorer v1 hub |
| `/search` | **PASS** | RV2 + Explorer tokens |
| `/rv/[year]` | **PASS** | RV2 + Explorer tokens |
| `/rv/[year]/[month]` | **PASS** | Inherits year chronology RV2 overrides |
| `/rv/[year]/[month]/[week]` | **PASS** | Same family as year |
| `/retroverse-2/song/[rvtr]` | **PASS** | RV2 shell; song-specific sections |
| `/retroverse-2/charts` | **PASS** | RV2 charts CSS migrated |
| `/retroverse-2/live` | **PASS** | RV2 live hub CSS migrated |
| `/` (Home / Broadcast) | **PASS** | Explorer shell + live-home presentation overrides (commit `4e487e6d9`) |
| `/live`, `/retroverse-live` | **NEEDS ALIGNMENT** | Redirect/wrapper routes; confirm they inherit `/` Explorer shell |
| `/artist/[slug]/songs` | **NEEDS ALIGNMENT** | Legacy cream **Artist Exhibit** shell (`artist-page.css`) |
| `/artist/[slug]/albums` | **NEEDS ALIGNMENT** | Legacy exhibit |
| `/artist/[slug]/charts` | **NEEDS ALIGNMENT** | Legacy exhibit |
| `/artist/[slug]/library` | **NEEDS ALIGNMENT** | Legacy exhibit |
| `/artist/[slug]/related` | **NEEDS ALIGNMENT** | Legacy exhibit |
| `/artist/[slug]/explore` | **NEEDS ALIGNMENT** | Legacy exhibit |
| `/artist/[slug]/years` | **NEEDS ALIGNMENT** | Legacy exhibit |
| `/album/[id]` | **NEEDS ALIGNMENT** | Album page uses separate paper/teal styling |
| `/track/[id]` | **NEEDS ALIGNMENT** | Cream paper track exhibit |
| `/song/[rvtr]`, `/song/vdj/[key]` | **NEEDS ALIGNMENT** | Legacy redirects/exhibits |
| `/experience/[rvtr]` | **NEEDS ALIGNMENT** | Experience gallery styling (not RV2) |
| `/retroverse/experiences` | **NEEDS ALIGNMENT** | Experiences index |
| `/explore/song/[rvtr]` | **NEEDS ALIGNMENT** | Minimal wrapper; depends on inner experience components |
| `/sunday-nights` | **NEEDS ALIGNMENT** | Paper/orange editorial palette |
| `/pass/[serial]` | **NEEDS ALIGNMENT** | Pass registration paper layout |
| `/giveaway/[eventKey]` | **NEEDS ALIGNMENT** | Partial token migration on register CSS only |
| `/charts` | **NEEDS ALIGNMENT** | Legacy charts entry (if distinct from retroverse-2) |

---

## Verification checklist (audited PASS routes)

| Criterion | Week | Artist | Search | Year | Song |
|-----------|------|--------|--------|------|------|
| Same dark Broadcast background | ✓ | ✓ | ✓ | ✓ | ✓ |
| Purple primary accent | ✓ | ✓ | ✓ | ✓ | ✓ |
| Aqua secondary accent | ✓ | ✓ | ✓ | ✓ | ✓ |
| Avenir/system typography | ✓ | ✓ | ✓ | ✓ | ✓ |
| Consistent shell spacing | ✓ | ✓ | ✓ | ✓ | ✓ |
| Purple CTA buttons | ✓ | ✓ | ✓ | ✓ | ✓ |
| Purple-tinted surfaces | ✓ | ✓ | ✓ | ✓ | ✓ |
| No legacy blue panels | ✓ | ✓ | ✓ | ✓ | ✓ |
| No mixed cream exhibit | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Known intentional differences (not defects)

1. **Home / Live Broadcast** — Full-screen channel presentation; Explorer shell deferred until Live hub migration sprint.
2. **Song Chart Journey** — Uses `chart-journey` rows linking to Chart Week, not Explorer Play/+/✓ rows. Same tokens, different row anatomy.
3. **Search category headers** — Album (aqua), Songs (amber), Artists (purple) gradients preserved for scanability.
4. **Return to Live** — Magenta accent (per Explorer guide) on nav and global rail.

---

## Remaining alignment work (priority order)

1. ~~**Home / Live Broadcast** (`/`, `/live`) — Wrap or skin with Explorer shell + tokens without changing layout.~~ **Done** (`4e487e6d9`)
2. **Artist sub-routes** — Migrate `/artist/[slug]/*` off cream exhibit to Explorer v1 sections.
3. **Album page** (`/album/[id]`) — Apply Explorer tokens to album shelf/detail.
4. **Track / legacy song exhibits** — Retire or redirect to RV2 song.
5. **Experience routes** — Align experience gallery with Broadcast theme.
6. **Sunday Nights / Pass / Giveaway** — Separate editorial routes; migrate when those flows enter Live scope.

---

## Files frozen as design system source

| File | Role |
|------|------|
| `packages/shared/components/explorer/explorer-layout-v1-tokens.css` | Canonical `--ex-*` tokens |
| `packages/shared/components/retroverse-2/rv2-public-shell.css` | Public shell + `--rv2-*` bridge |
| `apps/live/app/week/[date]/chart-week-portal.css` | Explorer row + focus reference |
| `apps/live/app/artist/[slug]/artist-page-v1.css` | Artist hub reference |
| `prototypes/architecture/explorer-design-system.md` | Human-readable spec |

**No future public page should introduce its own visual language.**
