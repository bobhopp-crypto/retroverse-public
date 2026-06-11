# Live Now Playing — Quickstart

**One command. One terminal. Sunday Nights ready.**

---

## Sunday workflow

1. Open Terminal
2. `cd` into `RETROVERSE_PUBLIC`
3. Start VirtualDJ (Network Control enabled)
4. Run:

```bash
npm run live-now-playing
```

5. Play a song in VirtualDJ
6. Patrons scan QR → **`/live`**

Stop when done:

```bash
npm run live-stop
```

Diagnostics:

```bash
npm run live-diagnose
```

---

## What `npm run live-now-playing` does

| Step | Action |
|------|--------|
| 1 | Finds Retroverse project root (`package.json` → `retroverse-public`) |
| 2 | Loads `.env.local` / `.env` |
| 3 | Probes VirtualDJ Network Control |
| 4 | Starts dev server if API not already up |
| 5 | Starts live bridge (background) |
| 6 | Opens `/live` and `/ops/live` in browser |
| 7 | Prints status checklist |

**Success output:**

```
✅ Retroverse running
✅ Bridge running
✅ VDJ reachable
✅ Live page ready
```

---

## First-time setup (once)

### VirtualDJ

1. Install **Network Control** plugin (Pro license)
2. Master panel → **Auto-Start** → Network Control
3. Note the port (often **8088**, not 80)

### `.env.local` (recommended)

Create `RETROVERSE_PUBLIC/.env.local`:

```bash
# Ops console + live monitor
RETROVERSE_OPS=1
RETROVERSE_OPS_PIN=6324

# VirtualDJ Network Control port
VDJ_NETWORK_PORT=8088

# Optional plugin password
# VDJ_NETWORK_BEARER=

# Postgres for RVTR resolution (local inspect)
RETROVERSE_PG_HOST=localhost
RETROVERSE_PG_DATABASE=retroverse
RETROVERSE_PG_USER=bobhopp
```

Production deploy also needs `LIVE_NOW_PLAYING_SECRET` on Vercel + bridge Mac.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `❌ VDJ reachable` | Enable Network Control; set `VDJ_NETWORK_PORT=8088` |
| `❌ Retroverse running` | Check `RETROVERSE_DATA/live/dev-stdout.log`; try `LIVE_PORT=3001` |
| `❌ Bridge running` | Check `RETROVERSE_DATA/live/bridge-stdout.log` |
| `/live` empty | Play a track; wait ~10s (hysteresis + poll) |
| Wrong RVTR | Path must match `media_assets.source_path` |

```bash
npm run live-diagnose
```

---

## Files & logs

| Path | Purpose |
|------|---------|
| `tools/live/start-live-now-playing.ts` | One-command startup |
| `tools/live/stop-live-now-playing.ts` | Shutdown |
| `tools/live/diagnose-live-now-playing.ts` | Health check |
| `RETROVERSE_DATA/live/processes.json` | Spawned PIDs (for `live-stop`) |
| `RETROVERSE_DATA/live/bridge-stdout.log` | Bridge output |
| `RETROVERSE_DATA/live/dev-stdout.log` | Dev server output |
| `RETROVERSE_DATA/live/bridge-*.log` | Bridge events |
| `RETROVERSE_DATA/live/api-*.log` | API events |

---

## npm commands

| Command | Purpose |
|---------|---------|
| `npm run live-now-playing` | Start everything |
| `npm run live-stop` | Stop bridge + spawned dev server |
| `npm run live-diagnose` | Project path, VDJ, API, bridge, current track |

---

## Related

- `reports/live-integration/live-now-playing-mvp.md` — implementation details
- `reports/live-integration/vdj-retroverse-integration-study.md` — integration research
- `tools/live-bridge/README.md` — bridge internals
