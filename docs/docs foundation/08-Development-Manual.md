---
document_id: RV2-FND-08
title: Retroverse Development Manual
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

# Retroverse Development Manual

[Foundation Index](./README.md) · [Previous: RV2-FND-07](./07-UX-Standards.md) · [Next: RV2-FND-09](./09-AI-Operations.md)

## Document Control

| Field | Value |
|---|---|
| Document ID | RV2-FND-08 |
| Version | 0.1.0 |
| Document Status | Draft |
| Review Status | Not Started |
| Approval Status | Not Submitted |
| Content Authority | Chief Product Architect |
| Document Maintainer | Engineering Program Manager |

## Table of Contents

- [Purpose](#purpose)
- [Engineering Authority](#engineering-authority)
- [Repository Organization](#repository-organization)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Domain and Data Rules](#domain-and-data-rules)
- [Testing Strategy](#testing-strategy)
- [Database Development](#database-development)
- [Security and Privacy](#security-and-privacy)
- [Observability](#observability)
- [Dependency Management](#dependency-management)
- [Documentation](#documentation)
- [Change Review](#change-review)
- [Release Engineering](#release-engineering)
- [Definition of Done](#definition-of-done)
- [Decision Records](#decision-records)
- [Cross-References](#cross-references)
- [Open Decisions](#open-decisions)
- [Consistency Review](#consistency-review)
- [Review Record](#review-record)
- [Approval Record](#approval-record)
- [Amendment History](#amendment-history)
- [Version History](#version-history)

## Purpose

This manual defines how engineers and implementation agents change Retroverse V2. It translates the product, data, architecture, UX, and AI governance documents into a repeatable engineering practice.

The manual governs production code, schema migrations, tests, scripts, automation, infrastructure definitions, and repository documentation. It does not authorize product behavior absent from the Foundation.

## Engineering Authority

### Source-of-Truth Order

When implementation sources disagree, engineers shall apply the following order:

1. the latest approved Foundation documents;
2. approved amendments and decision records;
3. accepted build and acceptance specifications;
4. current implementation and automated tests;
5. the prior Retroverse application and other research material.

Code and tests are evidence of current behavior, not authority to contradict the Foundation. A conflict between code and the Foundation is a defect unless a later approved amendment explicitly changes the Foundation.

### Interpretation

- Product behavior belongs in [RV2-FND-04](./04-Product-Specification.md).
- Persistent meaning and invariants belong in [RV2-FND-05](./05-Data-Model.md).
- component boundaries and technology choices belong in [RV2-FND-06](./06-Architecture.md).
- interaction and accessibility rules belong in [RV2-FND-07](./07-UX-Standards.md).
- AI-agent authority and workflow belong in [RV2-FND-09](./09-AI-Operations.md).
- executable construction requirements belong in [RV2-FND-11](./11-Build-Specification.md).
- release evidence and pass conditions belong in [RV2-FND-12](./12-Acceptance-Criteria.md).

An implementation detail may be selected without a Foundation amendment when it is local, reversible, consistent with all accepted requirements, and does not create audience-visible behavior or a new domain concept. Meaning-changing choices require a decision record and the appropriate Foundation update.

## Repository Organization

Retroverse V2 shall use a single `pnpm` workspace. The canonical top-level structure is:

```text
/
├── apps/
│   └── web/                 # Next.js audience and operator application
├── packages/
│   ├── config/              # Shared build, lint, and TypeScript configuration
│   ├── db/                  # Schema, migrations, database access, and seeds
│   ├── domain/              # Framework-independent domain rules and services
│   ├── testing/             # Test fixtures, factories, and shared harnesses
│   └── ui/                  # Shared presentation components and tokens
├── tests/
│   └── e2e/                 # Browser-level release paths
├── scripts/                 # Bounded repository operations
├── docs/                    # Retroverse V2 Foundation
├── .agents/                 # Repository-scoped skill library
├── .github/                 # Pull-request and continuous-integration controls
├── AGENTS.md                # Concise implementation-agent instructions
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

Rules:

- There is one repository and one dependency lockfile.
- `apps/web` may compose packages but shall not redefine domain invariants.
- `packages/domain` shall not import Next.js, React, browser APIs, or database drivers.
- `packages/db` shall implement persistence contracts without owning product policy.
- `packages/ui` shall contain reusable visual primitives and tokens, not page-specific business orchestration.
- Tests may depend on production packages; production packages shall not depend on test packages.
- Generated artifacts, secrets, local databases, browser traces, and build output shall not be committed unless explicitly designated as fixtures.

## Development Workflow

### Work Intake

Every change begins with a bounded work item that states:

- the user or operational outcome;
- applicable Foundation requirements and decision IDs;
- in-scope and out-of-scope behavior;
- affected entities and invariants;
- acceptance criteria and required evidence;
- migration, security, privacy, accessibility, and rollback implications.

A work item that cannot identify its data model shall not enter implementation.

### Branching

`main` is protected and is expected to remain releasable. Changes use short-lived branches and merge through reviewed pull requests. Long-lived feature branches, direct production commits, and unreviewed changes to protected paths are prohibited.

Recommended branch names use a work-item identifier and concise subject, for example `feature/rv2-142-channel-manifest` or `fix/rv2-219-fallback-recovery`.

### Change Sequence

1. Read the applicable Foundation sections and existing code.
2. Confirm requirements, boundaries, and acceptance evidence.
3. Write a concise implementation plan for non-trivial changes.
4. Update schema and migrations before behavior that depends on them.
5. Implement the smallest vertical slice that produces the required outcome.
6. Add or update tests at the lowest effective level.
7. Run the proportional local verification set.
8. Inspect the resulting audience or operator behavior in a browser when UI behavior changes.
9. Update documentation and traceability.
10. Submit a focused pull request and resolve review and continuous-integration findings.

### Change Size

Pull requests should represent one coherent change. Refactoring unrelated code, mass formatting, dependency upgrades, generated-data changes, and product behavior changes shall not be combined without a documented reason. Mechanical and semantic changes should be separated when separation improves review accuracy.

## Coding Standards

### TypeScript

- TypeScript strict mode is mandatory.
- Public functions, module boundaries, persisted data, messages, and API contracts require explicit types.
- `any`, unchecked type assertions, and suppressed compiler errors are prohibited unless isolated behind a documented adapter with a test.
- External input is `unknown` until validated.
- Discriminated unions shall represent closed domain variants such as Experience types.
- Exhaustive checks are required when branching on closed variants.
- Domain identifiers use branded or otherwise non-interchangeable types; a Track identifier must not be accepted where an Artist identifier is required.
- Dates crossing a boundary use ISO 8601 strings with explicit timezone or domain-specific civil-date types. Broadcast instants are stored and compared in UTC.

### Naming and Structure

- Names shall use the canonical glossary and entity names.
- One module should own one clear responsibility.
- Pure domain logic is preferred over stateful orchestration.
- Side effects shall be explicit at boundaries.
- Functions should be short enough for their invariants and failure modes to remain visible.
- Comments explain intent, constraints, and non-obvious tradeoffs; they do not narrate self-evident syntax.
- Dead code and commented-out implementations shall be removed, not retained as history.

### Validation and Errors

- Validate all HTTP, import, job, environment, and provider input at the boundary.
- Use stable machine-readable error codes and safe audience-facing messages.
- Do not expose stack traces, SQL, filesystem paths, provider credentials, or personal data to clients.
- Expected domain conflicts return explicit typed results; unexpected failures are logged and fail closed.
- Retries are allowed only for operations known to be idempotent or guarded by an idempotency key.

### Configuration

- Configuration is validated once at process startup.
- Environment variables hold deployment-specific values and secret references, not product policy.
- Required configuration shall fail startup with a clear operator-safe diagnostic.
- Development defaults must never weaken production authentication, authorization, cookie, or transport controls.

## Domain and Data Rules

- Canonical entity identifiers follow [RV2-FND-05 § Identifier Standard](./05-Data-Model.md#identifier-standard).
- Domain changes occur through use cases or services that enforce lifecycle and relationship invariants.
- Public reads use published projections; draft content cannot leak through joins, search indexes, caches, or APIs.
- Published Experience and Program revisions are immutable.
- Manual broadcast commands take precedence over automation and produce an audit record.
- Playlist data must never be passed to a broadcast interface as a substitute for a Program.
- Collection merges preserve aliases, provenance, and redirects rather than rewriting history invisibly.
- Media eligibility is checked at publication and again before broadcast use.
- Money, attendance, access, and credential behavior for reserved entities shall not be implemented in Release 1.

## Testing Strategy

### Test Levels

| Level | Purpose | Required Examples |
|---|---|---|
| Static | Detect invalid source and dependency use | formatting, lint, type checking, boundary rules |
| Unit | Prove deterministic domain behavior | identifier validation, timeline math, lifecycle transitions, search normalization |
| Integration | Prove real boundary behavior | PostgreSQL constraints, migrations, API authorization, import staging, manifest transactions |
| Component | Prove reusable UI behavior | states, keyboard behavior, reduced motion, error presentation |
| End-to-end | Prove release journeys | Channel Zero join, exploration, search, operator publication and control, fallback recovery |
| Non-functional | Prove quality attributes | accessibility, performance, security, backup and recovery exercises |

### Testing Rules

- A regression fix includes a test that fails for the reported defect before the fix.
- Domain invariants require unit or integration coverage at their enforcement point.
- Database behavior is tested against the supported PostgreSQL major version, not an in-memory substitute.
- Time-dependent behavior uses an injectable clock and deterministic UTC instants.
- Random identifiers and tokens use injectable generators in tests.
- External media and identity providers are exercised through contract fixtures or dedicated test tenants; unit tests do not depend on the public internet.
- Browser tests use role- or label-based selectors. Test-only selectors are allowed only when semantic selectors cannot uniquely express the interaction.
- Snapshot tests shall not replace behavioral assertions.
- Flaky tests are treated as defects. A quarantined test needs an owner, reason, tracking item, and expiry date.

### Coverage

Coverage percentage is a diagnostic, not the release definition. The following are mandatory regardless of aggregate coverage:

- every domain invariant has a direct automated test;
- every public and operator API endpoint has success, validation, authorization, and relevant conflict coverage;
- every schema migration is tested from a clean database and the prior releasable schema;
- every Release 1 critical journey has an end-to-end test;
- every manual broadcast command has success, conflict, audit, and recovery coverage.

## Database Development

- Drizzle schema definitions and committed SQL migrations are the database source of truth.
- Migrations are append-only after merge to `main`.
- Every migration must be deterministic, transaction-safe where PostgreSQL permits, and safe to retry or detect as already applied.
- Destructive changes use expand-and-contract sequencing across releases.
- Production data is never used as an unredacted local fixture.
- Seed data is deterministic and provides the minimum valid Channel Zero fallback path.
- Backfills are bounded, observable jobs and shall not run as unbounded application startup work.
- Constraints enforce invariants that can be stated relationally; application checks do not replace database constraints.
- Migration pull requests describe lock risk, expected duration, data volume assumptions, rollback strategy, and compatibility window.

## Security and Privacy

Security review is required for changes involving authentication, authorization, credentials, public input, file import, media retrieval, redirects, cookies, headers, secrets, dependencies, audit data, or infrastructure permissions.

Mandatory practices:

- least-privilege service and deployment identities;
- deny-by-default operator authorization;
- parameterized database access;
- output encoding and framework-default cross-site scripting protection;
- same-site secure HTTP-only session cookies in production;
- cross-site request forgery protection on state-changing browser requests;
- validated outbound hosts and protocols for server-side provider access;
- import size, type, and row-count limits;
- secrets supplied through the deployment secret store and never logged;
- dependency and secret scanning in continuous integration;
- no audience identity or behavioral profile in Release 1.

Security findings shall be classified by impact and exploitability. A known critical or high-severity exploitable finding blocks release.

## Observability

Production code shall emit structured logs with timestamp, severity, service, environment, release identifier, request or job correlation identifier, event name, and safe diagnostic fields.

Required telemetry covers:

- HTTP request rate, latency, and error rate;
- Channel Zero manifest generation and freshness;
- broadcast command success, conflict, and propagation;
- worker queue depth, age, retries, and failures;
- import progress and validation outcomes;
- database connection health and slow operations;
- media adapter availability;
- authentication failures and denied operator actions;
- fallback activation and recovery.

Logs shall not contain pass credentials, session tokens, provider secrets, complete imported source rows, or unnecessary audience network identifiers. Alerts must identify an owner and a runbook action.

## Dependency Management

- Use the smallest dependency set that meets an accepted requirement.
- Runtime dependencies require a maintained upstream project, compatible license, security history review, and a clear removal path.
- Exact resolved versions are committed in `pnpm-lock.yaml`.
- Toolchain and dependency upgrades are isolated changes with migration notes and proportional full verification. A compatible supported-major toolchain upgrade does not require a Foundation amendment unless it changes a product, data, security, or architecture contract.
- Automated update pull requests may propose changes but may not merge without passing the same gates as human-authored changes.
- Unused dependencies are removed promptly.
- No dependency may introduce a parallel source of truth for domain state.

## Documentation

Documentation changes are part of the implementation, not deferred cleanup.

- Audience-visible behavior changes update the Product Specification and Acceptance Criteria through the Foundation amendment workflow.
- Schema or invariant changes update the Data Model.
- component or deployment changes update the Architecture and Build Specification.
- operator procedures update the relevant runbook.
- public APIs use generated contract documentation plus maintained examples.
- consequential code decisions receive a repository architecture decision record linked to the governing Foundation decision; the Foundation Decision Log remains the only canonical source for product and Foundation architecture decisions.
- `AGENTS.md` remains concise and points to authoritative documents instead of copying them.

Copied requirements drift. Prefer links and stable identifiers over duplicated prose.

## Change Review

Every pull request shall state:

- outcome and scope;
- Foundation and acceptance references;
- data and migration impact;
- security, privacy, accessibility, and operational impact;
- verification commands and evidence;
- screenshots or recordings for changed visual states;
- rollout and rollback plan when production state can change;
- known limitations and explicitly deferred work.

At least one authorized reviewer must approve a production change. Changes to authentication, schema, broadcast control, credential handling, deployment permissions, or Foundation documents require review by the corresponding owner. Authors may not approve their own protected-path changes.

Review checks correctness, simplicity, domain fidelity, failure handling, evidence, and maintainability. Style preferences that are not codified shall not block a correct change.

## Release Engineering

- Preview environments are disposable and use synthetic or redacted data.
- A release is built once from an immutable commit and promoted without source modification.
- Web and worker processes use the same release identifier and compatible schema contract.
- Database migrations run as an explicit deployment step before processes that require them.
- Rollback restores the prior compatible application artifact; data correction uses forward migrations.
- Feature flags are temporary operational controls, not permanent architecture or a way to conceal unfinished mandatory behavior.
- Production release records include commit, build, migration set, configuration version, approver, time, and verification result.
- A fallback Program must be published and validated before Channel Zero is enabled in any environment.

The executable gate order and deployment requirements are defined in [RV2-FND-11](./11-Build-Specification.md).

## Definition of Done

A change is done only when all applicable conditions are true:

- the accepted outcome is implemented without unapproved scope;
- data entities, relationships, lifecycle, provenance, and constraints are represented in the authoritative model;
- static, unit, integration, component, and end-to-end checks required by risk pass;
- acceptance criteria are traced to durable evidence;
- security, privacy, accessibility, performance, and operational impacts are addressed;
- migrations, backfills, seeds, rollout, and rollback are safe and documented;
- logs, metrics, alerts, and failure states are sufficient to operate the change;
- user and repository documentation is current;
- the pull request is reviewed and all blocking findings are resolved;
- no new known critical or high-severity defect remains;
- the implementation is present in a releasable commit on `main`.

Passing continuous integration alone does not make a change done when required behavioral or operational evidence is absent.

## Decision Records

The canonical wording and status of each decision are maintained in [RV2-FND-02](./02-Decision-Log.md#incorporated-decision-rationale). The records below supply engineering rationale and consequences only.

### DEC-0044 — Single Workspace Repository

**Decision:** Retroverse V2 shall use one `pnpm` workspace repository with a deployable web application and bounded shared packages for domain, database, UI, configuration, and testing concerns.

**Rationale:** A single workspace preserves one source of truth, makes cross-layer changes reviewable in one commit, and avoids premature service and repository boundaries.

**Consequences:** All Release 1 production code shares one lockfile and continuous-integration system. Package boundaries remain enforceable even though deployment begins as a modular monolith.

### DEC-0045 — Protected Main with Short-Lived Branches

**Decision:** `main` shall be protected and releasable; production changes shall arrive through reviewed pull requests from short-lived branches.

**Rationale:** The workflow is the simplest reliable way to preserve review, traceability, and recoverable releases without adding a release-train process.

**Consequences:** Direct unreviewed changes to protected paths are prohibited. Pull requests remain focused and carry verification evidence.

### DEC-0046 — Risk-Based Layered Verification

**Decision:** Verification shall combine static, unit, integration, component, end-to-end, and applicable non-functional checks, selected by the risks and boundaries changed.

**Rationale:** No single test level can prove domain rules, real persistence, browser behavior, accessibility, and operations. Risk-based selection keeps the suite proportionate while protecting mandatory paths.

**Consequences:** Critical journeys and invariants require direct automated proof. Aggregate coverage percentage does not substitute for required evidence.

## Cross-References

### Outbound References

| Target | Relationship | Source Location |
|---|---|---|
| [RV2-FND-01](./01-Constitution.md) | Governing engineering principles | Engineering Authority; Domain and Data Rules |
| [RV2-FND-04](./04-Product-Specification.md) | Required product behavior | Engineering Authority; Work Intake |
| [RV2-FND-05](./05-Data-Model.md) | Persistent model and invariants | Domain and Data Rules; Database Development |
| [RV2-FND-06](./06-Architecture.md) | Implementation boundaries and stack | Repository Organization; Release Engineering |
| [RV2-FND-07](./07-UX-Standards.md) | UI and accessibility standards | Testing Strategy; Definition of Done |
| [RV2-FND-09](./09-AI-Operations.md) | AI implementation governance | Engineering Authority |
| [RV2-FND-11](./11-Build-Specification.md) | Executable build and deployment gates | Release Engineering |
| [RV2-FND-12](./12-Acceptance-Criteria.md) | Release pass conditions | Work Intake; Definition of Done |

### Inbound References

| Source | Relationship | Target Location |
|---|---|---|
| [RV2-FND-06](./06-Architecture.md) | Engineering practice dependency | Entire document |
| [RV2-FND-09](./09-AI-Operations.md) | Agent implementation workflow | Development Workflow; Change Review |
| [RV2-FND-10](./10-Skill-Library.md) | Skills enforce manual requirements | Definition of Done; Change Review |
| [RV2-FND-11](./11-Build-Specification.md) | Build operationalizes manual | Repository Organization; Testing; Release Engineering |
| [RV2-FND-12](./12-Acceptance-Criteria.md) | Acceptance validates adherence | Definition of Done |

## Open Decisions

No open decision blocks this draft. Implementation discoveries that imply a new product behavior, domain entity, security boundary, or architectural direction shall enter the decision process before implementation continues.

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
| 0.1.0 | 2026-07-13 | Draft | Authored the repository, workflow, coding, testing, security, operational, review, release, and completion standards. | Chief Product Architect |
| 0.0.0 | 2026-07-13 | Framework | Created document framework. No architect-authored content added. | Engineering Program Manager |
