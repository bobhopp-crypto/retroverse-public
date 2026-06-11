# VDJ ↔ Retroverse Live Integration Study

**Date:** 2026-06-11  
**Scope:** Research only — no implementation  
**Goal:** When a track begins playing in VirtualDJ, Retroverse should immediately know artist, title, file path, deck, and timestamp, and update the public Sunday Nights experience.

**Audience:** Sunday Nights production — Bob DJ Mac → Retroverse canonical graph → `retroverse.live`.

---

## Executive summary

Professional DJ “now playing” integrations fall into three real-world buckets:

1. **Direct software API** — query or subscribe to the DJ app’s deck state (filepath, artist, title, audible deck). This is what serious tooling uses when timing matters.
2. **Deferred history/log scraping** — read `tracklist.txt` or database history after a delay. Common for legal logs, RDS, and OBS overlays; **not** acceptable for immediate audience sync.
3. **Broadcast metadata path** — Icecast/Shoutcast song title pushed to listeners. Works when you are streaming; orthogonal to a website exhibit unless you also run a radio stack.

For Retroverse, **filepath is non-negotiable** — canonical identity flows through `media_assets.source_path` → RVTR (`lib/sunday-nights/resolve-rvtr.ts`). Artist/title-only matching is a fallback, not production.

| Recommendation | Choice |
|----------------|--------|
| **A — Best production** | **Local bridge on DJ Mac** using **VDJscript via Network Control** (poll + `is_audible` hysteresis) with an **OSC subscription upgrade path** for push latency |
| **B — Best MVP (Sunday Nights)** | Same Network Control bridge → existing `setLiveTrack()` — **2–4 dev days**, zero VDJ workflow change |
| **C — Fallback** | Lowered `historyDelay` + `tracklist.txt` tail watcher + artist/title match when filepath unavailable |

Prior internal work (`reports/sunday-nights/vdj-automation-feasibility.md`) already converged on Option A. This study expands to **all** integration surfaces and ranks them against how working DJs actually ship live metadata.

---

## Target data contract

When Retroverse should update:

| Field | Source in VDJ | Retroverse use |
|-------|---------------|----------------|
| Artist | `deck N get_artist` | Display + match fallback |
| Title | `deck N get_title` | Display + match fallback |
| File path | `deck N get_filepath` | **Primary** — `resolveRvtrForSongs()` |
| Deck | Derived from `is_audible` + `get_crossfader_result` | Audit + crossfade logic |
| Timestamp | Bridge clock at publish | `updatedAt` on live state |

Existing publish path (unchanged by this study):

```
VDJ (DJ Mac)
  → local bridge
  → resolve RVTR (path → media_assets)
  → setLiveTrack()  (lib/sunday-nights/state.ts)
  → GET /api/sunday-nights/current (public polls every 8s)
```

---

## Ranked comparison table

Scores: **Latency** and **Reliability** (1–5, higher is better). **Complexity** (1–5, higher = harder).

| Rank | Option | Latency | Reliability | Complexity | Cross-platform | Live-safe | Survives VDJ updates | Workflow impact | Fit for Retroverse |
|------|--------|---------|-------------|------------|----------------|-----------|----------------------|-----------------|-------------------|
| **1** | **Network Control HTTP + local bridge** (poll `get_filepath`, `is_audible`) | 3 | 5 | 3 | Win/Mac | Yes | High (VDJscript verbs stable) | None | **Excellent** — filepath + deck |
| **2** | **OSC subscribe** (`/vdj/subscribe/deck/1/get_filepath`, etc.) | 4 | 3 | 4 | Win/Mac | Yes* | Medium (newer feature) | None | **Excellent** if subscriptions stable |
| **3** | **Native C++ plugin (SDK v8)** push to local HTTP/WS | 5 | 5 | 5 | Win/Mac (separate builds) | Yes** | Medium | None (auto-start plugin) | **Excellent** — Unbox model |
| **4** | **Third-party: Unbox plugin + WS** (`ws://localhost:8080/ws`) | 4 | 4 | 2 | Win/Mac | Yes | Depends on vendor | Install Unbox + plugin | Good — less canonical control |
| **5** | **TitleStreamer / now-playing text file** | 1 | 3 | 2 | Win (primary) | Yes | Medium | None; needs history | Poor — no filepath; 30–45s delay |
| **6** | **History `tracklist.txt` watcher** | 1 | 2 | 2 | Win/Mac | Yes | High | None; optional `historyDelay` tweak | Poor — delayed, wrong during mix |
| **7** | **Broadcast metadata (Icecast/Shoutcast)** | 3 | 3 | 3 | Win/Mac | Only when broadcasting | High | Requires stream setup | Partial — no filepath/deck |
| **8** | **database.xml polling** | 2 | 1 | 5 | Win/Mac | Risky | Low (rewrite risk) | None | **Avoid** |
| **9** | **VDJ Remote TCP protocol** (`_vdjremote8._tcp`) | 5 | 1 | 5 | Win/Mac/iOS | No | None (undocumented) | None | **Avoid** |
| **10** | **OS2L** | 4 | 4 | 3 | Win/Mac | Yes | Medium | None | Wrong domain (lighting/DMX) |
| **11** | **Skin / custom button VDJscript only** | 2 | 2 | 3 | Win/Mac | Manual | High | Button per track | Not automatic |
| **12** | **VirtualDJ.com Sets / cloud history upload** | 1 | 2 | 1 | Cloud | No | N/A | None | Wrong latency model |

\*OSC: avoid sub-50ms flood; subscribe only to needed fields.  
\*\*Plugin: must not run heavy work on audio thread; use throttled master-deck sampling.

---

## Option-by-option investigation

### 1. VirtualDJ plugin architecture (native C++ SDK v8)

**What it is:** COM-style DLL/bundle plugins with `SendCommand()` / `GetInfo()` / `GetStringInfo()` into VDJscript. Categories include DSP, video, effects; “basic” plugins can run custom logic and optional UI ([VDJPedia Developers](https://virtualdj.com/wiki/Developers)).

**How pros use it:** Stream overlay tools (e.g. **Unbox**) ship a Sound Effect plugin that follows the **master/audible deck** and pushes JSON over a local WebSocket ([unbox on GitHub](https://github.com/erikrichardlarson/unbox)). Forum guidance: sample master deck in `OnProcessSamples()` every N callbacks, write to file or socket — do not spawn unbounded threads ([forum: exporting realtime overlay](https://virtualdj.com/forums/251917/VirtualDJ_Technical_Support/Exporting_realtime_info_for_a__now_playing__overlay.html)).

| Criterion | Assessment |
|-----------|------------|
| Latency | **Best possible** (event-driven or ~30–100ms sampling) |
| Reliability | **Highest** when master-deck logic matches audience audio |
| Complexity | **Highest** — C++, signing, ARM/Intel Mac, Win x64, SDK churn |
| Cross-platform | Win + Mac separate artifacts (`Plugins64`, `PluginsMacArm`) |
| Live performance | Good if lightweight; bad if high-frequency HTTP like Remote users tried |
| VDJ updates | SDK header updates; occasional breakage |
| Workflow | **No playlist change** — enable auto-start master effect |

**Retroverse fit:** Production-grade long-term if you want zero polling and full control. Overkill for Sunday Nights MVP.

---

### 2. VirtualDJ script callbacks / custom buttons

**What it is:** VDJscript verbs on keyboard, controller, or skin buttons. Can `play`, `load`, query deck state, run `deck 1 get_filepath` inline.

**Gap:** There is **no official “on track started” callback** exposed to external apps. Scripts run on user actions, not as a global event bus. No native `write_file` for now playing ([12-year feature request](https://virtualdj.com/forums/213904/Wishes_and_new_features/VDJ_8_(or_any)_-_Write_now_playing_metadata_to_external_text_or_html_file__preferably_both_.html)).

**Workarounds DJs use:** Map a button to append to search log/history ([forum workaround](https://virtualdj.com/forums/252130/General_Discussion/Saving_currently_playing_song_to_a_file_or_virtual_folder_on_demand.html)) — manual, not automatic.

| Criterion | Assessment |
|-----------|------------|
| Latency | N/A for automation |
| Reliability | Low for unattended live |
| Complexity | Low per script, high to make automatic |
| Workflow | **Changes performance** if manual |

**Retroverse fit:** Not a primary path.

---

### 3. VirtualDJ event hooks (internal)

VDJ does not publish a documented external event SDK. “Hooks” effectively mean:

- **VDJscript actions** tied to UI events
- **Plugin callbacks** (`OnLoad`, `OnProcessSamples`, DSP start/stop)
- **OSC subscribe** (see §8) — closest to real events in recent builds

No supported hook for “track_started” outside these.

---

### 4. VDJ broadcast / status APIs

**Broadcast tab** supports Icecast/Shoutcast/direct/podcast ([Broadcast manual](https://virtualdj.com/manuals/virtualdj/settings/broadcast.html)). Options include `broadcastSongInfo` and `broadcastSongInfoFormat` with `%artist`, `%title`, etc. ([options list](https://virtualdj.com/manuals/virtualdj/appendix/optionslist.html)).

**Professional use:** Radio DJs and streamers push metadata to **listeners**, not to arbitrary websites. Tools like **Rocket Broadcaster** ingest **TitleStreamer** text files because VDJ does not natively export now playing to disk ([Rocket Broadcaster guide](https://www.rocketbroadcaster.com/docs/guides/virtualdj-metadata.html)).

| Criterion | Assessment |
|-----------|------------|
| Latency | Stream path ~1–3s |
| Reliability | Good **only while broadcasting** |
| Filepath / deck | **Not available** in broadcast title format |
| Workflow | Requires running a stream stack |

**Retroverse fit:** Secondary if Sunday Nights is also simulcast to Icecast; not sufficient alone for `retroverse.live`.

---

### 5. Local HTTP callbacks from VDJ — **Network Control plugin**

**Official mechanism** (VDJ 2023+, **Pro license**): HTTP server with `/query?script=` and `/execute?script=` ([Network Control wiki](https://virtualdj.com/wiki/NetworkControlPlugin.html)).

**Documented now-playing queries** (VDJscript appendix):

| Query | Purpose |
|-------|---------|
| `deck 1 get_filepath` | Full filesystem path |
| `deck 1 get_artist` / `get_title` | Tags |
| `deck 1 is_audible` | On-air (volume + playing) |
| `get_crossfader_result` | Audible balance |
| `deck 1 get_time elapsed` | Position ms |
| `get_automix_song 'title'` | **Next** track — do not use for now playing |

**Forum consensus:** Use **per-deck** queries (`deck 2 get_time`), not global `get_title` alone ([forum](https://virtualdj.com/forums/259500/VirtualDJ_Plugins/Network_Control_plugin_and_how_to_obtain_information_from_different_tracks_labeled_A%2C_B%2C_C%2C_and_D..html)).

**Caveats:**

- Plain text responses, not JSON
- Polling too fast can destabilize VDJ ([Remote protocol thread](https://virtualdj.com/forums/257363/VirtualDJ_Plugins/Protocol_used_by_Virtual_DJ_Remote.html) — `get_time` every 20ms crashed VDJ)
- **Recommended poll:** 1–2s with **3 consecutive stable** audible-deck + filepath reads before publish (see internal feasibility doc)

**Retroverse repo:** Probe tool at `tools/sunday-nights/probe-vdj-network-control.ts`; path→RVTR in `lib/sunday-nights/resolve-rvtr.ts`.

| Criterion | Assessment |
|-----------|------------|
| Latency | ~2–10s end-to-end with hysteresis + 8s public poll |
| Reliability | **High** with `is_audible` + filepath |
| Complexity | **Medium** — small local daemon |
| Cross-platform | Yes |
| Live performance | Yes at sane poll rates |
| VDJ updates | Strong — VDJscript surface is stable |
| Workflow | **Zero change** |

**Retroverse fit:** **Best MVP and strong production baseline.**

---

### 6. VDJ database polling (`database.xml`)

VDJ stores library metadata in a large XML database. Polling `LastPlay` / play counts is fragile:

- File can be **rewritten on launch** (internal `reports/vdj-color-test/INVESTIGATION.md`)
- Does not tell you **which deck is audible** during a crossfade
- High parse cost on large libraries

**Verdict:** Emergency fallback only. Working DJs do not use this for live overlays.

---

### 7. History file monitoring (`tracklist.txt`)

**Location:** `{VDJ Home}/History/tracklist.txt` (home folder may be `Documents/VirtualDJ` or `%LocalAppData%/VirtualDJ` after reinstall — [forum](https://virtualdj.com/forums/249979/VirtualDJ_Technical_Support/home_folder_location___history_txt.html)).

**Behavior:**

- Tracks added after **`historyDelay`** seconds (default **45s**) of play ([History manual](https://virtualdj.com/manuals/virtualdj/interface/database/history.html))
- Can lower delay (e.g. 30s) but still **post-facto**
- `tracklist.txt` is a flat legal/royalty log; daily `.m3u` files power the History UI ([forum](https://virtualdj.com/forums/238724/VirtualDJ_Technical_Support/How_do_VDJs_history_files_work__(tracklist_txt____m3u_files).html))

**Tools:** **TitleStreamer** reads history, writes artist–title text file for OBS/RDS ([Christian Wheel](https://www.christianwheel.com/post/titlestreamer-for-virtual-dj)).

| Criterion | Assessment |
|-----------|------------|
| Latency | **30–45s+** |
| Reliability | Medium — wrong during transitions; no deck |
| Filepath | Sometimes in formatted line; not structured API |
| Workflow | Optional `historyDelay` tweak only |

**Retroverse fit:** Fallback when Network Control unavailable; **not** “immediately knows.”

---

### 8. WebSocket / event mechanisms

| Mechanism | Status |
|-----------|--------|
| **Native VDJ WebSocket API** | **None documented** |
| **Network Control HTTP** | Request/response only |
| **OSC subscribe** (VDJ Pro) | Push on change — `/vdj/subscribe/deck/1/get_filepath` (spaces → `/`) ([OSC forum](https://virtualdj.com/forums/266538/VirtualDJ_Technical_Support/VDJ_and_new_OSC_support.html)); `oscPort` / `oscPortBack` in options |
| **Unbox WS** | `ws://localhost:8080/ws` JSON — third-party |
| **VDJ Remote** | Bonjour `_vdjremote8._tcp` — **undocumented**, not for integration |

**OSC note:** Some receivers report non-standard OSC bundle type tags ([forum](https://virtualdj.com/forums/266971/VirtualDJ_Technical_Support/I_think,_OSC_Messages_seem_to_use_an_older_bundle_format_(no_type_tag)_and_not_adhere_to_the_OSC_1.0_standard.html)) — test with your bridge library.

**Production path:** OSC subscribe for push + Network Control as debug/backup.

---

### 9. Third-party integrations DJs actually use

| Tool | DJ apps | Mechanism | Latency | Notes |
|------|---------|-----------|---------|-------|
| **Unbox** | VDJ, Serato, Rekordbox, Traktor, Mixxx… | Plugin + Go poller + WS | Low | Master-deck aware for VDJ |
| **TitleStreamer** | VDJ (Win) | History → text file | 30–45s | OBS, RDS, URL ping |
| **What's Now Playing** | Multiple | WS/REST from companion | Varies | Broadcaster ecosystem |
| **Touch Portal + VDJ** | VDJ | Network Control + automation | Medium | Streamer workflows |
| **Icecast/Shoutcast** | VDJ broadcast | Stream metadata | Stream-bound | Listeners, not websites |
| **Rocket Broadcaster** | VDJ via TitleStreamer | Text file ingest | 30–45s | Radio stack |

**Pattern:** Pros either **tap the deck API** (plugin / OSC / HTTP) or accept **history delay** for overlays. Retroverse is in the first camp because of RVTR filepath resolution.

---

## AutoMix / crossfade — production requirement

During a live crossfade, **both decks may be audible**. Rules used by lighting and overlay tools apply here:

1. Do **not** switch on filepath change alone  
2. Use `deck N is_audible` and `get_crossfader_result`  
3. Require **stable candidate deck** for N polls (e.g. 3 × 2s = 6s)  
4. Optional: `get_time elapsed` > 5s on candidate deck  
5. Never use `get_automix_song` for now playing (that's **next**)

Wrong song on the website during a blend is worse than 6s delay — hysteresis is mandatory.

---

## Architecture recommendation

### Production architecture (A)

```
┌─────────────────────┐
│ VirtualDJ (Pro)     │
│ Network Control     │◄── optional OSC subscribe (upgrade)
│ Master auto-start   │
└─────────┬───────────┘
          │ localhost HTTP / OSC
          ▼
┌─────────────────────┐
│ vdj-retroverse-     │  Poll 2s / or push on change
│ bridge (DJ Mac)     │  Audible-deck + hysteresis
│                     │  Normalize path
└─────────┬───────────┘  resolveRvtrForSongs()
          │ HTTPS + ops auth (or PG on same host)
          ▼
┌─────────────────────┐
│ Retroverse state    │  setLiveTrack({ rvtr, artist, title,
│ (Neon / ops JSON)   │    songKey: path, year, ... })
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ retroverse.live     │  GET /api/sunday-nights/current
│ Sunday Nights embed │  (consider 3–5s poll during event)
└─────────────────────┘
```

**Why local bridge, not cloud polling:** VDJ runs on the DJ laptop. Network Control binds to localhost. A Vercel function cannot see the deck.

**Security:** Keep VDJ HTTP on `127.0.0.1`, optional bearer token, bridge holds ops credentials.

**Observability:** Log every publish: `{ path, deck, rvtr, matched, latencyMs, audibleSnapshot }`.

### MVP architecture (B) — Sunday Nights

Identical to production but:

- Network Control polling only (no OSC until validated)
- Reuse `PATCH /api/ops/sunday-nights` / `setLiveTrack`
- Manual **Go Live** remains as override in ops UI
- Pre-flight: run `probe-vdj-network-control.ts` on DJ Mac before doors

**Effort:** 2–4 dev days (from internal feasibility study).

### Fallback architecture (C)

```
tracklist.txt tail watcher (historyDelay → 15–30s)
  → parse artist/title (path if present in format)
  → chart/alias match (no guaranteed RVTR)
  → setLiveTrack with songKey = hash(artist|title)
```

Use when: Pro license lapse, plugin disabled, or Network Control port conflict.

---

## Recommendations

### A. Best production solution

**Local `vdj-retroverse-bridge` on the DJ Mac:**

1. **Primary sensor:** Network Control — `deck N get_filepath`, `get_artist`, `get_title`, `is_audible`, `get_crossfader_result`, `get_time elapsed`
2. **Master logic:** Audible-deck selection + 6s stability window
3. **Identity:** `resolveRvtrForSongs()` — filepath first
4. **Publish:** `setLiveTrack()` with `songKey` = normalized path, `updatedAt` = ISO timestamp
5. **Upgrade (phase 2):** OSC `/vdj/subscribe/.../get_filepath` and `/vdj/subscribe/.../is_audible` to reduce poll traffic and latency
6. **Optional phase 3:** Thin C++ plugin only if you need sub-second guarantees without OSC quirks

This matches how **Unbox**-class tools work, but keeps canonical resolution inside Retroverse.

### B. Best MVP for Sunday Nights

Same as (A) without OSC/plugin — **Network Control polling + hysteresis** only.

Checklist:

- [ ] VDJ Pro + Network Control on master panel (auto-start)
- [ ] Probe script passes on DJ Mac
- [ ] Bridge runs via `launchd` / login item
- [ ] Ops can still manual Go Live
- [ ] Unmatched paths logged to ops (don't flash wrong RVTR)

Public poll is currently **8s** (`app/sunday-nights/sunday-nights-live.tsx`) — bridge can be faster; total perceived latency ≈ bridge stability window + poll interval.

### C. Fallback solution

1. `historyDelay` reduced (e.g. 20–30s) — accept imperfection  
2. Watch `History/tracklist.txt` or TitleStreamer output  
3. Match artist/title only — flag low confidence in ops  
4. **Do not** use `database.xml` watcher

---

## Validation plan (before build)

Run on **DJ Mac with VDJ playing** (not CI):

1. `npx tsx tools/sunday-nights/probe-vdj-network-control.ts`
2. Manual play: confirm `deck 1 get_filepath` returns full VIDEO path
3. AutoMix A→B: log `is_audible` + `get_crossfader_result` every 1s for 30s
4. OSC trial (optional): subscribe to filepath; verify push latency and parser compatibility
5. Confirm unmatched path rate against `media_assets` for Sunday Nights playlist

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Wrong deck during crossfade | **High** | `is_audible` + stability window |
| Path not in `media_assets` | Medium | Alias store + ops queue; don't publish bogus RVTR |
| Network Control disabled mid-gig | Medium | Pre-flight + fallback C |
| Poll too aggressive crashes VDJ | Medium | ≥1s interval; never 20ms `get_time` loops |
| OSC library incompatibility | Low | Keep HTTP poll as backup |
| VDJ Pro licensing | Medium | Document requirement |
| End-to-end latency > audience expectation | Low | Tune stability vs 8s poll; event-mode faster poll |

---

## Sources

### Internal

- `reports/sunday-nights/vdj-automation-feasibility.md`
- `tools/sunday-nights/probe-vdj-network-control.ts`
- `lib/sunday-nights/resolve-rvtr.ts`, `lib/sunday-nights/state.ts`
- `app/sunday-nights/sunday-nights-live.tsx` (8s poll)

### VirtualDJ official

- [Network Control Plugin](https://virtualdj.com/wiki/NetworkControlPlugin.html)
- [Developers / SDK v8](https://virtualdj.com/wiki/Developers)
- [VDJscript verbs](https://virtualdj.com/manuals/virtualdj/appendix/vdjscriptverbs.html)
- [Options list (OSC, broadcast)](https://virtualdj.com/manuals/virtualdj/appendix/optionslist.html)
- [History / historyDelay](https://virtualdj.com/manuals/virtualdj/interface/database/history.html)
- [Broadcast settings](https://virtualdj.com/manuals/virtualdj/settings/broadcast.html)

### Community / professional tooling

- [Unbox (GitHub)](https://github.com/erikrichardlarson/unbox)
- [TitleStreamer for VirtualDJ](https://www.christianwheel.com/post/titlestreamer-for-virtual-dj)
- [Rocket Broadcaster + VDJ metadata](https://www.rocketbroadcaster.com/docs/guides/virtualdj-metadata.html)
- [OSC support forum](https://virtualdj.com/forums/266538/VirtualDJ_Technical_Support/VDJ_and_new_OSC_support.html)
- [Now playing / history forum threads](https://virtualdj.com/forums/236931/VirtualDJ_Technical_Support/Sending__current_track__info_to_another_app_or_computer.html)

---

## Bottom line

**Professional DJs integrate live metadata through the DJ software’s deck API** (plugin, HTTP VDJscript, or OSC subscribe) — not through history files. History and TitleStreamer are acceptable for **RDS/OBS/legal logs**, not for a **canonical music graph exhibit**.

For Retroverse Sunday Nights:

- **Ship MVP:** Network Control + local bridge + filepath + `is_audible` → `setLiveTrack`  
- **Grow production:** Add OSC push; consider native plugin only if you outgrow both  
- **Fallback:** History tail + title match — degraded mode only

No Retroverse app redeploy is required for the bridge MVP; the website already polls live state. The missing piece is **reliable, local, deck-aware sensing on the DJ Mac**.
