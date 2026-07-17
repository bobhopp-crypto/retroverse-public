---
document_id: RV2-FND-02
title: Retroverse Decision Log
version: 0.3.0
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

# Retroverse Decision Log

[Foundation Index](./README.md) · [Previous: RV2-FND-01](./01-Constitution.md) · [Next: RV2-FND-03](./03-Glossary.md)

## Document Control

| Field | Value |
|---|---|
| Document ID | RV2-FND-02 |
| Version | 0.3.0 |
| Document Status | Draft |
| Review Status | Not Started |
| Approval Status | Not Submitted |
| Content Authority | Chief Product Architect |
| Document Maintainer | Engineering Program Manager |

## Table of Contents

- [Purpose](#purpose)
- [Decision Statuses](#decision-statuses)
- [Open Decision Register](#open-decision-register)
- [Approved Decision Register](#approved-decision-register)
- [Approved Decision Records](#approved-decision-records)
- [Incorporated Decision Rationale](#incorporated-decision-rationale)
- [Decision Record Contract](#decision-record-contract)
- [Cross-References](#cross-references)
- [Consistency Review](#consistency-review)
- [Review Record](#review-record)
- [Approval Record](#approval-record)
- [Amendment History](#amendment-history)
- [Version History](#version-history)

## Purpose

This document is the authoritative register of Retroverse V2 Foundation decisions and unresolved product or architecture questions.

It preserves the distinction between:

- a decision that has been explicitly approved;
- a proposal that has not been approved;
- an unresolved question that blocks or constrains downstream work;
- an implementation detail that is already authorized by approved product and architectural decisions.

This log records decisions; it does not create decision authority. The Chief Product Architect may resolve a missing detail by selecting the simplest architecture consistent with the approved Foundation. An Open Decision is required only when materially different directions cannot be confidently reconciled from the approved direction.

## Decision Statuses

| Status | Meaning |
|---|---|
| Open | A question requires an authorized decision because materially different directions remain. |
| Resolved | A formerly Open question has a linked Approved decision or approved Foundation provision that answers it. |
| Proposed | A candidate decision exists but has not been approved. |
| Approved | The decision authority has approved the decision. |
| Rejected | The decision authority explicitly rejected the proposal. |
| Superseded | A later approved decision replaced this decision. |
| Withdrawn | The question or proposal was removed before approval. |

## Open Decision Register

| Open Decision ID | Question | Raised From | Date Raised | Decision Authority | Affected Documents | Status | Resolution Reference |
|---|---|---|---|---|---|---|---|
| OD-0001 | What is the complete scope of the smallest useful Retroverse V2 release, including the entity groups, audience capabilities, production capabilities, and operational capabilities that are included or excluded? | RV2-FND-04 authoring | 2026-07-13 | Chief Product Architect | RV2-FND-04–12 | Resolved | [DEC-0019](./04-Product-Specification.md#product-decisions-and-rationale); [RV2-FND-04 § Release 1 Scope](./04-Product-Specification.md#release-1-scope) |
| OD-0002 | What are Channel Zero's broadcast-continuity and audience-timeline semantics, including entry position, synchronization, transitions, interruption, fallback, and recovery? | RV2-FND-04 authoring | 2026-07-13 | Chief Product Architect | RV2-FND-04–07, 11, 12 | Resolved | DEC-0021, DEC-0038; [RV2-FND-04 § Broadcast Requirements](./04-Product-Specification.md#broadcast-requirements) |
| OD-0003 | How are Programs selected, ordered, scheduled, started, stopped, replaced, and manually overridden on Channel Zero? | RV2-FND-04 authoring | 2026-07-13 | Chief Product Architect | RV2-FND-04–12 | Resolved | DEC-0021, DEC-0026; [RV2-FND-04 § Manual Broadcast Control](./04-Product-Specification.md#manual-broadcast-control) |
| OD-0004 | Which Experience types exist in the initial release, and what audience-visible behavior defines each type? | RV2-FND-04 authoring | 2026-07-13 | Chief Product Architect | RV2-FND-03–07, 11, 12 | Resolved | DEC-0022; [RV2-FND-04 § Experience Types](./04-Product-Specification.md#experience-types) |
| OD-0005 | Which audience actions and exploration paths must be available from Channel Zero and from other audience-visible pages? | RV2-FND-04 authoring | 2026-07-13 | Chief Product Architect | RV2-FND-04–07, 11, 12 | Resolved | DEC-0027, DEC-0041; [RV2-FND-07 § Channel Zero](./07-UX-Standards.md#channel-zero) |
| OD-0006 | Which product behaviors differ between live and remote audiences? | RV2-FND-04 authoring | 2026-07-13 | Chief Product Architect | RV2-FND-03–07, 11, 12 | Resolved | DEC-0028; [RV2-FND-04 § Live and Remote Audience Model](./04-Product-Specification.md#live-and-remote-audience-model) |
| OD-0007 | What roles do Event, Venue, Patron, Pass, and Pass Credential play in the initial release? | RV2-FND-04 authoring | 2026-07-13 | Chief Product Architect | RV2-FND-03–07, 11, 12 | Resolved | DEC-0029; [RV2-FND-04 § Events, Venues, Patrons, and Passes](./04-Product-Specification.md#events-venues-patrons-and-passes) |
| OD-0008 | What curation, authoring, production, approval, and permission workflows are required for the Collection and Production layers? | RV2-FND-04 authoring | 2026-07-13 | Chief Product Architect | RV2-FND-03–12 | Resolved | DEC-0019, DEC-0020, DEC-0023–0025; [RV2-FND-04 § Operator Requirements](./04-Product-Specification.md#operator-requirements) |
| OD-0009 | Which media sources and formats may Experiences use, and what content-eligibility or rights constraints govern broadcast? | RV2-FND-04 authoring | 2026-07-13 | Chief Product Architect | RV2-FND-03–06, 08, 11, 12 | Resolved | DEC-0030, DEC-0039; [RV2-FND-04 § Media and Content Eligibility](./04-Product-Specification.md#media-and-content-eligibility) |
| OD-0010 | What measurable outcome makes the initial release useful and acceptable to its intended audience? | RV2-FND-04 and RV2-FND-12 authoring | 2026-07-13 | Chief Product Architect | RV2-FND-04, 07, 11, 12 | Resolved | [RV2-FND-12 § Release Outcome](./12-Acceptance-Criteria.md#release-outcome) |
| OD-0011 | What are the product definitions, identity boundaries, and required relationships for Track, Artist, and Album? | RV2-FND-03 and RV2-FND-04 authoring | 2026-07-13 | Chief Product Architect | RV2-FND-03–07, 11, 12 | Resolved | [RV2-FND-05 § Collection Model](./05-Data-Model.md#collection-model) |
| OD-0012 | What are the product meanings and boundaries of Chart, Week, Month, Year, Decade, and Era, including how they relate to historical presentation? | RV2-FND-03 and RV2-FND-04 authoring | 2026-07-13 | Chief Product Architect | RV2-FND-03–07, 11, 12 | Resolved | DEC-0033; [RV2-FND-05 § Temporal Model](./05-Data-Model.md#temporal-model) |

## Approved Decision Register

| Decision ID | Title | Status | Decision Date | Decision Authority | Affected Documents |
|---|---|---|---|---|---|
| DEC-0001 | Mission | Approved | 2026-07-13 | Chief Product Architect | All Foundation documents |
| DEC-0002 | Channel Zero | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-00, 01, 03–12 |
| DEC-0003 | Four-Layer Conceptual Model | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-00, 01, 03–12 |
| DEC-0004 | Core Entity Identifier Registry | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-01, 03–12 |
| DEC-0005 | Experience Definition | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-00, 01, 03–12 |
| DEC-0006 | Program Definition | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-00, 01, 03–12 |
| DEC-0007 | Playlist Definition | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-00, 01, 03–12 |
| DEC-0008 | Pass Definition | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-01, 03–12 |
| DEC-0009 | Pass Credential Definition | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-01, 03–12 |
| DEC-0010 | Simplicity First | Approved | 2026-07-13 | Chief Product Architect | All Foundation documents |
| DEC-0011 | One Source of Truth | Approved | 2026-07-13 | Chief Product Architect | All Foundation documents |
| DEC-0012 | Manual Override | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-00, 01, 04–12 |
| DEC-0013 | AI Assists but Does Not Define | Approved | 2026-07-13 | Chief Product Architect | All Foundation documents |
| DEC-0014 | Continuous Collection Improvement | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-00, 01, 03–12 |
| DEC-0015 | Exploration from Every Page | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-00, 01, 04–12 |
| DEC-0016 | Data Model Required for Every Feature | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-01, 04–12 |
| DEC-0017 | Smallest Useful Release First | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-00, 01, 04–12 |
| DEC-0018 | Existing Application Is Research | Approved | 2026-07-13 | Chief Product Architect | All Foundation documents |
| DEC-0019 | Complete Core Loop Release | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-04–12 |
| DEC-0020 | Anonymous Audience and Single Operator Role | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-04–12 |
| DEC-0021 | One Global Looping Broadcast Timeline | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-04–07, 11, 12 |
| DEC-0022 | Three Release 1 Experience Types | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-03–07, 11, 12 |
| DEC-0023 | Immutable Program Composition | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-04–06, 11, 12 |
| DEC-0024 | Private Ordered Track Playlists | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-04–07, 11, 12 |
| DEC-0025 | Publication by New Immutable Revision | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-04–06, 08, 11, 12 |
| DEC-0026 | Manual Broadcast Control Set | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-04–09, 11, 12 |
| DEC-0027 | Relationship-Based Public Exploration | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-04–07, 11, 12 |
| DEC-0028 | Shared Live and Remote Channel | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-04, 06, 07, 11, 12 |
| DEC-0029 | Defer Event and Access Operations | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-03–06, 11, 12 |
| DEC-0030 | Manual Media Eligibility | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-04–06, 08, 11, 12 |
| DEC-0031 | Typed Core IDs and Opaque Credentials | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-05, 06, 08, 11, 12 |
| DEC-0032 | PostgreSQL Canonical Persistence | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-05, 06, 08, 11, 12 |
| DEC-0033 | Deterministic Time Semantics | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-03–07, 11, 12 |
| DEC-0034 | Immutable Published Revisions | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-05, 06, 08, 11, 12 |
| DEC-0035 | No Release 1 Audience Identity | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-04–09, 11, 12 |
| DEC-0036 | Modular Monolith | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-06, 08–12 |
| DEC-0037 | TypeScript Web Stack | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-06, 08, 11, 12 |
| DEC-0038 | Versioned HTTP Manifest Polling | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-04, 06, 07, 11, 12 |
| DEC-0039 | Normalized Media Provider Adapters | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-04–06, 08, 11, 12 |
| DEC-0040 | OIDC Allowlisted Operator | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-04, 06–09, 11, 12 |
| DEC-0041 | Full-Viewport Channel Zero UX | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-07, 11, 12 |
| DEC-0042 | One Dark Semantic Theme | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-07, 11, 12 |
| DEC-0043 | WCAG 2.2 Level AA | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-07, 08, 11, 12 |
| DEC-0044 | Single Workspace Repository | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-08–12 |
| DEC-0045 | Protected Main and Short-Lived Branches | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-08–12 |
| DEC-0046 | Risk-Based Layered Verification | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-08–12 |
| DEC-0047 | Local-First Codex Environment | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-09–12 |
| DEC-0048 | Narrow Reusable AI Capabilities | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-09, 10, 12 |
| DEC-0049 | Independent Evidence for AI Output | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-08–12 |
| DEC-0050 | Repository-Scoped Skill Library | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-09–12 |
| DEC-0051 | Pinned Supported Toolchain | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-08, 11, 12 |
| DEC-0052 | One Immutable Release Artifact | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-06, 08, 11, 12 |
| DEC-0053 | Ordered Evidence Gates | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-08–12 |
| DEC-0054 | Role-Bound Foundation Decision Authority | Approved | 2026-07-13 | Chief Product Architect | RV2-FND-00–02, 09 |

## Approved Decision Records

### DEC-0001 — Mission

| Field | Value |
|---|---|
| Status | Approved |
| Decision Date | 2026-07-13 |
| Decision Authority | Chief Product Architect |
| Supersedes | None recorded |

**Decision:** Retroverse is a personal broadcast network that transforms a curated music collection into engaging historical experiences for live and remote audiences.

**Rationale:** Approved as Foundation direction. No additional rationale was supplied.

**Consequences:** Every Foundation document and implementation must preserve this mission. Product details not stated in the mission require separate decisions.

### DEC-0002 — Channel Zero

| Field | Value |
|---|---|
| Status | Approved |
| Decision Date | 2026-07-13 |
| Decision Authority | Chief Product Architect |
| Supersedes | None recorded |

**Decision:** The public homepage is Channel Zero. Channel Zero is a continuously running broadcast channel, not a traditional homepage.

**Rationale:** Approved as Foundation direction. No additional rationale was supplied.

**Consequences:** Product, UX, data, architecture, build, and acceptance work must treat Channel Zero as the public entry point and a continuous broadcast. Detailed broadcast semantics are established by DEC-0021, DEC-0026, and DEC-0038.

### DEC-0003 — Four-Layer Conceptual Model

| Field | Value |
|---|---|
| Status | Approved |
| Decision Date | 2026-07-13 |
| Decision Authority | Chief Product Architect |
| Supersedes | None recorded |

**Decision:** Retroverse has four core layers: Collection, Production, Broadcast, and Audience.

**Rationale:** Approved as Foundation direction. Detailed boundaries are established by the Product Specification and Architecture.

**Consequences:** The four-layer model is binding. Responsibilities, ownership, interfaces, and boundaries are defined in RV2-FND-04 through RV2-FND-06.

### DEC-0004 — Core Entity Identifier Registry

| Identifier | Entity |
|---|---|
| RVTR | Track |
| RVAR | Artist |
| RVAL | Album |
| RVCH | Chart |
| RVWK | Week |
| RVMO | Month |
| RVYR | Year |
| RVDE | Decade |
| RVER | Era |
| RVEX | Experience |
| RVPR | Program |
| RVPL | Playlist |
| RVEV | Event |
| RVVE | Venue |
| RVPT | Patron |
| RVPA | Pass |
| RVSN | Pass Credential |

| Field | Value |
|---|---|
| Status | Approved |
| Decision Date | 2026-07-13 |
| Decision Authority | Chief Product Architect |
| Supersedes | None recorded |

**Decision:** The identifiers in the registry above are the approved core entity identifiers for Retroverse V2.

**Rationale:** Approved as Foundation direction. Representation, generation, lifecycle, and storage rules are established by DEC-0031 and RV2-FND-05.

**Consequences:** The mappings are reserved and must remain consistent across the Foundation and implementation. Detailed identifier semantics belong in the Data Model.

### DEC-0005 — Experience Definition

| Field | Value |
|---|---|
| Status | Approved |
| Decision Date | 2026-07-13 |
| Decision Authority | Chief Product Architect |
| Supersedes | None recorded |

**Decision:** An Experience is the smallest audience-visible presentation.

**Rationale:** Approved as Foundation direction. Release 1 types and behaviors are established by DEC-0022 and RV2-FND-04.

**Consequences:** Experience remains the formal unit for the smallest audience-visible presentation and Release 1 uses Track Spotlight, Chart Snapshot, and Time Capsule.

### DEC-0006 — Program Definition

| Field | Value |
|---|---|
| Status | Approved |
| Decision Date | 2026-07-13 |
| Decision Authority | Chief Product Architect |
| Supersedes | None recorded |

**Decision:** A Program is a sequence of Experiences broadcast on Channel Zero.

**Rationale:** Approved as Foundation direction. Ordering and control behavior are established by DEC-0021, DEC-0023, and DEC-0026.

**Consequences:** Programs are composed of ordered immutable published Experience revisions and remain distinct from Playlists.

### DEC-0007 — Playlist Definition

| Field | Value |
|---|---|
| Status | Approved |
| Decision Date | 2026-07-13 |
| Decision Authority | Chief Product Architect |
| Supersedes | None recorded |

**Decision:** A Playlist is an organizational collection and is never itself broadcast.

**Rationale:** Approved as Foundation direction. Release 1 Playlist behavior is established by DEC-0024.

**Consequences:** A Release 1 Playlist is a private ordered Track collection and must never be treated as a Program, Experience, or broadcast item.

### DEC-0008 — Pass Definition

| Field | Value |
|---|---|
| Status | Approved |
| Decision Date | 2026-07-13 |
| Decision Authority | Chief Product Architect |
| Supersedes | None recorded |

**Decision:** A Pass is a physical credential.

**Rationale:** Approved as Foundation direction. No issuance, ownership, lifecycle, access, or validation behavior was supplied.

**Consequences:** Pass remains distinct from Pass Credential and is reserved outside Release 1 operational scope under DEC-0029.

### DEC-0009 — Pass Credential Definition

| Field | Value |
|---|---|
| Status | Approved |
| Decision Date | 2026-07-13 |
| Decision Authority | Chief Product Architect |
| Supersedes | None recorded |

**Decision:** A Pass Credential (`RVSN`) is an opaque identifier that may be printed, encoded as a QR code, or represented in future formats.

**Rationale:** Approved as Foundation direction. No generation, validation, rotation, revocation, or authorization behavior was supplied.

**Consequences:** Product meaning must not depend on decoding the identifier. Printed, QR, and future representations represent the same opaque credential concept. Operational use is reserved outside Release 1 under DEC-0029.

### DEC-0010 — Simplicity First

**Status:** Approved  
**Decision Authority:** Chief Product Architect

**Decision:** Simplicity first.

**Consequence:** Product and engineering proposals must prefer the smallest clear solution that fulfills approved requirements. This principle does not authorize omission of required behavior.

### DEC-0011 — One Source of Truth

**Status:** Approved  
**Decision Authority:** Chief Product Architect

**Decision:** One source of truth.

**Consequence:** Each authoritative fact requires one defined owner and representation. Derived representations must not become competing authorities.

### DEC-0012 — Manual Override

**Status:** Approved  
**Decision Authority:** Chief Product Architect

**Decision:** Manual control always overrides automation.

**Consequence:** Automated behavior requires an explicitly specified manual override. Release 1 broadcast override semantics are established by DEC-0026.

### DEC-0013 — AI Assists but Does Not Define

**Status:** Approved  
**Decision Authority:** Chief Product Architect

**Decision:** AI assists but never defines the product.

**Consequence:** Ordinary AI implementation, review, and operations agents may support authorized work but have no independent product or architecture decision authority. Explicit Foundation-authoring authority is governed by DEC-0054.

### DEC-0014 — Continuous Collection Improvement

**Status:** Approved  
**Decision Authority:** Chief Product Architect

**Decision:** The collection continuously improves over time.

**Consequence:** Collection design supports approved correction, enrichment, provenance-preserving import, archive, and expansion as specified by RV2-FND-04 and RV2-FND-05.

### DEC-0015 — Exploration from Every Page

**Status:** Approved  
**Decision Authority:** Chief Product Architect

**Decision:** Every page should encourage exploration.

**Consequence:** Audience-visible pages provide explicit relationship-based exploration and a direct return to Channel Zero under DEC-0027 and RV2-FND-07.

### DEC-0016 — Data Model Required for Every Feature

**Status:** Approved  
**Decision Authority:** Chief Product Architect

**Decision:** No feature exists without a clearly defined data model.

**Consequence:** A feature cannot enter production implementation until its entities, identifiers, relationships, ownership, lifecycle, and integrity rules are defined.

### DEC-0017 — Smallest Useful Release First

**Status:** Approved  
**Decision Authority:** Chief Product Architect

**Decision:** Build the smallest useful release first.

**Consequence:** Release 1 implements the complete core loop under DEC-0019 and is accepted by the measurable outcomes in RV2-FND-12.

### DEC-0018 — Existing Application Is Research

**Status:** Approved  
**Decision Authority:** Chief Product Architect

**Decision:** Treat the existing Retroverse application as research, not architecture.

**Consequence:** Existing implementation details have no authority unless an approved Foundation decision adopts them.

## Incorporated Decision Rationale

The Decision Register row and decision statement in this document are the canonical status and wording for every DEC. The named source documents provide supporting rationale, consequences, and implementation context; they do not create a second decision authority. If supporting prose conflicts with this log, this log controls and the source document must be reconciled before implementation proceeds.

| Decision ID | Canonical Decision Statement | Supporting Rationale |
|---|---|---|
| DEC-0019 | Release 1 implements the complete Collection → Production → Broadcast → Audience loop and defers event-access features. | [RV2-FND-04](./04-Product-Specification.md#product-decisions-and-rationale) |
| DEC-0020 | Public audience access is anonymous; authenticated access is limited to one allowlisted Operator role. | [RV2-FND-04](./04-Product-Specification.md#product-decisions-and-rationale) |
| DEC-0021 | Channel Zero uses one global persisted timeline and loops the active Program until manual replacement. | [RV2-FND-04](./04-Product-Specification.md#product-decisions-and-rationale) |
| DEC-0022 | Release 1 supports Track Spotlight, Chart Snapshot, and Time Capsule Experiences. | [RV2-FND-04](./04-Product-Specification.md#product-decisions-and-rationale) |
| DEC-0023 | Programs contain immutable published Experience revisions and published Program revisions are immutable. | [RV2-FND-04](./04-Product-Specification.md#product-decisions-and-rationale) |
| DEC-0024 | Release 1 Playlists contain ordered Tracks and remain private organizational tools. | [RV2-FND-04](./04-Product-Specification.md#product-decisions-and-rationale) |
| DEC-0025 | Published Experiences and Programs are revised by publishing new immutable revisions. | [RV2-FND-04](./04-Product-Specification.md#product-decisions-and-rationale) |
| DEC-0026 | Manual control supports activate, activate-at, skip, replay, and fallback. | [RV2-FND-04](./04-Product-Specification.md#product-decisions-and-rationale) |
| DEC-0027 | Release 1 exploration uses public entity pages, explicit relationships, and public search. | [RV2-FND-04](./04-Product-Specification.md#product-decisions-and-rationale) |
| DEC-0028 | Live and remote audiences share the same Channel Zero behavior in Release 1. | [RV2-FND-04](./04-Product-Specification.md#product-decisions-and-rationale) |
| DEC-0029 | Event, Venue, Patron, Pass, and Pass Credential remain reserved future concepts outside Release 1 operation. | [RV2-FND-04](./04-Product-Specification.md#product-decisions-and-rationale) |
| DEC-0030 | Media eligibility is a global manual Operator assertion with recorded basis, optional expiry, and explicit revocation; technical availability or capability never implies permission. | [RV2-FND-04](./04-Product-Specification.md#product-decisions-and-rationale) |
| DEC-0031 | Core IDs use entity prefix plus UUIDv7; Pass Credentials use random opaque Base32 secrets. | [RV2-FND-05](./05-Data-Model.md#data-decisions-and-rationale) |
| DEC-0032 | PostgreSQL is the only canonical datastore; normalized domain records, transactional outbox events, leased jobs, and rebuildable search projections remain under that authority. | [RV2-FND-05](./05-Data-Model.md#data-decisions-and-rationale) |
| DEC-0033 | Time uses ISO Weeks, Gregorian Months and Years, fixed ten-year Decades, independently curated Eras, explicit overlap relationships, and PostgreSQL statement time as the canonical broadcast clock. | [RV2-FND-05](./05-Data-Model.md#data-decisions-and-rationale) |
| DEC-0034 | Published Experience and Program revisions, their children, and their versioned public snapshots and content hashes are immutable; current safety state may suppress revoked media delivery without rewriting history. | [RV2-FND-05](./05-Data-Model.md#data-decisions-and-rationale) |
| DEC-0035 | Release 1 persists no audience identity; future Pass Credential storage retains only a keyed hash. | [RV2-FND-05](./05-Data-Model.md#data-decisions-and-rationale) |
| DEC-0036 | Release 1 uses a modular monolith with one web application, one database, and a same-codebase worker. | [RV2-FND-06](./06-Architecture.md#architecture-decisions-and-rationale) |
| DEC-0037 | The approved stack is TypeScript, Node.js LTS, Next.js, React, Drizzle, and PostgreSQL. | [RV2-FND-06](./06-Architecture.md#architecture-decisions-and-rationale) |
| DEC-0038 | Channel Zero synchronizes through a side-effect-free versioned HTTP manifest polled at least every five seconds while visible. | [RV2-FND-06](./06-Architecture.md#architecture-decisions-and-rationale) |
| DEC-0039 | Audio and video use normalized capability-reporting provider adapters and only manually approved metadata, Track associations, and references. | [RV2-FND-06](./06-Architecture.md#architecture-decisions-and-rationale) |
| DEC-0040 | Release 1 uses OIDC, one database-authoritative allowlisted Operator role, and a single-use bootstrap enrollment path. | [RV2-FND-06](./06-Architecture.md#architecture-decisions-and-rationale) |
| DEC-0041 | Channel Zero uses a full-viewport broadcast canvas with no audience timeline controls. | [RV2-FND-07](./07-UX-Standards.md#ux-decisions-and-rationale) |
| DEC-0042 | Release 1 uses one dark broadcast-first theme and repository-owned semantic tokens. | [RV2-FND-07](./07-UX-Standards.md#ux-decisions-and-rationale) |
| DEC-0043 | Release 1 targets WCAG 2.2 Level AA. | [RV2-FND-07](./07-UX-Standards.md#ux-decisions-and-rationale) |
| DEC-0044 | Retroverse uses one `pnpm` workspace repository with bounded packages. | [RV2-FND-08](./08-Development-Manual.md#decision-records) |
| DEC-0045 | `main` is protected and releasable; production changes use reviewed short-lived branches. | [RV2-FND-08](./08-Development-Manual.md#decision-records) |
| DEC-0046 | Verification is layered and selected by changed risk and boundary. | [RV2-FND-08](./08-Development-Manual.md#decision-records) |
| DEC-0047 | The primary AI engineering environment is local-first Codex in the Retroverse workspace. | [RV2-FND-09](./09-AI-Operations.md#decision-records) |
| DEC-0048 | Reusable AI capabilities use the smallest fitting extension, beginning with narrow repository skills. | [RV2-FND-09](./09-AI-Operations.md#decision-records) |
| DEC-0049 | AI output remains advisory until supported by independent evidence and required human control. | [RV2-FND-09](./09-AI-Operations.md#decision-records) |
| DEC-0050 | Retroverse maintains a small, versioned repository skill library under `.agents/skills`; only the phase-required minimum must be Active before its associated implementation or release gate. | [RV2-FND-10](./10-Skill-Library.md#decision-records) |
| DEC-0051 | Release 1 bootstraps on Node.js 24 LTS, `pnpm` 10, and PostgreSQL 18 with exact repository pins; compatible supported-major upgrades use isolated engineering review unless a Foundation contract changes. | [RV2-FND-11](./11-Build-Specification.md#decision-records) |
| DEC-0052 | Web and worker processes are promoted from one immutable release artifact. | [RV2-FND-11](./11-Build-Specification.md#decision-records) |
| DEC-0053 | Construction and CI use ordered policy, correctness, browser, security, and recovery evidence gates. | [RV2-FND-11](./11-Build-Specification.md#decision-records) |
| DEC-0054 | An agent explicitly designated as Chief Product Architect or Foundation decision authority may make and record the simplest reasonably inferable decision; ordinary implementation agents have no such authority, and materially divergent product directions require escalation. | [RV2-FND-01 § Article VIII](./01-Constitution.md#article-viii--artificial-intelligence) |

## Decision Record Contract

Each decision has exactly one canonical register row containing its ID, title, status, date, authority, affected documents, and decision statement. A decision that supersedes or is superseded by another decision records that relationship in the canonical statement or an adjacent relationship column. Supporting context, rationale, and consequences may live in the affected source document, but those sections must cite the DEC and must not restate a materially different decision.

New decisions use the following minimum fields: `Decision ID`, `Title`, `Status`, `Decision Date`, `Decision Authority`, `Related Open Decision`, `Affected Documents`, `Supersedes`, `Superseded By`, and one precise canonical `Decision Statement`.

## Cross-References

### Outbound References

| Target | Relationship | Source Location | Notes |
|---|---|---|---|
| [RV2-FND-00](./00-Vision.md) | Vision source | DEC-0001–0003, DEC-0005–0007, DEC-0010–0018 | Records approved Vision direction. |
| [RV2-FND-01](./01-Constitution.md) | Normative governance | All decision records; DEC-0054 | Converts approved decisions into binding constraints and defines role-bound decision authority. |
| [RV2-FND-03](./03-Glossary.md) | Controlled terms | DEC-0003–0009, DEC-0019–0035 | Maintains approved entity and product definitions. |
| [RV2-FND-04](./04-Product-Specification.md) | Product decisions | DEC-0019–0030; OD-0001–0010 | Defines Release 1 behavior and resolves the original product questions. |
| [RV2-FND-05](./05-Data-Model.md) | Data decisions | DEC-0031–0035; OD-0011–0012 | Defines entity identities, persistence, time, and revision rules. |
| [RV2-FND-06](./06-Architecture.md) | Architecture decisions | DEC-0036–0040 | Defines runtime architecture and interfaces. |
| [RV2-FND-07](./07-UX-Standards.md) | UX decisions | DEC-0041–0043 | Defines Channel Zero presentation and accessibility baseline. |
| [RV2-FND-08](./08-Development-Manual.md) | Engineering decisions | DEC-0044–0046 | Defines repository workflow and verification. |
| [RV2-FND-09](./09-AI-Operations.md) | AI operations decisions | DEC-0047–0049 | Defines the Codex environment and AI evidence model. |
| [RV2-FND-10](./10-Skill-Library.md) | Skill decision | DEC-0050 | Defines repository skill governance. |
| [RV2-FND-11](./11-Build-Specification.md) | Build decisions | DEC-0051–0053 | Defines the pinned toolchain, artifact, and gate model. |
| [RV2-FND-12](./12-Acceptance-Criteria.md) | Acceptance resolution | OD-0010 | Defines the measurable useful-release outcome and release evidence. |

### Inbound References

| Source | Relationship | Target Location | Notes |
|---|---|---|---|
| [RV2-FND-INDEX](./README.md) | Document registration | Entire document | Registers this document as RV2-FND-02. |
| [RV2-FND-00](./00-Vision.md) | Decision traceability | Approved Decision Records | Requires approved Vision decisions to be recorded here. |
| [RV2-FND-01](./01-Constitution.md) | Decision integrity | Open Decision Register; Approved Decision Register | Requires missing and approved decisions to be controlled here. |
| [RV2-FND-03](./03-Glossary.md) | Definition traceability | Open Decision Register; Approved Decision Records | Links controlled definitions and missing-definition findings to decisions. |
| [RV2-FND-04–12](./04-Product-Specification.md) | Supporting decision rationale | Incorporated Decision Rationale | Source documents provide the rationale and consequences for DEC-0019–0053; RV2-FND-01 provides DEC-0054. |

## Consistency Review

| Finding ID | Type | Location | Description | Status | Resolution Reference |
|---|---|---|---|---|---|

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
| 0.3.0 | 2026-07-13 | Draft | Recorded DEC-0054 to reconcile role-bound Chief Product Architect authority with ordinary AI implementation constraints. | Engineering Program Manager |
| 0.2.0 | 2026-07-13 | Draft | Resolved OD-0001–0012 and registered and incorporated DEC-0019–0053 from the completed Foundation drafts. | Engineering Program Manager |
| 0.1.0 | 2026-07-13 | Draft | Recorded the approved Foundation decisions and the Open Decisions blocking complete product specification. | Engineering Program Manager |
| 0.0.0 | 2026-07-13 | Framework | Created decision-management framework. No product or architectural decisions added. | Engineering Program Manager |
