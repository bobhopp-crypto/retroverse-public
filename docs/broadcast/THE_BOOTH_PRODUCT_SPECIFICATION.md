# The Booth — Product Specification

**Project:** Retroverse Broadcast  
**Sprint:** The Booth — Product Specification (Design Before Implementation)  
**Date:** 2026-07-21  
**Status:** Product definition only — no implementation, no UI redesign, no architecture changes in this sprint.

**Related (completed):**
- [`BROADCAST_MIXER_ARCHITECTURE_AUDIT.md`](./BROADCAST_MIXER_ARCHITECTURE_AUDIT.md) — what the system does today
- Cockpit Runtime recovery — Studio/Runtime health restored

This document defines **what The Booth is as a product**. It does not prescribe how to refactor state, APIs, or screens.

---

## 1. The Booth vision

Retroverse Broadcast is operated from a place called **The Booth**.

The Booth is exactly what it sounds like.

Just as a DJ walks into a DJ booth to operate VirtualDJ, the Retroverse operator walks into **The Booth** to operate the public show.

The Booth is the **live production environment**.

Inside The Booth is the primary control surface:

**The Broadcast Mixer** — the heart of The Booth.

The Booth is not BobOS.  
BobOS is the operating system.  
The Booth is the room you enter when it is showtime.

---

## 2. Product definition

### What is The Booth?

The Booth is the operator’s dedicated live-event workspace for Retroverse Broadcast.

It is a **production booth**, not a content management system, not an admin console, and not a research desk.

Its job is to let one operator run a live public experience with:

- confidence about what the audience is seeing
- immediate control when something must change
- a clear path back to the planned program
- no surprise side effects from unrelated tools

### Who uses it?

| Role | Relationship to The Booth |
|---|---|
| **Primary operator (Bob)** | Sole intended user of Version 1. Runs Sunday nights and other live broadcasts. |
| **Audience** | Never enters The Booth. Consumes the public site / Live experience. |
| **Builders / researchers** | Use BobOS outside The Booth (Song Workspace, catalog, AI, packages, etc.). |

Version 1 assumes a **single operator**. Multi-operator handoff is future work.

### When is it used?

| Phase | Booth usage |
|---|---|
| **Pre-show** | Enter Booth, verify Runtime and VirtualDJ, load tonight’s broadcast, confirm preview matches intent |
| **Doors / audience arriving** | Hold or scheduled program; announcements ready |
| **Showtime** | Go Live; run program; announcements; giveaways; VDJ takes; return to program |
| **Close** | Return to program or blackout; confirm public state; leave Booth |
| **Not showtime** | Prefer BobOS Cockpit and department tools. Booth may still open for rehearsal, but product design optimizes for live nights. |

### What problems does it solve?

1. **Authority confusion** — Operator must always know what is live, what is next, why, and who has control.
2. **Latency of control** — Live rooms cannot wait for dashboard navigation or multi-step CMS publishes.
3. **Irreversible mistakes** — Operator needs reversible actions and an obvious “return to program.”
4. **Tool sprawl during show** — Opening Song Workspace or Research mid-show is the wrong affordance; Booth excludes those paths.
5. **Split attention** — One screen should carry the night; secondary info may exist, but the Mixer carries the show.

### Product statement

> **The Booth is where Retroverse goes live.**  
> **The Mixer is how the operator runs the show.**  
> **Everything else in BobOS prepares the show.**

---

## 3. Design philosophy

### Core principles

| Principle | Meaning in The Booth |
|---|---|
| **Simple** | Few surfaces. Obvious verbs. No CMS metaphors. |
| **Reliable** | Prefer boring, proven controls over clever automation surprises. |
| **One-screen operation** | A full Sunday night should be runnable primarily from the Mixer without hunting other apps. |
| **Large controls** | Transport and Take/Return are primary; tiny icon strips are secondary. |
| **Minimal clicks** | Common actions: one intentional click (with confirmation only when destructive). |
| **Always visible** | Live, next, reason, and control ownership never hide behind tabs during showtime. |
| **Nothing unexpected** | Automation may assist; it must never silently steal the night without a visible mode. |
| **Manual wins** | Operator override always beats AUTO / VDJ follow / schedule when engaged. |
| **Reversible** | Every take has a return. Every skip has a previous (where media allows). Emergency paths are explicit. |

### Operator certainty (non-negotiable)

At all times the operator must be able to answer:

1. **What is live?** — What the public is seeing right now  
2. **What is next?** — What will follow if nothing is interrupted  
3. **Why is it live?** — Program / announcement / giveaway / VDJ / manual take / hold / emergency  
4. **Who has control?** — Operator manual, AUTO follow, VirtualDJ, or system hold  

If any of those four is unclear, The Booth has failed its product job — regardless of how many features exist.

### Mental model: DJ booth, not dashboard

| Think like… | Not like… |
|---|---|
| Live board / mixer | Admin CMS |
| Transport deck | Spreadsheet queue editor |
| “On air” lamp | Status badges for twelve microservices |
| Take / return | Publish / draft workflows |
| Sampler pads | Nested settings panels |

### Live-event rule

Nothing belongs inside The Booth unless it is genuinely useful **during a live event**.

Ask for every feature:

> *If I were standing in the DJ booth with a room full of people, would I use this?*

If the answer is no, it belongs somewhere else in BobOS.

---

## 4. Responsibilities

### The Booth owns

| Responsibility | Description |
|---|---|
| **On-air control** | Decide what the public experience presents during the event |
| **Transport** | Play / pause / resume / skip / previous / jump within the live program |
| **Mode control** | Manual take vs return to program vs AUTO / VDJ follow (as product modes, not engineering jargon) |
| **Interruptions** | Announcements, giveaways, sampler hits — then return |
| **Live confidence** | Show local + public monitor truth so the operator trusts the take |
| **Show readiness** | Confirm Runtime, VirtualDJ bridge, and tonight’s loaded broadcast before Go Live |
| **Emergency** | Stop / blackout / safe return when something goes wrong |

### The Booth does not own

| Responsibility | Where it lives instead |
|---|---|
| Building song packages | Song Workspace / catalog tools |
| Research, charts, integrity | Research / Catalog Integrity |
| AI authoring and long jobs | AI Workbench / Content Creator |
| Pass artwork, print, serials | Pass Production / Pass Management |
| Event planning docs | Event Producer / Event Hub (prep) |
| Credentials / admin | Credentials, ops admin |
| Deep Runtime process surgery | Runtime app (Booth only needs go/no-go status) |
| Architecture / SSoT refactor | Engineering sprints after this product definition |

Prep tools may **feed** The Booth (tonight’s queue, announcement assets, giveaway state). They are not operated *inside* The Booth during the show.

---

## 5. What belongs inside The Booth

Applications / surfaces that pass the live-event rule:

| Surface | Why it belongs |
|---|---|
| **Broadcast Mixer** | Primary control surface — heart of The Booth |
| **Queue (show program)** | Tonight’s order of what airs; must stay visible or one gesture away |
| **Live Monitor** | What local and public audiences are seeing |
| **Runtime Status (go/no-go)** | Studio / Live / bridge readiness before and during show |
| **VirtualDJ Status** | Deck playing? Bridge connected? Takeover possible? |
| **Announcements** | Timed or pad-triggered show interruptions |
| **Giveaways** | Live giveaway moments during the night |
| **Sampler** | Instant one-shot hits (stingers, bumps) without leaving Mixer |
| **Diagnostics (thin)** | Only enough to answer “why isn’t it live?” — not full Atlas |

These may be **panels within one Booth shell** or tightly coupled views around the Mixer. Product intent: they feel like parts of one booth, not separate BobOS destinations.

---

## 6. What does not belong inside The Booth

| Out of Booth | Why |
|---|---|
| Song Workspace | Package / experience editing — prep work |
| Research Center | Not live transport |
| Package editing | Not showtime |
| Catalog maintenance | Integrity and graph work |
| AI authoring | Slow, creative, non-reversible in the live sense |
| Metadata editing | Desk work |
| Long-form reports | Post-show or prep |
| Administration / ops PIN tools | Security and CMS |
| Pass Production / Design Builder | Manufacturing |
| Credentials Studio | Identity product |
| Full Runtime service management | Use Runtime app; Booth only needs status + link |
| Presentation Studio as a second “mixer” | Prep/publish may remain in BobOS; live night is Mixer-first |
| Cockpit as a whole | Cockpit is the OS home; Booth is the show room entered *from* Cockpit |

**Rule of placement:** If it helps *build* the night, it is BobOS. If it helps *run* the night, it is The Booth.

---

## 7. Broadcast Mixer responsibilities

The Broadcast Mixer is the primary workspace inside The Booth.

The operator should be able to run an entire Sunday night **primarily from the Mixer**.

### Always visible (never require changing screens)

| Information | Operator question answered |
|---|---|
| **ON AIR indicator** | Is the public feed in a live/show state? |
| **Now playing / now showing** | What is live? |
| **Next up** | What is next? |
| **Why live** | Program item, VDJ, announcement, giveaway, hold, manual, emergency |
| **Control owner** | Manual operator vs AUTO/VDJ follow vs hold |
| **Local monitor** | What Studio believes is presenting |
| **Public monitor** | What the public site is presenting (or last known) |
| **VirtualDJ pulse** | Playing / idle / disconnected |
| **Program identity** | Tonight’s broadcast / presentation name |

### Always immediately available (primary controls)

| Control class | Intent |
|---|---|
| **Take Live / Go Live** | Commit operator intent to air |
| **Return to Program** | Leave interrupt / manual / VDJ overlay and restore planned show |
| **Transport** | Pause, Resume, Previous, Next / Skip |
| **Hold** | Freeze advancement without mystery |
| **Announcement / Giveaway triggers** | Start known live moments |
| **VDJ Take / Release** (or equivalent product verbs) | Bring VirtualDJ to air; return to program |
| **Emergency Stop / Blackout** | Safe visible halt |

### Secondary (allowed, but not required for the core night)

| Secondary | Notes |
|---|---|
| Queue reorder / inspect full list | Available without leaving Booth; not the default focus mid-song |
| Preview (not on air) | Confidence before take |
| Publish / load tonight’s broadcast | Pre-show; may be a Booth step before doors |
| Sampler bank select | After core transport is solid |
| Thin diagnostics drawer | Only when something is wrong |
| Link out to Runtime / full VirtualDJ tools | Escape hatch, not the home |

### Must never require leaving The Booth during showtime

- Taking something live  
- Returning to program  
- Skip / previous / pause / resume  
- Seeing what is live and next  
- Knowing who has control  
- Triggering the night’s planned announcement / giveaway moments  
- Emergency stop / blackout  

### Mixer product boundary

The Mixer is responsible for **operating** the live program.

It is not responsible for **authoring** the catalog of the universe, designing passes, or editing song packages. Those prepare the assets the Mixer plays.

---

## 8. Live operator workflow

Walkthrough of an actual event night. Every step is an **operator interaction**, not an implementation step.

### Phase A — Enter The Booth

1. Operator opens The Booth from BobOS (e.g. Cockpit → Booth / Broadcast).  
2. Booth shows Mixer as the dominant surface.  
3. Operator confirms the four certainties are readable (even if not yet live).

**Done when:** Operator feels “I am in the booth,” not “I am in a settings app.”

### Phase B — Verify Runtime

1. Operator checks Runtime go/no-go (Studio up, Live local/public reachable as required).  
2. If red/degraded: fix outside or via Runtime link **before** audience depends on the show.  
3. No deep process surgery inside Mixer.

**Done when:** Runtime status is acceptable for tonight.

### Phase C — Verify VirtualDJ

1. Operator confirms VirtualDJ is running and the bridge reports connected / recent pulse.  
2. Operator confirms a test or known idle/playing state matches expectation.  
3. Operator notes whether AUTO follow is armed or disarmed for doors.

**Done when:** VDJ can be trusted as a live source if needed.

### Phase D — Load tonight’s broadcast

1. Operator selects or confirms tonight’s program (presentation / broadcast already prepared in BobOS).  
2. Queue shows order; Now/Next make sense.  
3. Optional: Preview confirms first moments without taking public incorrectly.  
4. Publish / sync confidence: public will receive what Booth intends (product-level “ready,” not engineering detail).

**Done when:** Tonight’s show is loaded and the Mixer displays the correct program identity.

### Phase E — Audience arrives

1. Operator holds or runs doors program (ambient / scheduled / hold — product choice per night).  
2. Announcements and giveaways are visible as ready, not being edited.  
3. Operator watches Live Monitor as traffic arrives.

**Done when:** Room can fill without the operator leaving Booth.

### Phase F — Go Live

1. Operator executes **Go Live / Take Live** for the show’s open.  
2. ON AIR is unmistakable.  
3. Now / Next / Why / Who update to match.  
4. Operator verifies Public Monitor agrees (or knowingly notes delay and rechecks).

**Done when:** Operator trusts the open is on air.

### Phase G — Play announcements

1. Operator triggers **Play Announcement** (named, prepared).  
2. Why-live becomes Announcement; control owner remains Operator (manual).  
3. When finished (or on command), **Return to Program**.  
4. Program resumes at the correct next/now without scavenger hunt.

**Done when:** Announcement aired and program restored cleanly.

### Phase H — Run giveaways

1. Operator triggers **Play Giveaway** / giveaway moment.  
2. Booth shows giveaway is the live reason.  
3. Operator completes the live moment (display winner / hold / next beat — as prepared).  
4. **Return to Program** when the moment is over.

**Done when:** Giveaway moment completes without opening admin tools mid-show.

### Phase I — Take VirtualDJ live

1. Operator (or armed AUTO, if intentionally enabled) brings VirtualDJ to air.  
2. Why-live = VirtualDJ; Now shows the live track identity.  
3. Manual always wins if operator takes control.  
4. Operator can still emergency-stop or return.

**Done when:** Room hears/sees the DJ take with Booth reflecting that truth.

### Phase J — Return to scheduled program

1. Operator executes **Return to Program** (or equivalent clear verb).  
2. VDJ overlay / manual interrupt releases.  
3. Now/Next restore planned program.  
4. Who-has-control returns to the intended mode (Program / AUTO as chosen).

**Done when:** Show is back on rails with no mystery state.

### Phase K — Close the night

1. Operator winds to final item, hold, or blackout as planned.  
2. **Emergency Stop / Blackout** available if needed.  
3. Confirm public is in the intended end state.  
4. Leave The Booth; post-show analysis happens in BobOS, not in Booth.

**Done when:** Night is closed; Booth is quiet; no leftover “fake live” ambiguity.

---

## 9. Command inventory

Commands the operator needs, organized by purpose.  
Names are **product verbs**; exact UI labels may refine later. This is not an API list.

### 9.1 Air & mode

| Command | Purpose |
|---|---|
| **Go Live / Take Live** | Put intended program or take on air |
| **Return to Program** | Leave interrupt/manual/VDJ overlay; restore planned show |
| **Arm AUTO Follow** | Allow VirtualDJ / automatic follow when policy says so |
| **Disarm AUTO Follow** | Prevent automatic theft of the night |
| **Hold** | Freeze advancement; stay on current intentionally |
| **Release Hold** | Allow program to continue |

### 9.2 Transport

| Command | Purpose |
|---|---|
| **Pause** | Stop advancement / playback of program clock as defined for live |
| **Resume** | Continue after pause |
| **Next / Skip** | Advance to next program item |
| **Previous** | Go to previous item when valid |
| **Jump to item** | Select a specific queue item (still one Booth surface) |

### 9.3 Interruptions

| Command | Purpose |
|---|---|
| **Play Announcement** | Air a prepared announcement |
| **Play Giveaway** | Air giveaway moment |
| **Sampler Hit** | Fire a one-shot pad |
| **End Interrupt** | Explicit end if not automatic (may alias Return to Program) |

### 9.4 VirtualDJ

| Command | Purpose |
|---|---|
| **Take VirtualDJ Live** | Force VDJ to air under operator control |
| **Release VirtualDJ** | Clear VDJ-as-air; return toward program/AUTO policy |

### 9.5 Confidence & safety

| Command | Purpose |
|---|---|
| **Preview** | See candidate without committing air (pre-show / cautious take) |
| **Publish / Load Show** | Make tonight’s prepared broadcast the active program (pre-show) |
| **Refresh Monitors** | Force confidence re-check of local/public (if ever stale) |
| **Emergency Stop** | Immediate safe halt of live advancement / takes |
| **Blackout** | Deliberate empty/safe public visual state |

### 9.6 Readiness (Booth-adjacent, not deep admin)

| Command | Purpose |
|---|---|
| **Open Runtime** | Escape to Runtime only if go/no-go fails |
| **Retry bridge status** | Re-check VirtualDJ path without leaving show mindset |

### Command priority for Version 1

**Must have:** Go Live, Return to Program, Pause, Resume, Next, Previous, Hold, Take/Release VirtualDJ (or clear AUTO+manual model), Emergency Stop, visibility of Now/Next/Why/Who.

**Should have:** Announcement, Giveaway, Blackout, Preview, Load Show.

**Later:** Rich sampler banks, multi-announcement playlists, advanced jump UX, multi-operator lock.

---

## 10. Version 1 scope

Keep Version 1 intentionally small. Optimize for **reliability, clarity, operator confidence**.

### V1 includes

1. **The Booth** as a named live environment (entered for showtime).  
2. **Broadcast Mixer** as the dominant, one-screen control surface.  
3. **Always-visible** Now / Next / Why / Who + ON AIR.  
4. **Local + Public Live Monitor** (confidence pair).  
5. **Runtime go/no-go** and **VirtualDJ status** (compact, always glanceable).  
6. **Core commands:** Go Live, Return to Program, Pause, Resume, Next, Previous, Hold, Emergency Stop.  
7. **VirtualDJ take/release** (or equivalent clear manual vs AUTO behavior that the operator understands).  
8. **Load tonight’s broadcast** enough to run a Sunday night from prepared material.  
9. **Announcement** and **Giveaway** triggers if those moments are part of the real Sunday night (minimal — trigger prepared moments, do not edit them in Booth).

### V1 explicitly excludes

- Song Workspace, Research, AI authoring, catalog tools inside Booth  
- Pass production / credentials / admin  
- Multi-operator collaboration  
- Full diagnostics / Atlas  
- Redesign of unrelated BobOS departments  
- Architecture / SSoT implementation (separate engineering sprint after product acceptance)  
- Feature-complete sampler studio  
- CMS-style draft editing of the entire presentation library inside Booth  

### V1 success test

> Can Bob run a real Sunday night standing in The Booth, mostly on the Mixer, always knowing what is live, what is next, why, and who has control — without opening Song Workspace, Research, or admin tools?

If yes, V1 is enough.

---

## 11. Future expansion opportunities

Not Version 1. Candidates only if they pass the live-event rule later:

| Opportunity | Why later |
|---|---|
| Rich Sampler banks | After core transport trust |
| Multi-announcement rundown | After single-trigger reliability |
| Operator presets (“Doors”, “Peak”, “Close”) | Convenience after verbs are solid |
| Second operator / handoff lock | Needs single-operator certainty first |
| Deeper public latency meter | Nice-to-have confidence |
| Rehearsal mode vs Show mode | Powerful; easy to confuse if premature |
| Integrated recording / show log | Post-show value; not required to run live |
| Mobile booth companion | Only after desktop one-screen is boringly reliable |

Prep-side improvements (better queue building, better packages) stay in BobOS and **supply** The Booth; they do not move into The Booth by default.

---

## 12. Acceptance criteria

A developer who has never seen Retroverse should be able to affirm all of the following from this document alone:

| # | Criterion |
|---|---|
| 1 | Can explain **what The Booth is** in one paragraph (live production booth, not CMS). |
| 2 | Can name **who uses it** (primary operator) and **when** (showtime / rehearsal). |
| 3 | Can list what problems it solves (authority, speed, reversibility, focus). |
| 4 | Can apply the **live-event rule** to accept/reject a proposed feature. |
| 5 | Can distinguish **Booth vs BobOS** responsibilities. |
| 6 | Can describe the **Mixer** as the heart and what must always stay visible. |
| 7 | Can walk the **Sunday night workflow** from enter → close without inventing CMS steps. |
| 8 | Can list **V1 commands** vs future commands. |
| 9 | Knows V1 is small on purpose and what is out of scope. |
| 10 | Knows this sprint forbids implementation, page redesign, and architecture changes. |

### Product acceptance (for later build sprints)

Implementation of The Booth / Mixer is **not** accepted in this sprint. Future build sprints should treat this spec as the product contract and pass:

- Live-event rule compliance for every shipped Booth surface  
- Four certainties always visible during showtime  
- Manual wins; Return to Program always available after takes  
- Sunday night runnable primarily from Mixer  
- No Song Workspace / Research / admin embedded in Booth navigation for V1  

---

## Appendix A — Glossary

| Term | Meaning |
|---|---|
| **The Booth** | Live production environment for Retroverse Broadcast |
| **Broadcast Mixer** | Primary control surface inside The Booth |
| **Program** | Tonight’s planned broadcast / queue |
| **On air / Live** | What the public experience is presenting under show control |
| **Return to Program** | Operator verb to restore planned show after interrupt or take |
| **AUTO follow** | Policy allowing VirtualDJ (or similar) to drive air without a manual take |
| **Manual** | Operator has seized control; automation must not silently override |
| **BobOS** | Broader operating system; prepares and manages; not the show booth itself |
| **Cockpit** | BobOS home / mission board; entry point, not the Booth itself |

## Appendix B — Relationship to architecture audit

The [Broadcast Mixer Architecture Audit](./BROADCAST_MIXER_ARCHITECTURE_AUDIT.md) documents **current engineering reality** (dual public paths, many controllers, no single owner today).

This product spec defines **desired product meaning** of The Booth and Mixer.

Reconciling engineering SSoT with this product definition is a **later sprint**. Do not treat this document as permission to refactor playhead, Channel Zero, or snapshot systems.

---

## Execution state

**COMPLETE** — Product specification delivered. No implementation code, no UI redesign, no architecture changes.
