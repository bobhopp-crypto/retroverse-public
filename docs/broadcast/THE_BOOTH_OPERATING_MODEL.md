# The Booth — Operating Model

**Project:** Retroverse Broadcast  
**Sprint:** The Booth — Operating Model  
**Date:** 2026-07-21  
**Status:** Operator thinking model only — no screens, no code, no architecture redesign.

**Builds on:**
- [`THE_BOOTH_PRODUCT_SPECIFICATION.md`](./THE_BOOTH_PRODUCT_SPECIFICATION.md) — what The Booth is
- [`BROADCAST_MIXER_ARCHITECTURE_AUDIT.md`](./BROADCAST_MIXER_ARCHITECTURE_AUDIT.md) — engineering reality (reference only; this doc does not redesign it)

---

## The question

**What is the operator actually controlling?**

Not code. Not queues. Not JSON. Not playheads.

**Bob believes he is controlling The Air** — what the audience experiences right now — by choosing which **Source** owns it, and by commanding **Take** and **Return** the way a director takes a camera or a DJ takes a deck.

When he enters The Booth, he should never have to think about software architecture. He should think like a DJ, radio operator, or television director.

---

## 1. Operator mental model

### One sentence

> I am in The Booth. In front of me is The Mixer. I put Sources On Air. Exactly one Source owns The Air. I Take; I Return; I never wonder if it worked.

### How it feels

| Role metaphor | What Bob is doing |
|---|---|
| **DJ** | Choosing which deck is in the house — Program, VirtualDJ, a pad, an announcement |
| **Radio operator** | Board op: cart / live mic / automation — always knowing what is feeding the transmitter |
| **TV director** | Calling “Take 2” — cutting the house to a chosen source, then returning to program |

The Booth is the room.  
The Mixer is the board.  
The Air is the transmitter.  
Sources are cameras / decks / carts.  
Take is the cut.  
Return is back to program.

### What Bob is *not* thinking

- Which JSON file updated  
- Which API owns homepage vs pass pages  
- Whether a playhead anchor moved  
- Whether Channel Zero and Playhead agree  

Those are engineering concerns. If they leak into operator language, the operating model has failed.

### The four always-known truths (operating form)

| Truth | Operator language |
|---|---|
| What is live? | **What is On Air** |
| What is next? | **What Program says is next** (when Program is the path back) |
| Why is it live? | **Which Source owns The Air** |
| Who has control? | **Operator (manual) vs Automatic policy** — still one Source on air |

---

## 2. Core concepts

Only concepts that earn a place in the operator’s head.

### Belongs (Version 1 vocabulary)

| Concept | Meaning |
|---|---|
| **The Booth** | The live room you enter to run the show |
| **The Mixer** | The board — primary place you Take and Return |
| **The Show** | Tonight’s event as a whole (“Sunday Night”) |
| **The Program** | Tonight’s planned rundown — the default Source path when nothing is interrupting |
| **The Air** | What the Audience is getting right now (first-class) |
| **The Audience** | People on the public experience — never in The Booth |
| **Source** | Anything that can own The Air |
| **On Air** | The Source that currently owns The Air |
| **Take** | Operator (or policy) cuts The Air to a Source |
| **Return** | Operator (or policy) gives The Air back along a known path — usually to Program |
| **Override** | Operator has seized control; automatic policy must not steal The Air |
| **Hold** | Stay on the current On Air intentionally; do not advance Program |
| **Announcement** | A prepared interrupt Source |
| **Giveaway** | A prepared live-moment Source |
| **Emergency** | Safe halt / blackout Source or action — highest priority |
| **Preview** | Seeing a Source without putting it On Air |

### Does not belong as operator vocabulary (engineering / prep)

| Avoid saying in The Booth | Why |
|---|---|
| Playhead, snapshot, payload | Architecture |
| Queue JSON / deck playlist file | Implementation of Program |
| Channel Zero / presentation store | Engineering names |
| The Stage / The Live Feed (as separate competing nouns) | Collapse into **On Air** + **Audience** |
| The Deck (as a product noun) | Easy to confuse with VirtualDJ decks; prefer **Source** and **Program item** |

**Note on “Deck”:** VirtualDJ has decks. The Booth does not need a second “Deck” metaphor. Bob points at **Sources**. VirtualDJ is one Source named VirtualDJ.

**Note on “Stage”:** Useful only as casual speech for “what’s showing.” Official term: **On Air**.

---

## 3. Air ownership model

### First-class rule

**At every moment, exactly one Source owns The Air.**

No dual owners. No “kinda live.” No silent second path the operator is expected to reconcile in his head.

(Engineering may still have debt. The *operating model* forbids asking the operator to manage that debt.)

### Who has The Air?

Displayed as a single ownership line the operator can read in one glance:

```
ON AIR: <Source name>
WHY: <short reason>
CONTROL: Operator | Automatic
```

Examples:

- `ON AIR: Program — “Open Bumper” · CONTROL: Automatic`  
- `ON AIR: VirtualDJ — “Sugar Sugar” · CONTROL: Operator`  
- `ON AIR: Announcement — “Doors” · CONTROL: Operator`  
- `ON AIR: Emergency — Blackout · CONTROL: Operator`

### How ownership changes

Ownership changes only by:

1. **Take** — cut The Air to a Source  
2. **Return** — give The Air back along a defined return path  
3. **Automatic Take / Automatic Return** — only when policy is armed and CONTROL is not Operator Override  
4. **Emergency** — immediate ownership by Emergency Source / stop state  

Nothing else should change On Air without the operator understanding it as one of the above.

### How ownership returns

Return is not “undo magic.” Return is a **directed handoff**:

| Return path | Meaning |
|---|---|
| **Return to Program** | Program owns The Air again at the correct Now/Next |
| **Return to Live** | (Alias for clear nights) Prefer **Return to Program** in V1 — “Live” means On Air, not a separate home |
| **Return to Previous** | Restore the Source that owned The Air before the last Take (stack depth 1 in V1) |
| **Automatic Return** | Policy returns after a condition (e.g. VDJ idle) — only if not overridden |
| **Cancelled Return** | A pending automatic return was cancelled because Operator Took or Armed Override |

### How ownership is displayed

Always:

- **Source name** (Program, VirtualDJ, Announcement, …)  
- **Identity of content** (item title / track / card name)  
- **CONTROL: Operator vs Automatic**  
- **Next Program item** (so Return destination is never a mystery)

Never:

- Two conflicting “now playing” truths without an explicit fault state  
- Ownership implied only by button color with no label  

### How ownership is logged

Every ownership change writes an operator-legible show log entry:

| Field | Example |
|---|---|
| Time | 21:14:02 |
| Action | TAKE / RETURN / AUTO TAKE / AUTO RETURN / EMERGENCY |
| From Source | Program |
| To Source | Announcement “Doors” |
| Control | Operator |
| Result | Confirmed On Air / Failed |

V1: log visible in Booth as a short “what just happened” strip or last N events — not a BI report.

---

## 4. Source model

### Everything that can go On Air is a Source

| Source | Operator meaning | V1? |
|---|---|---|
| **Program** | Tonight’s scheduled rundown | **Yes — primary** |
| **VirtualDJ** | House music / DJ performance via VirtualDJ | **Yes — primary** |
| **Announcement** | Prepared announcement moment | **Yes** |
| **Giveaway** | Prepared giveaway moment | **Yes** |
| **Emergency Card** | Technical difficulty / blackout / safe card | **Yes** |
| **Hold Card** | Explicit “we are holding” visual (optional distinct from Hold action) | Optional V1 |
| **Sponsor** | Sponsor spot as On Air Source | Later |
| **Intermission** | Break Source | Later |
| **Coming Soon** | Pre-show / tease card | Later (may ship as Program items first) |
| **Technical Difficulty** | Usually a flavor of Emergency Card | Fold into Emergency for V1 |

### How operators think about changing Sources

Not: “advance the playhead.”  
Instead: **“Take that Source.”**

Mental sequence:

1. What should the Audience see? → choose Source  
2. **Take** it → that Source owns The Air  
3. When done → **Return** (usually to Program)  
4. Confirm On Air matches intent  

### Program vs other Sources

- **Program** is both a Source and the **home base**.  
- Other Sources are usually **interrupts** or **takes** away from Program.  
- VirtualDJ may feel like a long take (a set), not a two-second cart — still one Source ownership model.

### Preview is not a Source on air

Preview lets the operator see a candidate. It does not own The Air until Take.

---

## 5. Take model

### Meaning of Take

**Take** = cut The Air to the named Source **now**.

It is a director’s cut, not a publish, not a save, not a sync prayer.

After a successful Take:

- Exactly one Source owns The Air (the one Taken)  
- CONTROL becomes **Operator** unless the Take was explicitly Automatic  
- Return path is defined (usually Return to Program)  
- Operator receives confirmation (see §8)

### Named Takes (operator language)

| Command | Meaning |
|---|---|
| **Take Live** | Put the intended show On Air — in V1 this means **Take Program** (or take the armed open). Prefer clearer label **Take Program** when Program is ready; **Go Live** may mean “enter show mode + Take Program.” |
| **Take Program** | Program owns The Air (at current Program Now) |
| **Take Announcement** | Named announcement owns The Air |
| **Take Giveaway** | Giveaway moment owns The Air |
| **Take VirtualDJ** | VirtualDJ owns The Air |
| **Take Manual** | Operator Override armed + Take of chosen Source/item — “I own this; Automatic stays out” |
| **Take Emergency** | Emergency Card / stop owns The Air |

### What Take does *not* mean

- Does not mean “draft published in CMS”  
- Does not mean “I clicked preview”  
- Does not mean “maybe local only”  
- Does not leave a second Source secretly On Air  

### Take Live clarification (V1 recommendation)

Avoid ambiguous **Take Live** if “Live” confuses with VirtualDJ Live.

Preferred V1 verbs:

- **Go Live** — show mode on; Program Taken (doors/open)  
- **Take &lt;Source&gt;** — cut to that Source  
- **Return to Program** — home  

If **Take Live** is kept as slang, define it in Booth copy as: *Take the current intended Program to The Air.*

---

## 6. Return model

**Return is as important as Take.**  
A Take without a known Return is a trap.

### Return types

| Return | Meaning | V1 |
|---|---|---|
| **Return to Program** | Program owns The Air again; Now/Next are coherent | **Required** |
| **Return to Live** | Do not use as a separate concept in V1 — collapses into Return to Program / Go Live language | Avoid |
| **Return to Previous** | Pop one Take — restore prior Source | **Nice-to-have** (depth 1) |
| **Automatic Return** | Policy returns when condition met (e.g. VDJ idle for N seconds) | Yes, if armed and not overridden |
| **Cancelled Return** | Pending Auto Return aborted because Operator Took or Override | Must be visible when it happens |

### Rules

1. Every Take declares its **default Return** (almost always Program).  
2. Operator Override **cancels** pending Automatic Return until Operator Returns or disarms.  
3. Return must never strand the operator in an unnamed state.  
4. If Return fails, ownership display shows fault — not a silent half-return.

### Automatic Return philosophy

Automatic Return is a **crew member**, not a ghost:

- Operator can see “Auto Return armed — when VirtualDJ idles”  
- Operator can cancel it by Taking or by Disarm  
- Operator never discovers after the fact that Program “came back” with no signal  

---

## 7. Failure handling philosophy

Failures are still Sources, statuses, or blocked Takes — never mystery silence.

| Failure | What the operator should experience |
|---|---|
| **VirtualDJ disconnects** | VirtualDJ Source goes **unavailable**. If it owned The Air → automatic **Return to Program** *or* **Take Emergency** per night policy (V1 default: Return to Program if Program exists, else Emergency). Banner: “VirtualDJ lost — Program has The Air.” |
| **No scheduled program** | Program Source unavailable. Go Live / Take Program **blocked** with reason. Operator can still Take Emergency / Hold Card. Never pretend Program is On Air. |
| **Announcement missing** | That Announcement Take is disabled; others remain. Message: “Announcement not loaded.” No partial Take. |
| **Giveaway unavailable** | Giveaway Take blocked with reason. Program remains operable. |
| **Network failure** | Booth shows **confidence fault**: “Public not confirmed.” Local intent may show as Taken; Audience confirmation incomplete. Operator gets Retry / see last confirmed On Air. Never green-check a Take the Audience did not get. |
| **Emergency stop** | Immediate Take Emergency (or Blackout). CONTROL: Operator. Clear **Return to Program** when safe. Loud, obvious, reversible when ready. |

### Philosophy lines

- **Fail loud.**  
- **Never fake On Air.**  
- **Always leave a door:** Return to Program or Emergency.  
- **Blocked is better than lying.**  

---

## 8. Operator confidence principles

The operator should never ask: **“Did that actually happen?”**

### After every operation

| Step | Confirmation |
|---|---|
| 1 | **Command acknowledged** — control shows the Take/Return was received |
| 2 | **Ownership updated** — ON AIR label matches the command |
| 3 | **Audience confirmation** — Public monitor (or last-confirmed) agrees, or fault is explicit |
| 4 | **Log line** — one new event in the show log |

If step 3 fails, the operation is **not** celebrated as success. It is **Take requested — Audience not confirmed**.

### Confidence principles

1. **Intent ≠ Air** until confirmed.  
2. **Local ≠ Public** until the public monitor agrees (or fault).  
3. **One On Air truth** — never two equal “now” panels that disagree without alarm.  
4. **Buttons reflect state** — you cannot Take an unavailable Source.  
5. **Return is always visible** after a Take away from Program.  
6. **Automatic actions announce themselves** before or as they happen.  

### Rehearsal vs Show (confidence note)

V1 may be Show-only. If Rehearsal exists later, confidence copy must say **REHEARSAL — not Audience** so Take never feels ambiguously real.

---

## 9. Version 1 recommendations

### Teach the operator these nouns only

Booth · Mixer · Show · Program · Air · Audience · Source · On Air · Take · Return · Override · Hold · Announcement · Giveaway · Emergency · Preview · Automatic

### V1 Source set

Program · VirtualDJ · Announcement · Giveaway · Emergency  

(Sponsor / Intermission / Coming Soon as Program items or later Sources.)

### V1 ownership

- Exactly one On Air Source  
- CONTROL: Operator | Automatic  
- Show log of Take/Return  
- Return to Program always primary  

### V1 Take / Return verbs

- Go Live (Take Program into show)  
- Take Program / Take VirtualDJ / Take Announcement / Take Giveaway / Take Emergency  
- Return to Program  
- Hold / Release Hold  
- Arm / Disarm Automatic (VirtualDJ follow + Auto Return policy)  

### V1 confidence

- On Air label + content identity  
- Public confirmation or explicit fault  
- Last event log line  

### V1 failure defaults

| Case | Default |
|---|---|
| VDJ drops while On Air | Return to Program (else Emergency) |
| No Program | Block Take Program; allow Emergency |
| Missing announcement/giveaway | Block that Take only |
| Network fault | Show unconfirmed; don’t claim Audience success |
| Emergency | Take Emergency immediately; Return when safe |

### Out of V1 operating model

- Multi-operator air lock  
- Deep return stacks  
- Separate “Return to Live” concept  
- Asking operator to understand playhead/architecture  
- Sources that aren’t real Sunday-night needs  

---

## How it feels (no mockup)

You walk into The Booth. The Mixer faces you. A lamp says what is On Air. You know the Source, the reason, and whether you or Automatic holds control. You Take the announcement — the lamp changes, the Audience monitor agrees, a log line appears. You Return to Program — home. VirtualDJ drops — Program takes back, the Booth tells you why. You never open a debugger. You never ask what JSON did. You run the show.

---

## Definition of Done checklist

| # | Another developer can… |
|---|---|
| 1 | Explain that Bob controls **The Air** via **Sources** |
| 2 | List V1 core concepts and reject architecture nouns |
| 3 | State the single-owner Air rule |
| 4 | Explain Take vs Return vs Automatic vs Cancelled Return |
| 5 | Describe failure behavior without inventing UI |
| 6 | List confidence steps after every operation |
| 7 | Know V1 Source set and verbs |

---

## Execution state

**COMPLETE** — Operating model defined. No screens, no code, no architecture redesign.
