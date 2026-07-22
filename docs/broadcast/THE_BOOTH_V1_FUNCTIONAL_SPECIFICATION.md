# The Booth — Version 1 Functional Specification

**Project:** Retroverse Broadcast  
**Sprint:** The Booth — Version 1 Functional Specification  
**Date:** 2026-07-21  
**Status:** **Authoritative implementation contract for Booth Version 1**

**Supersedes (for V1 build decisions):** where this document and earlier Booth design docs disagree, **this document wins**.

**Source design pack (do not invent beyond these):**
1. [`THE_BOOTH_PRODUCT_SPECIFICATION.md`](./THE_BOOTH_PRODUCT_SPECIFICATION.md)
2. [`THE_BOOTH_OPERATING_MODEL.md`](./THE_BOOTH_OPERATING_MODEL.md)
3. [`THE_BOOTH_MIXER_CONTROL_SURFACE.md`](./THE_BOOTH_MIXER_CONTROL_SURFACE.md)
4. [`THE_BOOTH_LANGUAGE_STANDARD.md`](./THE_BOOTH_LANGUAGE_STANDARD.md)
5. [`THE_BOOTH_OPERATIONAL_STATE_MACHINE.md`](./THE_BOOTH_OPERATIONAL_STATE_MACHINE.md)
6. [`THE_BOOTH_TIME_MODEL.md`](./THE_BOOTH_TIME_MODEL.md)

**Out of scope for this sprint:** implementation code, React components, architecture redesign, visual mockups.

---

## 1. Executive summary

**The Booth** is the live production environment for Retroverse Broadcast. Inside it, the **Broadcast Mixer** is the operating console.

The Operator does not manage software architecture. The Operator controls **The Air** by cutting **Sources** with **TAKE** and **RETURN**.

Version 1 is intentionally small:

- Seven Primaries: `OFF` · `READY` · `PROGRAM` · `VIRTUALDJ` · `ANNOUNCEMENT` · `GIVEAWAY` · `EMERGENCY`
- Five Sources: Program · VirtualDJ · Announcement · Giveaway · Emergency
- One Owner of The Air at a time (or none when not On Air)
- Manual wins; Automatic is optional and suspended under Override
- Program Position freezes during interrupts
- Honest clocks; Show Log in Booth language

This document is the single reference used to build Version 1.

---

## 2. Unified Version 1 specification

### 2.1 Product statement

> The Booth is where Retroverse goes live.  
> The Mixer is how the Operator runs the Show.  
> Everything else in BobOS prepares the Show.

### 2.2 Operator truths (always knowable)

| Truth | Console meaning |
|---|---|
| What is live? | **On Air** Source + Asset |
| What is next? | Next Program Asset + Return Target |
| Why is it live? | Source reason (Program / VirtualDJ / Announcement / Giveaway / Emergency) |
| Who has control? | **Operator** or **Automatic** (Override lamp when Operator seized) |

### 2.3 Official vocabulary (locked)

Use Language Standard terms only on Operator surfaces.

**Core nouns:** The Booth · Broadcast Mixer · Show · Program · The Air · On Air · Source · Asset · Audience · Operator · Override · Hold · Automatic · Runtime · VirtualDJ · Announcement · Giveaway · Emergency · Return Target · Show Log · Elapsed · Remaining

**Core verbs / buttons:** `TAKE` · `RETURN` · `GO LIVE` · `HOLD` · `PREVIOUS` · `NEXT` · `PAUSE` · `RESUME` · `EMERGENCY STOP`

**Forbidden on console:** playhead, presentation, queue entry, feed, deck (as Booth metaphor), channel, publish/sync-as-take, “LIVE” as master lamp name, Return to Live

### 2.4 State record

```
Primary:     OFF | READY | PROGRAM | VIRTUALDJ | ANNOUNCEMENT | GIVEAWAY | EMERGENCY
Modifiers:   HOLD · OVERRIDE · AUTO
Conditions:  Program loaded · Runtime · VDJ link · Audience · Source availability
```

| Primary | On Air? | Source |
|---|---|---|
| OFF | No | None |
| READY | No | None |
| PROGRAM | Yes | Program |
| VIRTUALDJ | Yes | VirtualDJ |
| ANNOUNCEMENT | Yes | Announcement |
| GIVEAWAY | Yes | Giveaway |
| EMERGENCY | Yes | Emergency |

### 2.5 Console layout (contract)

| Zone | Contents |
|---|---|
| **Top** | Lamps: ON AIR · OVERRIDE · HOLD · EMERGENCY · RUNTIME · VDJ CONNECTED · VDJ PLAYING · AUTO · AUDIENCE |
| **Center** | On Air Source · Asset · CONTROL · Return Target · ELAPSED · REMAINING or RETURNS IN · monitors |
| **Left** | Pads: PROGRAM · VDJ · ANNOUNCE · GIVEAWAY · EMERGENCY |
| **Right** | Show name · Next Program Asset · Upcoming interrupt |
| **Bottom** | PREVIOUS · PAUSE · RESUME · NEXT · HOLD · TAKE · RETURN · GO LIVE · EMERGENCY STOP |
| **Secondary Bay** | Load Show · Arm/Disarm Automatic · Preview · Show Log · Open Runtime · Jump · End Show |

### 2.6 Final rules resolving prior conflicts

These are the **binding V1 resolutions** from cross-check (§6).

| Topic | Final V1 rule |
|---|---|
| Master air lamp | **ON AIR** only — never a competing master **LIVE** |
| VirtualDJ Primary name | **VIRTUALDJ** (not LIVE) |
| Enter Show | **GO LIVE** only from **READY** with Program loaded |
| Interrupt → Program | **RETURN** only (not GO LIVE) |
| Operator TAKE | Sets **OVERRIDE** on |
| RETURN → PROGRAM | Clears **OVERRIDE**, clears **HOLD**, clears Return Countdown; Program Position resumes at Return Target; ELAPSED resets for Program Asset |
| OVERRIDE suspends | Automatic VDJ Take, Automatic VDJ idle Return, other AUTO policy Takes/Returns |
| OVERRIDE does **not** suspend | Manual RETURN; Announcement **hard max** Return at 3:00 (Source completion safety); EMERGENCY STOP |
| EMERGENCY STOP | Allowed from READY and all On Air Primaries; **blocked** from OFF |
| From EMERGENCY | TAKE other Sources **blocked**; **RETURN** required first |
| NEXT / PREVIOUS | Only in PROGRAM without HOLD |
| PAUSE / RESUME | Only in PROGRAM (V1) |
| Program Position | **Frozen** whenever Primary ≠ PROGRAM |
| ELAPSED during HOLD | **Keeps running** |
| Unknown Remaining | Display `—` — never fake `0:00` |
| Skip | Not a separate button — use **NEXT** |
| TAKE from EMERGENCY | Illegal until RETURN |
| VDJ disconnect while VIRTUALDJ | → PROGRAM if Program loaded; else → EMERGENCY |
| Audience unconfirmed | Primary may change; AUDIENCE fault; do not celebrate success |
| FAULT | Condition, not a Primary |

---

## 3. Supported capabilities (Version 1)

| Capability | Included |
|---|---|
| The Booth as named live environment | ✓ |
| Broadcast Mixer console (faceplate contract) | ✓ |
| Sources: Program, VirtualDJ, Announcement, Giveaway, Emergency | ✓ |
| Exactly one Source On Air (or none) | ✓ |
| Primaries + HOLD / OVERRIDE / AUTO modifiers | ✓ |
| Buttons: TAKE, RETURN, GO LIVE, HOLD, PREVIOUS, NEXT, PAUSE, RESUME, EMERGENCY STOP | ✓ |
| Source pads + master TAKE | ✓ |
| Go Live / End Show (Secondary for End Show) | ✓ |
| Load Show (Secondary) | ✓ |
| Arm / Disarm Automatic (Secondary) | ✓ |
| Preview (Secondary) | ✓ |
| Runtime go/no-go monitoring | ✓ |
| VirtualDJ connected / playing status | ✓ |
| Local + Public monitor confidence (Audience Confirmed / Fault) | ✓ |
| Return to Program | ✓ |
| Hold / Release Hold | ✓ |
| Time model: ELAPSED, REMAINING/`—`, RETURNS IN, Hold/Emergency durations, warnings | ✓ |
| Announcement soft 2:00 / hard 3:00 Return | ✓ |
| Giveaway long warning 5:00 (manual Return) | ✓ |
| Emergency duration warnings | ✓ |
| Show Log (Language Standard format) | ✓ |
| Failure handling + recovery verbs | ✓ |
| Single Operator | ✓ |

---

## 4. Excluded capabilities (non-goals)

| Excluded | Notes |
|---|---|
| AI authoring / AI Workbench inside Booth | BobOS only |
| Research Center | BobOS |
| Song Workspace / package editing | BobOS |
| Catalog / metadata editing | BobOS |
| Pass management / production | BobOS |
| Credentials / admin / ops PIN workflows | BobOS |
| Advanced scheduling / multi-day planners | Later |
| Multi-operator / handoff lock | V2+ |
| Broadcast analytics / BI | V2+ |
| Sampler banks | V2+ |
| Sponsor / Intermission / Coming Soon as distinct Sources | Use Program Assets or V2 Sources |
| Return to Previous stack | V2+ |
| Rehearsal Primary vs Show | V2+ |
| Architecture / SSoT refactor of playhead systems | Separate engineering sprint — not Booth V1 product scope |
| Redesign of existing pages “while we’re here” | Forbidden by sprint rules |
| Automation beyond V1 AUTO (VDJ follow + defined Returns) | V2+ |
| Deep Runtime service control on faceplate | Open Runtime escape only |
| Presentation Studio as second mixer | Prep outside Booth |

---

## 5. Operator journeys

Each journey lists: preconditions → actions → expected Primary/Source → lamps → timers → log → Audience → Return.

### 5.1 Starting a Show

| Step | Action | Result |
|---|---|---|
| 1 | Enter Booth from BobOS | Toward READY (from OFF) |
| 2 | Load Show (Secondary) | Program loaded = yes |
| 3 | Confirm RUNTIME OK, VDJ as needed | Conditions healthy |
| 4 | **GO LIVE** | Primary **PROGRAM**; Source Program; ON AIR on; ELAPSED starts; OVERRIDE off (unless previously armed — V1: GO LIVE starts with OVERRIDE **off**) |
| Log | `GO LIVE` / or `TAKE` Program — `OK` when Audience confirmed |
| Audience | Program Asset On Air |
| Return | N/A (already Program) |

### 5.2 Taking VirtualDJ

| Step | Action | Result |
|---|---|---|
| Pre | PROGRAM (typical); VDJ CONNECTED |
| 1 | Arm **VDJ** pad |
| 2 | **TAKE** | Primary **VIRTUALDJ**; OVERRIDE on; ELAPSED reset; Program Position frozen; RETURN READY on |
| Log | `TAKE VirtualDJ {Asset} OK` (or UNCONFIRMED) |
| Audience | VirtualDJ Asset |
| Return | **RETURN** → PROGRAM |

### 5.3 Returning to Program

| Step | Action | Result |
|---|---|---|
| Pre | VIRTUALDJ / ANNOUNCEMENT / GIVEAWAY / EMERGENCY |
| 1 | **RETURN** | Primary **PROGRAM**; Source Program at Return Target; OVERRIDE off; HOLD off; ELAPSED reset; RETURNS IN cleared |
| Log | `RETURN Program {Asset} OK` (+ optional prior Source duration) |
| Audience | Program Asset |

### 5.4 Running an Announcement

| Step | Action | Result |
|---|---|---|
| Pre | On Air Primary; Announcement available |
| 1 | Arm **ANNOUNCE**; **TAKE** | Primary **ANNOUNCEMENT**; OVERRIDE on; ELAPSED runs; REMAINING if known |
| Warn | At 2:00 `Announcement running long` |
| Hard | At 3:00 Auto Return to PROGRAM even if OVERRIDE (completion safety) unless Operator already left |
| Manual | **RETURN** anytime |
| Log | TAKE / RETURN as Language Standard |

### 5.5 Running a Giveaway

| Step | Action | Result |
|---|---|---|
| 1 | Arm **GIVEAWAY**; **TAKE** | Primary **GIVEAWAY**; OVERRIDE on |
| Warn | At 5:00 `Giveaway running long` |
| End | **RETURN** only (no hard Auto Return) |

### 5.6 Entering Hold

| Step | Action | Result |
|---|---|---|
| Pre | PROGRAM / VIRTUALDJ / ANNOUNCEMENT / GIVEAWAY |
| 1 | **HOLD** | HOLD lamp on; Hold Duration starts; NEXT blocked; ELAPSED continues |
| End | **HOLD** off / RELEASE HOLD |

### 5.7 Emergency Stop

| Step | Action | Result |
|---|---|---|
| Pre | READY or any On Air Primary |
| 1 | **EMERGENCY STOP** | Primary **EMERGENCY**; OVERRIDE on; AUTO effects suspended; HOLD cleared; Emergency Duration starts |
| Log | `EMERGENCY Emergency {Asset} OK` |
| Audience | Emergency Asset |
| Note | From OFF: blocked |

### 5.8 Recovering from Emergency

| Step | Action | Result |
|---|---|---|
| Pre | EMERGENCY |
| 1 | **RETURN** | If Program loaded → PROGRAM; else → READY |
| Blocked until then | TAKE other Sources, GO LIVE, NEXT, PREVIOUS |

### 5.9 Closing the Show

| Step | Action | Result |
|---|---|---|
| 1 | Prefer RETURN to PROGRAM if interrupting |
| 2 | End Show (Secondary) | Primary READY or OFF; ON AIR off; timers session-complete |
| Audience | End state per Show plan (not invented here beyond leaving On Air Primaries) |

### 5.10 Automatic VirtualDJ (optional path)

| Step | Result |
|---|---|
| AUTO armed, OVERRIDE off, PROGRAM, VDJ playing per policy | Automatic TAKE → VIRTUALDJ (OVERRIDE remains off for pure Auto Take — **Final rule:** Auto Take does **not** set OVERRIDE; Operator TAKE does) |
| VDJ idle | RETURNS IN countdown → RETURN → PROGRAM |
| Operator TAKE anytime | OVERRIDE on; cancels pending Auto Return |

---

## 6. Operational rules (unified)

### 6.1 Ownership

1. At most one Source owns The Air.  
2. OFF/READY ⇒ no Source On Air.  
3. Ownership changes only via GO LIVE, TAKE, RETURN, EMERGENCY STOP, legal Automatic Take/Return, or documented disconnect policy.

### 6.2 Take / Return / Go Live

| Button | Essence |
|---|---|
| **TAKE** | Cut The Air to armed Source (not from OFF/READY/EMERGENCY) |
| **RETURN** | To Program (or READY if Emergency without Program) |
| **GO LIVE** | READY → PROGRAM only |

### 6.3 Override / Automatic

| Event | OVERRIDE | Automatic effects |
|---|---|---|
| Operator TAKE | On | Suspended |
| Automatic TAKE | Off | May continue per policy |
| RETURN → PROGRAM | Off | Resume if AUTO armed |
| EMERGENCY | On | Suspended |
| Announcement hard max Return | N/A (still executes) | Treated as Source completion, not AUTO policy |

### 6.4 Time

| Rule | V1 |
|---|---|
| ELAPSED | Per current Asset ownership; runs during HOLD |
| REMAINING | Known duration only; else `—` |
| RETURNS IN | Only pending Automatic Return |
| Program Position | Frozen when Primary ≠ PROGRAM |
| Announcement | Warn 2:00; hard Return 3:00 |
| Giveaway | Warn 5:00; manual Return |
| Emergency | Warn at 1:00 and every 1:00 |
| Hold | Warn 10:00 |
| Audience confirm | Warn 0:10; Fault 0:30 |

### 6.5 Failures

| Failure | Class | Behavior |
|---|---|---|
| Runtime FAULT | FAULT | Block GO LIVE; show message; Open Runtime |
| VDJ disconnected (not On Air) | WARNING | Pad unavailable |
| VDJ disconnected (VIRTUALDJ) | FAULT | → PROGRAM or EMERGENCY |
| Missing Announcement/Giveaway | Gate | Pad/TAKE blocked |
| No Program | Gate | GO LIVE blocked |
| Audience Fault | FAULT | Explicit; no false success |
| Emergency | Primary EMERGENCY | RETURN to recover |

### 6.6 Show Log

```
{HH:MM:SS}  {ACTION}  {Source}  {Asset?}  {Result?}
```

ACTIONS: TAKE · RETURN · GO LIVE · HOLD · RELEASE · PAUSE · RESUME · NEXT · PREVIOUS · AUTO · EMERGENCY · FAULT · CONFIRM

### 6.7 Inconsistencies discovered (and resolved)

| # | Conflict | Resolution (binding) |
|---|---|---|
| 1 | Operating Model used “Take Live” / “Return to Live” | Use **GO LIVE** and **RETURN** only |
| 2 | Example path used state name LIVE for VDJ | Primary = **VIRTUALDJ** |
| 3 | Control Surface listed Skip and Next | **NEXT** only |
| 4 | State Machine: any Operator TAKE ⇒ OVERRIDE; Time Model Announcement Auto Return blocked by OVERRIDE | Hard Announcement Return is **Source completion**, runs even under OVERRIDE |
| 5 | State Machine optional EMERGENCY from READY vs OFF disabled | **READY yes; OFF no** |
| 6 | GO LIVE from interrupt ambiguous in early drafts | **Block** — RETURN first |
| 7 | PAUSE on VDJ optional in state machine | **Disabled** on VDJ in V1 |
| 8 | Auto Take and OVERRIDE | Auto Take does **not** set OVERRIDE; Operator TAKE does |
| 9 | Product Spec “Take Live” slang | Retired for V1 console |
| 10 | FAULT as mental “state” vs Primary | FAULT is **Condition** only |

No new concepts were invented beyond these resolutions.

---

## 7. Acceptance checklist

Use as the Version 1 acceptance test suite. Each row is one Operator action class.

### 7.1 GO LIVE (from READY, Program loaded, Runtime OK)

| Expect | Value |
|---|---|
| Result | Primary PROGRAM |
| Source | Program |
| Lamps | ON AIR on; PROGRAM on; OVERRIDE off; EMERGENCY off |
| Timers | ELAPSED starts; REMAINING if known |
| Return | N/A |
| Log | `GO LIVE` / Program TAKE `OK` |
| Audience | Program Asset confirmed |

### 7.2 GO LIVE blocked (no Program)

| Expect | Value |
|---|---|
| Result | Stay READY |
| Message | `No Program loaded` |
| Log | optional FAULT/notification — no false OK |

### 7.3 TAKE VirtualDJ

| Expect | Value |
|---|---|
| Result | Primary VIRTUALDJ |
| Source | VirtualDJ |
| Lamps | ON AIR; VDJ; OVERRIDE on; RETURN READY on |
| Timers | ELAPSED reset; Program frozen |
| Return | Available → PROGRAM |
| Log | `TAKE VirtualDJ … OK/UNCONFIRMED` |
| Audience | VirtualDJ Asset |

### 7.4 RETURN from VirtualDJ

| Expect | Value |
|---|---|
| Result | Primary PROGRAM |
| Source | Program (Return Target) |
| Lamps | OVERRIDE off; VDJ off; PROGRAM on |
| Timers | ELAPSED reset; RETURNS IN clear |
| Log | `RETURN Program … OK` |
| Audience | Program Asset |

### 7.5 TAKE Announcement

| Expect | Value |
|---|---|
| Result | Primary ANNOUNCEMENT |
| Lamps | ANNOUNCE; OVERRIDE on |
| Timers | ELAPSED; REMAINING if known |
| At 2:00 | Warning message |
| At 3:00 | Auto RETURN → PROGRAM (even if OVERRIDE) |
| Log | TAKE / RETURN |

### 7.6 TAKE Giveaway

| Expect | Value |
|---|---|
| Result | Primary GIVEAWAY |
| At 5:00 | Warning only |
| End | Manual RETURN only |

### 7.7 HOLD on PROGRAM

| Expect | Value |
|---|---|
| Result | Primary PROGRAM + HOLD |
| Lamps | HOLD on |
| Timers | Hold Duration; ELAPSED continues; NEXT blocked |
| Release | HOLD off |

### 7.8 NEXT / PREVIOUS

| Expect | Value |
|---|---|
| On PROGRAM, no HOLD | Asset changes; ELAPSED reset; stay PROGRAM |
| On HOLD or non-PROGRAM | Blocked |

### 7.9 PAUSE / RESUME

| Expect | Value |
|---|---|
| On PROGRAM | Freeze/resume Program Remaining & advance |
| Elsewhere | Blocked |

### 7.10 EMERGENCY STOP

| Expect | Value |
|---|---|
| From READY or On Air | Primary EMERGENCY; OVERRIDE on; HOLD clear |
| From OFF | Blocked |
| Lamps | EMERGENCY on; ON AIR on |
| Timers | Emergency Duration |
| Recovery | RETURN → PROGRAM or READY |
| TAKE while EMERGENCY | Blocked |

### 7.11 VDJ disconnect while VIRTUALDJ

| Expect | Value |
|---|---|
| Result | PROGRAM (or EMERGENCY if no Program) |
| Log | FAULT + RETURN/TAKE |
| Message | `VirtualDJ disconnected` |

### 7.12 Audience not confirmed

| Expect | Value |
|---|---|
| At 0:10 | Warning confirming… |
| At 0:30 | AUDIENCE Fault; `Take not confirmed for Audience` |
| Success lamp | Not green-check until confirmed |

### 7.13 Automatic VDJ Take / Return

| Expect | Value |
|---|---|
| Preconditions | AUTO on, OVERRIDE off, policy met |
| Take | VIRTUALDJ; OVERRIDE stays off |
| Idle | RETURNS IN → RETURN → PROGRAM |
| Operator TAKE during countdown | OVERRIDE on; countdown cancelled; message |

### 7.14 End Show

| Expect | Value |
|---|---|
| Result | READY or OFF; ON AIR off |
| Source | None |

---

## 8. Deferred Version 2 ideas

Documented for later — **not V1**:

- Sampler banks  
- Return to Previous  
- Rehearsal Primary  
- Multi-operator lock  
- Sponsor / Intermission Sources  
- Richer analytics and show reports  
- Advanced scheduling  
- Automation beyond V1 AUTO  
- Mobile booth companion  
- Dual public destinations  

---

## 9. Open questions

None that block V1 implementation contracts. Remaining items are **engineering** (how existing playhead/Channel Zero systems map to this product model) and belong in a later architecture sprint — not product ambiguity.

| Item | Status |
|---|---|
| Mapping Booth Sources to current dual public render paths | Engineering follow-up — product behavior above is authoritative for UX/ops |
| Exact VirtualDJ idle seconds for Auto Return | Use existing Operating Model / current product default when implementing; expose as RETURNS IN |
| Emergency Asset art/copy | Prep in BobOS; Booth only Takes Emergency |

---

## Document authority

| Layer | Role |
|---|---|
| **This V1 Functional Specification** | Build contract |
| Prior Booth design docs | Rationale and detail; subordinate on conflict |
| Broadcast Architecture Audit | Current system reality — not Booth product behavior |

---

## Definition of Done

| # | Check |
|---|---|
| 1 | V1 capabilities and non-goals are explicit |
| 2 | Journeys cover start → VDJ → announce → giveaway → hold → emergency → close |
| 3 | Conflicts listed and resolved |
| 4 | Acceptance checklist covers actions, lamps, Source, log, timers, Return, Audience |
| 5 | No new concepts beyond conflict resolution |
| 6 | Implementation can proceed without inventing Operator behavior |

---

## Execution state

**COMPLETE** — Booth Version 1 Functional Specification is the single implementation reference. No code, no components, no architecture redesign.
