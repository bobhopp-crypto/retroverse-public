# Live Bridge — VirtualDJ → Retroverse

Runs on the **DJ Mac**. Polls VirtualDJ Network Control, detects audible-deck track changes with hysteresis, and POSTs to `/api/sunday-nights/bridge` (authoritative Sunday Nights live state).

## Prerequisites

- VirtualDJ 2023+ with **Pro** license
- **Network Control** plugin installed, enabled, auto-start on master panel
- Note the plugin port (default `80`, often `8088`)
- Retroverse API running (local `npm run dev` or production URL)
- `LIVE_NOW_PLAYING_SECRET` set on server and bridge (production)

## Quick start (local dev)

```bash
# Terminal 1 — Retroverse
npm run dev

# Terminal 2 — Bridge (VDJ playing)
VDJ_NETWORK_PORT=8088 \
LIVE_NOW_PLAYING_URL=http://127.0.0.1:3000/api/sunday-nights/bridge \
npx tsx tools/live-bridge/index.ts
```

Open [http://localhost:3000/live](http://localhost:3000/live).

## Production (Sunday Nights)

```bash
VDJ_NETWORK_PORT=8088 \
VDJ_NETWORK_BEARER=optional-plugin-password \
LIVE_NOW_PLAYING_URL=https://retroverse.live/api/sunday-nights/bridge \
LIVE_NOW_PLAYING_SECRET=your-shared-secret \
RETROVERSE_DATA_ROOT=/Users/bobhopp/RETROVERSE_DATA \
npx tsx tools/live-bridge/index.ts
```

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `VDJ_NETWORK_PORT` | `80` | Network Control HTTP port |
| `VDJ_NETWORK_BEARER` | — | Plugin bearer password |
| `LIVE_NOW_PLAYING_URL` | `http://127.0.0.1:3000/api/sunday-nights/bridge` | POST target |
| `LIVE_NOW_PLAYING_SECRET` | — | Bearer token (required in production) |
| `LIVE_BRIDGE_POLL_MS` | `2000` | Poll interval |
| `LIVE_BRIDGE_STABLE_POLLS` | `3` | Stable readings before publish (~6s) |
| `LIVE_BRIDGE_DECK_COUNT` | `2` | Decks to query |
| `RETROVERSE_DATA_ROOT` | `../RETROVERSE_DATA` | Bridge log directory |

## Logs

Bridge logs append to:

```
RETROVERSE_DATA/live/bridge-YYYY-MM-DD.log
```

API logs append to:

```
RETROVERSE_DATA/live/api-YYYY-MM-DD.log
```

## Hysteresis

During crossfades both decks may be audible. The bridge:

1. Reads `is_audible` on each deck
2. Uses `get_crossfader_result` when both are audible
3. Requires **3 consecutive stable polls** before publishing
4. Skips duplicate publishes for the same deck + filepath

## Pre-flight probe

```bash
VDJ_NETWORK_PORT=8088 npx tsx tools/sunday-nights/probe-vdj-network-control.ts
```
