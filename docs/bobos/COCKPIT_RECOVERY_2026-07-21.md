# Cockpit Recovery — 2026-07-21

## Root cause

**Failure class:** Client-side exception after navigation (not Cockpit SSR/registry).

1. Studio had **no `app/page.tsx`**. In dev, `next.config.js` fallback-rewrote `/` to the Live app (`LIVE_DEV_ORIGIN`, port 3100).
2. Live HTML was served under the **Studio shell**. Client hydration failed with:
   - `Application error: a client-side exception has occurred`
   - `Cannot read properties of undefined (reading 'call')` (webpack module `.call`)
3. Cockpit faceplate **Runtime** used `primaryAction.href = "http://localhost:3000"`, so clicking Runtime left Cockpit for the broken `/`.
4. Related: Broadcast / Public Homepage “Open Local” also used `/`, hitting the same crash path.

**Not the first failure:** `/bobos` itself compiled and rendered (HTTP 200, SYSTEM NOMINAL, 16 panels) once Studio was running. Studio had also been **down** (connection refused on :3000) before restart — that alone made Cockpit appear dead.

## Fix (minimal)

| Change | Why |
|---|---|
| Add `apps/studio/app/page.tsx` → `redirect("/bobos")` | Studio entry opens Cockpit; stops Live-under-Studio hydrate crash |
| Runtime primaryAction → `/bobos/runtime` | Faceplate opens Runtime app, not broken `/` |
| Local Live links → `http://localhost:3100/` | Open Live directly; do not use Studio `/` proxy |

## Verification

| Check | Result |
|---|---|
| `http://localhost:3000/` | 307 → `/bobos` |
| Cockpit `/bobos` | Loads, SYSTEM NOMINAL, panels render |
| Runtime `/bobos/runtime` | Loads; Ollama service listed Running |
| Broadcast Mixer `/bobos/broadcast` | Loads |
| Song Workspace `/bobos/song-workspace` | Loads |
| Runtime faceplate click | Navigates to `/bobos/runtime` |

## Recent changes that contributed

- Studio/Live split + `next.config.js` fallback rewrite of `/` → Live (dev).
- Runtime panel library pointing “Open Studio” at `http://localhost:3000`.

No Broadcast Mixer architecture redesign; no unrelated refactors.
