---
document_id: RV2-FND-11
title: Retroverse Build Specification
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

# Retroverse Build Specification

[Foundation Index](./README.md) · [Previous: RV2-FND-10](./10-Skill-Library.md) · [Next: RV2-FND-12](./12-Acceptance-Criteria.md)

## Document Control

| Field | Value |
|---|---|
| Document ID | RV2-FND-11 |
| Version | 0.1.0 |
| Document Status | Draft |
| Review Status | Not Started |
| Approval Status | Not Submitted |
| Content Authority | Chief Product Architect |
| Document Maintainer | Engineering Program Manager |

## Table of Contents

- [Purpose](#purpose)
- [Release Target](#release-target)
- [Technology Baseline](#technology-baseline)
- [Repository Bootstrap](#repository-bootstrap)
- [Required Workspace Packages](#required-workspace-packages)
- [Configuration and Environments](#configuration-and-environments)
- [Database Build](#database-build)
- [Application Build](#application-build)
- [Release 1 Construction Sequence](#release-1-construction-sequence)
- [Canonical Commands](#canonical-commands)
- [Continuous Integration](#continuous-integration)
- [Test Environments and Fixtures](#test-environments-and-fixtures)
- [Acceptance Profile](#acceptance-profile)
- [Operational Limits](#operational-limits)
- [Performance Budgets](#performance-budgets)
- [Reliability and Recovery](#reliability-and-recovery)
- [Security and Supply Chain](#security-and-supply-chain)
- [Deployment](#deployment)
- [Observability and Runbooks](#observability-and-runbooks)
- [Release Candidate](#release-candidate)
- [Decision Records](#decision-records)
- [Cross-References](#cross-references)
- [Open Decisions](#open-decisions)
- [Consistency Review](#consistency-review)
- [Review Record](#review-record)
- [Approval Record](#approval-record)
- [Amendment History](#amendment-history)
- [Version History](#version-history)

## Purpose

This specification defines how to construct, verify, package, deploy, and operate the smallest useful Retroverse V2 release. It is the implementation contract for the architecture in [RV2-FND-06](./06-Architecture.md) and the product behavior in [RV2-FND-04](./04-Product-Specification.md).

This document does not authorize behavior outside Release 1. Where it establishes numerical limits or quality budgets, those values are binding Release 1 requirements until amended.

## Release Target

Release 1 shall deliver one coherent path:

```text
curated Collection
        ↓
published Experiences and Programs
        ↓
one continuously running Channel Zero timeline
        ↓
anonymous audience viewing and exploration
```

The release includes the three approved Experience types, private Track Playlists, operator publication and manual control, public entity pages and search, media eligibility, import provenance, fallback continuity, audit evidence, and the required operational controls.

Event, Venue, Patron, Pass, Pass Credential, audience accounts, commerce, recommendations, automated scheduling, multiple channels, and audience playback control are excluded.

## Technology Baseline

| Concern | Release 1 Baseline | Version Rule |
|---|---|---|
| Runtime | Node.js 24 LTS | Pin one exact supported patch in repository tool files; security-patch within the major |
| Package manager | `pnpm` 10 | Pin exact version through Corepack and `packageManager` |
| Language | TypeScript 5.x | Pin exact stable version; strict mode |
| Web | Current stable Next.js App Router and compatible React | Pin exact versions in lockfile; no prerelease dependency |
| Database | PostgreSQL 18 | Use the same major locally, in CI, preview, and production |
| Data access | Current stable Drizzle ORM and migration tooling | Pin exact versions |
| Validation | Zod | Pin exact stable version |
| Unit/integration | Vitest | Pin exact stable version |
| Browser testing | Playwright Test | Pin package and browser revisions through the lockfile and install step |
| Styling | CSS with repository semantic tokens | No second theme or external runtime theme service |
| Job execution | PostgreSQL-backed queue | Same database and application codebase |
| Identity | OIDC Authorization Code flow; PKCE where supported | Standards-based provider adapter |
| Objects | Private S3-compatible Media Asset storage; CDN only for non-revocable repository brand assets | Provider isolated behind infrastructure adapter |

These majors are the initial implementation baseline, not permanent product architecture. The repository pins the exact tested versions and records the supported matrix. A compatible supported-major change uses an isolated pull request, migration notes, and the full gate set; it requires a Foundation amendment only when it changes a product, data, security, or architecture contract. A version change shall never silently change the product contract.

## Repository Bootstrap

### Required Root Files

| File | Purpose |
|---|---|
| `package.json` | Workspace scripts, pinned package manager, Node engine, repository metadata |
| `pnpm-workspace.yaml` | Includes `apps/*` and `packages/*` |
| `pnpm-lock.yaml` | Single exact dependency resolution |
| `.nvmrc` and/or `.tool-versions` | Exact Node runtime patch |
| `tsconfig.json` | Shared strict TypeScript baseline |
| `eslint.config.*` | Lint, import boundary, and security rules |
| `.editorconfig` | Portable text conventions |
| `.gitignore` | Excludes secrets, dependencies, build output, local artifacts, and traces |
| `.env.example` | Names and safe descriptions of configuration; no credentials |
| `AGENTS.md` | Concise AI and engineering instructions linked to Foundation sources |
| `.codex/config.toml` | Reviewed project-specific Codex permissions and tool configuration |
| `CODEOWNERS` | Required review ownership for protected paths |
| `LICENSE` | Required only before public source distribution; the repository owner supplies and approves the license. Private deployment may retain an explicit `UNLICENSED` package designation. |

### Required Directories

The build shall create the canonical structure in [RV2-FND-08 § Repository Organization](./08-Development-Manual.md#repository-organization). Empty placeholder packages are permitted only during bootstrap and must have an owner and removal milestone.

### Root Script Contract

Root scripts orchestrate workspace tasks and shall not embed environment secrets. Each canonical command shall work from the repository root on macOS and Linux using the pinned toolchain.

## Required Workspace Packages

### `apps/web`

Owns:

- Next.js routing and rendering;
- public Channel Zero, Explore, search, and entity pages;
- private operator interfaces;
- versioned public and operator HTTP routes;
- OIDC callbacks and secure session handling;
- web-process composition and health endpoints.

It shall import domain operations and persistence adapters rather than duplicating their rules.

### `packages/domain`

Owns framework-independent modules for:

- Collection;
- Production;
- Broadcast;
- Audience projections;
- Operations, audit semantics, identifiers, clocks, and validation primitives.

It shall have no dependency on React, Next.js, browser globals, Drizzle, or a provider SDK.

### `packages/db`

Owns:

- Drizzle schema;
- committed SQL migrations;
- repositories and transactions;
- PostgreSQL-backed job queue integration;
- search-document projection;
- deterministic seed and test database utilities.

### `packages/ui`

Owns semantic design tokens and reusable, accessible presentation primitives. It does not own publication, broadcast, or authorization decisions.

### `packages/config`

Owns shared TypeScript, lint, formatting, build, and test configuration. Environment parsing used by a runtime remains close to that runtime while reusing shared validators.

### `packages/testing`

Owns approved factories, clocks, identifier generators, fixtures, provider fakes, and test harnesses. Production packages shall not import it.

## Configuration and Environments

### Environment Classes

| Environment | Purpose | Data | External Effects |
|---|---|---|---|
| Local | Daily development | Deterministic synthetic seed plus explicitly imported research data | Local or provider test endpoints only |
| Test | Automated unit and integration execution | Ephemeral synthetic data | Disabled or mocked by default |
| Preview | Pull-request browser and integration review | Isolated synthetic/redacted database and object prefix | Test identity/provider configuration |
| Staging | Production-like release rehearsal | Approved non-production dataset | Approved non-production providers |
| Production | Public Channel Zero and private operator use | Canonical production data | Explicitly controlled |

No non-production environment may write to a production database, object prefix, identity tenant, or external provider account.

### Configuration Variables

The implementation shall validate at startup the variables appropriate to its process. Canonical names include:

```text
APP_ENV
APP_ORIGIN
RELEASE_ID
DATABASE_URL
DATABASE_POOL_MAX
SESSION_SECRET
OIDC_ISSUER_URL
OIDC_CLIENT_ID
OIDC_CLIENT_SECRET
OIDC_REDIRECT_URI
OPERATOR_ALLOWLIST
OBJECT_STORAGE_ENDPOINT
OBJECT_STORAGE_REGION
OBJECT_STORAGE_BUCKET
OBJECT_STORAGE_ACCESS_KEY_ID
OBJECT_STORAGE_SECRET_ACCESS_KEY
BRAND_ASSET_CDN_ORIGIN
WORKER_ENABLED
LOG_LEVEL
OTEL_EXPORTER_OTLP_ENDPOINT
```

Secret values are provided by the environment's secret manager. `OPERATOR_ALLOWLIST` contains exact OIDC issuer/subject pairs and is accepted only while the database singleton bootstrap state is `available`. First enrollment atomically consumes that state and stores only the configuration digest; PostgreSQL is authoritative thereafter and startup rejects any attempt to replay environment enrollment. Confirmed, audited database commands add or disable later identities, normal operation cannot disable the final active Operator, and removal or disablement increments `session_version`. Emergency recovery requires the approved break-glass runbook, explicit configuration approval, and an Audit Event.

### Health Endpoints

- `/health/live` proves the process event loop can respond and does not query external dependencies.
- `/health/ready` proves configuration validity, database connectivity, migration compatibility, and availability of process-critical dependencies.
- Health responses contain no secrets, internal stack traces, or provider credentials.

## Database Build

### Schema and Migrations

The schema shall implement every Release 1 entity and invariant in [RV2-FND-05](./05-Data-Model.md). Migrations shall:

- be committed SQL with reviewable names and order;
- create PostgreSQL extensions explicitly and only when required;
- use transactions where supported;
- define keys, foreign keys, unique constraints, checks, indexes, and lifecycle enums;
- support a clean install and an upgrade from the latest released schema; for the first V2 release, the empty migration baseline is the defined predecessor;
- avoid destructive changes in the same release that removes compatibility;
- be verified on PostgreSQL 18.

Migration state is checked before a process becomes ready. Application startup shall not generate or rewrite migrations.

### Seed Contract

The deterministic development and acceptance seed shall provide:

- representative Artists, Albums, Tracks, Charts, Weeks, a Month, a Year, a Decade, and an Era;
- at least one valid example of each Release 1 Experience type;
- at least two published Program revisions;
- one configured and valid fallback Program;
- one active broadcast state with a known UTC start instant;
- public entity relationships and search documents;
- media in approved, blocked, and unavailable states;
- no real personal data or live credentials.

The seed command is idempotent for its target database and refuses to run when `APP_ENV=production`.

### Database Roles

Use distinct least-privilege credentials for:

- migrations;
- web runtime;
- worker runtime when separately deployed;
- read-only operational reporting when needed;
- backup and restore managed by the database platform.

The web and worker roles shall not own the database schema.

## Application Build

### Build Output

The production build shall generate one immutable, self-contained web artifact and a worker entry point from the same repository commit and dependency lock. Source maps may be retained in protected observability storage but shall not be publicly served.

The build embeds or exposes a non-secret `RELEASE_ID` equal to the source commit or signed release identifier. A runtime configuration change shall be separately versioned and auditable.

### Public Rendering

- Channel Zero shell and public entity pages use server rendering.
- Public content projections contain only currently publicly visible data, including immutable published snapshots and archived Collection identities still required by visible published references.
- Client hydration is limited to broadcast timing, media state, interactive exploration, and necessary enhancements.
- Channel state is retrieved from the side-effect-free versioned manifest endpoint and refreshed at least every five seconds while visible.
- Channel rendering never waits on a live provider metadata request.
- Manifest, visibility-sensitive entity responses, and revocable Media Assets use `no-store` shared-cache policy.

### Worker

Production requires a running worker process from the same artifact for outbox dispatch, imports, media verification, search projection, five-second Broadcast Readiness reconciliation, and bounded maintenance work. Jobs are idempotent, leased, retry-limited, observable, and recoverable after process termination.

## Release 1 Construction Sequence

Each phase ends with a demonstrable vertical outcome and its required tests. A later phase may begin only when the preceding phase's blocking gates pass.

### Phase 0 — Repository and Governance

- create and validate the repository skill artifacts needed to activate SKL-001 through SKL-005 before production package, schema, or runtime-boundary work;
- create the workspace, package boundaries, pinned toolchain, canonical scripts, CI, CODEOWNERS, `AGENTS.md`, and safe configuration templates;
- commit the complete Foundation as implementation authority;
- establish formatting, lint, type, dependency-boundary, test, and secret-scan gates.

**Exit:** clean checkout installs reproducibly and passes the empty baseline gates.

### Phase 1 — Data and Domain Core

- implement identifiers, PostgreSQL canonical clock, errors, lifecycle primitives, operator bootstrap/session identity, the single audit stream, command idempotency, transactional outbox, leased jobs, and the normalized schema;
- create migrations, repositories, transactions, seeds, and invariant tests;
- implement the Channel Zero timeline calculation as a pure domain operation.

**Exit:** the database can be created from zero, seeded, upgraded in test, and queried through typed domain operations.

### Phase 2 — Collection

- implement Artist, Album, Track, Chart, Chart Issue, explicit temporal relations, provenance, aliases, slug redirects, Track Media associations, and media approval/capability records;
- implement operator collection CRUD, archive behavior, source inspection, and duplicate-aware import staging;
- implement public projections without exposing draft data.

**Exit:** the Operator can curate and import a validated collection; public projections contain only currently visible records.

### Phase 3 — Production

- implement Experience identities, primary visual modes, immutable public snapshots/hashes, and revisions for Track Spotlight, Chart Snapshot, and Time Capsule;
- implement Program identities, ordered immutable revisions and snapshots, duration offsets, publication, and validation;
- implement private ordered Track Playlists without a broadcast interface.

**Exit:** the Operator can publish each Experience type and a valid Program revision while historical revisions remain unchanged.

### Phase 4 — Broadcast

- implement singleton broadcast state, one Broadcast Readiness predicate, fallback configuration, side-effect-free manifest projection, PostgreSQL-time calculation, and typed Audit Events;
- implement idempotent activate, activate-at, skip, replay, fallback, conflict handling, mutation-time fallback, and reconciliation-worker automatic fallback;
- implement the Channel Zero client clock, polling, transitions, media fallback, and branded unavailable state.

**Exit:** multiple clients derive the same current Experience from one persisted timeline and observe manual control within the propagation budget.

### Phase 5 — Audience and Exploration

- implement full-viewport Channel Zero UX, Now/Next context, sound state, and exploration links;
- implement Explore, public entity pages, relationships, search, empty states, and metadata;
- implement responsive, keyboard, reduced-motion, and screen-reader behavior.

**Exit:** an anonymous user can join Channel Zero and explore every required public entity without access to private state. SKL-007 is Active before the UI is accepted.

### Phase 6 — Operator and Operations

- complete OIDC allowlist, session, CSRF, rate-limit, confirmation, and operator error flows;
- complete dashboards for publication, media eligibility, imports, broadcast, and audit inspection;
- complete structured telemetry, alerts, backups, restore rehearsal, and runbooks.

**Exit:** an authorized Operator can safely run the complete release and recover documented failures. SKL-009 is Active before security-sensitive work is accepted.

### Phase 7 — Release Hardening

- execute accessibility, performance, security, reliability, migration, backup, restore, rollback, and acceptance suites;
- activate SKL-006 and SKL-011;
- resolve all blocking defects;
- produce and approve the immutable release evidence bundle.

**Exit:** every mandatory criterion in [RV2-FND-12](./12-Acceptance-Criteria.md) passes.

## Canonical Commands

The root `package.json` shall expose:

| Command | Contract |
|---|---|
| `pnpm install --frozen-lockfile` | Reproduce dependencies without changing the lockfile |
| `pnpm format:check` | Verify repository formatting without mutation |
| `pnpm lint` | Run code-quality, security, and package-boundary rules |
| `pnpm typecheck` | Type-check all production and test TypeScript |
| `pnpm test` | Run deterministic unit and component tests |
| `pnpm test:integration` | Run tests against an ephemeral PostgreSQL 18 database |
| `pnpm test:e2e` | Run required Playwright journeys |
| `pnpm test:a11y` | Run automated accessibility checks and keyboard assertions |
| `pnpm build` | Create production web and worker artifacts |
| `pnpm db:generate` | Generate a proposed migration for review; never at runtime |
| `pnpm db:migrate` | Apply committed migrations to an explicitly selected environment |
| `pnpm db:check` | Verify schema, migration order, and drift |
| `pnpm db:seed` | Apply deterministic non-production seed and reject production |
| `pnpm verify` | Run the local pre-PR gate: format, lint, typecheck, unit, integration, and build |
| `pnpm verify:release` | Run the complete release gate including e2e and non-functional checks |

Commands shall return nonzero on failure and shall not hide or reinterpret a failed child command.

## Continuous Integration

### Pull-Request Gate Order

1. repository policy, prohibited-file, and Foundation link checks;
2. dependency lock and license policy;
3. secret scan and static security analysis;
4. formatting and lint, including package boundaries;
5. TypeScript type check;
6. unit and component tests;
7. PostgreSQL migration, schema, and integration tests;
8. production build;
9. Playwright critical journeys and automated accessibility checks;
10. preview deployment and smoke verification for eligible branches.

Independent checks may run in parallel after dependencies are satisfied, but the result must preserve this logical gate order. Required checks are branch-protected and cannot be replaced by an AI summary.

### Main and Release Gates

Merges to `main` repeat or reuse immutable passing artifacts, publish the candidate artifact, and run post-build integrity checks. A release candidate additionally runs performance, recovery, security, and full acceptance suites in staging.

### CI Security

- Actions are pinned to immutable revisions and reviewed before update.
- Job permissions default to read-only.
- Untrusted pull requests receive no production or long-lived secrets.
- Build provenance records source commit, workflow, dependency lock digest, and artifact digest.
- Cache keys include lockfile and toolchain identity; caches never contain secrets.

## Test Environments and Fixtures

- Integration tests create an isolated database and apply every migration.
- End-to-end tests use deterministic identifiers, UTC clocks, and a known Channel Zero start state.
- OIDC is tested through a controlled provider or protocol-compatible test service; authorization tests still exercise the application boundary.
- Media adapters use recorded contract fixtures for normal CI and named provider tests for scheduled compatibility checks.
- Tests shall not require access to the former Retroverse implementation.
- Browser runs capture trace, screenshot, video on failure, console errors, and the release identifier.
- Test artifacts must redact cookies, tokens, imported rows, and provider secrets.

## Acceptance Profile

Every release candidate stores an `acceptance-profile.json` with the exact versions and resource values used. The minimum Release 1 profile is:

| Dimension | Minimum profile |
|---|---|
| Canonical fixture volume | 2,000 Artists; 1,500 Albums; 10,000 Tracks; 10 Charts; 5,200 Chart Issues; 520,000 Chart Entries; all calendar periods needed by fixtures; 500 published Experience revisions; 50 published Program revisions; 10,000 provenance claims; 10,000 Search Documents |
| Public load | 100 concurrent Channel Zero clients, 20 concurrent Explore/search clients, and 5 concurrent Operator sessions |
| Browser desktop | Exact current and previous stable Chromium, Firefox, and WebKit/Safari-compatible Playwright revisions recorded by the candidate |
| Browser mobile | Current iOS Safari-compatible WebKit and current Android Chromium profiles at 390×844 CSS pixels |
| Venue profile | Chromium at 1920×1080 and 3840×2160, fullscreen-capable |
| Accessibility viewport | 320×568 CSS pixels plus 200% zoom and reduced-motion modes |
| Network profiles | Broadband: 100 Mbps down/20 Mbps up/40 ms RTT; constrained mobile: 10 Mbps down/2 Mbps up/150 ms RTT; venue LAN: 50 Mbps down/10 Mbps up/20 ms RTT |
| Region | Production-equivalent staging in the intended primary region; one remote client with 100–150 ms measured RTT |
| Cache state | Manifest, visibility-sensitive entity responses, search visibility joins, and revocable media are measured uncached; repository brand assets may be warm-CDN cached |
| Endpoint sample | 15-minute warm-up followed by at least 30 minutes and 10,000 measured requests per endpoint class |
| Broadcast sample | Two-hour soak with at least three independently clocked clients and all manual-control actions |
| Deployment stabilization | 15 minutes after readiness and smoke gates before promotion is considered stable |

“Representative,” “normal service,” “normal load,” “supported browser,” and “stabilization window” mean this recorded profile unless a stricter approved release profile replaces it.

## Operational Limits

| Limit | Release 1 Value | Enforcement |
|---|---:|---|
| Experience duration | 15–900 seconds inclusive | Domain validation and database constraint |
| Program Experience items | 1–200 | Publication validation |
| Program total duration | Greater than 0 and no more than 86,400 seconds | Publication validation |
| Import upload | 25 MiB | Edge and application request limit |
| Import data rows | 50,000 per job | Staging validation |
| General JSON request | 1 MiB | Application request limit |
| Operator image upload | 20 MiB | Edge and adapter validation |
| Search page size | 25 default; 100 maximum | Public API validation |
| Manifest polling | At least once every 5 seconds while visible | Channel client |
| Worker job attempts | 5 maximum unless a job class explicitly defines fewer | Queue policy |
| Provider call timeout | 5 seconds per attempt; no Channel render dependency | Adapter policy |

Limits are validated with clear operator-facing errors and stable API error codes. Import or provider limits may be lowered operationally during an incident but may not be raised above these values without a reviewed change.

## Performance Budgets

Measurements use production builds and the recorded Acceptance Profile. Public web vitals are evaluated at the 75th percentile over the release test sample.

| Metric | Budget |
|---|---:|
| Largest Contentful Paint on Channel Zero and public entity pages | ≤ 2.5 seconds |
| Interaction to Next Paint | ≤ 200 milliseconds |
| Cumulative Layout Shift | ≤ 0.10 |
| Server response time for visibility-checked public entity page | p95 ≤ 800 milliseconds |
| Channel manifest endpoint | p95 ≤ 500 milliseconds; p99 ≤ 1 second |
| Public search endpoint at representative volume | p95 ≤ 750 milliseconds |
| Operator non-import read/write request | p95 ≤ 2 seconds |
| Confirmed manual control persistence | p95 ≤ 2 seconds |
| Manual control audience propagation | ≤ 10 seconds after committed command under the Acceptance Profile |
| Search projection freshness after committed publish/archive | ≤ 60 seconds |
| Worker critical-job start latency under the Acceptance Profile | p95 ≤ 30 seconds |

Performance failure shall identify the measured environment and remain visible even if functional tests pass.

## Reliability and Recovery

### Service Objectives

- Monthly Channel Zero availability target: 99.5%, excluding approved maintenance.
- Channel manifest correctness takes priority over serving stale or unpublished state.
- Production recovery point objective: no more than 15 minutes of canonical database change.
- Production recovery time objective: no more than 4 hours to restore the core Channel Zero path in an approved recovery environment.

### Backup

- Managed PostgreSQL point-in-time recovery is enabled with at least 14 days of recoverable history.
- Daily logical or platform-native backup verification is recorded.
- Object storage uses versioning or an equivalent protected recovery mechanism for canonical originals.
- Backup credentials are separate from application runtime credentials.
- A staging restore is exercised before initial release and at least quarterly thereafter.

### Failure Behavior

- A relevant mutation atomically invokes the configured ready fallback when it would invalidate active state; the reconciliation worker repairs out-of-band invalid state within five seconds and alerts.
- Invalid active and fallback state produces the branded unavailable state and no private data.
- Worker loss pauses asynchronous jobs without corrupting canonical state.
- Search projection loss degrades search but not Channel Zero, publication history, or entity identity.
- Media-provider loss uses approved visual fallback while canonical time advances.
- OIDC provider loss does not interrupt the public audience path; it prevents new operator sessions safely.

## Security and Supply Chain

The release gate shall verify:

- no committed secret or credential;
- no known exploitable critical or high-severity dependency finding;
- valid OIDC issuer, redirect, state, nonce, PKCE where supported, secure session cookie, CSRF, and allowlist controls;
- authorization on every operator route and mutation;
- rate limits for authentication, public search, manifest, imports, and operator mutations;
- parameterized queries and validated request, import, redirect, URL, and provider input;
- restrictive production security headers and transport security;
- private Media Asset originals, eligibility-checked `no-store` media delivery, and immutable CDN keys only for non-revocable repository-owned brand assets;
- auditable publication, media approval, archive, and broadcast-control mutations;
- no Release 1 audience identity or behavioral profile;
- dependency license compatibility and build provenance;
- a software bill of materials for the release artifact.

Penetration testing is recommended before broad public promotion and required before implementing future credential or commerce features.

## Deployment

### Topology

Production contains:

- one or more stateless web instances;
- at least one worker instance from the same artifact;
- one managed PostgreSQL 18 cluster;
- one S3-compatible object store and CDN;
- one OIDC provider;
- approved external media provider adapters;
- centralized logs, metrics, traces, alerts, and secret management.

### Deployment Sequence

1. Select the immutable release artifact and verify digest and provenance.
2. Verify backup freshness and schema compatibility.
3. Apply backward-compatible committed migrations with the migration role.
4. Deploy worker and web processes from the same release, using readiness gates.
5. Run authenticated and anonymous smoke tests.
6. Confirm Broadcast Readiness for active and fallback revisions, manifest freshness, worker/outbox health, canonical-visibility search behavior, and alerts.
7. Record the release and promote traffic.
8. Monitor the 15-minute Acceptance Profile stabilization window.

### Rollback

Application rollback redeploys the prior compatible artifact. Before the first production V2 release, the immediately preceding staging candidate artifact is the required rollback target; after the first production release, the prior production artifact is the target. Database rollback uses a forward corrective migration; production migration files are never deleted or rewritten. A migration that prevents safe application rollback requires an explicit maintenance plan and release approval before execution.

Deployments shall not edit source, generate migrations, or install unpinned dependencies at runtime.

## Observability and Runbooks

Before release, implement dashboards and alerts for the telemetry required by [RV2-FND-08 § Observability](./08-Development-Manual.md#observability).

Required runbooks cover:

- Channel Zero unavailable;
- active Program invalid and automatic fallback;
- fallback Program invalid;
- broadcast control not propagating;
- database exhaustion or failover;
- stalled or poisoned worker job;
- search projection lag;
- media provider outage;
- OIDC outage or operator lockout;
- failed deployment and application rollback;
- backup verification failure and database restore;
- suspected credential or secret exposure.

Each runbook states trigger, severity, owner, immediate containment, diagnosis, recovery, validation, communication, and follow-up evidence.

## Release Candidate

A release candidate is one immutable artifact plus:

- source commit and clean repository state;
- exact toolchain and dependency lock;
- artifact and software-bill-of-materials digests;
- migration set and schema compatibility result;
- passing CI and full release-gate evidence;
- accessibility and browser evidence;
- performance and reliability results;
- security scan and reviewed exceptions;
- backup and restore evidence;
- rollback rehearsal result;
- published and validated fallback Program;
- known-defect register;
- operator runbooks and release approval record.

The candidate changes identity if source, dependencies, migrations, or built artifact changes. Configuration-only promotion retains artifact identity but records the configuration version and repeats applicable smoke checks.

## Decision Records

The canonical wording and status of each decision are maintained in [RV2-FND-02](./02-Decision-Log.md#incorporated-decision-rationale). The records below supply build rationale and consequences only.

### DEC-0051 — Pinned Supported Toolchain

**Decision:** Release 1 implementation shall bootstrap on Node.js 24 LTS, `pnpm` 10, and PostgreSQL 18; exact supported versions are repository pins, and compatible supported-major upgrades follow normal isolated engineering review unless they alter a Foundation contract.

**Rationale:** Supported stable majors provide a current security and maintenance baseline while exact repository pins make local, CI, and production builds reproducible.

**Consequences:** Version changes require isolated compatibility work and full gates. Runtime environments use the same declared PostgreSQL major for a release. The Foundation need not be amended for a compatible toolchain update that preserves product, data, security, and architecture contracts.

### DEC-0052 — One Immutable Release Artifact

**Decision:** Web and worker processes shall be built from one commit and dependency lock, share one release identifier, and be promoted as immutable artifacts.

**Rationale:** A single artifact preserves traceability and prevents web and background behavior from drifting across deployments.

**Consequences:** Deployment configuration may vary by environment, but source and installed dependencies may not change during promotion.

### DEC-0053 — Ordered Evidence Gates

**Decision:** Release construction and continuous integration shall progress from repository policy through static, unit, database, build, browser, accessibility, performance, security, and recovery evidence.

**Rationale:** Fast deterministic failures should stop early, while environment-intensive evidence is gathered only from a structurally valid candidate.

**Consequences:** Mandatory gates are branch-protected. Release acceptance cannot be inferred from a subset of passing checks.

## Cross-References

### Outbound References

| Target | Relationship | Source Location |
|---|---|---|
| [RV2-FND-01](./01-Constitution.md) | Governing simplicity, authority, and manual control | Release Target; CI; Deployment |
| [RV2-FND-04](./04-Product-Specification.md) | Release scope and behavior | Release Target; Construction Sequence |
| [RV2-FND-05](./05-Data-Model.md) | Schema and invariants | Database Build |
| [RV2-FND-06](./06-Architecture.md) | Stack, modules, topology, and interfaces | Technology Baseline; Deployment |
| [RV2-FND-07](./07-UX-Standards.md) | Audience and operator quality | Application Build; Performance |
| [RV2-FND-08](./08-Development-Manual.md) | Repository and engineering process | Bootstrap; CI; Observability |
| [RV2-FND-09](./09-AI-Operations.md) | AI environment and approval controls | Repository Bootstrap; CI Security |
| [RV2-FND-10](./10-Skill-Library.md) | Reusable verification workflows | Repository Bootstrap; Release Candidate |
| [RV2-FND-12](./12-Acceptance-Criteria.md) | Release pass conditions | Construction Sequence; Release Candidate |

### Inbound References

| Source | Relationship | Target Location |
|---|---|---|
| [RV2-FND-06](./06-Architecture.md) | Delegates executable topology and recovery objectives | Technology Baseline; Reliability |
| [RV2-FND-08](./08-Development-Manual.md) | Delegates exact gates and deployment | Canonical Commands; CI; Deployment |
| [RV2-FND-09](./09-AI-Operations.md) | Agents execute this contract | Canonical Commands; CI |
| [RV2-FND-10](./10-Skill-Library.md) | Skills consume build and release commands | Canonical Commands; Release Candidate |
| [RV2-FND-12](./12-Acceptance-Criteria.md) | Tests this specification | Entire document |

## Open Decisions

No open decision blocks this draft. Provider selection, exact patch versions, and deployment-region values are controlled implementation and operational selections as long as they preserve this contract.

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
| 0.1.0 | 2026-07-13 | Draft | Authored the Release 1 technology, repository, configuration, database, application, construction, CI, limit, performance, recovery, security, deployment, and release contract. | Chief Product Architect |
| 0.0.0 | 2026-07-13 | Framework | Created document framework. No architect-authored content added. | Engineering Program Manager |
