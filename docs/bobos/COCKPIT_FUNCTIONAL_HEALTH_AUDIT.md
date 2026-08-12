# Cockpit Functional Health Audit — Runtime First

**Date:** 2026-07-21  
**Sprint:** Cockpit Functional Health Audit — Runtime First  
**Scope:** Restore Runtime; document health contract; click-test visible Cockpit tiles. No Cockpit redesign. No Broadcast Mixer architecture work.

---

## 1. Runtime link trace (RV01-02)

| Item | Value |
|---|---|
| Panel registration | `PANEL_LIBRARY["retroverse-runtime"]` in `packages/shared/lib/bobos/cockpit/panel-library.ts` |
| RV ID | RV01-02 |
| Configured `primaryAction` | `{ label: "Open Runtime", href: "/bobos/runtime" }` |
| Navigation | Internal — `window.location.assign(href)` from `CockpitPanel.tsx` |
| Expected host / port | Studio process — `http://localhost:3000` (or `PORT`) |
| Actual URL opened | `http://localhost:3000/bobos/runtime` |
| Application | Studio (`apps/studio`) |
| Process / port owner | Next.js Studio on `:3000` (not Live `:3100`) |
| Destination correct? | **Yes** (after Cockpit Recovery). Previously pointed at `http://localhost:3000` → `/`, which was broken. |

`localhost` without a port is **not** equivalent to a specific app; Studio owns `:3000`, Live owns `:3100`.

---

## 2. Asset failure — root cause

**First actual failure:** HTML from the wrong app / wrong route was served under the Studio origin, so the browser requested Studio `/_next/static/...` chunks that did not exist → **404**. `originalFactory.call` / `undefined is not an object (evaluating 'originalFactory.call')` is **downstream** of missing/mismatched webpack modules.

Contributing factors (from Cockpit Recovery + this audit):

1. Studio lacked `app/page.tsx`; dev rewrite proxied `/` → Live (`LIVE_DEV_ORIGIN` `:3100`) under the Studio shell.
2. Runtime tile historically opened `http://localhost:3000` (bare `/`), hitting that hydrate crash.
3. Bare `/_next/static/chunks/app/page.js` 404s alone do **not** mean Runtime is broken — only assets referenced by `/bobos/runtime` HTML matter.

**Verified after restore (2026-07-21):**

- `/bobos/runtime` → 200, title `Runtime — BobOS`
- All `/_next/...` assets referenced by that HTML → 200
- Runtime UI renders (services, Live Monitor, Start/Restart/Stop, Open Studio / Open Live)
- No `originalFactory.call` exception on open

---

## 3. Health contract — what made Runtime HEALTHY (before)

| Question | Answer |
|---|---|
| Code | `cockpitStatus()` in `packages/shared/components/bobos/cockpit/cockpit-status.ts` |
| Endpoint / state checked | **None** for Runtime — fell through to `definition.defaultStatus` |
| Success criteria | `defaultStatus: "nominal"` → green **Healthy** |
| Polling | None — status computed once per Cockpit SSR (`apps/studio/app/bobos/page.tsx` → `loadCockpitPanelData()`) |
| Timeout / fallback | N/A (decorative) |
| Panel registration mistaken for health? | **Yes** — library `defaultStatus` |
| Application route tested? | **No** |
| Failed render still green? | **Yes** — destination could 404/hydrate-fail while tile stayed Healthy |

**Classification (before):** hard-coded / decorative (panel registration default).

Separate false positive inside Runtime app: Studio probe / `studioAppStatus` can report running without proving the Cockpit destination — out of tile-status scope unless Runtime UI itself is audited later.

---

## 4. Health contract — Runtime after this sprint

| Question | Answer |
|---|---|
| Code | `loadRuntimeAppHealth()` in `load-panel-data.ts` + `runtimeStatus()` in `cockpit-status.ts` |
| Destination | `GET http://127.0.0.1:${PORT\|\|3000}/bobos/runtime` |
| Dependency | `getRetroverseRuntimeStatus()` must succeed |
| Assets | Up to 8 `/_next/static` or `/_next/development` URLs from the HTML must not 404/5xx |
| HTML criteria | Must look like Runtime (title/body markers); reject app-error HTML; reject redirects / 404 / 5xx |
| Timeout | 4s HTML, 3s per asset |
| Polling | Still once per Cockpit page load (SSR), not continuous |
| Labels | `Healthy` / `PROCESS ONLINE` / `APP DEGRADED` / `ROUTE BROKEN` / `OFFLINE` |

**Classification (after):** route health + dependency (status API) + shallow asset health. Not full client render-health or primary-action automation.

**Healthy only when:** process answers on Studio port, destination HTML is Runtime, referenced Next assets load, and status API works. Process-only → `PROCESS ONLINE`. Broken route → `ROUTE BROKEN`. Bad HTML/assets/API → `APP DEGRADED`.

---

## 5. Tile click-test table

Displayed status = Cockpit faceplate at audit time. Opens / Renders / Primary action = destination probe + browser checks (ops-pin counted as opens but not renders).

| RV ID | Application | Displayed status | Opens | Renders | Primary action works | Accurate status |
|---|---|---|---|---|---|---|
| RV01-03 | Broadcast Control | Healthy | yes → `/bobos/broadcast` | yes | yes (mixer UI) | **No** — decorative `defaultStatus` (app works; status not proven) |
| RV01-02 | Runtime | Healthy | yes → `/bobos/runtime` | yes | yes (Restart / Open Studio) | **Yes** — functional probe (after fix) |
| RV06-01 | Media Library | Healthy | yes → `/ops/content-creator` | **no** (ops-pin) | **no** (gate) | **No** — false Healthy |
| RV04-03 | Song Workspace | Healthy | yes → `/bobos/song-workspace` | yes | yes (Inspect / RVTR) | **No** — decorative (app works) |
| RV04-01 | Current Song | Healthy | yes → `/ops/intelligence` | **no** (ops-pin) | **no** | **No** — false Healthy |
| RV04-06 | AI Queue | Warning | yes → `/ops/intelligence` | **no** (ops-pin) | **no** | Partial — Warning not from destination probe |
| RV03-13 | Song Packages | Healthy | yes → `/ops/intelligence` | **no** (ops-pin) | **no** | **No** — false Healthy |
| RV01-05 | Production Queue | Healthy | yes → `/ops` | **no** (ops-pin) | **no** | **No** — false Healthy |
| RV02-01 | Current Event | Healthy | yes → `/bobos/event` | yes | yes | **No** — decorative |
| RV02-03 | Pass Production | Healthy | yes → `/bobos/passes` | yes | yes | **No** — decorative |
| RV02-02 | Event Producer | Healthy | yes → `/bobos/producer` | yes | yes | **No** — decorative |
| RV02-05 | Pass Management | Healthy | yes → `/bobos/pass-management` | yes | yes | Partial — pass-count data only; not destination probe |
| — | VirtualDJ Status | Healthy | yes → `/ops/browser-plus` | **no** (ops-pin) | **no** | **No** — false Healthy |
| RV02-03 | Printer Panel | Warning | yes → `/bobos/passes` | yes | yes (Design Builder) | **No** — Warning is decorative; destination OK |
| — | Terminal | Offline | yes → `/ops/atlas/scripts` | **no** (ops-pin) | **no** | Accidental match — Offline ≠ ops-pin; still not destination health |
| — | Catalog Integrity | Action required | yes → `/ops/integrity` | **no** (ops-pin) | **no** | Partial — integrity metrics real; destination blocked by ops-pin |

### False-positive / inaccurate indicators (list)

1. **Runtime (before fix)** — Healthy while `/` or wrong-shell destination broken.
2. **Media Library** — Healthy → ops-pin, not Content Creator.
3. **Current Song / AI Queue / Song Packages** — Healthy/Warning → ops-pin on `/ops/intelligence`.
4. **Production Queue** — Healthy → ops-pin on `/ops`.
5. **VirtualDJ Status** — Healthy → ops-pin on `/ops/browser-plus`.
6. **Catalog Integrity** — Action required from catalog metrics, but primary open hits ops-pin (status ≠ openability).
7. **Broadcast Control, Song Workspace, Current Event, Pass Production, Event Producer, Printer Panel** — green/amber from `defaultStatus`, not destination probes (apps may work; indicators are not evidence).

---

## 6. Files touched this sprint

| File | Change |
|---|---|
| `packages/shared/lib/bobos/cockpit/load-panel-data.ts` | `loadRuntimeAppHealth()` — destination + assets + status API |
| `packages/shared/components/bobos/cockpit/cockpit-status.ts` | Runtime uses probe levels, not `defaultStatus` |
| `docs/bobos/COCKPIT_FUNCTIONAL_HEALTH_AUDIT.md` | This report |

Runtime destination restore (`/bobos/runtime`, Studio `app/page.tsx`) was completed in Cockpit Recovery; this sprint locks the health contract and audit.

---

## 7. Acceptance

| Criterion | Status |
|---|---|
| Runtime opens from Cockpit | ✓ |
| No `/_next/static/` 404 for Runtime page assets | ✓ |
| No `originalFactory.call` on Runtime | ✓ |
| Root cause documented | ✓ |
| Prior health check documented | ✓ |
| Runtime cannot show Healthy while destination broken | ✓ (probe) |
| Every listed Cockpit tile click-tested | ✓ |
| False-positive list | ✓ |
| No unrelated redesign | ✓ |

**Remaining debt:** Other tiles still use decorative `defaultStatus`. Extend the same destination/functional probe pattern beyond Runtime.

---

## Execution state

**COMPLETE** for Runtime restore + Runtime health contract + full tile accuracy audit documentation.  
Ready for follow-up: functional health probes for ops-gated and decorative tiles (separate approval).
