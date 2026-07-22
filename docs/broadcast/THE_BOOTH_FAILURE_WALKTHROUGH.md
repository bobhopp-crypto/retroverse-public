# The Booth — Packed-Event Failure Walkthrough

**Project:** Retroverse Broadcast  
**Date:** 2026-07-21  
**Mode:** Adversarial operations review — every failure fires. No redesign.  
**Authority:** Booth V1 Functional Specification + State Machine + Time Model + Language Standard (+ known Critical Review contradictions noted as gaps).

**Scenario:** Packed Sunday night. Operator is in The Booth on the Mixer. Audience is in the room and on the public site. Failures stack.

**Calm recovery standard:** Spec is “enough” only if a tired Operator can answer, without inventing behavior:

1. What just happened?  
2. What does the Audience see right now?  
3. What single verb do I press (or not press)?  
4. When am I safe to continue the Show?

---

## Scorecard legend

| Score | Meaning |
|---|---|
| **COVERED** | Spec states Operator-facing behavior + recovery verb |
| **PARTIAL** | Something is said; calm recovery still requires invention |
| **GAP** | Spec silent, contradictory, or sends Operator out of the Booth without a show-safe script |

---

## Night timeline — everything breaks

### F01 — VirtualDJ crashes (while VIRTUALDJ On Air)

| | |
|---|---|
| **What Operator sees (per spec)** | VDJ CONNECTED off / unavailable; message `VirtualDJ disconnected`; Primary forced → **PROGRAM** (or **EMERGENCY** if no Program) |
| **Recovery verb** | Already moved; “confirm Audience”; fix VDJ offline |
| **Score** | **PARTIAL** |

**Gaps:**
- Crash vs OSC disconnect not distinguished (same lamp language).  
- Forced cut to Program is a **hidden transition** — no “press RETURN” moment; Operator may still be looking at VDJ.  
- If Program Asset at Return Target is a short bumper already “used,” media restart semantics undefined (Critical Review).  
- No script for: *stay on Emergency instead of Program if music death should not reveal next bumper.*  
- “Fix VDJ offline” is outside Booth — no calm in-Booth checklist.

**Calm?** No. Room hears/sees a hard cut; Operator didn’t press anything.

---

### F02 — OSC disconnects (VDJ still running locally)

| | |
|---|---|
| **Spec** | OSC folded into **VDJ CONNECTED**; disconnect while On Air → same as F01 |
| **Score** | **PARTIAL** |

**Gaps:**
- Spec does not say whether VDJ can still be “playing” while OSC is dead (lamp VDJ PLAYING vs CONNECTED).  
- Operator cannot tell “link dead but music still in house PA” vs “VDJ died.”  
- No guidance: *Does Booth force Program while house still plays VDJ audio?* Split-brain audio/visual.

**Calm?** No — classic booth nightmare underspecified.

---

### F03 — Runtime dies (Studio process / Booth host)

| | |
|---|---|
| **Spec** | RUNTIME FAULT; `Runtime fault — check Runtime`; TAKE may be UNCONFIRMED; GO LIVE blocked from READY; recovery **Open Runtime** |
| **Primary change** | “No (stay Primary) unless policy Take Emergency” — policy not defined for Runtime death |
| **Score** | **GAP** |

**Gaps:**
- If Runtime is the Booth itself, **Open Runtime / Mixer UI may be dead.** Spec assumes a working faceplate.  
- What Audience does when Studio dies: **undefined** (public may keep last snapshot — Architecture Audit reality, not Booth contract).  
- No EMERGENCY-from-dead-UI path.  
- No “power through on public last state” vs “assume black” decision.  
- Stacked with internet loss: total fog.

**Calm?** No. Spec’s recovery verb requires the broken thing.

---

### F04 — Internet disappears (public unreachable; local Studio up)

| | |
|---|---|
| **Spec** | Audience → UNCONFIRMED then FAULT; `Audience unreachable` / `Take not confirmed for Audience`; “do not Take blindly”; fix network |
| **Score** | **PARTIAL** |

**Gaps:**
- Local On Air can still change; public frozen — Operator told not to Take blindly but **not told whether to HOLD, freeze Program, or announce to room only.**  
- Room Audience (physical) vs public Audience conflated in one **AUDIENCE** lamp.  
- No duration: how long to wait before Emergency / continue local-only Show.  
- RETURN/TAKE while FAULT: races undefined.

**Calm?** Partially for “don’t celebrate green.” Not for “what do I run for the next 20 minutes.”

---

### F05 — Announcement file missing

| | |
|---|---|
| **Spec** | Gate; pad disabled; `Announcement not loaded` / `{Source} unavailable`; TAKE blocked |
| **Score** | **COVERED** (for the miss itself) |

**Gaps:**
- No alternate path (speak live? skip? NEXT Program?). Spec only blocks.  
- Under pressure Operator may mash TAKE on stale arm — blocked, but **no suggested next verb.**  
- If file goes missing **while ANNOUNCEMENT already On Air** — **GAP** (only pre-Take unavailability covered).

**Calm?** For “can’t Take” yes. For “show must continue” no.

---

### F06 — Giveaway unavailable

| | |
|---|---|
| **Spec** | Same gate pattern as Announcement |
| **Score** | **COVERED** (pre-Take) |

**Gaps:**
- Mid-giveaway backend death while GIVEAWAY On Air — **GAP.**  
- No “end ceremony → RETURN” urgency beyond 5:00 warning (and warning only if still On Air and timer running).

**Calm?** Pre-show miss: yes. Mid-ceremony failure: no.

---

### F07 — Wrong button pressed

| Mistake | Spec behavior | Score |
|---|---|---|
| TAKE with wrong armed pad | Wrong Source On Air; OVERRIDE on | **PARTIAL** — recovery RETURN, but no undo-to-previous-Source |
| GO LIVE while already On Air interrupt | Blocked `Return first` | **COVERED** (blocked) — still burns panic time |
| TAKE while EMERGENCY | Blocked | **COVERED** |
| RETURN while already PROGRAM | Noop | **PARTIAL** — feedback optional |
| EMERGENCY STOP by accident | → EMERGENCY | **PARTIAL** — recover RETURN may restore bad Program |
| End Show mid-set (Secondary) | Underspecified if allowed On Air | **GAP** |
| NEXT during HOLD | Blocked | **COVERED** |
| NEXT during VIRTUALDJ | Blocked | **COVERED** — Operator wanted to skip ahead after Return; must two-step |

**Calm?** Wrong TAKE to cart/VDJ: RETURN home — calm **unless** they needed previous Source (DJ set). Accidental Emergency: **not calm** (recover path unsafe/unclear).

---

### F08 — Operator panic (no clear fault — just fear)

| | |
|---|---|
| **Spec path** | EMERGENCY STOP → EMERGENCY; later RETURN |
| **Score** | **PARTIAL** |

**Gaps:**
- Panic without knowing whether problem is local or public — EMERGENCY may black public while room PA still plays VDJ (if crash modes diverge).  
- RETURN from panic restores Program blindly.  
- No “breathe + look at PUBLIC monitor + don’t mash” script in Operator language beyond lamps.  
- Panic + wrong pad + TAKE before STOP — order-dependent mess, races **GAP.**

**Calm?** Panic button exists. Panic **recovery** is under-specified for a packed room.

---

### F09 — Power flicker

| | |
|---|---|
| **Spec** | **Silent.** No Primary, no lamps, no recovery journey. |
| **Score** | **GAP** |

**Gaps:**
- Booth host reboot → Primary? Show loaded? On Air? Audience?  
- Public CDN/site still up with stale Air?  
- VDJ machine flickered separately from Booth machine?  
- Does Operator GO LIVE again (double On Air)? End Show first?  
- Emergency Asset availability after reboot?

**Calm?** Zero. Spec assumes continuous electricity and process life.

---

### F10 — Compound: VDJ crash + internet down + Operator hits EMERGENCY

| | |
|---|---|
| **Spec pieces** | F01 force Program or Emergency; F04 Audience fault; F08 STOP → EMERGENCY |
| **Score** | **GAP** |

**Gaps:**
- If F01 already forced PROGRAM, then STOP → EMERGENCY — OK path exists.  
- If internet down, AUDIENCE never confirms Emergency — Operator doesn’t know if public blacked.  
- “Confirm Audience” impossible; next verb undefined.  
- OVERRIDE/AUTO lamps irrelevant noise.

**Calm?** No.

---

### F11 — Program Asset / media missing at forced Return

| | |
|---|---|
| **Spec** | Return Target is frozen Program Asset; missing media not discussed |
| **Score** | **GAP** |

**Gaps:**
- VDJ dies → PROGRAM → Asset file 404 / black.  
- Is that EMERGENCY? Failed Return? Stay on last frame?  
- Operator sees PROGRAM lamp + AUDIENCE fault — mashed options.

**Calm?** No.

---

### F12 — AUTO steals Air during talkover (OVERRIDE off)

| | |
|---|---|
| **Spec** | Legal Automatic TAKE → VIRTUALDJ when policy met |
| **Score** | **PARTIAL** (defined as allowed) |

**Gaps:**
- Feels like failure to Operator even when “working as designed.”  
- Cancel path: Operator TAKE (sets OVERRIDE) or Disarm AUTO in Secondary — under talkover, Secondary is wrong place.  
- No “AUTO about to Take” pre-roll alarm beyond general Automatic doctrine.

**Calm?** Spec-complete ≠ Operator-calm.

---

### F13 — Announcement hard-out at 3:00 mid-speech

| | |
|---|---|
| **Spec conflict** | V1 Functional Spec: hard Return even under OVERRIDE; Time Model: opposite |
| **Score** | **GAP** (contradiction) |

**Gaps:**
- Operator cannot predict yank vs linger.  
- Recovery after unexpected Return: continue speaking to wrong visuals.

**Calm?** Impossible while docs disagree.

---

### F14 — Booth browser tab crash / sleep (UI dies, processes maybe up)

| | |
|---|---|
| **Spec** | **Silent** |
| **Score** | **GAP** |

**Gaps:**
- Reopen Booth: OFF? READY? sync to existing On Air?  
- Duplicate GO LIVE risk.  
- Show Log continuity.

**Calm?** No.

---

### F15 — Wrong Show loaded / empty Program discovered after GO LIVE fails

| | |
|---|---|
| **Spec** | GO LIVE blocked if no Program; Load Show → GO LIVE |
| **Score** | **COVERED** pre-show |

**Gaps:**
- Program loaded but **wrong night’s Show** — no verification journey beyond Show name display.  
- Mid-show “this is the wrong rundown” — Load Show while On Air **GAP.**

**Calm?** Pre-show OK. Mid-show wrong rundown not calm.

---

### F16 — Audience FAULT sticky after later success

| | |
|---|---|
| **Spec** | Confirm clears on success implied; sticky behavior unspecified |
| **Score** | **GAP** |

**Gaps:**
- Lamp semantics after recovery — false fear or false green.

---

### F17 — Physical room OK, public broken (or reverse)

| | |
|---|---|
| **Spec** | Single AUDIENCE concept |
| **Score** | **GAP** |

**Gaps:**
- Packed **room** vs **internet** Audience are different recovery priorities. Spec cannot say which monitor is which beyond LOCAL/PUBLIC labels — no decision tree for “continue for the room.”

---

## Recovery calmness matrix

| Failure | Spec enough for calm recovery? | Dominant gap |
|---|---|---|
| VDJ crash On Air | **No** | Hidden cut; media after Return; audio split |
| OSC disconnect | **No** | Indistinguishable from crash; PA vs Booth |
| Runtime dies | **No** | Recovery UI may be dead |
| Internet down | **No** | No local-only show playbook |
| Announcement missing (pre-Take) | **Yes** (block only) | No alternate show verb |
| Announcement dies On Air | **No** | Unspecified |
| Giveaway unavailable (pre-Take) | **Yes** (block only) | Same |
| Giveaway dies On Air | **No** | Unspecified |
| Wrong TAKE | **Partial** | No return-to-previous |
| Accidental EMERGENCY | **Partial** | RETURN may restore problem |
| Panic (general) | **Partial** | Recover script weak |
| Power flicker | **No** | Entirely unspecified |
| Compound multi-fault | **No** | No priority doctrine |
| Program media missing on force-Return | **No** | Unspecified |
| AUTO surprise Take | **Partial** | Designed surprise |
| Announcement 3:00 | **No** | Spec contradiction |
| UI tab death | **No** | Unspecified |
| Wrong Show mid-night | **No** | Load while On Air undefined |
| Room vs public Audience | **No** | One lamp, two realities |

---

## What the spec *does* give the Operator (credit)

- Pre-Take gates for missing Announcement/Giveaway  
- Named messages for VDJ disconnect, Runtime fault, Audience unreachable  
- EMERGENCY STOP as a panic affordance from READY/On Air  
- RETURN as the primary “home” verb from interrupts/Emergency (when Program exists)  
- AUDIENCE lamp refusing false success (intent)  
- Block lists that prevent some illegal buttons mid-state  

These are necessary. They are **not sufficient** for a packed-room failure stack.

---

## Gap register (complete for this walkthrough)

### G1 — Process / power / UI death
Booth host down, power flicker, tab crash: no Primary, no resync, no double-GO-LIVE rule, no Audience assumption.

### G2 — Hidden ownership changes
VDJ/OSC loss auto-Program/Emergency without a hand; Operator situational awareness gap.

### G3 — Audio vs video authority
House PA (VDJ) vs Booth On Air vs public site — not modeled; OSC loss exposes it.

### G4 — Audience dual reality
Physical room vs internet; one AUDIENCE recovery story.

### G5 — Desync choreography
UNCONFIRMED/FAULT: no hold-still / retry / emergency decision tree; command races open.

### G6 — Force-Return media
Missing/bad Program Asset after VDJ death undefined.

### G7 — Emergency recover safety
RETURN from EMERGENCY can restore the failure Asset; Emergency Asset missing undefined; STOP vs pad+TAKE underspecified.

### G8 — No return-to-previous Source
Wrong TAKE / cart mid-DJ-set cannot restore VDJ without re-Take (and Auto Return poisoned by OVERRIDE).

### G9 — Mid-Air Source death
Announcement/Giveaway/Program file failure **while On Air** not specified (only pre-Take gates).

### G10 — Runtime recovery leaves the Booth
“Open Runtime” abandons one-screen calm; if Runtime is Booth, instruction is void.

### G11 — Internet-partition playbook
How to continue a packed **room** show when public is dark — absent.

### G12 — Timer/policy contradiction
Announcement hard Return vs OVERRIDE — Operator cannot trust time.

### G13 — Compound fault priority
No ordering when VDJ + Runtime + Audience + Panic coincide.

### G14 — Secondary actions while On Air
Load Show / Jump / End Show safety undefined — failure amplifiers under panic.

### G15 — Designed surprises
AUTO Take; disconnect force-cut — “working” yet Operator-unsteady.

---

## Final answer

**Does the current Booth specification provide enough information for the Operator to recover calmly when every failure occurs?**

**No.**

It provides enough information to **label some failures** and to **press RETURN or EMERGENCY STOP in the happy subset** of faults (missing cart before Take, clean interrupt Return, blocked illegal buttons).

It does **not** provide enough information to recover calmly from: process death, power flicker, UI death, OSC-vs-crash ambiguity, internet partition during a packed room show, mid-Air media loss, Emergency Asset gaps, forced cuts, desync races, or stacked failures — nor from the known Announcement/OVERRIDE contradiction.

For a packed event, the spec’s recovery model assumes **the Mixer still works, Program media is good, and Audience truth is knowable.** Those are the first three things to die on a bad Sunday.

---

## Execution state

**COMPLETE** — Failure walkthrough and gap register only. No redesign.
