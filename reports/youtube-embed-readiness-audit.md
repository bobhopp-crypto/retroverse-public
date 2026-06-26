# YouTube Embed Readiness Audit

**Date:** 2026-06-23  
**Scope:** 13,064 approved/high-confidence `youtube_video_tracks` links (12,937 distinct YouTube IDs)  
**Method:** `yt-dlp --print playable_in_embed` bulk probe + 300-ID slow retry sample  
**No UI built.**

---

## 1. Embed Allow vs Block (13,054 linked videos)

### Confirmed (bulk probe, before YouTube bot rate-limit)

| Status | Distinct IDs | Link rows | % of links |
|--------|-------------:|----------:|-----------:|
| **Embed allowed** | 1,743 | **1,761** | 13.5% |
| **Embed blocked** | 9 | **9** | 0.07% |
| **Dead / unplayable** | 111 | **115** | 0.9% |

Dead = private, terminated account, TOS removal, geo/copyright block, or generic unavailable.

### Unverified (85.6% of links)

| Status | Distinct IDs | Link rows |
|--------|-------------:|----------:|
| Bot-challenge (rate limited) | 11,070 | **11,179** |

YouTube returned “Sign in to confirm you’re not a bot” after ~1,750 successful metadata fetches in a 20-worker bulk scan. **These are probe failures, not confirmed embed blocks.**

### Slow retry sample (300 random bot-challenged IDs, 1.2s delay)

| Result | Count | % of sample |
|--------|------:|------------:|
| Embed allowed | 185 | 61.7% |
| Embed blocked | 2 | 0.7% |
| Still unverified | 113 | 37.7% |

Among **resolved** samples only: **98.9% allow / 1.1% block**.

### Projected totals (conservative extrapolation)

Apply slow-sample resolution rate (62.3%) and embed/block split (185:2) to the 11,179 unverified link rows:

| Status | Projected link rows | % of 13,054 |
|--------|--------------------:|------------:|
| **Embed allowed** | ~8,650 | ~66% |
| **Embed blocked** | ~83 | ~0.6% |
| **Dead / unplayable** | 115 | 0.9% |
| **Still needs enrichment** | ~4,200 | ~32% |

### Embed success rate (actionable)

| Definition | Rate |
|------------|-----:|
| **Confirmed embed-ready now** | **13.5%** (1,761 / 13,054) |
| **Projected embed-ready** | **~66%** after batch enrichment |
| **Confirmed + projected embed-blocked** | **~0.7%** (~92 rows) |
| **Not embeddable (dead)** | **0.9%** (115 rows) |

**Recommendation:** Store `embed_allowed boolean` on `youtube_videos` via an offline enrichment job (YouTube Data API `videos.list?part=status` or throttled yt-dlp with cookies). Do not probe at runtime.

Confirmed embed-blocked examples: Elton John — Nikita, Disturbed — Prayer, Diana Ross — The Boss, R.E.M. — Supernatural Superserious.

---

## 2. Playback API Field Audit

**Endpoint:** `GET /api/playback/{RVTR}`

### Current response shape

```json
{
  "ok": true,
  "rvtr": "RVTR515161",
  "title": "I Will Not Bow",
  "artist": "breaking benjamin",
  "target": {
    "source": "youtube",
    "url": "https://www.youtube.com/watch?v=7qrRzNidzIc",
    "youtubeId": "7qrRzNidzIc"
  },
  "hasVdjMedia": true
}
```

| Required field | Present? | Notes |
|----------------|----------|-------|
| `youtube_id` | **Partial** | Returned as `target.youtubeId` (camelCase), not top-level snake_case |
| `watch_url` | **Partial** | Returned as `target.url` when `source=youtube`; search URL when fallback |
| `thumbnail_url` | **Missing** | Not returned; exists in DB (`youtube_videos.thumbnail_url`, 100% populated on linked rows) |

### Required API changes (no UI yet)

Extend `PlaybackTarget` / `/api/playback/[rvtr]`:

```typescript
{
  target: {
    source: "youtube",
    youtubeId: "7qrRzNidzIc",
    watchUrl: "https://www.youtube.com/watch?v=7qrRzNidzIc",  // rename/clarify url
    thumbnailUrl: "https://i.ytimg.com/vi/7qrRzNidzIc/hqdefault.jpg",
    embedUrl: "https://www.youtube.com/embed/7qrRzNidzIc",
    embedAllowed: true | false | null  // null until enriched
  }
}
```

Implementation notes:
- Join `youtube_videos.thumbnail_url` in `resolveTrackPlayback` (already joins for `youtube_id`)
- Fallback thumbnail: `lib/youtube/match-rvtr.ts` → `youtubeThumbnailUrl(id)`
- Add `embed_allowed` column to `youtube_videos` (nullable until enrichment pass)
- Keep search fallback behavior unchanged for unlinked RVTRs

---

## 3. Sample Report

### American Pie — Don McLean (`RVTR891825`)

| Field | Value |
|-------|-------|
| YouTube link | **None** (canonical graph gap) |
| API `source` | `search` |
| `youtubeId` | null |
| `watch_url` | YouTube search fallback |
| `thumbnail_url` | not returned |
| Embed | N/A |

Note: `RVTR135333` (American Pie Parts I+II) has link `0I03GR9pwyo` — **confirmed embed-allowed**.

### Long Cool Woman — The Hollies (`RVTR417678`)

| Field | Value |
|-------|-------|
| YouTube link | **None** |
| API `source` | `search` |
| Embed | N/A |

Coverage gap — Hot 100 crawl did not link this canonical track.

### Sweet City Woman — Stampeders (`RVTR062287`)

| Field | Value |
|-------|-------|
| YouTube link | **None** |
| API `source` | `search` |
| `hasVdjMedia` | true (local VDJ file exists) |
| Embed | N/A |

### Joe Cocker — linked tracks

| Track | RVTR | YouTube ID | API source | Confirmed embed |
|-------|------|------------|------------|-----------------|
| Edge Of A Dream | RVTR505378 | tcJ2stZQrJw | youtube | unverified (bot) |
| Put Out The Light | RVTR409064 | 4b04jq7NB1s | youtube | **allowed** |
| She Came In Through The Bathroom Window | RVTR930700 | Z8IvCyw_aTQ | youtube | unverified (bot) |
| Up Where We Belong (w/ Jennifer Warnes) | RVTR471699 | u10VCNKy4qQ | youtube | unverified (bot) |
| You Are So Beautiful | RVTR688736 | — | search | N/A |
| With A Little Help From My Friends | RVTR387694 | — | search | N/A |
| Feelin' Alright | RVTR514818 | — | search | N/A |

Joe Cocker: **4 / 22** canonical tracks have YouTube links in prod. Major hits (Feelin' Alright, With A Little Help, You Are So Beautiful) are still search-only.

---

## 4. Mobile-First UX Recommendation

### Options evaluated

| Option | Mobile fit | Pros | Cons |
|--------|------------|------|------|
| **A. Inline embed** | Poor | Zero extra tap | Eats hero space; 16:9 iframe dominates small screens; autoplay blocked; ~0.7% explicit embed blocks break inline UX |
| **B. Modal player** | **Best** | Thumbnail in hero; tap → focused player; easy fallback to YouTube app; matches collectible poster + play affordance | Needs embed-block fallback button |
| **C. Dedicated video tab** | Good | Clean hero; room for multiple videos / live footage later; aligns with existing **Media** tab | Extra tap; video not immediate |

### Preferred UX: **B + C (Modal primary, Media tab secondary)**

1. **Hero (mobile):** Album art + **video thumbnail overlay** when `source=youtube` (use `thumbnail_url` from API). Tap → **modal iframe player**.
2. **Embed-block fallback:** If `embedAllowed=false`, modal shows “Watch on YouTube ↗” instead of broken iframe.
3. **Media tab:** Persistent “Official Video” section with same player or link list — future home for alternates, live clips, Midnight Special, etc.
4. **Keep** existing “Play on YouTube” external CTA as tertiary escape hatch.

**Do not** inline embed in the hero on mobile. Retroverse hero is cover-forward and editorial; a 16:9 iframe fights the poster composition.

---

## Deliverables Summary

| Deliverable | Result |
|-------------|--------|
| **Embed success rate (confirmed)** | **13.5%** embed-ready with certainty |
| **Embed success rate (projected)** | **~66%** after enrichment job |
| **Embed blocked (projected)** | **~0.7%** |
| **Required API changes** | Add `thumbnailUrl`, `embedUrl`, `embedAllowed`; clarify `watchUrl` / `youtubeId` naming |
| **Preferred UX** | **Modal player** on thumbnail tap; **Media tab** for durable video section |

---

## Next step (Phase 2 prep, not in scope)

1. Add `embed_allowed` column + batch enrichment script (throttled, with cookies/API key)
2. Extend `resolveTrackPlayback` + `/api/playback/[rvtr]` with thumbnail/embed fields
3. Build modal player component (no inline hero embed on mobile)
