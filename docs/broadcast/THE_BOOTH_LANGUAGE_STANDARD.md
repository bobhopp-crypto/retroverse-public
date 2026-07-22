# The Booth — Language and Terminology Standard

**Project:** Retroverse Broadcast  
**Sprint:** The Booth — Language and Terminology Standard  
**Date:** 2026-07-21  
**Status:** Official vocabulary only — no code, no UI, no architecture changes.

**Authority documents (concepts):**
- [`THE_BOOTH_PRODUCT_SPECIFICATION.md`](./THE_BOOTH_PRODUCT_SPECIFICATION.md)
- [`THE_BOOTH_OPERATING_MODEL.md`](./THE_BOOTH_OPERATING_MODEL.md)
- [`THE_BOOTH_MIXER_CONTROL_SURFACE.md`](./THE_BOOTH_MIXER_CONTROL_SURFACE.md)

This document is the **single language contract** for The Booth. Every button, lamp, status message, log entry, dialog, tooltip, documentation page, and future Booth-facing API label must use these terms.

Engineering may keep internal names in code. **Operator-facing language must not.**

---

## Principle

Operators should never wonder whether two different words mean the same thing.

| Rule | Meaning |
|---|---|
| **One concept → one official name** | No casual synonyms on the console |
| **Buttons shout; prose can breathe** | Button labels are short and fixed; sentences may use the same words in title case |
| **Speak to the operator** | DJ / director language — not architecture |
| **New features inherit this glossary** | Do not invent a parallel vocabulary |

---

## 1. Official glossary

### Places and roles

| Official term | Definition | Notes |
|---|---|---|
| **The Booth** | Live production environment for Retroverse Broadcast | Always “The Booth” in prose; nav may say **Booth** |
| **Broadcast Mixer** | Primary operating console inside The Booth | Short form on console: **Mixer** |
| **Operator** | Person running The Booth | V1: single Operator |
| **Audience** | People receiving the public experience | Never “users” / “viewers” on the console |
| **Show** | Tonight’s event as a whole | e.g. “Sunday Night” |
| **BobOS** | Broader operating system outside The Booth | Not a Booth control label |
| **Cockpit** | BobOS home / mission board | Entry path, not part of Mixer faceplate |

### Air and ownership

| Official term | Definition |
|---|---|
| **The Air** | What the Audience is receiving right now |
| **On Air** | State / lamp: a Source currently owns The Air |
| **Source** | Anything that can own The Air |
| **Asset** | The specific content identity On Air (track, card, announcement name) |
| **Control** | Who may change The Air: **Operator** or **Automatic** |
| **Override** | Operator has seized Control; Automatic must not change The Air |
| **Return Target** | Where **RETURN** will send The Air (almost always Program) |

### Sources (V1 set)

| Official Source name | Definition |
|---|---|
| **Program** | Tonight’s planned rundown — home base Source |
| **VirtualDJ** | VirtualDJ as a Source On Air |
| **Announcement** | Prepared announcement Source |
| **Giveaway** | Prepared giveaway Source |
| **Emergency** | Safe halt / blackout / technical-difficulty Source |

### Actions

| Official term | Definition |
|---|---|
| **Take** | Cut The Air to the armed / named Source |
| **Return** | Give The Air back along the Return Target (default: Program) |
| **Go Live** | Enter show mode and Take Program |
| **Hold** | Freeze advancement; stay on current On Air intentionally |
| **Release Hold** | End Hold |
| **Pause** | Pause Program advancement / playback per show rules |
| **Resume** | Continue after Pause |
| **Previous** | Go to previous Program Asset when valid |
| **Next** | Advance to next Program Asset |
| **Preview** | View a candidate without putting it On Air |
| **Emergency Stop** | Immediate Take of Emergency |

### Timing and sequence

| Official term | Definition |
|---|---|
| **Current** | The Asset On Air right now (always pair with Source) |
| **Next** | Next Program Asset (Program Strip) |
| **Upcoming** | Armed interrupt Source/Asset if different from Next |
| **Elapsed** | Time current Asset has been On Air |
| **Remaining** | Time left when duration is known; otherwise omit or show em dash |

### Readiness

| Official term | Definition |
|---|---|
| **Runtime** | Studio / Live readiness for the night (go/no-go) |
| **VDJ** | Short label for VirtualDJ status on lamps/pads |
| **Automatic** | Policy that may Take or Return without a hand press when armed |
| **Audience Confirmed** | Public experience matches On Air |
| **Audience Fault** | Public experience not confirmed |

### Log / history

| Official term | Definition |
|---|---|
| **Show Log** | Operator-legible history of Takes, Returns, and faults |
| **Event** | One Show Log line |

---

## 2. Forbidden synonyms

These words **must not appear** in Booth operator UI, Mixer labels, Booth status copy, Show Log, or Booth docs aimed at operators — when they mean a glossary concept.

Engineering may use them internally.

### Retired from operator vocabulary

| Do not say | Use instead |
|---|---|
| Playhead | *(no operator term — speak Source / Asset / Next)* |
| Presentation | **Show** or **Program** (as appropriate) |
| Presentation item / Current item | **Asset** or **Current** |
| Broadcast item / Queue entry / Queue item | **Asset** (in Program: **Program Asset**) |
| Channel (as On Air metaphor) | **Source** / **The Air** |
| Feed | **The Air** or **On Air** |
| Deck (Booth metaphor) | **Source** (VirtualDJ may say “deck” only inside VirtualDJ product UI, not Mixer) |
| Clip / Scene / Screen (as Source types) | **Asset** or specific Source name |
| Live feed / Program out / PGME | **On Air** |
| Manual take / manual override (phrase salad) | **Override** + **Take** |
| Return to Live / Return to Auto | **RETURN** → Program; **Automatic** for policy |
| Skip (as separate from Next) | **NEXT** (V1) |
| Publish / Sync / Push (as Take language) | **TAKE** / **GO LIVE** |
| Now playing (alone) | **On Air** + **Asset** |
| Viewer / User / Patron (on console) | **Audience** |
| Error 500 / exception / hydrate | Operator fault messages (§6) |
| Bridge / OSC (as primary lamp names) | Fold into **VDJ** status (OSC may appear in Secondary diagnostics only) |
| Snapshot / Payload / Channel Zero | Never on console |

### Allowed only outside Booth faceplate

| Term | Where OK |
|---|---|
| Cockpit, Song Workspace, Runtime (app name) | BobOS navigation / escape links |
| VirtualDJ (full name) | Prose, docs; lamp short form **VDJ** |

---

## 3. Button language

### Capitalization

| Context | Style | Example |
|---|---|---|
| **Primary faceplate buttons** | All caps, short | `TAKE` `RETURN` `GO LIVE` |
| **Source pads** | All caps | `PROGRAM` `VDJ` `ANNOUNCE` `GIVEAWAY` `EMERGENCY` |
| **Secondary actions** | Title Case | `Load Show` `Arm Automatic` `Open Runtime` |
| **Dialog buttons** | Title Case | `Confirm Take` `Cancel` |

### Official button labels (locked)

| Official label | Action |
|---|---|
| **TAKE** | Take armed Source |
| **RETURN** | Return to Program (Return Target) |
| **GO LIVE** | Go Live |
| **HOLD** | Engage Hold (or toggle — if toggle, lamp shows state) |
| **RELEASE HOLD** | End Hold (if not a toggle) |
| **PREVIOUS** | Previous |
| **NEXT** | Next |
| **PAUSE** | Pause |
| **RESUME** | Resume |
| **EMERGENCY STOP** | Emergency Stop |
| **PREVIEW** | Preview (secondary) |

### Source pad labels (locked)

| Pad | Arms Source |
|---|---|
| **PROGRAM** | Program |
| **VDJ** | VirtualDJ |
| **ANNOUNCE** | Announcement |
| **GIVEAWAY** | Giveaway |
| **EMERGENCY** | Emergency |

### Wording rules

- Prefer **RETURN** not “Return to Program” on the button; Program is implied. Tooltip/prose may say “Return to Program.”
- Prefer **ANNOUNCE** on the pad; prose says **Announcement**.
- Never label Take as **PUBLISH**, **SYNC**, or **APPLY**.
- Never label Return as **UNDO** (Return to Previous may be secondary later: **RETURN PREVIOUS**).

---

## 4. Lamp language

### Capitalization

Lamp legends: **ALL CAPS**.

### Official lamps

| Lamp | Meaning | Color intent | On (steady) | Flashing | Off / disabled |
|---|---|---|---|---|---|
| **ON AIR** | Audience is under show control with a Source On Air | Red | Show is On Air | Transition / Take in flight | Not On Air / dark booth |
| **PROGRAM** | Program owns The Air | Green | Program On Air | — | Other Source or nothing |
| **VDJ** | VirtualDJ owns The Air | Amber/blue accent | VDJ On Air | — | Not VDJ On Air |
| **ANNOUNCE** | Announcement owns The Air | Amber | Announcement On Air | — | Off |
| **GIVEAWAY** | Giveaway owns The Air | Amber | Giveaway On Air | — | Off |
| **OVERRIDE** | Operator Control; Automatic blocked | Amber/white | Override active | — | Automatic may act (if armed) |
| **HOLD** | Hold active | Amber | Holding | — | Not holding |
| **RETURN READY** | RETURN will succeed to Return Target | Green | Ready | — | Return blocked / already Program with nothing to return |
| **EMERGENCY** | Emergency owns The Air or stop engaged | Red (distinct from ON AIR if needed — use pattern/position) | Emergency active | Urgent unconfirmed Emergency | Clear |
| **AUTO** | Automatic armed | Blue/gray | Armed | Auto Return pending | Disarmed |
| **RUNTIME** | Runtime go/no-go | Green = OK, Red = fault | OK | Degraded | Unknown / off |
| **VDJ CONNECTED** | VirtualDJ path available | Green | Connected | Intermittent | Disconnected |
| **VDJ PLAYING** | VirtualDJ is playing | Green/pulse | Playing | Beat pulse optional | Idle / unavailable |
| **AUDIENCE** | Audience confidence | Green = Confirmed, Red = Fault | Confirmed | Confirming… | Unknown |
| **FAULT** | Generic readiness fault (use sparingly; prefer named lamp) | Red | Fault present | — | Clear |

### Rules

- Master lamp for air is **ON AIR** — do not also use a master lamp named **LIVE**.
- Source-on-air may be pad illumination instead of duplicate center lamps; if both exist, names must match.
- **CONNECTED** appears only as **VDJ CONNECTED** (or folded into VDJ status text), not a lone **CONNECTED** lamp.
- **FAULT** alone is weak; prefer **AUDIENCE** fault state or **RUNTIME** fault.

---

## 5. Status messages

Operator-facing, short, present tense. No stack traces.

### Success

| Event | Message |
|---|---|
| Successful Take | `On Air: {Source} — {Asset}` |
| Successful Return | `Returned to Program — {Asset}` |
| Go Live | `On Air: Program — {Asset}` |
| Hold on | `Hold on — {Source} — {Asset}` |
| Hold released | `Hold released` |
| Automatic armed | `Automatic armed` |
| Automatic disarmed | `Automatic disarmed` |
| Audience confirmed | `Audience confirmed` |

### Confidence / in flight

| Event | Message |
|---|---|
| Take requested, confirming | `Taking {Source}…` |
| Return requested, confirming | `Returning to Program…` |
| Audience not yet confirmed | `On Air locally — confirming Audience…` |

---

## 6. Error messages

Speak to the operator. Say what failed and what to do next when obvious.

| Situation | Message |
|---|---|
| Failed Take | `Take failed — {Source} not On Air` |
| Failed Return | `Return failed — still On Air: {Source}` |
| Missing / unavailable Source | `{Source} unavailable` |
| Announcement missing | `Announcement not loaded` |
| Giveaway unavailable | `Giveaway unavailable` |
| No Program | `No Program loaded` |
| Take blocked (Override policy N/A) | `Cannot Take {Source}` |
| Runtime fault | `Runtime fault — check Runtime` |
| VirtualDJ disconnected | `VirtualDJ disconnected` |
| VirtualDJ unavailable for Take | `VirtualDJ unavailable` |
| Audience fault after Take | `Take not confirmed for Audience` |
| Network / public unreachable | `Audience unreachable` |
| Emergency active | `Emergency On Air` |
| Emergency Stop pressed | `Emergency Stop — Emergency On Air` |
| Auto Return cancelled | `Automatic Return cancelled — Override` |

### Forbidden in error copy

- Exception, undefined, null, 404, hydrate, playhead, snapshot, payload, stack, JSON

---

## 7. Log vocabulary

### Show Log format (official)

One Event per line. Fixed field order.

```
{HH:MM:SS}  {ACTION}  {Source}  {Asset?}  {Result?}
```

| Field | Rules |
|---|---|
| Time | 24-hour local booth time `HH:MM:SS` |
| ACTION | All caps from controlled list below |
| Source | Official Source name (or `—` if N/A) |
| Asset | Name/title when relevant; omit or `—` if none |
| Result | Optional: `OK` · `FAILED` · `UNCONFIRMED` · `CANCELLED` |

### Official ACTION words

| ACTION | When |
|---|---|
| **TAKE** | Operator or Automatic Take |
| **RETURN** | Return to Program (or Return Previous later) |
| **GO LIVE** | Go Live |
| **HOLD** | Hold engaged |
| **RELEASE** | Hold released |
| **PAUSE** | Pause |
| **RESUME** | Resume |
| **NEXT** | Next |
| **PREVIOUS** | Previous |
| **AUTO** | Automatic policy change (arm/disarm) — detail in Asset/note field |
| **EMERGENCY** | Emergency Stop or Emergency Take |
| **FAULT** | Runtime / Audience / VDJ fault noted |
| **CONFIRM** | Audience confirmed after pending Take |

### Examples

```
20:14:33  TAKE       VirtualDJ     Sugar Sugar           OK
20:18:42  RETURN     Program       Open Bumper           OK
20:25:01  TAKE       Announcement  Happy Hour            OK
20:25:48  RETURN     Program       Open Bumper           OK
20:40:12  TAKE       Giveaway      Tonight's Draw        UNCONFIRMED
20:40:15  CONFIRM    Giveaway      Tonight's Draw        OK
20:55:01  FAULT      VirtualDJ     —                     FAILED
20:55:01  RETURN     Program       Dance Block           OK
21:02:00  EMERGENCY  Emergency     Blackout              OK
```

### Style

- Source names in log: **Program**, **VirtualDJ**, **Announcement**, **Giveaway**, **Emergency** (not ANNOUNCE).
- Do not invent ACTIONS like `CUT`, `SWITCH`, `PUBLISH`.

---

## 8. Writing style guide

### Voice

- Direct, calm, present tense.  
- Address the Operator as a director/DJ, not a developer.  
- Prefer short sentences on the console.  
- Docs may explain; the Mixer must not lecture.

### Capitalization in prose

| Kind | Style |
|---|---|
| Official concepts | Capitalize as glossary: The Booth, The Air, Program, Override |
| Button references | ALL CAPS in backticks or bold: **TAKE** |
| Lamp references | ALL CAPS: **ON AIR** |
| Sentences | Normal sentence case; do not shout full paragraphs |

### Preferred phrases

| Prefer | Avoid |
|---|---|
| On Air: Program — Open Bumper | Now playing presentation item… |
| Take VirtualDJ | Switch playhead to VDJ deck |
| Return to Program | Exit manual mode / clear override flag |
| Audience confirmed | Public snapshot synced |
| VirtualDJ disconnected | Bridge OSC failed |

### Numbers and time

- Elapsed / Remaining: `m:ss` or `h:mm:ss`  
- Clock in Show Log: `HH:MM:SS`  
- Do not show milliseconds to the Operator  

---

## 9. Naming rules for future Booth features

Before adding any new Booth term:

1. **Live-event test** — Would you say this word standing in a DJ booth?  
2. **Glossary collision** — Does an official term already cover it? If yes, reuse it.  
3. **No synonym drift** — Do not add “Stage,” “Feed,” or “Deck” for The Air / Source.  
4. **New Source?** — Add to glossary Source table + pad label + lamp + log Source name together.  
5. **New button?** — ALL CAPS faceplate label; one verb; add to button table.  
6. **New lamp?** — ALL CAPS; define color, steady/flash/off; add to lamp table.  
7. **New log ACTION?** — ALL CAPS; single verb; document here first.  
8. **API for Operators** (if any)** — Response fields shown in Booth use glossary names, not internal schema names.  
9. **Never import BobOS department names** onto the faceplate (Song Workspace, Research, Pass Production).  
10. **When in doubt** — Prefer fewer words. Propose an addition to this document before shipping UI copy.

### Template for a vocabulary addition

```
Term:
Kind: Source | Action | Lamp | Message | Log ACTION | Other
Definition:
Replaces / forbids:
Button label (if any):
Lamp (if any):
Log form (if any):
```

---

## Quick reference card

**Sources:** Program · VirtualDJ · Announcement · Giveaway · Emergency  

**Buttons:** TAKE · RETURN · GO LIVE · HOLD · PREVIOUS · NEXT · PAUSE · RESUME · EMERGENCY STOP  

**Master lamps:** ON AIR · OVERRIDE · HOLD · EMERGENCY · RUNTIME · VDJ · AUTO · AUDIENCE  

**Core sentence:** Take a Source On Air. Return to Program. Never doubt The Air.

---

## Definition of Done

| # | Check |
|---|---|
| 1 | Official glossary covers Booth concepts without duplicates |
| 2 | Forbidden synonyms are listed for operator surfaces |
| 3 | Button labels are locked |
| 4 | Lamps have meaning + color intent + on/flash/off |
| 5 | Success and error messages speak to the Operator |
| 6 | Show Log format and ACTIONS are fixed |
| 7 | Future features have naming rules |
| 8 | The Booth can sound like one product |

---

## Execution state

**COMPLETE** — Language and terminology standard delivered. No code, no UI, no architecture changes.
