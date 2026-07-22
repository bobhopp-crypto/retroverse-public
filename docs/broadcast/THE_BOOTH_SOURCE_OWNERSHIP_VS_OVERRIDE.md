# The Booth — Source Ownership vs Override

**Project:** Retroverse Broadcast  
**Sprint:** The Booth — Source Ownership vs Override  
**Date:** 2026-07-21  
**Mode:** Architectural review only — do not rewrite V1.  
**Authority:** [`THE_BOOTH_V1_FUNCTIONAL_SPECIFICATION.md`](./THE_BOOTH_V1_FUNCTIONAL_SPECIFICATION.md) remains the implementation contract.

**Background:** Multiple reviews agreed “Manual Wins” is correct, but encoding it as *every manual TAKE enables OVERRIDE* may be the wrong mechanism. No product changes in this sprint.

**Binding follow-up:** [`THE_BOOTH_V1_TAKE_OVERRIDE_DECISION.md`](./THE_BOOTH_V1_TAKE_OVERRIDE_DECISION.md) — V1 keeps the TAKE→OVERRIDE coupling intentionally; do not revisit in V1 implementation unless a defect is found.

---

## 1. Conceptual analysis

### 1.1 Source ownership (what it is)

**Source ownership** answers: *What is On Air?*

| Question | Answer class |
|---|---|
| Who owns The Air? | Exactly one **Source** (or none if OFF/READY) |
| How does ownership change? | GO LIVE, TAKE, RETURN, EMERGENCY STOP, legal Automatic Take/Return, documented disconnect policy |

Ownership is **factual and exclusive**. It is not a preference. It is not a lock. It is the cut.

When the Operator presses TAKE VirtualDJ, the intended ownership change is:

> The Air was Program → The Air is VirtualDJ.

That sentence does **not** require any statement about automation policy.

### 1.2 Operator intent when pressing TAKE

TAKE means: **cut The Air to the armed Source now.**

| Transition | Likely intent |
|---|---|
| Program → VirtualDJ | Put the DJ on; run a set / song block |
| Program → Announcement | Fire a cart; usually come back to Program |
| Program → Giveaway | Run a ceremony; come back to Program |
| VirtualDJ → Announcement | Brief interrupt **during** a set; often want DJ back |
| Announcement → (via RETURN) | End cart; go home (V1: Program) |
| Emergency (STOP) | Safe/halt content; not a “set” |

Critical distinction:

- Some Takes mean **“I am directing this segment; help me rejoin when it ends.”**  
- Some Takes mean **“Stop helping entirely until I say otherwise.”**  
- Some Takes mean **“Panic — nothing automatic should move.”**

V1 collapses the first two into one latch (OVERRIDE on). That is the mechanism under review — not the ownership cut itself.

### 1.3 Automation policy (what it is)

**Automation policy** answers: *May the system change ownership without a hand?*

Examples in V1:

- Automatic TAKE → VirtualDJ when AUTO armed  
- Automatic RETURN after VDJ idle  
- Announcement hard completion Return (V1 Spec: Source completion)

Automation is **permission + rules**, not ownership.

| When automation should help | When it should stop helping |
|---|---|
| Hands-off DJ follow with clear countdown | Mid-crisis / Emergency |
| Cart natural end → rejoin Program | Operator explicitly disables AUTO |
| Idle after music → rejoin (if that is the night’s deal) | Operator is mid-manual sequence and has said “don’t touch” |

**First-principles answer to “Should every manual TAKE imply automation must stop?”**

**No.**

A manual TAKE implies: *this ownership change was human-directed.*  
It does **not** logically imply: *cancel all future automatic ownership changes until OVERRIDE clears.*

Those are different sentences.

---

## 2. Separation (or not) of Source Ownership and Override

### 2.1 What OVERRIDE is — without regard to the current encoding

From first principles, OVERRIDE is best understood as:

| Candidate | Fit |
|---|---|
| A Source | No — does not own The Air |
| Ownership itself | No — ownership is Source |
| **A policy latch / mode** | **Yes** — “Automatic effects suspended” |
| A lock on The Air | Partially — locks *automation*, not Operator Takes |
| A permission | Yes — permission for Automatic to act = denied while latched |
| A Primary state | No — V1 correctly makes it a modifier |

**OVERRIDE = automation policy mode**, not ownership.

### 2.2 What “Manual Wins” is

**Manual Wins** is a **conflict-resolution principle**:

> When Operator intent and Automatic intent disagree about an imminent ownership change, Operator intent prevails.

That principle is about **arbitration at decision time**, not about **latching a mode on every successful cut**.

| Manual Wins (principle) | OVERRIDE-on-TAKE (V1 mechanism) |
|---|---|
| If Auto wants to Take while I am Taking — my Take wins | After my Take, Auto may not help until I RETURN |
| If Auto wants to Return while I am Holding crisis — my Hold/Emergency wins | My routine DJ Take disables idle Return |
| Momentary supremacy | Session-shaped suspension |

**They are separate concepts.**

V1 **binds** them: Operator TAKE ⇒ OVERRIDE on ⇒ Automatic suspended until RETURN clears OVERRIDE.

That binding is a design choice, not a logical identity.

### 2.3 Should ownership and Override be modeled independently?

**Yes — conceptually.**

| Axis | Model |
|---|---|
| Ownership | Source On Air (Primary) |
| Automation policy | AUTO armed/disarmed × OVERRIDE latch (or equivalent) × rule engine |

Independence does **not** require a V1 rewrite today. It means future reasoning (and V2 notes) should not treat “I Took” as synonymous with “OVERRIDE.”

Even inside V1-as-written, engineers should document mentally:

> OVERRIDE is a **modifier on automation**, accidentally coupled to TAKE for simplification.

---

## 3. Sunday-night workflow analysis

### Scenario A — Program → TAKE VirtualDJ → song ends

| | |
|---|---|
| **Natural Operator hope** | DJ was On Air; song ends / idle; Program comes back (or next bed) without a scavenger hunt |
| **V1 as written** | TAKE ⇒ OVERRIDE on ⇒ Automatic Return **suspended** ⇒ song ends ⇒ **nothing Auto** ⇒ Operator must RETURN |
| **Frustration** | Highest weekly bruise: Manual Wins encoded as “you own rejoin forever until RETURN” |
| **Ownership** | Correctly VirtualDJ after TAKE |
| **Policy** | Likely wrong for this intent |

**Verdict:** Ownership cut is right. OVERRIDE coupling is the pain.

### Scenario B — Program → Announcement → Return

| | |
|---|---|
| **Natural hope** | Cart plays; Return to Program (manual or cart-end) |
| **V1** | TAKE ⇒ OVERRIDE; manual RETURN works; hard 3:00 Return is Source completion (V1 Spec) even under OVERRIDE — Time Model still contradicts |
| **Frustration** | Medium — RETURN is obvious; timer contradiction is the landmine |
| **Policy need** | OVERRIDE latch mostly irrelevant if Operator always RETURNS carts by hand |

### Scenario C — VirtualDJ → Announcement → Return

| | |
|---|---|
| **Natural hope** | Often: back to **VirtualDJ** (set continues) |
| **V1** | RETURN → **Program** only; OVERRIDE clears; set dead |
| **Frustration** | Severe for DJ-shaped nights — but this is **Return Target policy**, not OVERRIDE coupling |
| **Note** | Separating OVERRIDE from TAKE does **not** fix Return-always-Program |

### Scenario D — Program → Giveaway → Return

| | |
|---|---|
| **Natural hope** | Ceremony, then Program |
| **V1** | Manual RETURN; no hard Auto Return; OVERRIDE on during ceremony |
| **Frustration** | Low if Operator remembers RETURN; OVERRIDE latch irrelevant if AUTO was about VDJ follow |

### Scenario E — Emergency → Recovery

| | |
|---|---|
| **Natural hope** | Safe Air; Automatic dead; conscious leave-safe |
| **V1** | EMERGENCY ⇒ OVERRIDE on; Automatic suspended; RETURN → Program |
| **Frustration** | Recovery-to-Program risk (separate issue); **OVERRIDE here is appropriate** |
| **Verdict** | Panic **should** suppress automation. Coupling OVERRIDE to Emergency is aligned with Manual Wins. Coupling OVERRIDE to routine TAKE is not required by the same logic. |

---

## 4. Design review — implement V1 exactly as written

### Where Operators will most likely become frustrated

1. **Scenario A** — TAKE VDJ, music ends, Program does not return; they “did it right” and still babysit RETURN.  
2. **Belief mismatch** — AUTO lamp still armed while OVERRIDE suspends effects (“armed but useless”).  
3. **Scenario C** — Announcement mid-set RETURNS to Program (not VDJ) — frustration attributed to “override” colloquially even when the real rule is Return Target.  
4. **Doc contradiction** — Announcement @ 3:00 vs OVERRIDE (Spec vs Time Model) → unpredictable yank or linger.

### Where future engineering becomes unnecessarily complex

1. Special-casing “Source completion Return ignores OVERRIDE” while “VDJ idle Return respects OVERRIDE” — two meanings of Automatic.  
2. Teaching support/docs why AUTO LED ≠ Automatic acting.  
3. Telemetry: correlating “manual Take” with “policy suspended” as one boolean forever.  
4. Any future “return to previous Source” must unwind OVERRIDE rules carefully or invent more latches.

### Where V1 makes a reasonable simplification

1. **One modifier** for “Automatic may not act” is easy to implement and test.  
2. **Emergency + OVERRIDE** is a clean panic story.  
3. **RETURN clears OVERRIDE** gives one obvious unlock verb.  
4. Avoids a second faceplate concept (“Automation lock” vs “Override”) in V1.

### Where V1 creates avoidable technical debt

1. Encoding **arbitration principle** as **sticky session latch on every TAKE**.  
2. Making the **common path** (manual VDJ Take) disable the **desired automation** (idle rejoin).  
3. Entangling ownership events with policy events in logs/state (TAKE always writes both).  
4. Leaving Announcement completion vs OVERRIDE inconsistent across frozen docs — debt interest compounding.

---

## 5. Recommendation

### Understanding (this sprint’s goal)

| Concept | Nature | Coupled in V1? |
|---|---|---|
| Source ownership | Fact: who is On Air | Changed by TAKE |
| Manual Wins | Conflict arbitration principle | Correct |
| OVERRIDE | Automation policy latch/mode | **Forced on by every Operator TAKE** |

**Manual Wins and OVERRIDE are not the same thing.**  
V1 uses OVERRIDE as a blunt instrument to approximate Manual Wins.

### Should V1 remain unchanged?

**Yes — for implementation under the frozen contract.**

Reasons to leave V1 text alone now:

1. It is the authoritative contract; this sprint forbids rewrite.  
2. The simplification (one latch, RETURN clears it) is shippable and testable.  
3. Changing coupling without a full state/time/log pass would fork the freeze mid-stream.  
4. Emergency behavior under OVERRIDE is sound and should not be casually unbundled in a partial edit.

**Remain unchanged** means: build V1 as written; do not “quietly” stop setting OVERRIDE on TAKE.

### What to believe while building

Implementers should **not** believe that OVERRIDE-on-TAKE is the deep meaning of Manual Wins. They should believe it is a **V1 approximation** with known Sunday-night friction on Scenario A.

---

## 6. Version 2 design note (record only — not a rewrite)

**V2 note — Automation policy independent of ownership cuts**

> Model **Source ownership** and **automation suspension** as separate axes.  
> **Manual Wins** remains: Operator actions win conflicts at decision time.  
> Do **not** require that every Operator TAKE enter an OVERRIDE latch that disables Automatic Return.  
> Preserve a deliberate “automation suspended” mode for Emergency and explicit Operator lock.  
> Routine Program ↔ VirtualDJ Takes should allow configured idle/rejoin automation unless the Operator has explicitly locked automation or is in Emergency.  
> Return-to-previous-Source remains a separate V2 concern from this note.

This note does not alter V1.

---

## One-page summary

```
OWNERSHIP     = who is On Air          (Source)
TAKE          = change ownership       (cut)
MANUAL WINS   = my cut beats Auto cut  (arbitration)
OVERRIDE      = Auto may not act       (policy latch)

V1 binds:  TAKE (manual) → OVERRIDE on
First principles: those arrows are optional, not identity.

Sunday pain: TAKE VDJ → song ends → Auto Return dead.
V1 choice: keep binding (simpler).
V2 note: unbind routine TAKE from OVERRIDE; keep OVERRIDE for panic/explicit lock.
```

---

## Execution state

**COMPLETE** — Architectural understanding only. V1 specification not rewritten.
