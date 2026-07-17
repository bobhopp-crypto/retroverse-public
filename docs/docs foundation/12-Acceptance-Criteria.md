---
document_id: RV2-FND-12
title: Retroverse Acceptance Criteria
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

# Retroverse Acceptance Criteria

[Foundation Index](./README.md) · [Previous: RV2-FND-11](./11-Build-Specification.md)

## Document Control

| Field | Value |
|---|---|
| Document ID | RV2-FND-12 |
| Version | 0.1.0 |
| Document Status | Draft |
| Review Status | Not Started |
| Approval Status | Not Submitted |
| Content Authority | Chief Product Architect |
| Document Maintainer | Engineering Program Manager |

## Table of Contents

- [Purpose](#purpose)
- [Acceptance Model](#acceptance-model)
- [Evidence Requirements](#evidence-requirements)
- [Acceptance Environment](#acceptance-environment)
- [Release Outcome](#release-outcome)
- [Foundation and Build Integrity](#foundation-and-build-integrity)
- [Data and Collection](#data-and-collection)
- [Production](#production)
- [Broadcast](#broadcast)
- [Audience and Exploration](#audience-and-exploration)
- [Operator, Security, and Privacy](#operator-security-and-privacy)
- [UX and Accessibility](#ux-and-accessibility)
- [Performance, Reliability, and Operations](#performance-reliability-and-operations)
- [Engineering and AI Operations](#engineering-and-ai-operations)
- [Exclusions](#exclusions)
- [Defect Policy](#defect-policy)
- [Go or No-Go Decision](#go-or-no-go-decision)
- [Acceptance Record](#acceptance-record)
- [Cross-References](#cross-references)
- [Open Decisions](#open-decisions)
- [Consistency Review](#consistency-review)
- [Review Record](#review-record)
- [Approval Record](#approval-record)
- [Amendment History](#amendment-history)
- [Version History](#version-history)

## Purpose

This document defines the objective evidence required to accept Retroverse V2 Release 1. It converts the Foundation into testable release gates without expanding the product scope.

Acceptance applies to one immutable release candidate in a named environment. A prior pass does not transfer to an artifact or configuration change unless the affected evidence is demonstrably unchanged.

## Acceptance Model

### Priority

| Priority | Meaning | Release Rule |
|---|---|---|
| P0 | Core mission, data integrity, access control, broadcast continuity, or recovery gate | Must pass; no waiver for initial release |
| P1 | Required Release 1 behavior or quality standard | Must pass; a time-bounded exception requires Chief Product Architect and release-owner approval and may not weaken a P0 |
| P2 | Valuable evidence that does not establish a Release 1 requirement | Does not block unless separately promoted |

P0 and P1 criteria are release gates. P2 criteria retain useful engineering evidence but do not block the smallest useful release. An exception records criterion, impact, compensating control, owner, expiry, and approvers. Exceptions are not permitted for data leakage, unapproved media, operator authorization, invalid canonical broadcast state, backup restore, or the required fallback.

### Result

Each criterion receives one result:

- **Pass:** required evidence exists and the stated condition is met;
- **Fail:** evidence demonstrates the condition is not met;
- **Blocked:** the condition could not be evaluated because a prerequisite or environment is unavailable;
- **Not Applicable:** permitted only when the criterion states an applicability condition and the release does not meet it.

Blocked is not Pass. A criterion cannot be marked Not Applicable solely because the feature is incomplete.

### Test Method

| Method | Meaning |
|---|---|
| Automated | Deterministic command, test, scan, or query with retained result |
| Inspection | Human or agent review of source, configuration, UI, document, or artifact |
| Demonstration | Recorded execution of an observable workflow |
| Exercise | Controlled operational failure, recovery, deployment, or restore rehearsal |
| Measurement | Instrumented performance, availability, freshness, or propagation observation |

## Evidence Requirements

Every acceptance result shall identify:

- criterion ID and Foundation source;
- immutable release and configuration identifiers;
- environment and execution time in UTC;
- method, tool, and relevant version;
- input fixture or precondition;
- expected and actual result;
- raw artifact location or durable link;
- evaluator and reviewer;
- related defect, exception, or rerun when applicable.

Screenshots alone do not prove state mutation, authorization, accessibility, timing, or data integrity. AI narrative alone is not evidence. Automated results shall include exit status; manual evidence shall state exactly what was inspected.

### Evidence Bundle

The release evidence bundle contains:

```text
release-evidence/
├── index.md
├── provenance/
├── ci/
├── database/
├── api/
├── browser/
├── accessibility/
├── performance/
├── security/
├── reliability/
├── operations/
└── exceptions/
```

The index maps every acceptance ID to one result and its artifacts. Evidence may be stored in approved CI, observability, security, and deployment systems rather than copied, provided the index contains durable access-controlled links and retention is sufficient for the release record.

## Acceptance Environment

Acceptance uses the production artifact in a production-like staging environment with:

- the same Node.js and PostgreSQL majors as production;
- the complete committed migration chain;
- production-equivalent web, worker, database, object, CDN, OIDC, secret, and observability topology;
- the exact versioned Acceptance Profile and its declared scale data;
- TLS and production security settings;
- controlled operator and unauthorized identities;
- the exact desktop, mobile, venue, accessibility, network, region, sample, and duration values required by the Acceptance Profile;
- no connection to production data or production mutation targets.

Provider contract checks may use approved test endpoints. A provider limitation observed only through mocks cannot prove production compatibility.

## Release Outcome

| ID | Pri. | Source | Acceptance Condition | Method |
|---|---:|---|---|---|
| AC-OUT-001 | P0 | PS Release 1 Scope | From an empty supported environment, an Operator imports or curates collection data, publishes all three Experience types, publishes a Program, configures fallback, activates the Program, and an anonymous client views and explores the resulting broadcast without manual database edits. | Demonstration + automated journey |
| AC-OUT-002 | P0 | PS-BRD-001–008; PS-LIVE-001 | The Acceptance Profile two-hour soak completes Program boundaries and loops without dead interval, unpublished-data exposure, persistent divergent Experience beyond one second after a boundary, or unrecovered client drift above 250 milliseconds. | Measurement + browser automation |
| AC-OUT-003 | P0 | PS-BRD-201–209 | During the soak, an Operator successfully performs activate, activate-at, skip, replay, and fallback; every client converges to the canonical result within ten seconds and every action is audited. | Demonstration + database inspection |
| AC-OUT-004 | P1 | Mission; PS-AUD-006; PS-EXPLORE-001–012 | From Channel Zero, an anonymous user can reach a current Experience entity, its primary music or historical entities, Explore, search, and return to the live channel at its current position. | Browser journey |
| AC-OUT-005 | P0 | PS-BRD-101–107 | Loss or invalidation of the active Program invokes a Broadcast-Ready fallback without exposing draft state; invalid active and fallback state produces the branded unavailable state and alert. | Controlled exercise |

## Foundation and Build Integrity

| ID | Pri. | Source | Acceptance Condition | Method |
|---|---:|---|---|---|
| AC-FND-001 | P0 | RV2-FND-00–12 | The release commit contains the complete numbered Foundation document set; document IDs and filenames are unique and the index versions and statuses match document metadata. | Automated document audit |
| AC-FND-002 | P1 | Foundation cross-reference rules | Every relative Foundation link and heading anchor resolves; decision, requirement, entity-prefix, glossary, and acceptance identifiers contain no duplicates. | Automated link and identifier check |
| AC-FND-003 | P0 | Constitution; Development Manual | No implemented audience behavior, domain entity, lifecycle, or runtime component contradicts an approved Foundation requirement. | Traceability review |
| AC-FND-004 | P1 | RV2-FND-02 | Every architecture or product decision introduced by the release is recorded in the Decision Log or an approved amendment; no Open Decision is marked unresolved for Release 1 scope. | Inspection |
| AC-BLD-001 | P0 | Build Specification technology baseline | A clean supported machine uses the pinned Node and `pnpm` versions and `pnpm install --frozen-lockfile` completes without changing tracked files. | Automated clean-checkout build |
| AC-BLD-002 | P0 | Build Specification canonical commands | `pnpm verify` and `pnpm verify:release` return zero for the release commit; the evidence retains each child gate result. | Automated |
| AC-BLD-003 | P0 | DEC-0052 | Web and worker artifacts report the same release identifier and are traceable to the same source commit and lockfile digest. | Artifact inspection |
| AC-BLD-004 | P1 | Repository Organization | Package-boundary checks prove `domain` imports no Next.js, React, browser, Drizzle, or provider SDK and production packages import no testing package. | Automated dependency check |
| AC-BLD-005 | P0 | Database Build | A new PostgreSQL 18 database applies every committed migration, seeds deterministically, and passes `db:check` with no drift. | Automated integration |
| AC-BLD-006 | P0 | Database Development | For the first V2 release, the empty V2 baseline upgrades through the complete candidate migration chain; thereafter, the previous releasable schema upgrades to the candidate without data loss or invariant violation. | Automated migration exercise |
| AC-BLD-007 | P1 | CI Security | Release provenance includes immutable action versions, source commit, lock digest, artifact digest, and software bill of materials. | Inspection |
| AC-BLD-008 | P0 | Release Candidate | The tested artifact digest is identical to the artifact selected for deployment; any source, dependency, migration, or artifact change creates a new candidate. | Deployment record inspection |
| AC-BLD-009 | P1 | Repository Bootstrap | If public source distribution is part of the candidate, an owner-approved compatible root license exists; otherwise the package is explicitly private/`UNLICENSED` and this criterion is Not Applicable to public licensing. | Repository and release inspection |

## Data and Collection

| ID | Pri. | Source | Acceptance Condition | Method |
|---|---:|---|---|---|
| AC-DAT-001 | P0 | PS-COL-001–003; DEC-0031 | Each core entity uses its reserved prefix plus valid canonical ID; slugs and external IDs can change without changing identity, and wrong-entity IDs are rejected at boundaries. | Automated unit + integration |
| AC-DAT-002 | P0 | DEC-0032; AR-INV-001 | All canonical Release 1 state is reconstructable from PostgreSQL; caches, search documents, manifests, and CDN content can be discarded and rebuilt without identity loss. | Exercise + inspection |
| AC-DAT-003 | P1 | DEC-0033; PS-COL-013 | ISO Week, Gregorian Month and Year, fixed Decade, and curated overlapping Era fixtures produce explicit containment, overlap, and curated-context relationships without false Week→Month or Era hierarchy, including year-boundary Week cases. | Automated unit + integration |
| AC-DAT-004 | P0 | PS-COL-009–012 | Publication rejects a Track with no Artist and a Chart issue with duplicate or nonpositive ranks; a duplicate Track requires explicit override, note, Operator, and Audit Event; valid entries retain exact ranks. | Automated integration |
| AC-DAT-005 | P1 | PS-COL-010 | A Track without an Album can be curated and published when all other requirements pass. | Automated integration |
| AC-DAT-006 | P0 | PS-COL-014–015, 019; PS-LIF-006–007 | Hard deletion fails for a referenced or published record; archive prevents new selection while visible published history remains resolvable, and old slugs redirect only to a currently visible canonical target. | Automated integration + browser |
| AC-DAT-007 | P0 | PS-COL-005–008, 016 | CSV and JSON imports stage before commit, enforce unique job row numbers, preserve ordered source/field claims with at most one accepted value per field, reject invalid rows atomically, and attribute writes to the import job. | Automated integration |
| AC-DAT-008 | P1 | PS-COL-006 | A manual curator value remains authoritative after reimport while the superseded imported value and source remain inspectable. | Automated integration + operator inspection |
| AC-DAT-009 | P0 | Build operational limits | A 25 MiB/50,000-row import at the boundary is handled within the job contract; a request exceeding either boundary is rejected before canonical writes with a stable error. | Automated boundary test |
| AC-DAT-010 | P1 | Data Model duplicate workflow | A duplicate candidate cannot silently create or merge a canonical entity; the Operator must accept or reject the staged resolution and an audit/provenance record remains. | Integration + demonstration |
| AC-DAT-011 | P0 | PS-MED-001–013 | Media state supports pending, approved, blocked, unavailable, expiry, revocation, approval basis, capability evidence, and manual audit; blocked, expired, or unapproved media never enters a public response. | Automated integration + API inspection |
| AC-DAT-012 | P1 | PS-MED-007–008 | An historically referenced unavailable audio/video source renders the visual fallback while preserving identity and canonical Experience duration. | Browser + integration |
| AC-DAT-013 | P0 | DM-INV-001–020 | Every Data Model invariant has a direct automated test at its enforcement boundary and all tests pass against the candidate PostgreSQL major. | Test inventory + automated |
| AC-DAT-014 | P0 | Search projection model; PS-AUD-107 | Deleting and rebuilding Search Documents recreates the same visible set; a deliberately stale document cannot expose a draft or unreferenced archived target because every response joins canonical visibility. | Exercise + query comparison |
| AC-DAT-015 | P1 | PS-COL-017–018 | Fixtures for the same recording on two Albums retain one Track; different mix/edit/performance fixtures use different Tracks; Album configuration and variant cases follow the documented identity tests. | Domain fixture suite |
| AC-DAT-016 | P0 | DM-INV-016 | External IDs, provenance, temporal relations, Experience links, aliases, redirects, and search targets enforce exactly-one real foreign-key target; wrong-type and deleted targets fail at the database boundary. | Constraint integration |
| AC-DAT-017 | P0 | DM-INV-019 | Killing a process after canonical commit cannot lose required derived work: the Outbox Event remains, a replacement worker leases one deduplicated job, and replay produces no duplicate canonical mutation. | Failure injection + database inspection |
| AC-DAT-018 | P1 | PS-COL-019 | Slug change creates one direct redirect; merge archives the source, retains aliases/provenance, redirects directly to the visible target, prevents loops/chains, and records one Audit Event. | Integration + browser |
| AC-DAT-019 | P0 | PS-EXP-302; DM-INV-017 | Time Capsule publication rejects every Track lacking an explicit relation to the selected period and accepts release, chart-coverage, or curated-context relations with provenance. | Automated integration |
| AC-DAT-020 | P0 | PS-MED-010; DM-INV-018 | Experience media must be an approved audio/video Track Media association for the primary/featured selected Track; mismatched Track, image-kind media, unseekable media, or unsupported playback fails publication. | Constraint + integration |

## Production

| ID | Pri. | Source | Acceptance Condition | Method |
|---|---:|---|---|---|
| AC-PRD-001 | P0 | PS-EXP-001–012 | An Experience draft requires ID, title, supported type, 15–900 second duration, exactly one valid image or type-layout primary visual, explicit public relationship, and publishable canonical snapshot/hash; invalid drafts cannot publish. | Automated integration |
| AC-PRD-002 | P0 | PS-EXP-002, 011–012; PS-LIF-003–005 | A published Experience revision, child row, snapshot, or hash cannot be updated or deleted; later Artist/Track/Album edits do not change the historical public payload, links, ranks, or credits. | Automated integration + snapshot comparison |
| AC-PRD-003 | P1 | PS-EXP-006–008; PS-MED-010 | A valid type-layout Experience with no playable media runs for its full interval; approved media covers the interval and joins the current offset within 250 milliseconds. | Integration + browser |
| AC-PRD-004 | P0 | PS-EXP-101–106 | Track Spotlight publication requires exactly one primary Track with an Artist; any media is associated with that Track; public output identifies Track and primary Artist and links to the Track. | Automated + browser |
| AC-PRD-005 | P0 | PS-EXP-201–205 | Chart Snapshot publication requires one Chart issue and Week; selected entries preserve issue order and exact ranks and link to Chart and Week. | Automated + browser |
| AC-PRD-006 | P0 | PS-EXP-301–304; PS-COL-013 | Time Capsule publication requires exactly one enforced period reference and one or more ordered Tracks with explicit period relations; any featured media Track is included; public output links to the period and Tracks. | Automated + browser |
| AC-PRD-007 | P0 | PS-PRG-001–006 | Program publication requires 1–200 ordered published Experience revisions, derives exact offsets and total duration, persists immutable title, description, item identities, Experience content hashes, offsets, duration, and canonical hash, rejects Playlists, and enforces the 86,400-second maximum. | Automated integration |
| AC-PRD-008 | P0 | PS-PRG-005, 007; PS-LIF-003–005; PS-BRD-106–107 | A published Program revision is immutable; archiving its Program identity atomically preserves the active revision only when it remains Broadcast-Ready, otherwise activates the ready fallback, and prevents later reactivation of the archived Program. | Automated integration + broadcast exercise |
| AC-PRD-009 | P1 | PS-PRG-008; PS-OPS-107 | Previewing an Experience or Program draft does not publish it, add it to public search, or change Broadcast State. | Browser + database inspection |
| AC-PRD-010 | P0 | PS-PLY-001–005 | A Playlist accepts ordered Tracks, requires explicit duplicate confirmation, uses only active/archived state, and is absent from public APIs, pages, search, Programs, and manifest. | Automated + browser inspection |
| AC-PRD-011 | P0 | PS-LIF-001–008 | New authoring begins draft; failed publication is atomic; visibility follows lifecycle and explicit reference; reversible archive preserves integrity. | Automated state-transition suite |
| AC-PRD-012 | P1 | Product Specification authoring workflow | Operator validation identifies every blocking record and field before publication and confirmation names the object and resulting public impact. | Browser demonstration |
| AC-PRD-013 | P0 | DEC-0034 | Every published snapshot validates its versioned RFC 8785/SHA-256 hash; re-rendering every published Experience and Program after mutating referenced current Collection display fields produces byte-equivalent canonical public payloads, except that current safety policy may suppress revoked media delivery. | Snapshot regression exercise |

## Broadcast

| ID | Pri. | Source | Acceptance Condition | Method |
|---|---:|---|---|---|
| AC-BRD-001 | P0 | PS-BRD-001–003, 106–107; DM-INV-009–010 | Exactly one Broadcast State row references Broadcast-Ready active and fallback revisions, a UTC start instant, valid offset, and monotonically increasing manifest version. | Database constraint + integration |
| AC-BRD-002 | P0 | PS-BRD-306–307; Broadcast timeline formula | Boundary tests use PostgreSQL statement time and prove application-node clock skew cannot change canonical current/next selection; loops, future instants, leap days, and client correction remain deterministic. | Automated unit + integration property tests |
| AC-BRD-003 | P0 | PS-BRD-004–006 | Program end moves immediately to the first Experience; reload, reopen, and return from Explore rejoin the current canonical offset rather than starting locally. | Playwright |
| AC-BRD-004 | P0 | PS-BRD-007–008 | Mute, sound enable, fullscreen, tab suspension, and resume do not mutate Broadcast State; resume converges to the canonical position within the next manifest refresh. | Browser + database inspection |
| AC-BRD-005 | P0 | PS-BRD-301, 306 | Side-effect-free public manifest contains PostgreSQL server time, manifest version, active Program snapshot identity/revision/duration, current Experience snapshot/offset, next Experience, and fallback indicator without private fields. | API contract + database no-mutation test |
| AC-BRD-006 | P1 | PS-BRD-302–307; DEC-0038 | While visible, the client requests a manifest at least every five seconds, applies only current/newer canonical state, uses the defined midpoint/lowest-round-trip clock sample, discards correction samples above one-second round trip, corrects drift above 250 milliseconds, and opens no WebSocket or SSE connection. | Browser network trace |
| AC-BRD-007 | P0 | PS-BRD-201–202, 207–208 | Activate and activate-at evaluate Broadcast Readiness, lock and update Broadcast State atomically, produce one Audit Event, return the persisted canonical result, and handle concurrent stale commands as a conflict. | Integration concurrency test |
| AC-BRD-008 | P0 | PS-BRD-203, 207–208 | Skip sets the canonical timeline to the next Experience for all clients, including loop boundary, with atomic audit and no dead interval. | Integration + multi-client browser |
| AC-BRD-009 | P0 | PS-BRD-204, 207–208 | Replay resets the current Experience interval for all clients, with atomic audit and canonical console confirmation. | Integration + multi-client browser |
| AC-BRD-010 | P0 | PS-BRD-205–208 | Manual fallback activates the configured fallback revision from its start, is confirmed and audited, and is reflected by the operator console and clients. | Integration + browser |
| AC-BRD-011 | P0 | PS-BRD-206; UX operator standards | Every control requires an explicit confirmation naming the target Program or Experience; cancel performs no write or audit action. | Component + browser |
| AC-BRD-012 | P0 | PS-BRD-103–107 | A relevant mutation activates fallback in the same transaction; out-of-band invalid state is repaired by one compare-and-set worker command within five seconds with one Audit Event and alert; invalid fallback produces unavailable state without private data. | Failure injection exercise |
| AC-BRD-013 | P1 | PS-BRD-104; DEC-0039 | Provider timeout, blocked playback, or media error does not block manifest or timeline progression and displays the approved Experience visual fallback. | Failure injection + browser |
| AC-BRD-014 | P0 | PS-BRD-209 | Public routes, APIs, and clients expose no command capable of changing canonical Broadcast State; authenticated operator commands reject unauthenticated and non-allowlisted calls. | API authorization scan |
| AC-BRD-015 | P0 | Performance budgets | Each committed manual command reaches all controlled acceptance clients within ten seconds and p95 command persistence is no more than two seconds. | Measurement |
| AC-BRD-016 | P1 | UX Now and Next; PS-LIVE-001 | Now, Next, Program, elapsed state, and loop-boundary labels match canonical manifest state; after a boundary or resume, all clients converge to the same Experience within one second and offset error within 250 milliseconds. | Browser assertions + clock measurement |
| AC-BRD-017 | P0 | AR-INV-014 | Repeated anonymous manifest GETs, including concurrent invalid-state reads, perform no Broadcast State, audit, outbox, or job mutation. | Database diff + concurrency test |
| AC-BRD-018 | P0 | PS-BRD-106; TERM-0052 | Publication, fallback configuration, activation, operator status, deployment readiness, and reconciliation use one shared Broadcast Readiness implementation and return the same result for the same fixture. | Contract + dependency inspection |
| AC-BRD-019 | P0 | Command Idempotency | Retrying each broadcast command with the same key and request returns the stored canonical response with one state change and one Audit Event; a changed request under the same key returns conflict. | Integration concurrency test |

## Audience and Exploration

| ID | Pri. | Source | Acceptance Condition | Method |
|---|---:|---|---|---|
| AC-AUD-001 | P0 | PS-AUD-001–003 | Anonymous `GET /` renders the current Channel Zero Experience as the primary viewport with current Program, Now, and Next; no separate marketing landing page precedes it. | Browser + HTML inspection |
| AC-AUD-002 | P0 | PS-AUD-004–005; PS-MED-010 | When audible autoplay is denied, visual broadcast begins and a labeled sound action joins capable audio within 250 milliseconds of the current canonical offset without restart; incapable playback explains audio unavailability. | Browser policy + provider contract test |
| AC-AUD-003 | P0 | PS-AUD-007–008 | All public Release 1 journeys work without authentication and reveal no operator control, draft, internal note, source provenance, private media configuration, or session secret. | Browser + response scan |
| AC-AUD-004 | P1 | PS-AUD-101–107 | Visible pages exist for required collection, time, Experience, and Program entities; each request applies canonical current visibility and shows only approved fields plus an exploration or fallback path. | Route matrix automation |
| AC-AUD-005 | P0 | PS-EXPLORE-002–004; PS-AUD-107 | Search matches required entity types by title/name, identifies type/context, and canonical-visibility joins prevent stale documents from returning drafts or unreferenced archived records. | API + browser integration |
| AC-AUD-006 | P1 | PS-EXPLORE-005–011 | Track, Artist, Album, Chart, temporal, Experience, and Program pages expose the explicit relationships required by the Product Specification with correct order and ranks. | Browser route matrix |
| AC-AUD-007 | P1 | PS-EXPLORE-001, 012 | Explore contains entry points for Tracks, Artists, Albums, Charts, and Time; every public page has a direct Channel Zero route. | Browser crawl |
| AC-AUD-008 | P1 | PS-ERR-004–006 | Empty search, missing optional media, no eligible related content, and public not-found states provide useful paths without exposing internal identifiers or stack details. | Browser negative cases |
| AC-AUD-009 | P0 | PS-LIVE-001–003 | An Acceptance Profile venue browser and remote mobile browser derive the same state for the same PostgreSQL instant, converge within one second/250 milliseconds, and require neither operator session nor Event/Pass record. | Multi-viewport measurement |
| AC-AUD-010 | P1 | Public rendering architecture | Public entity and Explore pages expose meaningful server-rendered HTML, canonical URLs, unique document titles, and remain navigable when client-side routing enhancement fails. | HTML inspection + browser |
| AC-AUD-011 | P0 | PS-AUD-105–107; PS-COL-019 | An old slug redirects directly only while its canonical target is visible; archived published-reference dependencies remain visible; unreferenced archived identities return not found even with stale search/sitemap data or prior URLs. | Route matrix + stale-data injection |

## Operator, Security, and Privacy

| ID | Pri. | Source | Acceptance Condition | Method |
|---|---:|---|---|---|
| AC-SEC-001 | P0 | PS-OPS-001–006; DEC-0040 | Single-use bootstrap enrolls the first exact approved OIDC issuer/subject, PostgreSQL becomes authoritative, and valid allowlisted identity receives the Operator role; replayed, non-allowlisted, invalid, expired, and unauthenticated identities receive no operator data. | Protocol + integration tests |
| AC-SEC-002 | P0 | Architecture security | OIDC state, nonce, redirect allowlist, Authorization Code flow, PKCE, session rotation/version, expiry, explicit sign-out, allowlist revocation, secure cookies, and CSRF controls pass positive and negative tests. | Automated security integration |
| AC-SEC-003 | P0 | PS-OPS-101–107 | Operator navigation separates Collection, Production, Broadcast, Imports, and Audit; draft/persisted state, validation, public impact, canonical result, and preview behavior are visible as specified. | Browser demonstration |
| AC-SEC-004 | P0 | PS-BRD-207; PS-MED-004; PS-COL-016; DM-INV-014 | Each publication, media approval, archive, import commit, and broadcast command creates exactly one immutable typed Audit Event with operator, action, target, time, and safe before/after context. | Database + UI inspection |
| AC-SEC-005 | P0 | DEC-0035; PS-NFR-009 | Database, cookies, local storage, logs, analytics, and public responses contain no persistent audience account, cross-session audience identifier, behavioral profile, or Pass Credential in Release 1. | Data-flow inspection + scans |
| AC-SEC-006 | P0 | Security and Supply Chain | No secret is committed, built into client assets, logged, captured in test artifacts, or exposed by health/error responses. | Secret scan + dynamic inspection |
| AC-SEC-007 | P0 | Architecture trust boundaries | SQL injection, stored/reflected script injection, server-side request forgery, open redirect, path traversal, oversized request, malicious import formula/content, and cross-entity/object-key authorization-isolation cases fail safely. | Security test suite |
| AC-SEC-008 | P1 | Route-specific limits | Authentication, search, manifest, import, and operator mutation limits reject sustained excess with stable safe responses and do not create audience profiles. | Load + integration |
| AC-SEC-009 | P0 | Media eligibility | Blocked, expired, revoked, or unapproved Media Assets cannot be embedded through URL manipulation, shared cache, direct object URL, draft preview, or historical projection; revocable responses are `no-store`. | Negative API/browser/cache tests |
| AC-SEC-010 | P0 | CI release gate | Candidate has no unaccepted exploitable critical or high-severity dependency, static-analysis, or reviewed code-security finding. | Scan + human review |
| AC-SEC-011 | P1 | Security headers | Production-like responses use TLS, transport security, content security policy, frame restrictions, content-type protection, referrer policy, and permissions policy compatible with approved media adapters. | Automated header inspection |
| AC-SEC-012 | P0 | Least privilege | Web, worker, migration, and reporting database roles have only required privileges; web/worker cannot alter schema and non-production credentials cannot reach production resources. | Permission test + configuration inspection |
| AC-SEC-013 | P1 | PS-NFR-009; UX Privacy | A public privacy notice identifies anonymous access, local preferences, 30-day request-log retention, seven-year audit retention, external media processing, and responsible contact; retention/deletion configuration matches it. | Notice + configuration inspection |
| AC-SEC-014 | P0 | Operator Bootstrap State | Concurrent bootstrap attempts enroll at most one Operator; consumed bootstrap configuration cannot enroll another; a confirmed audited database command can add or disable an exact identity; ordinary commands cannot disable the final active Operator; disablement invalidates existing sessions; break-glass recovery requires approval and one Audit Event. | Concurrency + session integration |

## UX and Accessibility

| ID | Pri. | Source | Acceptance Condition | Method |
|---|---:|---|---|---|
| AC-UX-001 | P1 | DEC-0041 | Channel Zero presents the four required layers in a full viewport and exposes only sound, fullscreen, Explore, Details, and return navigation—never pause, seek, previous, next, Program choice, or queue control. | Browser inspection |
| AC-UX-002 | P1 | DEC-0042 | Public and operator screens use the approved semantic token values and one dark theme; automated contrast checks and visual inspection find no unapproved second theme. | Static + visual inspection |
| AC-UX-003 | P0 | DEC-0043 | Automated accessibility checks report no serious or critical WCAG 2.2 AA violation on required routes and states. | Automated accessibility scan |
| AC-UX-004 | P0 | UX keyboard standards | Every interactive audience and operator workflow is completable by keyboard alone with logical order, visible focus, no trap, and Escape behavior where defined. | Manual + automated keyboard test |
| AC-UX-005 | P0 | UX semantic standards | Screen readers receive page landmarks, entity headings, control names/states, validation association, status announcements, and readable Now/Next/elapsed/sound state without visual-only dependence. | Screen-reader inspection |
| AC-UX-006 | P1 | UX responsive standards | Compact (<640), medium (640–1023), wide (1024–1439), and venue (≥1440) reference viewports show no clipped essential text, unintended horizontal scroll, overlapping controls, or unreachable action. | Playwright screenshots + inspection |
| AC-UX-007 | P1 | UX motion standards | Normal Experience transitions complete as the defined crossfade within 300 ms; reduced-motion preference removes nonessential motion without losing state or delaying canonical synchronization. | Browser measurement |
| AC-UX-008 | P1 | UX visual fallback | Every Experience has a valid visual presentation; missing, blocked, or failed imagery uses the neutral broadcast fallback rather than a broken asset. | Browser fixture matrix |
| AC-UX-009 | P1 | UX loading/error states | Loading, empty, validation, conflict, provider failure, disconnected, fallback, and unavailable states use clear plain language and preserve the next safe action. | Component + browser matrix |
| AC-UX-010 | P1 | UX fullscreen/venue | Fullscreen enter/exit is labeled, retains identity and sound controls, requires no operator session, and maintains safe display margins at venue sizes. | Browser demonstration |
| AC-UX-011 | P1 | Accessibility media | Approved media with speech or essential audio has the required accessible text alternative or caption/transcript treatment; sound is never required for navigation or factual content. | Content inspection |

## Performance, Reliability, and Operations

| ID | Pri. | Source | Acceptance Condition | Method |
|---|---:|---|---|---|
| AC-NFR-001 | P1 | Acceptance Profile; Performance budgets | Channel Zero and public entity routes meet p75 LCP ≤2.5 s, INP ≤200 ms, and CLS ≤0.10 on every declared browser/network profile. | Measurement |
| AC-NFR-002 | P0 | Acceptance Profile; Performance budgets | At declared fixture volume/load, manifest p95 ≤500 ms and p99 ≤1 s; public search p95 ≤750 ms; visibility-checked uncached public page server response p95 ≤800 ms. | Load measurement |
| AC-NFR-003 | P1 | Performance budgets | Operator non-import requests and command persistence meet p95 ≤2 s; search projection freshness is ≤60 s; critical job start latency p95 ≤30 s. | Measurement |
| AC-NFR-004 | P0 | Reliability objectives | A calculated capacity and monitoring review demonstrates that the deployed topology can support the 99.5% monthly Channel Zero availability target without relying on an unconfigured component. | Inspection + load/soak evidence |
| AC-NFR-005 | P0 | Backup and recovery | A staging restore from production-equivalent protected backup completes with no more than 15 minutes of permitted data loss and restores the core Channel Zero path within four hours. | Timed restore exercise |
| AC-NFR-006 | P0 | Backup specification | PostgreSQL point-in-time recovery has at least 14 days of history, backup verification is current, object originals are recoverable, and application credentials cannot delete backup history. | Configuration + restore inspection |
| AC-NFR-007 | P0 | Failure behavior; DM-INV-019 | Terminating outbox dispatch or a worker at every lease/commit boundary loses no required work and produces no duplicate canonical mutation; replacement resumes and poison jobs stop after the limit with alert/evidence. | Failure injection |
| AC-NFR-008 | P0 | Deployment and rollback | Candidate deploy completes readiness/smoke gates; before first production V2, rollback to the immediately preceding staging candidate succeeds, and afterward rollback to the prior production artifact succeeds, without rewriting migrations or losing canonical data. | Deployment exercise |
| AC-NFR-009 | P1 | Health endpoint contract | Liveness remains independent of external dependencies; readiness fails for invalid config, database loss, or migration incompatibility; responses contain no secrets or stack traces. | Automated integration |
| AC-NFR-010 | P0 | Observability | Dashboards and alerts cover request health, manifest freshness, command propagation, fallback, queue, import, database, media, auth denial, search lag, backups, and stalled critical work using the candidate release ID. | Inspection + alert tests |
| AC-NFR-011 | P0 | Required runbooks | Every runbook named in the Build Specification exists, names an owner, and is exercised or tabletop-reviewed with trigger, containment, recovery, validation, communication, and follow-up. | Inspection + exercise |
| AC-NFR-012 | P1 | Provider failure isolation | Loss of media provider, search projection, or OIDC produces the documented degraded behavior without interrupting the unaffected public Channel Zero path or leaking private data. | Failure injection |
| AC-NFR-013 | P0 | Acceptance Profile | Evidence records exact fixture counts, load, browser/device versions, viewports, network conditions, region/RTT, cache state, sample counts, soak, and 15-minute stabilization; each meets or exceeds the minimum profile. | Profile schema validation + inspection |

## Engineering and AI Operations

| ID | Pri. | Source | Acceptance Condition | Method |
|---|---:|---|---|---|
| AC-ENG-001 | P2 | Development Manual | Every release pull request records scope, Foundation and acceptance references, data/security/accessibility/operations impact, verification, rollout, rollback, and known limitations. | PR audit |
| AC-ENG-002 | P0 | Definition of Done | Every domain invariant, public/operator API, critical journey, and manual broadcast command has the required direct automated coverage; quarantined tests have owner, reason, issue, and unexpired date. | Test inventory inspection |
| AC-ENG-003 | P1 | Documentation requirements | Public behavior, schema, component, deployment, API, runbook, and Foundation documentation match the release artifact; generated API contracts and examples validate. | Documentation audit |
| AC-AIO-001 | P0 | AI Operations authority | Repository `AGENTS.md` states the Foundation authority order, approved commands, verification, protected invariants, and prohibited behavior without duplicating or weakening product rules. | Inspection |
| AC-AIO-002 | P0 | AI Operations configuration | Project Codex configuration uses workspace-scoped write access, network-disabled default, approval for scope expansion and consequential external actions, and contains no credential. | Configuration inspection |
| AC-AIO-003 | P1 | AI traceability | Material AI-assisted release changes record applicable sources, tools, verification, approvals, and limitations; no result treats AI output as self-approval. | PR and release-record audit |
| AC-AIO-004 | P0 | AI security | Prompt-injection fixtures in a web page, issue text, source comment, import row, and tool output do not cause secret disclosure, unauthorized command, scope expansion, or external mutation. | Controlled evaluation |
| AC-AIO-005 | P1 | Skill Library | Every implemented repository skill passes structure validation, matches the library register, has an owner/status, and is Active with evidence or excluded from discovery; every skill required by the candidate's phase gate is Active. | Automated + inspection |
| AC-AIO-006 | P1 | Skill evaluation | Each Active skill passes its positive-trigger, near-miss, incomplete-input, authority-stop, representative workflow, tool-failure, and untrusted-content cases. | Evaluation suite |
| AC-AIO-007 | P2 | AI evaluation baseline | The configured model and instructions pass the versioned Retroverse evaluation set without material regression in mandatory success, unsupported assumptions, tool safety, or evidence completeness. | Evaluation report |
| AC-AIO-008 | P0 | Prohibited Uses | The runtime artifact contains no OpenAI/model call, vector store, autonomous agent, or audience-facing AI dependency absent an approved Foundation change. | Dependency and source scan |

## Exclusions

| ID | Pri. | Source | Acceptance Condition | Method |
|---|---:|---|---|---|
| AC-EXC-001 | P0 | Release 1 exclusions; DEC-0029 | No migration, table, route, API, UI, or runtime workflow implements Event, Venue, Patron, Pass, or Pass Credential. Reserved prefixes may appear only in Foundation-compatible constants and documentation. | Source, schema, and route inspection |
| AC-EXC-002 | P0 | Release 1 exclusions | No audience registration, login, profile, personalized timeline, like, comment, follow, share graph, or recommendation feed is present. | Route/UI/data inspection |
| AC-EXC-003 | P0 | DEC-0021, 0028 | No second public channel, per-user broadcast timeline, live-only timeline, or audience-selected Program path exists. | Source + browser inspection |
| AC-EXC-004 | P1 | Architecture exclusions | Runtime uses no GraphQL, Redis, Kafka, separate search engine, WebSocket, microservice, or second canonical datastore. | Dependency, configuration, and runtime inspection |
| AC-EXC-005 | P0 | Playlist definition | No Playlist is publicly visible, publishable, or accepted as a broadcast item. | API, browser, and domain tests |
| AC-EXC-006 | P0 | Media and AI boundaries | No automated media-rights inference, autonomous publication, automated Program scheduling, or AI-defined product content changes canonical state. | Source and workflow inspection |

## Defect Policy

### Severity

| Severity | Definition | Release Effect |
|---|---|---|
| Critical | Data exposure or loss, authorization bypass, secret disclosure, unsafe credential behavior, unrecoverable canonical state, or complete Channel Zero failure | No-Go |
| High | Core journey failure, wrong canonical timeline, unapproved media exposure, broken fallback, material accessibility barrier, or missing required audit | No-Go |
| Medium | Required behavior is impaired but has a safe documented workaround and no integrity or access impact | Resolve before release unless a permitted P1 exception is approved |
| Low | Minor defect that does not prevent a required outcome or misrepresent state | May ship with owner and target release |

Severity is based on user and system impact, not implementation effort. Duplicate defects share one root record but every failed acceptance criterion remains linked.

### Retest

A fix invalidates the affected criterion result and all dependent evidence. Retest begins at the lowest affected layer and continues through every impacted release journey. A changed candidate receives a new artifact identity.

## Go or No-Go Decision

### Ready

Release 1 is **Ready** only when:

- every P0 criterion passes;
- every P1 criterion passes or has a permitted, unexpired, approved exception;
- no Critical or High defect is open;
- no unaccepted exploitable Critical or High security finding is open;
- the immutable artifact, migrations, configuration, evidence index, fallback Program, backup, restore, rollback, monitoring, and runbooks are complete;
- the Release Owner, QA Owner, Security Reviewer, Operations Owner, and Chief Product Architect record approval.

### Conditionally Ready

**Conditionally Ready** is allowed only for approved P1 exceptions that do not weaken a P0, security/privacy boundary, canonical broadcast integrity, media eligibility, fallback, or recovery. Every condition has an owner, compensating control, expiry no later than the next release, and tracked remediation.

### Not Ready

The candidate is **Not Ready** if any P0 fails or is blocked, any unexcepted P1 fails or is blocked, a prohibited exclusion is present, evidence identity is uncertain, or a required approver declines.

The release recommendation produced by an AI agent or automated skill is advisory and cannot supply an approval signature.

## Acceptance Record

| Field | Value |
|---|---|
| Release ID | — |
| Source Commit | — |
| Artifact Digest | — |
| Configuration Version | — |
| Migration Set | — |
| Environment | — |
| Evidence Index | — |
| P0 Passed / Total | — |
| P1 Passed / Excepted / Total | — |
| Open Critical / High Defects | — |
| Recommendation | — |

### Required Sign-Off

| Role | Name | Decision | Date | Notes |
|---|---|---|---|---|
| Release Owner | — | — | — | — |
| QA Owner | — | — | — | — |
| Security Reviewer | — | — | — | — |
| Operations Owner | — | — | — | — |
| Chief Product Architect | — | — | — | — |

## Cross-References

### Outbound References

| Target | Relationship | Source Location |
|---|---|---|
| [RV2-FND-00](./00-Vision.md) | Mission outcome | Release Outcome |
| [RV2-FND-01](./01-Constitution.md) | Governing principles and release authority | Foundation Integrity; Go/No-Go |
| [RV2-FND-02](./02-Decision-Log.md) | Decision traceability | Foundation Integrity |
| [RV2-FND-04](./04-Product-Specification.md) | Functional requirement source | Data through Exclusions |
| [RV2-FND-05](./05-Data-Model.md) | Entity and invariant acceptance | Data and Collection; Production; Broadcast |
| [RV2-FND-06](./06-Architecture.md) | Component, interface, security, and topology acceptance | Build; Security; NFR; Exclusions |
| [RV2-FND-07](./07-UX-Standards.md) | UX and accessibility acceptance | UX and Accessibility |
| [RV2-FND-08](./08-Development-Manual.md) | Engineering completion and evidence | Engineering and AI Operations |
| [RV2-FND-09](./09-AI-Operations.md) | AI authority and security acceptance | Engineering and AI Operations |
| [RV2-FND-10](./10-Skill-Library.md) | Skill validation acceptance | AC-AIO-005–006 |
| [RV2-FND-11](./11-Build-Specification.md) | Build, performance, recovery, and release acceptance | Entire document |

### Inbound References

| Source | Relationship | Target Location |
|---|---|---|
| [RV2-FND-04](./04-Product-Specification.md) | Requires testable product behavior | Release Outcome through Exclusions |
| [RV2-FND-08](./08-Development-Manual.md) | Defines evidence and done | Evidence Requirements; Engineering |
| [RV2-FND-09](./09-AI-Operations.md) | Requires acceptance evidence and human approval | Engineering and AI Operations; Go/No-Go |
| [RV2-FND-10](./10-Skill-Library.md) | Release skill consumes criteria | Evidence Bundle; Go/No-Go |
| [RV2-FND-11](./11-Build-Specification.md) | Defines measurable release candidate | Acceptance Environment; NFR; Go/No-Go |

## Open Decisions

No open decision blocks this draft. Release exceptions and acceptance results are operational records, not unresolved product decisions.

## Consistency Review

| Finding ID | Type | Location | Description | Status | Resolution Reference |
|---|---|---|---|---|---|
| — | — | — | No contradiction, duplicate concept, or missing definition identified in this draft. | Closed | — |

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
| 0.1.0 | 2026-07-13 | Draft | Authored the release evidence model and complete functional, data, broadcast, audience, operator, UX, security, performance, recovery, engineering, AI, exclusion, and go/no-go criteria. | Chief Product Architect |
| 0.0.0 | 2026-07-13 | Framework | Created document framework. No architect-authored content added. | Engineering Program Manager |
