# Booth V1 — Sprint 8: Public Production Proof and Authority Lock

**Date:** 2026-07-21  
**Evidence:** `artifacts/booth-sprint8/`  
**Public surface tested:** local Live app `http://localhost:3100/` (production-equivalent route)  
**Show:** published Presentation `Broadcast Mixer`

---

## Verdict

### READY FOR LIVE EVENT TEST

Authority lock and public pipeline proof are in place for a **supervised** live-event test.

Complete the supervised checklist below before an unsupervised public show.

---

## 1. Files changed

| File | Change |
|---|---|
| `packages/shared/lib/bobos/presentation/booth-authority.ts` | **New** — `BoothAuthorityError`, `isBoothSessionActive`, `assertBoothLegacyMutationAllowed` |
| `packages/shared/lib/bobos/presentation/booth-authority.test.ts` | **New** |
| `packages/shared/lib/bobos/presentation/resolve-playhead.ts` | Missing anchor fails closed; `available` flag; `stepIndex` no silent wrap-to-0 |
| `packages/shared/lib/bobos/presentation/resolve-playhead.test.ts` | **New** |
| `packages/shared/lib/bobos/presentation/store.ts` | Legacy `movePlayhead` / `publishPresentation` reject when Booth active; transport steps from stored anchor; Booth Program holds anchor (no duration auto-walk); read path no resume side effect; PAUSE keeps Program on air |
| `packages/shared/lib/bobos/booth/program-control.ts` | `authority: "booth"` on all playhead moves; LOAD/PAUSE/RESUME sync Snapshot without ownership republish |
| `packages/shared/lib/bobos/presentation/vdj-takeover.ts` | `setAutoFollowVdj` throws when Booth active |
| `apps/studio/app/bobos/broadcast/actions.ts` | Mixer live transport / play / pause / cue / return-to-live assert Booth lock |
| `apps/studio/app/bobos/presentation/actions.ts` | Comments — Studio transport hits kernel lock |
| `packages/shared/components/bobos/presentation/PresentationStudio.tsx` | Surfaces Booth-active rejection in UI |
| `docs/broadcast/THE_BOOTH_SPRINT8_PUBLIC_PROOF.md` | This deliverable |

---

## 2. Authority guards added

While `boothPublisher.sessionActive`:

| Surface | Guard |
|---|---|
| `movePlayhead` (default / legacy) | Throws `BoothAuthorityError` unless `authority: "booth"` |
| `publishPresentation` | Throws `BoothAuthorityError` |
| Broadcast Mixer `playDeck` / live `stepDeck` / `pauseDeck` / `setDeckCue` / `setDeckOutput` / `returnBroadcastToLive` / `broadcastTransport` | `assertBoothLegacyMutationAllowed()` before mutate |
| Presentation Studio on-air transport / publish | Kernel throw → UI alert |
| `setAutoFollowVdj` | Throws `BoothAuthorityError` |
| Legacy VDJ auto-takeover start/stop | Still no-ops when Booth active (bridge is not an operator UI) |
| Booth `program-control` | Passes `authority: "booth"` — only allowed writer |

Rejection message (stable):  
`The Booth owns The Air — legacy transport rejected while Booth session is active`

---

## 3. Side effects removed from read paths

| Before | After |
|---|---|
| `buildPlayheadPayload()` called `maybeResumeBroadcastAfterVdjIdle()` on every GET/poll | **Removed** — playhead GET is read-only |
| Duration walk could advance public item while Booth Program “playing” | Booth Program session resolves with **held anchor** (operator NEXT only) |
| `movePlayhead(pause)` re-anchored to duration-walked item | Pause/play preserve stored anchor; next/prev step from stored anchor index |

`maybeResumeBroadcastAfterVdjIdle` remains available for explicit write paths; it is no longer triggered by observers.

---

## 4. Missing-anchor behavior

| | Before | After |
|---|---|---|
| Unknown / null anchor | Fell back to **queue index 0** | `available: false`, `item: null`, `index: -1` |
| NEXT/PREV from missing anchor | Could step from fabricated index 0 | Fail closed — no move |
| End of queue (no loop) | Clamped to last / first | `stepIndex` returns `null` — keep current anchor |
| Booth Program view | Already fail-closed | Aligned with kernel |

---

## 5. Full public test matrix

| # | Step | Booth | Playhead | Snapshot | Studio playhead API | Live playhead API | Public page | Result |
|---|---|---|---|---|---|---|---|---|
| 1 | Load Show | READY mirrors | paused @ first | synced paused | first RVBA | first RVBA | — | PASS |
| 2 | GO LIVE | PROGRAM | playing | Program session | LIVE AID | LIVE AID | Program slide | PASS · Confirmed/Confirmed |
| 3 | NEXT ×3 (+2.5s dwell > duration) | advances once each | matches Booth | matches | matches | matches | matches | PASS · no auto-walk |
| 4 | Legacy `movePlayhead(manual)` | unchanged | unchanged | — | — | — | — | PASS · rejected |
| 5 | TAKE VDJ (RVTR604727) | VIRTUALDJ | **frozen** Program id | VDJ air item | To Love Somebody | To Love Somebody | Now Playing + artwork | PASS |
| 6 | RETURN | exact frozen RVBA | restored | Program | frozen title | frozen title | Program slide | PASS |
| 7 | PAUSE + 3s hold | same asset | paused | paused | same | same | same | PASS |
| 8 | RESUME | same asset | playing | playing | same | same | same | PASS |
| 9 | END SHOW | READY | paused | session cleared | standby | standby | — | PASS |

Trace: `artifacts/booth-sprint8/public-mock-show-trace.json`

### Failure tests

| Case | Result |
|---|---|
| Legacy transport during Booth session | Rejected with `BoothAuthorityError` |
| Missing / unknown Program anchor | No index-0 fallback (unit + kernel) |
| Duplicate ownership publish | Idempotent skip via `lastBoothPublishedKey` |
| GO LIVE without Load Show | 409 fail-closed (Sprint 7) |
| Real VDJ bridge TAKE | **Not exercised** — bridge not publishing live identity this run; synthetic RVTR used and resolved on public |
| Publisher unavailable | Not re-broken; Confirmed only when push synced |
| 20-minute wall-clock dwell | **Not run** — compressed multi-cut proof (~2 min) with >duration dwells |
| Booth browser refresh mid-show | Documented (client resets; re-Load); not re-run this sprint |
| Studio process restart mid-show | Disk playhead persists; Booth UI must re-Load — not re-run this sprint |

---

## 6. Screenshots

| File | Content |
|---|---|
| `artifacts/booth-sprint8/screenshots/booth-idle.png` | Booth faceplate OFF AIR |
| `artifacts/booth-sprint8/screenshots/public-program-slide.png` | Public Program RVBA (“The Closest Thing to Hell on Earth”) |
| `artifacts/booth-sprint8/screenshots/public-vdj-now-playing.png` | Public VDJ Now Playing |
| `artifacts/booth-sprint8/screenshots/booth-sprint8-public-vdj-desktop.png` | Desktop public viewer — Bee Gees / RVTR604727 + artwork |

Mobile viewport resize tool unavailable in this environment; phone check remains on the supervised checklist.

---

## 7. Publish / ownership trace (mock show)

Representative keys from successful run:

1. `standby:READY` — end residual / load  
2. `air:Program:5ca05369-…` — GO LIVE · LIVE AID  
3. `air:Program:560f248a-…` — NEXT  
4. `air:Program:7e086d32-…` — NEXT  
5. `air:Program:13f54c14-…` — NEXT · Do They Know…  
6. *(legacy next rejected — key unchanged)*  
7. `air:VirtualDJ:RVTR604727:Bee Gees:To Love Somebody` — TAKE  
8. `air:Program:13f54c14-…` — RETURN to frozen  
9. *(PAUSE/RESUME — no new ownership key)*  
10. `standby:READY` — END SHOW  

One intentional ownership publish per cut. Local/Public **Confirmed** when publisher synced.

---

## 8. Remaining production blockers (supervised checklist)

1. **Real VirtualDJ bridge** — confirm TAKE uses live bridge artist/title/RVTR (not synthetic).  
2. **20-minute supervised dwell** — leave Booth Program on air; confirm no drift / no legacy steal.  
3. **Booth UI refresh** mid-show — re-Load Show; confirm no double publish; mirrors restore.  
4. **Studio restart** mid-session — confirm disk session + public Snapshot; operator recovery path.  
5. **Phone / mobile viewport** on public Live.  
6. **Production `retroverse.live`** (if distinct from local Live) — one cut with production push secret.  
7. Runtime health lamps on Booth UI showed Unknown in idle screenshot — confirm Runtime poller healthy before show.

---

## Definition of Done

| Criterion | Status |
|---|---|
| Legacy cannot alter Air / Program position during Booth session | **Met** (clear rejection) |
| Read requests do not change ownership | **Met** |
| Missing anchor fails closed | **Met** |
| Real Booth publish appears on public viewer | **Met** (localhost Live) |
| TAKE VDJ + RETURN end-to-end | **Met** (RVTR-linked; bridge live identity pending) |
| Ready for supervised live-event test | **Yes** |

**Execution state: COMPLETE**
