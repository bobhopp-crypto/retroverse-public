# The Booth V1 — Critical Review (Break Report)

**Project:** Retroverse Broadcast  
**Date:** 2026-07-21  
**Mode:** Critique only — no redesign, no behavior proposals framed as improvements.  
**Assumption:** Spec pack is frozen; this document exists to find failure before Sunday night.

**Reviewed:**
- Product Specification, Operating Model, Mixer Control Surface, Language Standard  
- Operational State Machine, Time Model, V1 Functional Specification, Paper Prototype  
- Cross-checked against Architecture Audit reality (dual public paths)

---

## Verdict

The Booth V1 pack is **internally mostly coherent as a board-op fantasy** and **dangerously incomplete as a live Sunday-night contract**.

The elegant ideas — one Air owner, Take/Return, frozen Program, Override — look clean on paper. Several of them **fight each other under pressure**, and one claimed “resolution” is **still contradicted** by the Time Model text. Worse: the product insists on a single On Air truth while the real system (Architecture Audit) still has **two public render paths**. Shipping the Mixer UI on that foundation will train the Operator to trust lamps that can lie.

**Would I trust this unmodified on a packed Sunday night?** Not yet.

---

## Severity key

| Sev | Meaning |
|---|---|
| **P0** | Can put wrong thing in front of Audience or strand Operator mid-show |
| **P1** | Likely confusion / wrong button under pressure |
| **P2** | Ambiguity that will fork implementations |
| **P3** | Complexity / elegance debt |

---

## 1. Contradictory operator behavior (still in the pack)

### P0 — Announcement hard Return vs OVERRIDE (unresolved)

| Document | Says |
|---|---|
| **V1 Functional Spec** (§5.4, §6.3, conflict #4) | Hard Return at 3:00 **even if OVERRIDE** (“Source completion”) |
| **Time Model** (§5 Announcement + §6 countdown) | Hard Return only if **not OVERRIDE**; if OVERRIDE → warning every 30s; countdown **cancels on OVERRIDE** |

Operator TAKE Announcement **always sets OVERRIDE**. Under Time Model rules, the 3:00 safety Return **never fires** for the normal Operator path. Under V1 Spec rules, it **yanks** at 3:00.

**Live failure:** Implementer picks one. Operator learns the other. Mid-announcement either gets cut unexpectedly or never auto-recovers while Operator is distracted.

V1 claims authority — but the Time Model was not brought into line. **The freeze is already broken.**

### P0 — Auto Return after Operator TAKE VirtualDJ is effectively dead

Rules:

1. Operator TAKE ⇒ OVERRIDE on  
2. OVERRIDE suspends Automatic Return (VDJ idle)  
3. RETURN clears OVERRIDE  

So: Operator Takes VDJ for a set → OVERRIDE on → VDJ goes idle → **no Auto Return**. Operator must remember to hit RETURN. The “Automatic” story only works for **hands-off Auto Take** paths.

**Live failure:** Operator expects “when the music stops, Program comes back.” It does not — because they touched TAKE like a DJ would. That is the most likely Sunday path, and Automatic **abandons them**.

### P1 — State Machine vs Time Model on Announcement “Auto Return default”

Time Model: Auto Return default **On** when duration known **and not OVERRIDE**.  
State Machine ownership table: Auto Return only if armed and not OVERRIDE.  
V1: hard completion Return ignores OVERRIDE.

Three different mental models for one cart.

### P1 — CONTROL label vs who last pressed a button

CONTROL = Operator | Automatic (policy).  
Operator can press NEXT all night with OVERRIDE off and CONTROL still read **Automatic**.

**Live failure:** Operator glances CONTROL to answer “who has control?” and gets a policy flag, not “I am driving.” Conflicts with Operating Model promise.

---

## 2. Situations where the Operator becomes confused

### P0 — Local Primary ≠ Audience reality

Spec allows Primary to change while Audience is UNCONFIRMED / FAULT (`Take not confirmed for Audience`). Console shows VIRTUALDJ; public may still show Program (especially given Architecture Audit dual paths).

**Live failure:** Operator trusts On Air Master. Room sees something else. They mash TAKE/RETURN. Confidence model admits the gap but **does not define what the Operator should do for 30+ seconds of lie**.

### P1 — ON AIR without GO LIVE

EMERGENCY STOP from READY → EMERGENCY, On Air, without ever pressing GO LIVE.

**Live failure:** “Did we go live?” Language says GO LIVE starts the Show; Emergency can put content On Air first. Doors walk-in + panic before GO LIVE = semantic mess.

### P1 — Armed pad + delayed TAKE

Two-step Take (arm pad → TAKE). No arm timeout. No “armed Source” permanent lamp requirement beyond selection.

**Live failure:** Arm VDJ, handle a distraction, later hit TAKE believing Program is selected → wrong Source On Air.

### P1 — HOLD vs PAUSE

Two freezes:

- HOLD: blocks NEXT + Auto advance; ELAPSED keeps running  
- PAUSE: freezes Remaining/advance in PROGRAM only  

**Live failure:** Under pressure these are the same button in the Operator’s head. Spec elegance; booth confusion.

### P1 — RETURN READY when already on PROGRAM

RETURN is noop on PROGRAM. Is RETURN READY lit? Dim? Off? Unspecified → inconsistent builds → Operator stares at a dead RETURN wondering if they’re stuck.

### P2 — ANNOUNCE pad vs “which announcement”

One pad. Picker in Secondary Bay. Mid-show: wrong cart armed, TAKE, wrong spot plays. Spec never defines default announcement identity under pressure.

---

## 3. Hidden state transitions

| Transition | Why it’s hidden | Live risk |
|---|---|---|
| VDJ disconnect → PROGRAM (or EMERGENCY) | No Operator button | Bumper/song hard-cut while Operator looks at decks |
| Announcement 3:00 → PROGRAM | Timer, not a hand | Cuts live mic/cart; worse if Operator thought OVERRIDE protected them |
| Auto TAKE → VIRTUALDJ | AUTO policy | Steals Air during a talkover if OVERRIDE off |
| Auto idle → PROGRAM | RETURNS IN may be missed | Program returns while DJ still “in the set” socially |
| Audience CONFIRM after delay | Async | Log OK appears after Operator already moved on |
| End Show → READY/OFF | Secondary; Audience end state hand-waved | Public left in undefined end |

Anything that changes Primary without a hand on TAKE/RETURN/GO LIVE/EMERGENCY is a **surprise**. Spec claims “nothing unexpected” then authorizes several surprises.

---

## 4. Race conditions

### P0 — TAKE in flight vs second TAKE / RETURN

Audience confirm window 0:10 warn / 0:30 fault. Nothing says commands queue, coalesce, or lock during UNCONFIRMED.

**Live failure:** Double-TAKE, or RETURN before confirm → order-dependent Air; Show Log lies; Operator cannot reconstruct what Audience saw.

### P0 — Hard Announcement Return vs Operator TAKE at T=2:59

Who wins? Undefined.

### P1 — Auto Return countdown vs HOLD

HOLD on VIRTUALDJ (allowed). Does HOLD pause idle detection? Cancel RETURNS IN? Spec silent.

### P1 — NEXT vs timed Asset end (PROGRAM)

Both can advance Program Position. Simultaneous edge undefined.

### P1 — VDJ disconnect policy vs Operator RETURN same instant

Two paths to PROGRAM; Override/log/elapsed reset order undefined.

### P2 — GO LIVE while Runtime flips FAULT mid-press

Block rules exist for READY; mid-transition not specified.

---

## 5. Timing ambiguities

### P0 — What RETURN does to the Program Asset media

On interrupt, Program Position freezes. On RETURN, ELAPSED **resets to 0:00**.

Unresolved for the Audience:

- Restart the bumper/video from the beginning?  
- Continue mid-asset while Booth shows 0:00?  
- Skip to Next because Remaining expired in wall time while frozen?

**Frozen position + reset ELAPSED is a timer fiction unless media semantics are defined.** Spec defines Booth clocks, not Audience timeline. That gap is fatal for “predictable time.”

### P1 — Program Assets with unknown duration

REMAINING = `—` forever. When does Program auto-advance? Only NEXT? Silent idle warning at 15:00 — weak for a rundown.

### P1 — RETURNS IN vs REMAINING single slot

Priority defined, but during Announcement with known REMAINING **and** a pending hard Return, which label shows? Hard Return is not always “RETURNS IN” in Language Standard. Easy to mis-implement; easy to misread.

### P1 — Idle seconds for VDJ Auto Return

V1 open question: “use existing default.” Not a number. Two engineers will ship two shows.

### P2 — Soft warnings without Operator acknowledgment

Warnings stack (Announcement long, Hold long, Audience fault). No priority of message strip under multi-fault. Noise = ignored lamps.

---

## 6. Unsafe emergency behavior

### P0 — RETURN from EMERGENCY immediately restores PROGRAM

Emergency was pressed because something was wrong. RETURN puts Program (frozen Asset) straight On Air — possibly the **same bad content** that caused the panic.

No hold-in-Emergency, no force-Next-on-recover, no Preview-before-leave-Emergency in V1.

**Live failure:** Panic → blackout → RETURN → problem returns.

### P0 — EMERGENCY Asset missing / undefined

If Emergency card not loaded, does STOP fail? Show blank? Stay on previous Source with EMERGENCY lamp? **Unspecified.** Worst class of Sunday bug.

### P1 — EMERGENCY STOP blocked from OFF

Edge case, but “Booth open, Primary OFF, need blackout” — blocked. Rare; still a hole.

### P1 — Cannot TAKE from EMERGENCY

Must RETURN first. If RETURN lands on broken Program, Operator cannot TAKE VDJ without leaving Emergency first — forced through the dangerous path.

### P2 — Emergency from READY puts Show On Air before intentional GO LIVE

See confusion §2. Also: Audience may receive Emergency card while “doors” assumed dark.

---

## 7. Return scenarios that are unclear

| Scenario | Gap |
|---|---|
| Mid-VDJ-set → TAKE Announcement → RETURN | Returns to **Program**, not VirtualDJ. Set is dead. Spec deferred “Return Previous” to V2 — **this will happen every week.** |
| TAKE Giveaway from VIRTUALDJ → RETURN | Same — kills DJ set |
| RETURN during UNCONFIRMED Take | Does local Primary revert? Stay? Audience? |
| RETURN noop on PROGRAM while Audience still on old interrupt (desync) | Operator thinks they’re safe; Room isn’t |
| Auto Return cancelled by OVERRIDE — message once | Easy to miss; no persistent “you must RETURN manually” |
| Return Target after NEXT was desired during interrupt | Cannot advance Program while in VIRTUALDJ; must RETURN then NEXT — two steps while talking |

**The one-stack “always Return to Program” model is elegant and wrong for DJ-shaped nights.**

---

## 8. Operator mistakes under pressure (predictable)

| Mistake | Why the console invites it | Consequence |
|---|---|---|
| Hit TAKE without checking armed pad | Two-step Take | Wrong Source |
| Hit GO LIVE instead of RETURN | Similar “big green commit” energy in Cut Bus | Blocked — but wasted seconds; panic rises |
| Hit EMERGENCY STOP near TAKE | Paper says gap; software layouts will shrink gap | Full Emergency mid-show |
| Forget RETURN after Operator VDJ Take | Auto Return dead under OVERRIDE | Dead air / idle VDJ On Air |
| HOLD instead of PAUSE or reverse | Dual freeze | Unexpected NEXT or stuck Remaining |
| RETURN from Emergency too fast | Recovery is one button | Bad Program returns |
| Trust AUDIENCE green from earlier Take | Lamp semantics over time underspecified | False confidence |
| Open Runtime mid-show (Secondary) | Runtime FAULT message says check Runtime | Leaves Mixer; loses Air awareness |
| Assume Announcement won’t cut at 3:00 | Doc contradiction | Yanked cart |

---

## 9. Unnecessary complexity

| Complexity | Cost |
|---|---|
| Primary + Modifier + Condition + Armed Source + Asset + CONTROL + AUTO lamp-on-but-suspended | Seven layers to answer “what’s going on?” |
| OVERRIDE vs AUTO armed-but-suspended | Two lamps can both be “on” while Automatic does nothing — classic false hope |
| HOLD and PAUSE | One freeze would survive Sunday; two will not |
| Source completion Return vs Automatic Return vs RETURNS IN vs REMAINING | Four timing dialects |
| GO LIVE vs TAKE Program vs ON AIR lamp | Three “we’re live” ideas |
| Local vs Public monitors **plus** AUDIENCE lamp | Triple confirmation UI on a system that may not have one public truth |

Elegance created **policy machinery**. Live booths want **few verbs** and **no footnotes**.

---

## 10. Elegant on paper → fails live

| Idea | Paper win | Sunday night failure |
|---|---|---|
| Exactly one Air owner | Clean mental model | Architecture Audit: dual homepage/playhead — product truth ≠ system truth |
| Manual always wins | DJ comfort | Makes Automatic useless on the path Operators actually use (manual TAKE) |
| Program freezes during interrupt | No hidden catch-up | RETURN media semantics undefined; set-interrupt-return kills DJ set |
| Announcement hard cap | Safety | Cuts real announcements; contradicted under OVERRIDE |
| Audience confirmation | Honesty | Leaves Operator in split-brain with no prescribed recovery choreography |
| Secondary Bay for Load/Auto/Log | Clean faceplate | Under fault, Operator leaves the “one screen” promise |
| Paper console regions | Sketchable | Does not confront multi-window BobOS / browser reality during faults |
| Language purge of “playhead” | Good UX copy | Implementers still glue to playhead; bugs will surface as copy/UX lies |

---

## 11. Architecture landmine (product-adjacent, not optional)

Architecture Audit: homepage and playhead/pass paths can disagree; AUTO VDJ may not drive homepage the way Mixer thinks.

V1 Spec §9 waves this as “engineering follow-up.”

**Brutal truth:** If engineering follow-up is deferred, **Booth V1 acceptance tests that require “Audience confirmed” are testing a fiction.** The Mixer can be pixel-perfect and still fail the Operating Model’s four truths in production.

That is not an implementation detail. That is the show.

---

## 12. Weaknesses checklist (pre-implementation)

| # | Sev | Weakness |
|---|---|---|
| 1 | P0 | Announcement 3:00 vs OVERRIDE still contradictory across docs |
| 2 | P0 | Operator VDJ Take disables Auto Return — surprise dead air path |
| 3 | P0 | Local/Audience desync with no recovery choreography |
| 4 | P0 | RETURN media semantics after freeze undefined |
| 5 | P0 | Emergency RETURN can restore the bad Program Asset |
| 6 | P0 | Emergency Asset missing behavior undefined |
| 7 | P0 | Dual public paths vs single Air ownership promise |
| 8 | P0 | Command races during UNCONFIRMED Take |
| 9 | P1 | Return-from-interrupt always to Program kills DJ sets |
| 10 | P1 | Hidden Auto Take / disconnect transitions |
| 11 | P1 | Arm+TAKE stale selection |
| 12 | P1 | HOLD vs PAUSE |
| 13 | P1 | ON AIR without GO LIVE |
| 14 | P1 | VDJ idle timeout not numeric |
| 15 | P1 | Hard Return vs TAKE race |
| 16 | P1 | HOLD vs Auto Return interaction unspecified |
| 17 | P2 | CONTROL means policy not “who is driving” |
| 18 | P2 | End Show Audience state undefined |
| 19 | P2 | Multi-warning message priority undefined |
| 20 | P3 | Seven-layer state record overwired for a booth |

---

## 13. What is actually strong

Credit where due — do not pretend the pack is worthless:

- Take/Return vocabulary is teachable  
- Faceplate regioning (On Air center, sources left, transport/cut bus bottom) matches real boards  
- Forbidding CMS/research inside Booth is correct  
- Explicit illegal transitions beat silent magic  
- Saying Audience must not false-green is the right instinct (even if incomplete)  
- Freezing Program (as a *policy* idea) is better than silent catch-up — **if** media semantics are later defined  

Strength of language ≠ readiness to run the room.

---

## 14. Bottom line

The Booth V1 specification is a **good director’s fantasy** with **several knife-edge contradictions** and **multiple Sunday-night footguns**, especially around Override×Automatic, Return-from-DJ-set, Emergency recovery, and Audience truth.

It is **not** yet a safe implementation contract if “safe” means: *a tired Operator at 10:40pm cannot put the wrong thing On Air by following the docs literally.*

Do not “improve” in this review.  
**Do not implement as if the freeze is clean — it isn’t (see Announcement/OVERRIDE).**

---

## 15. Pass 2 — additional breaks (same freeze, deeper cut)

### P0 — Preview is undefined as an Air-adjacent action

Preview sits in Secondary Bay and journeys. State machine never defines:

- whether Preview can show a Source the Audience is not on  
- whether Preview can be confused with On Air Master  
- what happens if Operator TAKEs while Preview is open on a different Asset  

**Live failure:** Operator “previews” the next bumper, glances center, thinks it’s On Air, walks away. Or Takes the wrong thing because Preview and On Air disagree with no mandatory labeling contract in the state machine.

### P0 — Two Emergency entry paths, one underspecified

| Path | Specified? |
|---|---|
| EMERGENCY STOP | Yes → Primary EMERGENCY |
| Arm EMERGENCY pad + TAKE | Allowed from PROGRAM in transition matrix (“TAKE EMERGENCY”) but journey focus is STOP |

**Live failure:** Pad+TAKE vs STOP may differ (confirmations, logging ACTION word EMERGENCY vs TAKE). Under panic, two doors to the same room with undocumented latch behavior.

### P0 — Load Show / Jump while On Air

Neither is forbidden in V1 while PROGRAM/VIRTUALDJ/etc. are active.

**Live failure:** Secondary Bay fat-finger Load Show mid-set swaps Return Target / Program Position under an interrupt. Jump during PROGRAM mid-song undefined vs NEXT. Show identity changes while ON AIR lamp still happy.

### P1 — GO LIVE remains on the faceplate all night

Cut Bus keeps GO LIVE beside TAKE/RETURN. Disabled mid-show, but still a large target.

**Live failure:** Wasted motion, panic confusion (“why won’t it go?”), accidental learning that the big button sometimes does nothing — erodes trust in all big buttons.

### P1 — TAKE PROGRAM while already PROGRAM = noop

Armed PROGRAM + TAKE does nothing. No mandatory feedback beyond optional message.

**Live failure:** Operator believes they “took Program” after an interrupt; still on VIRTUALDJ; keeps talking to the room.

### P1 — No dead-air / silence detection

Sources can be “On Air” with black frames, muted streams, or VDJ playing silence. Booth ELAPSED runs; Audience hears nothing. Not a Source fault in the model.

**Live failure:** Classic radio problem ignored. Lamps green, room empty.

### P1 — Session survival across refresh / disconnect

Primary OFF/READY/PROGRAM — what happens if the Booth browser tab dies mid-VIRTUALDJ?

**Live failure:** Operator reopens Booth; state resync undefined. May GO LIVE again, double-take, or show READY while Audience still on old Asset.

### P1 — End Show vs EMERGENCY vs leaving Booth

Three “stop-ish” ideas: End Show (Secondary), EMERGENCY, navigate away to Cockpit/Runtime.

**Live failure:** Closing the night has no single muscle memory. Audience end state explicitly undefined (“per Show plan”).

### P1 — Giveaway is a Source, not a ceremony

Real giveaways need hold-for-winner, mic time, maybe freeze UI. Spec is TAKE/RETURN only. Five-minute warning then nothing.

**Live failure:** Operator Runs “Giveaway Source” then needs human time the model doesn’t protect (and won’t hard-return — opposite Announcement problem).

### P2 — AUDIENCE lamp after a later successful action

If Take A was FAULT and Take B confirms, does AUDIENCE clear globally or per-Take? Underspecified → sticky red or false green.

### P2 — Show Log RESULT OK vs UNCONFIRMED vs CONFIRM

Operator under pressure does not read logs. Acceptance tests love logs. **Live booth ignores logs.** Relying on Show Log as safety is fantasy.

### P2 — “Open Runtime” as recovery

Runtime FAULT tells Operator to leave the Mixer. Violates one-screen Show promise at the worst moment. No in-Booth “what’s broken in one line” beyond a lamp.

### P3 — Language Standard vs engineer speech

Forbidding “playhead” in UI does not stop Discord/debug from using it. During an incident, Operator + helper will speak two dialects. Spec cannot fix that — but it pretends vocabulary unity equals operational unity.

### P3 — Paper prototype assumes one physical plane

Sunday night reality: VirtualDJ on another machine, phone texts, browser Booth, maybe public laptop. Eye-flow diagrams assume a single console. **The real eye travel includes other screens the Mixer cannot own.**

---

## 16. Condensed P0 list (do not implement blind)

1. Announcement @ 3:00 vs OVERRIDE docs still disagree  
2. Manual VDJ Take disables Auto Return  
3. Audience desync / dual public paths  
4. RETURN media after Program freeze undefined  
5. Emergency RETURN restores possibly-bad Program  
6. Emergency Asset missing undefined  
7. UNCONFIRMED command races  
8. Preview / Load Show / Jump Air-safety undefined  
9. Dual Emergency entry paths underspecified  
10. Interrupt → RETURN always kills DJ set (no previous Source)  

---

## Execution state

**COMPLETE** — Critique only (Pass 1 + Pass 2). No redesign.
