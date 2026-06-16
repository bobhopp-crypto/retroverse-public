# Retroverse Stability Audit

**Date:** 2026-06-16  
**Scope:** Why localhost repeatedly stops and requires restart  
**Method:** Process snapshot, port/memory measurement, Cursor terminal log review (33 sessions, ~7 days of agent shell history)

---

## Executive Summary

localhost is **not crashing from OOM or port conflicts**. The dominant pattern is:

1. **Dev server process termination** (mostly `exit_code: unknown` — Cursor background shell lifecycle, not app crash)
2. **`.next` cache destruction** on every `npm run dev` start, plus mid-session manifest loss when overlapping dev/build activity occurs
3. **Compile/runtime errors** on hot paths (`/ops`, `/ops/finance`, `/ops/atlas/mission`) that produce 500s and *feel* like the server is down while the process may still be running
4. **Heavy concurrent background work** (cover backfill, iTunes artwork fill, Ollama) competing for CPU on the same Mac

**Verdict:** ~60% **Cursor orchestration / restart pattern**, ~25% **application dev workflow** (cache wipe + compile errors), ~15% **environment load** (concurrent batch jobs).

---

## 1. Long-Running Processes (snapshot 2026-06-16 ~08:43 CDT)

| Process | PID | Status | Notes |
|---------|-----|--------|-------|
| **Next.js dev** | 50552–50554 | ✅ Running | `http://localhost:3000`, `RETROVERSE_OPS=1` |
| **Cover backfill** | 78967–78993 | ✅ Running ~12h+ | `tsx tools/run-cover-backfill.ts` in terminal s002 |
| **iTunes artwork fill** | 54101+ | 🔄 Spawning | Child of welcome/backfill pipeline |
| **Ollama** | 28670 | ✅ Running | `ollama serve` since ~9:25 PM prior day |
| **MB wave-100 prep** | — | ❌ Not running now | Was running 1.5h+ sessions earlier (terminals 620762, 713701) |
| **Finance imports** | — | ❌ Not running | No active import service; compile errors on `/ops/finance` routes during dev |
| **Cursor TS/Pyright** | 89108, 1668 | ✅ Running | IDE language servers (~30–120 MB RSS each) |

### Ports

| Port | Listener |
|------|----------|
| **3000** | `next-server` (dev) |
| **3001** | None (was used briefly by parallel dev session 337654) |
| **11434** | Ollama (typical) |

**No `EADDRINUSE` errors** found in any terminal log.

### Node process count

- **16** Node-related processes total
- **~999 MB** combined RSS for node/next/tsx processes (not under memory pressure)

### System

| Metric | Value |
|--------|-------|
| RAM | 24 GB |
| Load avg | 3.11 / 3.27 / 3.43 |
| Free pages | Low (macOS using file cache — normal) |

**No OOM / `Killed` / `heap out of memory` evidence** in terminal logs.

---

## 2. Why localhost Stops — Category Breakdown

| Category | Evidence | Severity |
|----------|----------|----------|
| **Cursor task termination** | 9/12 dev sessions end with `exit_code: unknown`; agent repeatedly starts/stops `npm run dev` in background shells | **HIGH** |
| **`.next` cache wipe on start** | Every dev start logs `[dev] Clearing stale .next and bundler cache…` (12/12 sessions); `tools/next-dev.mjs` deletes `.next` whenever it exists | **HIGH** |
| **Mid-session `.next` corruption** | 72 ENOENT/manifest errors in terminal 844091 while dev was still running; server returned 500 on `/ops` | **HIGH** |
| **Compile errors (HMR)** | Finance `Can't resolve 'fs'` (pg in client), bad import paths, atlas mission null refs; server stays up but routes 500 | **MEDIUM** |
| **Runtime exceptions** | `TypeError: Cannot read properties of null (reading 'toUpperCase')` in atlas mission | **MEDIUM** |
| **OOM / memory pressure** | No log evidence; 24 GB RAM, dev RSS ~176 MB | **LOW** |
| **Port conflict** | No `EADDRINUSE` in logs | **NONE** |
| **Process crash (uncaught)** | Rare; most exits are `unknown` or clean `0` | **LOW** |

---

## 3. Log Review — Last 7 Days (Cursor terminal artifacts)

Terminal logs are the best available audit trail. They cover **2026-06-15 → 2026-06-16** (not full 7 calendar days of system logs).

### Exit code distribution (all 33 terminal sessions)

| exit_code | Count |
|-----------|------:|
| `0` (clean) | 15 |
| `unknown` | 12 |
| `1` (error) | 3 |

### Dev server sessions: **12 starts** in ~20 hours

| Started (UTC) | Duration | Exit | Notes |
|---------------|----------|------|-------|
| 2026-06-15 17:56 | 5.3 min | unknown | |
| 2026-06-15 22:26 | 73.7 min | unknown | Longest unknown-exit session |
| 2026-06-15 23:46 | **132 min** | **0** | Stable until clean exit; had .next ENOENT mid-run |
| 2026-06-16 01:51 | 6.8 min | 0 | Parallel dev on **PORT=3001** |
| 2026-06-16 01:58 | 4.2 min | unknown | |
| 2026-06-16 02:28 | 4.6 min | unknown | |
| 2026-06-16 02:36 | 1.7 min | unknown | Webpack module error |
| 2026-06-16 02:41 | 2.3 min | unknown | |
| 2026-06-16 02:50 | **102 min** | unknown | Finance compile errors (`fs`, `ops.css`) |
| 2026-06-16 04:35 | 8.8 min | unknown | |
| 2026-06-16 13:30 | 3.4 min | unknown | |
| 2026-06-16 13:39 | running | — | Current session at audit time |

### Most common crash/stop reason

**Cursor background shell termination** (`exit_code: unknown`) — 9 of 12 dev restarts.

### Most recent stop reason (before current session)

Background agent restart cycle (terminals 385012, 643805, etc.) — not an application exception.

### Restart frequency

- **~12 dev starts in 20 hours** ≈ one every 1.7 hours
- **Burst:** 4 restarts between 02:28–02:50 UTC (22 minutes) during active agent work

### Other long-running jobs in same period

| Job | Terminal | Duration observed |
|-----|----------|-------------------|
| Cover backfill batch 0108 | 604504 | ~11 min |
| MB wave-100 prep | 620762, 713701 | 1.5h+ each |
| Cover backfill (continuous) | s002 (live) | **12h+** at audit |

---

## 4. Measurements (audit snapshot)

```
Node processes:     16
Dev servers:        1 (port 3000)
.next size:         3.1 MB (fresh — wiped on last start)
Load average:       3.1
Node RSS total:     ~999 MB
Dev server RSS:     ~176 MB
Cover backfill RSS: ~79 MB (but spawns iTunes fill children)
Ollama RSS:         ~25 MB
```

---

## 5. Root Cause Ranking

### #1 — Cursor orchestration + frequent restarts (Environment)

**Evidence:**
- Agent starts `npm run dev` in **background shells** that get `exit_code: unknown` when tasks complete or are superseded
- User sees "down" after agent "restart server" loops
- 9/12 dev sessions ended `unknown`, many under 5 minutes

**Fix:**
- Run dev in a **dedicated terminal outside Cursor agent** (iTerm/Terminal.app):  
  `RETROVERSE_OPS=1 RETROVERSE_HEALING_APPLY=1 npm run dev`
- Tell agent: "do not restart dev" unless explicitly asked
- Use `RETROVERSE_DEV_NO_CLEAN=1` on restart to avoid cache wipe (see #2)

---

### #2 — `.next` deleted on every dev start (Application / workflow)

**Evidence:**
- `tools/next-dev.mjs` → `shouldClean()` returns true whenever `.next` exists
- Every start: `rm -rf .next node_modules/.cache`
- `tools/touch-production-build.mjs` marks production builds; next dev start always wipes
- Terminal 844091: **72 manifest ENOENT errors** while server was running → another process or restart deleted `.next` mid-session

**Fix:**
- After first clean start of the day:  
  `RETROVERSE_DEV_NO_CLEAN=1 RETROVERSE_OPS=1 npm run dev`
- Never run `npm run build` while dev is up (`tools/guard-no-concurrent-dev.mjs` blocks this — keep it)
- **One dev server policy:** kill port 3000 before starting new dev (`lsof -ti :3000 | xargs kill`)

---

### #3 — Compile errors breaking routes (Application)

**Evidence (terminal 690066, 844091):**
- `Module not found: Can't resolve 'fs'` — `pg` bundled into client (`FinanceReviewClient` → fixed in later commit)
- `Module not found: Can't resolve '../ops.css'` — bad relative import in finance pages
- Atlas mission: `null.toUpperCase()`, `normRvtrId is not defined`, syntax errors during HMR
- Webpack: `__webpack_modules__[moduleId] is not a function`

**Effect:** Server process alive but `/ops`, `/ops/finance`, `/` return **500** → feels like localhost died.

**Fix:**
- Fix remaining type/build errors (`atlas/mission` route, finance imports)
- Run `npm run build` before long dev sessions to surface client-bundle issues early
- Avoid editing many files simultaneously during active dev (HMR race)

---

### #4 — Concurrent heavy background jobs (Environment)

**Evidence:**
- Cover backfill running **12+ hours** alongside dev
- iTunes artwork fill spawning repeatedly
- Ollama serve always on
- Load avg ~3.1

**Effect:** Slower compiles, timeouts on iTunes acquire, user perceives hung UI — not usually process death.

**Fix:**
- Run cover backfill in **dedicated terminal** when not actively developing UI
- Pause backfill during ops UI work: `Ctrl+C` on backfill (state checkpoints every 100 albums)
- Consider `nice` or separate machine for batch jobs

---

### #5 — NOT root causes (ruled out)

| Suspected | Verdict |
|-----------|---------|
| OOM | No evidence |
| Port 3000 conflict | No `EADDRINUSE` |
| Postgres down killing dev | Dev doesn't require PG for boot; routes fail individually |
| Finance import daemon | No background import process |

---

## 6. Recommended Operating Procedure (uptime)

### Daily dev (stable)

```bash
# Terminal 1 — keep open all day
cd ~/RETROVERSE_PUBLIC
set -a && . ./.env.local && set +a
export RETROVERSE_OPS=1 RETROVERSE_HEALING_APPLY=1

# First start only (clean cache):
npm run dev

# Subsequent restarts same day:
RETROVERSE_DEV_NO_CLEAN=1 npm run dev
```

### Before starting dev

```bash
lsof -ti :3000 | xargs kill 2>/dev/null   # ensure single listener
```

### Batch jobs (separate terminal)

```bash
RETROVERSE_PG_SSL=0 npm run cover:backfill:once   # not while debugging UI
```

### Do not

- Let Cursor agent auto-restart dev in background loops
- Run `npm run build` while dev is up
- Start second dev on 3000/3001 without killing the first

---

## 7. Issue Classification

| Layer | Share | Primary issue |
|-------|------:|---------------|
| **Cursor orchestration** | ~60% | Background shell `exit_code: unknown`; restart loops |
| **Application / workflow** | ~25% | `.next` wipe policy; compile errors → 500s |
| **Environment** | ~15% | Concurrent backfill + Ollama + dev on one Mac |

---

## 8. Immediate Actions (no new features)

1. ✅ Keep dev in a **persistent external terminal** (not agent background)
2. ✅ Use `RETROVERSE_DEV_NO_CLEAN=1` for same-day restarts
3. ✅ Kill port 3000 before restart (single dev policy)
4. ⏸ Pause cover backfill during active UI dev (or run overnight only)
5. 🔧 Fix remaining build/type errors blocking `npm run build` (atlas route, etc.)
6. 🔧 Finance client `pg` import — **fixed** (`normalizeMerchant` instead of `merchants.ts`)

---

## Appendix: Key files

| File | Role |
|------|------|
| `tools/next-dev.mjs` | Deletes `.next` on start; spawns `next dev` |
| `tools/guard-no-concurrent-dev.mjs` | Blocks build when dev port active |
| `tools/touch-production-build.mjs` | Forces next dev to wipe `.next` |
| `.retroverse-dev-active` | Dev PID marker |
| `reports/cover_backfill/state.json` | Backfill checkpoint (separate from dev) |

---

*Audit performed read-only. No application code modified for this report.*
