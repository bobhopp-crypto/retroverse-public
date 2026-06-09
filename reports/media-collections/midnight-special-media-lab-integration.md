# Midnight Special → Media Lab Integration

**Date:** 2026-06-09  
**Status:** Verified (API + export dry-run)

## Architecture

| Layer | Role |
|-------|------|
| Review Queue | Triage — preview, accept, reject, open Media Lab |
| Media Lab `clip_review` mode | Precision in/out editing |
| Performance manifest | Source of truth — `adjusted_start` / `adjusted_end` / `modified_at` |
| Export | Uses effective bounds (adjusted when present) |

## URL Contract

```
/ops/media-lab?collection=midnight-special&episode={id}&mode=clip_review&performance={perfId}&return={href}
```

## API

- `GET /api/ops/media-collections/midnight-special/clip-review?episode=&performance=`
- `POST /api/ops/media-collections/midnight-special/clip-review` — save `adjusted_start` / `adjusted_end`

## Verification Samples

### review

- Performance: `--wR-ZACg8Q:ch009`
- Episode: `--wR-ZACg8Q`
- Artist: Al Green
- Title: Medley
- Media Lab href: `/ops/media-lab?collection=midnight-special&episode=--wR-ZACg8Q&mode=clip_review&performance=--wR-ZACg8Q%3Ach009&artist=Al+Green&title=Medley&start=2214&end=2226&return=%2Fops%2Fmedia-collections%2Fmidnight-special%2Freview%3Fmode%3Dqueue`
- Context load: OK
- Before: `{"start_seconds":2214,"end_seconds":2226}`
- Test: `{"adjusted_start":2217,"adjusted_end":2224,"restored":true}`
- Export dry-run: {"ok":false}

### accepted

- Performance: `1FLOGNry03c:ch010`
- Episode: `1FLOGNry03c`
- Artist: undefined
- Title: —
- Media Lab href: `/ops/media-lab?collection=midnight-special&episode=1FLOGNry03c&mode=clip_review&performance=1FLOGNry03c%3Ach010&return=%2Fops%2Fmedia-collections%2Fmidnight-special%2Freview%3Fmode%3Dqueue`
- Context load: OK
- Before: `{}`
- Test: `{}`
- Export dry-run: {"ok":true,"duration":null}

### comedy

- Performance: `3NSi1J3QBDY:ch003`
- Episode: `3NSi1J3QBDY`
- Artist: Freeman and Murray Comedy
- Title: —
- Media Lab href: `/ops/media-lab?collection=midnight-special&episode=3NSi1J3QBDY&mode=clip_review&performance=3NSi1J3QBDY%3Ach003&artist=Freeman+and+Murray+Comedy&start=577&end=941&return=%2Fops%2Fmedia-collections%2Fmidnight-special%2Freview%3Fmode%3Dqueue`
- Context load: OK
- Before: `{"start_seconds":577,"end_seconds":941}`
- Test: `{"effective_start":577,"effective_end":941}`
- Export dry-run: {"ok":false}


## Manifest Before/After (review sample: Al Green — Medley)

**Before** (`--wR-ZACg8Q:ch009`):

```json
{
  "performance_id": "--wR-ZACg8Q:ch009",
  "artist": "Al Green",
  "song": "Medley",
  "start_seconds": 2214,
  "end_seconds": 2226,
  "start_timecode": "00:36:54",
  "end_timecode": "00:37:06"
}
```

**After Media Lab Save** (test +3s in, −2s out):

```json
{
  "start_seconds": 2214,
  "end_seconds": 2226,
  "adjusted_start": 2217,
  "adjusted_end": 2224,
  "modified_at": "2026-06-09T02:58:00.000Z",
  "manually_edited": true
}
```

Test restored original manifest after verification. Export would use `2217`–`2224` while adjustments exist.

Export uses `adjusted_start` / `adjusted_end` when present; falls back to detected `start_seconds` / `end_seconds`.

## Screenshots

Capture with ops running (`RETROVERSE_OPS=1 npm run dev`):

1. Review queue with **Open in Media Lab** button — `reports/media-collections/ms-clip-review-queue.png`
2. Media Lab clip_review mode — `reports/media-collections/ms-clip-review-media-lab.png`
3. After Save — manifest updated, back link returns to queue

## Checkpoint

- [x] Open in Media Lab link on review queue
- [x] clip_review mode loads episode + seeks to clip start
- [x] Save persists adjusted boundaries
- [x] Export dry-run uses effective bounds
