# Song Page Content Cleanup — Final Report

**Date:** 2026-07-29
**Status:** Complete — not committed (awaiting approval)

---

## Executive Summary

Content cleanup and data-normalization are **approved**. VDJ-only fallback **fixed** — partial song pages now render instead of 404 when bundled VirtualDJ metadata exists.

**Execution State: COMPLETE** (not committed, not pushed)

---

## VDJ-Only Fallback Fix

### Root cause of 404

Three compounding issues:

1. **`loadPublicSongPayload()` only called `loadVdjBasePackageByRvtr()`** (live `database.xml` scan). It did **not** fall back to `loadBundledVdjRvtrPackage()` — the pattern already used by broadcast `loadNowPlayingPackage()`.

2. **`bundledVdjRvtrIndexPath()` could not find `vdj-rvtr-index.json`** when Next.js runs with `cwd=apps/live`. The index lives at repo `data/ops/vdj-rvtr-index.json` but was not copied into `apps/live/data` during build.

3. **`isPublicSongPayloadRenderable()` required both title and artist** with non-empty resolution. VDJ-only payloads with valid metadata still failed when resolution stayed `"empty"` because bundled VDJ never loaded.

### Fix applied

| Change | File |
|--------|------|
| VDJ loader chain: live XML → bundled index (same as broadcast) | `load-public-song-payload.ts` |
| Added `resolutionTier`: `canonical` / `fallback` / `vdj-only` / `unresolved` | `load-public-song-payload.ts` |
| Render when title **or** artist exists; 404 only when `unresolved` | `load-public-song-payload.ts` |
| Removed fake `/rv/{year}` link when no graph track | `load-public-song-payload.ts` |
| Limited-info notice + hide empty explore nav on VDJ-only pages | `PublicSongExperience.tsx` |
| Walk-up path resolution for bundled VDJ index | `paths.ts` |
| Copy `ops/vdj-rvtr-index.json` into `apps/live/data` at build | `prepare-live-data.mjs` |

### VDJ-only test case — RVTR977454

| Field | Value |
|-------|-------|
| **Route** | `/retroverse-2/song/RVTR977454` |
| **Title** | You Can't Judge A Book By The Cover |
| **Artist** | Kenny Wayne Shepherd |
| **Album** | The Kenny Wayne Shepherd Band - You Can't Judge A Book By Its Cover (structured VDJ album field) |
| **Year** | 2014 (plain text — no internal year link) |
| **Resolution tier** | `vdj-only` |
| **Why graph fails** | No Postgres track for this RVTR locally |
| **Why package fails** | No `RVTR977454.json` in intelligence packages |
| **Why VDJ succeeds** | Entry in `data/ops/vdj-rvtr-index.json`; loaded via `loadBundledVdjRvtrPackage()` |
| **HTTP status** | **200** (was 404) |

**Sections shown:** Hero identity, limited-info notice, Discover elsewhere (4 links)
**Sections hidden:** Song Journey, Defining Moment, Story, Trivia, Timeline, Related Music, Explore nav (no internal links)

### Regression recheck

| RVTR | Route | Status | Limited notice | Full sections |
|------|-------|--------|----------------|---------------|
| RVTR758008 | `/retroverse-2/song/RVTR758008` | 200 | No | Yes (journey, story, timeline, related) |
| RVTR738810 | `/retroverse-2/song/RVTR738810` | 200 | No | Story + related; no chart journey |
| RVTR835994 | `/retroverse-2/song/RVTR835994` | 200 | No* | Yes when graph resolves |

\*When graph DB unavailable, falls back to VDJ-only partial page with limited notice (correct).

### Mobile verification — RVTR977454

| Viewport | Result |
|----------|--------|
| 320 × 568 | 200; identity + 4 discovery links; no overflow; single top nav |
| 393 × 812 | 200; registration footer below discovery links |

---

## 1. Artist Normalization — SAFE

`trimDisplayField()` only: trim + collapse whitespace. No typo/fuzzy/suffix rules.

Priority: graph `artistName` → package `metadata.artist` → VDJ payload → VDJ hint.

No `Hollywoodd` in repo. Eight test names unchanged.

---

## 2. Album Selection — SAFE

Priority: `primaryAlbum.title` → package `albumTitle` → VDJ album card → VDJ hint → omit.

**Removed:** story-card prose parsing.

**RVTR758008:** Hero album **omitted**. “Welcome to the Pleasuredome” appears only in approved story-card fact text under The Story — not in `payload.album`.

---

## 3. Content Filtering — SAFE

`isInternalPublicMetadata()` matches only pipeline/diagnostic patterns. Deduplication on exact body text only.

---

## 4. Visual Cleanup (prior pass)

- Single top nav (`showTopBroadcastBanner={false}`)
- Discovery buttons: service name only (`aria-label` for accessibility)
- Related Music meta separated via flex layout
- No Story Cards heading (merged into The Story)

---

## 5. Validation

### Typecheck

```bash
cd apps/live && npx tsc --noEmit -p tsconfig.json
# Pass (2026-07-29)
```

### Production build

```bash
cd apps/live && npm run build
# Pass (2026-07-29)
```

---

## 6. Source Control

### Changed files (14 + 1 untracked module + report)

| File | Change |
|------|--------|
| `packages/shared/lib/retroverse/experience/public-song-display.ts` | **New** |
| `packages/shared/lib/retroverse/experience/load-public-song-payload.ts` | VDJ fallback + resolution tier |
| `packages/shared/lib/ops/intelligence/paths.ts` | Bundled VDJ index path resolution |
| `packages/shared/components/retroverse/PublicSongExperience.tsx` | VDJ-only UI + section gating |
| `packages/shared/components/retroverse/public-song-experience.css` | Related meta + limited notice |
| `packages/shared/components/public/ExternalDiscoveryLinks.tsx` | aria-label only |
| `packages/shared/components/retroverse-2/Rv2PublicShell.tsx` | `showTopBroadcastBanner` |
| `apps/live/app/retroverse-2/song/[rvtr]/page.tsx` | Suppress banner + metadata |
| `apps/live/app/artist/[slug]/artist-page-view.tsx` | Suppress banner |
| `apps/live/app/artist/[slug]/loading.tsx` | Suppress banner |
| `apps/live/app/album/[id]/album-page-view.tsx` | Suppress banner |
| `apps/live/app/album/[id]/loading.tsx` | Suppress banner |
| `apps/live/app/rv/components/rv2-chronology-frame.tsx` | Suppress banner |
| `tools/prepare-live-data.mjs` | Copy VDJ RVTR index for live builds |
| `reports/song-page-content-cleanup.md` | This report |

### Diff statistics (tracked)

```
13 files changed, 167 insertions(+), 66 deletions(-)
```

Plus untracked: `public-song-display.ts` (114 lines).

### Proposed staging list

```
packages/shared/lib/retroverse/experience/public-song-display.ts
packages/shared/lib/retroverse/experience/load-public-song-payload.ts
packages/shared/lib/ops/intelligence/paths.ts
packages/shared/components/retroverse/PublicSongExperience.tsx
packages/shared/components/retroverse/public-song-experience.css
packages/shared/components/public/ExternalDiscoveryLinks.tsx
packages/shared/components/retroverse-2/Rv2PublicShell.tsx
apps/live/app/retroverse-2/song/[rvtr]/page.tsx
apps/live/app/artist/[slug]/artist-page-view.tsx
apps/live/app/artist/[slug]/loading.tsx
apps/live/app/album/[id]/album-page-view.tsx
apps/live/app/album/[id]/loading.tsx
apps/live/app/rv/components/rv2-chronology-frame.tsx
tools/prepare-live-data.mjs
reports/song-page-content-cleanup.md
```

Unrelated workspace files remain untouched. Do not `git add .`.

---

## 7. Approval Status

| Check | Result |
|-------|--------|
| Content cleanup | ✅ Approved |
| Data normalization safe | ✅ |
| VDJ-only renders (not 404) | ✅ RVTR977454 |
| Canonical regressions intact | ✅ |
| tsc + build | ✅ |
| Not committed / not pushed | ✅ |

**Ready for commit when approved.**
