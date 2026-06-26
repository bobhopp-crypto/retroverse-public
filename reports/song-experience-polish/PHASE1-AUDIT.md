# Song Experience Polish — Phase 1

## Mobile changes (CSS + hero CTA only)

- Single-column hero: title → artist → year → large cover → **PLAY ON YOUTUBE** → stacked stats
- Hidden on mobile: global search panel, Experience Ready badge, About card (still in Overview tab)
- Larger type: h1, artist, year, stat values, moment cards, tab labels, panel copy
- Cover: up to 22rem wide, centered
- Moments: 1 column (was 2)
- Tabs: horizontal scroll, larger touch targets
- Panel sections: forced 1 column on mobile (3 columns preserved at 620px+)
- Desktop layout unchanged at `@media (min-width: 620px)`

YouTube button uses existing `resolveTrackPlayback()` — canonical linked video when available, otherwise YouTube search. No cover or channel logic touched.

## Screenshots

| | File |
|---|---|
| Before | `reports/song-experience-polish/01-mobile-before.png` |
| After | `reports/song-experience-polish/02-mobile-after.png` |

---

# Live Channel Queue Audit

Run: `npx tsx tools/audit-live-queue.ts`

## Local state (at audit time)

| Metric | Value |
|---|---|
| **Queue size** | 10 |
| **Unique RVTR count** | 10 |
| **Cursor** | 2 |
| **Duration** | 60s per song |
| **Running** | true |

Stored queue RVTRs: RVTR417678, RVTR172670, RVTR998605, RVTR062287, RVTR261615, RVTR140307, RVTR399731, RVTR025701, RVTR067791, RVTR219284

Fresh build (Demo · Year 1971 · Ready Only · Random): same size — **10 unique RVTRs**.

## Repeat frequency

- Queue has **no duplicate RVTRs** within a single build.
- After cursor reaches index 9, advance wraps with modulo → **same 10 songs repeat** in order.
- Repeat frequency = full queue pass every `10 × durationSeconds` (600s = 10 min at 60s rotation) **only while the channel is running and being polled**.

## Why only 5–6 songs appeared overnight

1. **Lazy advance** — `maybeAdvanceLiveChannel()` runs only when something hits `/api/sunday-nights/current` (live page poll every 3s). There is **no background cron**.
2. **No traffic = no advances** — If nobody had a live page open overnight, rotation stops entirely.
3. **Small candidate pool** — Year 1971 + Ready Only yields ~**10** songs, not hundreds.
4. **Channel stopped** — Production had `channel.running: false` during prior audit; no rotation until Start Live on `/ops/live-control`.
5. **Partial session** — A short visit with ~5–6 poll-driven advances before tab close matches “only 5–6 songs overnight” without implying a larger queue.

## Overnight math

| Scenario | 8 hours |
|---|---|
| Steady 3s polling, 60s rotation, queue=10 | ~480 advances → each of 10 songs ~48× |
| Zero polling | 0 advances |
| 30 min active viewing | ~30 songs shown (3 full passes of 10) |
