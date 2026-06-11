# Live System Consolidation Plan

**Date:** 2026-06-11  
**Status:** Approved → implementing in this pass

---

## Problem

Two parallel now-playing systems existed:

| | System A (Sunday Nights) | System B (Live MVP) |
|---|--------------------------|---------------------|
| Write | `setLiveTrack()` via `PATCH /api/ops/sunday-nights` | `applyLiveNowPlayingUpdate()` via `POST /api/live-now-playing` |
| Storage | PG key `live` / `ops/sunday-nights/state.json` | PG key `live_now_playing` / `RETROVERSE_DATA/live/state.json` |
| Public | `/sunday-nights` → `/api/sunday-nights/current` | `/live` → `/api/live-now-playing` |

VDJ bridge wrote only to System B. Manual Go Live wrote only to System A.

---

## Target architecture

```
VirtualDJ (Network Control)
        │
        ▼
tools/live-bridge
        │ POST /api/sunday-nights/bridge  (bearer secret)
        ▼
applyBridgeLiveUpdate()
  → resolveLiveTrack(filepath)
  → setLiveTrack()                    ← SINGLE SOURCE OF TRUTH
        │
        ▼
sunday_nights_state key "live"
  (or ops/sunday-nights/state.json)
        │
        ├─► GET /api/sunday-nights/current
        ├─► GET /api/live-now-playing   (alias, same payload)
        ├─► /sunday-nights              (SundayNightsLive)
        ├─► /live                       (LiveNowPlayingView)
        ├─► /ops/sunday-nights          (manual Go Live + event mode)
        └─► /ops/live                   (bridge health + read-only track)

Event Mode (unchanged, orthogonal):
  setSundayEventMode() → key "eventMode" → / redirects to /sunday-nights
```

---

## Trace (before → after)

### `setLiveTrack()` — **authoritative**

- **File:** `lib/sunday-nights/state.ts`
- **Storage:** `PG_KEY = "live"` or `RETROVERSE_DATA/ops/sunday-nights/state.json`
- **Writers after consolidation:**
  1. Manual: `PATCH /api/ops/sunday-nights` `{ op: "setTrack" }`
  2. VDJ bridge: `POST /api/sunday-nights/bridge`
- **Readers:** all public + ops views

### `live_now_playing` storage — **removed**

- `lib/live-now-playing/state.ts` — deleted
- `lib/live-now-playing/pg-state.ts` — deleted
- `RETROVERSE_DATA/live/state.json` — no longer written (orphan file harmless)

### Event Mode — **unchanged**

- `lib/sunday-nights/event-mode.ts`
- PG key `eventMode`
- Homepage redirect only; not track state

### Bridge path — **changed**

| Before | After |
|--------|-------|
| `POST /api/live-now-playing` | `POST /api/sunday-nights/bridge` |
| Separate state | `setLiveTrack()` |

Default bridge URL: `http://127.0.0.1:3000/api/sunday-nights/bridge`

### `/live` — **same state, different UI**

- Polls `/api/sunday-nights/current` (or alias)
- Minimal mobile patron layout preserved

### `/ops/live` — **bridge health monitor**

- Reads Sunday Nights state (authoritative track)
- Reads `RETROVERSE_DATA/live/processes.json` (bridge pid)
- No separate live editor

---

## Schema extension

`SundayNightsLiveSelection` gains optional bridge metadata (stored in same live object):

```typescript
source?: "manual" | "bridge"
filepath?: string
deck?: number
bridgeTimestamp?: string
resolution?: "filepath" | "fallback" | "unresolved"
```

Manual Go Live omits bridge fields. Bridge publish sets them.

---

## Migration notes

1. **No DB migration** — same `sunday_nights_state` table, key `live` only.
2. **Orphan `live_now_playing` PG row** — safe to ignore or delete manually.
3. **Orphan `RETROVERSE_DATA/live/state.json`** — safe to delete.
4. **Env vars unchanged:** `LIVE_NOW_PLAYING_SECRET` still gates bridge POST.
5. **Optional:** set `LIVE_NOW_PLAYING_URL=http://127.0.0.1:3000/api/sunday-nights/bridge` in `.env.local` (new default in bridge config).

---

## Validation checklist

- [x] Manual `setLiveTrack` → `/api/sunday-nights/current` + `/api/live-now-playing` identical
- [x] Bridge POST `/api/sunday-nights/bridge` → `source: bridge`, same APIs
- [x] Event mode code unchanged (`lib/sunday-nights/event-mode.ts`, `app/page.tsx`)
- [x] `/ops/live` reads Sunday Nights state + bridge manifest
- [x] Single state file: `RETROVERSE_DATA/ops/sunday-nights/state.json` (key `live` on PG)

### Test results (2026-06-11, dev :3002)

| Test | Result |
|------|--------|
| Bridge POST → RVTR298286, source bridge | Pass |
| GET current == GET live-now-playing alias | Pass (same `updatedAt`, same `live.title`) |
| Manual setLiveTrack → source manual | Pass |
| State file `ops/sunday-nights/state.json` only | Pass |
| `/live` HTTP 200 | Pass |
| `/sunday-nights` HTTP 200 | Pass |

---

## Files to change

| Action | Path |
|--------|------|
| Extend | `lib/sunday-nights/types.ts` |
| Extend | `lib/sunday-nights/state.ts` (normalizeLive) |
| Add | `lib/sunday-nights/resolve-live-track.ts` |
| Add | `lib/sunday-nights/apply-bridge-update.ts` |
| Add | `lib/sunday-nights/bridge-status.ts` |
| Add | `app/api/sunday-nights/bridge/route.ts` |
| Update | `app/api/live-now-playing/route.ts` (alias) |
| Update | `app/live/*`, `components/ops/live/*` |
| Update | `tools/live-bridge/config.ts` |
| Update | `tools/live/diagnose-live-now-playing.ts` |
| Delete | `lib/live-now-playing/state.ts`, `pg-state.ts`, `storage-mode.ts`, `resolve.ts` |
