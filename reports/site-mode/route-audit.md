# Site Mode Route Audit

Generated for Sprint: Split Retroverse Public vs Local Studio.

## Site mode rules

| Context | Mode | Ops allowed |
|---|---|---|
| `localhost` / `127.0.0.1` | studio | yes (with `RETROVERSE_OPS=1`) |
| `retroverse.live` / `www.retroverse.live` | public | no |
| `RETROVERSE_SITE_MODE=studio` | studio | yes (with `RETROVERSE_OPS=1`) |
| `RETROVERSE_SITE_MODE=public` | public | no |
| Unknown host + `NODE_ENV=production` | public | no |
| Unknown host + dev | studio | yes (with `RETROVERSE_OPS=1`) |

Protection is enforced in `middleware.ts` for matched local-only paths and via `isOpsEnabled()` everywhere else.

## PUBLIC (retroverse.live)

### Pages
- `/` — homepage
- `/live`, `/retroverse-2/live` — live channel
- `/retroverse-2/song/:rvtr` — song pages + chart journey anchor
- `/experience/:rvtr` — patron museum experience
- `/search` — public search
- `/charts`, `/artist/*`, `/album/*`, `/track/*`, `/sunday-nights`, `/retroverse/experiences`
- Legacy discovery routes: `/rv/*`, `/week/*`, `/rvtr/*` (still served; marked legacy in System Map)

### Public APIs
- `/api/search`, `/api/search/suggestions`
- `/api/charts/week`, `/api/charts/year`
- `/api/chart-journey`
- `/api/events`, `/api/events/:slug`, `/api/events/:slug/chapters`
- `/api/experience/visual-asset`
- `/api/live-now-playing`
- `/api/playback/:rvtr`, `/api/playback/stream`
- `/api/retroverse-2/attract-tour`
- `/api/sunday-nights/current`, `/api/sunday-nights/register`, `/api/sunday-nights/bridge`

## LOCAL / STUDIO ONLY (localhost operator tools)

### Route prefixes (blocked on production public site)
- `/local` — Local Studio Launcher (localhost only)
- `/ops`, `/ops/*` — Command Center, Studio, Atlas, finance, browser+, intelligence, live control, etc.
- `/ops/studio/*` — Mission Control, Collector, Editor, Director, Publisher, training
- `/ops/atlas/*` — Library Atlas, Script Launcher, System Map, curation atlas
- `/diagnostics`, `/diagnostics/*`
- `/internal/ops-pin`, `/api/internal/ops-auth`
- `/api/ops/*` — all operator APIs including Script Launcher run API

### Counts (from filesystem scan)
- App pages under `/ops`: ~90+ routes
- API routes under `/api/ops`: ~190 routes
- Operator-only pages outside `/ops` in middleware: `/diagnostics`

### Not deleted
All routes remain in the codebase. Production returns **404** for `/api/ops/*` and **redirects to `/`** for `/ops/*` pages.

## Shared helper

`lib/runtime/site-mode.ts`

- `isProductionPublic(host?)`
- `isLocalStudio(host?)`
- `shouldAllowOpsRoutes(host?)`
- `isLocalOnlyPath(pathname)` — path classifier
- `isPublicApiPath(pathname)` — public API classifier

## Verification checklist

### Local (studio)
- [ ] `localhost:3000/local` — Local Studio Launcher
- [ ] `localhost:3000/ops` — Command Center (PIN + `RETROVERSE_OPS=1`)
- [ ] `localhost:3000/ops/atlas/scripts` — Script Launcher
- [ ] `localhost:3000/ops/studio` — Mission Control

### Production (public)
- [ ] `retroverse.live/` — homepage
- [ ] `retroverse.live/live` — live page
- [ ] `retroverse.live/retroverse-2/live` — live channel
- [ ] `retroverse.live/experience/:rvtr` — patron experience
- [ ] `retroverse.live/ops` — redirect to `/` (no tools)
- [ ] `retroverse.live/local` — redirect to `/`
- [ ] `retroverse.live/ops/atlas/scripts` — redirect to `/`
- [ ] `retroverse.live/api/ops/...` — 404
