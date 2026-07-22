# Broadcast Mixer Architecture Audit

**Sprint:** Broadcast Mixer Architecture Audit  
**Date:** 2026-07-21  
**Scope:** Discovery only — no redesign, no refactor, no behavior changes.

## Question answered

**What currently determines what retroverse.live displays?**

Not what should. What actually does today.

---

## Executive answers (Definition of Done)

| Question | Answer |
|---|---|
| What currently owns the public presentation? | **Dual authority.** Homepage (`/`) is owned by **Channel Zero + Sunday Nights**, with **Presentation Playhead** only when `manualTakeActive`. Pass pages are owned by **Playhead → CurrentBroadcast/Rvba**. |
| How many systems can change it? | **≥13** writers/influencers (see Playhead Producers). |
| Which components are legacy? | See §6. |
| Which are duplicated? | See §7. |
| What should become SSoT next sprint? | **`buildPlayheadPayload()` → `CurrentBroadcast` + `Rvba`**, backed by **Broadcast Snapshot**, with homepage converging onto that contract (Channel Zero becomes an input or retired as a parallel public resolver). |

---

## Critical finding: two public render paths

```
                    ┌─────────────────────────────────────┐
                    │     What the public can see         │
                    └─────────────────────────────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
        retroverse.live /                          Pass pages
        (canonical homepage)                       /pass/*, /pass-resolved/*
                 │                                         │
                 ▼                                         ▼
   loadPublicCurrentSongPayload()              buildPlayheadPayload()
                 │                                         │
                 ▼                                         ▼
   Channel Zero experience                     PlayheadPayload
   + optional manualOverride                   → CurrentBroadcast + Rvba
                 │                                         │
                 ▼                                         ▼
   RetroverseLive2View                         BroadcastViewer
   · song hero (default)                       → PresentationStage
   · PresentationStage only when
     manualTakeActive === true
```

**Implication:** In AUTO mode (VDJ follow, no manual take), the homepage shows a **song experience** (cover/track via Channel Zero). The Playhead API simultaneously may report a **VDJ presentation item** (`itemIndex: -1`). Those are not the same render path.

`/retroverse-live` redirects to `/`. `RetroverseLivePlayer` exists but is **not imported**.

---

## 1. Playhead Producers

Systems that can become the active presentation source, change the current item, advance/interrupt/resume the playhead, or publish presentation state.

### 1.1 Presentation Store / Playhead Engine

| Field | Value |
|---|---|
| **Name** | Presentation Store (`lib/bobos/presentation/store.ts`) |
| **Purpose** | Authoritative local engine for presentations, published queues, playhead anchors, and public snapshot sync |
| **Status** | **Active** |
| **Inputs** | Publish/draft mutations; `PlayheadCommand`; active presentation id |
| **Outputs** | `PresentationState`, `BroadcastSnapshot`, `PlayheadPayload` |
| **Source of truth** | Local: `ops/bobos/presentation/{presentations,state,broadcast}.json`. Deployed: Postgres key `retroverse-live-broadcast` for snapshot |
| **Can take ownership?** | Yes — `publishPresentation`, `movePlayhead` |
| **Can release ownership?** | Indirectly via AUTO flags (`setAutoFollowVdj`) and VDJ idle resume — not a dedicated “release” API |
| **Files** | `lib/bobos/presentation/store.ts`, `types.ts`, `resolve-playhead.ts` |
| **APIs** | Consumed by Studio server actions; public GET `/api/retroverse-live/playhead` |
| **State files** | `presentations.json`, `state.json`, `broadcast.json` |
| **Dependencies** | `broadcast-snapshot`, `push-public`, `vdj-takeover`, `resolve-playhead`, Sunday Nights |

**Key behaviors:**
- Playhead is an **anchor** (`anchorItemId` + `anchorStartedAt`), not a cursor.
- Auto-advance is **lazy on read** via `resolvePlayhead()` — no background timer for queue rotation.
- Operator `next`/`previous`/`jump` with `movedBy: manual|cockpit` sets `manualTakeActive = true`.

### 1.2 Broadcast Snapshot + Public Push

| Field | Value |
|---|---|
| **Name** | Broadcast Snapshot / Push Public |
| **Purpose** | Sync published queue + playhead from Studio → deployed site |
| **Status** | **Active** |
| **Inputs** | `syncBroadcast()` after mutations; authenticated POST body |
| **Outputs** | Postgres/JSON snapshot on public host |
| **Source of truth** | On deployed site: snapshot is what `buildPlayheadPayload` prefers when present |
| **Can take ownership?** | Yes on public — ingest overwrites snapshot |
| **Can release?** | No — replaced by next push |
| **Files** | `broadcast-snapshot.ts`, `push-public.ts` |
| **APIs** | POST `/api/retroverse-live/broadcast` |
| **State** | Local JSON / Postgres `retroverse-live-broadcast` |

### 1.3 VirtualDJ Live Bridge

| Field | Value |
|---|---|
| **Name** | Live Bridge (`tools/live-bridge`) |
| **Purpose** | OSC poll of VirtualDJ → POST bridge payload |
| **Status** | **Active** (external process) |
| **Inputs** | VDJ OSC (deck, artist, title, filepath, playing) |
| **Outputs** | POST `/api/sunday-nights/bridge` |
| **Source of truth** | VirtualDJ runtime; Retroverse stores resolved selection |
| **Can take ownership?** | Yes — writes Sunday Nights live track; triggers VDJ takeover handlers locally |
| **Can release?** | Yes — `playing: false` starts idle/stop path |
| **Files** | `tools/live-bridge/*`, `lib/sunday-nights/apply-bridge-update.ts` |
| **APIs** | POST `/api/sunday-nights/bridge` |
| **State** | Sunday Nights state (+ diagnostics `live/bridge-public-push.json`) |

**Production quirk:** On Vercel/Postgres, bridge stop clears `vdjTakeoverActive` immediately and **skips** `handleVdjPlaybackStarted` (comment: mixer takeover is local operator infrastructure). Local path runs full takeover/pause/resume.

### 1.4 VDJ Takeover Controller

| Field | Value |
|---|---|
| **Name** | VDJ Takeover (`lib/bobos/presentation/vdj-takeover.ts`) |
| **Purpose** | AUTO follow: pause broadcast rotation when VDJ plays; override presented item to live track; resume after 15s idle |
| **Status** | **Active** |
| **Inputs** | Bridge start/stop; `autoFollowVdj`; `manualTakeActive` |
| **Outputs** | Mutates Sunday Nights + PresentationState + snapshot playhead mode; overlays VDJ item in payload |
| **Source of truth** | Flags split across Sunday Nights + PresentationState + Snapshot |
| **Can take ownership?** | Yes — when AUTO and playing/takeover |
| **Can release?** | Yes — idle resume (`VDJ_IDLE_RESUME_MS = 15000`) or Return to Auto / disable follow |
| **Who calls it** | `applyBridgeLiveUpdate`, `setAutoFollowVdj`, `buildPlayheadPayload` (lazy resume) |
| **What next** | Snapshot push; payload overlay via `applyVdjPresentationItem` |

### 1.5 Broadcast Mixer

| Field | Value |
|---|---|
| **Name** | Broadcast Mixer |
| **Purpose** | Operator deck/playlist UI that feeds the Presentation engine |
| **Status** | **Active** |
| **Inputs** | Deck playlists, assets, sequences, transport |
| **Outputs** | Via `playDeck` / `republishIfLive` → `saveDraft` + `publishPresentation` + `movePlayhead` |
| **Source of truth** | Mixer state for decks; Presentation engine for air |
| **Can take ownership?** | Yes — `playDeck` hard-cutovers Website output |
| **Can release?** | Yes — pause, unassign output, `maybeAutoReturnDeckToLive` → `returnBroadcastToLive` |
| **Files** | `apps/studio/app/bobos/broadcast/actions.ts`, `lib/bobos/mixer/*`, `BroadcastMixerView.tsx` |
| **State** | `ops/bobos/mixer/state.json` |
| **Dependencies** | Playback adapter → Presentation Queue |

### 1.6 Presentation Studio

| Field | Value |
|---|---|
| **Name** | Presentation Studio |
| **Purpose** | Edit/publish presentation queues; transport |
| **Status** | **Active** (parallel control surface) |
| **Inputs** | Draft queue edits, publish, playhead commands |
| **Outputs** | Same Presentation Store as Mixer |
| **Can take ownership?** | Yes — `publishPresentation` / `movePlayhead` (`movedBy: "manual"`) |
| **Files** | `apps/studio/app/bobos/presentation/*`, `PresentationStudio.tsx` |

### 1.7 Manual Override / AUTO Mode Flags

| Field | Value |
|---|---|
| **Name** | AUTO / Manual Take |
| **Purpose** | Decide whether VDJ or queue item wins |
| **Status** | **Active** |
| **Rules** | AUTO = `autoFollowVdj && !manualTakeActive`. Manual take set by operator jump/next/prev. Cleared by Return to Auto (`setAutoFollowVdj(true)`) |
| **Homepage effect** | `manualOverride` only when `manualTakeActive` (see `resolvePublicHomepageManualOverride`) |
| **Playhead effect** | `applyVdjPresentationItem` when AUTO and VDJ playing/takeover |

### 1.8 Broadcast Source (database.xml queue builder)

| Field | Value |
|---|---|
| **Name** | Broadcast Source |
| **Purpose** | Rebuild on-air queue from VirtualDJ `database.xml` |
| **Status** | **Active** |
| **Inputs** | VDJ DB XML filters (video, PlayCount ≥ 5, etc.) |
| **Outputs** | New presentation queue + re-anchored playhead + sync |
| **Files** | `lib/broadcast-source/*`, `refreshBroadcastFromDatabaseXml` in broadcast actions |

### 1.9 Sequence Queueing

| Field | Value |
|---|---|
| **Name** | `queueSequence` |
| **Purpose** | Put an imported Broadcast Collection sequence on air without decks |
| **Status** | **Active** |
| **Outputs** | Publish + `manualTakeActive = true` + re-anchor playhead |
| **Files** | broadcast `actions.ts`, importer collections |

### 1.10 Channel Zero Resolver

| Field | Value |
|---|---|
| **Name** | Channel Zero |
| **Purpose** | Resolve **one** public Song Experience for homepage |
| **Status** | **Active** (homepage authority) |
| **Priority** | Takeover → Live Signal → Scheduled (Top 10 Songs 1969) |
| **Inputs** | Sunday Nights state + wall clock |
| **Outputs** | `ChannelZeroExperience` (RVTR) → track page / hero |
| **Can take ownership?** | Yes for homepage default view |
| **Can release?** | Implicit when higher priority appears; overridden by `manualOverride` |
| **Files** | `lib/channel-zero/resolve-channel-experience.ts`, `resolve-scheduled-item.ts` |
| **Note** | `resolveDefaultBroadcast` / `DEFAULT_BROADCAST_RVTR` exist but are **not used** by `resolveChannelExperience` today |

### 1.11 Live Control Engine

| Field | Value |
|---|---|
| **Name** | Live Control (`lib/live-control/engine.ts`) |
| **Purpose** | Demo/playlist channel that publishes RVTRs into Sunday Nights via `setLiveTrack` |
| **Status** | **Active but opt-in** — `tickLiveControl` idles stale sessions; advances only when gate session active |
| **Inputs** | Ops Live Control UI / API |
| **Outputs** | Sunday Nights live track (`source: "channel"`) |
| **Can take ownership?** | Yes — writes same state Channel Zero reads |
| **Can release?** | `stopLiveChannel`, idle cleanup |
| **Files** | `lib/live-control/*`, `apps/studio/app/api/ops/live-control/route.ts` |
| **State** | `ops/live-control/state.json` or Postgres `live-control` |
| **Who ticks it** | Runtime status, homepage loaders, public live entry, Live Control API — **not** `loadPublicCurrentSongPayload` itself |

### 1.12 Lazy Timers / Polling (no central scheduler for playhead)

| Mechanism | Interval / rule | Effect |
|---|---|---|
| `resolvePlayhead` on every read | Wall-clock vs durations | Advances queue item without a job |
| `maybeResumeBroadcastAfterVdjIdle` | 15s after VDJ stop | Resumes snapshot playhead to playing |
| Homepage poll | 2s / 3s / 7s | Refetches `/api/sunday-nights/current` |
| BroadcastViewer poll | 2s | Refetches playhead (Pass) |
| Mixer `maybeAutoReturnDeckToLive` | Client poll in Mixer UI | Returns to AUTO after last playlist item |
| Live Bridge OSC poll | configurable `pollMs` | Publishes VDJ state |
| VdjAutoFollower | 1.5s | Polls playhead; **redirect is currently a no-op** on `/` |

### 1.13 Patron Client Navigation

| Field | Value |
|---|---|
| **Name** | Patron navigation (`lib/broadcast/patron-navigation.ts`) |
| **Purpose** | Prev/Next/Home over manualOverride queue **in the browser** |
| **Status** | **Active** (client-only) |
| **Can change server playhead?** | **No** — local index only; does not call `movePlayhead` |
| **Affects public?** | Only for that patron’s session while presentation overlay is visible |

### 1.14 Ops Sunday Nights Manual Track Set

| Field | Value |
|---|---|
| **Name** | Ops Sunday Nights PATCH |
| **Purpose** | Operator-set live track / event mode (Studio ops API) |
| **Status** | **Active** |
| **Inputs** | PATCH body (`setLive`, `setEventMode`, aliases, etc.) |
| **Outputs** | `setLiveTrack` → Sunday Nights state; optional event-mode flag |
| **Can take ownership?** | Yes — writes same SN state Channel Zero reads |
| **Files** | `apps/studio/app/api/ops/sunday-nights/route.ts` |
| **State** | Sunday Nights state; event mode via `lib/sunday-nights/event-mode` (Postgres `"eventMode"` on Vercel) |

**Homepage gate note:** `resolvePublicHomepageManualOverride` requires `manualTakeActive` **and** `itemIndex >= 0`. AUTO VDJ playhead items (`itemIndex === -1` from `applyVdjPresentationItem`) do **not** attach `manualOverride` — homepage stays on Channel Zero song hero.

---

## 2. Presentation Sources

What can appear as the “current thing” on screen:

| Source | How it becomes visible | Surface |
|---|---|---|
| Channel Zero takeover / live signal | Sunday Nights + freshness | Homepage song hero |
| Channel Zero scheduled Top10 1969 | Time-slot derived | Homepage song hero |
| Live Control channel track | `setLiveTrack(source: channel)` | Homepage (via Channel Zero / live overlay) |
| Presentation queue item | Published snapshot + resolvePlayhead | Playhead API; homepage only if `manualTakeActive` |
| VDJ live presentation item | `applyVdjPresentationItem` | Playhead API / Pass BroadcastViewer; **not** homepage PresentationStage |
| Mixer deck playlist | Adapted to PresentationQueue then published | Same as queue item |
| Imported Broadcast Collection slides | RVBA media via importer | Queue / Mixer |
| Broadcast Source XML songs | Queue rebuild | Queue item |
| Seed default broadcast | One-time seed | Queue item |
| Off-air / blank | No published presentation / no item | Playhead off-air; homepage falls to scheduled |

---

## 3. State Inventory

| State object | Location | Writers | Readers | Still required? |
|---|---|---|---|---|
| Presentations file | `ops/bobos/presentation/presentations.json` | Presentation Studio, Mixer actions, broadcast source | Store | Yes (Studio) |
| Presentation state | `ops/bobos/presentation/state.json` | Store, VDJ takeover, queueSequence, source refresh | Store, takeover | Yes |
| Broadcast snapshot | `ops/bobos/presentation/broadcast.json` **or** Postgres `retroverse-live-broadcast` | `syncBroadcast`, takeover pause/resume, ingest POST | `buildPlayheadPayload` (preferred) | Yes (public sync unit) |
| Mixer state | `ops/bobos/mixer/state.json` | Mixer actions | Mixer UI / republish | Yes (operator) — not read by public |
| Broadcast collections | `ops/bobos/broadcast-collections/` | Importer | Mixer / queueSequence | Yes for assets |
| Sunday Nights state | `ops/sunday-nights/state.json` **or** Postgres `live` | Bridge, Live Control, takeover | Channel Zero, playhead VDJ, homepage | Yes |
| Live Control state | `ops/live-control/state.json` **or** Postgres `live-control` | Live Control engine | Engine, monitors | Yes if demo channel used |
| Sunday event mode | event-mode module / Postgres `"eventMode"` | Ops Sunday Nights PATCH | Ops / SN loaders | Ops feature |
| Broadcast media (remote) | Postgres `broadcast-media:…` keys | Media push from Studio | Public media route | Yes when slides on public |
| Bridge push diagnostics | `RETROVERSE_DATA/live/bridge-public-push.json` | `pushBridgeLiveUpdateToPublic` | Diagnostics | Optional |
| In-memory caches | Public sync TTL, public live monitor TTL | Studio actions / runtime | Same | Ephemeral |
| React state | Homepage payload, Mixer UI, BroadcastViewer | Clients | Clients | Ephemeral UI |
| `PlayheadPayload` | Derived, not persisted | `buildPlayheadPayload` | APIs, Pass, Studio | Derived contract |
| `CurrentBroadcast` + `Rvba` | Derived from payload | `deriveCurrentBroadcast` / normalize | PresentationStage | Derived contract |
| `manualOverride` | Derived on homepage load | `resolvePublicHomepageManualOverride` | RetroverseLive2View | Derived bridge |

---

## 4. API Inventory

### Public read (audience)

| Route | What it returns | Used by |
|---|---|---|
| `GET /api/sunday-nights/current` | `PublicHomepagePayload` (Channel Zero + optional manualOverride) | Homepage, attract mode |
| `GET /api/live-now-playing` | Same public current song payload | Legacy alias consumers |
| `GET /api/retroverse-live/playhead` | `PlayheadPayload` (+ CurrentBroadcast/Rvba) | Pass BroadcastViewer, Studio checks, VdjAutoFollower |
| `GET /api/retroverse-live/now-playing-package` | Package helper for stage | PresentationStage fallback path |
| `GET /api/retroverse-live/broadcast-media/...` | Media for public slides | Deployed media serve |

### Public write (authenticated ingest)

| Route | Body | Effect |
|---|---|---|
| `POST /api/sunday-nights/bridge` | Bridge live body | Updates Sunday Nights; local takeover side-effects |
| `POST /api/retroverse-live/broadcast` | BroadcastSnapshot | Saves public snapshot |

### Studio / ops (localhost)

| Surface | Effect |
|---|---|
| `/bobos/broadcast` actions | Mixer + transport + AUTO + source refresh + sequences |
| `/bobos/presentation` actions | Draft/publish/playhead |
| `/api/ops/live-control` | Start/stop/tick channel |
| `/api/ops/sunday-nights` PATCH | Manual live track / event mode → Sunday Nights |
| Cockpit BroadcastPanel | Status-only (reads `getBroadcastStatus`) |

---

## 5. Authority Diagrams

### Path A — Homepage (canonical public)

```
VirtualDJ
   │ OSC
   ▼
Live Bridge ──POST──► sunday-nights/bridge
   │
   ▼
Sunday Nights State  ◄──── Live Control Engine (optional)
   │
   ▼
Channel Zero Resolver
   │
   ├── takeover / live-signal / scheduled RVTR
   │
   ▼
loadPublicCurrentSongPayload
   │
   ├── always: Channel Zero song experience
   └── if manualTakeActive: attach manualOverride from Playhead
   │
   ▼
GET /api/sunday-nights/current  (polled)
   │
   ▼
RetroverseLive2View
   ├── default: song hero
   └── manualOverride: PresentationStage (CurrentBroadcast/Rvba)
```

### Path B — Playhead / Pass / Studio preview

```
Presentation drafts ──publish──► published queue
                                      │
Mixer / Studio / Source / Sequence ───┤
                                      ▼
                         Presentation State.playhead
                                      │
                         syncBroadcast()
                                      ▼
                         Broadcast Snapshot ──POST──► public broadcast ingest
                                      │
                         + Sunday Nights (VDJ flags)
                                      │
                                      ▼
                         buildPlayheadPayload()
                              │
                              ├─ maybeResumeBroadcastAfterVdjIdle
                              ├─ resolvePlayhead(queue, anchor)
                              └─ applyVdjPresentationItem (AUTO)
                                      │
                                      ▼
                         deriveCurrentBroadcast → CurrentBroadcast + Rvba
                                      │
                                      ▼
                         GET /api/retroverse-live/playhead
                                      │
                                      ▼
                         BroadcastViewer → PresentationStage
                         (Pass pages; Mixer Audience Preview)
```

### Path C — VDJ interrupt of broadcast rotation (local Studio)

```
Bridge playing=true
   → handleVdjPlaybackStarted
   → set vdjTakeoverActive
   → pauseBroadcastRotation (snapshot playhead mode=paused)
   → push snapshot

Bridge playing=false
   → handleVdjPlaybackStopped (record stoppedAt)

Next playhead read after 15s idle
   → maybeResumeBroadcastAfterVdjIdle
   → clear takeover
   → resumeBroadcastRotation (mode=playing)
```

### Controller-to-controller relationships

```
Live Bridge ──► applyBridgeLiveUpdate ──► Sunday Nights State
                      │
                      └──► VDJ Takeover ──► Presentation State
                                      └──► Broadcast Snapshot ──► Push Public

Broadcast Mixer ──► playback-adapter ──► Presentation Store
Presentation Studio ───────────────────► Presentation Store
Broadcast Source ──────────────────────► Presentation Store
queueSequence ─────────────────────────► Presentation Store

Presentation Store ──syncBroadcast──► Snapshot ──► Public Ingest

Live Control Engine ──setLiveTrack──► Sunday Nights State
Channel Zero ◄──reads── Sunday Nights State
Homepage ◄── Channel Zero + (Playhead if manualTake)

buildPlayheadPayload ◄── Snapshot (preferred) or Presentation State
                  ◄── Sunday Nights (VDJ overlay)
```

---

## 6. Legacy / Vestigial Components

| Component | Status | Notes |
|---|---|---|
| `/retroverse-live` page | Legacy alias | Redirects to `/` |
| `/live`, `/sunday-nights` pages | Legacy aliases | Redirect via `getPublicLiveRedirectUrl` → `/` |
| `RetroverseLivePlayer` | Unused | File exists; nothing imports it |
| `VdjAutoFollower` | Vestigial navigation | Only enabled on `/`; `CANONICAL_AUDIENCE_HREF` is `/` → never navigates |
| `BroadcastViewer` comment | Stale docs | Comments claim it drives homepage; homepage uses `RetroverseLive2View` |
| `resolveDefaultBroadcast` | Unused in resolve path | Exported but `resolveChannelExperience` never calls it |
| Presentation triggers ≠ `automatic` | Stored, not executed | `song-change`, `manual-override`, etc. are labels only |
| Dual Studio surfaces | Parallel | Presentation Studio + Broadcast Mixer both drive same engine |
| `item` on PlayheadPayload | Transitional | Docs say prefer `broadcast`/`rvba`; `item` retained |
| Homepage vs Playhead AUTO render | Architectural debt | Two different audience presentations for AUTO |

---

## 7. Duplicate Responsibilities

### Objects representing “current item”

1. `PresentationState.playhead.anchorItemId` (+ derived via `resolvePlayhead`)
2. `BroadcastSnapshot.playhead` (copy; can diverge if VDJ pause mutates snapshot without rewriting `state.json` playhead the same way)
3. `PlayheadPayload.item`
4. `CurrentBroadcast` / `Rvba`
5. Mixer `Deck.currentIndex` / playlist entry
6. Sunday Nights `live` / `currentTrackId`
7. Channel Zero `experienceId`
8. Homepage `manualOverride.rvba` (subset of playhead)
9. Patron client `manualIndex` (local)

### Objects representing “queue”

1. Presentation draft `queue`
2. Presentation `published.queue`
3. Snapshot `queue`
4. Mixer deck `playlist`
5. Live Control `queueRvtrs`
6. Channel Zero scheduled program (compile-time RVTR list)

### Objects representing AUTO / override / takeover

1. `PresentationState.autoFollowVdj`
2. `PresentationState.manualTakeActive`
3. `PresentationState.vdjTakeoverActive` / `vdjStoppedAt`
4. Snapshot copies of `autoFollowVdj` / `manualTakeActive`
5. Sunday Nights `vdjTakeoverActive` / `bridgePlaying` / `vdjStoppedAt` / `bridgeStoppedAt`
6. Derived `PlayheadPayload.vdj.*`
7. Derived `CurrentBroadcast.mode` (`auto` \| `manual`)

### Objects representing timers

1. Playhead anchor + durations (lazy advance)
2. `VDJ_IDLE_RESUME_MS` (15s)
3. Live Control `nextAdvanceAt`
4. Channel Zero scheduled slot clock
5. Client poll intervals (homepage / viewer / mixer / bridge)

### Presentation payload duplicates

- `PlayheadPayload` (full)
- `PublicHomepagePayload` (Channel Zero + optional override)
- `SundayNightsCurrentPayload`
- `CurrentBroadcast` + `Rvba` (intended output contract)

---

## 8. Controllers Audit

| Controller | Controls | Authority for presentation? | Can override others? | Callers | Next hop | Required? | Duplicate of? |
|---|---|---|---|---|---|---|---|
| Presentation Store | Queue publish, playhead | Yes | Yes (operator) | Mixer, Studio, source, sequence | Snapshot sync | **Yes** | — |
| VDJ Takeover | Pause/resume + item overlay | Yes (AUTO) | Yes over queue when AUTO; blocked by manual take | Bridge apply, playhead read, setAutoFollow | Snapshot / payload | **Yes** | Overlaps Channel Zero for “what’s live” |
| Broadcast Mixer | Decks → engine | Yes when live deck | Yes (hard cutover) | Operator UI | Presentation Store | **Yes** (ops UX) | Presentation Studio |
| Presentation Studio | Draft/publish/transport | Yes | Yes | Operator UI | Presentation Store | Uncertain long-term | Mixer |
| Live Bridge | VDJ → Sunday Nights | Indirect | Yes (live song) | External process | applyBridgeLiveUpdate | **Yes** | — |
| Channel Zero | Homepage experience pick | Yes (homepage) | Yes over scheduled/default | Homepage loader | Track page / hero | **Yes today** | Overlaps Playhead AUTO |
| Live Control Engine | Demo channel RVTRs | Indirect via SN state | Yes when session active | Ops UI, ticks | Sunday Nights | Optional | Channel Zero scheduled |
| Ops Sunday Nights PATCH | Manual live track / event mode | Indirect via SN state | Yes | Studio ops UI | Sunday Nights / Channel Zero | Ops | Live Control / Bridge |
| Push Public | Studio → deployed | Sync only | Overwrites public snapshot | syncBroadcast / bridge forward | Public APIs | **Yes** | — |
| Resolve Playhead | Derived current slot | Computation | N/A | All readers | Payload | **Yes** | — |
| Patron Navigation | Client browse | Session-local only | No server override | Homepage UI | Local index | UX only | Server playhead |
| VdjAutoFollower | Intended redirect | No (noop) | No | Layout | — | **No** | — |
| BroadcastPanel | Status display | No | No | Cockpit | Links to Mixer | Status only | — |
| Runtime status | Monitoring + tick LC | Indirect | Via Live Control tick | Studio runtime | Monitors | Ops | — |

---

## 8.1 Single Source of Truth Check

### Definitions (this check)

| Role | Meaning |
|---|---|
| **Owns** | Writes authoritative presentation state. Other systems should read from this writer’s store. |
| **Mirrors** | Copies presentation state into a second persistence location or payload for sync/compat. |
| **Transforms** | Derives or reshapes presentation state (adapters, resolvers, overlays) without being the lasting authority. |
| **Observes** | Reads presentation state for UI/status; does not write it (or only writes unrelated local UI state). |

**Presentation state** here means anything that decides what is on air for an audience surface:

- published queue + playhead anchor/mode
- ownership flags (`autoFollowVdj`, `manualTakeActive`, VDJ takeover)
- audience current item / `CurrentBroadcast` / `Rvba`
- homepage current song experience (Channel Zero path)

A component may hold more than one role. **Primary** role is marked first.

### Ideal rule

> Only one component should ultimately **own** presentation.

**Today that rule is broken.** Multiple controllers write overlapping ownership for the same audience question.

### Classification table

| Controller | Owns | Mirrors | Transforms | Observes | Primary role | Notes |
|---|---|---|---|---|---|---|
| **Presentation Store** (`store.ts`) | **Yes** | — | — | — | **Owns** | Authoritative local: presentations, `state.json` playhead, publish, `movePlayhead` |
| **Broadcast Snapshot** (`broadcast-snapshot.ts`) | **Yes (public read prefer)** | **Yes** | — | — | **Owns + Mirrors** | Intended mirror of published+playhead; on deployed site it is the preferred owner for playhead reads |
| **Push Public** (`push-public.ts`) | — | **Yes** | URL rewrite for media | — | **Mirrors** | Forwards snapshot/bridge to production; does not decide content |
| **resolvePlayhead** | — | — | **Yes** | — | **Transforms** | Pure: anchor → current queue item |
| **normalizePlayhead / deriveCurrentBroadcast** | — | — | **Yes** | — | **Transforms** | Payload → `CurrentBroadcast` + `Rvba` |
| **applyVdjPresentationItem** | — | — | **Yes** | — | **Transforms** | Overlay: replace resolved item with VDJ live item when AUTO |
| **VDJ Takeover** (`vdj-takeover.ts`) | **Yes** | **Yes** | **Yes** | — | **Owns** | Writes SN + presentation flags; mutates snapshot playhead mode; overlays item |
| **Sunday Nights State** | **Yes (live song)** | — | — | — | **Owns** | Authoritative live track / bridge flags — parallel to presentation queue |
| **Live Bridge** (`tools/live-bridge`) | — | — | — | — | **Owns input → SN** | Does not write presentation store; owns VDJ→API publish of live signal |
| **applyBridgeLiveUpdate** | — | — | — | — | **Owns SN write path** | Coordinator: writes SN; may invoke VDJ Takeover (local) |
| **Channel Zero** | — | — | **Yes** | — | **Transforms (acts as homepage owner)** | Read-only resolver, but is the **effective owner** of default homepage presentation |
| **loadPublicCurrentSongPayload** | — | **Yes** | **Yes** | — | **Transforms + Mirrors** | Merges Channel Zero + optional playhead `manualOverride` into homepage payload |
| **Broadcast Mixer** | **Yes (mixer only)** | — | **Yes** | **Yes** | **Transforms → Store** | Owns `mixer/state.json`; presentation ownership only by writing Presentation Store |
| **playback-adapter** | — | — | **Yes** | — | **Transforms** | Deck playlist → `PresentationQueue` |
| **Presentation Studio** | — | — | — | — | **Owns via Store** | No separate store; co-writer of Presentation Store |
| **Broadcast Source (database.xml)** | — | — | **Yes** | — | **Transforms → Store** | Builds queue; ownership via `publishPresentation` / state write |
| **queueSequence** | — | — | **Yes** | — | **Owns via Store** | Writes presentation + forces `manualTakeActive` |
| **Live Control Engine** | **Yes (session)** | — | — | — | **Owns → SN** | Owns live-control session; presentation effect by writing Sunday Nights |
| **Ops Sunday Nights PATCH** | — | — | — | — | **Owns SN write path** | Manual `setLiveTrack` / event mode |
| **Channel Zero scheduled program** | — | — | **Yes** | — | **Transforms** | Clock → RVTR; no persistence |
| **buildPlayheadPayload** | — | — | **Yes** | **Yes** | **Transforms** | Read aggregator: snapshot/state + SN + VDJ overlay + CurrentBroadcast |
| **Public playhead GET** | — | — | — | **Yes** | **Observes** | Exposes `buildPlayheadPayload` |
| **Public current GET** | — | — | — | **Yes** | **Observes** | Exposes homepage merge payload |
| **BroadcastViewer** | — | — | — | **Yes** | **Observes** | Polls playhead → stage |
| **RetroverseLive2View** | — | — | local patron index | **Yes** | **Observes** | Polls current API; patron browse is session-local only |
| **PresentationStage** | — | — | asset route | **Yes** | **Observes** | Renders `rvba`/`broadcast` |
| **Audience Preview** | — | — | — | **Yes** | **Observes** | Studio mirror of playhead |
| **BroadcastPanel** | — | — | — | **Yes** | **Observes** | Status only |
| **VdjAutoFollower** | — | — | — | **Yes** | **Observes** | Reads playhead; redirect currently no-op |
| **Runtime status** | — | — | — | **Yes** | **Observes** | May tick Live Control (side effect) |
| **Patron navigation** | — | — | session view | **Yes** | **Observes** | Does not write server presentation |
| **RetroverseLivePlayer** | — | — | — | — | Unused | Not in runtime path |

### Who owns presentation today? (actual)

| Domain | Apparent owner(s) | Conflict? |
|---|---|---|
| Published queue + playhead (Studio) | Presentation Store (`state.json` + presentations) | Snapshot also written; VDJ pause may update snapshot playhead without equivalent store write |
| Playhead read (deployed) | **Broadcast Snapshot** (preferred over store) | Snapshot is both mirror and public owner |
| AUTO vs Manual ownership flags | Presentation Store **and** Snapshot **and** Sunday Nights (takeover) | **Yes — triple mirror / dual write** |
| “What song is live?” | Sunday Nights State | Written by Bridge, Live Control, Ops PATCH, VDJ Takeover |
| Default homepage display | **Channel Zero** (transform over SN) | **Yes — parallel to Playhead AUTO** |
| Homepage when operator took | Playhead (`manualTakeActive` → `manualOverride`) | Only this slice uses Presentation ownership on `/` |
| Pass / playhead API display | `buildPlayheadPayload` transform over Snapshot/Store + VDJ overlay | Parallel public contract to homepage |
| Mixer cue position | Mixer `Deck.currentIndex` | Can drift from server playhead when deck not live |

### Ownership overlaps (every conflict)

#### Overlap A — Two public owners of “what the audience sees”

| Contenders | Responsibility |
|---|---|
| Channel Zero + Sunday Nights | Default homepage |
| Presentation Store / Snapshot / Playhead | Pass + manual homepage override + Studio preview |

**Neither yields.** Homepage ignores Playhead AUTO (`itemIndex === -1`). Playhead API ignores Channel Zero.

#### Overlap B — Three writers of VDJ / AUTO ownership flags

| Contender | Fields |
|---|---|
| Presentation Store | `autoFollowVdj`, `manualTakeActive`, `vdjTakeoverActive`, `vdjStoppedAt` |
| Broadcast Snapshot | `autoFollowVdj`, `manualTakeActive` |
| Sunday Nights State | `vdjTakeoverActive`, `vdjStoppedAt`, `bridgePlaying`, `bridgeStoppedAt` |

VDJ Takeover reads/writes across all three. Resume/pause can prefer Snapshot over Store.

#### Overlap C — Two persisted playheads

| Contender | Role claimed |
|---|---|
| `PresentationState.playhead` | Local engine owner |
| `BroadcastSnapshot.playhead` | Sync mirror + **preferred** public read |

`pauseBroadcastRotation` / `resumeBroadcastRotation` often mutate **snapshot only**. Store and snapshot can diverge.

#### Overlap D — Multiple writers into Sunday Nights “live song”

| Contender | When |
|---|---|
| Live Bridge / applyBridgeLiveUpdate | VDJ playing |
| Live Control Engine | Demo/playlist session |
| Ops Sunday Nights PATCH | Manual operator set |
| VDJ Takeover | Flag updates alongside bridge |

All can change what Channel Zero (and thus homepage) shows.

#### Overlap E — Multiple writers into Presentation Store

| Contender | Path |
|---|---|
| Broadcast Mixer | `playDeck`, transport, republish |
| Presentation Studio | publish / movePlayhead |
| Broadcast Source | XML refresh publish |
| queueSequence | publish + manual take |
| VDJ Takeover | state flags + movePlayhead fallback |

Same ownership store; competing operator/automation entry points (acceptable if one store — **store is shared owner**, surfaces are writers). Overlap is **control-plane**, not dual persistence — except when Mixer `liveDeckId` implies ownership that Store flags don’t alone encode.

#### Overlap F — Mixer local cue vs server playhead

| Contender | Responsibility |
|---|---|
| `Deck.currentIndex` | Local cue / UI |
| Presentation playhead | On-air item |

Intended: Mixer transforms into Store when live. Drift possible when not live or after external VDJ pause.

#### Overlap G — Transform that behaves like an owner

| Contender | Why it looks like ownership |
|---|---|
| Channel Zero | Sole picker for default homepage Experience |
| `applyVdjPresentationItem` | Replaces current item on every playhead read without persisting that item |
| Channel Zero scheduled program | Decides public song when VDJ idle — no Store involvement |

### Sole-owner verdict

| Question | Answer |
|---|---|
| Is there a single owner today? | **No** |
| Closest owner of *programmed* presentation | **Presentation Store** (local) / **Broadcast Snapshot** (public preferred read) — already split |
| Closest owner of *default public homepage* | **Sunday Nights State**, selected by **Channel Zero** |
| Intended audience contract (code comments) | `CurrentBroadcast` + `Rvba` from `buildPlayheadPayload` — **not** wired as homepage SSoT |
| Controllers that should **not** own (today they do or act like they do) | Channel Zero (effective), Snapshot (public prefer), VDJ Takeover (flag/playhead writes), Live Control / Ops / Bridge (via SN) |

### Target classification (next sprint — DO NOT IMPLEMENT)

| Component | Target role |
|---|---|
| **One Presentation Owner** (Store → Snapshot as the published projection of that owner, not a second brain) | **Owns** |
| `buildPlayheadPayload` → `CurrentBroadcast`/`Rvba` | **Transforms** (only public contract) |
| Mixer / Studio / Source / Sequence | **Transforms → Owner** (writers, not owners) |
| VDJ Bridge / Live Control / Ops SN | **Owns live input** → feed Owner as input, not parallel public path |
| Channel Zero | **Transforms** over Owner **or** retire as public path |
| Push Public | **Mirrors** only |
| All viewers / panels | **Observes** only |

---

## 9. Recommended Simplifications (DO NOT IMPLEMENT)

Priority order for the next redesign sprint — recommendations only:

1. **Pick one public authority.** Converge `retroverse.live/` onto `buildPlayheadPayload()` → `CurrentBroadcast`/`Rvba`, **or** formally declare Channel Zero as the homepage SSoT and demote Playhead to Pass/venue-only. Today both claim public truth.

2. **Single ownership flags.** Collapse AUTO/manual/takeover flags currently mirrored in PresentationState, Snapshot, and Sunday Nights into one ownership record with clear take/release.

3. **One playhead document.** Stop dual-writing `state.json` playhead and `broadcast.json` playhead with divergent update paths (VDJ pause currently prefers mutating snapshot).

4. **One operator surface.** Keep Broadcast Mixer as the control plane; treat Presentation Studio as advanced/legacy editor or merge.

5. **Retire dead paths.** Remove or rewire unused `RetroverseLivePlayer`, no-op `VdjAutoFollower` redirect, and unused `resolveDefaultBroadcast` in the main resolve chain.

6. **Clarify Live Control vs Channel Zero scheduled.** Both can drive “what song is public” when VDJ is idle — document or merge.

7. **Make `CurrentBroadcast` the only audience contract.** Stop homepage-specific `manualOverride` bridging; let one resolver produce the stage inputs.

**Proposed SSoT for next sprint:**  
`Broadcast Snapshot` (persisted) + `buildPlayheadPayload()` (resolver) + `CurrentBroadcast`/`Rvba` (audience contract).  
Everything else (Mixer, VDJ bridge, Live Control, Channel Zero) becomes an **input producer** that writes ownership into that chain — not a parallel public renderer.

---

## Appendix A — File map (primary)

```
lib/bobos/presentation/
  store.ts              # load/save, publish, movePlayhead, buildPlayheadPayload
  resolve-playhead.ts   # pure anchor→current item
  vdj-takeover.ts       # AUTO ownership
  broadcast-snapshot.ts # local/PG snapshot
  push-public.ts        # Studio → public POST
  types.ts              # Presentation / Playhead / Snapshot / Payload
  canonical-audience.ts # CANONICAL_AUDIENCE_HREF = "/"

lib/broadcast/
  current-broadcast.ts  # derive CurrentBroadcast
  normalize-playhead.ts # ensure broadcast/rvba
  rvba.ts / resolve-broadcast-asset.ts / composer/*

lib/bobos/mixer/        # deck state + playback-adapter → queue
lib/broadcast-source/   # database.xml → queue
lib/channel-zero/       # homepage experience resolver
lib/sunday-nights/      # live bridge state
lib/live-control/       # demo/playlist channel
lib/home/public-current-song.ts  # homepage merge

apps/live/app/page.tsx                          # homepage
apps/live/app/api/sunday-nights/{bridge,current}
apps/live/app/api/retroverse-live/{playhead,broadcast}
apps/studio/app/bobos/broadcast/actions.ts      # Mixer + transport
tools/live-bridge/                              # OSC publisher
```

Mirrored copies under `packages/shared/` track the same modules for packaging — not a second runtime authority.

---

## Appendix B — Polling / timer summary

| Loop | Location | Interval | Writes state? |
|---|---|---|---|
| Homepage current song | RetroverseLive2View | 2–7s | No |
| Playhead viewer | BroadcastViewer | 2s | No (read triggers idle resume) |
| Mixer status / auto-return | BroadcastMixerView | ~2s | Yes (auto-return) |
| Cockpit broadcast status | BroadcastPanel | 2s | No |
| VDJ AutoFollower | layout | 1.5s | No |
| Live Bridge OSC | tools/live-bridge | config pollMs | Yes (via API) |
| VDJ idle resume | on playhead read | 15s rule | Yes |
| Live Control advance | on tick paths | `nextAdvanceAt` | Yes |
| Channel Zero schedule | on resolve | wall clock slots | No |

---

*End of audit. Ready for Broadcast Mixer redesign sprint after review.*
