---
document_id: RV2-FND-04
title: Retroverse Product Specification
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

# Retroverse Product Specification

[Foundation Index](./README.md) · [Previous: RV2-FND-03](./03-Glossary.md) · [Next: RV2-FND-05](./05-Data-Model.md)

## Document Control

| Field | Value |
|---|---|
| Document ID | RV2-FND-04 |
| Version | 0.1.0 |
| Document Status | Draft |
| Review Status | Not Started |
| Approval Status | Not Submitted |
| Content Authority | Chief Product Architect |
| Document Maintainer | Engineering Program Manager |

## Table of Contents

- [Purpose](#purpose)
- [Product Summary](#product-summary)
- [Product Goals](#product-goals)
- [Release 1 Scope](#release-1-scope)
- [Actors](#actors)
- [Core Product Concepts](#core-product-concepts)
- [Collection Requirements](#collection-requirements)
- [Production Requirements](#production-requirements)
- [Broadcast Requirements](#broadcast-requirements)
- [Audience Requirements](#audience-requirements)
- [Operator Requirements](#operator-requirements)
- [Publication and Lifecycle](#publication-and-lifecycle)
- [Media and Content Eligibility](#media-and-content-eligibility)
- [Exploration and Search](#exploration-and-search)
- [Live and Remote Audience Model](#live-and-remote-audience-model)
- [Events, Venues, Patrons, and Passes](#events-venues-patrons-and-passes)
- [Error and Empty States](#error-and-empty-states)
- [Non-Functional Product Requirements](#non-functional-product-requirements)
- [Product Decisions and Rationale](#product-decisions-and-rationale)
- [Traceability Matrix](#traceability-matrix)
- [Cross-References](#cross-references)
- [Review and Change Control](#review-and-change-control)
- [Version History](#version-history)

## Purpose

This document defines the required product behavior of Retroverse V2 Release 1. It translates the Vision and Constitution into implementable product requirements without prescribing internal implementation where that responsibility belongs to the Data Model or Architecture.

Requirements in this document use the identifier form `PS-<AREA>-NNN`. Each requirement is normative unless explicitly labeled as future scope.

## Product Summary

Retroverse V2 is a curator-operated personal broadcast network. It transforms an authoritative music collection into published Experiences, sequences those Experiences into Programs, and continuously broadcasts one Program on the public Channel Zero timeline.

The audience may join Channel Zero anonymously, see the same canonical point in the broadcast as every other viewer, enable sound when permitted by the browser, and move from the broadcast into connected historical exploration pages. Returning to Channel Zero rejoins the current live position.

Retroverse V2 includes a private operator console for collection curation, Experience and Program production, publication, and manual broadcast control.

## Product Goals

| ID | Goal |
|---|---|
| PS-GOAL-001 | Make Channel Zero a recognizable, continuously running public broadcast rather than a conventional homepage. |
| PS-GOAL-002 | Turn curated music records and historical context into audience-visible Experiences. |
| PS-GOAL-003 | Preserve a single authoritative collection that can be corrected and enriched over time. |
| PS-GOAL-004 | Make Programs intentional sequences of Experiences and keep Playlists organizational and non-broadcast. |
| PS-GOAL-005 | Give the operator direct, persistent manual control over the active broadcast. |
| PS-GOAL-006 | Give anonymous live and remote audiences a useful shared broadcast and exploration experience. |
| PS-GOAL-007 | Deliver the smallest coherent release that demonstrates the full Collection → Production → Broadcast → Audience loop. |

## Release 1 Scope

### Included

Release 1 MUST include:

1. an authoritative curated collection containing Tracks, Artists, Albums, Charts, and temporal entities;
2. manual entry and validated batch import for collection records;
3. three Experience types: Track Spotlight, Chart Snapshot, and Time Capsule;
4. Programs composed of ordered published Experience revisions;
5. Playlists composed of ordered Tracks for internal organization;
6. a global, continuously advancing Channel Zero timeline;
7. a required fallback Program;
8. anonymous public audience access;
9. public exploration, entity detail pages, and search;
10. a private operator console;
11. draft, published, and archived lifecycle states;
12. manual broadcast activation, skip, replay, and fallback controls;
13. provenance and eligibility controls for media and imported data;
14. audit records for publication and broadcast-control actions.

### Excluded from Release 1

Release 1 MUST NOT include:

- public user accounts or audience profiles;
- audience-controlled seeking, skipping, or Program selection on Channel Zero;
- audience comments, ratings, reactions, chat, or social feeds;
- automated Program scheduling;
- recommendation algorithms or personalized feeds;
- commerce, ticket sales, or payments;
- operational Event, Venue, Patron, Pass, or Pass Credential workflows;
- native mobile or television applications;
- multi-channel broadcasting;
- AI-generated product behavior or autonomous publishing;
- automatic ingestion that bypasses curator review.

Excluded capabilities may be considered in later approved releases. Their core entity identifiers remain reserved.

## Actors

### Audience Member

An Audience Member is any anonymous visitor using a public Retroverse surface. Release 1 does not create an audience identity record.

An Audience Member MAY:

- join Channel Zero;
- enable or disable local audio;
- enter or exit fullscreen mode;
- view current and next broadcast information;
- open public Experience, Program, and collection entity pages;
- search public collection content;
- follow curated exploration links;
- return to the current Channel Zero position.

An Audience Member MUST NOT alter the canonical broadcast timeline or access unpublished material.

### Operator

The Operator is an authenticated, allowlisted administrator responsible for curation, production, publication, and broadcast control.

Release 1 uses one product role, `operator`. Multiple authenticated people may be allowlisted, but all have the same product permissions. Fine-grained roles are deferred.

An Operator MAY:

- create, edit, review, publish, archive, and restore eligible records;
- import collection data into a reviewable staging area;
- create and organize Playlists;
- create Experience drafts and publish immutable revisions;
- create Program drafts and publish immutable revisions;
- configure the fallback Program;
- activate a Program from its start or from a selected Experience;
- skip or replay the current Experience;
- return Channel Zero to the fallback Program;
- inspect validation, eligibility, publication, and audit information.

## Core Product Concepts

### Collection

The Collection layer owns the authoritative curated music and historical records used by Retroverse. It includes Tracks, Artists, Albums, Charts, chart entries, temporal entities, source provenance, and eligible media references.

The Collection is curated: new or changed data does not become publishable merely because it was imported.

### Production

The Production layer turns Collection records into draft and published Experiences, Programs, and Playlists.

- An Experience is the smallest audience-visible presentation.
- A Program is an ordered sequence of published Experience revisions.
- A Playlist is an ordered collection of Tracks used for organization and production reference. A Playlist is never broadcast.

### Broadcast

The Broadcast layer owns the canonical Channel Zero state and derives the current Experience and elapsed position from persisted state and canonical time.

Release 1 has one public channel: Channel Zero.

### Audience

The Audience layer presents the canonical broadcast and public exploration surfaces. It does not own Collection or Production truth and does not create a separate personalized timeline.

## Collection Requirements

| ID | Requirement |
|---|---|
| PS-COL-001 | The system MUST maintain one authoritative record for each Track, Artist, Album, Chart, Week, Month, Year, Decade, and Era. |
| PS-COL-002 | Every core entity MUST use its approved Retroverse identifier prefix. |
| PS-COL-003 | Human-readable slugs and external identifiers MUST NOT replace Retroverse identifiers as identity. |
| PS-COL-004 | Each collection record MUST expose its lifecycle status and last modification time to the Operator. |
| PS-COL-005 | Each imported fact MUST retain source provenance sufficient to identify its origin. |
| PS-COL-006 | Manual curator edits MUST override imported values while retaining the import history. |
| PS-COL-007 | Batch import MUST stage and validate records before any record becomes publishable. |
| PS-COL-008 | Import validation MUST report rejected rows and field-level reasons without partially accepting an invalid row. |
| PS-COL-009 | Tracks MUST relate to at least one Artist before they can appear in a published Experience. |
| PS-COL-010 | An Album relationship is optional for a Track. |
| PS-COL-011 | Charts MUST contain ordered Chart Entries associated with a Chart and a Week. |
| PS-COL-012 | A Chart Entry MUST identify a Track and a positive rank unique within that Chart issue. |
| PS-COL-013 | Week, Month, Year, Decade, and Era MUST support the explicit containment, overlap, range, and curated-context relationships defined by the Data Model; the product MUST NOT present all temporal relationships as one hierarchy. |
| PS-COL-014 | Collection records referenced by a published revision MUST NOT be hard-deleted. |
| PS-COL-015 | The Operator MUST be able to archive a record so it cannot be newly selected for publication while historical references remain valid. |
| PS-COL-016 | Collection changes MUST be attributable to an Operator action or an identified import job. |
| PS-COL-017 | A Track identity MUST represent one specific recording, mix, edit, live performance, or re-recording; the same recording reused on multiple Albums MUST retain one Track identity, and compositions are not separate Release 1 entities. |
| PS-COL-018 | An Album identity MUST represent one curated release configuration; a materially different title, credited edition, Track membership, or Track order requires a separate Album, while format, territory, catalog-number, or remaster variants with the same curated configuration MAY share one Album. |
| PS-COL-019 | A changed public slug MUST retain a redirect to the same currently visible identity; a merge MUST archive the source identity, retain its matching values as aliases of the canonical identity, preserve applicable slug redirects, and create an immutable audit event. |

## Production Requirements

### Experience Requirements

| ID | Requirement |
|---|---|
| PS-EXP-001 | Every Experience MUST have an `RVEX` identifier, title, type, duration, lifecycle state, and revision history. |
| PS-EXP-002 | Every published Experience revision MUST be immutable. |
| PS-EXP-003 | An Experience draft MUST be validated before publication. |
| PS-EXP-004 | An Experience MUST occupy one uninterrupted interval on the Program timeline. |
| PS-EXP-005 | Experience duration MUST be between 15 and 900 seconds inclusive. |
| PS-EXP-006 | An Experience MUST select exactly one primary visual mode: an approved image asset or the deterministic type layout generated from its required type-specific content. It MAY have one eligible playable media source. |
| PS-EXP-007 | An Experience with media MUST declare the playable interval and MUST NOT exceed available media duration. |
| PS-EXP-008 | An Experience without playable media MUST remain a valid timed visual presentation. |
| PS-EXP-009 | Every Experience MUST include at least one public exploration link derived from an explicit entity relationship. |
| PS-EXP-010 | Draft Experience revisions MUST NOT appear on public surfaces. A published revision remains publicly resolvable only when the Experience identity is currently public or the revision is referenced by a publicly visible published Program. |
| PS-EXP-011 | Publication MUST persist an immutable public snapshot containing every audience-visible value and relationship required to reproduce the Experience presentation. |
| PS-EXP-012 | The published snapshot MUST have a deterministic content hash whose input and serialization version are recorded. Current media-safety state MAY suppress delivery of a referenced source without changing the historical snapshot. |

### Experience Types

#### Track Spotlight

| ID | Requirement |
|---|---|
| PS-EXP-101 | A Track Spotlight MUST reference exactly one primary Track. |
| PS-EXP-102 | The primary Track MUST have at least one Artist. |
| PS-EXP-103 | A Track Spotlight MAY reference an Album, Chart Entry, or temporal context. |
| PS-EXP-104 | The public presentation MUST identify the Track and its primary Artist. |
| PS-EXP-105 | Narrative text and imagery are optional, but any supplied asset MUST meet publication eligibility rules. |
| PS-EXP-106 | If playable media is selected, it MUST be approved for and explicitly associated with the primary Track. |

#### Chart Snapshot

| ID | Requirement |
|---|---|
| PS-EXP-201 | A Chart Snapshot MUST reference one Chart issue for one Week. |
| PS-EXP-202 | It MUST present a curator-selected ordered subset of that issue's Chart Entries. |
| PS-EXP-203 | Displayed ranks MUST match the authoritative Chart Entries. |
| PS-EXP-204 | It MAY designate one displayed Track as the featured Track for an approved playable media source explicitly associated with that Track. |
| PS-EXP-205 | It MUST link to the public Chart and Week pages. |

#### Time Capsule

| ID | Requirement |
|---|---|
| PS-EXP-301 | A Time Capsule MUST reference exactly one primary period: Week, Month, Year, Decade, or Era. |
| PS-EXP-302 | It MUST contain a curator-selected ordered set of one or more Tracks associated with the period. |
| PS-EXP-303 | It MAY designate one included Track as the featured Track for an approved playable media source explicitly associated with that Track. |
| PS-EXP-304 | It MUST link to the primary period and included Track pages. |

### Program Requirements

| ID | Requirement |
|---|---|
| PS-PRG-001 | Every Program MUST have an `RVPR` identifier, title, lifecycle state, and revision history. |
| PS-PRG-002 | A Program draft MUST contain one or more ordered Experience revision references. |
| PS-PRG-003 | Only published Experience revisions MAY appear in a published Program revision. |
| PS-PRG-004 | Program duration MUST equal the sum of its Experience durations. |
| PS-PRG-005 | A published Program revision and its public title, description, ordered Experience revision identities and content hashes, offsets, and duration snapshot MUST be immutable. |
| PS-PRG-006 | A Program MUST NOT reference a Playlist as a broadcast item. |
| PS-PRG-007 | A published Program MAY remain available to an active broadcast after the Program record is archived, but it MUST NOT be selected for a new activation. |
| PS-PRG-008 | The Operator MUST be able to preview a Program draft without making it public or changing Channel Zero. |

### Playlist Requirements

| ID | Requirement |
|---|---|
| PS-PLY-001 | Every Playlist MUST have an `RVPL` identifier, title, an `active` or `archived` lifecycle state, and ordered Track memberships. |
| PS-PLY-002 | Playlist membership MAY include the same Track more than once only when the Operator explicitly confirms the duplicate. |
| PS-PLY-003 | Playlists MUST remain private to the Operator in Release 1. |
| PS-PLY-004 | Playlists MUST NOT be published or broadcast. |
| PS-PLY-005 | A Playlist MAY be used as production reference when creating Experiences, but no automatic conversion is required. |

## Broadcast Requirements

### Canonical Timeline

| ID | Requirement |
|---|---|
| PS-BRD-001 | Channel Zero MUST have exactly one canonical active Broadcast State. |
| PS-BRD-002 | Broadcast State MUST reference one published Program revision and a persisted effective start instant in UTC. |
| PS-BRD-003 | All Audience Members MUST derive the current Experience from the same Broadcast State and canonical server time. |
| PS-BRD-004 | The active Program MUST loop continuously until the Operator activates another Program or the fallback behavior is invoked. |
| PS-BRD-005 | Reaching the end of a Program MUST continue at its first Experience without a dead interval. |
| PS-BRD-006 | Reloading, reopening, or returning to Channel Zero MUST rejoin the current canonical position rather than restart the Program for that Audience Member. |
| PS-BRD-007 | Local mute, audio enablement, fullscreen state, or browser pause MUST NOT alter canonical Broadcast State. |
| PS-BRD-008 | A client that resumes after suspension MUST resynchronize to the canonical position. |

### Fallback

| ID | Requirement |
|---|---|
| PS-BRD-101 | Channel Zero MUST have one configured fallback Program revision before public launch. |
| PS-BRD-102 | The fallback Program MUST meet all normal publication and eligibility rules. |
| PS-BRD-103 | If the active Program cannot be resolved or fails Broadcast Readiness, the system MUST use the fallback Program. |
| PS-BRD-104 | Failure of one media source MUST NOT stop the canonical timeline; its Experience MUST continue visually or advance according to elapsed time. |
| PS-BRD-105 | If both active and fallback states are invalid, Channel Zero MUST show a branded unavailable state, emit an operational alert, and expose no unpublished data. |
| PS-BRD-106 | One deterministic Broadcast Readiness predicate MUST decide whether a Program revision may be configured as fallback or newly activated. It MUST validate Program and Experience publication, identity lifecycle, immutable snapshots, required relationships, primary visual validity, and current media eligibility. |
| PS-BRD-107 | A Program already active MAY continue after its Program identity is archived, but any change that makes its revision fail Broadcast Readiness MUST atomically activate a ready fallback or produce the branded unavailable state. |

### Manual Broadcast Control

| ID | Requirement |
|---|---|
| PS-BRD-201 | An Operator MUST be able to activate an eligible Program immediately from its first Experience. |
| PS-BRD-202 | An Operator MUST be able to activate an eligible Program immediately from a selected Experience. |
| PS-BRD-203 | An Operator MUST be able to skip the current Experience for all Audience Members. |
| PS-BRD-204 | An Operator MUST be able to replay the current Experience for all Audience Members. |
| PS-BRD-205 | An Operator MUST be able to return Channel Zero to the fallback Program. |
| PS-BRD-206 | Each control action MUST require confirmation that names the affected Program or Experience. |
| PS-BRD-207 | Each confirmed control action MUST persist atomically and create an audit record. |
| PS-BRD-208 | The operator console MUST show the canonical result after the action; optimistic display alone is insufficient. |
| PS-BRD-209 | Release 1 MUST NOT provide an audience control that changes canonical Broadcast State. |

### Client Synchronization

| ID | Requirement |
|---|---|
| PS-BRD-301 | The Channel Zero client MUST obtain a versioned public Channel Manifest containing canonical time, Program revision, current Experience, elapsed offset, next Experience, and manifest version. |
| PS-BRD-302 | The client MUST refresh the manifest at least every five seconds while Channel Zero is active. |
| PS-BRD-303 | The client MUST apply a newer manifest when Program revision, Experience, timeline offset, or manifest version differs materially from local state. |
| PS-BRD-304 | The client MUST prefer canonical manifest state over stale cached state. |
| PS-BRD-305 | Channel synchronization MUST NOT require a WebSocket connection in Release 1. |
| PS-BRD-306 | PostgreSQL statement time in the manifest read transaction MUST be the canonical server time used for timeline calculation. Application-node wall clocks MUST NOT decide canonical position. |
| PS-BRD-307 | Clients MUST estimate canonical clock offset from manifest request timing, correct drift without changing Broadcast State, and resynchronize when estimated error exceeds 250 milliseconds. |

## Audience Requirements

### Channel Zero

| ID | Requirement |
|---|---|
| PS-AUD-001 | `/` MUST render Channel Zero, not a separate landing page. |
| PS-AUD-002 | Channel Zero MUST render the current Experience as the primary viewport content. |
| PS-AUD-003 | Channel Zero MUST expose current Program, current Experience, and next Experience information without obscuring the primary presentation. |
| PS-AUD-004 | Channel Zero MUST provide an explicit sound-enable control when browser autoplay policy prevents audible playback. |
| PS-AUD-005 | Visual broadcast progression MUST continue when audio is muted or unavailable. |
| PS-AUD-006 | Channel Zero MUST provide a visible route to exploration and a visible way to return from exploration. |
| PS-AUD-007 | Audience Members MUST NOT be required to authenticate. |
| PS-AUD-008 | Channel Zero MUST not expose operator controls, draft state, internal notes, provenance details, or private media configuration. |

### Public Entity Pages

| ID | Requirement |
|---|---|
| PS-AUD-101 | Public pages MUST exist for published Experiences, published Programs, Tracks, Artists, Albums, Charts, Weeks, Months, Years, Decades, and Eras that meet visibility rules. |
| PS-AUD-102 | A public entity page MUST identify its entity and display only approved public fields. |
| PS-AUD-103 | A public page MUST include at least one contextual exploration path when a related visible entity exists. |
| PS-AUD-104 | A public page with no eligible related entity MUST link to the Explore index and Channel Zero. |
| PS-AUD-105 | Archived collection records MAY remain publicly visible only while referenced by a publicly visible published Experience or Program. A historical slug MAY redirect only when its canonical target is currently publicly visible. |
| PS-AUD-106 | Draft-only and unreferenced archived records MUST NOT appear in public search or indexes. |
| PS-AUD-107 | Public visibility MUST be evaluated from canonical lifecycle and published-reference state at request time; a stale search document or shared cache MUST NOT make a non-visible record public. |

## Operator Requirements

### Authentication and Access

| ID | Requirement |
|---|---|
| PS-OPS-001 | All operator routes and APIs MUST require an authenticated, allowlisted `operator`. |
| PS-OPS-002 | Public audience access MUST remain independent of operator authentication. |
| PS-OPS-003 | Operator sessions MUST expire and MUST support explicit sign-out. |
| PS-OPS-004 | Unauthorized users MUST receive no operator data. |
| PS-OPS-005 | Initial Operator enrollment MUST be single-use; after enrollment, PostgreSQL MUST be the authority for allowlisted OIDC identities and environment configuration MUST NOT enroll another Operator. |
| PS-OPS-006 | An active Operator MAY add or disable an exact OIDC identity through a confirmed audited command. Normal operation MUST NOT disable the final active Operator; emergency recovery MUST use the approved break-glass procedure. |

### Console

| ID | Requirement |
|---|---|
| PS-OPS-101 | The console MUST provide separate navigation for Collection, Production, Broadcast, Imports, and Audit. |
| PS-OPS-102 | Edit screens MUST distinguish unsaved draft changes from persisted records. |
| PS-OPS-103 | Publication actions MUST show validation results before confirmation. |
| PS-OPS-104 | Destructive archive actions MUST require confirmation and MUST explain public impact. |
| PS-OPS-105 | The Broadcast console MUST show canonical current and next state, active Program revision, fallback Program revision, and last control action. |
| PS-OPS-106 | Validation errors MUST identify the record and field that prevents publication. |
| PS-OPS-107 | The Operator MUST be able to preview public presentation without publishing or changing Channel Zero. |

## Publication and Lifecycle

### Lifecycle States

Collection records, Experiences, and Programs use these lifecycle states:

- `draft`: editable and non-public;
- `published`: eligible for public use subject to type-specific rules;
- `archived`: not eligible for new selection but retained for integrity and history.

Playlists use `active` and `archived`. `active` means available to the Operator as an organizational collection; it does not mean published or public.

### Requirements

| ID | Requirement |
|---|---|
| PS-LIF-001 | A new operator-created record MUST begin as `draft`. |
| PS-LIF-002 | Publication MUST fail when required fields, relationships, media eligibility, or integrity checks fail. |
| PS-LIF-003 | Published Experience and Program revisions MUST be immutable. |
| PS-LIF-004 | Editing a published Experience or Program MUST create or update a separate draft revision. |
| PS-LIF-005 | Publishing a new revision MUST NOT mutate historical Program revisions or completed audit records. |
| PS-LIF-006 | Archiving MUST be reversible when integrity constraints permit restoration. |
| PS-LIF-007 | Hard deletion MUST be limited to unreferenced drafts and failed import staging records. |
| PS-LIF-008 | Public visibility MUST be derived from lifecycle state and explicit published references, not merely record existence. |

## Media and Content Eligibility

| ID | Requirement |
|---|---|
| PS-MED-001 | A media source MUST record provider, provider identifier or canonical URL, media kind, declared duration, eligibility status, and last verification time. |
| PS-MED-002 | Eligibility status MUST be one of `pending`, `approved`, `blocked`, or `unavailable`. |
| PS-MED-003 | Only `approved` media MAY be selected in a newly published Experience revision. |
| PS-MED-004 | Media approval MUST be a manual Operator action and MUST be audited. |
| PS-MED-005 | The system MUST NOT infer legal rights from technical availability. |
| PS-MED-006 | A blocked media source MUST never be served or embedded on public pages. |
| PS-MED-007 | An unavailable source MAY remain referenced historically but MUST use the visual fallback behavior. |
| PS-MED-008 | Release 1 MUST support image assets and browser-playable audio or video references through the media adapter defined by Architecture. |
| PS-MED-009 | Collection facts and narrative text MUST retain source notes when the Operator supplies them. |
| PS-MED-010 | An approved playable media source MUST be explicitly associated with the Track it represents and MUST satisfy the normalized seek, offset, duration, and browser-playback capabilities required by Architecture. |
| PS-MED-011 | Media approval is a global Release 1 Operator assertion that the source may be used by Retroverse until revoked or until an optional expiry instant; it is not an automated legal-rights conclusion. |
| PS-MED-012 | Approval MUST retain an Operator-supplied basis, approval time, approver, and optional expiry. Expired approval behaves as `pending` until renewed. |
| PS-MED-013 | Revocable Media Assets MUST be resolved through a current eligibility check and MUST NOT use a shared cache or directly public object URL that can bypass revocation. Repository-owned non-revocable brand assets MAY use immutable CDN caching. |

## Exploration and Search

| ID | Requirement |
|---|---|
| PS-EXPLORE-001 | `/explore` MUST provide entry points to Tracks, Artists, Albums, Charts, and Time. |
| PS-EXPLORE-002 | Public search MUST support title/name matching for Tracks, Artists, Albums, Charts, Experiences, and Programs. |
| PS-EXPLORE-003 | Search MUST return only publicly visible records. |
| PS-EXPLORE-004 | Search results MUST identify entity type and primary context. |
| PS-EXPLORE-005 | Track pages MUST link to visible Artists, Album when present, Chart appearances, and published Experiences that reference the Track. |
| PS-EXPLORE-006 | Artist pages MUST link to visible Tracks, Albums, and published Experiences. |
| PS-EXPLORE-007 | Album pages MUST link to visible Artist and Tracks. |
| PS-EXPLORE-008 | Chart pages MUST link to their Week and visible ranked Tracks. |
| PS-EXPLORE-009 | Temporal pages MUST link upward and downward through defined temporal relationships and to visible related content. |
| PS-EXPLORE-010 | Experience pages MUST link to all primary entities represented in the Experience. |
| PS-EXPLORE-011 | Program pages MUST list their Experiences in broadcast order. |
| PS-EXPLORE-012 | Every public page MUST provide a direct route back to Channel Zero. |

## Live and Remote Audience Model

Release 1 uses the same public Channel Zero product for live and remote audiences.

- A **remote audience** accesses the public channel independently over the network.
- A **live audience** views the same public channel on a shared display, personal device, or both at a physical gathering.

Release 1 does not create an Event record to operate a live presentation, and it does not require Pass validation. A venue operator may display Channel Zero using ordinary browser fullscreen mode.

| ID | Requirement |
|---|---|
| PS-LIVE-001 | Live and remote audience clients MUST derive the same canonical Broadcast State and Experience for the same canonical database instant. Presentation skew MUST converge within the measurable tolerances in the Build Specification. |
| PS-LIVE-002 | Fullscreen presentation MUST be available without operator-console access. |
| PS-LIVE-003 | No live-only product behavior is required in Release 1. |
| PS-LIVE-004 | Future event-specific behavior MUST extend rather than redefine Channel Zero's canonical timeline. |

## Events, Venues, Patrons, and Passes

The identifiers `RVEV`, `RVVE`, `RVPT`, `RVPA`, and `RVSN` are reserved Foundation concepts but are not operational Release 1 features.

For future compatibility, their product meanings are:

- **Event (`RVEV`):** a planned live or remote gathering associated with a time interval and optionally a Venue and Program.
- **Venue (`RVVE`):** a named physical or virtual location at which an Event occurs.
- **Patron (`RVPT`):** a person recognized by Retroverse for event or access purposes.
- **Pass (`RVPA`):** the approved physical credential associated with a future access workflow.
- **Pass Credential (`RVSN`):** the opaque identifier represented on or through a Pass.

These definitions reserve boundaries; Release 1 MUST NOT implement enrollment, ticketing, admission, scanning, identity verification, or authorization behavior for them.

## Error and Empty States

| ID | Requirement |
|---|---|
| PS-ERR-001 | A public page for an unknown identifier or slug MUST return a not-found response without exposing internal data. |
| PS-ERR-002 | A temporary collection-query failure MUST show a recoverable public error with a route to Channel Zero. |
| PS-ERR-003 | Channel Zero MUST prefer its fallback behavior over a generic error page. |
| PS-ERR-004 | Media failure MUST preserve the Experience's visual content and canonical timing. |
| PS-ERR-005 | Operator errors MUST preserve entered draft data when safe and identify the failed action. |
| PS-ERR-006 | An empty search result MUST provide a route to Explore and Channel Zero. |
| PS-ERR-007 | An empty operator list MUST explain the next valid creation or import action without fabricating sample data. |

## Non-Functional Product Requirements

| ID | Requirement |
|---|---|
| PS-NFR-001 | Public pages MUST meet WCAG 2.2 Level AA requirements defined in UX Standards. |
| PS-NFR-002 | Channel Zero MUST remain usable with audio muted, media unavailable, keyboard-only input, reduced motion, and a screen reader. |
| PS-NFR-003 | Public pages MUST be responsive from 320 CSS pixels through large venue displays. |
| PS-NFR-004 | The product MUST preserve canonical broadcast state across application process restarts. |
| PS-NFR-005 | Operator actions that change publication or broadcast state MUST be auditable. |
| PS-NFR-006 | Public responses MUST not contain secrets, private source notes, operator identity details, or unpublished fields. |
| PS-NFR-007 | Performance, reliability, security, backup, browser-support, and recovery thresholds are defined by the Build Specification and Acceptance Criteria. |
| PS-NFR-008 | Product behavior MUST be deterministic from authoritative data and canonical time; AI MUST NOT be required in the audience request path. |
| PS-NFR-009 | The Operations Owner MUST enforce Release 1 retention of operational request logs for 30 days and immutable Audit Events for seven years unless an approved legal or security requirement requires a different period. The Operations Owner MUST ensure a public privacy notice describing anonymous access, local preferences, logs, external media processing, retention, and a responsible contact exists before public launch. |

## Product Decisions and Rationale

The canonical wording and status of each decision are maintained in [RV2-FND-02](./02-Decision-Log.md#incorporated-decision-rationale). This section supplies product rationale only.

| Decision ID | Decision | Rationale |
|---|---|---|
| DEC-0019 | Release 1 implements the complete Collection → Production → Broadcast → Audience loop and defers event-access features. | This is the smallest release that demonstrates the mission without adding ticketing, identity, or commerce systems. |
| DEC-0020 | Public audience access is anonymous; authenticated access is limited to one allowlisted Operator role. | This removes account and authorization complexity while preserving curator control. |
| DEC-0021 | Channel Zero uses one global persisted timeline and loops the active Program until manual replacement. | A shared timeline is the simplest interpretation of a continuously running broadcast and avoids per-session pseudo-broadcasts. |
| DEC-0022 | Release 1 supports Track Spotlight, Chart Snapshot, and Time Capsule Experiences. | These types directly exercise the approved music, chart, and time entities while remaining small enough for one release. |
| DEC-0023 | Programs contain immutable published Experience revisions; published Program revisions are also immutable. | Immutable revisions preserve historical broadcast integrity and make the active timeline deterministic. |
| DEC-0024 | Release 1 Playlists contain ordered Tracks and remain private organizational tools. | Track membership provides useful curation without blurring Playlist, Experience, and Program. |
| DEC-0025 | Published Experiences and Programs are revised by publishing new immutable revisions. | This is the simplest reliable way to preserve one source of truth for historical broadcasts. |
| DEC-0026 | Manual control supports activate, start-at-Experience, skip, replay, and fallback. | These actions provide complete practical override without adding automated scheduling. |
| DEC-0027 | Release 1 exploration uses public entity pages, explicit relationships, and public search. | Explicit relationships satisfy exploration without introducing a recommendation system. |
| DEC-0028 | Live and remote audiences share the same Channel Zero behavior in Release 1. | A shared browser experience serves both audience contexts with minimal product divergence. |
| DEC-0029 | Event, Venue, Patron, Pass, and Pass Credential remain reserved future concepts outside Release 1 operation. | Implementing access workflows is not necessary to prove the core broadcast network. |
| DEC-0030 | Media eligibility is a global manual Operator assertion with recorded basis, optional expiry, and explicit revocation; technical availability or capability never implies permission. | Manual review is the simplest defensible boundary for curated broadcast content, while one global eligibility state prevents contradictory per-Experience approval. |

## Traceability Matrix

| Foundation Direction | Product Specification Sections |
|---|---|
| Personal broadcast network | Product Summary; Actors; Broadcast Requirements |
| Channel Zero is the public continuously running homepage | Broadcast Requirements; Audience Requirements |
| Collection / Production / Broadcast / Audience | Core Product Concepts; corresponding requirement sections |
| Experience / Program / Playlist distinctions | Production Requirements |
| Manual control overrides automation | Manual Broadcast Control; Operator Requirements |
| AI assists but does not define | PS-NFR-008; Publication and Lifecycle |
| Collection improves over time | Collection Requirements; Publication and Lifecycle |
| Every page encourages exploration | Exploration and Search; Audience Requirements |
| No feature without a data model | All requirements trace forward to RV2-FND-05 |
| Smallest useful release first | Release 1 Scope; DEC-0019 |
| Existing application is research | Import staging and validation; no compatibility requirement |

## Cross-References

### Normative Inputs

- [RV2-FND-00 — Vision](./00-Vision.md)
- [RV2-FND-01 — Constitution](./01-Constitution.md)
- [RV2-FND-02 — Decision Log](./02-Decision-Log.md)
- [RV2-FND-03 — Glossary](./03-Glossary.md)

### Normative Outputs

- [RV2-FND-05 — Data Model](./05-Data-Model.md) defines every entity, relationship, lifecycle, and integrity rule required here.
- [RV2-FND-06 — Architecture](./06-Architecture.md) assigns system responsibilities for this behavior.
- [RV2-FND-07 — UX Standards](./07-UX-Standards.md) defines interaction and presentation rules.
- [RV2-FND-11 — Build Specification](./11-Build-Specification.md) defines the implementation sequence and technical quality gates.
- [RV2-FND-12 — Acceptance Criteria](./12-Acceptance-Criteria.md) defines measurable completion evidence.

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
| 0.1.0 | 2026-07-13 | Draft | Defined Release 1 product scope, actors, lifecycle, Channel Zero behavior, production model, audience exploration, and operator control. | Engineering Program Manager |
| 0.0.0 | 2026-07-13 | Framework | Created document framework. No architect-authored content added. | Engineering Program Manager |
