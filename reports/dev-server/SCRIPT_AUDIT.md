# Dev Server Script Audit

Generated: Sprint 3.16

## npm run dev chain

| Step | Script | Kills dev/port? | Notes |
|---|---|---|---|
| 1 | `package.json` → `node tools/next-dev.mjs` | No | Wrapper spawns `next dev -p 3000` |
| 2 | `tools/next-dev.mjs` | No (fixed) | Refuses start if foreign owner on port; logs exit to `DEV_SERVER_EVENTS.md` |
| 3 | `next dev` | No | Binds PORT (default 3000) |

## npm run studio

| Step | Script | Kills dev/port? | Notes |
|---|---|---|---|
| 1 | `tools/studio-launcher.mjs` | **Was YES** → **fixed** | Previously `cleanupStaleDevServer()` SIGTERM'd any node on port 3000 |
| 2 | Spawns `next-dev.mjs` with `RETROVERSE_DEV_OWNER=studio-launcher` | Only own child on shutdown | Reuses healthy existing server |

## npm run live-now-playing

| Step | Script | Kills dev/port? | Notes |
|---|---|---|---|
| 1 | `tools/live/start-live-now-playing.ts` | Only prior **spawned** dev PID | Does not kill user `npm run dev` |
| 2 | Spawns dev only if API probe fails | No kill of foreign | Sets `RETROVERSE_DEV_OWNER=live-now-playing` |

## npm run live-stop

| Step | Script | Kills dev/port? | Notes |
|---|---|---|---|
| 1 | `tools/live/stop-live-now-playing.ts` | **Was YES** → **fixed** | Removed `killPortListeners()` that SIGTERM'd all port listeners |

## npm run research:collector:overnight

| Script | Kills dev? | Spawns dev? |
|---|---|---|
| `tools/research/collector-overnight-batch.ts` | **No** | **No** |

## npm run research:studio:production

| Script | Kills dev? | Spawns dev? |
|---|---|---|
| `tools/research/studio-production-run.ts` | **No** | **No** |

## Build guard

| Script | Behavior |
|---|---|
| `tools/guard-no-concurrent-dev.mjs` | Blocks `next build` if dev marker alive or port in use — does **not** kill dev |

## Other kill occurrences (do not affect dev unless misused)

| File | What it kills |
|---|---|
| `tools/live/restart-production-bridge.sh` | `pkill -f live-bridge` only |
| `lib/covers/backfill/acquire-welcome.ts` | iTunes fill child process group only |
| `tools/intelligence/video-factory.ts` | Own loop on SIGINT/SIGTERM |

## Cache cleaning (does not kill process, causes breakage if concurrent)

| Script | Cleans `.next`? |
|---|---|
| `next-dev.mjs` | On start when `.next` exists (unless `--no-clean`) |
| `studio-launcher` | Via `RETROVERSE_DEV_CLEAN` on first/abnormal restart |

**Risk:** Cleaning `.next` while a browser holds old chunk URLs → module-not-found errors (see `logs/studio.log` lines 7633–7635). This degrades the running server but does not SIGTERM it.

## Search hits summary

- `pkill`: `tools/live/restart-production-bridge.sh` (bridge only)
- `lsof` + kill: **removed** from `studio-launcher`, **removed** from `live-stop`
- `process.exit`: research/batch scripts (self only)
- `spawn next-dev`: `studio-launcher`, `live-now-playing` only
