# Booth V1 — Sprint 7: Run a Complete Show

**Date:** 2026-07-21  
**Definition of Done:** An operator can run a complete Retroverse show using only Booth controls. Legacy UIs may still exist; they are not required for normal operation.

**Runtime evidence:** `artifacts/booth-sprint7/complete-show-run.json`  
**Show used:** published Presentation `Broadcast Mixer` (60 enabled RVBAs)

---

## 1. Operator test matrix

Verify after every step: Presentation playhead · local Snapshot (`broadcast.json`) · Booth Store mirrors · `lastBoothPublishedKey` · no fabricated RVBA.

| # | Booth control | Expected | Runtime 2026-07-21 | Sync checks |
|---|---|---|---|---|
| 1 | Load Show | READY; first valid RVBA Current; **no publish** | PASS — `LIVE AID`; session inactive; `published:false` | Playhead anchored paused; Booth mirrors match |
| 2 | GO LIVE | PROGRAM owns air | PASS | `boothPublisher.source=Program` |
| 3 | (implied) Publish first RVBA | Exactly one Program publish | PASS — `air:Program:5ca05369-…` | Snapshot item = playhead anchor |
| 4 | NEXT | Advance one; publish once | PASS — `A Famine…` | Playhead + key updated together |
| 5 | NEXT | Advance one; publish once | PASS — `The Closest Thing…` | Same |
| 6 | PREVIOUS | Back one; publish once | PASS — back to `A Famine…` | Same |
| 7 | JUMP (exact id) | Land on exact id; publish if changed | PASS — exact id; idempotent if already current | No fuzzy match |
| 8 | TAKE VirtualDJ | Interrupt on air; Program playhead frozen | PASS — snapshot VDJ item; playhead stayed on Program id | No Program advance |
| 8b | NEXT while VDJ owns air | Update frozen Program return only; **no publish** | PASS — key unchanged; playhead advanced paused | Return target moves |
| 9 | RETURN | Restore frozen Program asset; publish once | PASS — restored advanced freeze from 8b | Program session again |
| 10 | PAUSE | Freeze progression; keep public asset; no republish | PASS — mode paused; key unchanged | |
| 11 | RESUME | Continue; republish only if playhead wrong | PASS — mode playing; same asset | |
| 12 | END SHOW | READY; clear Booth session | PASS — `standby:READY`; `sessionActive=false` | |

### Failure cases

| Case | Expected | Result |
|---|---|---|
| Publisher unavailable | Local state may update; Public Fault / non-synced push | Covered by existing publish Fault path (not re-broken this run) |
| Missing RVBA / JUMP bad id | Fail closed; no fabricate | PASS — JUMP `does-not-exist-rvba` rejected |
| End of Program | NEXT holds / loop per queue.loop; no invent | Relies on `movePlayhead` + `stepIndex` (Mixer show loops) |
| Beginning of Program | PREVIOUS holds / loop per queue.loop | Same |
| Repeated TAKE (same VDJ identity) | Idempotent skip | PASS — second publish skipped / same key |
| Repeated RETURN | Already on Program → NOOP in reducer; server restore needs return target | Predictable |
| GO LIVE without Program | Fail | **Fixed this sprint** — API now requires `programLoaded` + matching `presentationId` (client already blocked) |
| END SHOW while VirtualDJ owns air | Clear session; READY | PASS |

---

## 2. Files changed (Sprint 7)

| File | Change |
|---|---|
| `packages/shared/lib/bobos/booth/program-control.ts` | GO LIVE fail-closed without Load Show / presentation mismatch |
| `docs/broadcast/THE_BOOTH_SPRINT7_COMPLETE_SHOW.md` | This deliverable |
| `artifacts/booth-sprint7/complete-show-run.json` | Runtime matrix evidence |

No new operator features. No duplicate Program controllers.

---

## 3. Legacy ownership inventory

**Write chain (kernel):**  
`movePlayhead` / `publishBoothOwnership` → `syncBroadcast` → `saveBroadcastSnapshot` → `pushBroadcastToPublic` → `POST /api/retroverse-live/broadcast`

| Path | Entry | Mutates | Public sync? | Classification | Notes |
|---|---|---|---|---|---|
| Booth Load / Program / Publish APIs | `/bobos/booth` | Playhead + `boothPublisher` | Conditional / Yes | **Authoritative** | V1 show control |
| `publishBoothOwnership` | Booth APIs | Ownership + sync | Yes | **Authoritative** | Idempotent keys |
| `movePlayhead` / `syncBroadcast` / `publishPresentation` | store.ts | Kernel | Yes (default) | **Authoritative (kernel)** | Shared engine |
| Public broadcast ingest | live `POST …/broadcast` | Deployed Snapshot | Is public store | **Authoritative (ingest)** | |
| Presentation Studio on-air transport / Publish | `/bobos/presentation` | Playhead / queue | Yes | **Legacy** | Parallel air control |
| Broadcast Mixer deck live / step / cue | `/bobos/broadcast` | Publish + playhead | Yes when live | **Legacy** | Parallel surface |
| VDJ takeover pause/resume | `vdj-takeover.ts` + bridge | Snapshot mode / flags | Yes | **Legacy** | Gated when Booth session active |
| Orphan broadcast actions (`broadcastTransport`, `queueSequence`, `refreshBroadcastFromDatabaseXml`, …) | No UI | Playhead / publish | Yes | **Deprecated** | Show risk if called |
| Mixer / Studio as sole air controllers | — | — | — | **Future removal** | After Booth-only ops proven in production |
| Cockpit BroadcastPanel, playhead GET | Pollers | None* | Read | **Observer** | *GET may side-effect VDJ idle resume |
| Ops Live Control PATCH | `/ops/live-control` | LiveControlState only | No Snapshot | **Observer / out-of-band** | Not Broadcast Program |

Full narrative: see also `docs/broadcast/BROADCAST_MIXER_ARCHITECTURE_AUDIT.md`.

---

## 4. Remaining manual workflows (pre-show / out of Booth)

Still required **before** sitting at The Booth for a normal show:

1. **Build / edit Program queue** — Presentation Studio (or Mixer seed) — not a Booth job.
2. **Publish presentation & set active** — Studio Publish (Booth Load Show reads `activePresentationId` + published queue).
3. **VirtualDJ / bridge running** — for real VDJ TAKE identity (Booth observes Runtime; does not start VDJ).
4. **Public push credentials** — Studio→Live publisher configured for Confirmed Public.
5. **JUMP target id** — Booth Jump prompts for exact asset id (no fuzzy picker yet).

Not required for normal on-air operation anymore:

- Mixer Next/Previous/Cue while Booth session is active (still *capable*, not required)
- Presentation Studio transport during the show

---

## 5. Race conditions discovered

| Race | Severity | Notes |
|---|---|---|
| Parallel legacy writers (Mixer / Studio / VDJ) vs Booth | Medium | Booth session re-applied in `syncBroadcast`, but Mixer can still call `movePlayhead` with sync and fight the playhead |
| `resolvePlayhead` falls back to index 0 when anchor missing | Medium | Kernel still fabricates-by-fallback; Booth view deliberately does **not**. Keep Booth paths authoritative for operator UX |
| GO LIVE API previously ignored `programLoaded` | Fixed | Could take air from disk without Booth Load |
| GET playhead → `maybeResumeBroadcastAfterVdjIdle` | Low–Med | Observer path with write side-effect when Booth session inactive |
| Booth page refresh | Low | Client Store resets; disk playhead persists — re-Load Show (no publish) |
| In-flight ownership publishes | Mitigated | `ownershipAt` + `lastBoothPublishedKey` |
| NEXT during interrupt then RETURN | By design | RETURN restores **updated** freeze position, not pre-TAKE index |

---

## 6. Architectural recommendations

1. **Keep Booth as sole show-time writer** — mark Mixer/Studio transport “standby only” in UI when `boothPublisher.sessionActive`.
2. **Do not remove legacy yet** — inventory first (this doc); remove orphans in a later cleanup sprint.
3. **Align kernel missing-anchor behavior** with Booth (no silent index-0) when touching `resolvePlayhead` next — separate sprint.
4. **Pre-show checklist in Cockpit** — one panel: active presentation published? bridge up? publisher configured?
5. **Optional:** Booth Jump picker from loaded Program list (exact ids only) — UX, not new authority.
6. **Keep idempotent publish keys** as the duplicate-detection contract for tests and ops.

---

## 7. Checkpoint — Definition of Done

| Criterion | Status |
|---|---|
| Complete show sequence from Booth APIs only | **Met** (runtime artifact) |
| No duplicate Program controller | **Met** |
| Legacy inventory produced, nothing removed | **Met** |
| Failures fail predictably | **Met** (+ GO LIVE harden) |
| Old UIs unused for normal operation | **Met** (still exist) |

**Execution state: COMPLETE**
