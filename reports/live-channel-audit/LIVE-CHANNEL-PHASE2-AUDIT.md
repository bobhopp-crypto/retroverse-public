# Live Channel Phase 2 — Audit Report

**Date:** 2026-06-23  
**Production:** https://retroverse.live  
**Local verify:** http://localhost:3002

---

## Priority 1 — Production Channel Operation

### Production API (before deploy of routing fix)

```
GET /api/sunday-nights/current

channel.running: false
currentTrackId:    null
live.rvtr:         null
live.source:       bridge (stale, 2026-06-22)
live.title:        The Sound of Silence
destination:       { kind: "TRACK", href: null }
```

| Check | Status |
|-------|--------|
| `channel.running=true` | **FAIL** — demo channel not started on production PG |
| `live.rvtr` populated | **FAIL** — stale unresolved bridge track |
| Live state advances | **FAIL** — channel stopped |

### Production routes (pre-deploy)

| Route | Status | Destination |
|-------|--------|-------------|
| `/` | 307 | `/sunday-nights` (event mode) |
| `/live` | 200 | Cream Live v1 |
| `/sunday-nights` | 200 | Cream Live v1 + fallback |
| `/retroverse-2/live` | 200 | RV2 hub |

### Ops action required (production)

1. Deploy this Phase 2 routing commit to Vercel.
2. Open **https://retroverse.live/ops/live-control** (ops PIN).
3. Set Demo · Year · 1971 · Ready Only · Random · 60s.
4. Click **Start Live**.
5. Re-run: `node tools/audit-live-channel.mjs https://retroverse.live`
6. Expected after start:
   - `channel.running: true`
   - `currentTrackId: RVTRxxxxxx`
   - `/` → 307 → `/retroverse-2/song/RVTRxxxxxx`

---

## Priority 2 & 3 — Routing (implemented, verified locally)

### New shared resolver

`lib/live-control/public-entry.ts` → `getPublicLiveRedirectUrl()`

- Advances channel if running (`maybeAdvanceLiveChannel`)
- Resolves RVTR from `currentTrackId` or `live.rvtr`
- Redirects when:
  - `channel.running === true` + valid RVTR, **or**
  - `live.source` is `channel` or `bridge` + valid RVTR

### Pages updated

| File | Behavior |
|------|----------|
| `app/page.tsx` | Live redirect first; **removed** event-mode → `/sunday-nights`; inactive → HomeDirectory browse |
| `app/sunday-nights/page.tsx` | Live redirect before cream shell |
| `app/live/page.tsx` | Live redirect before Now Playing |
| `app/retroverse-2/live/page.tsx` | Live redirect before RV2 hub |

### Local verification (channel started)

```
channel.running: true
rvtr: RVTR417678
live.source: channel

/                  -> 307 /retroverse-2/song/RVTR417678
/live              -> 307 /retroverse-2/song/RVTR417678
/sunday-nights     -> 307 /retroverse-2/song/RVTR417678
/retroverse-2/live -> 307 /retroverse-2/song/RVTR417678
```

---

## Priority 4 — Audit Screenshots

| File | Description |
|------|-------------|
| `reports/live-channel-audit/01-home-redirect-mobile.png` | `/` after channel start → Song Experience (390px) |
| `reports/live-channel-audit/02-song-experience-mobile.png` | Song Experience hero for active RVTR |
| `reports/live-channel-audit/audit-report.json` | Machine-readable route + channel snapshot |

---

## Minimal deploy checklist

- [ ] Push + deploy to Vercel
- [ ] Start Demo channel on production `/ops/live-control`
- [ ] Confirm `node tools/audit-live-channel.mjs https://retroverse.live` passes
- [ ] Open `https://retroverse.live/` on phone → lands on Song Experience, no cream fallback
