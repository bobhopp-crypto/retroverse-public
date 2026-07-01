# Stabilization Checkpoint — 2026-06-28

**Branch:** `main`  
**Checkpoint commit:** `698baaefe` — *Stabilization checkpoint before production verification*  
**Prior commit:** `a57627734` — *Enhance Studio Operations and Department Definitions*

---

## Phase 1 — Clean Up (done)

| Action | Result |
|---|---|
| Unstaged work | Staged and committed (instrumentation, gallery stall report, 6 new RVTR research packages, session notes) |
| Left unstaged | `tsconfig.tsbuildinfo` only (build artifact) |
| Dev servers | Stopped PIDs on `:3000` and `:3004` |
| Half-finished edits | None remaining in tracked files |

---

## 1. Git Status

| Item | Value |
|---|---|
| **Branch** | `main` |
| **Last commit** | `698baaefe` — Stabilization checkpoint before production verification (2026-06-28 16:14 CDT) |
| **Staged** | 0 (clean after commit) |
| **Modified** | 1 — `tsconfig.tsbuildinfo` |
| **Untracked** | 0 |
| **Commit size** | ~46k files (Studio pipeline, experiences, gallery, research-department artifacts, tools, reports) |

---

## 2. Active Features

| Feature | Status | Evidence |
|---|---|---|
| **Collector** | Complete | Studio v1.0 audit; `collector.json` + `song-dna.json` on RVTR001341; overnight run active today (20 songs) |
| **Editor** | Complete | Pipeline verification RVTR001341; `editor.json` handoff path verified |
| **Director** | Complete | Sprints 3.31–3.36; RVTR001341 `director.json` + patron render 11 scenes |
| **Creative Review** | Partially Complete | Sprint 3.33 complete; **on-demand only** — not wired into `runProductionSong` |
| **Publisher** | Complete | 84 published records; RVTR001341 published 2026-06-28T02:25:54Z |
| **Experience Gallery** | Blocked | Server data load ~6s OK; RSC `visitAsyncNode` stack overflow; page never streams (`reports/gallery-render-stall-investigation.md`) |
| **Chart Journey** | Partially Complete | Patron: `/retroverse-2/song/{rvtr}#chart-journey` loads (RVTR001341 tested 200/4.9s); Studio design workspace at `/ops/studio/experiences/chart-journey/[rvtr]` |
| **Song DNA** | Partially Complete | Patron: `/experience/RVTR001341` loads (200/2.2s); Studio workspace at `/ops/studio/experiences/song-dna/[rvtr]`; Gallery launch path blocked |
| **Studio Pipeline** | Complete | v1.0 frozen (`reports/studio-v1-final-audit.md`); `runProductionSong` end-to-end verified RVTR001341 |
| **Overnight Pipeline** | Partially Complete / Untested resume | `collector-progress.json`: status `researching`, queue **2810**, current `RVTR360340`, 20 completed today; last update 2026-06-28T08:53:46Z |

---

## 3. Patron Experiences

Tested 2026-06-28 against local dev (`127.0.0.1:3000`) unless noted. **Ready for tonight** = loads and is demo-viable without Studio.

| URL | Loads? | Tested? | Ready tonight? |
|---|---|---|---|
| `/` | 200 (~1.2s) | Yes (curl) | Yes |
| `/search` | 200 (~1.0s) | Yes | Yes |
| `/charts` | 307 → `/retroverse-2/charts` | Yes | Yes |
| `/retroverse-2/charts` | 200 (~0.3s) | Yes | Yes |
| `/sunday-nights` | 307 redirect | Yes | Yes (redirect) |
| `/live` | 307 redirect | Yes | Untested destination |
| `/week/[date]` | 200 (`/week/2026-06-28`) | Yes | Yes |
| `/rv/[year]` | 200 (`/rv/2026/06`) | Yes | Yes |
| `/rv/[year]/[month]/[week]` | Not curl-tested | No | Unknown |
| `/artist/[slug]` | 200 (`fleetwood-mac`) | Yes | Yes |
| `/artist/[slug]/songs` | Not tested (server stopped) | No | Unknown |
| `/artist/[slug]/charts` | Not tested | No | Unknown |
| `/artist/[slug]/albums` | Not tested | No | Unknown |
| `/album/[id]` | 200 | Yes | Yes |
| `/track/[id]` | 200 | Yes | Yes |
| `/experience/[rvtr]` | 200 (`RVTR001341`, ~2.2s) | Yes | **Yes — primary Song DNA patron route** |
| `/retroverse-2/song/[rvtr]` | 200 (`RVTR001341`, ~4.9s) | Yes | **Yes — Chart Journey anchor** |
| `/retroverse-2/song/[rvtr]/data` | Not tested | No | Unknown |
| `/retroverse-2/live` | 307 redirect | Yes | Untested destination |
| `/retroverse/experiences` | **Fails** — 90s timeout / empty reply; server stack overflow | Yes | **No — blocks demo if Gallery is on script** |
| `/rvtr/[rvtr]/deck` | 307 → song page | Yes | Yes (via redirect) |
| `/rvtr/[rvtr]/song-sheet` | 307 → song page | Yes | Yes (via redirect) |

**Not patron demo routes:** `/ops/*`, `/internal/*`, `/diagnostics`, `/inspect`, `/control-center`

---

## 4. Studio Workspaces

| Workspace | URL | Verified? |
|---|---|---|
| Living Studio home | `/ops/studio` | Reported complete (navigation audit); not curl-tested today |
| Collector library | `/ops/studio/collector` | Yes — RVTR001341 pipeline audit |
| Collector detail | `/ops/studio/collector/[rvtr]` | Yes |
| Editor library | `/ops/studio/editor` | Yes |
| Editor office | `/ops/studio/editor/[rvtr]` | Yes |
| Director queue | `/ops/studio/director` | Yes |
| Director workspace | `/ops/studio/director/workspace/[rvtr]` | Yes — RVTR001341 |
| Creative Review | `/ops/studio/creative-review/[rvtr]` | Yes — Sprint 3.33 RVTR001341 |
| Publisher dashboard | `/ops/studio/publisher` | Yes — v1.0 audit |
| Publisher review | `/ops/studio/publisher/[rvtr]` | Yes — RVTR001341 published |
| Publisher lab / museum | `/ops/studio/publisher/lab`, `/museum` | Built; not runtime-tested today |
| Experience Lab | `/ops/studio/experience-lab/[rvtr]` | Built; not verified today |
| Training mode | `/ops/studio/training` | Built; not verified today |
| Chart Journey design | `/ops/studio/experiences/chart-journey/[rvtr]` | Design complete (report); not curl-tested today |
| Song DNA design | `/ops/studio/experiences/song-dna/[rvtr]` | Design complete (report); not curl-tested today |
| Operations Center | `/ops/browser-plus-2` | Mission Control wired (Sprint 3.18); not curl-tested today |
| QC / audio / visual analysis | `/ops/studio/quality-control`, etc. | Exist; not verified today |

---

## 5. Known Blocking Issues (by severity)

### P0 — Experience Gallery RSC crash
- **Root cause:** Next.js `visitAsyncNode` infinite recursion when serializing `ExperienceGallery` client boundary (`useSearchParams()`). Server loader finishes in ~6s; stream never completes.
- **Affected:** `/retroverse/experiences`
- **Blocks tonight?** **Yes**, if Gallery is on the demo script. **No**, if demo uses `/experience/RVTR001341` + `/retroverse-2/song/RVTR001341` directly.

### P1 — Dev server instability on Gallery route
- **Root cause:** Same as P0; hung requests tie up Node process; stale servers on `:3000` observed across sessions.
- **Affected:** Local dev/testing of Gallery; can mask other route health.
- **Blocks tonight?** Only if Gallery must be shown; production build behavior not tested in this checkpoint.

### P2 — Creative Review not in automatic production run
- **Root cause:** By design — on-demand via UI only (`studio-v1-final-audit.md`).
- **Affected:** Batch pipeline skips editorial QA unless operator opens Creative Review.
- **Blocks tonight?** No for patron demo; yes if tonight includes automated QA story.

### P3 — Large uncommitted surface now committed
- **Root cause:** ~46k files in one checkpoint commit — hard to review incrementally.
- **Affected:** Git history readability.
- **Blocks tonight?** No.

---

## 6. Production Pipeline Status

| Field | Value |
|---|---|
| **Last published song** | RVTR001341 — Dr. Hook — *When You're In Love With A Beautiful Woman* — `2026-06-28T02:25:54.229Z` |
| **Publisher state** | 989 records total, **84 published**; latest pipeline event: `published` RVTR001341 at `2026-06-28T07:25:47Z` |
| **Overnight / collector queue** | `collector-progress.json`: status `researching`, **2810** remaining, current song RVTR360340 (Tim McGraw — *My Best Friend*), 20 completed today, avg runtime ~8.3s |
| **BP2 studio queue file** | `data/ops/browser-plus/studio-queue.json` — **not present** on disk (queue empty or never persisted) |
| **Overnight resume safe?** | **Partially** — collector batch was running cleanly as of 08:53 UTC today; no evidence of corruption. **Recommend:** confirm no duplicate dev/prod runners before resume; avoid running Gallery route on same Node process during batch (P1). Full auto pipeline (`runProductionSong`) verified safe for single-song runs. |

---

## 7. Recommended Next Three Sprints (demo-only)

### Sprint A — Gallery unblock (minimum)
Fix `useSearchParams()` Suspense boundary inside `ExperienceGallery` only. Verify `/retroverse/experiences?rvtr=RVTR001341` streams in <10s. **Required only if Gallery is on tonight's script.**

### Sprint B — Patron demo smoke test
Lock demo path: `/experience/RVTR001341` (Song DNA) + `/retroverse-2/song/RVTR001341#chart-journey` (Chart Journey). Run production build + Safari load on those two URLs. Document fallback if Gallery still blocked.

### Sprint C — Production verification freeze
Stop overnight collector before live demo OR confirm isolated runner. Re-run `npm run research:studio:verify-one -- RVTR001341`. Strip dev-only gallery instrumentation before any production deploy.

---

## Execution State

**COMPLETE** — Repository checkpoint committed; dev servers stopped; audit delivered. No code changes after this report.
