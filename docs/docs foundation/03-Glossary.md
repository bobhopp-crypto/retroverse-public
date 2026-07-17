---
document_id: RV2-FND-03
title: Retroverse Glossary
version: 0.2.0
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

# Retroverse Glossary

[Foundation Index](./README.md) · [Previous: RV2-FND-02](./02-Decision-Log.md) · [Next: RV2-FND-04](./04-Product-Specification.md)

## Document Control

| Field | Value |
|---|---|
| Document ID | RV2-FND-03 |
| Version | 0.2.0 |
| Document Status | Draft |
| Review Status | Not Started |
| Approval Status | Not Submitted |
| Content Authority | Chief Product Architect |
| Document Maintainer | Engineering Program Manager |

## Table of Contents

- [Purpose](#purpose)
- [Terminology Rules](#terminology-rules)
- [Product and Layer Terms](#product-and-layer-terms)
- [Core Entity Terms](#core-entity-terms)
- [Supporting Domain Terms](#supporting-domain-terms)
- [Engineering and Governance Terms](#engineering-and-governance-terms)
- [Core Entity Identifier Registry](#core-entity-identifier-registry)
- [Missing Definition Queue](#missing-definition-queue)
- [Ambiguous or Duplicate Terms](#ambiguous-or-duplicate-terms)
- [Cross-References](#cross-references)
- [Open Decisions](#open-decisions)
- [Consistency Review](#consistency-review)
- [Review Record](#review-record)
- [Approval Record](#approval-record)
- [Amendment History](#amendment-history)
- [Version History](#version-history)

## Purpose

This Glossary is the controlled terminology register for the Retroverse V2 Foundation. It supplies the canonical short meaning of domain and governance terms; detailed fields, rules, and behavior remain in their governing documents.

## Terminology Rules

1. A formal Retroverse term uses one meaning throughout the Foundation.
2. Entity, layer, Channel, role, and release names are capitalized when they refer to formal Retroverse concepts.
3. A core entity prefix is reserved and shall not be reassigned.
4. A human-readable slug, external identifier, provider identifier, or database table name does not replace a Retroverse entity identity.
5. Formal synonyms are not introduced without an approved decision.
6. Generic lowercase prose may use ordinary language only when it cannot be confused with a formal entity.
7. This Glossary summarizes meaning; the Product Specification defines behavior, the Data Model defines persistent identity and integrity, and the Architecture defines component boundaries.
8. A new term that implies product behavior, a domain entity, or an authority boundary requires the corresponding Foundation decision before implementation.

## Product and Layer Terms

### TERM-0001 — Retroverse

**Definition:** A personal broadcast network that transforms a curated music collection into engaging historical experiences for live and remote audiences.

**Authority:** [DEC-0001](./02-Decision-Log.md#dec-0001--mission)

### TERM-0002 — Channel Zero

**Definition:** The Retroverse public homepage and continuously running public broadcast channel. Release 1 has exactly one Channel Zero timeline shared by all audience clients.

**Authority:** DEC-0002, DEC-0021, DEC-0038

### TERM-0020 — Personal Broadcast Network

**Definition:** A curator-operated system in which one canonical sequence is continuously presented to multiple anonymous audience clients and supported by public exploration. “Personal” describes the curator-owned network, not a personalized timeline for each audience member.

**Authority:** [RV2-FND-00 § Product Identity](./00-Vision.md#product-identity); DEC-0021

### TERM-0021 — Curated Music Collection

**Definition:** The authoritative body of music and historical records accepted and maintained by an Operator with provenance, validation, lifecycle, and media-eligibility controls. Imported or discovered data is not authoritative merely because it is available.

**Authority:** [RV2-FND-04 § Collection](./04-Product-Specification.md#collection); DEC-0030

### TERM-0022 — Collection Layer

**Definition:** The layer that owns authoritative Tracks, Artists, Albums, Charts, chart data, time records, provenance, and eligible media references.

**Authority:** [RV2-FND-04 § Collection](./04-Product-Specification.md#collection)

### TERM-0023 — Production Layer

**Definition:** The layer that turns Collection records into draft and published Experiences and Programs and into private organizational Playlists.

**Authority:** [RV2-FND-04 § Production](./04-Product-Specification.md#production)

### TERM-0024 — Broadcast Layer

**Definition:** The layer that owns canonical Channel Zero state, manual broadcast control, fallback, and derivation of the current Experience from a published Program and canonical time.

**Authority:** [RV2-FND-04 § Broadcast](./04-Product-Specification.md#broadcast)

### TERM-0025 — Audience Layer

**Definition:** The layer that presents Channel Zero and public exploration without owning Collection or Production truth or creating a personalized timeline.

**Authority:** [RV2-FND-04 § Audience](./04-Product-Specification.md#audience)

### TERM-0026 — Historical Experience

**Definition:** An audience-facing presentation that connects curated music to explicit chart, calendar, artist, album, or related historical context. In Release 1, the formal unit of such presentation is an Experience (`RVEX`).

**Authority:** Mission; DEC-0022

### TERM-0027 — Live Audience

**Definition:** People viewing the ordinary public Channel Zero product on a shared display, personal device, or both in connection with a physical gathering. Release 1 provides no live-only timeline or Event requirement.

**Authority:** [RV2-FND-04 § Live and Remote Audience Model](./04-Product-Specification.md#live-and-remote-audience-model); DEC-0028

### TERM-0028 — Remote Audience

**Definition:** People independently accessing the public Channel Zero product over the network. Remote clients share the same canonical Broadcast State as live clients.

**Authority:** [RV2-FND-04 § Live and Remote Audience Model](./04-Product-Specification.md#live-and-remote-audience-model); DEC-0028

### TERM-0029 — Explore

**Definition:** The public index and relationship-based navigation system for visible music, chart, time, Experience, and Program records. Explore is not a recommendation feed.

**Authority:** DEC-0027; [RV2-FND-07 § Exploration Surfaces](./07-UX-Standards.md#exploration-surfaces)

## Core Entity Terms

### TERM-0003 — Experience

**Identifier:** `RVEX`

**Definition:** The smallest audience-visible presentation. A published Experience is an immutable revision with one supported type, one uninterrupted duration, one primary visual presentation, and explicit public entity relationships.

**Release 1 types:** Track Spotlight, Chart Snapshot, and Time Capsule.

**Authority:** DEC-0005, DEC-0022, DEC-0025

### TERM-0004 — Program

**Identifier:** `RVPR`

**Definition:** An ordered sequence of published Experience revisions broadcast on Channel Zero. A published Program revision is immutable and its duration is the sum of its Experience durations.

**Authority:** DEC-0006, DEC-0023, DEC-0025

### TERM-0005 — Playlist

**Identifier:** `RVPL`

**Definition:** A private ordered collection of Tracks used for organization and production reference. A Playlist is never published or broadcast.

**Authority:** DEC-0007, DEC-0024

### TERM-0006 — Pass

**Identifier:** `RVPA`

**Definition:** A physical credential associated with a future access workflow. Pass operation is outside Release 1.

**Authority:** DEC-0008, DEC-0029

### TERM-0007 — Pass Credential

**Identifier:** `RVSN`

**Definition:** An opaque identifier that may be printed, encoded as a QR code, or represented in future formats. It is distinct from the physical Pass and has no Release 1 operational use.

**Authority:** DEC-0009, DEC-0029, DEC-0031

### TERM-0008 — Track

**Identifier:** `RVTR`

**Definition:** The canonical curated record for one specific recording, mix, edit, live performance, or re-recording. The same recording reused on multiple Albums retains one Track; a materially different performance, mix, or edit is another Track. Release 1 does not model a musical composition as a separate entity. A publishable Track has at least one primary Artist.

**Authority:** [RV2-FND-05 § Track](./05-Data-Model.md#track-track); PS-COL-009–010

### TERM-0009 — Artist

**Identifier:** `RVAR`

**Definition:** A person or group credited in relation to a Track or Album. Artist identity does not infer legal identity, group membership, or personhood beyond the credited entity.

**Authority:** [RV2-FND-05 § Artist](./05-Data-Model.md#artist-artist)

### TERM-0010 — Album

**Identifier:** `RVAL`

**Definition:** A curated release configuration with a canonical title, optional Artist credits, and ordered Track membership. A materially different title, credited edition, membership, or order is another Album; format, territory, catalog-number, or mastering variants may share an Album when that configuration is unchanged. A Track may belong to multiple Albums or no Album.

**Authority:** [RV2-FND-05 § Album](./05-Data-Model.md#album-album)

### TERM-0011 — Chart

**Identifier:** `RVCH`

**Definition:** A named recurring ranked publication. Release 1 Charts have weekly cadence and are instantiated as Chart Issues associated with Weeks.

**Authority:** [RV2-FND-05 § Chart Model](./05-Data-Model.md#chart-model)

### TERM-0012 — Week

**Identifier:** `RVWK`

**Definition:** An ISO 8601 week identified by ISO week-numbering year and week number, beginning Monday and ending Sunday.

**Authority:** DEC-0033; [RV2-FND-05 § Week](./05-Data-Model.md#week-week)

### TERM-0013 — Month

**Identifier:** `RVMO`

**Definition:** One Gregorian calendar month numbered 1 through 12 and belonging to exactly one Year.

**Authority:** DEC-0033; [RV2-FND-05 § Month](./05-Data-Model.md#month-month)

### TERM-0014 — Year

**Identifier:** `RVYR`

**Definition:** One Gregorian calendar year belonging to exactly one fixed Decade.

**Authority:** DEC-0033; [RV2-FND-05 § Year](./05-Data-Model.md#year-year)

### TERM-0015 — Decade

**Identifier:** `RVDE`

**Definition:** A fixed ten-year range whose start year is divisible by ten and whose end year is the start year plus nine.

**Authority:** DEC-0033; [RV2-FND-05 § Decade](./05-Data-Model.md#decade-decade)

### TERM-0016 — Era

**Identifier:** `RVER`

**Definition:** A curator-defined named historical date range. Eras may overlap and do not imply a hierarchy.

**Authority:** DEC-0033; [RV2-FND-05 § Era](./05-Data-Model.md#era-era)

### TERM-0017 — Event

**Identifier:** `RVEV`

**Definition:** A future planned live or remote gathering associated with a time interval and optionally a Venue and Program. Event operation is outside Release 1.

**Authority:** DEC-0029; [RV2-FND-04 § Events, Venues, Patrons, and Passes](./04-Product-Specification.md#events-venues-patrons-and-passes)

### TERM-0018 — Venue

**Identifier:** `RVVE`

**Definition:** A future named physical or virtual location at which an Event occurs. Venue operation is outside Release 1.

**Authority:** DEC-0029; [RV2-FND-04 § Events, Venues, Patrons, and Passes](./04-Product-Specification.md#events-venues-patrons-and-passes)

### TERM-0019 — Patron

**Identifier:** `RVPT`

**Definition:** A future person recognized by Retroverse for event or access purposes. Ordinary Release 1 audience visitors do not create Patron records.

**Authority:** DEC-0029, DEC-0035

## Supporting Domain Terms

### TERM-0030 — Track Spotlight

**Definition:** An Experience type centered on exactly one primary Track and identifying that Track and its primary Artist.

**Authority:** PS-EXP-101–105

### TERM-0031 — Chart Snapshot

**Definition:** An Experience type presenting a curator-selected ordered subset of one Chart Issue for one Week with authoritative ranks.

**Authority:** PS-EXP-201–205

### TERM-0032 — Time Capsule

**Definition:** An Experience type centered on exactly one Week, Month, Year, Decade, or Era and containing one or more curator-selected related Tracks.

**Authority:** PS-EXP-301–304

### TERM-0033 — Chart Issue

**Definition:** One occurrence of a Chart for one Week. It is a supporting entity with a UUIDv7 rather than a reserved core prefix.

**Authority:** [RV2-FND-05 § Chart Issue](./05-Data-Model.md#chart-issue-chart_issue)

### TERM-0034 — Chart Entry

**Definition:** A Track's ranked placement within one Chart Issue. Rank is a positive integer unique within that issue.

**Authority:** [RV2-FND-05 § Chart Entry](./05-Data-Model.md#chart-entry-chart_entry)

### TERM-0035 — Revision

**Definition:** A versioned content state belonging to an Experience or Program identity. A draft revision is editable; a published revision and all of its child rows, public snapshot, and content hash are immutable. Revisions are not archived; their parent identity owns archival lifecycle.

**Authority:** DEC-0025, DEC-0034

### TERM-0036 — Publication

**Definition:** The validated, audited transition that creates an immutable public-eligible Experience or Program revision or makes an eligible collection record publicly visible according to its lifecycle rules.

**Authority:** [RV2-FND-04 § Publication and Lifecycle](./04-Product-Specification.md#publication-and-lifecycle)

### TERM-0037 — Broadcast State

**Definition:** The singleton canonical Channel Zero record containing the active published Program revision, effective UTC start, start offset, fallback revision, and manifest version.

**Authority:** DEC-0021; [RV2-FND-05 § Broadcast State](./05-Data-Model.md#broadcast-state-broadcast_state)

### TERM-0038 — Channel Manifest

**Definition:** A side-effect-free versioned public projection of Broadcast State and immutable published snapshots that lets a client derive canonical current, elapsed, and next Experience state from PostgreSQL canonical time. It is derived data, not persisted authority.

**Authority:** DEC-0038; [RV2-FND-05 § Channel Manifest](./05-Data-Model.md#channel-manifest)

### TERM-0039 — Fallback Program

**Definition:** The published Program revision configured as Channel Zero's required continuity path when the active Program is invalid or when an Operator manually invokes fallback.

**Authority:** PS-BRD-101–105, PS-BRD-205

### TERM-0040 — Manual Broadcast Control

**Definition:** An authenticated and audited Operator command that atomically changes Broadcast State. Release 1 actions are activate, activate-at, skip, replay, and fallback; they take precedence over automated behavior.

**Authority:** DEC-0012, DEC-0026

### TERM-0041 — Media Asset

**Definition:** A stored image or normalized audio/video provider reference with declared metadata, eligibility state, verification state, and provenance. Technical availability does not establish approval.

**Authority:** DEC-0030, DEC-0039; [RV2-FND-05 § Media Model](./05-Data-Model.md#media-model)

### TERM-0042 — Source Record

**Definition:** An immutable record of the origin and raw or normalized source context from which imported or manually recorded facts were derived.

**Authority:** [RV2-FND-05 § Provenance and Import Model](./05-Data-Model.md#provenance-and-import-model)

### TERM-0043 — Field Provenance

**Definition:** The attribution connecting an authoritative field value to its Source Record, import, or manual override history.

**Authority:** [RV2-FND-05 § Field Provenance](./05-Data-Model.md#field-provenance-field_provenance)

### TERM-0044 — Audience Member

**Definition:** Any anonymous visitor using a public Retroverse surface. Release 1 creates no persistent Audience Member identity record.

**Authority:** [RV2-FND-04 § Audience Member](./04-Product-Specification.md#audience-member); DEC-0035

### TERM-0045 — Operator

**Definition:** An authenticated and allowlisted administrator responsible for curation, production, publication, and broadcast control. Release 1 has one product role, `operator`.

**Authority:** [RV2-FND-04 § Operator](./04-Product-Specification.md#operator); DEC-0040

## Engineering and Governance Terms

### TERM-0046 — Source of Truth

**Definition:** The one authoritative owner and representation of a fact or decision. Derived projections, caches, tests, prior applications, and AI output do not become competing authorities.

**Authority:** DEC-0011; [RV2-FND-08 § Source-of-Truth Order](./08-Development-Manual.md#source-of-truth-order)

### TERM-0047 — Automation

**Definition:** A system-initiated process operating within approved rules. Automation cannot create product authority and remains subordinate to applicable manual control.

**Authority:** DEC-0012, DEC-0013

### TERM-0048 — Smallest Useful Release

**Definition:** Release 1: the minimum coherent implementation of the complete Collection → Production → Broadcast → Audience loop, with event-access and other exclusions explicitly deferred.

**Authority:** DEC-0017, DEC-0019; [RV2-FND-12 § Release Outcome](./12-Acceptance-Criteria.md#release-outcome)

### TERM-0049 — Page

**Definition:** An audience-visible public route or private Operator route with a distinct user purpose. Every public Page provides a direct Channel Zero route and relevant exploration when eligible related content exists.

**Authority:** DEC-0015, DEC-0027; [RV2-FND-07 § Information Architecture](./07-UX-Standards.md#information-architecture)

### TERM-0050 — Skill

**Definition:** A narrow, versioned bundle of AI workflow instructions and optional scripts, references, or assets with defined triggers, permissions, evidence, and stop conditions.

**Authority:** DEC-0050; [RV2-FND-10 § Skill Contract](./10-Skill-Library.md#skill-contract)

### TERM-0051 — Publication Snapshot

**Definition:** The immutable, schema-versioned public payload stored when an Experience or Program revision is published. It contains every audience-visible value and relationship required to reproduce that revision and has a deterministic canonical content hash.

**Authority:** DEC-0034; PS-EXP-011–012; [RV2-FND-05 § Production Model](./05-Data-Model.md#production-model)

### TERM-0052 — Broadcast Readiness

**Definition:** The one deterministic predicate that decides whether a published Program revision and all of its referenced Experience revisions, snapshots, relationships, primary visuals, and current media state are valid for fallback configuration or new Channel Zero activation.

**Authority:** PS-BRD-106–107; [RV2-FND-05 § Broadcast Readiness](./05-Data-Model.md#broadcast-readiness)

### TERM-0053 — Temporal Relation

**Definition:** An explicit, provenance-bearing relationship connecting a Track, Album, Chart, or Experience to exactly one Week, Month, Year, Decade, or Era with a controlled meaning such as release, chart coverage, or curated context.

**Authority:** PS-COL-013; [RV2-FND-05 § Temporal Relation](./05-Data-Model.md#temporal-relation-temporal_relation)

### TERM-0054 — Public Visibility

**Definition:** The request-time decision that a record or immutable revision may be exposed on an audience surface because its canonical lifecycle and explicit published-reference state satisfy the Product Specification. Existence in a search document, sitemap, browser cache, or prior URL does not grant visibility.

**Authority:** PS-AUD-101–107; [RV2-FND-05 § Public Data Projection](./05-Data-Model.md#public-data-projection)

### TERM-0055 — Canonical Clock

**Definition:** PostgreSQL statement time obtained in the same transaction that reads Broadcast State and Program data. Application-node and client wall clocks estimate presentation offset but never decide canonical Channel Zero position.

**Authority:** PS-BRD-306–307; DEC-0033

### TERM-0056 — Slug Redirect

**Definition:** An immutable mapping from a prior public slug directly to the same currently visible canonical identity. It cannot make an invisible identity public and cannot form a redirect chain or loop.

**Authority:** PS-COL-019; [RV2-FND-05 § Slug Redirect](./05-Data-Model.md#slug-redirect-slug_redirect)

### TERM-0057 — Outbox Event

**Definition:** A durable event record written in the same PostgreSQL transaction as the canonical mutation whose derived work it announces. Consumers are idempotent by its event identity.

**Authority:** [RV2-FND-05 § Operational Persistence Model](./05-Data-Model.md#operational-persistence-model)

### TERM-0058 — Acceptance Profile

**Definition:** The versioned declaration of fixture volume, client matrix, network conditions, load, region, cache state, sample size, and duration used to make Release 1 performance and convergence evidence reproducible.

**Authority:** [RV2-FND-11 § Acceptance Profile](./11-Build-Specification.md#acceptance-profile)

### TERM-0059 — Audit Event

**Definition:** The single append-only evidence record for a canonical Operator, system, or import action, containing the actor, controlled action, target identity, time, and sanitized typed context. One idempotent command creates at most one Audit Event.

**Authority:** PS-BRD-207; [RV2-FND-05 § Audit Event](./05-Data-Model.md#audit-event-audit_event)

### TERM-0060 — Command Idempotency

**Definition:** The persistence contract that scopes a client-supplied key to an Operator and command, binds it to one validated request fingerprint for 24 hours, replays the stored canonical response for an identical retry, and rejects reuse for a different request.

**Authority:** [RV2-FND-05 § Command Idempotency](./05-Data-Model.md#command-idempotency-command_idempotency)

### TERM-0061 — Entity Alias

**Definition:** A non-public normalized matching value attached to one canonical identity to preserve source names or merge history without creating a second identity or public URL.

**Authority:** PS-COL-019; [RV2-FND-05 § Entity Alias](./05-Data-Model.md#entity-alias-entity_alias)

## Core Entity Identifier Registry

| Term ID | Identifier | Entity | Release 1 Operational Status |
|---|---|---|---|
| TERM-0008 | `RVTR` | Track | Included |
| TERM-0009 | `RVAR` | Artist | Included |
| TERM-0010 | `RVAL` | Album | Included |
| TERM-0011 | `RVCH` | Chart | Included |
| TERM-0012 | `RVWK` | Week | Included |
| TERM-0013 | `RVMO` | Month | Included |
| TERM-0014 | `RVYR` | Year | Included |
| TERM-0015 | `RVDE` | Decade | Included |
| TERM-0016 | `RVER` | Era | Included |
| TERM-0003 | `RVEX` | Experience | Included |
| TERM-0004 | `RVPR` | Program | Included |
| TERM-0005 | `RVPL` | Playlist | Included; private and never broadcast |
| TERM-0017 | `RVEV` | Event | Reserved future |
| TERM-0018 | `RVVE` | Venue | Reserved future |
| TERM-0019 | `RVPT` | Patron | Reserved future |
| TERM-0006 | `RVPA` | Pass | Reserved future |
| TERM-0007 | `RVSN` | Pass Credential | Reserved future |

## Missing Definition Queue

No missing definition currently blocks the Release 1 Foundation. DEF-0001 through DEF-0028 were resolved by RV2-FND-04 through RV2-FND-12 and the definitions in version 0.2.0 of this Glossary.

Future undefined terms shall be entered here with a unique `DEF-NNNN`, source location, required authority, status, and resolution reference.

## Ambiguous or Duplicate Terms

| Finding ID | Terms / Variants | Controlled Relationship | Status | Resolution Reference |
|---|---|---|---|---|
| DUP-0001 | Experience; historical experience | Formal Release 1 historical presentations are Experience revisions; lowercase prose may describe the audience outcome. | Resolved | TERM-0003; TERM-0026; DEC-0022 |
| DUP-0002 | Collection layer; curated music collection | The Collection layer owns the authoritative curated music and historical collection plus provenance and eligible media references. | Resolved | TERM-0021; TERM-0022 |
| DUP-0003 | Broadcast layer; broadcast; Channel Zero | Broadcast is the layer and activity; Channel Zero is the single public channel whose state that layer owns. | Resolved | TERM-0002; TERM-0024; TERM-0037 |
| DUP-0004 | Pass; Pass Credential | Pass is physical; Pass Credential is the opaque identifier represented on or through a Pass. | Controlled | TERM-0006; TERM-0007 |
| DUP-0005 | Playlist; Program | Playlist privately organizes Tracks and is never broadcast; Program orders published Experience revisions for broadcast. | Controlled | TERM-0004; TERM-0005 |
| DUP-0006 | Audience; Audience Member; Patron | Audience is a presentation layer; Audience Member is an anonymous visitor; Patron is a reserved future access person record. | Controlled | TERM-0025; TERM-0044; TERM-0019 |

## Cross-References

### Outbound References

| Target | Relationship | Source Location |
|---|---|---|
| [RV2-FND-00](./00-Vision.md) | Mission and product-language source | Product and Layer Terms |
| [RV2-FND-01](./01-Constitution.md) | Governing terminology principles | Terminology Rules; Governance Terms |
| [RV2-FND-02](./02-Decision-Log.md) | Definition and identifier authority | Entire document |
| [RV2-FND-04](./04-Product-Specification.md) | Product behavior and actors | Product, entity, and supporting terms |
| [RV2-FND-05](./05-Data-Model.md) | Identity, field, and invariant authority | Entity and supporting terms |
| [RV2-FND-06](./06-Architecture.md) | Layer and component boundaries | Layer and engineering terms |
| [RV2-FND-07](./07-UX-Standards.md) | Page and exploration terminology | Explore; Page |
| [RV2-FND-08](./08-Development-Manual.md) | Source-of-truth terminology | Engineering and Governance Terms |
| [RV2-FND-09](./09-AI-Operations.md) | AI authority and skill context | Automation; Skill |
| [RV2-FND-10](./10-Skill-Library.md) | Skill definition | TERM-0050 |
| [RV2-FND-12](./12-Acceptance-Criteria.md) | Useful-release evidence | TERM-0048 |

### Inbound References

| Source | Relationship | Target Location |
|---|---|---|
| [RV2-FND-INDEX](./README.md) | Document registration | Entire document |
| [RV2-FND-00–12](./00-Vision.md) | Controlled Foundation terminology | Entire document |

## Open Decisions

No open decision blocks this Glossary or the Release 1 Foundation.

## Consistency Review

| Finding ID | Type | Location | Description | Status | Resolution Reference |
|---|---|---|---|---|---|
| DEF-0001–0028 | Missing definitions | Version 0.1.0 queue | Product, layer, entity, control, and release definitions were supplied by the completed Foundation. | Resolved | Terms in version 0.2.0 |
| DUP-0001–0003 | Ambiguous concepts | Version 0.1.0 findings | Concept boundaries are now explicit. | Resolved | Ambiguous or Duplicate Terms |

## Review Record

| Review ID | Version | Reviewer | Review Type | Date | Outcome | Notes |
|---|---:|---|---|---|---|---|

## Approval Record

| Version | Approver | Decision | Date | Notes |
|---|---|---|---|---|

## Amendment History

| Amendment ID | From Version | To Version | Date | Summary | Approval Reference |
|---|---:|---:|---|---|---|

## Version History

| Version | Date | Status | Summary | Maintainer |
|---|---|---|---|---|
| 0.2.0 | 2026-07-13 | Draft | Added complete Release 1 product, layer, entity, supporting, and governance definitions and resolved DEF-0001–0028 and DUP-0001–0003. | Engineering Program Manager |
| 0.1.0 | 2026-07-13 | Draft | Added approved terminology, the core identifier registry, and unresolved definition findings. | Engineering Program Manager |
| 0.0.0 | 2026-07-13 | Framework | Created glossary-management framework. No definitions added. | Engineering Program Manager |
