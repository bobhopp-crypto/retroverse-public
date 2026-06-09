# Midnight Special — Weekly Sync Readiness

**Date:** 2026-06-09  
**Status:** Ready for scheduled automation (cron / launchd)

---

## Current Baseline

| Metric | Value |
|--------|-------|
| Official playlist | 163 episodes |
| Historical run (NBC/Wikipedia) | 350 episodes |
| Downloaded | 161 |
| Published coverage | 161 / 163 (98.8%) |
| Historical coverage | 161 / 350 (46.0%) |
| Acquisition status | **Caught up with official releases** |
| Private watchlist | `LvmvcjcMqYs`, `ShREvGjboWk` (still private) |

Unreleased historical episodes (189) do **not** block “caught up” status. Only publicly available playlist items count toward published acquisition.

---

## Sync Flow

```
Official YouTube Playlist (PLdQ3g_i8Nrs7wuKdHlnGH6YJfUXgDFBRM)
        ↓
  yt-dlp flat scan (scan-playlist.ts)
        ↓
  Compare vs episode manifests + sync-state.json
        ↓
  Acquisition report (new / removed / private restored)
        ↓
  Update sync-state.json + reports/midnight-special/sync-*.json
```

**CLI (report only):**

```bash
npx tsx tools/media-collections/ms-sync.ts
```

**CLI (detect + download + generate candidates):**

```bash
npx tsx tools/media-collections/ms-sync.ts --sync-and-acquire
```

**CLI (private watchlist only):**

```bash
npx tsx tools/media-collections/ms-sync.ts --retry-private
```

**Ops API:**

```
POST /api/ops/media-collections/midnight-special/sync
{ "mode": "report" | "sync-and-acquire" | "retry-private" }
```

**Ops dashboard:** `/ops/media-collections/midnight-special` — Sync Playlist, Sync + Acquire, Retry Private Videos.

---

## Acquisition Flow (`--sync-and-acquire`)

```
New playlist video ID detected
        ↓
downloadEpisode() — skips if already on disk
        ↓
ensureEpisodePerformances() — skips if manifest exists
        ↓
syncCollectionCounts() + rebuildPerformanceIndex()
        ↓
Performances appear in review queue (/ops/.../review?mode=queue)
```

Idempotent: no duplicate downloads, no duplicate performance generation for episodes already processed.

---

## Private Video Monitoring

Watchlist (checked every sync):

| Video ID | Status |
|----------|--------|
| `LvmvcjcMqYs` | Private |
| `ShREvGjboWk` | Private |

On each sync, `yt-dlp -j` probes availability. When a video becomes public:

1. Logged as `private_restored` event in `sync-state.json`
2. With `--sync-and-acquire` or `--retry-private`: auto-download + candidate generation
3. Coverage metrics update on next count sync

---

## State Files

| Path | Purpose |
|------|---------|
| `RETROVERSE_DATA/media_collections/midnight_special/sync-state.json` | Last sync time, playlist IDs, event log |
| `RETROVERSE_DATA/media_collections/midnight_special/episodes/*.json` | Episode manifests |
| `RETROVERSE_DATA/media_collections/midnight_special/manifest.json` | Collection manifest + last_scan_at |
| `reports/midnight-special/sync-*.json` | Per-run sync reports |

---

## Estimated Weekly Runtime

| Step | Typical duration |
|------|------------------|
| Playlist scan (163 items, flat) | ~20–30 s |
| Private watchlist probe (2 videos) | ~5–10 s |
| Report-only sync | **~30–45 s** |
| New episode download (1 ep, ~150 MB) | ~2–5 min |
| Candidate generation (1 ep, ~40 chapters) | ~10–30 s |

**Steady state (no new releases):** under 1 minute per weekly run.  
**New release week:** ~3–6 minutes including download + parse.

---

## Expected Maintenance Burden

| Task | Frequency |
|------|-----------|
| Weekly `ms-sync.ts` (report) | Automated — zero manual |
| `sync-and-acquire` when new episodes appear | Automated if cron uses acquire flag |
| Review queue triage | Manual — performances need human accept/reject |
| Private video restoration | Automated probe; acquire when public |
| Historical gap backfill (189 eps) | Optional manual project — not part of weekly sync |

**Recommended cron (report + acquire on schedule):**

```bash
# Sunday 06:00 — detect and acquire new official releases
RETROVERSE_OPS=1 npx tsx tools/media-collections/ms-sync.ts --sync-and-acquire
```

For report-only monitoring (no downloads), omit `--sync-and-acquire`.

---

## Success Criteria

When the official Midnight Special channel publishes a new episode:

1. **Detect** — sync compares playlist IDs vs `sync-state.json` ✓
2. **Acquire** — `--sync-and-acquire` downloads without duplicates ✓
3. **Process** — `ensureEpisodePerformances()` generates chapter candidates ✓
4. **Review** — performances land in ops review queue ✓
5. **Status** — dashboard shows published/historical coverage + “Caught up” when current ✓

---

## Verification (2026-06-09)

```bash
npx tsx tools/media-collections/ms-sync.ts
# Published Coverage: 161 / 163 (98.8%)
# Historical Coverage: 161 / 350 (46%)
# Status: Caught up with official releases
# Official playlist: 163 (+0)
# Private watchlist: both still private
```

Second run confirmed `+0` playlist delta and `new_episodes_since_last_sync: 0`.
