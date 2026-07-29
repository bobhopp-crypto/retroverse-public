# Public Experience Stabilization — Phase 1 (Final Approval Pass)

**Date:** 2026-07-29
**Status:** Ready for approval — not committed

---

## 1. Homepage Presentation Payload (Runtime)

**Endpoint:** `GET /api/sunday-nights/current`
**Inspected at:** 2026-07-29 ~18:02 UTC (local dev, port 3100)

### Observed payload (Experience Selector + VDJ live)

| Field | Value |
|-------|-------|
| **RVTR** | `RVTR738810` (resolved from VDJ filepath via `resolveLiveTrack`) |
| **title** | Love Rollercoaster |
| **artist** | Red Hot Chili Peppers |
| **album** | RPM14 (from VDJ package; no canonical album href) |
| **year** | 1996 |
| **artwork** | `null` (no cover in graph/VDJ for this track) |
| **publicSong** | Present — full `PublicSongPayload` with graph + package + VDJ |
| **internal song href** | `/retroverse-2/song/RVTR738810` |
| **internal artist href** | `/artist/RVAR003444` |
| **internal album href** | `null` (no canonical album relationship) |
| **internal year href** | `/rv/1996` |
| **live overlay** | Present — title, artist, year, bridge metadata |
| **manualOverride.rvba** | title + subtitle from VDJ presentation item |
| **destination** | `{ kind: "EXPERIENCE", href: "/retroverse-2/song/RVTR738810" }` |

### Root cause of generic homepage placeholders (fixed)

When `manualOverride` was active, `payloadFromCurrentExperience()` returned:

- `live: null`, `track: null`, `publicSong: undefined`
- `currentTrackId` set to raw `vdj:/filepath` (not RVTR)

`buildPanels()` then fell through to hardcoded defaults `"Current song"` / `"Explore Retroverse"`.

**Fix:** `payloadFromCurrentExperience()` is now async and:

1. Builds `live` overlay from `rvba` + Sunday Nights bridge state
2. Resolves RVTR from VDJ filepath via `resolveLiveTrack()`
3. Loads `publicSong` + `track` when RVTR is found
4. Sets canonical `destination.href`

`buildPanels()` reads `manualOverride.rvba` as identity fallback and uses an honest idle state when no presentation exists.

---

## 2. Homepage Behavior Matrix

| Scenario | Behavior |
|----------|----------|
| **A. Valid RVTR + payload** | Song/Artist/Year panels show actual metadata + internal hrefs. Album shows title; external search when no canonical album href. |
| **B. VDJ metadata only** | Shows title/artist from `live`/`rvba`; song links to VDJ destination or search; album/year use external fallbacks when graph links missing. |
| **C. No presentation data** | Idle panels: "Nothing on air", "Discover artists", etc. — all link to `/search` or `/retroverse-2/charts`. No fake song labels. |

**Verified on `/`:** Love Rollercoaster · Red Hot Chili Peppers · RPM14 · 1996 · Live Now kicker · six panels.

---

## 3. Registration Chrome (Single Control)

**Before:** Duplicate — `Rv2PublicShell` bottom banner + homepage `RegistrationBar` (fixed position).

**After:** Shell-only registration via `Rv2PublicShell` footer:

```tsx
<Link href="/" className="rv2-broadcast-banner__action">Scan Pass QR to Register</Link>
```

**Removed:**

- `RegistrationBar` import/mount from `public-homepage-view.tsx`
- `packages/shared/components/retroverse-2/RegistrationBar.tsx` (deleted)
- `packages/shared/components/retroverse-2/registration-bar.css` (deleted)
- Extra `padding-bottom: 4.5rem` on `.public-home` (shell already provides safe-area padding)

**Verified:** One registration link visible on `/` and song page. No overlapping fixed bars.

---

## 4. Mobile Inspection

| Viewport | Routes | Result |
|----------|--------|--------|
| **320 × 568** | `/`, `/retroverse-2/song/RVTR758008` | No horizontal overflow. Search, Retroverse, Return to Live all visible. Single registration bar. Song discovery links (4) reachable. |
| **375 × 667** | CSS breakpoints cover via shared `@media (max-width: 380px)` rules | Same nav containment |
| **390 × 844** | Existing rv2 shell `@media (max-width: 390px)` control sizing | No clipping observed |

**CSS changes:**

- `retroverse-global-nav.css` — tighter gaps/fonts at ≤380px; `flex-shrink: 0` on zones
- `public-mobile-width.css` — overflow containment for `.public-home` and `.rv2-live`

---

## 5. Song Page Mobile (RVTR758008)

- Explorer shell intact
- Chart Journey renders; section nav tappable
- Four discovery links at page bottom (Wikipedia, YouTube, Spotify, Apple Music)
- Registration footer does not cover discovery section (shell `padding-bottom: calc(4.3rem + safe-area)`)
- No horizontal overflow at 320px

---

## 6. PublicSongExperience Size Review (+391 / −146)

**Verdict: justified — no refactor needed.**

| Logic | Location | Assessment |
|-------|----------|------------|
| Payload assembly | `loadPublicSongPayload` | Correctly externalized |
| URL / discovery | `ExternalDiscoveryLinks`, `payload.links` | Not duplicated in component |
| Chart narrative | `chartStory()`, `definingMoment()` | View-layer formatting; appropriate |
| Section gating | Conditional renders on payload fields | Component responsibility |
| Fallback load | `loadPublicSongPayload(rvtr)` when no prop | Legacy/embed support only |

Component primarily renders normalized payload; does not re-implement resolver order.

---

## 7. Source-Control Hygiene

### Tracked diff (12 files)

```
12 files changed, 696 insertions(+), 383 deletions(-)
```

### Untracked file classification

#### A — Required Phase 1 (proposed staging)

```
apps/live/app/components/public-homepage-view.tsx
apps/live/app/public-homepage.css
packages/shared/lib/retroverse/experience/load-public-song-payload.ts
packages/shared/lib/public/external-search.ts
packages/shared/components/public/ExternalDiscoveryLinks.tsx
packages/shared/components/public/external-discovery-links.css
packages/shared/components/retroverse/ExternalSearchLinks.tsx
reports/public-experience-stabilization-phase-0.md
reports/public-experience-stabilization-phase-1.md
```

#### B — Existing unrelated work (leave untouched)

```
apps/studio/app/api/bobos/contacts/
apps/studio/app/api/bobos/credentials/library/
apps/studio/app/api/bobos/giveaway/
apps/studio/app/api/bobos/public-experience/
apps/studio/app/bobos/contacts/
apps/studio/app/bobos/pass-library/
apps/studio/app/bobos/public-content-review/
apps/studio/lib/
packages/shared/components/bobos/contacts/
packages/shared/components/bobos/experience-selector/SongJourneyBrowser.tsx
packages/shared/components/bobos/pass-library/
packages/shared/lib/bobos/credentials/
packages/shared/lib/bobos/pass-library/
packages/shared/lib/giveaway/
packages/shared/lib/retroverse-pass/contacts.ts
packages/shared/lib/retroverse/song-content.ts
docs/bobos/credentials-library-authority.md
docs/migrations/pass-management-spreadsheet-v1.sql
docs/migrations/retroverse-contacts.sql
reports/bobos/
tools/public-content/
Keynote/
outputs/
```

#### C — Generated / temporary / accidental (do not stage)

```
.runtime/
.vercelignore
artifacts/
reports/pwa/lighthouse-best-practices
reports/pwa/lighthouse-best-practices.json
```

### Proposed staging command (NOT run)

```bash
git add \
  apps/live/app/page.tsx \
  apps/live/app/components/public-homepage-view.tsx \
  apps/live/app/public-homepage.css \
  apps/live/app/public-mobile-width.css \
  apps/live/app/retroverse-2/song/\[rvtr\]/page.tsx \
  apps/live/app/song/vdj/\[key\]/page.tsx \
  apps/live/app/artist/\[slug\]/artist-page-view.tsx \
  apps/live/app/album/\[id\]/album-page-view.tsx \
  apps/live/app/rv/\[year\]/rv-year-view.tsx \
  packages/shared/lib/home/public-current-song.ts \
  packages/shared/lib/retroverse/experience/load-public-song-payload.ts \
  packages/shared/lib/retroverse/experience/resolve-canonical-song.ts \
  packages/shared/lib/public/external-search.ts \
  packages/shared/components/public/ExternalDiscoveryLinks.tsx \
  packages/shared/components/public/external-discovery-links.css \
  packages/shared/components/retroverse/ExternalSearchLinks.tsx \
  packages/shared/components/retroverse/PublicSongExperience.tsx \
  packages/shared/components/retroverse/public-song-experience.css \
  packages/shared/components/shell/retroverse-global-nav.css \
  reports/public-experience-stabilization-phase-0.md \
  reports/public-experience-stabilization-phase-1.md
```

---

## 8. Browser Routes Verified

| Route | Checks |
|-------|--------|
| `http://localhost:3100/` | 6 panels, actual song data, one registration, search visible |
| `http://localhost:3100/retroverse-2/song/RVTR758008` | Explorer shell, 4 discovery links, chart journey |
| `http://localhost:3100/artist/RVAR001038` | 4 discovery links |
| `http://localhost:3100/album/RVAL927956` | 4 discovery links |
| `http://localhost:3100/rv/1984` | 4 discovery links |

---

## 9. Validation

```bash
cd /Users/bobhopp/RETROVERSE_PUBLIC/apps/live
npx tsc --noEmit -p tsconfig.json
# Pass
```

ESLint not configured (skipped per sprint scope). Playwright not installed.

---

## 10. Final Known Gaps

1. **VDJ-only tracks without RVTR resolution** — album/year panels use external search when graph links absent (expected).
2. **No cover art** for current VDJ track (data gap, not UI).
3. **Dual top chrome** — global nav + Rv2 broadcast banner both show "Return to Live" on entity pages (pre-existing; not in scope).
4. **`song-content.ts` untracked** — imported by `PublicSongExperience`; unrelated BobOS file in workspace; tsc passes with local copy.

---

## 11. Acceptance Checklist

- [x] Actual current song on homepage when presentation exists
- [x] Honest idle state when no data
- [x] One registration control
- [x] No fixed bar covering content
- [x] Header usable at 320px
- [x] Song page reaches discovery section
- [x] Phase 1 files identified for staging
- [x] Unrelated untracked work untouched
- [x] Typecheck passes
- [x] Nothing committed or pushed

---

**Execution State: COMPLETE** — ready for approval
