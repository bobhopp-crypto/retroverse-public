# clusterCompare Blank Screen Investigation

**URL:** `/ops/show-builder?clusterCompare=1`  
**Date:** 2026-06-03  
**Prior fix attempt:** `79cee56` (still reported broken by user)

## Reproduction (Playwright + dev server on port 3000)

| Check | Result |
|-------|--------|
| HTTP status (with ops cookie) | 200 |
| SSR shell in HTML | Yes — `ops-topbar`, "Set Builder", Suspense fallback |
| Client hydration | Yes — `.ops-show`, year tabs, song pool |
| Compare panel | Yes — `.ops-show__cluster-compare`, 3 Method columns |
| Console JS errors | None |
| Network failures | None |
| Failed webpack chunks | None |

Screenshot: `screenshots/clusterCompare-investigation.png`

## Server log root causes (historical, same session)

These errors **did** occur during hot reload / partial compile and explain a full white screen:

### 1. Client bundle compile failure — `Can't resolve 'fs'`

```
Module not found: Can't resolve 'fs'
Import trace:
  lib/ops/show-builder/state.ts
  lib/ops/show-builder/load.ts
  components/ops/show-builder/ShowBuilderWorkspace.tsx
```

When the client bundle fails to compile, React never hydrates. User sees blank/off-white body with no Set Builder shell.

**Status at investigation:** `ShowBuilderWorkspace` no longer imports `load.ts` / `state.ts` (API-only). Trace was from an earlier broken edit + stale `.next`.

### 2. SSR crash — `ReferenceError: activeClusterResult is not defined`

```
⨯ ReferenceError: activeClusterResult is not defined
   at ShowBuilderWorkspace (ShowBuilderWorkspace.tsx:234)
GET /ops/show-builder 500
```

Fast Refresh applied a partial edit (useMemo referenced `activeClusterResult` before its declaration). Route returned **500** → blank/error page.

**Status at investigation:** `activeClusterResult` is defined before use (line ~80). Error was transient during edit.

### 3. Webpack parse failure — duplicate `CLUSTER_PALETTE` export

```
Module parse failed: Duplicate export 'CLUSTER_PALETTE'
./lib/ops/show-builder/visual-clustering.ts
```

Broken client chunk for the entire workspace import tree.

**Status at investigation:** Only re-exports from `./clustering/palette` — no duplicate const.

## Binary reduction

| Step | Render result |
|------|---------------|
| Page SSR shell only | Renders (header + banner) |
| ShowBuilderWorkspace after API load | Renders (sets, pool, flow) |
| `clusterCompare=1` + ClusterComparePanel | Renders (compare grid + loading → results) |
| Static text placeholder ("CLUSTER COMPARE TEST") | Would render — not needed; real panel works after bundle fix |

## Why 79cee56 did not help user

Commit `79cee56` added `dynamic()` imports + `devFlagsReady` gate. It did **not**:

- Clear corrupted `.next` cache from prior `fs` / duplicate-export compile failures
- Add an error boundary (failures still wiped the tree silently)
- Remove the fragile dynamic chunk load path

If the dev server still served a broken client chunk, the page stayed white regardless of deferred clustering.

## Fix applied (this investigation)

1. **`ShowBuilderClientShell`** — error boundary + page mount log; workspace crashes show `ops-empty` message instead of white screen
2. **Static imports** for `ClusterComparePanel` / `NeighborDiscoveryMode` (removed `next/dynamic`)
3. **Direct query param read** (removed `devFlagsReady` gate)
4. **Mount console logs:** page, workspace, compare panel

## User checkpoint

1. Stop dev server
2. `rm -rf .next`
3. `RETROVERSE_OPS=1 npm run dev`
4. Open `/ops/show-builder?clusterCompare=1` (ops PIN cookie required)
5. Console should show:
   - `[ShowBuilder] ShowBuilder page mounted`
   - `[ShowBuilder] ShowBuilderWorkspace mounted { clusterCompare: true, ... }`
   - `[ShowBuilder] ClusterComparePanel mounted { year: 1967, poolSize: N }`

If still blank: check terminal for `Can't resolve 'fs'` or 500 on GET `/ops/show-builder`.
