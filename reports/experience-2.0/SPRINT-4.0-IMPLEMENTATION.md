# Experience 4.0 — The Living Song

Transform the song page from a static exhibit into a presentation engine synchronized with playback.

## Core concept

The song page is no longer a scrollable article. It is a **documentary that unfolds in time**:

- Hero is always visible at 0s
- Chapters reveal as playback advances
- Live DJ sync when VirtualDJ reports the same track
- Local video sync when patron presses play
- Browse mode (no sync) shows all casual chapters immediately

## Timeline engine

**File:** `lib/retroverse/experience/timeline-engine.ts`

Each chapter receives `revealAtSec` based on estimated song duration:

| Phase | Typical reveal |
|-------|----------------|
| Chart Journey | ~5s |
| Story chapters | 15s–72% of duration (spread evenly) |
| Timeline | ~78% |
| Discovery shelves | 80%–95% |
| Continue Exploring (sources) | ~96% |

Duration estimate: control `facts.length` → fallback 180–360s based on story count.

Presentation order is **documentary order** (not 3.0 score order):

Chart → Recording → Story → Video/TV → Cultural → Legacy → Timeline → Discovery → Sources

## Live synchronization

**File:** `components/retroverse/experience/PlaybackSyncProvider.tsx`

Two sync sources (local wins over live):

1. **Local** — `RetroverseVideoPlayer` reports `timeupdate` / `seeked` when `syncPlayback`
2. **Live** — polls `/api/sunday-nights/current` every 1.5s; when `currentTrackId` matches page RVTR, estimates position from bridge timestamp

Behavior:

- Synced: chapters fade in at scheduled times; seeks/jumps update immediately
- Not synced: browse mode — all casual chapters visible
- Track change via `LiveChannelFollower`: navigates to new song, experience rebuilds server-side

## Audience modes

Toggle on page: **Casual** ↔ **Music Nerd** (persisted in localStorage)

| Mode | Behavior |
|------|----------|
| Casual | Larger type, first-sentence story excerpts, no context paragraphs, hides timeline + sources + dense recording intel |
| Nerd | Full story text, context, timeline, sources / Continue Exploring |

Same data. Different presentation.

## Living presentation UI

**Files:**

- `LivingSongShell.tsx` — playback sync provider wrapper
- `LivingSongExperience.tsx` — chapter reveal orchestration
- `living-song.css` — fade/slide reveals, soft glow while playing, reduced-motion safe

Animations: opacity + translateY only. Museum quality, not social.

## Dynamic story engine (inherited from 3.0)

`buildPatronSongExperience()` combines:

- 3.0 chapter ranking + clustering
- 4.0 living timeline plan

Each song still assembles unique chapters from package content.

## Discovery 2.0 additions

New reason: **Released the same month** (first chart date YYYY-MM match)

Existing reasons retained: chart competition, story mention, same label, connected artist, etc.

## Pipeline / self-healing

Experience cache v2 now stores:

- `durationSec`
- `livingSchedule[]` with reveal times

Refreshed automatically after Ollama / card build / publish (from 3.0 hooks).

## Page wiring

**File:** `app/retroverse-2/song/[rvtr]/page.tsx`

```
Rv2PublicShell
└── LivingSongShell
    ├── Hero (title, artist, year, video w/ syncPlayback)
    └── LivingSongExperience
```

`ExperienceFlow` retained for non-living surfaces; song page uses living flow.

## Not in this sprint (long-term)

- Chart journey playback marker animation
- Week hover context (Billboard snapshot, news, TV)
- Bridge `elapsedMs` in live API (currently estimated from timestamp)
- YouTube embed time sync

## Files added

- `lib/retroverse/experience/timeline-engine.ts`
- `components/retroverse/experience/PlaybackSyncProvider.tsx`
- `components/retroverse/experience/LivingSongShell.tsx`
- `components/retroverse/experience/LivingSongExperience.tsx`
- `components/retroverse/experience/living-song.css`

## Files changed

- `lib/retroverse/experience/build-song-experience.ts`
- `lib/retroverse/experience/experience-types.ts`
- `lib/retroverse/experience/discover-shelves.ts`
- `lib/retroverse/experience/refresh-song-experience.ts`
- `lib/retroverse/experience/experience-cache.ts`
- `components/retroverse/experience/RetroverseVideoPlayer.tsx`
- `components/retroverse/experience/SongStory.tsx`
- `components/retroverse/experience/BehindTheStory.tsx`
- `app/retroverse-2/song/[rvtr]/page.tsx`

## Checkpoint

```bash
RETROVERSE_DEV_NO_CLEAN=1 RETROVERSE_OPS=1 npx next dev -H 0.0.0.0 -p 3000
```

1. Open a song page — only hero + toolbar visible initially (sync mode after play)
2. Press play on video — chapters fade in over time
3. Toggle Music Nerd Mode — timeline + sources appear
4. With live channel running + same track on deck — badge shows "Live with the DJ"
