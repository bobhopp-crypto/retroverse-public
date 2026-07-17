---
document_id: RV2-FND-01
title: Retroverse Constitution
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

# Retroverse Constitution

[Foundation Index](./README.md) · [Previous: RV2-FND-00](./00-Vision.md) · [Next: RV2-FND-02](./02-Decision-Log.md)

## Document Control

| Field | Value |
|---|---|
| Document ID | RV2-FND-01 |
| Version | 0.2.0 |
| Document Status | Draft |
| Review Status | Not Started |
| Approval Status | Not Submitted |
| Content Authority | Chief Product Architect |
| Document Maintainer | Engineering Program Manager |

## Table of Contents

- [Purpose](#purpose)
- [Authority](#authority)
- [Normative Language](#normative-language)
- [Article I — Mission and Product Identity](#article-i--mission-and-product-identity)
- [Article II — Channel Zero](#article-ii--channel-zero)
- [Article III — Core Layers](#article-iii--core-layers)
- [Article IV — Presentation Model](#article-iv--presentation-model)
- [Article V — Entity Identification](#article-v--entity-identification)
- [Article VI — Data and Source-of-Truth Governance](#article-vi--data-and-source-of-truth-governance)
- [Article VII — Human Control and Automation](#article-vii--human-control-and-automation)
- [Article VIII — Artificial Intelligence](#article-viii--artificial-intelligence)
- [Article IX — Collection Stewardship](#article-ix--collection-stewardship)
- [Article X — Audience Exploration](#article-x--audience-exploration)
- [Article XI — Simplicity and Incremental Delivery](#article-xi--simplicity-and-incremental-delivery)
- [Article XII — Existing Implementations](#article-xii--existing-implementations)
- [Article XIII — Decision Integrity](#article-xiii--decision-integrity)
- [Article XIV — Compliance](#article-xiv--compliance)
- [Article XV — Amendments](#article-xv--amendments)
- [Cross-References](#cross-references)
- [Open Decisions](#open-decisions)
- [Consistency Review](#consistency-review)
- [Review Record](#review-record)
- [Approval Record](#approval-record)
- [Amendment History](#amendment-history)
- [Version History](#version-history)

## Purpose

This Constitution establishes the binding principles under which Retroverse V2 is specified, designed, implemented, operated, reviewed, and amended.

Its purpose is to keep product intent stable across engineering teams, AI implementation agents, operational tooling, and future maintainers. It prevents implementation convenience, automation, or undocumented historical behavior from redefining the product.

## Authority

This Constitution derives its content from the approved Foundation direction supplied by the Chief Product Architect.

This Constitution becomes binding only when its approval metadata and Approval Record identify the same approved version. Every downstream Foundation document, implementation plan, code change, automation, test, and operational procedure must comply with that approved version.

Document numbering does not establish conflict precedence. If two approved Foundation statements conflict and no approved precedence rule resolves them, the conflict must be recorded and referred to the Chief Product Architect. No engineer, implementation agent, reviewer, or maintainer may resolve such a conflict by assumption.

## Normative Language

The terms **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative:

- **MUST**, **MUST NOT**, and **REQUIRED** express binding obligations.
- **SHOULD** and **SHOULD NOT** express strong expectations that require documented justification to depart from.
- **MAY** expresses an allowed but optional choice.

Normative language constrains implementation only where product or architectural meaning has already been approved. It may not be used to fill an unresolved decision.

## Article I — Mission and Product Identity

1. Retroverse MUST be defined and maintained as a personal broadcast network.
2. Retroverse MUST transform a curated music collection into engaging historical experiences.
3. Retroverse MUST serve live and remote audiences.
4. Product behavior MUST preserve the combined personal, broadcast, historical, and experiential identity stated in [RV2-FND-00](./00-Vision.md).
5. A proposal that changes this identity MUST be treated as a Foundation amendment, not an implementation detail.

## Article II — Channel Zero

1. The public homepage MUST be Channel Zero.
2. Channel Zero MUST be a continuously running broadcast channel.
3. Channel Zero MUST NOT be implemented or presented as a traditional homepage with broadcast material treated as secondary content.
4. Detailed broadcast behavior MUST be defined in the Product Specification, Data Model, Architecture, Build Specification, and Acceptance Criteria before implementation.
5. Missing broadcast semantics MUST be decided by the Chief Product Architect when one simple Foundation-consistent direction is reasonably inferable. A materially divergent unresolved direction MUST be recorded as an Open Decision and MUST NOT be inferred from the existing application.

## Article III — Core Layers

1. Retroverse MUST be described through four core layers:
   - Collection
   - Production
   - Broadcast
   - Audience
2. The Architecture MUST define the responsibility, boundary, ownership, and interfaces of each layer.
3. No implementation component may be assigned to a layer solely by interpreting the layer's name.
4. A change to the four-layer model requires an approved Foundation amendment.

## Article IV — Presentation Model

1. An Experience MUST be treated as the smallest audience-visible presentation.
2. A Program MUST be treated as a sequence of Experiences broadcast on Channel Zero.
3. A Playlist MUST be treated as an organizational collection.
4. A Playlist MUST NOT itself be broadcast.
5. Experience, Program, and Playlist MUST remain distinct concepts in product behavior, data modeling, APIs, interfaces, implementation, and tests.
6. A convenience representation MUST NOT collapse these concepts into a single entity or use their names interchangeably.

## Article V — Entity Identification

1. Foundation entities MUST use their approved Retroverse identifier prefixes.
2. Identifier prefixes MUST have one controlled meaning across documentation, data, interfaces, code, and operations.
3. The approved core identifier registry is maintained in [RV2-FND-02](./02-Decision-Log.md) and [RV2-FND-03](./03-Glossary.md).
4. An identifier prefix MUST NOT be reassigned to another concept.
5. The representation, generation, storage, and lifecycle rules for identifiers MUST be defined in the Data Model before implementation.
6. A Pass Credential (`RVSN`) MUST be treated as an opaque identifier. Its internal representation MUST NOT be used to infer product meaning.

## Article VI — Data and Source-of-Truth Governance

1. Retroverse MUST maintain one source of truth for each authoritative fact.
2. Every feature MUST have a clearly defined data model before implementation begins.
3. The Data Model MUST define entities, identifiers, relationships, ownership, lifecycle, and integrity rules needed by approved product behavior.
4. Duplicate authoritative representations MUST NOT be introduced for convenience.
5. Derived, cached, indexed, denormalized, exported, or presentation-specific data MUST remain traceable to its authoritative source.
6. If ownership or authority has materially different plausible resolutions, the ambiguity MUST be recorded as an Open Decision.

## Article VII — Human Control and Automation

1. Manual control MUST always override automation.
2. Automation MAY assist curation, production, broadcast, analysis, maintenance, or operation only within approved product and architectural boundaries.
3. Automation MUST NOT eliminate the ability to apply the approved manual override.
4. Automated decisions and actions MUST be observable and attributable at the level required by the approved operational design.
5. The scope, timing, persistence, and recovery behavior of manual control MUST be explicitly specified before the associated automation is implemented.

## Article VIII — Artificial Intelligence

1. AI MAY assist with research, drafting, analysis, implementation, testing, review, or operation when explicitly authorized.
2. An ordinary AI implementation, review, or operations agent MUST NOT define product behavior or resolve architectural ambiguity.
3. Product and architecture decisions belong to the Chief Product Architect or a formally designated decision authority.
4. An agent explicitly assigned to act as the Chief Product Architect or Foundation decision authority for Foundation authoring MAY make and record the simplest decision reasonably inferable from approved direction.
5. A designated decision authority MUST stop only when two or more fundamentally different directions would materially change the product and cannot be reconciled from the Foundation.
6. An agent without decision authority MUST NOT convert an absent decision into an assumed requirement; it MUST reference an existing decision or record an Open Decision when material work is blocked.
7. AI-generated implementation work remains subordinate to the Foundation and subject to the same review and acceptance requirements as human-generated work.
8. AI output does not become authoritative merely because it exists in code, tests, prompts, configuration, or generated documentation; Foundation authority requires the recorded decision role and process.

## Article IX — Collection Stewardship

1. The collection MUST be treated as continuously improving over time.
2. Product and engineering decisions SHOULD support correction, enrichment, and expansion of the collection without weakening its authority.
3. The collection MUST remain curated; growth alone is not a substitute for curation.
4. Detailed curation roles, workflows, provenance, quality rules, and approval behavior require explicit product and data decisions.

## Article X — Audience Exploration

1. Every audience-visible page SHOULD encourage exploration.
2. Exploration MUST remain connected to the approved product identity and the authoritative collection.
3. The Product Specification and UX Standards MUST define the allowed exploration behavior before it is implemented.
4. Engineering convenience MUST NOT determine audience navigation or discovery behavior.

## Article XI — Simplicity and Incremental Delivery

1. Simplicity MUST be preferred over unnecessary complexity.
2. The first implementation target MUST be the smallest useful release.
3. “Smallest” MUST NOT be interpreted as permission to omit behavior required for the release to be coherent and useful.
4. “Useful” MUST be defined by approved product scope and Acceptance Criteria, not by implementation effort alone.
5. Speculative infrastructure and features MUST NOT be built without an approved need.

## Article XII — Existing Implementations

1. The existing Retroverse application MUST be treated as research, not architecture.
2. Existing code, data structures, routes, interfaces, workflows, and behavior MAY be inspected as evidence.
3. Existing implementation details MUST NOT be carried forward unless an approved Foundation document adopts them.
4. Compatibility with the existing application MUST NOT be assumed to be a requirement.
5. Disagreement between existing behavior and the Foundation MUST be resolved in favor of the approved Foundation unless the Chief Product Architect approves an amendment.

## Article XIII — Decision Integrity

1. Product decisions belong to the Chief Product Architect or a formally designated decision authority.
2. Architectural ambiguity MUST be returned to or resolved by the Chief Product Architect or formally designated decision authority; an engineer, implementation agent, tool, test, or code path has no independent decision authority.
3. A missing detail that one reasonable architect can confidently infer from approved direction SHOULD receive the simplest consistent decision and be recorded. Only materially divergent unresolved directions MUST be recorded in [RV2-FND-02](./02-Decision-Log.md) as Open Decisions.
4. An Open Decision MUST identify the blocked question, source location, affected documents, and decision authority.
5. A recorded decision MUST identify its authority, status, affected documents, and relationship to any decision it supersedes.
6. Code and tests MAY verify approved decisions but MUST NOT create them.

## Article XIV — Compliance

Before production implementation begins, the applicable work MUST have:

1. approved product behavior;
2. a defined data model;
3. an architecture that assigns responsibility without unresolved ambiguity;
4. an implementation procedure consistent with the Development Manual;
5. AI and automation boundaries consistent with AI Operations;
6. a build specification;
7. measurable acceptance criteria.

If any required input is missing, the affected implementation MUST remain blocked. Work that does not depend on the missing decision MAY continue only when it cannot prejudice or implicitly resolve that decision.

Constitutional compliance MUST be reviewed during planning, implementation review, and acceptance.

## Article XV — Amendments

1. This Constitution may be changed only through an explicit amendment approved by the Chief Product Architect or a formally designated authority.
2. Every proposed amendment MUST state the affected clauses, reason, consequences, and affected Foundation documents.
3. Every approved amendment MUST receive an amendment identifier and version change.
4. The Decision Log, Foundation Index, cross-references, and affected documents MUST be updated as part of the amendment.
5. An amendment MUST NOT be implemented before its approval is recorded.
6. Editorial corrections that do not alter meaning MAY use a patch version but still require version-history and amendment records after the Constitution is approved.

## Cross-References

### Outbound References

| Target | Relationship | Source Location | Notes |
|---|---|---|---|
| [RV2-FND-00](./00-Vision.md) | Foundational direction | Articles I–XII | This Constitution makes the approved Vision principles normative. |
| [RV2-FND-02](./02-Decision-Log.md) | Decision governance | Articles V, XIII, XV | Records approved decisions, Open Decisions, and amendments. |
| [RV2-FND-03](./03-Glossary.md) | Controlled language | Entire document | Defines the normative concepts used by this Constitution. |
| [RV2-FND-04](./04-Product-Specification.md) | Product compliance | Articles I, II, IV, IX, X, XI | Must define behavior within these constraints. |
| [RV2-FND-05](./05-Data-Model.md) | Data compliance | Articles IV, V, VI, IX | Must establish entity and source-of-truth rules. |
| [RV2-FND-06](./06-Architecture.md) | Architecture compliance | Articles II, III, VI, VII, XII, XIII | Must assign responsibility without inventing product behavior. |
| [RV2-FND-08](./08-Development-Manual.md) | Engineering compliance | Articles XI–XIV | Must operationalize these constraints for development. |
| [RV2-FND-09](./09-AI-Operations.md) | AI compliance | Articles VII, VIII, XIII | Must govern AI and automation within these boundaries. |
| [RV2-FND-11](./11-Build-Specification.md) | Build compliance | Article XIV | Must define the authorized implementation process. |
| [RV2-FND-12](./12-Acceptance-Criteria.md) | Verification | Article XIV | Must make approved obligations testable. |

### Inbound References

| Source | Relationship | Target Location | Notes |
|---|---|---|---|
| [RV2-FND-INDEX](./README.md) | Document registration | Entire document | Registers this document as RV2-FND-01. |
| [RV2-FND-00](./00-Vision.md) | Governing principles | Entire document | Identifies this Constitution as the normative expression of the Vision principles. |
| [RV2-FND-02](./02-Decision-Log.md) | Decision traceability | Articles I–XIII | Records approved decisions and the disposition of Foundation questions. |
| [RV2-FND-03](./03-Glossary.md) | Terminology control | Entire document | Controls and reconciles definitions used by this Constitution. |

## Open Decisions

| Open Decision ID | Question | Source Location | Status | Decision Log Link |
|---|---|---|---|---|

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
| 0.2.0 | 2026-07-13 | Draft | Clarified role-bound architect authority, reasonable inference, and the threshold for an Open Decision under DEC-0054. | Chief Product Architect |
| 0.1.0 | 2026-07-13 | Draft | Added the architect-directed Constitution based on approved Foundation decisions. | Engineering Program Manager |
| 0.0.0 | 2026-07-13 | Framework | Created document framework. No architect-authored content added. | Engineering Program Manager |
