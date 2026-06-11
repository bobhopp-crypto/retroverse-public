# Live Now Playing MVP — Implementation Summary

**Date:** 2026-06-11  
**Scope:** Sunday Nights MVP — VDJ audible deck → Retroverse `/live`

---

## Architecture

```
┌─────────────────────┐
│ VirtualDJ (Pro)     │
│ Network Control     │  localhost HTTP
└─────────┬───────────┘
          │ poll 2s + 3× stable audible deck
          ▼
┌─────────────────────┐
│ tools/live-bridge   │  DJ Mac daemon
│ hysteresis          │
└─────────┬───────────┘  POST Bearer secret
          ▼
┌─────────────────────┐
│ POST /api/live-     │  resolve filepath → RVTR
│     now-playing     │  persist state + log
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐     poll 7s
│ GET /api/live-      │ ──────────────► /live (patrons)
│     now-playing     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ /ops/live           │  ops monitor + manual refresh
└─────────────────────┘

State: RETROVERSE_DATA/live/state.json (local)
       sunday_nights_state key live_now_playing (Vercel/PG)

Logs: RETROVERSE_DATA/live/bridge-*.log
      RETROVERSE_DATA/live/api-*.log
```

**Hysteresis:** `is_audible` per deck → `get_crossfader_result` tie-break → 3 stable polls (~6s) → publish only on deck+filepath change.

**Resolution order:** `media_assets.source_path` → alias store → chart orbit (artist+title). Logged as `filepath` | `fallback` | `unresolved`.

---

## Files created

### Library

| Path | Role |
|------|------|
| `lib/live-now-playing/types.ts` | State + POST body types |
| `lib/live-now-playing/paths.ts` | `RETROVERSE_DATA/live/` paths |
| `lib/live-now-playing/storage-mode.ts` | PG vs JSON |
| `lib/live-now-playing/pg-state.ts` | Postgres persistence |
| `lib/live-now-playing/state.ts` | Load/save + `applyLiveNowPlayingUpdate` |
| `lib/live-now-playing/resolve.ts` | filepath → RVTR + enrichment |
| `lib/live-now-playing/payload.ts` | GET response builder |
| `lib/live-now-playing/logger.ts` | API event logs |
| `lib/live-now-playing/auth.ts` | POST bearer secret |

### API

| Path | Role |
|------|------|
| `app/api/live-now-playing/route.ts` | GET public, POST bridge |

### Public + Ops UI

| Path | Role |
|------|------|
| `app/live/page.tsx` | Public `/live` |
| `app/live/live-now-playing.tsx` | Client poll 7s |
| `app/live/live.css` | Mobile-first patron styles |
| `app/ops/live/page.tsx` | Ops monitor |
| `app/ops/live/live-ops.css` | Ops styles |
| `components/ops/live/LiveNowPlayingOps.tsx` | Refresh + status grid |

### Bridge

| Path | Role |
|------|------|
| `tools/live-bridge/index.ts` | Main loop |
| `tools/live-bridge/vdj.ts` | Network Control client |
| `tools/live-bridge/hysteresis.ts` | Stable-deck gate |
| `tools/live-bridge/publish.ts` | POST to API |
| `tools/live-bridge/config.ts` | Env config |
| `tools/live-bridge/logger.ts` | Bridge logs |
| `tools/live-bridge/README.md` | Setup |

### Ops directory

- `lib/ops/operations-directory.ts` — entry for `/ops/live`

---

## Setup instructions

### 1. Server env (production)

```bash
LIVE_NOW_PLAYING_SECRET=<long-random-secret>
# Optional: force PG on local
LIVE_NOW_PLAYING_STATE_PG=1
```

### 2. VirtualDJ (DJ Mac)

1. Install **Network Control** plugin (Pro).
2. Master panel → enable + **Auto-Start**.
3. Note port (often `8088`).

### 3. Start Retroverse

```bash
npm run dev   # local
# or deploy to retroverse.live with secret set
```

### 4. Start bridge

```bash
VDJ_NETWORK_PORT=8088 \
LIVE_NOW_PLAYING_URL=http://127.0.0.1:3000/api/live-now-playing \
LIVE_NOW_PLAYING_SECRET=<same-secret> \
RETROVERSE_DATA_ROOT=/Users/bobhopp/RETROVERSE_DATA \
npx tsx tools/live-bridge/index.ts
```

### 5. Verify

- Ops: `/ops/live` — filepath, RVTR, resolution, deck
- Public: `/live` — artwork, title, explore buttons
- Logs: `RETROVERSE_DATA/live/`

### Pre-flight

```bash
VDJ_NETWORK_PORT=8088 npx tsx tools/sunday-nights/probe-vdj-network-control.ts
```

---

## Test results

| Test | Result | Notes |
|------|--------|-------|
| Hysteresis unit logic | **Pass** | 3 stable polls; duplicate filepath skipped |
| API GET `/api/live-now-playing` | **Pass** | Empty state: `{ current: null, updatedAt, track: null }` |
| API POST (dev, no secret) | **Pass** | `Bee Gees / Stayin Alive` → `RVTR298286` via fallback |
| State persisted | **Pass** | `RETROVERSE_DATA/live/state.json` written |
| API logs | **Pass** | `RETROVERSE_DATA/live/api-2026-06-11.log` — track_detected, rvtr_fallback, live_state_updated |
| `/live` page | **Pass** | HTTP 200 on `:3001/live` |
| `/ops/live` | **Pass** | HTTP 307 → ops PIN gate (expected without cookie) |
| Bridge → VDJ | **Pending** | VDJ not running on audit machine |
| End-to-end VDJ play | **Pending DJ Mac** | Run bridge with `VDJ_NETWORK_PORT` while playing |

**Checkpoint for Bob:** With VDJ playing, bridge log should show `track_detected` → `track_published`; `/live` updates within ~6s hysteresis + 7s poll ≈ **13s worst case**, typically **under 10s**.

---

## Screenshots

Screenshots require a live VDJ session on the DJ Mac. Capture after first successful publish:

1. `/ops/live` — RVTR + filepath visible
2. `/live` on phone — large title + Explore buttons
3. `RETROVERSE_DATA/live/bridge-*.log` — `track_published` line

---

## Out of scope (per spec)

- Queue, playlists, BPM, lyrics, deck viz, history
- WebSockets
- Native VDJ plugin

---

## Related docs

- `reports/live-integration/vdj-retroverse-integration-study.md` — research
- `reports/sunday-nights/vdj-automation-feasibility.md` — prior feasibility
- `tools/live-bridge/README.md` — bridge operator guide
