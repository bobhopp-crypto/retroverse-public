# Dev Server Root Cause

Sprint 3.16 — evidence-based analysis

## Symptom

Safari intermittently reports **"Cannot connect to localhost"** while developing.

## Root cause (confirmed)

**Background tooling killed the user's dev server by clearing port 3000, not because Collector/Studio production stopped it.**

### Primary: aggressive port cleanup

1. **`tools/studio-launcher.mjs`** — `cleanupStaleDevServer()` (removed in 3.16)
   - Ran `lsof -ti tcp:3000` and `process.kill(pid, SIGTERM)` on **every node listener**
   - Triggered on `npm run studio` start and on every restart after child exit
   - **Effect:** User's separate `npm run dev` terminated when Studio launcher started or restarted

2. **`tools/live/stop-live-now-playing.ts`** — `killPortListeners()` (removed in 3.16)
   - After stopping manifest dev PID, killed **all** listeners on the live port
   - **Effect:** `npm run live-stop` could kill a user-owned dev server on 3000

### Secondary: dev process exit (not killed, but same symptom)

3. **`tools/next-dev.mjs` wrapper exits when Next child exits**
   - When Next crashes or `.next` cache desyncs, wrapper calls `process.exit`
   - Evidence: `logs/studio.log` module-not-found errors (`next-flight-client-entry-loader`) while compiling
   - **Effect:** Port 3000 goes idle — Safari cannot connect

### Not a cause

- **`research:collector:overnight`** — no spawn/kill of dev (verified in source)
- **`research:studio:production`** — no spawn/kill of dev (verified in source)
- **Cursor agent background shells** — agent-started dev dies when shell session ends; not a repo bug but explains prior false "server up" probes

## Evidence

| Source | Finding |
|---|---|
| `tools/studio-launcher.mjs` (pre-3.16) | Lines 70–98: blanket SIGTERM on port 3000 node processes |
| `tools/live/stop-live-now-playing.ts` (pre-3.16) | `killPortListeners()` after live dev shutdown |
| `logs/studio.log` | Dev serving requests, then webpack module-not-found cascade |
| `grep` audit | Collector/production scripts: zero kill/spawn dev references |
| Live probe during investigation | Port 3000 empty after agent background dev; user terminal dev persists |

## Reproduction

1. Terminal A: `npm run dev` → Safari loads `http://localhost:3000`
2. Terminal B: `npm run studio` **or** restart studio after crash
3. **Before fix:** Terminal A dev receives SIGTERM → Safari "Cannot connect"
4. **Or:** `npm run live-now-playing` then `npm run live-stop` with spawned dev → port nuked

## Permanent fix (3.16)

1. **`tools/dev-server/ownership.mjs`** — dev ownership marker (owner, wrapperPid, childPid, port)
2. **`tools/next-dev.mjs`** — refuse foreign port; log exits to `DEV_SERVER_EVENTS.md`
3. **`studio-launcher.mjs`** — reuse healthy server; never kill foreign listeners
4. **`live/stop-live-now-playing.ts`** — kill manifest PIDs only
5. **`live/start-live-now-playing.ts`** — tag owner `live-now-playing`

## Why previous fixes failed

| Attempt | Why insufficient |
|---|---|
| `RETROVERSE_DEV_NO_CLEAN` on studio | Prevented cache wipe but **still killed port 3000** on launcher start |
| `dev:clean` manual restart | Fixed corrupt `.next` temporarily; did not stop studio/live from killing dev |
| Agent `nohup npm run dev` | Dev died when agent shell ended — looked like app bug |

## Verification

Run in **two terminals** (dev must stay in Terminal A — do not background it):

```bash
# Terminal A
npm run dev

# Terminal B (after Ready)
npm run dev:verify-isolation
```

Expected: `PASS — dev remained available through collector + production`

### Evidence collected during sprint

- `DEV_SERVER_EVENTS.md` logged `dev-exit` exitCode 0 when agent shell detached — confirms wrapper exits when parent session ends (not a repo kill).
- Source audit confirms Collector/Production never call kill/spawn on dev.
- Pre-3.16 `studio-launcher` and `live-stop` contained confirmed port-3000 killers (removed).
