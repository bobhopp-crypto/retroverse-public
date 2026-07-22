# The Booth — Broadcast Mixer Control Surface

**Project:** Retroverse Broadcast  
**Sprint:** The Booth — Broadcast Mixer Control Surface  
**Date:** 2026-07-21  
**Status:** Console definition only — no implementation code, no React components, no visual mockups.

**Builds on:**
- [`THE_BOOTH_PRODUCT_SPECIFICATION.md`](./THE_BOOTH_PRODUCT_SPECIFICATION.md)
- [`THE_BOOTH_OPERATING_MODEL.md`](./THE_BOOTH_OPERATING_MODEL.md)

This document defines the **physical control surface** of the Broadcast Mixer — as if it were hardware on a desk in The Booth.

---

## The question

If this were a real piece of hardware sitting in front of me:

- What controls would it have?
- What displays would it have?
- What would always be visible?

The Mixer is not another dashboard. It is the **operating console** inside The Booth. Everything on it exists because it helps operate a live show.

---

## 1. Mixer philosophy

### Console, not CMS

| The Mixer is… | The Mixer is not… |
|---|---|
| A switcher / board / VDJ-style console | An admin dashboard |
| Built for hands and glances | Built for scrolling and forms |
| Stable under stress | Reconfigurable mid-show |
| One layout for the whole night | A nest of tabs that hide air truth |

### Hardware rules applied to software

1. **Dedicated buttons for repeated verbs** — Take, Return, Hold, Next, Previous, Emergency.  
2. **Lamps for state** — ON AIR, OVERRIDE, HOLD, EMERGENCY, VDJ, RUNTIME.  
3. **Never blank the master meters** — On Air identity never leaves the faceplate.  
4. **Secondary behind a cover** — useful, not in the primary reach zone.  
5. **No mystery soft-keys** — every primary control has a permanent label.  
6. **Live-event justification** — if you would not put it on a hardware panel for Sunday night, it does not earn faceplate space.

### Operator belief (from Operating Model)

Bob is cutting **Sources** to **The Air**. The console must make Source selection, Take, Return, and confirmation feel physical.

---

## 2. Control groups

Final recommended groups for the console:

| Group | Role on the board |
|---|---|
| **A. Master Status** | Show-wide lamps and readiness (top strip) |
| **B. On Air Master** | What owns The Air — always center / dominant |
| **C. Source Select** | What can be Taken — Program, VDJ, Announcement, Giveaway, Emergency |
| **D. Transport** | Pause, Resume, Previous, Next, Hold |
| **E. Take / Return** | The cut bus — largest verbs |
| **F. Monitoring** | Local + Public confidence (eyes, not editing) |
| **G. Program Strip** | Now / Next / Return target within Program |
| **H. Emergency** | Isolated, unmistakable, hard to hit by accident — easy to hit on purpose |
| **I. Secondary Bay** | History, notes, load show, arm Automatic — present but not dominant |

### Groups considered and not promoted to first-class faceplate

| Rejected as primary group | Why |
|---|---|
| Operator Notes as a whole zone | Secondary Bay only in V1 |
| Full “Live Controls” separate from Take/Return | Collapses into Take/Return + Source Select |
| Sampler bank farm | Expansion — not V1 faceplate |
| Deep diagnostics | Link out / Secondary — not a mixer quadrant |

---

## 3. Permanent displays (never disappear)

These must **never** leave the console face during a show. No tab may hide them.

### Mandatory (V1)

| Display | Operator question |
|---|---|
| **Current Source (On Air)** | What kind of thing owns The Air? |
| **Current Asset** | What exact item/track/card is On Air? |
| **Who owns The Air / CONTROL** | Operator vs Automatic |
| **Override State** | Is Automatic blocked? |
| **Return Target** | Where does Return go? (almost always Program + item) |
| **Next Program Item** | What Program will do when we Return / advance |
| **Upcoming Source** (if different from Next Program) | What interrupt is armed, if any |
| **Elapsed Time** (on current On Air asset) | How long has this been up? |
| **Runtime Status** (go/no-go compact) | Can we trust the booth chain? |
| **VirtualDJ Status** (connected / playing / unavailable) | Can we Take VDJ? |
| **Emergency State** | Are we in Emergency? |

### Strongly recommended (V1 if space allows; still permanent)

| Display | Notes |
|---|---|
| **Remaining Time** | When asset has a known duration; otherwise “—” not a fake clock |
| **Hold State** | Lamp + word; also listed under indicators |
| **Last action** (one log line) | Confidence — “TAKE Announcement · confirmed” |

### Not mandatory on faceplate

| Display | Placement |
|---|---|
| Full show history | Secondary Bay |
| Long operator notes | Secondary Bay |
| Full Runtime service list | Runtime app (status lamp + open link) |
| Queue of entire night | Program Strip shows Now/Next; full list Secondary |

---

## 4. Primary controls

Controls used repeatedly. These earn **dedicated buttons** (permanent positions, large hit targets, never buried).

### Dedicated buttons (V1)

| Control | Group | Why dedicated |
|---|---|---|
| **Take** | Take/Return | The cut — commits selected Source to The Air |
| **Return to Program** | Take/Return | As important as Take |
| **Hold** | Transport | Freeze without mystery |
| **Release Hold** | Transport | Or Hold toggles; must be obvious |
| **Pause** | Transport | Stop advancement / playback per show rules |
| **Resume** | Transport | Continue |
| **Previous** | Transport | Back one Program step when valid |
| **Next** | Transport | Advance Program (Skip may alias Next in V1) |
| **Go Live** | Take/Return | Enter show + Take Program (doors/open) |
| **Emergency Stop** | Emergency | Hard cut to Emergency / safe halt |

### Source Take pads (dedicated select + shared Take, or per-source Take)

V1 recommendation: **Source select buttons** + one master **TAKE**, plus **RETURN**.

| Pad | Meaning |
|---|---|
| **PROGRAM** | Arm Program as Take target |
| **VDJ** | Arm VirtualDJ |
| **ANNOUNCE** | Arm Announcement (with named slot if one primary) |
| **GIVEAWAY** | Arm Giveaway |
| **EMERGENCY** | Arm Emergency (still requires TAKE or use Emergency Stop for immediate) |

**Emergency Stop** may Take Emergency immediately without arming — hardware panic behavior.

### Skip

In V1, **Skip = Next** unless a distinct “skip without logging as operator preference” appears later. Do not add two buttons that do the same thing.

---

## 5. Secondary controls

Useful; must not dominate the console. Live in **Secondary Bay** or require a deliberate open (cover / drawer metaphor — still not a different product).

| Control | Why secondary |
|---|---|
| **Load / Select tonight’s Show** | Pre-show; rare mid-show |
| **Arm / Disarm Automatic** (VDJ follow + Auto Return policy) | Important but not every song |
| **Preview** | Confidence before Take; not transport |
| **Announcement picker** (if more than one) | Choose slot, then Take |
| **Giveaway picker** | Same |
| **Return to Previous** | Depth-1 undo; less common than Return to Program |
| **Refresh monitors** | When confidence faults |
| **Open Runtime** | Escape hatch |
| **Show history** (scroll last N events) | Review, not drive |
| **Operator note** (one line) | Optional scribble |
| **Full Program list** | Inspect / jump — Jump is secondary unless used constantly |

### Jump to Program item

Allowed in V1 as secondary: select item → Take Program at that item. Not a primary row of 40 buttons.

---

## 6. Status indicators

### Every indicator that should exist (V1)

| Indicator | Meaning | Size |
|---|---|---|
| **ON AIR** | Show is feeding Audience (master lamp) | **Large** |
| **PROGRAM** | Program Source is On Air | Medium (or source lamp on PROGRAM pad) |
| **VDJ** / **LIVE (VDJ)** | VirtualDJ is On Air | Medium on VDJ pad |
| **ANNOUNCE** | Announcement On Air | Medium |
| **GIVEAWAY** | Giveaway On Air | Medium |
| **OVERRIDE** | Operator has seized; Automatic blocked | **Large** |
| **HOLD** | Advancement frozen | **Large** |
| **RETURN READY** | Return to Program is valid / armed | Medium |
| **EMERGENCY** | Emergency owns The Air or stop engaged | **Large** (distinct color language) |
| **AUTO ARMED** | Automatic policy may Take/Return | Medium |
| **VDJ CONNECTED** | Bridge healthy | Medium |
| **VDJ PLAYING** | Deck playing (pulse) | Medium |
| **OSC** | OSC path OK (can fold into VDJ CONNECTED in V1) | Small / fold |
| **RUNTIME** | Studio/Live go-no-go | Medium |
| **AUDIENCE CONFIRMED** | Public monitor agrees with On Air | **Large** when fault; steady when OK |
| **AUDIENCE FAULT** | Public not confirmed | **Large** |

### Large visual indicators (must read across the room)

1. **ON AIR**  
2. **EMERGENCY**  
3. **OVERRIDE**  
4. **HOLD**  
5. **AUDIENCE CONFIRMED / FAULT**  

Source-which lamps can be pad-integrated (PROGRAM/VDJ/etc. lit when On Air).

### Naming note

Avoid a second master lamp named **LIVE** that competes with **ON AIR**.  
Use **ON AIR** for the master. Use **VDJ** for VirtualDJ-on-air.

---

## 7. Operator eye flow

Where the eyes go during a show — and therefore where the console regions sit.

### Recommended arrangement

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TOP — Master Status                                                     │
│ ON AIR · OVERRIDE · HOLD · EMERGENCY · RUNTIME · VDJ · AUTO · AUDIENCE  │
├────────────────────┬──────────────────────────────┬─────────────────────┤
│ LEFT               │ CENTER                       │ RIGHT               │
│ Source Select      │ On Air Master                │ Program Strip       │
│ What can be taken  │ What IS live                 │ What happens next   │
│ PROGRAM VDJ        │ Source · Asset · Elapsed     │ Next item           │
│ ANNOUNCE GIVEAWAY  │ CONTROL · Return target      │ Return target echo  │
│ EMERGENCY arm      │ Local + Public monitors      │ Upcoming interrupt  │
├────────────────────┴──────────────────────────────┴─────────────────────┤
│ BOTTOM — Transport + Take/Return                                        │
│ Prev · Pause · Resume · Next · Hold          TAKE · RETURN · GO LIVE    │
│                              [ EMERGENCY STOP ]                         │
├─────────────────────────────────────────────────────────────────────────┤
│ SECONDARY BAY (collapsed by default) — history · load · auto · notes    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Natural gaze path

| Priority | Region | When |
|---|---|---|
| 1 | **Center — On Air Master** | Continuous — “what is live?” |
| 2 | **Bottom — Take / Return / Transport** | Every cut and advance |
| 3 | **Left — Source Select** | Before a Take |
| 4 | **Right — Program / Next** | Before Return or Next |
| 5 | **Top — Master lamps** | Exception scan — fault, emergency, audience |
| 6 | **Secondary Bay** | Pre-show, recovery, curiosity |

### Why this order

- Directors look at **program out** (center) first.  
- Hands rest on **transport + take bus** (bottom).  
- Sources sit like **input rows** (left).  
- Preview/next sits like **preview + program bus** intuition (right = next/program).  
- Tallies live on the **top LED row**.

---

## 8. Version 1 console layout (described, not drawn)

### Faceplate inventory (complete V1)

**Top strip — lamps**  
ON AIR · OVERRIDE · HOLD · EMERGENCY · RUNTIME · VDJ CONNECTED · VDJ PLAYING · AUTO ARMED · AUDIENCE OK/FAULT  

**Center — On Air Master (always)**  
- Source name  
- Asset identity  
- Elapsed (and Remaining if known)  
- CONTROL: Operator | Automatic  
- Return target  
- Local monitor summary  
- Public monitor summary  

**Left — Source Select**  
Pads: PROGRAM · VDJ · ANNOUNCE · GIVEAWAY · EMERGENCY (arm)  
Selected pad is highlighted; unavailable pads dark/disabled with reason on glance.

**Right — Program Strip**  
- Show name  
- Next Program item  
- Upcoming armed interrupt (if any)  
- RETURN READY lamp echo  

**Bottom — primary hands**  
- Transport: Previous · Pause · Resume · Next · Hold  
- Cut bus: **TAKE** · **RETURN TO PROGRAM** · **GO LIVE**  
- Separate: **EMERGENCY STOP** (offset, protected)

**Secondary Bay (below fold / cover)**  
Load Show · Arm/Disarm Automatic · Preview · History (last N) · Open Runtime · optional note · full Program list / Jump  

### What V1 deliberately omits from the faceplate

- Sampler grid  
- Sponsor / Intermission source pads  
- Multi-announcement matrix  
- OSC as its own giant lamp (folded into VDJ)  
- Operator notes as a primary column  
- Architecture or sync debugging widgets  

### One-show test

If Bob can run doors → program → announcement → giveaway → VDJ → return → close using only Top + Center + Left + Right + Bottom, V1 layout is sufficient.

---

## 9. Expansion opportunities

Add only when a real night demands them — still as console groups, not dashboards:

| Expansion | Where it attaches |
|---|---|
| Sampler pads | New left/lower bank under Source Select |
| Multiple announcement carts | Expand ANNOUNCE into a short bank |
| Sponsor / Intermission Sources | Additional Source pads |
| Return to Previous button | Beside Return to Program |
| Rehearsal tally | Extra top lamp: REHEARSAL |
| Second public destination | Extra monitor leaf — dangerous; product caution |
| Dual-operator lock lamps | Top strip later |
| Duration timeline scrub | Program Strip upgrade — not primary V1 |

---

## 10. Acceptance criteria

Another engineer can build the Broadcast Mixer **without inventing new controls or rearranging operator workflow** if they can affirm:

| # | Criterion |
|---|---|
| 1 | Mixer is specified as a **console**, not a dashboard |
| 2 | All **mandatory permanent displays** are listed and never tab-hidden |
| 3 | **Control groups** A–I are the only primary organization |
| 4 | **Dedicated primary buttons** match §4 — no substitutes without product revision |
| 5 | **Secondary controls** stay out of the primary reach zones |
| 6 | **Large indicators** are exactly the master set in §6 |
| 7 | **Eye flow** follows Top status · Center On Air · Left sources · Right next · Bottom hands |
| 8 | V1 faceplate inventory in §8 is the build checklist |
| 9 | No feature added “because the API exists” without live-event justification |
| 10 | Operating Model vocabulary (Air, Source, Take, Return) is preserved in labels |

### Build gate (later implementation sprints)

Implementation may start only when the implementer uses this document as the control surface contract and does not:

- Relocate On Air identity into a secondary tab  
- Merge Emergency into a generic menu  
- Replace Take/Return with CMS publish language  
- Add Song Workspace / Research / admin onto the faceplate  

---

## Quick reference — V1 button row

```
[PREV] [PAUSE] [RESUME] [NEXT] [HOLD]     [[[ TAKE ]]] [RETURN] [GO LIVE]     [EMERGENCY STOP]
```

## Quick reference — V1 source pads

```
[ PROGRAM ] [ VDJ ] [ ANNOUNCE ] [ GIVEAWAY ] [ EMERGENCY ]
```

## Quick reference — never hide

```
On Air Source · Asset · CONTROL · Return Target · Next Program · Elapsed ·
Runtime · VDJ · Emergency · Override · Audience confidence
```

---

## Execution state

**COMPLETE** — Broadcast Mixer control surface defined. No code, no components, no visual mockups.
