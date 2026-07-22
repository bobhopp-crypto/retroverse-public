# THE BOOTH — Hardware Control Surface Design

**Product:** Retroverse Broadcast — physical console  
**Codename:** THE BOOTH  
**Target price:** ~$4,000 USD street  
**Duty cycle:** Bars / small venues / Sunday nights — every weekend  
**Mode:** Hardware product design — not software, not React, not a browser skin.

This surface assumes The Booth operating language (Sources, TAKE, RETURN, On Air, Emergency) but is specified as **manufacturable desk gear**.

---

## 1. Product thesis

THE BOOTH is a **dedicated broadcast / show cut surface** that sits between the Operator and Retroverse (and optionally VirtualDJ, lighting, samplers).

It is closer to:

- a compact video switcher panel +  
- a radio cart / automation rejoin panel +  
- a DJ utility deck  

…than to a generic MIDI Fighter or a laptop keyboard.

**At $4,000** the buyer expects: metal, reliable switches, readable lamps in dark bars, replaceable parts, cable sanity, and zero menu-diving to Take.

**It does not replace** the computer. It is the **hands**. A brain box (Mac/PC Mini / venue PC) still runs Retroverse. THE BOOTH is the tactile contract.

---

## 2. Form factor & desk layout

### Chassis

| Spec | Choice |
|---|---|
| Width | **560 mm** (fits 19″ rack footprint sideways + side cheeks, or sits on DJ coffin) |
| Depth | **320 mm** (keyboard depth — leaves mouse/laptop behind or beside) |
| Height | **45–55 mm** front / **70 mm** rear wedge (5–8° rake toward Operator) |
| Weight | **4.5–5.5 kg** (won’t walk off a wobbly high-top; still one-person carry) |
| Shell | Aluminum top plate + steel base pan |
| Feet | Rubber + optional rack-ear kit |
| Finish | Matte black / dark charcoal; white laser legends; red Emergency zone |

### Desk placement (bar weekend)

```
                    [ wall / screen: PGM confidence ]
[ laptop / mini ]     THE BOOTH                    [ VirtualDJ laptop optional ]
                      ^^^^^^^^
                 centered on Operator torso
        left hand → Sources/Transport
        right hand → Cut Bus / Encoders
        foot → Footswitch jack under lip
```

- Sit or stand: wedge angle works for both.  
- Prefer **Booth centered**, computer to the **left-rear** (not between hands and panel).  
- Confidence monitor **above** eye line; never force neck-down into a phone.

### Rack placement

- Optional **19″ rack tray** or rack-ear brackets: 3U tray recommended (panel sits proud).  
- Not a pure 19″ front-panel unit in V1 hardware — desk-first for bars.  
- Brain PC in rack; Booth on coffin / front-of-house shelf with **3m USB-C** run.

---

## 3. Physical regions (grouping)

Top → bottom, Operator view:

```
┌─────────────────────────────────────────────────────────────────┐
│ A  TALLY BAR          (lamps)                    [CLOCK OLED]   │
├───────────────┬─────────────────────────────┬───────────────────┤
│ B  SOURCES    │ C  ON AIR DISPLAY           │ D  PROGRAM STRIP  │
│    (pads)     │    (main OLED)              │    (OLED + keys)  │
├───────────────┴─────────────────────────────┴───────────────────┤
│ E  TRANSPORT          │ F  CUT BUS           │ G  UTILITY       │
│  prev pause … hold    │  TAKE  RETURN  GO    │  encoders/fader  │
├───────────────────────┴──────────────────────┴──────────────────┤
│ H  EMERGENCY (guarded, offset right-front)                      │
└─────────────────────────────────────────────────────────────────┘
│ Rear: power, USB-C host, MIDI, footswitch, Kensington           │
```

Hands never cross the Emergency zone to do normal Takes.

---

## 4. Buttons

### 4.1 Source pads (Region B) — 5× large

| Pad | Legend | Switch | Size |
|---|---|---|---|
| 1 | PROGRAM | Cherry MX Low Profile Red or Omron D2FC-grade with 1.5mm travel keycap | 22×22 mm cap |
| 2 | VDJ | same | |
| 3 | ANNOUNCE | same | |
| 4 | GIVEAWAY | same | |
| 5 | EMERGENCY (arm) | same — **not** the panic stop | |

- **RGB underglow per pad** (On Air / Armed / Unavailable states — driven by host; hardware only exposes LEDs).  
- Legend: laser-etched, filled, readable under UV bar light.  
- Actuation: light enough for rapid arming; not mushy laptop keys.

### 4.2 Transport (Region E)

| Button | Legend |
|---|---|
| PREVIOUS | PREV |
| PAUSE | PAUSE |
| RESUME | RESUME |
| NEXT | NEXT |
| HOLD | HOLD |

- Medium caps **18×14 mm**, horizontal row.  
- HOLD slightly taller / different color keycap family (amber tint plastic).

### 4.3 Cut Bus (Region F) — the money row

| Button | Legend | Size | Notes |
|---|---|---|---|
| **TAKE** | TAKE | **32×24 mm** | Heaviest spring of the panel; green-gray cap |
| **RETURN** | RETURN | **28×24 mm** | Equal visual weight to TAKE |
| **GO LIVE** | GO LIVE | **24×18 mm** | Smaller than TAKE; distinct shape (chamfered) |

Spacing: **12 mm** between TAKE and RETURN; GO LIVE separated by **20 mm** ridge.

### 4.4 Program strip keys (Region D)

| Button | Legend |
|---|---|
| JUMP− | − |
| JUMP+ | + |
| LOAD SHOW | LOAD (soft press, confirm on screen) |

Smaller secondary keys — not competing with TAKE.

### 4.5 Utility keys (Region G)

| Button | Legend |
|---|---|
| AUTO | AUTO (toggle) |
| PREVIEW | PVW |
| PAGE | PAGE (sampler/macro bank later) |

### 4.6 Emergency Stop (Region H)

| Control | Spec |
|---|---|
| Type | **Illuminated mushroom** or large rectangular safety switch |
| Legend | EMERGENCY STOP |
| Cover | **Clear hinged safety cover** (lift-with-thumb, then press) — airline/ATC style |
| Position | Front-right, **recessed 8 mm**, outside Cut Bus reach envelope |
| Feel | Distinctly heavier; cannot be brushed by sleeve |

### 4.7 Shift / Layer (optional hardware)

- One **SHIFT** key under left palm rest zone for future layers (sampler bank 2) without on-screen menus.  
- V1 shipping firmware may ignore SHIFT; plastic still there.

---

## 5. Lamps & tallies

### Tally bar (Region A) — always visible at glance

Discrete **10 mm LED windows** with diffusers (not RGB wash that blinds):

| Lamp | Default color intent |
|---|---|
| ON AIR | Red |
| OVERRIDE | Amber |
| HOLD | Amber |
| EMERGENCY | Red flashing capable |
| RUNTIME | Green / Red |
| VDJ | Green / Red (connected) |
| VDJ PLAY | Green pulse |
| AUTO | Blue |
| AUDIENCE | Green / Red |
| RETURN READY | Green |

- Daylight-readable; software sets state; hardware PWM dim global “BAR / STUDIO” via encoder.  
- No OLED-only tallies — if screen dies, lamps still work.

### Pad tallies

- Each Source pad: armed (dim white ring) / On Air (bright fill) / dead (off).

### Cut Bus lamps

- TAKE back-light pulses on successful Take acknowledge.  
- RETURN back-light when RETURN READY.

---

## 6. Displays

### Main On Air display (Region C)

| Spec | |
|---|---|
| Type | **5.5″ OLED** or high-contrast IPS (OLED preferred for bar black levels) |
| Resolution | ≥ 1280×720 logical / sharp 480p min |
| Content | Source · Asset · CONTROL · ELAPSED · REMAINING/RETURNS IN · Local/Public one-line |
| Brightness | Hardware dim 5–100%; anti-burn pixel shift |
| Role | **Primary eyes** — not a web browser chrome |

### Program strip display (Region D)

| Spec | |
|---|---|
| Type | **2.8–3.5″ OLED** |
| Content | Show name · NEXT · Return Target · Upcoming |

### Clock (Region A)

| Spec | |
|---|---|
| Type | **0.96–1.3″ OLED** or LED 7-segment hybrid |
| Content | HH:MM:SS Booth clock |

### No full tablet as the only UI

Touch is secondary (see §11). Hardware must run a Show if the touch layer fails.

---

## 7. Encoder knobs

Three **aluminum knobs** with push-switch (ALPS / Panasonic EVQW-class):

| Encoder | Default assignment |
|---|---|
| **E1 DIM** | Global lamp + screen brightness |
| **E2 BANK** | Sampler / announce slot select (when bank active) |
| **E3 SELECT** | Scroll Next/Jump candidate / log scrub (push = commit Jump candidate) |

- Detented for SELECT; smooth optional for DIM.  
- Ring LED on E2/E3 for bank index.

---

## 8. Faders

| Fader | Spec | Role |
|---|---|---|
| **F1 MASTER CUE** | 60 mm throw, Alps RK09-class | Booth headphone / cue level to host (or MIDI CC) |
| **F2 TRANSITION** | 60 mm | Crossfade duration / Auto Take sensitivity (host-defined) — physically present even if software maps later |

**Not a full DJ mixer.** No 4-channel EQ bank. If Operator needs that, VirtualDJ + DJM stays beside THE BOOTH.

Optional future SKU: motorized 100 mm PGM/PVW T-bar — **not** in $4k base (cost/complexity). Base uses **TAKE cut**, not T-bar dissolves, to hit price and reliability.

---

## 9. Safety covers & anti-mistake geometry

| Hazard | Hardware mitigation |
|---|---|
| Accidental EMERGENCY STOP | Hinged clear cover + recess + distance from TAKE |
| Accidental End Show | Not a faceplate key — software Secondary only; hardware **SHIFT+LOAD** double-tap if ever mapped |
| Accidental GO LIVE mid-show | Smaller key + ridge separation; host disables LED when illegal |
| Sleeve on Source pads | Raised keywell 2 mm; palm rest on front lip |
| Drink spill | IP drip lip on top plate; gasketed OLED; **no open membrane** |
| Pocket USB unplug | Screw-lock USB-C (thumbscrew) on rear |

Front **palm rest** extruded lip: 25 mm deep, soft rubber — left and right hands land naturally.

---

## 10. Hand movement & ergonomics

### Rest pose

- Left fingers on Transport or hovering Source pads.  
- Right fingers on TAKE / RETURN.  
- Thumbs free for encoder pushes.  
- Right pinky path to Emergency cover is deliberate outward motion.

### Anthropometrics

- TAKE centered on right-hand natural drop from shoulder when torso faces panel.  
- Source column within left-hand span without shoulder twist.  
- Displays above button plane so eyes lift slightly — less fatigue than laptop neck.

### Weekend durability

- Key switches rated **≥50M** actuations.  
- Replaceable switch modules (hot-swap sockets on Source + Cut Bus).  
- Spare TAKE/RETURN keycaps in the box.  
- Field guide card under chassis (magnet).

---

## 11. Touchscreen vs hardware

| Function | Hardware | Touch (optional rear/side) |
|---|---|---|
| TAKE / RETURN / GO LIVE / STOP | **Must be hardware** | Never touch-only |
| Source arm | **Hardware pads** | Touch duplicate OK |
| On Air identity | OLED (not touch-critical) | — |
| Load Show / Jump lists | Encoder + small keys | **Touch OK** |
| Sampler bank expand | PAGE + pads | Touch grid OK |
| Show Log scrub | Encoder | Touch OK |
| Settings / Wi-Fi | Not on faceplate | Touch / host only |

**Optional:** 7″ hinged touch tablet module ($600 SKU add-on) that docks on left cheek — never required for On Air verbs.

---

## 12. Connectivity

### Rear panel

| Port | Role |
|---|---|
| **USB-C Host** (screw lock) | Primary: USB HID + vendor bulk / or USB MIDI + serial CDC to Retroverse Bridge |
| **USB-C Power** (PD 15V/2A) or barrel **12V / 3A** locking | Powered even if host sleeps — lamps stay alive in fault modes where possible |
| **DIN MIDI In / Out** | Classic 5-pin for club integration |
| **3.5 mm TRS Footswitch** | Dual-pedal sense (TIP=TAKE, RING=RETURN or host map) |
| **USB-A Host** | Optional Stream Deck / second surface pass-through (hub) |
| **Kensington** | Bar theft |
| **M4 mount points** | Under-desk arm |

### Protocols

- Class-compliant **USB MIDI** for DAW/VDJ mapping day one.  
- **Vendor HID** report for full Retroverse Booth protocol (lamps, OLED text, tallies).  
- Fallback: MIDI-only mode with reduced OLED strings.

### Footswitches

- Bundle **dual piano-style footswitch** (TAKE / RETURN) in the $4k kit.  
- Optional third pedal SKU: EMERGENCY (requires cover-equivalent confirmation: hold 1s).

---

## 13. MIDI integration

| Feature | Design |
|---|---|
| MIDI mode | Every button Note On/Off; encoders CC; faders CC; lamps Notes feedback |
| Templates | Ableton / VirtualDJ / Bitfocus Companion factory maps on USB stick |
| Soft Thru | MIDI In → Out merge for chaining |
| Banks | PAGE button shifts note offset |

Booth remains useful even when Retroverse Bridge is down: **MIDI brain for the room.**

---

## 14. Cable management

- Rear cable **trench** with velcro bridges.  
- Included **braided USB-C 3m** + power brick with IEC.  
- Under-desk **J-hook** kit in box.  
- Strain relief clamp on USB-C host.  
- No mystery wall-warts daisy chain — one brick powers Booth; host PC separate.

Bar install diagram in lid:

```
UPS → PC (rack) → USB-C 3m → THE BOOTH (desk)
UPS → Monitor
VDJ laptop power separate
Footswitch under toe kick
```

---

## 15. Bill of materials mindset ($4,000 street)

Rough cost discipline (not a quote):

| Block | Intent |
|---|---|
| Chassis + tooling amortization | Solid |
| Switches + keycaps + hot-swap | Pro feel |
| 5.5″ + 3″ OLEDs | Readable |
| MCU (STM32H7 or RP340-class dual) | Headroom |
| LED drivers + diffusers | Tallies |
| Encoders + 2 faders | Enough |
| Mushroom + cover | Safety |
| PSU + cables + footswitch | Complete kit |
| Margin / support / spares | Weekend business |

**Cut to hit $4k:** no motorized T-bar, no 4-channel audio mixer, no embedded Windows PC, no camera.

**Do not cut:** metal, TAKE quality, Emergency cover, tally lamps independent of main CPU crash where possible (lamp MCU watchdogs).

---

## 16. Professional weekend workflow (hardware)

1. Power Booth → tallies self-test chase.  
2. Plug USB-C to venue PC → host handshake → OLEDs show Show name.  
3. Footswitch under bar mat.  
4. Dim E1 for room light.  
5. Load Show (LOAD + confirm).  
6. GO LIVE.  
7. Left hand Sources / NEXT; right hand TAKE / RETURN.  
8. Panic: lift cover → EMERGENCY STOP.  
9. Tear-down: Kensington unlock, coil USB in trench, lid card checklist.

Operator never opens a browser to cut Air.

---

## 17. What’s in the box

- THE BOOTH surface  
- 12V locking PSU + IEC  
- USB-C screw-lock cable 3m  
- Dual footswitch  
- Rack ear / tray kit  
- Spare TAKE/RETURN caps + 2 hot-swap switches  
- Quickstart card (verbs only)  
- MIDI template pack (flash drive)

---

## 18. Success criteria (hardware)

A stranger who has used an ATEM Mini Extreme or a DJM can walk up and, within two minutes:

- Arm VDJ → TAKE  
- RETURN  
- NEXT  
- Lift cover → EMERGENCY STOP  

…without being handed a mouse.

If the laptop UI dies but USB MIDI still enumerates, **pads and TAKE still send notes** so a backup mapping can save the night.

---

## 19. Sketch summary (build this)

**One wedge metal console, ~560×320 mm.**  
**Top:** tally LEDs + clock.  
**Left:** 5 Source pads.  
**Center:** 5.5″ On Air OLED.  
**Right:** Program OLED + jump keys.  
**Bottom-left:** transport.  
**Bottom-center:** TAKE / RETURN / GO LIVE.  
**Bottom-right:** guarded EMERGENCY STOP.  
**Far right:** 3 encoders + 2 faders.  
**Rear:** locking USB-C, power, MIDI, footswitch.  
**Kit:** footswitch, rack ears, spares.

That is THE BOOTH as hardware.

---

## Execution state

**COMPLETE** — Physical Booth hardware design. No software implementation.
