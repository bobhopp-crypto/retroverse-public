# The Booth — Assumption Review (Architectural)

**Project:** Retroverse Broadcast  
**Date:** 2026-07-21  
**Mode:** Question every major decision. Do not assume Bob is correct. Do not change the specification.  
**Output:** Strongest possible architectural review of assumptions — remain / reconsider recommendations only (non-binding).

**Scope:** Booth design pack through V1 Functional Specification, Operating Model, State Machine, Time Model, Control Surface, Language Standard, Critical Review, Failure Walkthrough, Industry Comparison.

---

## Method

For each major decision:

1. **Assumption** — what the spec treats as true  
2. **Why it might be wrong**  
3. **Why it might be right**  
4. **Recommendation** — Remain unchanged | Reconsider later | Likely wrong (still: no edits now)

Recommendations do **not** amend the frozen docs.

---

## Meta-assumptions

### M1 — A single Operator runs the Show

| | |
|---|---|
| **Assumption** | V1 is one human in The Booth. |
| **Wrong if** | Real nights need a door person + DJ + producer; one brain saturates. |
| **Right if** | Sunday Retroverse is actually Bob-shaped; dual-op is ceremony, not need. |
| **Recommend** | **Remain unchanged** for V1 intent. Revisit only with evidence of second-body pain. |

### M2 — The Booth is not BobOS

| | |
|---|---|
| **Assumption** | Prep tools must stay outside; live-event rule filters features. |
| **Wrong if** | Mid-show “fix the package” is common and walking to Song Workspace is slower than a thin Booth dock. |
| **Right if** | CMS-in-booth destroys muscle memory and invites catastrophic edits On Air. |
| **Recommend** | **Remain unchanged** — strongest correct assumption in the pack. |

### M3 — Operator language can ignore engineering dual paths

| | |
|---|---|
| **Assumption** | Exactly one Source owns The Air; engineering SSoT is a later sprint. |
| **Wrong if** | Dual homepage/playhead reality makes “one Air” a lie; confidence UX trains false trust. |
| **Right if** | Product must define desired truth even before systems catch up — otherwise you design the mess. |
| **Recommend** | **Remain as product doctrine**; treat as **Likely wrong as an implementation premise** until architecture converges. Spec can stay; shipping cannot pretend. |

### M4 — Manual always wins

| | |
|---|---|
| **Assumption** | Operator override beats Automatic. |
| **Wrong if** | Implemented as “manual TAKE poisons Auto Return,” which violates the Operator’s actual wish (own the cut, keep rejoin). |
| **Right if** | Automation must never fight a hand mid-crisis. |
| **Recommend** | **Remain as principle**; **Reconsider later** the *mechanism* (OVERRIDE-on-every-TAKE). Principle ≠ current encoding. |

---

## Sources

### S1 — There are five Sources (Program, VirtualDJ, Announcement, Giveaway, Emergency)

| | |
|---|---|
| **Assumption** | These five are the complete V1 On Air ontology. |
| **Wrong if** | Black/Slate should be first-class; Sponsor is weekly; “mic talkover” isn’t a Source but needs Air chrome; Announcement and Giveaway are both “carts” and shouldn’t be separate buses; VirtualDJ is an input name not a role. |
| **Right if** | Sunday nights really are program + DJ + two ceremony carts + panic; five pads fit a hand; more Sources become OBS. |
| **Recommend** | **Remain unchanged** for scope control. **Reconsider later** whether Emergency belongs in the same pad row (see E1) and whether Announcement/Giveaway collapse to a Cart bank. |

### S2 — VirtualDJ is a Source (named after an app)

| | |
|---|---|
| **Assumption** | The DJ feed is one Source labeled VirtualDJ. |
| **Wrong if** | Backup DJ laptop, DJM master, or non-VDJ performance appears; vendor name ages poorly; house PA ≠ Booth Source. |
| **Right if** | Retroverse’s real interrupt is VDJ; honesty beats abstract “LIVE DECK.” |
| **Recommend** | **Remain unchanged** for Retroverse identity. Note rename risk (“DJ” / “Deck A”) later. |

### S3 — Announcement and Giveaway are separate Sources

| | |
|---|---|
| **Assumption** | Two ceremony types deserve two pads and two Primaries. |
| **Wrong if** | Both are “play prepared Asset then Return”; separate Primaries double state space; wrong-pad mistakes rise; a Cart bank + Asset ID is enough. |
| **Right if** | Different timing policies (3:00 hard vs 5:00 soft) and different Operator psychology (spot vs ceremony). |
| **Recommend** | **Remain unchanged** while policies differ. If policies unify, **Reconsider later** collapse. |

---

## Return & Program

### R1 — Return always goes to Program

| | |
|---|---|
| **Assumption** | RETURN Return Target is Program (home base). No return-to-previous Source in V1. |
| **Wrong if** | DJ-shaped nights take a cart mid-set and need VDJ back; industry muscle memory is previous/PGM stack; this was called out as weekly bruise in industry + failure reviews. |
| **Right if** | Radio automation mental model; one home prevents stack confusion; single Operator can’t manage deep undo; Program is the show’s spine. |
| **Recommend** | **Likely wrong as the only long-term Return**; for frozen V1 **Remain unchanged** as deliberate radio-shaped choice — but mark as highest product debt. |

### R2 — Program freezes while other Sources own The Air

| | |
|---|---|
| **Assumption** | Program Position does not advance during interrupts. |
| **Wrong if** | Wall-clock posts (“hit the top of hour”) still matter; frozen bumper + ELAPSED reset creates media ambiguity; Operator wanted the rundown to keep time. |
| **Right if** | Hidden catch-up is worse; Operator must know Return Target; matches “nothing unexpected.” |
| **Recommend** | **Remain unchanged** as doctrine. **Reconsider later** media semantics on resume (not the freeze itself). |

### R3 — Program is both a Source and the home base

| | |
|---|---|
| **Assumption** | Program is On Air Source and the default Return Target. |
| **Wrong if** | Collapses two ideas: “scheduled rundown” vs “safe home”; sometimes home should be Black, not Program. |
| **Right if** | One noun for Operators; fewer lamps; matches “return to automation.” |
| **Recommend** | **Remain unchanged** for V1 simplicity. Black-as-home is Emergency’s job today. |

---

## Hold, Pause, Go Live

### H1 — Hold should exist

| | |
|---|---|
| **Assumption** | HOLD freezes advancement while keeping current On Air; ELAPSED continues. |
| **Wrong if** | PAUSE already freezes Program advance; two freezes cause panic errors; HOLD on VDJ/Announcement is rarely needed; “just don’t press NEXT” is enough. |
| **Right if** | Auto-advance / asset-end / AUTO policy need an explicit park; radio “hold the wheel” is real; ELAPSED continuing is correct for Audience truth. |
| **Recommend** | **Reconsider later** vs PAUSE merger. Not “remove now” — **Remain unchanged** until one freeze proves sufficient in drills. |

### H2 — Pause should exist (Program only)

| | |
|---|---|
| **Assumption** | PAUSE/RESUME affect Program Remaining/advance only. |
| **Wrong if** | Indistinguishable from HOLD under stress; VDJ pause belongs in VirtualDJ; dead control weight on faceplate. |
| **Right if** | Timed Program Assets need a true clock pause different from “block NEXT.” |
| **Recommend** | **Reconsider later** if most Program Assets have `—` Remaining (then PAUSE is theater). **Remain** if timed rundown is real. |

### G1 — GO LIVE should exist

| | |
|---|---|
| **Assumption** | Distinct verb READY → PROGRAM; not the same as TAKE Program. |
| **Wrong if** | Three “we’re live” ideas (GO LIVE, ON AIR, TAKE); sits on Cut Bus all night as fat-finger bait; ATEM users just Take; Emergency can put Air On without GO LIVE. |
| **Right if** | Show boundary ritual (“doors vs show”); blocks accidental On Air before Load Show; matches radio “join.” |
| **Recommend** | **Reconsider later** (merge into TAKE Program from READY, or demote off Cut Bus). For ritual value, **Remain unchanged** is defensible — but faceplate permanence is the weak part. |

---

## Emergency

### E1 — Emergency should be a Source

| | |
|---|---|
| **Assumption** | Emergency is a first-class Source/Primary owning The Air (card/blackout). |
| **Wrong if** | Emergency is a **mode** or **bus** (Black), not content; treating it like Giveaway invites pad+TAKE vs STOP duality; RETURN-from-Emergency restores Program (unsafe); missing Emergency Asset undefined. |
| **Right if** | Everything On Air is a Source keeps the ontology clean; Emergency card is real Audience content; one ownership rule. |
| **Recommend** | **Remain unchanged** as ontology. **Likely wrong** that recovery equals RETURN-to-Program without a sticky safe buffer — mechanism debt, not “delete Source.” |

### E2 — EMERGENCY STOP is separate from EMERGENCY pad

| | |
|---|---|
| **Assumption** | Panic stop vs arm-Emergency-then-TAKE. |
| **Wrong if** | Two doors; underspecified differences; panic wants one path. |
| **Right if** | Hardware doctrine: guarded stop ≠ bus select. |
| **Recommend** | **Remain unchanged** as hardware instinct; **Reconsider later** whether pad+TAKE Emergency is allowed at all. |

---

## Automatic & Override

### A1 — Return may be automatic

| | |
|---|---|
| **Assumption** | Auto Return exists (VDJ idle; Announcement hard completion per V1 Spec). |
| **Wrong if** | “Nothing unexpected” forbids unsolicited PGM changes; disconnect force-Return and 3:00 yank cause panic; OVERRIDE interaction is contradictory across docs; manual VDJ path disables the Auto Return Operators expect. |
| **Right if** | Hands-full DJs need rejoin; carts should end; silence after music is worse than surprise Return if countdown is obvious. |
| **Recommend** | **Remain** that *some* Auto Return may exist. **Likely wrong** as currently entangled with OVERRIDE. Architectural review: Automatic Return is not wrong; **this Automatic Return design is wrong.** |

### A2 — Operator TAKE always sets OVERRIDE

| | |
|---|---|
| **Assumption** | Any manual TAKE ⇒ OVERRIDE on; suspends Automatic. |
| **Wrong if** | Equates “I cut” with “disable rejoin”; industry default is manual cut without killing automation end-of-event; creates Auto Return dead zone on the primary DJ path. |
| **Right if** | Clear latch that Automatic cannot fight you mid-crisis. |
| **Recommend** | **Likely wrong** as encoded. Principle “manual wins mid-crisis” can remain without TAKE⇒OVERRIDE latch. |

### A3 — Auto Take VirtualDJ without OVERRIDE

| | |
|---|---|
| **Assumption** | AUTO may Take VDJ when armed and OVERRIDE off. |
| **Wrong if** | Steals Air during talkover; violates surprise principle; Secondary Arm is far from hands. |
| **Right if** | True hands-off follow mode for pure DJ blocks. |
| **Recommend** | **Reconsider later** — powerful, dangerous. Remain only with undeniable pre-Take countdown UX (not guaranteed today). |

---

## Console contents

### C1 — Runtime should appear on the console

| | |
|---|---|
| **Assumption** | RUNTIME lamp (and Open Runtime escape) on faceplate / tally row. |
| **Wrong if** | Dilutes PGM tallies with engineering; recovery leaves Booth; if Runtime is Booth host, lamp is comic; pros put facility alarms elsewhere. |
| **Right if** | Retroverse Booth is software-hosted; process death is a top Sunday failure; Operator needs go/no-go before GO LIVE. |
| **Recommend** | **Remain** a compact go/no-go. **Reconsider later** removing “Open Runtime” as mid-show recovery centerpiece. |

### C2 — Audience confidence should be visible

| | |
|---|---|
| **Assumption** | AUDIENCE confirmed/fault is first-class. |
| **Wrong if** | Binary lamp oversimplifies dual public paths; Local/Public monitors already exist; lamp can false-green/sticky-red; room Audience ≠ internet Audience. |
| **Right if** | Most honest idea in the pack; forces the product to confront plant truth; better than OBS optimism. |
| **Recommend** | **Remain unchanged** as intent. **Likely wrong** to allow Primary to lead confirmation — adjacent assumption, not the lamp itself. |

### C3 — Local + Public monitors on the faceplate

| | |
|---|---|
| **Assumption** | Both confidence views live in On Air Master. |
| **Wrong if** | Clutter; duplicates AUDIENCE; “Public” may not be one pipe. |
| **Right if** | Pros demand air probes; one lamp without picture is cargo cult. |
| **Recommend** | **Remain unchanged.** |

### C4 — Show Log on the console (Secondary)

| | |
|---|---|
| **Assumption** | Operator-legible Show Log matters in Booth. |
| **Wrong if** | Nobody reads logs mid-panic; acceptance tests overweight logs; forensic ≠ operational. |
| **Right if** | Post-segment “what did I just do?”; training; dispute resolution. |
| **Recommend** | **Remain** in Secondary. Do not promote to faceplate religion. |

### C5 — CONTROL Operator | Automatic display

| | |
|---|---|
| **Assumption** | CONTROL answers “who has control?” |
| **Wrong if** | Means policy latch, not “who last drove”; confuses Operating Model promise; OVERRIDE lamp already covers seizure. |
| **Right if** | Makes Automatic visible as a crew member. |
| **Recommend** | **Reconsider later** (rename or drop if OVERRIDE+AUTO lamps suffice). |

---

## State machine shape

### T1 — Primaries mirror Sources (plus OFF/READY)

| | |
|---|---|
| **Assumption** | PROGRAM / VIRTUALDJ / ANNOUNCEMENT / GIVEAWAY / EMERGENCY are Primaries. |
| **Wrong if** | Inflates state; HOLD/OVERRIDE as modifiers already complex; Announcement/Giveaway could be Program interrupts without new Primaries. |
| **Right if** | One glance Primary = Source On Air; matches lamps; easy teaching. |
| **Recommend** | **Remain unchanged** for teachability. |

### T2 — FAULT is not a Primary

| | |
|---|---|
| **Assumption** | Faults are Conditions. |
| **Wrong if** | Some faults *should* force a safe Primary (sticky Emergency); “stay PROGRAM while Runtime dead” is fantasy. |
| **Right if** | Avoids FAULT/On Air ontology collision; Operator always has a Primary. |
| **Recommend** | **Remain unchanged** as model — but **Likely wrong** that Runtime death leaves a meaningful Primary without a defined plant assumption. |

### T3 — OFF and READY exist

| | |
|---|---|
| **Assumption** | Cold / standby / On Air are distinct. |
| **Wrong if** | Extra ceremony; Emergency from READY puts Air before GO LIVE; OFF blocks STOP. |
| **Right if** | Prevents accidental Show; Load Show gate; clear pre-show. |
| **Recommend** | **Remain unchanged.** |

---

## Time

### TM1 — ELAPSED always runs during HOLD

| | |
|---|---|
| **Assumption** | Audience still watching ⇒ time accrues. |
| **Wrong if** | Operator wanted “pause the bit”; confuses with PAUSE. |
| **Right if** | Honest air time; industry as-run truth. |
| **Recommend** | **Remain unchanged.** |

### TM2 — Unknown Remaining shows em dash

| | |
|---|---|
| **Assumption** | Never fake 0:00. |
| **Wrong if** | Operators prefer rough estimates. |
| **Right if** | Lying clocks destroy trust. |
| **Recommend** | **Remain unchanged** — correct. |

### TM3 — Announcement hard max 3:00

| | |
|---|---|
| **Assumption** | Carts should not run forever; hard Return exists. |
| **Wrong if** | Live mic announcements exceed 3:00; fights manual wins; docs contradict OVERRIDE behavior. |
| **Right if** | Spot lengths are real; forgotten carts are real. |
| **Recommend** | **Reconsider later** thresholds and OVERRIDE interaction. Existence of *a* max is defensible. |

---

## Confidence & honesty

### K1 — Take may change Primary before Audience confirms

| | |
|---|---|
| **Assumption** | Local intent can lead; AUDIENCE fault if plant lags. |
| **Wrong if** | Violates program-out doctrine; Operator trusts center label; dual paths amplify. |
| **Right if** | UI must remain responsive; waiting for public RTT freezes the board. |
| **Recommend** | **Likely wrong** for a confidence-first Booth. Strongest architectural smell in the pack. |

### K2 — One AUDIENCE for room + internet

| | |
|---|---|
| **Assumption** | Single confidence concept. |
| **Wrong if** | Packed room can be fine while public is dead (and reverse); recovery playbooks differ. |
| **Right if** | V1 simplicity. |
| **Recommend** | **Reconsider later** — remain only if Retroverse Air is defined as public-first. |

---

## Faceplate & verbs

### F1 — Arm pad then TAKE (two-step)

| | |
|---|---|
| **Assumption** | Select Source, then cut. |
| **Wrong if** | Stale arm; under pressure wrong Take; ATEM often bus+auto or single row. |
| **Right if** | Prevents instant wrong-source on pad hit; matches switcher PVW/PGM discipline. |
| **Recommend** | **Remain unchanged** — correct production doctrine — if armed state is unmistakable. |

### F2 — NEXT only in PROGRAM

| | |
|---|---|
| **Assumption** | Cannot advance rundown during interrupt. |
| **Wrong if** | Operator wants to cue Next while VDJ plays; forces RETURN then NEXT. |
| **Right if** | Protects Return Target clarity; prevents silent Program edits. |
| **Recommend** | **Remain unchanged** given Return-always-Program. If Return-previous arrives, revisit. |

---

## Summary table

| Decision | Recommendation |
|---|---|
| Five Sources | Remain (collapse carts later optional) |
| Return always Program | Remain for V1; **highest long-term debt** |
| Hold exists | Remain; reconsider merge with Pause later |
| Pause exists | Remain only if timed Program real; else reconsider |
| GO LIVE exists | Remain as ritual; reconsider Cut Bus permanence |
| Emergency is a Source | Remain ontology; recovery mechanics likely wrong |
| Runtime on console | Remain lamp; reconsider mid-show Open Runtime |
| Audience confidence visible | **Remain** (intent correct) |
| Primary leads Audience confirm | **Likely wrong** |
| Auto Return exists | Remain idea; **current design likely wrong** |
| TAKE ⇒ OVERRIDE | **Likely wrong** encoding |
| Manual wins (principle) | Remain |
| Booth ≠ BobOS | **Remain** (strongest) |
| One Air owner (product) | Remain doctrine; **wrong as ship premise** until SSoT |
| Freeze Program on interrupt | Remain |
| Honest `—` Remaining | Remain |
| Arm then TAKE | Remain |
| FAULT not Primary | Remain model |
| Single AUDIENCE | Reconsider later |
| Show Log faceplate religion | Do not elevate |

---

## Strongest architectural conclusions

1. **The live-event boundary (Booth ≠ CMS) is the best assumption in the pack.**  

2. **“One Air owner” is the correct product doctrine and a dangerous implementation lie until public paths converge.**  

3. **Return-always-to-Program is a coherent radio choice and a poor DJ-booth choice** — the tension is unresolved on purpose, not by wisdom alone.  

4. **Automatic Return is not the villain; OVERRIDE-on-every-manual-TAKE is.** It breaks the weekend path.  

5. **Audience confidence visible is right; allowing PGM identity to lead the plant is wrong.**  

6. **Emergency-as-Source is fine; Emergency-RETURN-to-Program-as-recover is the weak joint.**  

7. **GO LIVE, HOLD, and five Sources are defensible scope choices**, not laws of nature — most vulnerable to merge/collapse under real drills, not under debate.  

8. **Runtime on the tally row is a Retroverse-hosting necessity**, not broadcast purity — accept the impurity or stop hosting the Booth in a flaky process.  

9. **The spec’s deepest risk is not missing features — it is assumptions that feel principled while encoding contradictory operator outcomes** (Announcement timers, Auto rejoin, confidence lead).  

10. **Bob is not automatically correct** where DJ-shaped nights meet radio-shaped Return, or where software hosting meets switcher doctrine. The pack is strongest when it picks one metaphor and weakest when it claims both.

---

## Closing

This review does not change The Booth.

It says which pillars should be bored into bedrock, which are scaffolding, and which look like marble but ring hollow when struck.

---

## Execution state

**COMPLETE** — Assumption review only. No specification changes.
