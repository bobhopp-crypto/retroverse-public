# The Booth — Paper Prototype

**Project:** Retroverse Broadcast  
**Sprint:** The Booth — Paper Prototype  
**Date:** 2026-07-21  
**Status:** Operational faceplate layout only — no visual styling, no behavior changes.

**Authority:** [`THE_BOOTH_V1_FUNCTIONAL_SPECIFICATION.md`](./THE_BOOTH_V1_FUNCTIONAL_SPECIFICATION.md) — **locked**.  
This document only places what V1 already defines. It does not change product behavior, terminology, states, sources, or timing.

**How to use:** An engineer should be able to sketch the Broadcast Mixer on paper from this document alone.

---

## Design goal

Pretend this is a **physical broadcast console**.

Every control has one obvious location. The Operator instinctively knows:

- where to **look**
- where to **reach**
- where to **confirm**

Ignore colors, fonts, icons, animations, gradients, branding, CSS, React. Think only: **panels · buttons · lamps · meters · labels · displays**.

---

## 1. Complete paper prototype

### Faceplate map (ASCII — not a visual design)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║ R1  STATUS BAR                                                               ║
║  [ON AIR] [OVERRIDE] [HOLD] [EMERGENCY] [RUNTIME] [VDJ CONN] [VDJ PLAY]     ║
║  [AUTO] [AUDIENCE]                                              (clock HH:MM:SS optional small) ║
╠═══════════════════════╦══════════════════════════════════╦═══════════════════╣
║ R2a SOURCES           ║ R2b ON AIR MASTER                ║ R2c PROGRAM       ║
║                       ║                                  ║                   ║
║  (armed = selected)   ║  SOURCE: _______________         ║  SHOW: __________ ║
║                       ║  ASSET:  _______________         ║  NEXT: __________ ║
║  [ PROGRAM  ]         ║  CONTROL: Operator|Automatic     ║  RETURN TARGET:   ║
║  [ VDJ      ]         ║  RETURN TARGET: ________         ║    ______________ ║
║  [ ANNOUNCE ]         ║                                  ║  UPCOMING: ______ ║
║  [ GIVEAWAY ]         ║  ELAPSED     [ m:ss ]            ║  RETURN READY [●] ║
║  [ EMERGENCY]         ║  REMAINING   [ m:ss | — ]        ║                   ║
║                       ║  RETURNS IN  [ m:ss ] (when live)║                   ║
║  pad lit = On Air     ║  HOLD m:ss / EMERGENCY m:ss      ║                   ║
║                       ║                                  ║                   ║
║                       ║  ---- MONITORING ----            ║                   ║
║                       ║  LOCAL:  [ meter / identity ]    ║                   ║
║                       ║  PUBLIC: [ meter / identity ]    ║                   ║
╠═══════════════════════╩══════════════════════════════════╩═══════════════════╣
║ R3  TRANSPORT                          R4  CUT BUS                           ║
║  [PREV] [PAUSE] [RESUME] [NEXT] [HOLD]   [[[ TAKE ]]] [RETURN] [GO LIVE]   ║
║                                                                              ║
║                         R5  [===== EMERGENCY STOP =====]  (offset, guarded)  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ R6  SECONDARY BAY (cover / fold — not faceplate primary)                     ║
║  [Load Show] [Arm AUTO] [Disarm AUTO] [Preview] [Jump] [End Show]          ║
║  [Open Runtime]                                                              ║
║  SHOW LOG (last N lines, scroll)                                             ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Region index (final)

| ID | Region name | Faceplate role |
|---|---|---|
| **R1** | Status | Master lamps — glance exceptions |
| **R2b** | On Air | What owns The Air — permanent center |
| **R2a** | Sources | What can be Taken — left |
| **R2c** | Program | What happens next / Return Target — right |
| **R3** | Transport | Advance and Hold — bottom left |
| **R4** | Cut Bus | TAKE / RETURN / GO LIVE — bottom right of center |
| **R5** | Emergency | Panic — bottom, offset/protected |
| **R2b-M** | Monitoring | Nested in On Air — confirm Audience |
| **R6** | Secondary / History / Diagnostics | Below fold — prep and recovery |

**Not separate faceplate regions in V1:** Diagnostics as a full quadrant (Open Runtime only); Operator Notes column (omitted from faceplate).

---

## 2. Region descriptions

### R1 — Status

- **Purpose:** Tallies the Operator can read without reading text.  
- **Contains:** ON AIR, OVERRIDE, HOLD, EMERGENCY, RUNTIME, VDJ CONNECTED, VDJ PLAYING, AUTO, AUDIENCE. Optional small Booth Clock.  
- **Does not contain:** Asset titles, buttons.  
- **Simplicity:** OSC is not a separate lamp (folded into VDJ CONNECTED per V1).

### R2b — On Air Master

- **Purpose:** Continuous answer to “what is On Air?”  
- **Contains:** Source, Asset, CONTROL, Return Target, ELAPSED, REMAINING / RETURNS IN, conditional Hold/Emergency duration, Local + Public monitoring.  
- **Never tabs away.** Highest visibility priority on the console.

### R2a — Sources

- **Purpose:** Arm which Source the next TAKE will cut to.  
- **Contains:** Five pads — PROGRAM, VDJ, ANNOUNCE, GIVEAWAY, EMERGENCY.  
- **Pad state:** Selected (armed) · On Air (lit) · Unavailable (dark/disabled).  
- **Does not Take by itself** — TAKE is on the Cut Bus (except EMERGENCY STOP).

### R2c — Program

- **Purpose:** Rundown foresight — Next and Return Target.  
- **Contains:** Show name, NEXT Asset, Return Target echo, Upcoming interrupt, RETURN READY lamp.  
- **Does not** edit the catalog.

### R3 — Transport

- **Purpose:** Move within Program / freeze advancement.  
- **Contains:** PREVIOUS, PAUSE, RESUME, NEXT, HOLD.  
- **Home for the left hand** during PROGRAM.

### R4 — Cut Bus

- **Purpose:** Commit Air ownership changes.  
- **Contains:** TAKE (largest), RETURN, GO LIVE.  
- **Home for the right hand** during cuts.

### R5 — Emergency

- **Purpose:** Panic path — hard to hit by accident, easy on purpose.  
- **Contains:** EMERGENCY STOP only.  
- **Separated** from TAKE cluster (gap / guard rail on paper).

### R2b-M — Monitoring (inside On Air)

- **Purpose:** Confirm Local intent vs Public Audience.  
- **Contains:** LOCAL identity/meter, PUBLIC identity/meter (AUDIENCE lamp in R1 is the tally).

### R6 — Secondary Bay

- **Purpose:** Pre-show and recovery — not constant reach.  
- **Contains:** Load Show, Arm/Disarm AUTO, Preview, Jump, End Show, Open Runtime, Show Log.  
- **Covered/folded by default** on a hardware metaphor.

---

## 3. Control placement

### Size importance key

| Rank | Meaning |
|---|---|
| **S1** | Largest / most prominent — primary show verbs |
| **S2** | Full dedicated button — frequent |
| **S3** | Standard pad / transport |
| **S4** | Secondary Bay only |

### Primary controls

| Control | Location | Size | Group | Neighbors | Why here |
|---|---|---|---|---|---|
| **TAKE** | R4 center-bottom | **S1** | Cut Bus | RETURN right; GO LIVE far right; Transport left | The cut — physical prominence |
| **RETURN** | R4 | **S1** | Cut Bus | Left of GO LIVE; right of TAKE | Equal importance to TAKE |
| **GO LIVE** | R4 | **S2** | Cut Bus | Right edge of Cut Bus | Start-of-show; less mid-show than TAKE/RETURN |
| **EMERGENCY STOP** | R5 | **S1** but isolated | Emergency | Below/aside Cut Bus with clear gap | Panic; protected from TAKE miss-hits |
| **HOLD** | R3 rightmost | **S2** | Transport | NEXT left | Freeze near advance keys |
| **PREVIOUS** | R3 leftmost | **S3** | Transport | PAUSE right | Classic transport order |
| **PAUSE** | R3 | **S3** | Transport | Between PREV and RESUME | |
| **RESUME** | R3 | **S3** | Transport | Between PAUSE and NEXT | |
| **NEXT** | R3 | **S3** | Transport | Between RESUME and HOLD | |

### Source pads

| Pad | Location | Size | Group | Neighbors | Why here |
|---|---|---|---|---|---|
| **PROGRAM** | R2a top | **S3** | Sources | Above VDJ | Home Source first |
| **VDJ** | R2a | **S3** | Sources | Below PROGRAM | Primary interrupt |
| **ANNOUNCE** | R2a | **S3** | Sources | Below VDJ | Cart row |
| **GIVEAWAY** | R2a | **S3** | Sources | Below ANNOUNCE | Cart row |
| **EMERGENCY** | R2a bottom | **S3** | Sources | Below GIVEAWAY | Arm only; panic is R5 |

### Secondary controls (R6 only)

| Control | Size | Why not faceplate |
|---|---|---|
| Load Show | S4 | Pre-show |
| Arm / Disarm Automatic | S4 | Infrequent policy |
| Preview | S4 | Confidence before Take |
| Jump | S4 | Occasional |
| End Show | S4 | Close of night; protected from mid-show miss |
| Open Runtime | S4 | Escape hatch |

### Protected against accidental activation

| Control | Protection (paper metaphor) |
|---|---|
| **EMERGENCY STOP** | Physical offset + gap from TAKE; optional cover/guard |
| **End Show** | Secondary Bay only |
| **GO LIVE** | Distinct from TAKE; only meaningful in READY (disabled otherwise) |
| **EMERGENCY pad** | Arms only — does not instantly Take (STOP does) |

---

## 4. Display placement

| Display | Region | Purpose | Visibility | Update frequency | Relates to |
|---|---|---|---|---|---|
| **ON AIR** lamp | R1 | Master On Air | Permanent / highest tally | On ownership change | Center Source |
| **OVERRIDE** lamp | R1 | Operator seized | Permanent | On TAKE/RETURN/EMERGENCY | CONTROL text |
| **HOLD** lamp | R1 | Hold active | Permanent | On HOLD toggle | HOLD button; Hold duration |
| **EMERGENCY** lamp | R1 | Emergency Primary | Permanent | On EMERGENCY | R5; Emergency duration |
| **RUNTIME** lamp | R1 | Go/no-go | Permanent | On health change | Open Runtime |
| **VDJ CONNECTED** | R1 | VDJ path | Permanent | On link change | VDJ pad enable |
| **VDJ PLAYING** | R1 | Playing pulse | Permanent | Near real-time | Auto policy |
| **AUTO** lamp | R1 | Automatic armed | Permanent | On arm/disarm | Secondary Arm |
| **AUDIENCE** lamp | R1 | Confirmed/Fault | Permanent / large when fault | On confirm cycle | Public monitor |
| **Booth Clock** | R1 corner | Wall time | Optional small | 1 Hz | Show Log |
| **Source name** | R2b | Who owns Air | Permanent | On Take/Return | Pads |
| **Asset identity** | R2b | What is showing | Permanent | On Asset change | Monitors |
| **CONTROL** | R2b | Operator/Automatic | Permanent | On Override/Auto | OVERRIDE lamp |
| **Return Target** | R2b + echo R2c | Where RETURN goes | Permanent when On Air | On freeze/advance | RETURN button |
| **ELAPSED** | R2b | How long On Air | Permanent when On Air | 1 Hz | Time model |
| **REMAINING** | R2b | Known time left | Permanent when On Air | 1 Hz or `—` | PAUSE |
| **RETURNS IN** | R2b | Auto Return countdown | When pending only | 1 Hz | RETURN / AUTO |
| **Hold duration** | R2b | Hold length | While HOLD | 1 Hz | HOLD |
| **Emergency duration** | R2b | Emergency length | While EMERGENCY | 1 Hz | R5 |
| **LOCAL monitor** | R2b-M | Local confirmation | Permanent when On Air | On change / poll | AUDIENCE |
| **PUBLIC monitor** | R2b-M | Audience confirmation | Permanent when On Air | On change / poll | AUDIENCE |
| **Show name** | R2c | Tonight’s Show | Permanent when loaded | On Load Show | GO LIVE |
| **NEXT** | R2c | Next Program Asset | Permanent when loaded | On NEXT/Position | NEXT button |
| **UPCOMING** | R2c | Armed interrupt | When armed | On pad arm | Sources |
| **RETURN READY** | R2c | Return legal | When applicable | On Primary change | RETURN |
| **Show Log** | R6 | Last events | Secondary | On each Event | All actions |
| **Status message line** | R2b bottom edge | Warnings / results | Permanent strip | On message | Language Standard |

**Update frequency note:** “1 Hz” means operator-readable once-per-second ticks — not a styling instruction.

---

## 5. Eye-flow analysis

Minimize travel: **center is home**. Exceptions live on the top row. Hands live on the bottom.

### Starting the Show

| Order | Look | Why |
|---|---|---|
| 1 | R1 RUNTIME + VDJ CONN | Ready? |
| 2 | R2c Show + NEXT | Right Show loaded? |
| 3 | R4 **GO LIVE** | Commit |
| 4 | R2b On Air + R1 ON AIR + AUDIENCE | Confirm |

**Travel:** Top → Right → Bottom Cut Bus → Center. Short loop.

### Taking VirtualDJ

| Order | Look | Why |
|---|---|---|
| 1 | R2b (current On Air) | Baseline |
| 2 | R1 VDJ CONN / PLAY | Can Take? |
| 3 | R2a **VDJ** pad | Arm |
| 4 | R4 **TAKE** | Cut |
| 5 | R2b + AUDIENCE | Confirm |
| 6 | R2c Return Target | Know home |

**Travel:** Center → Top (glance) → Left → Bottom → Center. Classic switcher path.

### Running Announcement

Same as VDJ path with **ANNOUNCE** pad; then eyes stay on **ELAPSED / REMAINING** in R2b for 2:00 / 3:00 awareness; **RETURN** in peripheral bottom.

### Running Giveaway

Same path with **GIVEAWAY**; longer dwell on R2b (manual Return); less reliance on REMAINING.

### Emergency

| Order | Look | Why |
|---|---|---|
| 1 | R5 **EMERGENCY STOP** (hand-driven; eyes may follow) | Panic |
| 2 | R1 EMERGENCY + ON AIR | Confirm state |
| 3 | R2b Emergency Asset + duration | What Audience sees |
| 4 | R4 **RETURN** when safe | Recovery |

**Travel:** Bottom panic → Top tally → Center → RETURN. Minimal.

### Returning to Program

| Order | Look | Why |
|---|---|---|
| 1 | R2c Return Target / RETURN READY | Where am I going? |
| 2 | R4 **RETURN** | Commit |
| 3 | R2b Program Asset + AUDIENCE | Confirm |
| 4 | R1 OVERRIDE off | Automatic may resume |

**Travel:** Right → Bottom → Center → Top. Short.

---

## 6. Hand-flow analysis

### Rest position

- **Left hand** near R3 Transport (PREVIOUS … HOLD).  
- **Right hand** near R4 Cut Bus (TAKE / RETURN).  
- **Emergency** reached by deliberate right-hand move down/aside to R5 — not in the TAKE rest pocket.

### Constant-use controls (deserve prominence)

| Control | Hand | Frequency |
|---|---|---|
| TAKE | Right | High |
| RETURN | Right | High |
| NEXT | Left | High in PROGRAM |
| HOLD | Left | Medium |
| Source pads | Left (or either) | Medium before Take |
| GO LIVE | Right | Low (start) |
| PREVIOUS | Left | Low–medium |
| PAUSE / RESUME | Left | Low–medium |

### Protected / infrequent

| Control | Hand rule |
|---|---|
| EMERGENCY STOP | Deliberate reach; not adjacent to TAKE without gap |
| End Show | Secondary only |
| Load Show / AUTO / Preview / Jump | Secondary only |

### Gesture patterns

| Workflow | Hands |
|---|---|
| Take VDJ | Left: VDJ pad → Right: TAKE → eyes confirm → Right rests on RETURN |
| Advance Program | Left: NEXT → eyes R2b/R2c |
| Hold | Left: HOLD |
| Panic | Right: EMERGENCY STOP (down) |
| Recover | Right: RETURN |

---

## 7. Operator workflow validation

Checked against V1 journeys — layout supports each without new controls.

| Journey | Look | Reach | Confirm |
|---|---|---|---|
| Start Show | R1 → R2c | R4 GO LIVE | R2b + AUDIENCE |
| Take VirtualDJ | R2a VDJ | R4 TAKE | R2b + AUDIENCE |
| Return | R2c target | R4 RETURN | R2b + OVERRIDE off |
| Announcement | R2a ANNOUNCE | R4 TAKE → RETURN | R2b timers |
| Giveaway | R2a GIVEAWAY | R4 TAKE → RETURN | R2b |
| Hold | — | R3 HOLD | R1 HOLD + duration |
| Emergency | — | R5 STOP | R1 + R2b |
| Recover Emergency | — | R4 RETURN | R2b PROGRAM |
| Close Show | R6 | End Show | ON AIR off |

**Simplicity test — removed from faceplate (no dedicated hardware place):**

- Sampler grid  
- OSC lamp  
- Notes column  
- Full Runtime service list  
- Analytics  
- Skip (alias of NEXT — not present)  
- Return Previous  
- Dual “LIVE” master lamp  

Mixer feels closer to **VirtualDJ / video switcher** than an admin dashboard: fixed pads, cut bus, transport, tallies.

---

## 8. Potential refinements before visual design

These are **layout/ergonomics options**, not product-behavior changes. Resolve in visual/UI sprint if needed; behavior stays locked.

| # | Refinement | Note |
|---|---|---|
| 1 | Exact pixel grid / responsive stacking | Paper assumes desktop Booth; mobile out of V1 faceplate intent |
| 2 | Whether Source On Air uses pad illumination only or also a text SOURCE line | Both allowed; SOURCE line remains mandatory in R2b |
| 3 | EMERGENCY STOP left vs right of gap | Prefer **right/below** away from PREVIOUS cluster; keep gap from TAKE |
| 4 | RETURNS IN vs REMAINING shared display slot | V1 priority already defined — one slot, labeled |
| 5 | Show Log height in R6 | Enough for last ~5–10 Events |
| 6 | Status message strip exact row (below R2b vs above R3) | Prefer directly under On Air meters |
| 7 | HOLD as toggle vs HOLD + RELEASE HOLD | Behavior locked; label may be one toggle button |
| 8 | Optional Booth Clock omission | Allowed if clutter; log still wall-clocked |

---

## Sketch checklist (for the next engineer)

Draw six boxes:

1. Top lamp row  
2. Left source pads (5)  
3. Center On Air + monitors + timers  
4. Right Program strip  
5. Bottom transport (5) + cut bus (3) + emergency (1, gapped)  
6. Secondary bay under a fold line  

Label every control and display from §§3–4. Stop. Do not add controls.

---

## Definition of Done

| # | Check |
|---|---|
| 1 | Entire Mixer faceplate is laid out |
| 2 | Every V1 button has location, size rank, group, neighbors, reason |
| 3 | Every V1 display has purpose, priority, update cadence, relationships |
| 4 | Eye-flow and hand-flow cover major journeys |
| 5 | Regions are final and dashboard-like extras are excluded |
| 6 | No styling decisions remain |
| 7 | No V1 behavior/terminology/state/source/timing changes |

---

## Execution state

**COMPLETE** — Paper prototype defines physical operation of the Broadcast Mixer. No visual styling. V1 Functional Specification remains locked.
