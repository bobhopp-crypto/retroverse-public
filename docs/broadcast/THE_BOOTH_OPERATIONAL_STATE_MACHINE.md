# The Booth — Operational State Machine

**Project:** Retroverse Broadcast  
**Sprint:** The Booth — Operational State Machine  
**Date:** 2026-07-21  
**Status:** Operational contract only — no implementation code, no UI design, no architecture redesign.

**Authority documents:**
- [`THE_BOOTH_PRODUCT_SPECIFICATION.md`](./THE_BOOTH_PRODUCT_SPECIFICATION.md)
- [`THE_BOOTH_OPERATING_MODEL.md`](./THE_BOOTH_OPERATING_MODEL.md)
- [`THE_BOOTH_MIXER_CONTROL_SURFACE.md`](./THE_BOOTH_MIXER_CONTROL_SURFACE.md)
- [`THE_BOOTH_LANGUAGE_STANDARD.md`](./THE_BOOTH_LANGUAGE_STANDARD.md)

This document is the **operational contract** for future implementation. Every button press has a defined result. Every transition is intentional. The Air always has exactly one owner — or The Booth is not On Air.

**Language note:** Per the Language Standard, VirtualDJ On Air is state **VIRTUALDJ**, not “LIVE.” Master lamp remains **ON AIR**.

---

## How to read Booth state

The Operator’s state is a **record**, not a single vague word:

```
Primary:     OFF | READY | PROGRAM | VIRTUALDJ | ANNOUNCEMENT | GIVEAWAY | EMERGENCY
Modifiers:   HOLD · OVERRIDE · AUTO
Conditions:  Runtime · VDJ link · Audience · Program loaded
```

| Layer | Rule |
|---|---|
| **Primary** | Mutually exclusive. Answers “what kind of Booth operation am I in?” |
| **Modifiers** | Orthogonal flags on a Primary (except OFF). |
| **Conditions** | Concurrent health — may block commands without changing Primary. |

**Display sentence (always constructible):**

> `{Primary}` · On Air: `{Source}` — `{Asset}` · Control: `{Operator|Automatic}` · `{HOLD?}` · `{OVERRIDE?}`

When Primary is OFF or READY, On Air Source is **none** (Booth not On Air).

---

## 1. Complete Booth state list

### Primary states (final)

| Primary | On Air? | Source owning The Air |
|---|---|---|
| **OFF** | No | None |
| **READY** | No | None |
| **PROGRAM** | Yes | Program |
| **VIRTUALDJ** | Yes | VirtualDJ |
| **ANNOUNCEMENT** | Yes | Announcement |
| **GIVEAWAY** | Yes | Giveaway |
| **EMERGENCY** | Yes | Emergency |

No other Primaries in Version 1.

### Modifiers (final)

| Modifier | Meaning |
|---|---|
| **HOLD** | Advancement frozen; Source still owns The Air |
| **OVERRIDE** | Control = Operator; Automatic suspended |
| **AUTO** | Automatic armed (may Take/Return when rules allow) |

### Conditions (final — not Primaries)

| Condition | Values | Class |
|---|---|---|
| **Program loaded** | yes / no | Gate |
| **Runtime** | OK / FAULT | Fault |
| **VDJ link** | Connected / Disconnected | Fault or Warning |
| **Audience** | Confirmed / Unconfirmed / Fault | Warning → Fault if stuck |
| **Source availability** | per Source available / unavailable | Gate |

**FAULT** is not a Primary state. Faults are **Conditions** that constrain commands and light lamps. The Operator always still has a Primary.

**WARNING** = Condition that does not force a Primary change.  
**FAULT** = Condition that blocks critical commands and demands recovery.  
**Notification** = Show Log + message; may not block.

---

## 2. State definitions

### OFF

| Field | Definition |
|---|---|
| **Purpose** | Booth is closed; not running a Show |
| **Begins** | Operator leaves Booth session / explicit End Show / cold start before readiness |
| **Ends** | Operator enters Booth and readiness checks begin → READY (or stay OFF if abandoned) |
| **Source On Air** | None |
| **Operator expects** | No ON AIR lamp; no Take of Show Sources |
| **Available** | Load Show (prep), Open Runtime (escape), view status |
| **Disabled** | TAKE, RETURN, GO LIVE, HOLD, PAUSE, RESUME, NEXT, PREVIOUS, EMERGENCY STOP (or Emergency Stop allowed as local panic — V1: **disabled** until READY/On Air) |
| **Indicators** | ON AIR off; RUNTIME/VDJ may still show |

### READY

| Field | Definition |
|---|---|
| **Purpose** | Show prepared; waiting for GO LIVE |
| **Begins** | Program loaded (or explicitly cleared to empty ready); Runtime acceptable enough to standby; from OFF after enter Booth |
| **Ends** | **GO LIVE** → PROGRAM; or Program unloaded → stay READY with gate; or leave → OFF |
| **Source On Air** | None |
| **Operator expects** | Can arm Sources for Preview; GO LIVE is the front door |
| **Available** | GO LIVE (if Program loaded), PREVIEW, Load Show, Arm/Disarm AUTO, EMERGENCY STOP (optional V1: allowed → EMERGENCY even from READY) |
| **Disabled** | TAKE (except via GO LIVE path), RETURN, HOLD, PAUSE, RESUME, NEXT, PREVIOUS — unless Preview-only paths |
| **Indicators** | ON AIR off; RETURN READY off; Program loaded lamp/text |

**V1 recommendation:** EMERGENCY STOP from READY **is allowed** → Primary EMERGENCY (Audience safe card) so panic works before doors.

### PROGRAM

| Field | Definition |
|---|---|
| **Purpose** | Program owns The Air — home base of the Show |
| **Begins** | GO LIVE from READY; RETURN from any other On Air Primary; Automatic Return to Program |
| **Ends** | TAKE other Source; EMERGENCY STOP; End Show → READY/OFF; fault-driven Emergency policy |
| **Source On Air** | Program |
| **Operator expects** | Normal Show running; Next/Previous move Program Assets |
| **Available** | TAKE (other Sources), RETURN (no-op or confirm already Program), HOLD, PAUSE, RESUME, NEXT, PREVIOUS, GO LIVE (no-op or confirm), EMERGENCY STOP, Arm/Disarm AUTO |
| **Disabled** | TAKE Program when already PROGRAM (no-op OK); NEXT/PREVIOUS when Hold or no sibling Asset |
| **Indicators** | ON AIR on; PROGRAM on; OVERRIDE per Control; HOLD if held |

### VIRTUALDJ

| Field | Definition |
|---|---|
| **Purpose** | VirtualDJ owns The Air |
| **Begins** | TAKE VDJ (Operator) or Automatic Take when AUTO armed and rules fire |
| **Ends** | RETURN → PROGRAM; TAKE other Source; EMERGENCY STOP; VDJ disconnect policy → PROGRAM or EMERGENCY |
| **Source On Air** | VirtualDJ |
| **Operator expects** | House/DJ performance On Air; Return always obvious |
| **Available** | RETURN, TAKE (other), HOLD, EMERGENCY STOP, PAUSE/RESUME if defined for VDJ night policy (V1: Pause may be disabled for VDJ — see button table) |
| **Disabled** | NEXT/PREVIOUS (Program transport — disabled while not PROGRAM unless policy says otherwise); GO LIVE (no-op) |
| **Indicators** | ON AIR; VDJ; OVERRIDE typical (Operator Take sets OVERRIDE) |

### ANNOUNCEMENT

| Field | Definition |
|---|---|
| **Purpose** | Announcement owns The Air |
| **Begins** | TAKE ANNOUNCE when Announcement available |
| **Ends** | RETURN → PROGRAM; TAKE other; EMERGENCY STOP; natural end may Auto Return if armed |
| **Source On Air** | Announcement |
| **Operator expects** | Short interrupt; RETURN READY on |
| **Available** | RETURN, TAKE, HOLD, EMERGENCY STOP |
| **Disabled** | NEXT/PREVIOUS (V1); GO LIVE no-op |
| **Indicators** | ON AIR; ANNOUNCE |

### GIVEAWAY

| Field | Definition |
|---|---|
| **Purpose** | Giveaway owns The Air |
| **Begins** | TAKE GIVEAWAY when available |
| **Ends** | RETURN → PROGRAM; TAKE other; EMERGENCY STOP |
| **Source On Air** | Giveaway |
| **Operator expects** | Live moment; Return when done |
| **Available** | RETURN, TAKE, HOLD, EMERGENCY STOP |
| **Disabled** | NEXT/PREVIOUS (V1); GO LIVE no-op |
| **Indicators** | ON AIR; GIVEAWAY |

### EMERGENCY

| Field | Definition |
|---|---|
| **Purpose** | Emergency owns The Air — safe / halt |
| **Begins** | EMERGENCY STOP; TAKE EMERGENCY; policy on catastrophic fault |
| **Ends** | RETURN → PROGRAM (if Program loaded); else → READY with Emergency cleared |
| **Source On Air** | Emergency |
| **Operator expects** | Loud state; Show paused in spirit; recovery = RETURN when safe |
| **Available** | RETURN (if Program loaded), EMERGENCY STOP (stays EMERGENCY), Open Runtime |
| **Disabled** | TAKE other Sources (V1: blocked until RETURN); GO LIVE; NEXT; PREVIOUS; HOLD (clear on enter or ignore); PAUSE/RESUME |
| **Indicators** | ON AIR; EMERGENCY; OVERRIDE on; AUTO suspended |

### Modifiers in detail

#### HOLD

| Field | Definition |
|---|---|
| **Purpose** | Do not advance; keep current Source/Asset On Air |
| **Begins** | HOLD button from PROGRAM, VIRTUALDJ, ANNOUNCEMENT, GIVEAWAY |
| **Ends** | RELEASE HOLD / HOLD toggle off; or EMERGENCY STOP (clears Hold); or End Show |
| **Source On Air** | Unchanged |
| **Expects** | NEXT/PREVIOUS/Automatic advance blocked |
| **Illegal on** | OFF, READY (V1); EMERGENCY (Hold cleared / ignored) |

#### OVERRIDE

| Field | Definition |
|---|---|
| **Purpose** | Control = Operator; Automatic cannot change The Air |
| **Begins** | Any Operator TAKE; explicit Override arm; GO LIVE may set Override off or on per policy (V1: GO LIVE clears Override unless Operator had armed it) |
| **Ends** | RETURN to Program with Automatic re-enabled only if AUTO still armed; or explicit Disarm Override (if separate — V1: RETURN clears Override when returning to Program under AUTO policy) |
| **V1 rule** | Operator TAKE ⇒ OVERRIDE on. RETURN to PROGRAM ⇒ OVERRIDE off (Automatic may work again if AUTO armed). |

#### AUTO

| Field | Definition |
|---|---|
| **Purpose** | Automatic may Take VirtualDJ / Return per Operating Model |
| **Begins** | Arm Automatic (Secondary) |
| **Ends** | Disarm; OVERRIDE suspends effects without necessarily clearing the arm lamp |
| **When OVERRIDE on** | AUTO lamp may stay armed but **effects suspended** |

---

## 3. Transition matrix

### Legal Primary transitions

| From \ To | OFF | READY | PROGRAM | VIRTUALDJ | ANNOUNCEMENT | GIVEAWAY | EMERGENCY |
|---|---|---|---|---|---|---|---|
| **OFF** | — | Enter Booth / ready-up | — | — | — | — | — |
| **READY** | Leave Booth | — | **GO LIVE** | — | — | — | **EMERGENCY STOP** |
| **PROGRAM** | End Show* | End Show* | — | **TAKE VDJ** | **TAKE ANNOUNCE** | **TAKE GIVEAWAY** | **EMERGENCY STOP** / TAKE EMERGENCY |
| **VIRTUALDJ** | End Show* | End Show* | **RETURN** / Auto Return / disconnect policy | — | **TAKE ANNOUNCE** | **TAKE GIVEAWAY** | **EMERGENCY STOP** |
| **ANNOUNCEMENT** | End Show* | End Show* | **RETURN** / Auto Return | **TAKE VDJ** | — | **TAKE GIVEAWAY** | **EMERGENCY STOP** |
| **GIVEAWAY** | End Show* | End Show* | **RETURN** | **TAKE VDJ** | **TAKE ANNOUNCE** | — | **EMERGENCY STOP** |
| **EMERGENCY** | End Show* | RETURN w/o Program | **RETURN** (Program loaded) | — | — | — | — |

\*End Show is a deliberate Secondary action (not a faceplate primary): On Air Primary → READY or OFF.

### Canonical happy path

```
OFF → READY → GO LIVE → PROGRAM
  → TAKE VirtualDJ → VIRTUALDJ
  → RETURN → PROGRAM
  → TAKE Announcement → ANNOUNCEMENT
  → RETURN → PROGRAM
  → HOLD (modifier) → RELEASE → PROGRAM
  → EMERGENCY STOP → EMERGENCY
  → RETURN → PROGRAM
  → End Show → READY → OFF
```

### Illegal / blocked transitions (document)

| Attempt | Result |
|---|---|
| GO LIVE with no Program loaded | Stay READY; message `No Program loaded` |
| TAKE unavailable Source | Stay in current Primary; message `{Source} unavailable` |
| TAKE from OFF | Ignored / disabled |
| RETURN from READY or OFF | Disabled |
| RETURN from PROGRAM | No Primary change; message optional `Already on Program` |
| NEXT/PREVIOUS from non-PROGRAM (V1) | Disabled |
| TAKE from EMERGENCY to other Source (V1) | Disabled — must RETURN first |
| Automatic Take while OVERRIDE | Illegal — ignored; log CANCELLED |
| Automatic Return while OVERRIDE | Illegal — ignored; log CANCELLED |
| HOLD from EMERGENCY | Ignored; Hold cleared if was on |
| Silent dual-Source On Air | **Never legal** |

---

## 4. Button behavior table

Legend: **→ State** = Primary change · **mod** = modifier · **noop** = legal no-op · **block** = disabled / ignored with message · **n/a** = control not offered

### TAKE

| Current Primary | Behavior |
|---|---|
| OFF | **block** |
| READY | **block** (use GO LIVE for Program) |
| PROGRAM | If armed Source available → that Primary; set **OVERRIDE**; clear conflicting lamps. If armed PROGRAM → **noop** |
| VIRTUALDJ | Change to armed Source Primary; **OVERRIDE** on |
| ANNOUNCEMENT | Same |
| GIVEAWAY | Same |
| EMERGENCY | **block** — must RETURN first |

Arming without TAKE does not change Primary.

### RETURN

| Current Primary | Behavior |
|---|---|
| OFF / READY | **block** |
| PROGRAM | **noop** (optional message) |
| VIRTUALDJ / ANNOUNCEMENT / GIVEAWAY | → **PROGRAM**; clear HOLD if policy says so (V1: clear HOLD); clear OVERRIDE per §2; Return Target Asset On Air |
| EMERGENCY | → **PROGRAM** if Program loaded; else → **READY** and clear Emergency Asset from Air |

### GO LIVE

| Current Primary | Behavior |
|---|---|
| OFF | **block** |
| READY | If Program loaded → **PROGRAM**, ON AIR on; else **block** `No Program loaded` |
| PROGRAM | **noop** |
| VIRTUALDJ / ANNOUNCEMENT / GIVEAWAY | **block** or treat as RETURN+confirm — **V1: block** (`Return first`) |
| EMERGENCY | **block** (`Return first`) |

### HOLD

| Current Primary | Behavior |
|---|---|
| OFF / READY / EMERGENCY | **block** |
| PROGRAM / VIRTUALDJ / ANNOUNCEMENT / GIVEAWAY | Toggle **HOLD** mod on/off (or HOLD / RELEASE HOLD) |

### PAUSE

| Current Primary | Behavior |
|---|---|
| OFF / READY / EMERGENCY | **block** |
| PROGRAM | Pause Program clock/advancement (not the same as Hold if both exist — V1: PAUSE stops timed advance; HOLD blocks NEXT and Auto) |
| VIRTUALDJ | **V1: block** (VDJ transport is VirtualDJ itself) |
| ANNOUNCEMENT / GIVEAWAY | **V1: block** or pause interrupt timer if any — default **block** |

### RESUME

| Current Primary | Behavior |
|---|---|
| Any | Opposite of PAUSE when paused; else **noop/block** |

### NEXT

| Current Primary | Behavior |
|---|---|
| PROGRAM without HOLD | Advance to next Program Asset; stay PROGRAM |
| PROGRAM with HOLD | **block** |
| All other Primaries | **block** (V1) |

### PREVIOUS

| Current Primary | Behavior |
|---|---|
| PROGRAM without HOLD | Previous Program Asset; stay PROGRAM |
| PROGRAM with HOLD | **block** |
| All other Primaries | **block** (V1) |

### EMERGENCY STOP

| Current Primary | Behavior |
|---|---|
| OFF | **V1: block** |
| READY | → **EMERGENCY**; OVERRIDE on; AUTO effects suspended; HOLD clear |
| Any On Air Primary | → **EMERGENCY**; same |
| EMERGENCY | **noop** (remain EMERGENCY) |

---

## 5. Source ownership table

| Primary | Source On Air | Control default | RETURN available | Automatic effects |
|---|---|---|---|---|
| OFF | None | — | No | No |
| READY | None | — | No | No (may arm AUTO for after GO LIVE) |
| PROGRAM | Program | Automatic if AUTO and not OVERRIDE; else Operator | No-op / Yes label optional | Yes if AUTO and not OVERRIDE |
| VIRTUALDJ | VirtualDJ | Operator if TAKE; Automatic if Auto Take | **Yes** | Suspended if OVERRIDE |
| ANNOUNCEMENT | Announcement | Operator (typical) | **Yes** | Auto Return only if armed and not OVERRIDE |
| GIVEAWAY | Giveaway | Operator | **Yes** | Same |
| EMERGENCY | Emergency | Operator | **Yes** (to Program or READY) | **Suspended** |

### How ownership changes

Only via: **GO LIVE**, **TAKE**, **RETURN**, **EMERGENCY STOP**, **Automatic Take/Return** (when legal), **disconnect policy** (documented failure).

### Override vs Automatic (summary)

| Situation | OVERRIDE | Automatic |
|---|---|---|
| Operator TAKE | On | Suspended |
| RETURN → PROGRAM | Off (V1) | Resumes if AUTO armed |
| EMERGENCY | On | Suspended |
| Arm AUTO while OVERRIDE | AUTO lamp on; still suspended until OVERRIDE clears | |

---

## 6. Failure handling

| Failure | Condition class | Primary change? | Operator experience |
|---|---|---|---|
| **Runtime lost** | **FAULT** | No (stay Primary) unless policy Take Emergency | RUNTIME lamp fault; message `Runtime fault — check Runtime`; TAKE may become UNCONFIRMED; block GO LIVE from READY if Runtime FAULT |
| **VirtualDJ disconnected** while not On Air VDJ | **WARNING** | No | VDJ CONNECTED off; VDJ pad unavailable |
| **VirtualDJ disconnected** while VIRTUALDJ | **FAULT** + policy | **Yes** — V1 default → **PROGRAM** (else EMERGENCY if no Program) | Message `VirtualDJ disconnected`; log FAULT + RETURN/TAKE |
| **Announcement unavailable** | Gate | No | ANNOUNCE pad disabled; TAKE block |
| **Giveaway unavailable** | Gate | No | GIVEAWAY pad disabled |
| **No Program loaded** | Gate | Cannot enter PROGRAM via GO LIVE | READY; `No Program loaded` |
| **Audience confirmation failure** | **WARNING** then **FAULT** if unresolved | No | AUDIENCE fault; `Take not confirmed for Audience`; Primary may already have changed locally — confidence gap explicit |
| **Emergency activation** | Operator or policy | → **EMERGENCY** | EMERGENCY lamp; `Emergency On Air` |

### FAULT vs WARNING vs notification

| Class | Blocks commands? | Changes Primary? |
|---|---|---|
| **Notification** | No | No |
| **WARNING** | Sometimes (e.g. disable VDJ Take) | No |
| **FAULT** | Yes for affected commands | Only when policy requires (VDJ drop, Emergency) |

---

## 7. Recovery model

Recovery must always be obvious: **one primary verb** whenever possible.

| Abnormal situation | Recovery path |
|---|---|
| VIRTUALDJ / ANNOUNCEMENT / GIVEAWAY (normal interrupt) | **RETURN** → PROGRAM |
| HOLD | **HOLD** off / RELEASE HOLD |
| OVERRIDE (want Automatic again) | **RETURN** → PROGRAM (clears OVERRIDE) + keep AUTO armed |
| EMERGENCY with Program | **RETURN** → PROGRAM |
| EMERGENCY without Program | **RETURN** → READY; Load Show; **GO LIVE** |
| VDJ disconnect forced to PROGRAM | Already recovering; confirm Audience; fix VDJ offline |
| Audience Fault | Fix network / Runtime; wait for **Audience confirmed**; do not Take blindly |
| Runtime Fault | **Open Runtime**; restore; do not End Show unless required |
| No Program | Load Show → READY → **GO LIVE** |
| Failed Take (still old Primary) | Read message; fix availability; TAKE again |
| Failed Take (Primary changed, Audience not confirmed) | Treat as UNCONFIRMED; RETURN or retry until Audience confirmed |

### Recovery principle

> From any On Air interrupt or Emergency, the Operator looks for **RETURN**.  
> From READY, the Operator looks for **GO LIVE**.  
> From FAULT lamps, the Operator looks for the named fix (Runtime / VirtualDJ / Audience) — not a hidden menu.

---

## 8. Version 1 recommendations

1. **Seven Primaries only:** OFF, READY, PROGRAM, VIRTUALDJ, ANNOUNCEMENT, GIVEAWAY, EMERGENCY.  
2. **Three modifiers:** HOLD, OVERRIDE, AUTO.  
3. **No Primary named LIVE or FAULT.**  
4. **EMERGENCY STOP** works from READY and all On Air Primaries.  
5. **From EMERGENCY, TAKE is blocked** — RETURN first.  
6. **VDJ disconnect On Air → PROGRAM** if Program loaded.  
7. **NEXT/PREVIOUS only in PROGRAM** without HOLD.  
8. **PAUSE** only meaningful in PROGRAM in V1.  
9. **GO LIVE** only from READY (not a universal “panic to Program”).  
10. Implement the button table as the acceptance suite — every cell tested.

### Out of V1 state machine

- Return Previous stack  
- Rehearsal Primary  
- Multi-Operator lock state  
- Separate INTERMISSION / SPONSOR Primaries (use Program Assets or later Sources)  

---

## Acceptance checklist

| # | Contract |
|---|---|
| 1 | Every Operator action maps Primary(+mod) → Primary(+mod) or explicit block |
| 2 | No button has an undefined cell in §4 |
| 3 | Every Primary has exactly one Source owner (or none if OFF/READY) |
| 4 | Illegal transitions listed in §3 |
| 5 | Failures classified WARNING / FAULT / notification |
| 6 | Recovery always names RETURN, GO LIVE, or a specific fix |
| 7 | Vocabulary matches Language Standard |

---

## Quick reference — Primary + Air

```
OFF / READY     →  Air: none
PROGRAM         →  Air: Program
VIRTUALDJ       →  Air: VirtualDJ
ANNOUNCEMENT    →  Air: Announcement
GIVEAWAY        →  Air: Giveaway
EMERGENCY       →  Air: Emergency
```

## Quick reference — escape verbs

```
Interrupt / VDJ / Giveaway / Announce  →  RETURN
Panic                                  →  EMERGENCY STOP
Standby to Show                        →  GO LIVE
Clear Hold                             →  HOLD off
```

---

## Execution state

**COMPLETE** — Operational state machine defined. No code, no UI, no architecture redesign.
