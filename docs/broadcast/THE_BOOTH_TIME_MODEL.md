# The Booth — Time Model

**Project:** Retroverse Broadcast  
**Sprint:** The Booth — Time Model  
**Date:** 2026-07-21  
**Status:** Time contract only — no implementation code, no UI design, no architecture redesign.

**Authority documents:**
- [`THE_BOOTH_PRODUCT_SPECIFICATION.md`](./THE_BOOTH_PRODUCT_SPECIFICATION.md)
- [`THE_BOOTH_OPERATING_MODEL.md`](./THE_BOOTH_OPERATING_MODEL.md)
- [`THE_BOOTH_MIXER_CONTROL_SURFACE.md`](./THE_BOOTH_MIXER_CONTROL_SURFACE.md)
- [`THE_BOOTH_LANGUAGE_STANDARD.md`](./THE_BOOTH_LANGUAGE_STANDARD.md)
- [`THE_BOOTH_OPERATIONAL_STATE_MACHINE.md`](./THE_BOOTH_OPERATIONAL_STATE_MACHINE.md)

This document defines **how time behaves inside The Booth**. Every second has a meaning. Operators never guess how long something has been On Air or when Program will resume.

---

## 1. Time philosophy

### What the Operator must always know

1. **What is happening now** — Primary + Source + Asset  
2. **What happens next** — Next Program Asset + Return Target  
3. **When something will happen** — countdowns only when a time is known  
4. **How long this has been On Air** — Source Elapsed  
5. **How long until Program resumes** — Return Countdown when Automatic Return is pending; otherwise “manual RETURN”

### Principles

| Principle | Meaning |
|---|---|
| **Predictable** | Same Source type always times the same way |
| **Honest clocks** | Never show a fake Remaining when duration is unknown — show `—` |
| **One wall clock** | All stamps use Booth local time |
| **Air time ≠ wall decoration** | Elapsed On Air starts on successful Take / GO LIVE ownership, not on button press intent |
| **Program time is explicit** | V1 picks one progression rule and never mixes metaphors |
| **Temporary Sources are bounded** | Announcement / Giveaway / Emergency have clear manual vs automatic end |

### Units and display

| Kind | Format |
|---|---|
| Wall / log timestamp | `HH:MM:SS` (24-hour, Booth local) |
| Durations under one hour | `m:ss` |
| Durations one hour or more | `h:mm:ss` |
| Unknown remaining | `—` (em dash), never `0:00` pretending certainty |
| No milliseconds | Operator-facing |

---

## 2. Time sources (who drives what)

| Timer | Who starts | Who stops | Pauses? | Survives Return? | Resets when |
|---|---|---|---|---|---|
| **Booth Clock** | Always running (OS/wall) | Never | No | Yes | Never |
| **Session Elapsed** | Enter READY from OFF (or first enter Booth for Show) | OFF / End Show | No | N/A (session ends) | New session |
| **On Air Elapsed** (master) | Primary becomes On Air (GO LIVE or TAKE or policy) | Leave On Air (READY/OFF) or End Show | No during Hold/Pause* | No — stops when not On Air | Next On Air period |
| **Source Elapsed** | Current Source takes ownership | Ownership leaves that Source | See §3 | No | Every Take to a Source (including Take same Source with new Asset) |
| **Asset Elapsed** | Current Asset becomes On Air | Asset changes or Source leaves | See §3 | No | Every new Asset On Air |
| **Asset Remaining** | When Asset has known duration at On Air start | Asset ends / leaves Air | Yes with PAUSE (Program); Hold does not freeze Remaining display of “planned” unless paused — see V1 | No | New Asset |
| **Program Position** | GO LIVE / Load Show | End Show | **Yes — when not PROGRAM advancing** (see §4) | Yes — position preserved across interrupts | Load Show / Jump / NEXT / PREVIOUS |
| **Hold Duration** | HOLD on | HOLD off / EMERGENCY / End Show | No | No | Next Hold |
| **Return Countdown** | Automatic Return armed with known delay | Fire Return / Cancel / OVERRIDE | Suspended while OVERRIDE | No | Re-arm |
| **Announcement Duration** | TAKE Announcement | RETURN / Take other / end | V1: no pause | No | Next Announcement Take |
| **Giveaway Duration** | TAKE Giveaway | RETURN / Take other | V1: no pause | No | Next Giveaway Take |
| **Emergency Duration** | Enter EMERGENCY | RETURN from EMERGENCY | No | No | Next Emergency |
| **Audience Confirm Latency** | Take/Return requested | Confirmed or Fault declared | No | No | Next Take/Return |

\*Hold and Pause do **not** stop Source Elapsed — the Audience is still seeing that Asset. They stop **Program progression** (NEXT/auto-advance).

---

## 3. Timer definitions

### Required for Version 1

| Timer | Required | Permanent display? |
|---|---|---|
| **Booth Clock** (current time of day) | Yes | Optional small; not mandatory center |
| **Source Elapsed** (“how long this Source/Asset On Air”) | **Yes** | **Yes — center On Air Master** |
| **Asset Remaining** | Yes when known; else `—` | **Yes — center** |
| **Program Position** (Now + Next identity; not necessarily a clock) | **Yes** | **Yes — right Program Strip** |
| **Return Countdown** | Yes when Auto Return pending | **Yes when active**; hidden when N/A |
| **Hold Duration** | Yes when HOLD on | Yes while HOLD (can share elapsed row) |
| **Emergency Duration** | Yes in EMERGENCY | Yes while EMERGENCY |
| **Session Elapsed** | Nice | Secondary Bay |
| **Announcement / Giveaway Duration** | Same as Source Elapsed while that Primary | Covered by Source Elapsed |
| **On Air Elapsed** (whole show On Air since GO LIVE) | Recommended | Secondary or top; not required if Source Elapsed is clear |
| **Program Elapsed** (time spent in PROGRAM Primary cumulative) | No for V1 | — |
| **Event Elapsed** (doors-to-close marketing clock) | No for V1 | — |

### On Air time (detail)

| Question | V1 answer |
|---|---|
| **When does On Air begin?** | When Primary becomes PROGRAM, VIRTUALDJ, ANNOUNCEMENT, GIVEAWAY, or EMERGENCY after a successful ownership change (GO LIVE / TAKE / EMERGENCY STOP / legal Automatic Take). Not on arming. Not on Preview. |
| **When does On Air end?** | When Primary becomes READY or OFF (End Show / leave On Air). Interrupts do **not** end On Air — they change Source. |
| **During Take?** | Old Source Elapsed stops; new Source Elapsed starts at `0:00` the instant new Source owns The Air. Booth Clock unchanged. Program Position: see §4. |
| **During Return?** | Source Elapsed restarts for Program Asset now On Air. Return Countdown clears. HOLD clears (per State Machine). |
| **How to display elapsed?** | Center: label **ELAPSED** → `m:ss` for current Asset (Asset Elapsed = Source Elapsed when one Asset per Take). |

**Confidence:** If Take is UNCONFIRMED for Audience, Elapsed still runs (Operator intent On Air) but AUDIENCE lamp faults — time is not paused for uncertainty.

---

## 4. Program timing model

### Version 1 — one clear behavior

**Program Position freezes while Program does not own The Air.**

| Situation | Program Position | Timed auto-advance inside Program |
|---|---|---|
| Primary **PROGRAM**, not PAUSE, not HOLD | Advances per Program rules (manual NEXT or timed Asset end) | Allowed |
| Primary **PROGRAM** + **HOLD** | Frozen | Blocked |
| Primary **PROGRAM** + **PAUSE** | Frozen | Blocked |
| Primary **VIRTUALDJ** / **ANNOUNCEMENT** / **GIVEAWAY** / **EMERGENCY** | **Frozen** at last Program Asset (Return Target) | Blocked |
| **OVERRIDE** while still PROGRAM | Does not by itself freeze; HOLD/PAUSE do | Automatic Program tricks suspended if any |

### Override timing model

| Rule | V1 |
|---|---|
| OVERRIDE on | Automatic Take/Return **suspended** (State Machine) |
| Program Position during OVERRIDE on PROGRAM | Continues only if Operator uses NEXT/PREVIOUS / Asset timers — Automatic does not advance |
| Program Position during OVERRIDE on interrupt Source | **Frozen** (same as any interrupt) |
| RETURN → PROGRAM | OVERRIDE off; Program Position resumes from frozen Return Target Asset; Asset Elapsed restarts |

### Skipped / resumed

| Action | Effect on Program Position |
|---|---|
| **NEXT** | Move to next Asset; Elapsed reset for new Asset |
| **PREVIOUS** | Move to previous Asset; Elapsed reset |
| **RETURN** | Land on Return Target Asset (frozen position); do not auto-skip |
| **Take interrupt mid-Asset** | That Asset remains Return Target unless NEXT was pressed while still PROGRAM |
| **Jump** (secondary) | Set Position; Elapsed reset when Taken/On Air |

### What V1 explicitly rejects

- Program “continuing in the background” while VirtualDJ is On Air (hidden catch-up)  
- Dual clocks implying Program and VDJ both “consume” the rundown simultaneously  
- Silent skip of Program Assets during an interrupt  

---

## 5. Temporary Sources (Announcement, Giveaway, Emergency)

### Shared rules

| Rule | V1 |
|---|---|
| Elapsed | Source Elapsed from Take |
| Remaining | If planned duration known → show Remaining; else `—` |
| Manual Return | Always available (**RETURN**) |
| Automatic Return | Only if explicitly armed for that Take **and** duration known **and** not OVERRIDE |
| Max duration | Soft warning threshold + hard auto-behavior below |
| Countdown | Show Return Countdown only when Auto Return is pending |

### Announcement

| Field | V1 |
|---|---|
| Typical duration | Known from prepared Asset when available |
| Maximum (soft) | **2:00** — warning |
| Maximum (hard) | **3:00** — Auto Return to Program if still ANNOUNCEMENT and not OVERRIDE; if OVERRIDE, warning only every 30s |
| Auto Return default | **On** when duration known; **Off** when duration unknown (manual RETURN only) |
| Operator warning | At soft max: `Announcement running long` |

### Giveaway

| Field | V1 |
|---|---|
| Typical duration | Often unknown (live moment) |
| Maximum (soft) | **5:00** — warning |
| Maximum (hard) | None auto-forced in V1 (manual RETURN) — avoid yanking a live draw |
| Auto Return default | **Off** |
| Operator warning | At soft max: `Giveaway running long` |

### Emergency

| Field | V1 |
|---|---|
| Duration | Emergency Duration from enter EMERGENCY |
| Maximum (soft) | **1:00** — warning |
| Maximum (hard) | None auto-clear (must manual RETURN) |
| Auto Return | **Never** |
| Operator warning | At 1:00 and every 1:00 after: `Emergency active` |

### VirtualDJ (long Take, not “temporary cart”)

| Field | V1 |
|---|---|
| Elapsed | Runs freely |
| Remaining | Usually `—` |
| Auto Return | When AUTO armed: after VDJ idle per Operating Model — show **Return Countdown** when idle timer starts |
| Max soft warning | Optional **45:00** `VirtualDJ On Air long` — notification only |

---

## 6. Countdown rules

| Countdown | Shows when | Counts toward | Cancels when |
|---|---|---|---|
| **Asset Remaining** | Duration known | Natural end of Asset (Program) | Asset change / leave Air / PAUSE freezes count |
| **Return Countdown** | Auto Return pending | Automatic RETURN | OVERRIDE, manual RETURN, Take, Disarm AUTO, condition fails |
| **Announcement hard Auto Return** | Past soft max under Auto rules | Forced RETURN | Manual RETURN / Take / OVERRIDE (then warnings only) |

**Display rule:** Only one primary countdown in center at a time. Priority:

1. Return Countdown (if active)  
2. Asset Remaining (if known)  
3. `—`

Label must say which: **RETURNS IN** vs **REMAINING**.

---

## 7. Operator clocks

### Permanent (faceplate — never hide while On Air)

| Clock | Label | Where |
|---|---|---|
| **Source / Asset Elapsed** | **ELAPSED** | Center On Air Master |
| **Remaining or Returns In** | **REMAINING** or **RETURNS IN** | Center |
| **Next Program Asset** | identity (not a clock) | Right Program Strip |
| **Hold Duration** | **HOLD** `m:ss` | Center or HOLD lamp vicinity — while HOLD |
| **Emergency Duration** | **EMERGENCY** `m:ss` | Center — while EMERGENCY |

### Optional permanent

| Clock | V1 |
|---|---|
| **Booth Clock** `HH:MM:SS` | Small top corner — recommended |
| **Show On Air Elapsed** since GO LIVE | Secondary or top — optional |

### Secondary Bay only

| Clock |
|---|
| Session Elapsed |
| Full Show Log times |
| Audience Confirm Latency |

### Not Version 1 faceplate

- Separate “Program elapsed cumulative”  
- Multi-timezone clocks  
- Frame-accurate media timecode  

---

## 8. Warning thresholds

| Condition | Threshold | Class | Message (Language Standard tone) |
|---|---|---|---|
| Announcement long | **2:00** | WARNING | `Announcement running long` |
| Announcement hard | **3:00** | Auto Return if allowed | then normal Return messages |
| Giveaway long | **5:00** | WARNING | `Giveaway running long` |
| Emergency active | **1:00**, then each **1:00** | WARNING | `Emergency active` |
| Hold long | **10:00** | WARNING | `Hold running long` |
| VirtualDJ long | **45:00** | Notification | `VirtualDJ On Air long` |
| Program idle (PROGRAM, no NEXT, no timed end, Asset Remaining `—`, elapsed) | **15:00** | WARNING | `Program idle` |
| Return pending (countdown) | visible always | — | lamp RETURN READY + **RETURNS IN** |
| Auto Return cancelled | immediate | Notification | `Automatic Return cancelled — Override` |
| Audience unconfirmed | **0:10** after Take | WARNING | `On Air locally — confirming Audience…` |
| Audience fault | **0:30** still unconfirmed | FAULT | `Take not confirmed for Audience` |

Warnings do not change Primary by themselves (except Announcement hard Auto Return when legal).

---

## 9. Logging and timestamps

### Official timestamp model

- Every Show Log Event uses **Booth local wall time** at Event commit: `HH:MM:SS`  
- Duration footnotes may append after successful temporary Source Returns  

### Log patterns

```
20:14:33  TAKE       VirtualDJ     Sugar Sugar     OK
20:16:08  RETURN     Program       Open Bumper     OK
20:18:10  TAKE       Announcement  Happy Hour      OK
20:18:42  RETURN     Program       Open Bumper     OK
```

Optional duration suffix on RETURN from temporary Source (same line or following note field):

```
20:18:42  RETURN     Program       Open Bumper     OK    Announcement 00:32
```

| Rule | V1 |
|---|---|
| Timestamp | Always wall clock, never elapsed-only lines |
| Duration in log | Optional on RETURN from Announcement/Giveaway/Emergency |
| Elapsed not required on every TAKE line | Keep TAKE lines clean |
| Time zone | Booth local; no “Z” in Operator log |

---

## 10. Version 1 recommendations (summary)

1. **Permanent:** ELAPSED + REMAINING/`—` + Next identity + conditional RETURNS IN / HOLD / EMERGENCY durations.  
2. **Program freezes** during any non-PROGRAM On Air Primary.  
3. **Elapsed keeps running** during HOLD (Audience still watching).  
4. **PAUSE** freezes Program Remaining/advance only in PROGRAM.  
5. **Announcement:** soft 2:00 / hard 3:00 Auto Return when not OVERRIDE.  
6. **Giveaway:** warn at 5:00; manual RETURN only.  
7. **Emergency:** never Auto Return; warn every minute after 1:00.  
8. **Return Countdown** only for real pending Automatic Return.  
9. **Unknown Remaining = `—`**, never a lie.  
10. **Show Log** = wall `HH:MM:SS` + ACTION + Source + Asset + Result.

### Consistency across Sources

| Source | Elapsed | Remaining | Auto Return |
|---|---|---|---|
| Program | Yes | If known | Asset-end / AUTO policy |
| VirtualDJ | Yes | Usually `—` | Idle + AUTO → countdown |
| Announcement | Yes | If known | Soft/hard rules |
| Giveaway | Yes | If known | Manual |
| Emergency | Yes (Emergency Duration) | `—` | Never |

---

## Acceptance checklist

| # | Check |
|---|---|
| 1 | Operator can state what time means “now,” “next,” and “how long On Air” |
| 2 | Every V1 timer has start/stop/pause/survive/reset rules |
| 3 | Program timing has one rule: freeze while not PROGRAM |
| 4 | Temporary Sources have max / auto / manual / warning rules |
| 5 | Countdown priority is defined |
| 6 | Warning thresholds are numeric and messaged |
| 7 | Log timestamps are wall-clock Booth local |
| 8 | No undefined seconds for On Air ownership periods |

---

## Quick reference

```
ELAPSED     = time current Asset has owned The Air
REMAINING   = known duration left (else —)
RETURNS IN  = Automatic Return countdown only
PROGRAM     = frozen while interrupt/Emergency owns The Air
HOLD        = blocks advance; does not stop ELAPSED
```

---

## Execution state

**COMPLETE** — Time model defined. No code, no UI, no architecture redesign.
