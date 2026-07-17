---
document_id: RV2-FND-07
title: Retroverse UX Standards
version: 0.1.0
document_status: Draft
review_status: Not Started
approval_status: Not Submitted
content_authority: Chief Product Architect
document_maintainer: Engineering Program Manager
created: 2026-07-13
last_updated: 2026-07-13
approved_by: null
approval_date: null
supersedes: null
---

# Retroverse UX Standards

[Foundation Index](./README.md) · [Previous: RV2-FND-06](./06-Architecture.md) · [Next: RV2-FND-08](./08-Development-Manual.md)

## Document Control

| Field | Value |
|---|---|
| Document ID | RV2-FND-07 |
| Version | 0.1.0 |
| Document Status | Draft |
| Review Status | Not Started |
| Approval Status | Not Submitted |
| Content Authority | Chief Product Architect |
| Document Maintainer | Engineering Program Manager |

## Table of Contents

- [Purpose](#purpose)
- [Experience Principles](#experience-principles)
- [Information Architecture](#information-architecture)
- [Channel Zero](#channel-zero)
- [Exploration Surfaces](#exploration-surfaces)
- [Entity Pages](#entity-pages)
- [Search](#search)
- [Operator Console](#operator-console)
- [Visual System](#visual-system)
- [Typography](#typography)
- [Layout and Responsiveness](#layout-and-responsiveness)
- [Interaction Standards](#interaction-standards)
- [Motion and Broadcast Transitions](#motion-and-broadcast-transitions)
- [Accessibility](#accessibility)
- [Content Standards](#content-standards)
- [Loading, Empty, Error, and Offline States](#loading-empty-error-and-offline-states)
- [Privacy and Audience Data](#privacy-and-audience-data)
- [UX Decisions and Rationale](#ux-decisions-and-rationale)
- [Cross-References](#cross-references)
- [Review and Change Control](#review-and-change-control)
- [Version History](#version-history)

## Purpose

This document defines the interaction, presentation, accessibility, content, and responsive-design standards for Retroverse V2 Release 1. It governs public audience surfaces and the private Operator console.

The standards preserve Channel Zero as a broadcast, make exploration consistently available, and keep manual operation direct and understandable.

## Experience Principles

1. **The broadcast is already happening.** Channel Zero opens on the current Experience without a landing-page interstitial.
2. **Content comes first.** Navigation and metadata support the Experience without overwhelming it.
3. **Exploration is always available.** Every public page provides a meaningful next path and a direct route to Channel Zero.
4. **Shared time is visible.** Audience controls never imply that a viewer owns the canonical timeline.
5. **Manual control is explicit.** Operator actions name their target and show the persisted result.
6. **Silence is not failure.** Browser autoplay restrictions or unavailable media never prevent the visual Experience.
7. **Accessibility is a product requirement.** Keyboard, screen reader, reduced motion, contrast, and responsive behavior are designed, not retrofitted.
8. **Historical context is legible.** Dates, ranks, entity types, and relationships are labeled plainly.
9. **No deceptive automation.** The UI does not imply that AI-generated or imported content is curator-approved until it is approved.
10. **Simplicity over novelty.** One clear primary action is better than multiple competing controls.

## Information Architecture

### Public Routes

| Route | Purpose |
|---|---|
| `/` | Channel Zero |
| `/explore` | Exploration index |
| `/search` | Public search results |
| `/experiences/:slug` | Published Experience detail |
| `/programs/:slug` | Published Program detail |
| `/tracks/:slug` | Track detail |
| `/artists/:slug` | Artist detail |
| `/albums/:slug` | Album detail |
| `/charts/:slug` | Chart detail and issues |
| `/weeks/:slug` | Week detail |
| `/months/:slug` | Month detail |
| `/years/:slug` | Year detail |
| `/decades/:slug` | Decade detail |
| `/eras/:slug` | Era detail |

### Operator Routes

All private routes are under `/operator`:

```text
/operator
/operator/collection
/operator/production
/operator/playlists
/operator/broadcast
/operator/imports
/operator/audit
```

The public and Operator navigation systems are visually and structurally distinct. Public pages never reveal private route affordances.

## Channel Zero

### Page Structure

Channel Zero uses the full available viewport and has four layers of presentation:

1. **Experience canvas:** primary image, visual field, and playable media.
2. **Identity overlay:** Experience headline, primary Track or historical context, Artist, and time context.
3. **Broadcast status:** Channel Zero label, current Program, elapsed indicator, and next Experience.
4. **Controls and navigation:** sound, fullscreen, Explore, and accessible details.

The Experience canvas always has visual content. When no approved image exists, it uses the documented neutral broadcast background and text identity; it does not use a broken-image placeholder.

### Required Controls

| Control | Audience Effect | Canonical Effect |
|---|---|---|
| Enable / mute sound | Changes local sound only | None |
| Fullscreen / exit fullscreen | Changes local display only | None |
| Explore | Navigates to related public content | None |
| Details | Opens the current Experience detail | None |
| Return to Channel Zero | Rejoins current live position | None |

Channel Zero does not expose audience pause, seek, previous, next, Program choice, or queue controls.

### Now and Next

- “Now” identifies the current Experience and Program.
- “Next” identifies the next Experience in the Program.
- The elapsed indicator represents the current Experience interval, not a user-seekable media control.
- At a Program loop boundary, Next identifies the first Experience.
- Metadata updates at canonical Experience boundaries.
- Client presentation follows the estimated PostgreSQL canonical clock. After a boundary, visibility resume, or newer manifest, the displayed Experience and elapsed position converge within one second without presenting a user-controlled timeline.

### Sound

- The initial public experience is visually active regardless of audio permission.
- If audible autoplay is unavailable, a clear **Enable sound** action appears.
- Enabling sound joins the current canonical media offset within 250 milliseconds; it does not restart the Experience. If the approved source cannot satisfy that capability or playback is denied, the visual Experience continues and the control explains that audio is unavailable.
- Mute preference may persist in local browser storage.
- Sound state is never required to access navigation or information.

### Fullscreen and Venue Display

- Fullscreen is available through a labeled control.
- Fullscreen retains essential current identity and sound controls.
- Venue display uses the same public Channel Zero route; no privileged Operator session is required.
- Large displays preserve safe margins and prevent critical text from touching viewport edges.

## Exploration Surfaces

The Explore index groups entry points by:

- Tracks;
- Artists;
- Albums;
- Charts;
- Time: Weeks, Months, Years, Decades, and Eras;
- published Experiences;
- published Programs.

The page is an index into authoritative relationships, not a recommendation feed.

Exploration modules use these labels:

- **Related** for explicit direct relationships;
- **More from this Artist** for Artist relationships;
- **Appears on** for Chart relationships;
- **From this time** for temporal relationships;
- **Featured in** for Experience relationships;
- **On Channel Zero** when the entity is in the current Experience or Program.

Modules must not claim similarity, influence, popularity, or recommendation unless a future approved data model defines that fact.

## Entity Pages

### Shared Page Anatomy

Every public entity page contains:

1. entity type label;
2. primary name or title;
3. approved primary image when available;
4. approved factual metadata;
5. approved narrative when available;
6. explicit related-entity modules;
7. direct **Watch Channel Zero** action;
8. canonical URL and document title.

### Track

Track pages show title, Artist credits, Album when present, duration when known, release context, Chart appearances, approved media state when public, and published Experiences featuring the Track.

### Artist

Artist pages show canonical name, biography when approved, Albums, Tracks, and published Experiences.

### Album

Album pages show title, Artist credits, release context, artwork, and ordered Track listing.

### Chart

Chart pages show chart identity and available weekly issues. A selected issue shows ranked entries with exact rank and links to Tracks.

### Time

Week, Month, Year, Decade, and Era pages show their explicit temporal definition and visible related Tracks, Charts, and Experiences. Time pages never fabricate containment that is not defined by the Data Model.

### Experience

Experience pages show the published revision's audience content and the explicit entities represented by it. They do not expose draft revisions or private production notes.

### Program

Program pages show title, description, total duration, and Experiences in broadcast order. They do not offer a “play this Program” audience action.

## Search

- Search uses one text input with an explicit Search label.
- Results group by entity type while preserving one relevance order within a group.
- Each result shows entity type, title/name, and primary context.
- Search never includes private Playlists, drafts, imports, audit events, Operators, or reserved Patron/Pass data.
- Query submission works with keyboard Enter and a visible button.
- Empty results offer Explore and Channel Zero links.
- Search does not auto-submit on every keystroke; optional suggestions must be keyboard accessible and debounced.

## Operator Console

### Shell

The Operator console uses a persistent application shell with:

- current section;
- authenticated identity and sign-out;
- Collection, Production, Playlists, Broadcast, Imports, and Audit navigation;
- environment indicator outside production;
- no public-audience visual simulation except explicit Preview.

### Lists

Operator lists provide:

- search and relevant filters;
- status badges;
- last updated time;
- validation or eligibility indicators;
- a single primary creation action;
- stable pagination or cursor navigation;
- no hidden bulk mutation.

### Forms

- Required fields are marked in text, not by color alone.
- Validation occurs on submit and, where useful, after field blur.
- Field errors appear beside fields and in a focusable summary.
- Unsaved changes trigger navigation protection.
- Save Draft is distinct from Publish.
- Publication opens a review step showing validation, public impact, and immutable-revision consequence.
- Archive and broadcast-control actions require explicit confirmation.

### Broadcast Console

The Broadcast console prioritizes:

1. canonical current Experience;
2. current Program revision and elapsed position;
3. next Experience;
4. configured fallback Program;
5. available manual actions;
6. last confirmed control action and actor.

Control confirmation text must name the Program and, when applicable, the Experience. After confirmation, the console displays the persisted canonical result.

### Preview

Preview:

- is clearly labeled **Preview**;
- uses draft data without public publication;
- never changes Broadcast State;
- does not create a public URL;
- visually distinguishes validation warnings from public rendering.

## Visual System

### Theme

Release 1 uses one dark broadcast-first theme. There is no theme switcher.

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#0B0D10` | Page and broadcast background |
| `--color-surface` | `#15181D` | Cards, overlays, operator surfaces |
| `--color-surface-raised` | `#1E2229` | Dialogs and emphasized panels |
| `--color-text` | `#F5F2EA` | Primary text |
| `--color-text-muted` | `#AAA59B` | Secondary text; not for critical status alone |
| `--color-accent` | `#FFB454` | Primary action and active broadcast accents |
| `--color-link` | `#84C5FF` | Text links |
| `--color-success` | `#62C58B` | Success status |
| `--color-warning` | `#F0C66B` | Warning status |
| `--color-danger` | `#EF6A6A` | Destructive status |
| `--color-focus` | `#8CCBFF` | Focus ring |

All token combinations must be verified against WCAG contrast requirements. Components may not introduce arbitrary colors outside semantic tokens.

### Shape and Elevation

- Base spacing unit: 4 px.
- Standard spacing steps: 4, 8, 12, 16, 24, 32, 48, 64 px.
- Control minimum height: 44 CSS px.
- Standard radius: 8 px; compact radius: 4 px; dialogs: 12 px.
- Shadows are subtle and never the only boundary between interactive regions.
- Dividers use visible contrast and are not used as decoration without structure.

### Imagery

- Images use declared aspect ratios to avoid layout shift.
- Informational images require meaningful alt text.
- Decorative images use empty alt text.
- Cropping must not obscure faces, titles, or essential historical information.
- Unknown imagery uses a neutral branded field with entity name, not generated or misleading artwork.

## Typography

Release 1 uses a system font stack to avoid external font dependency:

```css
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
  "Segoe UI", sans-serif;
```

| Role | Minimum size | Guidance |
|---|---:|---|
| Channel headline | 32 px responsive | Clamp upward on large screens; maximum readable line length |
| Page title | 32 px | One primary `h1` per page |
| Section heading | 24 px | Semantic heading order |
| Body | 16 px | 1.5 minimum line height |
| Metadata | 14 px | Must retain AA contrast |
| Control label | 16 px | Never icon-only without accessible name |

Long-form narrative is limited to approximately 70 characters per line.

## Layout and Responsiveness

### Breakpoints

Breakpoints are content-driven, with these standard thresholds:

- compact: below 640 px;
- medium: 640–1023 px;
- wide: 1024–1439 px;
- venue: 1440 px and above.

### Public Pages

- Compact pages use one content column.
- Medium and wide pages may use metadata and related-content columns.
- Venue layouts increase type and safe margins rather than adding more controls.
- No public page requires horizontal scrolling at 320 CSS px.

### Channel Zero

- The Experience canvas fills the viewport.
- Overlays respect safe-area insets.
- Compact layout stacks identity above controls.
- Wide and venue layouts separate identity and broadcast status into opposite safe corners.
- Controls remain reachable by keyboard and visible at 200% zoom.

## Interaction Standards

- Every interactive element uses native semantics whenever possible.
- Buttons perform actions; links navigate.
- Icon-only buttons require visible tooltip on hover/focus and an accessible name.
- Focus is never removed without a visible replacement.
- Dialog focus is trapped and restored to the invoking control.
- Escape closes non-destructive dialogs and menus.
- Destructive confirmation defaults focus to Cancel, not Confirm.
- Toasts supplement, but never replace, inline status or error information.
- Async actions disable duplicate submission and retain an announced progress state.
- Dates use unambiguous labels; machine timestamps use ISO 8601 in operator detail views.
- Durations use human-readable units and accessible text, not color or animation alone.

## Motion and Broadcast Transitions

- Experience changes use a 300 ms crossfade.
- Metadata updates occur with the same transition boundary.
- Motion does not delay canonical state.
- No parallax, continuous decorative animation, or auto-advancing carousel is permitted.
- `prefers-reduced-motion: reduce` changes crossfades to an immediate content swap and disables nonessential animation.
- Media playback and canonical broadcast progression continue under reduced motion.
- Loading indicators avoid flashing and respect reduced motion.

## Accessibility

Retroverse Release 1 targets WCAG 2.2 Level AA.

### Required Standards

- Complete keyboard operation for public and Operator surfaces.
- Logical heading hierarchy and landmarks.
- Skip link to primary content.
- Visible focus indication with at least 3:1 contrast against adjacent colors.
- Text contrast of at least 4.5:1; large text at least 3:1.
- Non-text UI contrast of at least 3:1.
- Touch targets at least 44 × 44 CSS px where practical and never below WCAG minimum.
- Form labels, descriptions, and error association.
- Status changes announced through appropriate live regions without excessive interruption.
- No information communicated only by color, position, sound, or motion.
- Screen-reader-readable Now, Next, elapsed, and sound state.
- Captions for video with meaningful speech and transcripts for curator-authored spoken narrative when such media is approved.
- Alternative visual identity when audio is absent or muted.
- Zoom to 200% without loss of content or function.
- Reflow at 320 CSS px without two-dimensional scrolling except intrinsically tabular chart content, which receives an accessible alternative.

### Chart Accessibility

Chart rankings use semantic ordered lists or tables with captions and headers. Visual rank movement indicators include text equivalents.

### Broadcast Announcements

Experience changes do not automatically move focus. A polite live region announces the new Experience title; users may navigate to details manually.

## Content Standards

- Use the approved entity name and controlled terminology.
- Write public copy in plain English.
- State dates and chart ranks precisely.
- Do not present imported, inferred, or AI-suggested narrative as fact before curator approval.
- Avoid promotional superlatives without an authoritative source.
- Distinguish unknown from not applicable.
- Use sentence case for controls and headings.
- Use “Channel Zero,” never abbreviations such as “CZ” on public surfaces.
- Use “Experience,” “Program,” and “Playlist” only for their approved concepts.
- Destructive action labels name the action: **Archive Experience**, not **OK**.
- Release 1 locale is `en-US`; stored temporal identity remains locale-independent.

## Loading, Empty, Error, and Offline States

### Loading

- Preserve final layout dimensions to reduce shift.
- Channel Zero uses the last valid public visual shell while fetching a fresh manifest.
- Operator forms show field skeletons only when actual labels remain available to assistive technology.

### Empty

- Empty states explain why the list is empty and name the next valid action.
- Public empty states link to Explore and Channel Zero.
- Empty states never create fictional sample content.

### Error

- Public errors use a safe message, request ID, retry action when useful, and Channel Zero link.
- Operator errors preserve safe draft input and identify the action that failed.
- Validation errors are distinct from system errors.

### Offline and Network Recovery

- Channel Zero may continue displaying the current visual shell while offline but must label connection loss.
- Canonical progression is not claimed as synchronized while the client lacks a fresh manifest.
- On recovery, the client resynchronizes without replaying missed Experiences.
- Operator mutations are not queued offline.

## Privacy and Audience Data

- Release 1 uses no audience account, profile, behavioral personalization, or cross-device identifier.
- Local sound/fullscreen preferences remain local.
- Operational logs may record coarse request metadata for 30 days but may not build audience profiles or retain a cross-session audience identifier.
- Third-party advertising and behavioral tracking are not permitted.
- External media embeds must use the most privacy-preserving approved mode available and be disclosed in a public privacy notice available before public launch. The notice identifies external provider processing, local preferences, request logging, retention, and contact ownership.

## UX Decisions and Rationale

The canonical wording and status of each decision are maintained in [RV2-FND-02](./02-Decision-Log.md#incorporated-decision-rationale). This section supplies UX rationale only.

| Decision ID | Decision | Rationale |
|---|---|---|
| DEC-0041 | Channel Zero uses a full-viewport broadcast canvas with supporting overlays and no audience timeline controls. | This makes the broadcast the homepage and avoids presenting a shared channel as an on-demand player. |
| DEC-0042 | Release 1 uses one dark broadcast-first theme and a repo-owned semantic token system. | One accessible theme is simpler to implement and visually supports continuous media presentation. |
| DEC-0043 | Release 1 targets WCAG 2.2 Level AA and treats reduced motion, muted audio, and keyboard use as normal product states. | Accessibility is required for both personal devices and live display contexts and must be testable from the first release. |

## Cross-References

### Normative Inputs

- [RV2-FND-00 — Vision](./00-Vision.md)
- [RV2-FND-01 — Constitution](./01-Constitution.md)
- [RV2-FND-04 — Product Specification](./04-Product-Specification.md)
- [RV2-FND-05 — Data Model](./05-Data-Model.md)
- [RV2-FND-06 — Architecture](./06-Architecture.md)

### Normative Outputs

- [RV2-FND-08 — Development Manual](./08-Development-Manual.md) defines component implementation and review practices.
- [RV2-FND-11 — Build Specification](./11-Build-Specification.md) defines browser and accessibility quality gates.
- [RV2-FND-12 — Acceptance Criteria](./12-Acceptance-Criteria.md) verifies these standards.

## Review and Change Control

### Review Record

| Review ID | Version | Reviewer | Review Type | Date | Outcome | Notes |
|---|---:|---|---|---|---|---|

### Approval Record

| Version | Approver | Decision | Date | Notes |
|---|---|---|---|---|

### Amendment History

| Amendment ID | From Version | To Version | Date | Summary | Approval Reference |
|---|---:|---:|---|---|---|

## Version History

| Version | Date | Status | Summary | Maintainer |
|---|---|---|---|---|
| 0.1.0 | 2026-07-13 | Draft | Defined Channel Zero, exploration, entity, search, Operator, visual, responsive, content, privacy, and accessibility standards. | Engineering Program Manager |
| 0.0.0 | 2026-07-13 | Framework | Created document framework. No architect-authored content added. | Engineering Program Manager |
