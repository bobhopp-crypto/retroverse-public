# Credentials

## Complete Product Design Specification

**Product:** Credentials  
**Platform:** BobOS desktop  
**Status:** Pre-development product definition  
**Version:** 1.1 — event-context prompt model  
**Scope boundary:** Standalone BobOS application; no Retroverse or event-system dependency

---

## 1. Product definition

Credentials is a focused professional tool for creating beautiful, coordinated, print-ready credential artwork at a finished trim size of **2.25 × 3.5 inches**.

The entire product promise is:

> Enter the event details, describe the event in familiar terms, generate a complete credential family, make restrained finishing adjustments, and save it.

Credentials is not an event system, registration product, pass-management product, layout editor, or general-purpose design tool. It has no attendee concepts, no quantities, no printing workflow, no serial-number management, and no downstream operational features.

### Product philosophy

1. **The credential is the product.** Every pixel of interface exists to create, evaluate, refine, or retrieve one.
2. **Start with the work.** Launch opens a new credential immediately, prefilled from the previous session. There is no welcome screen or dashboard.
3. **Ask for facts, not art direction.** The application asks what the event is, where it is happening, whether it has a theme, and what main color should identify it. The AI makes the artistic decisions.
4. **Show the family together.** Event, VIP, and Backstage credentials are evaluated as a coordinated system, never as isolated tabs.
5. **Keep precision deterministic.** AI creates background artwork only. Software owns type, dimensions, crop, bleed, safe areas, and every exact element.
6. **Make refinement reversible.** Finishing is instant, local, and non-destructive. The source artwork is never altered.
7. **End decisively.** Saving to the Library is the completion event. Credentials does not grow into a production-management application afterward.

### Product vocabulary

| Term | Meaning |
|---|---|
| **Credential** | One saved project for one event, including its selected credential types. |
| **Credential family** | All selected credential types for the project. |
| **Type** | Event Pass, VIP Pass, or Backstage Pass. |
| **Face** | The front or back of one credential type. |
| **Artwork** | AI-created, text-free background imagery for a face. |
| **Composition** | The deterministic combination of artwork, exact crop, and application-rendered text. |
| **Finishing** | Non-destructive image adjustments applied to one face. |

---

## 2. Scope and governing constraints

### Included

- A new credential initialized on launch
- Event Name, Venue, Date, and Optional Text
- Event Pass, VIP Pass, and Backstage Pass in any combination
- Four plain-language artwork-context controls: Event Type, Venue Type, Era / Theme, and Main Color
- One-action generation of front and back artwork for every selected type
- Simultaneous family review
- Independent regeneration by credential type
- Lightweight, per-face finishing
- A flat Library of saved credentials
- Open, Duplicate, and Delete actions
- Remembered session values

### Explicitly excluded

- Registration, attendees, scanning, access control, and check-in
- Events as a managed entity or calendar
- Quantities, orders, print jobs, print history, or printer control
- QR codes, barcodes, serial numbers, or variable data
- Pass status, assignment, activation, or fulfillment
- Analytics, statistics, rewards, or giveaways
- Layers, freeform drawing, arbitrary text boxes, masks, or compositing tools
- Templates, template marketplaces, or saved style presets
- Links to Retroverse, Producer, Event Studio, VirtualDJ, Music, or Members

### Physical output contract

Although printing is outside the application workflow, the saved composition must be physically credible:

- Trim: **2.25 × 3.5 in**, portrait
- Bleed: **0.125 in** on every edge
- Full-bleed master: **2.5 × 3.75 in**
- Minimum raster master at 300 ppi: **750 × 1125 px**
- Trim area at 300 ppi: **675 × 1050 px**
- Safety inset: **0.125 in inside trim** for all deterministic text
- Working color space: **sRGB**; print-profile conversion belongs outside Credentials

The operator does not manage these values. They are fixed product rules.

---

## 3. UX principles

### 3.1 Immediate readiness

The first interactive control receives focus on launch. All remembered values are already present. The operator can generate with one deliberate action.

### 3.2 Progressive disclosure without a wizard

The workflow has modes, not numbered steps. Create, Review, and Finish are natural workspace states. The interface never displays a progress stepper or asks the operator to confirm information already supplied.

### 3.3 One strong action per context

- Create: **Generate**
- Review: **Save to Library**
- Finish: **Done**
- Library item: **Open**

Secondary actions remain quiet and visually separate.

### 3.4 Preserve accepted work

Regenerating one credential type never changes another. A regeneration does not replace its current artwork until the replacement has completed successfully. A failed job leaves the accepted artwork intact.

### 3.5 Content changes are not creative changes

Event Name, Venue, Date, and Optional Text are deterministic text layers. Changing them updates the composition instantly and does not require AI. Event Type, Venue Type, Era / Theme, and Main Color describe the artwork context; changing one requires new artwork before the changed context is represented.

### 3.6 Compare before focusing

Review shows every selected type and both faces together. Finish is the only mode that focuses on one face, and it retains a filmstrip of the entire family for orientation.

### 3.7 Precision without exposed complexity

Crop coverage, safe zones, bleed, text placement, minimum resolution, and face dimensions are enforced automatically. The operator sees results, not prepress settings.

### 3.8 Quiet confidence

The UI uses stable placement, restrained animation, plain labels, and clear state changes. It does not celebrate routine actions, gamify generation, or fill empty space with instruction.

---

## 4. Prompt helper model

### Recommendation: exactly four dropdowns

Credentials asks for four pieces of structured artwork context and nothing more:

| Field | Question it answers | Requirement | Default behavior |
|---|---|---|---|
| **Event Type** | What kind of event is this? | Required | Remembers the last choice. First use begins unselected. |
| **Venue Type** | What kind of place is hosting it? | Required | Remembers the last choice. “Other / use venue name” covers unusual spaces. |
| **Era / Theme** | Is there a specific era or recognizable theme? | Optional | **No specific theme** |
| **Main Color** | Should a recurring series have a recognizable color identity? | Optional | **Let AI choose** |

There is no Style, Mood, Look, Treatment, Composition, Material, Lighting, Geometry, or Art Direction field. Terms such as “Industrial,” “Elegant,” “Dynamic,” and “Geometric” never appear in the operator interface.

### Why four is the minimum useful set

- **Event Type** establishes the visual family. Bingo should feel related to bingo, concerts to concerts, and conventions to conventions.
- **Venue Type** provides subtle context about warmth, formality, energy, and environment without asking the operator for visual vocabulary.
- **Era / Theme** handles the few cases where normal event inference should be deliberately redirected.
- **Main Color** creates a durable series identifier while allowing the AI to build the supporting palette.

Removing any one of these loses a distinct, high-value signal. Adding more begins transferring art-direction work back to the operator.

### Event Type options

The Event Type menu uses familiar event nouns:

1. Bingo
2. Concert / Live Music
3. Trivia
4. Karaoke
5. Fundraiser / Benefit
6. Festival / Fair
7. Conference / Convention
8. Holiday Event
9. Community / Social Event
10. Awards / Gala
11. Sports / Tournament
12. Private Celebration
13. Other / use event name

The list is fixed, short enough to scan, and ordered by likely operational use rather than alphabetically. “Other / use event name” lets the product scale without exposing a freeform prompt field.

### Venue Type options

The Venue Type menu describes the place, not its visual “style”:

1. Community Club / Hall
2. Veterans / Civic Hall
3. Pub / Bar / Restaurant
4. Theater / Music Venue
5. Ballroom / Banquet Hall
6. Hotel / Convention Center
7. Outdoor Venue
8. School / Campus
9. Church / Religious Venue
10. Sports Venue
11. Museum / Gallery
12. Private Home / Property
13. Other / use venue name

These labels are intentionally concrete. The operator should never need a tooltip to understand the difference.

### Era / Theme options

Era / Theme is optional and should be left at its default for ordinary events:

1. No specific theme
2. 1950s
3. 1960s
4. 1970s
5. 1980s
6. 1990s
7. Early 2000s
8. Holiday / Seasonal
9. Patriotic / Americana
10. Western
11. Tropical
12. Casino Night

An unusual named theme—such as “Great Gatsby Gala”—is already available to the AI through Event Name. Credentials does not add an “Other theme” text box that would become a disguised prompt field.

### Main Color options

Main Color replaces named artistic palettes. Each menu item shows a plain color name and swatch:

1. Let AI choose
2. Blue
3. Green
4. Purple
5. Red
6. Orange
7. Yellow / Gold
8. Teal
9. Pink
10. Black / White
11. Multicolor

The operator chooses only the identifying color. The AI selects accessible supporting colors, neutrals, tonal range, and accent balance. There is no custom color picker, palette editor, or branded palette name to learn.

### Context hierarchy supplied to the AI

The artwork brief is assembled from existing event facts plus the four helpers, in this order of influence:

1. **Event family:** Event Type is the strongest visual anchor.
2. **Event identity:** Event Name supplies specific semantic context but is never rendered by the AI.
3. **Venue character:** Venue Name and Venue Type influence atmosphere subtly.
4. **Theme override:** Era / Theme influences artwork only when it is not “No specific theme.”
5. **Series identity:** Main Color anchors the composition when it is not “Let AI choose.”
6. **Installment variation:** Date and generation instance encourage a fresh sibling within the same family.

Optional Text is not prompt context. It is exact deterministic copy and may contain operational language such as door times that should not influence artwork.

### What the AI must infer

The AI owns all decisions about:

- Formality and energy
- Composition and focal placement
- Shape language
- Texture and material suggestion
- Lighting and depth
- Supporting colors and accent balance
- Negative space around deterministic text regions
- How strongly or subtly the era/theme should appear

These decisions are never mirrored back as operator controls.

### Venue influence rule

Venue context should affect atmosphere, not become literal illustration.

For a Bingo event:

- **Community Club / Hall** may suggest warmth, wood tones, familiar social rhythm, and understated community character.
- **Veterans / Civic Hall** may feel slightly more formal, ordered, or traditionally civic.
- **Pub / Bar / Restaurant** may feel warmer, more casual, lively, and evening-oriented.

The AI must not add venue logos, eagles, flags, military emblems, beer glasses, bingo balls, or other obvious clichés solely because of the venue name or type. Literal motifs are allowed only when clearly requested by Event Name or Era / Theme and still must not imitate a real logo.

### Recurring-series behavior

Repeated events with the same Event Type should look like members of one visual family, not unrelated posters. Main Color and Venue Type provide stable sub-series identity:

| Series | Shared family signal | Distinguishing signals |
|---|---|---|
| Eagles Bingo | Bingo | Community Club / Hall + Blue |
| Legion Bingo | Bingo | Veterans / Civic Hall + Green |
| Pub Bingo | Bingo | Pub / Bar / Restaurant + Purple |

Each new generation must still vary at least two non-identity traits—such as composition, focal placement, texture distribution, secondary accent, or light pattern—so installments are recognizable siblings rather than duplicates. No Variation, Seed, Creativity, or Similarity control is exposed.

### Change behavior

- Changing Date or Optional Text updates deterministic content and does not require artwork generation.
- Changing Event Name or Venue updates deterministic content immediately. Existing artwork may still be reviewed.
- Changing Event Type, Venue Type, Era / Theme, or Main Color marks artwork context as changed and makes **Regenerate Artwork** the required primary action.
- Duplicating an item preserves all four helpers so a recurring event can be produced with minimal input.
- The four helper values persist between sessions, matching the broader remembered-field behavior.

---

## 5. Primary user journey

### New credential

1. Launch Credentials.
2. Review or replace the remembered event details.
3. Select one or more credential types.
4. Confirm the Event Type and Venue Type. Add an Era / Theme only when one genuinely applies, and choose a Main Color only when the event needs a recurring visual identity.
5. Choose **Generate**.
6. Watch the selected front/back pairs appear as generation completes.
7. Compare the complete family in Review.
8. If needed, regenerate one type without affecting the others.
9. Optionally open Finish, select a face, and make local adjustments.
10. Choose **Save to Library**.
11. The save action changes to **Saved** and a brief confirmation appears. The task is complete.

### Reuse an existing credential

1. Open Library.
2. Select an item and choose **Duplicate**.
3. Change Event Name and Date; optionally change Venue or Optional Text.
4. Choose **Review Existing** to retain artwork, or **Regenerate Artwork** for a fresh installment.
5. Review and save the new credential.

### Correct an existing saved credential

1. Open Library.
2. Select an item and choose **Open**.
3. Choose **Edit Details** in Review.
4. Make the correction and return to Review.
5. Save; the existing Library item is updated and its Modified Date changes.

### Regenerate one credential

1. In Review, locate the type row.
2. Choose **Regenerate** for that row.
3. The current front and back remain visible beneath a restrained progress veil.
4. On success, both faces swap together.
5. Other credential rows remain unchanged.

---

## 6. Information architecture

Credentials has two destinations and three workspace modes.

```text
Credentials
├── Workspace
│   ├── Create
│   │   └── Generate progress
│   ├── Review
│   │   ├── Edit Details / Reuse
│   │   └── Regenerate one type
│   └── Finish
└── Library
    ├── Search results
    ├── Credential actions
    └── Delete confirmation
```

There are no folders, projects, event records, template records, archives, or settings destination in version 1.

### Content hierarchy

The saved credential is the sole domain object. Event details are properties of that object, not links to another system. Each selected type contains two artwork faces and two finishing stacks.

### Deterministic credential composition

AI artwork is always generated without lettering, logos, codes, guide marks, borders that imply trim, or other exact symbols. Credentials then composes exact text over the art.

Recommended fixed content hierarchy:

| Face | Deterministic content |
|---|---|
| **Front** | Event Name, credential Type, Venue, Date |
| **Back** | Event Name, Optional Text when present, Venue, Date |

Optional Text is omitted cleanly when blank; no placeholder or empty gap remains. Credential Type remains textually explicit on the front so color is never the only distinction between access levels.

---

## 7. Navigation model

### Global navigation

- No sidebar
- No tab bar
- No dashboard
- No breadcrumb trail
- **Library** is the only destination control on the fresh Create screen
- Library uses **Back to Credential** to return to the unchanged working state

### Workspace navigation

| From | Action | To | Preservation rule |
|---|---|---|---|
| Create | Generate | Generate progress, then Review | Form values remain editable after generation. |
| Review | Edit Details | Reuse/Edit Details | Existing artwork and finishing are preserved. |
| Review | Finish | Finish | Selected face defaults to the first front. |
| Finish | Done | Review | All adjustments are already applied non-destructively. |
| Any workspace | Library | Library | Working state is held unchanged. |
| Library | Back to Credential | Prior workspace mode | Exact prior selection and scroll position return. |
| Library item | Open | Review | Loads the saved record as the active document. |
| Library item | Duplicate | Reuse/Edit Details | Creates a new unsaved working identity with copied content. |

### Desktop menu support

Native application menus provide New Credential, Open Library, Save, Close, Undo, Redo, and standard window commands without adding persistent chrome to the workspace.

---

## 8. Complete screen inventory

| ID | Surface | Purpose | Primary action |
|---|---|---|---|
| C-01 | Fresh Create | Define a new credential family | Generate |
| C-02 | Reuse / Edit Details | Change a copied or existing credential without forcing new art | Review Existing |
| G-01 | Generate progress | Make generation status clear without navigating away | Continue automatically |
| R-01 | Review | Compare the full credential family and approve it | Save to Library |
| F-01 | Finish | Refine one face while retaining family context | Done |
| L-01 | Library | Find and select a saved credential | Open selected item |
| L-02 | Empty Library | Explain the empty state and return to work | Back to Credential |
| L-03 | Library item actions | Preview one item and choose Open, Duplicate, or Delete | Open |
| L-04 | Delete confirmation | Prevent accidental permanent deletion | Delete |
| S-01 | Unsaved changes confirmation | Protect generated or modified work on close | Save to Library |

Generation failures, save confirmations, validation, and offline messages are states inside these surfaces, not new screens.

---

## 9. ASCII wireframes

Wireframes describe hierarchy and placement, not final styling. All credential previews retain the exact 9:14 trim ratio.

### C-01 — Fresh Create

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Credentials                                                     [ Library ] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                       Event Name                                             │
│                       [ Eagles Bingo_________________________ ]               │
│                                                                              │
│                       Venue                                                  │
│                       [ Eagles Club__________________________ ]               │
│                                                                              │
│                       Event Type             Venue Type                       │
│                       [ Bingo ▾ ]            [ Community Club / Hall ▾ ]      │
│                                                                              │
│                       Date                                                    │
│                       [ Jul 24, 2026_________________________ ]               │
│                                                                              │
│                       Optional Text                                           │
│                       [ Doors at 7:00 PM_____________________ ]               │
│                                                                              │
│                       Credential Types                                        │
│                       [✓] Event Pass   [ ] VIP Pass   [ ] Backstage Pass      │
│                                                                              │
│                       Era / Theme            Main Color                       │
│                       [ No specific theme ▾ ][ Blue ▾ ]                       │
│                                                                              │
│                                      [ Generate ]                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

The content column is centered, 620 px wide, and vertically balanced. There is no preview, prompt panel, recent list, or explanatory copy competing with the form. The four dropdown labels describe event facts rather than artistic concepts.

### C-02 — Reuse / Edit Details

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ [‹ Review]                        Duplicate of Eagles Bingo       [ Library ] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                       Update credential details                              │
│                                                                              │
│                       Event Name                                             │
│                       [ Eagles Bingo_________________________ ]               │
│                       Venue          [ Eagles Club___________ ]               │
│                       Date           [ Aug 21, 2026__________ ]               │
│                       Optional Text  [ Doors at 6:30 PM______ ]               │
│                                                                              │
│                       Event Type             Venue Type                       │
│                       [ Bingo ▾ ]            [ Community Club / Hall ▾ ]      │
│                                                                              │
│                       Credential Types                                        │
│                       [✓] Event Pass  [✓] VIP Pass  [ ] Backstage Pass       │
│                                                                              │
│                       Era / Theme            Main Color                       │
│                       [ No specific theme ▾ ][ Blue ▾ ]                       │
│                                                                              │
│                       [ Regenerate Artwork ]     [ Review Existing ]          │
│                                                                              │
│                       Existing artwork will be retained.                      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

The note is contextual, not permanent. If Event Type, Venue Type, Era / Theme, or Main Color changes, **Regenerate Artwork** becomes the sole primary action because the existing art no longer represents the selected event context. If only a new credential type is added, the action becomes **Generate New Type** and existing types remain untouched.

### G-01 — Generate progress

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Credentials                                                     [ Library ] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                       Creating your credential family                        │
│                       Summer Night Sessions                                  │
│                                                                              │
│                       ┌───────────┐  ┌───────────┐                            │
│                       │  FRONT    │  │   BACK    │  Event Pass               │
│                       │  artwork  │  │  artwork  │  Complete                 │
│                       └───────────┘  └───────────┘                            │
│                                                                              │
│                       ┌───────────┐  ┌───────────┐                            │
│                       │  FRONT    │  │   BACK    │  VIP Pass                 │
│                       │  shimmer  │  │  shimmer  │  Creating artwork…        │
│                       └───────────┘  └───────────┘                            │
│                                                                              │
│                       1 of 2 credential types complete         [ Cancel ]     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

Completed front/back pairs appear immediately. The screen moves to Review automatically when all selected jobs settle. Cancel returns to Create and leaves any previously accepted family unchanged.

### R-01 — Review

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Summer Night Sessions · The Grand Hall · Jul 24     [Edit Details] [Library]│
├──────────────────────────────────────────────────────────────────────────────┤
│ REVIEW                                                                       │
│                                                                              │
│ Event Pass     FRONT              BACK                                       │
│                ┌────────────┐     ┌────────────┐           [ Regenerate ]    │
│                │            │     │            │                             │
│                │  EVENT     │     │  artwork   │                             │
│                │   PASS     │     │  + details │                             │
│                │            │     │            │                             │
│                └────────────┘     └────────────┘                             │
│                                                                              │
│ VIP Pass       FRONT              BACK                                       │
│                ┌────────────┐     ┌────────────┐           [ Regenerate ]    │
│                │            │     │            │                             │
│                │    VIP     │     │  artwork   │                             │
│                │   PASS     │     │  + details │                             │
│                │            │     │            │                             │
│                └────────────┘     └────────────┘                             │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ 2 types · 4 faces                         [ Finish ] [ Save to Library ]      │
└──────────────────────────────────────────────────────────────────────────────┘
```

Rows compress enough to show all three types simultaneously at the recommended window size. At smaller supported heights the stage scrolls as one page; types never move into tabs.

### F-01 — Finish

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ [‹ Review]             Event Pass · Front                         [ Done ]   │
├───────────────────────────────────────────────────────────┬──────────────────┤
│                                                           │ IMAGE      Reset │
│                         ┌────────────────┐                │ Exposure   ─●──  │
│                         │                │                │ Contrast   ──●─  │
│                         │                │                │ Saturation ─●──  │
│                         │   selected     │                │                  │
│                         │     face       │                │ COLOR      Reset │
│                         │                │                │ Temperature ─●─  │
│                         │                │                │ Tint        ─●─  │
│                         │                │                │                  │
│                         └────────────────┘                │ FRAMING    Reset │
│                                                           │ Scale       112% │
│                                                           │ X Position   0   │
│                                                           │ Y Position  -4   │
│                                                           │                  │
│                                                           │ ▸ Advanced Reset│
├───────────────────────────────────────────────────────────┴──────────────────┤
│ Event F  Event B    VIP F    VIP B    Backstage F    Backstage B            │
│  [▣]       [▯]       [▯]      [▯]         [▯]            [▯]                │
└──────────────────────────────────────────────────────────────────────────────┘
```

Clicking a face in the filmstrip changes the selected face without leaving Finish. Directly dragging the large preview adjusts X/Y framing; the inspector remains the exact-value control.

### L-01 — Library

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ [‹ Back to Credential]                    Library       [ Search__________ ] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐              │
│  │ preview   │   │ preview   │   │ preview   │   │ preview   │              │
│  │           │   │           │   │           │   │           │              │
│  │           │   │           │   │           │   │           │              │
│  └───────────┘   └───────────┘   └───────────┘   └───────────┘              │
│  Summer Night    Autumn Gala     Studio Opening   Winter Social             │
│  Grand Hall      Pavilion        The Foundry      Grand Hall                │
│  Jul 24, 2026    Oct 16, 2026    Nov 8, 2026      Dec 12, 2026              │
│                                                                              │
│  ┌───────────┐   ┌───────────┐                                              │
│  │ preview   │   │ preview   │                                              │
│  │           │   │           │        Sorted by most recently modified      │
│  │           │   │           │                                              │
│  └───────────┘   └───────────┘                                              │
│  New Year        After Hours                                                 │
│  Union Room      Grand Hall                                                  │
│  Dec 31, 2026    Jan 17, 2027                                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

The Library is a flat, responsive grid. Search matches Event Name, Venue, and the displayed Date. There are no filters, tags, folders, favorites, views, or manual sorting.

### L-02 — Empty Library

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ [‹ Back to Credential]                    Library                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                                                                              │
│                         No saved credentials yet                             │
│                         Your saved credentials will appear here.             │
│                                                                              │
│                         [ Back to Credential ]                               │
│                                                                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

No illustration, sample credential, onboarding sequence, or call to create a template is shown.

### L-03 — Library item actions

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Library                                         │
│          ┌────────────────────────────────────────────────────────┐          │
│          │ Summer Night Sessions                             [×] │          │
│          │                                                       │          │
│          │  ┌────────────┐  ┌────────────┐  The Grand Hall      │          │
│          │  │  FRONT     │  │   BACK     │  Jul 24, 2026        │          │
│          │  │  preview   │  │  preview   │                      │          │
│          │  └────────────┘  └────────────┘                      │          │
│          │                                                       │          │
│          │  [ Delete ]                 [ Duplicate ] [ Open ]    │          │
│          └────────────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────────────────┘
```

The first selected credential type supplies the preview pair. The dialog metadata remains limited to Event Name, Venue, and Date.

### L-04 — Delete confirmation

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                 ┌──────────────────────────────────────────┐                 │
│                 │ Delete “Summer Night Sessions”?          │                 │
│                 │                                          │                 │
│                 │ This removes the credential and its      │                 │
│                 │ artwork from the Library.                 │                 │
│                 │                                          │                 │
│                 │                [ Cancel ] [ Delete ]      │                 │
│                 └──────────────────────────────────────────┘                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

Focus begins on Cancel. Delete uses the danger color and requires a separate confirmation; typing the event name is unnecessary friction for a locally scoped item.

### S-01 — Unsaved changes confirmation

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│              ┌──────────────────────────────────────────────────┐            │
│              │ Save this credential before closing?             │            │
│              │                                                  │            │
│              │ Your generated artwork or recent changes         │            │
│              │ have not been saved to the Library.              │            │
│              │                                                  │            │
│              │ [ Discard Changes ] [ Cancel ] [ Save to Library]│            │
│              └──────────────────────────────────────────────────┘            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

The dialog appears only after artwork has been generated, a saved credential has changed, or a duplicate exists as unsaved work. Remembered form values alone do not trigger it.

---

## 10. Component inventory

### Application shell

- Native desktop window frame
- Minimal top bar with contextual title and destination/actions
- Fixed bottom action bar in Review
- Toast region for saved, restored, and transient error feedback
- Modal and confirmation dialog foundation

### Create controls

- Single-line text field
- Date field with keyboard entry and compact calendar popover
- Credential type checkbox group
- Event Type select with familiar event names
- Venue Type select with familiar venue categories
- Era / Theme select, defaulting to No specific theme
- Main Color select with a plain name and single swatch
- Primary button
- Secondary button
- Inline validation message

### Review components

- Credential family stage
- Type row
- Face label
- Credential face preview at exact aspect ratio
- Generation veil with progress status
- Failed-face placeholder with Retry action
- Regenerate type button
- Saved-state button

### Finish components

- Large face canvas
- Family filmstrip
- Inspector section
- Slider with editable numeric value
- Section Reset action
- Collapsible Advanced section
- Direct-manipulation framing surface
- Before/after press-and-hold affordance

### Library components

- Search field
- Credential card
- Preview thumbnail
- Metadata stack
- Item action dialog
- Empty state
- Destructive confirmation dialog

### Shared behavior components

- Tooltip for icon-only controls
- Keyboard focus ring
- Loading shimmer
- Non-blocking toast
- Offline/error banner
- Unsaved-changes close dialog

---

## 11. Data model

The data model deliberately contains no event entity, attendee entity, template, print job, or pass record.

### Credential record

| Field | Type | Requirement |
|---|---|---|
| `id` | Technical identifier | Stable and opaque; not exposed as business data. |
| `eventName` | Text | Required; 1–120 characters. |
| `venue` | Text | Required; 1–120 characters. |
| `date` | Calendar date | Required; stored without a time zone or time-of-day shift. |
| `optionalText` | Text or empty | Optional; maximum 180 characters. |
| `credentialTypes` | Ordered set | One or more of Event, VIP, Backstage. Fixed display order. |
| `eventType` | Curated value | Required plain-language event category. |
| `venueType` | Curated value | Required plain-language venue category. |
| `eraTheme` | Curated value | Optional; No specific theme by default. |
| `mainColor` | Curated value | Optional; Let AI choose by default. |
| `artwork` | Type → Face → raster asset | Front and back source artwork for every selected type. |
| `finishing` | Type → Face → adjustment stack | Independent, non-destructive values for each face. |
| `createdDate` | Timestamp | Set once for a new or duplicated record. |
| `modifiedDate` | Timestamp | Updated on each explicit Library save. |

File locations, checksums, preview caches, and indexes are storage mechanics, not product-domain fields. Derived previews and deterministic composites can be recreated and are not additional user data.

### Finishing adjustment stack

Each face owns a complete stack:

| Section | Control | Range | Default |
|---|---|---:|---:|
| Image | Exposure | −2.00 to +2.00 EV | 0.00 |
| Image | Contrast | −100 to +100 | 0 |
| Image | Saturation | −100 to +100 | 0 |
| Color | Temperature | −100 to +100 | 0 |
| Color | Tint | −100 to +100 | 0 |
| Framing | Scale | Cover minimum to 200% | Cover minimum |
| Framing | X Position | Coverage-constrained | Center |
| Framing | Y Position | Coverage-constrained | Center |
| Advanced | Brightness | −100 to +100 | 0 |
| Advanced | Hue | −180° to +180° | 0° |
| Advanced | Vibrance | −100 to +100 | 0 |
| Advanced | Sharpen | 0 to 100 | 0 |
| Advanced | Grain | 0 to 100 | 0 |
| Advanced | Fade | 0 to 100 | 0 |

X and Y are clamped so artwork always covers the complete bleed master. There is no way to expose an empty edge.

### Session preferences

Session preferences are separate from Library records and update immediately when a value changes:

- Event Name
- Venue
- Date
- Optional Text
- Credential type selections
- Event Type
- Venue Type
- Era / Theme
- Main Color
- Last-used finishing values

On generation, the last-used finishing values are copied into each new face, after which every face remains independent. Section Reset always returns that section to neutral defaults, not to remembered values.

### Duplicate semantics

Duplicate copies all allowed credential fields—including the four artwork-context helpers—plus artwork and finishing adjustments into a new working credential. It receives a new technical identity and a new Created Date only when first saved. It does not modify or link back to the source.

---

## 12. Library organization

### Organization model

- One flat collection
- Default order: Modified Date, newest first
- Fixed card order when dates match: Created Date, newest first
- Search only; no filter or sort controls
- Search fields: Event Name, Venue, and localized Date text
- Grid density adapts to window width while credential thumbnails retain their ratio

### Card content

Every card displays exactly:

1. Front preview of the first selected type
2. Event Name
3. Venue
4. Date

Modified Date is used for ordering but is not shown. Type badges, counts, status, and file details are omitted because they do not help the primary reuse decision.

### Open, Duplicate, Delete

- **Open** loads the saved credential and edits the same record.
- **Duplicate** creates an unsaved copy and opens Reuse/Edit Details.
- **Delete** confirms, removes the record and artwork, closes the action dialog, and leaves Library position stable.

Deletion is permanent in version 1. The confirmation copy states that fact plainly; there is no archive or trash destination to manage.

---

## 13. Interaction specifications

### Form behavior

- Launch focus: Event Name, with existing remembered text selected only when the field receives focus via keyboard.
- Field values persist on change; no separate preference save exists.
- Pressing Enter from a single-line field advances to the next field. From the final selection control, Enter invokes Generate when the form is valid.
- Event Name, Venue, Date, Event Type, and Venue Type validate only after blur or Generate, avoiding premature error noise.
- At least one credential type must remain selected. Attempting to clear the last type leaves it selected and gives a brief accessible explanation.
- Credential type order is always Event, VIP, Backstage regardless of selection order.
- Optional Text shows a live character count only after 140 of 180 characters.
- Event Type and Venue Type use concrete nouns only; their menus contain no explanatory art terminology.
- Era / Theme and Main Color always offer their neutral defaults first: No specific theme and Let AI choose.
- Main Color displays one swatch beside a plain color name. It never previews a designed palette.

### Generation behavior

- One Generate action creates front and back for every selected type.
- Each type is an isolated generation transaction; its front/back pair swaps together.
- Initial generation can complete types in any order, but Review always displays the fixed type order.
- AI requests artwork without text or precision marks. The deterministic compositor applies content afterward.
- Event Type anchors family resemblance; Venue Type and Main Color distinguish recurring sub-series; Era / Theme redirects the family only when explicitly selected.
- Each generation varies non-identity traits automatically. The operator never selects a style, mood, composition, seed, or creativity level.
- Partial failure preserves successful types and shows Retry only for the failed type.
- Independent regeneration retains current artwork until the new pair succeeds.
- Regeneration preserves the face’s finishing stack. The operator can Reset after evaluating the replacement.
- While a type is regenerating, Save is disabled to avoid saving a mixed transaction. Other review and finish controls remain available.
- An in-session Undo Regenerate action is available from the success toast until the next destructive change. The prior artwork does not become another saved Library version.

### Review behavior

- Both faces of every selected type are visible at once at the recommended window size.
- A single click selects a face and reveals a subtle 2 px focus outline.
- Double-clicking a face opens it in Finish.
- Face labels live outside the credential and never appear in saved artwork.
- Regenerate acts on the row’s front/back pair, not the selected face.
- Edit Details preserves artwork. Event Name, Venue, Date, and Optional Text changes update every deterministic composition immediately.
- A changed Event Type, Venue Type, Era / Theme, or Main Color marks the current art as context-stale and requires Regenerate Artwork before Save.
- Save creates a new Library record for new/duplicated work and updates the current record for an opened item.
- After a successful save, the button reads **Saved** with a checkmark. Any subsequent change restores **Save to Library**.

### Finish behavior

- Controls preview during pointer movement with no Apply button.
- Every adjustment is local to the selected face.
- No Finish operation invokes AI or requires a network connection.
- Arrow keys change a focused slider by one normal step; Shift+Arrow makes a larger step; Option+Arrow makes a fine step.
- A numeric value can be clicked and typed directly.
- Reset in a section resets only that section on the selected face.
- Advanced remains collapsed by default and remembers its open/closed state for the current session.
- Dragging the preview pans framing. Wheel or trackpad pinch changes Scale. Values remain constrained to full bleed coverage.
- Holding the backslash key temporarily shows the unadjusted face; releasing returns to the finished result.
- Done returns to the same Review scroll position and face selection.

### Library behavior

- Search updates after a short typing debounce and never changes the underlying order.
- Escape clears Search first; a second Escape returns to the prior workspace.
- Single click opens the item action dialog. Double-click performs Open.
- Arrow keys move card focus spatially; Enter opens the action dialog.
- Deleting an item returns focus to the next card, or the prior card if it was last.

### Save and close behavior

- Form entry alone does not trigger an unsaved-changes dialog because those values are remembered preferences.
- Generated artwork, modifications to a saved credential, or a new duplicate do trigger the dialog on close.
- The close dialog offers **Cancel**, **Discard Changes**, and **Save to Library**.
- Save failures leave the document active, keep the Save action available, and show a plain error with Retry.

### Motion

- Standard transition duration: 160 ms
- Dialog entrance: opacity plus 6 px vertical movement, 180 ms
- Generated-face reveal: 200 ms crossfade
- No spring, bounce, confetti, parallax, or looping ornamental animation
- Reduced Motion replaces all spatial transitions with opacity-only changes or immediate updates

---

## 14. Desktop UX recommendations

### Window behavior

- Recommended default window: **1440 × 900 px**
- Minimum supported window: **1180 × 760 px**
- Review is optimized to show three type rows at the default size
- Finish uses a resizable inspector fixed between 288 and 336 px
- Window size and position persist across launches
- Full-screen is supported but never required

### Keyboard shortcuts

| Action | macOS | Windows equivalent |
|---|---|---|
| New Credential | Command–N | Ctrl–N |
| Open Library | Command–O | Ctrl–O |
| Save to Library | Command–S | Ctrl–S |
| Generate / Regenerate selected type | Command–Return | Ctrl–Enter |
| Finish selected face | F | F |
| Return to Review / close dialog | Escape | Escape |
| Undo / Redo | Command–Z / Shift–Command–Z | Ctrl–Z / Ctrl–Y |
| Before / after in Finish | Hold Backslash | Hold Backslash |
| Move between faces | Left / Right Arrow | Left / Right Arrow |

Shortcuts supplement visible actions; none are required to complete the workflow.

### Pointer and trackpad

- Hover states are informative but not the only way actions appear.
- Sliders support click, drag, wheel while focused, and direct numeric entry.
- Trackpad pinch zooms the Finish preview only when the pointer is over it.
- Context menus are limited to standard text editing and Library card actions; primary functionality remains visible.

### System integration

- Use native date conventions and locale-aware display.
- Respect system light/dark preference only if both themes meet the same preview-quality bar; version 1 should ship with the defined dark production theme rather than an unfinished automatic light theme.
- Use system-level secure storage only for service credentials. No service configuration belongs in the product UI.
- Do not show model names, prompts, seeds, token usage, or generation infrastructure.

---

## 15. Accessibility recommendations

Target **WCAG 2.2 AA** for all application UI.

### Vision

- Minimum text contrast: 4.5:1; large text and essential graphics: 3:1
- Focus ring: 2 px accent plus 1 px dark separator, visible on every background
- Minimum interactive target: 44 × 44 px, including checkbox labels and Reset actions
- Never distinguish credential type, state, or error by color alone
- Credential Type remains visible text in the composition
- Provide 100%, 125%, 150%, and 200% interface scaling without clipped controls
- Keep previews legible at high zoom and never rasterize UI text

### Motor and keyboard

- Every action is keyboard reachable in a logical top-to-bottom, left-to-right sequence
- Sliders expose both keyboard steps and editable numeric values
- Drag framing has X/Y numeric alternatives
- No timed confirmation or precision-only pointer gesture
- Avoid hover-revealed essential controls

### Screen readers

- Each preview is named by event, type, and face, for example “Summer Night Sessions, VIP Pass, front preview.”
- Review rows are groups with an accessible type heading.
- Generation progress announces type-level completion politely without interrupting current focus.
- Save confirmation and validation use live regions.
- Slider names include section, value, and units.
- Modal focus is trapped correctly and returns to its invoking control.

### Cognition

- Use verbs that name outcomes: Generate, Regenerate, Finish, Save to Library, Duplicate, Delete.
- Avoid unexplained icons, jargon, and changing control locations.
- Errors state what happened and the next available action.
- Preserve entered values after errors.
- Keep destructive actions spatially separated from primary actions.

### Motion and color sensitivity

- Respect Reduced Motion and Increased Contrast system settings.
- No flashing or rapidly alternating artwork transitions.
- AI-derived artwork palettes are checked for text contrast after deterministic overlays are applied.
- If a generated region cannot support required text contrast, the compositor automatically applies a restrained local scrim behind text; AI is never asked to solve the precision problem.

---

## 16. Visual design system

### Design character

The application is a quiet dark production environment. Neutral chrome recedes so credential art receives visual priority. Surfaces are differentiated through small luminance changes and thin borders, not gradients or heavy shadows.

### Application color palette

| Token | Value | Use |
|---|---:|---|
| Canvas | `#111315` | Main application background |
| Stage | `#0B0D0F` | Review and Finish preview stage |
| Surface | `#191C1F` | Form and inspector surfaces |
| Surface Raised | `#22262A` | Menus, dialogs, elevated controls |
| Border | `#363B41` | Dividers and control outlines |
| Border Strong | `#4B525A` | Active control boundary |
| Text Primary | `#F4F5F3` | Primary text |
| Text Secondary | `#ADB3BA` | Supporting metadata |
| Text Muted | `#777F88` | Disabled and nonessential text |
| Accent | `#78A7FF` | Focus, selection, primary action |
| Accent Hover | `#91B7FF` | Primary hover |
| Success | `#67C58B` | Saved and complete state |
| Warning | `#E6B96F` | Recoverable warning |
| Danger | `#FF7A72` | Destructive action and error |
| Scrim | `#000000B8` | Modal background |

The primary button uses Accent with near-black text (`#0A1526`) for high contrast. Danger is reserved for Delete and unrecoverable error; it is never decorative.

### Prompt-helper control appearance

Event Type, Venue Type, and Era / Theme use ordinary text menus. They do not show artwork samples, mood imagery, or descriptive adjectives. Main Color shows one small swatch beside each plain color name.

| Main Color | UI swatch anchor |
|---|---:|
| Blue | `#2D6CDF` |
| Green | `#2F7D4B` |
| Purple | `#7650B3` |
| Red | `#C7463B` |
| Orange | `#D86B2D` |
| Yellow / Gold | `#D3A51D` |
| Teal | `#238C8C` |
| Pink | `#C65A8A` |
| Black / White | Equal split of `#17191B` and `#F2F1EC` |
| Multicolor | Four-part Blue, Green, Purple, and Orange swatch |

These swatches communicate category only; they are not fixed output palettes. The AI builds the supporting palette and tonal range around the selected main color. **Let AI choose** uses a neutral outlined swatch. No custom color picker, palette editor, or artistically named scheme ships in version 1.

### Typography

Use the system UI family on macOS and package **Inter** as the cross-platform fallback. Use tabular numerals for slider values and dates where alignment matters.

| Role | Size / line height | Weight | Use |
|---|---:|---:|---|
| Screen title | 24 / 30 px | 600 | Create and Library headings |
| Context title | 17 / 24 px | 600 | Review document title |
| Section label | 13 / 18 px | 600 | Form and inspector section names |
| Body | 14 / 20 px | 400 | Inputs, buttons, explanatory text |
| Control label | 12 / 16 px | 500 | Slider and field labels |
| Metadata | 12 / 16 px | 400 | Venue, dates, secondary state |
| Micro | 11 / 14 px | 500 | Face labels and character count |

Credential compositions use a small, licensed, product-bundled type family with deterministic weights and fitting rules. Era / Theme may select a curated alternate display face when appropriate, but the operator never chooses fonts and the AI never renders the wording.

### Spacing system

Use a 4 px base unit with an intentionally small token set:

| Token | Value | Typical use |
|---|---:|---|
| 1 | 4 px | Tight icon/text correction |
| 2 | 8 px | Label-to-control gap |
| 3 | 12 px | Compact control grouping |
| 4 | 16 px | Standard component gap |
| 6 | 24 px | Section spacing |
| 8 | 32 px | Panel padding |
| 12 | 48 px | Major content separation |
| 16 | 64 px | Screen-level breathing room |

Form controls are 40 px high, primary actions are 44 px high, top bars are 64 px, and the Review bottom action bar is 68 px.

### Shape, border, and elevation

- Input and button radius: 8 px
- Dialog radius: 12 px
- Credential preview radius: 2 px only; the physical object should not look like an app card
- Standard border: 1 px
- Selected preview outline: 2 px Accent plus 2 px stage gap
- Use shadows only on dialogs and floating menus; no card-grid shadow field

### Iconography

- Use a single 1.75 px stroked icon family with rounded joins
- Default icon box: 18 px; touch target remains 44 px
- Pair icons with text for Library, Edit Details, Finish, Regenerate, Save, Duplicate, and Delete
- Icon-only usage is limited to window-standard Close and compact disclosure chevrons, with tooltips and accessible names
- Recommended metaphors: library/bookshelf, edit/pencil, finish/sliders, regenerate/clockwise arrow, duplicate/overlapping rectangles, delete/trash
- Do not use magic-wand, sparkle, robot, or brain icons. AI is an implementation detail, not the product identity.

### Imagery and empty states

Generated credentials are the only hero imagery. Empty states use typography, not illustrations. Shimmers use neutral tonal movement and never imitate a finished credential.

---

## 17. Error and edge-state design

### Validation

- Missing Event Name: “Enter an event name.”
- Missing Venue: “Enter a venue.”
- Missing Date: “Choose a date.”
- Missing Event Type: “Choose the kind of event.”
- Missing Venue Type: “Choose the kind of venue.”
- No credential type: prevented at interaction time with “Choose at least one credential type.”

Errors appear directly below the relevant control and are announced once.

### Generation failure

- Initial total failure remains on Generate progress with: “Artwork couldn’t be created. Check your connection and try again.” Actions: Retry, Back.
- Type-level failure in a partial family shows an error in that row only. Successful rows are reviewable and never regenerated automatically.
- Regeneration failure removes the progress veil and restores the unchanged accepted art with: “New artwork couldn’t be created. Your current artwork is unchanged.”

### Unsupported artwork

If generated art is below the fixed resolution or cannot cover bleed after framing, it is rejected before Review and automatically retried once. If retry fails, the type enters the normal failure state. The operator never sees or overrides a technical-quality warning.

### Save failure

A toast is insufficient for a save failure. A persistent inline banner appears above the Review action bar: “This credential hasn’t been saved. Try again.” Save remains available.

### Offline

Create, Review, Finish, and Library remain available. Generate and Regenerate are disabled with the explanation “Artwork generation needs a connection.” Existing artwork and local finishing never depend on AI or network availability.

### Long text

Deterministic type scales within a narrow approved range to fit Event Name and Optional Text. The application never changes type position or safe-area rules unpredictably. Text beyond the defined maximum is prevented at entry.

---

## 18. Major decision rationale

| Decision | Rationale |
|---|---|
| Launch directly into Create | Removes navigation before value and matches the product’s single purpose. |
| No dashboard or recent list | The Library already covers retrieval; a dashboard would duplicate it and delay creation. |
| No sidebar or stage stepper | Two destinations and three natural modes do not justify permanent navigation chrome. |
| Dark neutral production UI | Makes colorful credentials easier to judge and keeps chrome visually subordinate. |
| Four factual context dropdowns | Event Type, Venue Type, Era / Theme, and Main Color provide the smallest complete event description without asking for art direction. |
| No artistic Style or Mood field | The AI should translate event facts into artistic decisions; the operator should not need visual-design vocabulary. |
| Plain Main Color instead of named palettes | Creates recurring series identity without requiring operators to interpret palette names or coordinate supporting colors. |
| No custom color or font controls | Eliminates quality-breaking combinations and unnecessary decisions. |
| AI creates background art only | Protects precision, legibility, exact wording, and print geometry from generative errors. |
| Exact event copy rendered deterministically | Enables instant corrections and low-cost duplication without regenerating art. |
| Event Type anchors family resemblance | Makes bingo look intentionally related to bingo and concerts related to concerts across venues and installments. |
| Venue Type influences subtly | Adds local character without encouraging logos, literal venue illustration, or clichés. |
| Installment variation is automatic | Produces recognizable siblings without exposing seed, similarity, creativity, or variation controls. |
| Front/back generated as an atomic type pair | Preserves cohesion and makes “regenerate this credential” understandable. |
| Types generated independently | Protects accepted work and supports selective creative iteration. |
| All types visible in Review | Family consistency is a comparison task; tabs hide the very differences operators need to judge. |
| Dedicated Finish mode | Provides a calm, larger canvas for precise work without cluttering Review. |
| Per-face finishing | Different front/back images often need different crops and tonal corrections. |
| Advanced finishing collapsed | Keeps common corrections immediate while retaining useful professional control. |
| Flat, newest-first Library | Matches a small focused collection and avoids premature taxonomy. |
| Duplicate instead of templates | Every successful credential is already a proven reusable starting point. |
| Search without filters | Provides scale resilience with one familiar control and no organizational burden. |
| Explicit Save to Library | Preserves a meaningful completion action and prevents unfinished generations from polluting the Library. |
| No print or export workflow | Honors the product boundary: creation ends at a saved credential. |

---

## 19. Acceptance criteria for design implementation

The product design is correctly implemented only when all of the following are true:

1. Launch shows C-01 with remembered values and no intermediate screen.
2. A valid one-type credential requires only one Generate action to reach Review.
3. Selecting all types produces six faces and shows them in one Review surface without tabs.
4. Regenerating VIP changes neither Event nor Backstage artwork.
5. A failed VIP regeneration leaves its prior front and back visible and unchanged.
6. Editing Event Name, Venue, Date, or Optional Text updates every deterministic composition without AI generation.
7. Create exposes exactly four artwork-context helpers: Event Type, Venue Type, Era / Theme, and Main Color.
8. No operator-facing field or option uses artistic terms such as Style, Mood, Industrial, Elegant, Geometric, Composition, or Creativity.
9. Changing any artwork-context helper requires generation before the changed context can be saved as representative of the artwork.
10. Identical Event Types produce recognizable family resemblance while Venue Type and Main Color create a clear sub-series identity.
11. Repeating the same helper values creates a fresh sibling rather than an identical installment, without an operator-facing variation control.
12. Venue influence remains atmospheric and does not introduce venue logos or obvious clichés solely from venue context.
13. Every finish control is instant, face-local, reversible, and usable without a pointer.
14. Reset exists in Image, Color, Framing, and Advanced.
15. AI output contains no application text, QR code, serial number, safe margin, trim mark, or bleed mark.
16. The deterministic master maintains the fixed trim, bleed, safe area, and minimum resolution.
17. Save stores only the defined credential record and makes it immediately available in Library.
18. Library items show preview, Event Name, Venue, and Date and offer exactly Open, Duplicate, and Delete.
19. Duplicate never changes its source and can reuse artwork after metadata-only edits.
20. The complete workflow is keyboard accessible and meets the stated contrast and target-size requirements.

---

## 20. Final recommendations

### Build version 1 as the narrow product defined here

Do not add a canvas editor, templates, attendee data, print controls, custom palettes, or integrations during implementation. Each would weaken the core promise and introduce a second product model.

### Prototype the three critical moments before engineering the full shell

Validate these at the default and minimum window sizes:

1. C-01 data-entry rhythm and Generate readiness
2. R-01 six-face simultaneous comparison
3. F-01 large-canvas finishing with the family filmstrip

The Review density is the highest-risk spatial decision and should be tested with real generated art, unusually long event names, and all three types.

### Treat the deterministic compositor as the quality authority

Define and test physical geometry, safe-area enforcement, text contrast, type fitting, and output resolution independently of the artwork generator. A generative failure may create unattractive art; it must never create technically invalid art.

### Validate the event-context model before expanding it

Test a matrix that includes Bingo across Community Club, Veterans / Civic Hall, and Pub venues with Blue, Green, and Purple identities; then test concerts, trivia, karaoke, fundraisers, festivals, conventions, and holiday events. The model passes only when:

- The same Event Type produces an evident family resemblance.
- Venue differences feel intentional but remain subtle.
- Main Color creates a stable recurring identity.
- Repeated installments are related without becoming duplicates.
- Era / Theme is visible when selected and absent when not selected.
- No result depends on a literal venue logo, text, or cliché.

Do not add another helper field to correct a weak prompt. Improve the AI’s inference rules first. A new field is justified only when repeated testing reveals a distinct piece of event context that the current four cannot express.

### Measure success by completion quality

The most useful product signals are local and operational: time from launch to first Review, number of selective regenerations, use of Finish, and successful Save. Do not surface analytics in the application, and do not let telemetry concepts alter the user workflow.

### Final product test

An operator should be able to launch Credentials, create a coherent six-face credential family, refine one face, and save it without documentation—and without encountering any concept unrelated to visual credential creation.

That is the product.
