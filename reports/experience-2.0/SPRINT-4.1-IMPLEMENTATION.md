# Experience 4.1 — Attract Mode / Auto Tour

Builds on Experience 4.0. Adds a self-running museum tour when nobody interacts, without removing the Living Song.

## Behavior summary

| State | What happens |
|-------|----------------|
| **Attract** | ~10s per song, beats: Hero → Chart → Story → Discover → next song |
| **Interaction** | Tour pauses → full Living Song (4.0) |
| **45s idle** | Tour resumes where the pool left off |
| **Live VDJ** | Tour abandoned → Living Song for on-air track |
| **Live ends** | 8s delay → attract resumes (unless visitor is engaged) |

## Auto tour beats

**File:** `lib/retroverse/experience/attract-timeline.ts`

Per song (8–12s, default 10s):

| Beat | ~Time |
|------|-------|
| Hero | 0s |
| Chart Journey | 22% |
| One story excerpt | 48% |
| Discovery preview (4 cards) | 74% |

No scrolling. Single viewport. Slow crossfade between beats (`attract-tour.css`).

## Playlist pool

**File:** `lib/retroverse/experience/attract-tour-pool.ts`  
**API:** `GET /api/retroverse-2/attract-tour?seed=`

Priority scoring:

1. VDJ play count (backfill queue)
2. Experience Ready (`published` / `review`-eligible)
3. Research complete
4. Cover / story richness (from package status)
5. Full library tail

Up to **2000** entries. Top **400** lightly shuffled per session seed so repeat visits differ.

Session state in `sessionStorage`: seed + pool index (per browser, isolated).

## Interaction pause

**File:** `components/retroverse/experience/AttractTourProvider.tsx`

Pauses on: pointer, touch, scroll, keydown, video play, mode toggle.

## Live mode handoff

Polls `/api/sunday-nights/current` every 2s:

- On-air track → `router.replace` to that song, Living Song mode
- Live ends → 8s grace → attract resumes if not engaged

## UI components

| Component | Role |
|-----------|------|
| `AttractTourProvider` | Session tour state, timers, live override |
| `AttractTourExperience` | Abbreviated beat panels |
| `AttractTourKickoff` | `/retroverse-2/live` redirects into tour when idle |
| `LivingSongShell` | Wraps attract + playback sync |

Song page: hero hidden during attract (screen-reader safe); `LivingSongExperience` hidden until engagement.

## Entry points

- **`/retroverse-2/live`** — kicks off tour → first pool song
- **`/retroverse-2/song/[rvtr]`** — continues tour, advances through pool

## Preserved from 4.0

- Living Song sync (local video + live deck)
- Casual / Music Nerd modes
- Dynamic chapter engine (3.0)
- All chapter components unchanged

## Files added

- `lib/retroverse/experience/attract-tour-pool.ts`
- `lib/retroverse/experience/attract-timeline.ts`
- `app/api/retroverse-2/attract-tour/route.ts`
- `components/retroverse/experience/AttractTourProvider.tsx`
- `components/retroverse/experience/AttractTourExperience.tsx`
- `components/retroverse/experience/AttractTourKickoff.tsx`
- `components/retroverse/experience/attract-tour.css`

## Files changed

- `components/retroverse/experience/LivingSongShell.tsx`
- `components/retroverse/experience/LivingSongExperience.tsx`
- `components/retroverse/experience/RetroverseVideoPlayer.tsx`
- `app/retroverse-2/song/[rvtr]/page.tsx`
- `app/retroverse-2/live/retroverse-live-2-view.tsx`
- `components/retroverse/experience/index.ts`

## Checkpoint

```bash
RETROVERSE_DEV_NO_CLEAN=1 RETROVERSE_OPS=1 npx next dev -H 0.0.0.0 -p 3000
```

1. Open `/retroverse-2/live` with no DJ — should redirect into auto tour on a song page
2. Watch beats cycle ~10s without touching — advances to next song
3. Tap anywhere — full Living Song appears
4. Wait 45s — tour resumes
5. Start live channel with a track — switches to Living Song for that RVTR
