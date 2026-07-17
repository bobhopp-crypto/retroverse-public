---
document_id: RV2-FND-10
title: Retroverse Skill Library
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

# Retroverse Skill Library

[Foundation Index](./README.md) · [Previous: RV2-FND-09](./09-AI-Operations.md) · [Next: RV2-FND-11](./11-Build-Specification.md)

## Document Control

| Field | Value |
|---|---|
| Document ID | RV2-FND-10 |
| Version | 0.1.0 |
| Document Status | Draft |
| Review Status | Not Started |
| Approval Status | Not Submitted |
| Content Authority | Chief Product Architect |
| Document Maintainer | Engineering Program Manager |

## Table of Contents

- [Purpose](#purpose)
- [Library Principles](#library-principles)
- [Skill Contract](#skill-contract)
- [Skill Structure](#skill-structure)
- [Skill Lifecycle](#skill-lifecycle)
- [Library Register](#library-register)
- [Core Skill Specifications](#core-skill-specifications)
- [Composition and Precedence](#composition-and-precedence)
- [Validation and Evaluation](#validation-and-evaluation)
- [Security and Permissions](#security-and-permissions)
- [Maintenance](#maintenance)
- [Decision Records](#decision-records)
- [Cross-References](#cross-references)
- [Open Decisions](#open-decisions)
- [Consistency Review](#consistency-review)
- [Review Record](#review-record)
- [Approval Record](#approval-record)
- [Amendment History](#amendment-history)
- [Version History](#version-history)

## Purpose

This document defines the permanent, repository-scoped skill library for AI-assisted Retroverse V2 engineering. It specifies what each skill must accomplish, when it should activate, what authority it has, and what evidence it must return.

This document is a build specification for future skill artifacts. It does not itself install, enable, or execute a skill.

## Library Principles

1. **Foundation authority.** A skill operationalizes approved requirements and never creates product meaning.
2. **Narrow purpose.** One skill owns one recognizable workflow with a clear trigger and result.
3. **Progressive disclosure.** Trigger metadata remains concise; detailed references load only when the task needs them.
4. **Evidence over assertion.** Completion requires inspectable sources, commands, results, or artifacts.
5. **Least privilege.** Read-only is the default; write, network, and external actions are explicitly bounded.
6. **Determinism where fragile.** Repeated or error-prone mechanical operations use tested scripts rather than regenerated procedures.
7. **No duplicated authority.** Skills link to Foundation sections instead of copying product rules.
8. **Honest stopping.** A skill identifies conditions under which it must stop, escalate, or return incomplete evidence.
9. **Small library.** A new skill is justified by repeated work, material error risk, or specialized tooling—not by naming every task.
10. **Replaceability.** Skills are versioned repository assets that can be inspected, tested, revised, or removed.

## Skill Contract

Every Retroverse skill shall define the following contract:

| Field | Requirement |
|---|---|
| Name | Lowercase letters, digits, and hyphens; under 64 characters; folder name equals skill name |
| Description | States what the skill does and the concrete requests or contexts that trigger it |
| Purpose | One bounded outcome the skill owns |
| Authority | Research, planning, implementation, review, or operations; plus allowed mutations |
| Inputs | Required files, identifiers, environment, state, and user direction |
| Sources | Foundation sections and external primary sources the skill may use |
| Workflow | Ordered actions with decision points and verification |
| Outputs | Required artifact, findings, edits, or status record |
| Evidence | Commands, test results, links, screenshots, diffs, or structured checks required for completion |
| Stop Conditions | Conflicts, missing authority, unsafe state, unavailable dependency, or fundamentally divergent direction |
| Non-Goals | Adjacent behavior the skill must not perform |
| Permissions | Filesystem, network, connector, browser, and external-write requirements |
| Validation | Static validation and realistic task cases that must pass |
| Owner | Maintainer responsible for review and updates |

The skill description is the trigger surface and shall contain all essential “when to use” information. The body assumes the skill has already triggered and shall use direct procedural language.

## Skill Structure

Repository skills shall live at `.agents/skills/<skill-name>/`:

```text
<skill-name>/
├── SKILL.md                 # Required trigger metadata and core workflow
├── agents/
│   └── openai.yaml          # Recommended user-facing metadata
├── scripts/                 # Optional deterministic operations
├── references/              # Optional, selectively loaded detail
└── assets/                  # Optional templates or output inputs
```

Rules:

- `SKILL.md` contains YAML frontmatter with only `name` and `description` unless the active Codex skill specification later requires otherwise.
- The body should remain under 500 lines; long schemas, examples, and variants belong in directly linked reference files.
- References shall be one level deep from `SKILL.md` and shall not duplicate the core instructions.
- Scripts shall accept explicit inputs, return meaningful exit codes, avoid embedded secrets, and be tested in the supported environment.
- Assets are inputs to produced artifacts and are not loaded as instructions.
- Do not add skill-local README, changelog, installation guide, or other auxiliary files.
- Repository discovery and compatibility shall be verified before the skill is marked Active.

## Skill Lifecycle

### Statuses

| Status | Meaning |
|---|---|
| Proposed | Contract exists in this library; artifact has not been implemented or accepted |
| Experimental | Artifact exists and passes structural validation; realistic evaluation is incomplete |
| Active | Required evaluations pass and the skill is approved for normal repository use |
| Restricted | Skill is active only for named users, environments, or approval conditions |
| Deprecated | Skill remains discoverable during migration but shall not be selected for new work |
| Retired | Skill is removed from discovery and retained only in repository history |

### Creation

1. Demonstrate at least two representative requests or one high-risk repeatable workflow.
2. Define the contract and confirm no existing skill already owns the outcome.
3. Initialize the standard skill structure using the approved skill tooling.
4. Add only necessary instructions, scripts, references, and assets.
5. Run structural validation and execute every added script on representative inputs.
6. Forward-test the skill with realistic, minimally primed tasks.
7. Review permissions, source handling, and failure behavior.
8. Record the version, evaluation evidence, owner, and status.

### Change

A trigger, permission, authority, output contract, or stop-condition change requires full reevaluation. Editorial clarification and reference refresh require structural validation and a targeted regression test. Skill changes merge through normal pull-request controls.

### Retirement

Retirement requires removing discovery references, migrating dependent workflows, preserving necessary evidence in repository history, and confirming no required build or acceptance path depends on the retired skill.

## Library Register

| Skill ID | Skill Name | Primary Class | Status | Owner | Governing Documents |
|---|---|---|---|---|---|
| SKL-001 | `guard-foundation` | Review | Proposed | Foundation Maintainer | RV2-FND-00–03, 08, 09 |
| SKL-002 | `trace-product-requirements` | Planning | Proposed | Product Architecture | RV2-FND-04, 11, 12 |
| SKL-003 | `guard-data-model` | Review | Proposed | Data Architecture | RV2-FND-05, 08, 11 |
| SKL-004 | `guard-architecture` | Review | Proposed | Systems Architecture | RV2-FND-06, 08, 11 |
| SKL-005 | `plan-implementation` | Planning | Proposed | Engineering | RV2-FND-08, 09, 11 |
| SKL-006 | `verify-build` | Review | Proposed | Engineering | RV2-FND-08, 11, 12 |
| SKL-007 | `verify-browser-ux` | Review | Proposed | UX and QA | RV2-FND-07, 11, 12 |
| SKL-008 | `prepare-pr` | Operations | Proposed | Engineering | RV2-FND-08, 09, 11 |
| SKL-009 | `review-security` | Review | Proposed | Security | RV2-FND-06, 08, 09, 12 |
| SKL-010 | `maintain-foundation` | Implementation | Proposed | Foundation Maintainer | RV2-FND-00–12 |
| SKL-011 | `verify-release` | Review | Proposed | Release Owner | RV2-FND-11, 12 |

All entries remain Proposed until their repository artifacts are separately created, validated, reviewed, and activated.

### Required Activation Baseline

Skills are engineering controls, not Retroverse product features. Activation is phase-based:

| Gate | Skills that MUST be Active |
|---|---|
| Before the first production-code implementation task | SKL-001 `guard-foundation`, SKL-002 `trace-product-requirements`, SKL-005 `plan-implementation` |
| Before the first schema or persistence change | SKL-003 `guard-data-model` |
| Before the first package-boundary, runtime, provider, cache, or deployment change | SKL-004 `guard-architecture` |
| Before a UI change is accepted | SKL-007 `verify-browser-ux` |
| Before a security-sensitive change is accepted | SKL-009 `review-security` |
| Before a branch is published as a pull request through AI operations | SKL-008 `prepare-pr` |
| Before a Release 1 candidate is assessed | SKL-006 `verify-build`, SKL-011 `verify-release` |

SKL-010 `maintain-foundation` becomes Active before the first post-1.0 Foundation amendment. A gate does not require unrelated Proposed skills. Human review and repository controls remain mandatory even when a skill is Active.

## Core Skill Specifications

### SKL-001 — `guard-foundation`

| Contract Field | Specification |
|---|---|
| Purpose | Detect contradiction, unauthorized product behavior, duplicate concepts, stale cross-references, and missing definitions across a proposed change and the Foundation |
| Triggers | Foundation review; architecture review; request to check consistency, contradictions, terminology, or source-of-truth compliance |
| Inputs | Changed files or proposed text; `/docs`; applicable decision identifiers |
| Workflow | Establish authority versions; extract normative claims; trace terms and decisions; compare claims; classify findings; propose only non-substantive corrections unless product authority is explicit |
| Outputs | Prioritized findings with exact locations, governing source, conflict explanation, and required disposition |
| Evidence | Link and anchor check; metadata comparison; decision and term reference report |
| Permissions | Read-only by default; docs-only write when explicitly authorized |
| Stop Conditions | Two authoritative sources conflict; an amendment would alter product meaning; requested resolution exceeds task authority |
| Non-Goals | Designing product behavior; resolving architecture ambiguity without authorized architect scope |

### SKL-002 — `trace-product-requirements`

| Contract Field | Specification |
|---|---|
| Purpose | Convert an accepted work item into a complete implementation and acceptance trace without changing the requested behavior |
| Triggers | Feature intake, implementation planning, acceptance mapping, scope validation |
| Inputs | Work item; Product Specification; relevant decisions, entities, UX rules, and acceptance criteria |
| Workflow | State outcome; enumerate governing requirements; identify affected entities and states; map interfaces and error cases; identify evidence; report uncovered behavior |
| Outputs | Trace matrix from requirement to entity, component, test level, and acceptance criterion |
| Evidence | Every scoped behavior has a Foundation source or is explicitly marked as an implementation detail |
| Permissions | Read-only |
| Stop Conditions | Work item contradicts the Foundation; material product behavior has no authorized source |
| Non-Goals | Writing code; selecting a new product direction |

### SKL-003 — `guard-data-model`

| Contract Field | Specification |
|---|---|
| Purpose | Review schema and persistence changes against canonical entities, identifiers, lifecycle rules, provenance, and relational invariants |
| Triggers | Migration, schema, import, query, repository, cache, or identifier change |
| Inputs | Data Model; schema definitions; migrations; affected queries and tests |
| Workflow | Map tables to canonical entities; check identity and keys; verify normalization and constraints; inspect lifecycle and publication leakage; review migration compatibility; require invariant tests |
| Outputs | Blocking and non-blocking findings plus required database evidence |
| Evidence | Clean migration, prior-schema upgrade, constraint tests, and schema diff |
| Permissions | Read-only review; workspace writes only when asked to implement selected fixes |
| Stop Conditions | New domain entity or altered identity boundary; destructive migration without approved expand-and-contract plan |
| Non-Goals | Choosing product workflow; treating application validation as a substitute for constraints |

### SKL-004 — `guard-architecture`

| Contract Field | Specification |
|---|---|
| Purpose | Detect violations of the modular-monolith boundaries, approved stack, one-source-of-truth rule, and deployment topology |
| Triggers | New package, runtime service, dependency, API style, queue, cache, provider adapter, or deployment component |
| Inputs | Architecture; repository graph; package manifests; configuration; proposed design or diff |
| Workflow | Identify changed boundary; inspect dependency direction; test whether existing component can own behavior; assess state authority and operations; compare simpler accepted alternative |
| Outputs | Boundary findings and a compliant minimal remediation when one is already determined by the Architecture |
| Evidence | Dependency graph, manifest diff, and relevant build checks |
| Permissions | Read-only by default |
| Stop Conditions | Proposal requires a new service, database, protocol, product AI runtime, or fundamentally different architecture |
| Non-Goals | Broad redesign; speculative scaling components |

### SKL-005 — `plan-implementation`

| Contract Field | Specification |
|---|---|
| Purpose | Produce a bounded, executable plan for an accepted engineering change |
| Triggers | Request to plan a non-trivial feature, fix, migration, or refactor before implementation |
| Inputs | Traced work item; repository state; governing Foundation sections; acceptance criteria |
| Workflow | Inspect current state; identify smallest vertical slice; order schema, domain, API, UI, tests, docs, and rollout work; state risk and verification |
| Outputs | Ordered plan with one active step, exact affected areas, dependencies, checks, and completion condition |
| Evidence | Every step maps to a requirement or necessary implementation dependency |
| Permissions | Read-only |
| Stop Conditions | Product or architecture conflict; missing external authority; unsafe worktree overlap that cannot be isolated |
| Non-Goals | Implementing the plan; generating a generic phase list without repository inspection |

### SKL-006 — `verify-build`

| Contract Field | Specification |
|---|---|
| Purpose | Run and interpret the smallest complete verification set for a change |
| Triggers | Pre-commit check, pull-request verification, build failure, or request to confirm implementation readiness |
| Inputs | Diff or commit range; Build Specification; package scripts; environment readiness |
| Workflow | Classify changed risk; select required static and test gates; run in canonical order; preserve logs; distinguish code failure, test failure, environment failure, and unavailable check |
| Outputs | Verification table with command, result, duration, evidence path, and unresolved failure |
| Evidence | Actual exit status and relevant output; no inferred pass |
| Permissions | Workspace write for generated test artifacts; network only for an approved dependency or provider test |
| Stop Conditions | Required secret or service unavailable; test would mutate production; failure makes later checks misleading |
| Non-Goals | Silently fixing failures; omitting a required gate to report green status |

### SKL-007 — `verify-browser-ux`

| Contract Field | Specification |
|---|---|
| Purpose | Validate audience and operator behavior, responsive layout, accessibility, and recovery states in a real browser |
| Triggers | UI change, end-to-end acceptance, visual regression, accessibility check, Channel Zero behavior review |
| Inputs | UX Standards; acceptance path; local or preview URL; deterministic fixtures; test identity if needed |
| Workflow | Confirm environment; execute semantic interactions; inspect compact, medium, wide, and applicable venue layouts; test keyboard and reduced motion; inspect console/network; capture evidence |
| Outputs | Pass/fail report by criterion with screenshots, trace, and exact defect reproduction |
| Evidence | Playwright assertions plus human-readable visual evidence for changed states |
| Permissions | Browser control; only test-environment writes scoped to fixtures |
| Stop Conditions | Environment is production without explicit operational approval; test state is nondeterministic; credentials are unavailable |
| Non-Goals | Approving visual design changes; relying only on screenshots |

### SKL-008 — `prepare-pr`

| Contract Field | Specification |
|---|---|
| Purpose | Prepare an intentional commit, push a confirmed branch, and open a draft pull request with complete traceability |
| Triggers | Explicit request to commit, publish branch changes, or open a pull request |
| Inputs | Confirmed diff scope; branch; work item; verification results; GitHub access |
| Workflow | Inspect status and diff; exclude unrelated work; verify required checks; compose commit; push without history rewrite; create draft PR; report URL and checks |
| Outputs | Commit identifier and draft pull request containing scope, references, evidence, risk, rollout, and rollback |
| Evidence | Clean intended diff, successful push, and created PR metadata |
| Permissions | Repository and GitHub writes; explicit user request required |
| Stop Conditions | Scope is ambiguous; unrelated changes cannot be isolated; protected-branch bypass or force push would be required; mandatory checks fail |
| Non-Goals | Merging, deploying, resolving product decisions, or concealing failed checks |

### SKL-009 — `review-security`

| Contract Field | Specification |
|---|---|
| Purpose | Review a change for practical security and privacy defects within the Retroverse threat model |
| Triggers | Authentication, authorization, session, secret, import, outbound request, provider, dependency, audit, credential, or deployment-permission change; explicit security review |
| Inputs | Diff; Architecture security sections; AI Operations threat model; dependency and scan evidence |
| Workflow | Identify trust boundaries and assets; trace attacker-controlled input; check authorization and disclosure; inspect SSRF, injection, session, secret, supply-chain, and prompt-injection risks; prioritize exploitable findings |
| Outputs | Location-specific findings with impact, exploit path, evidence, and minimal remediation direction |
| Evidence | Reproduction or source path when possible; scan result is supporting evidence, not sole conclusion |
| Permissions | Read-only; security scanners require bounded approved access |
| Stop Conditions | Finding requires handling live secrets or exploitation of production; scope requires a formal external assessment |
| Non-Goals | Claiming full security certification; speculative low-value findings without an attack path |

### SKL-010 — `maintain-foundation`

| Contract Field | Specification |
|---|---|
| Purpose | Apply authorized Foundation content while preserving numbering, metadata, versions, cross-references, glossary, decisions, statuses, and amendment history |
| Triggers | Foundation authoring, amendment, consistency reconciliation, document status or approval update |
| Inputs | Authorized content or decision; current `/docs`; review and approval record |
| Workflow | Determine affected documents; preserve product meaning; edit authoritative source; update dependent links and registers; check duplicates and missing definitions; validate structure |
| Outputs | Coherent document-set diff and consistency report |
| Evidence | Metadata audit, link check, identifier uniqueness check, and affected-reference review |
| Permissions | Writes limited to documentation and approved supporting indexes |
| Stop Conditions | Two approved sources conflict; requested administrative edit would change product meaning without architect authority |
| Non-Goals | Inventing behavior under program-management authority; editing production code |

### SKL-011 — `verify-release`

| Contract Field | Specification |
|---|---|
| Purpose | Assemble and evaluate the Release 1 evidence bundle against every applicable acceptance gate |
| Triggers | Release candidate, go/no-go review, production-readiness assessment |
| Inputs | Immutable release commit and artifact; migrations; environment; Acceptance Criteria; test and operational evidence |
| Workflow | Confirm artifact identity; verify CI gates; run critical journeys and non-functional checks; validate fallback, backup, restore, rollback, monitoring, and known defects; classify outcome |
| Outputs | Signed-off evidence index and Ready, Conditionally Ready, or Not Ready recommendation |
| Evidence | Durable artifacts linked to every mandatory acceptance criterion |
| Permissions | Read-only assessment by default; production rehearsal actions require explicit release authority |
| Stop Conditions | Artifact changes during assessment; mandatory evidence is missing; critical/high defect or failed release gate exists |
| Non-Goals | Waiving criteria, merging, or deploying solely on the skill's recommendation |

## Composition and Precedence

- The task selects the minimum set of skills that fully covers the workflow.
- The lead skill owns sequencing; supporting skills return bounded results.
- `trace-product-requirements` precedes `plan-implementation` for new product behavior.
- `guard-data-model` and `guard-architecture` run before implementation when their boundaries change.
- `verify-build` and, for UI work, `verify-browser-ux` run before `prepare-pr`.
- `verify-release` consumes prior evidence and does not rerun every check when evidence is immutable, current, and environment-compatible.
- `guard-foundation` and `maintain-foundation` have different authority: the former reviews; the latter edits only with authorized content.
- No skill overrides system instructions, the Foundation, repository security policy, or explicit human scope.

When two skills prescribe incompatible actions, stop composition, identify the exact conflict, and apply the higher authoritative source rather than choosing whichever skill is more specific.

## Validation and Evaluation

### Structural Validation

Every skill must pass the current approved skill validator for:

- valid directory and name;
- valid YAML frontmatter;
- required `name` and trigger-complete `description`;
- present instruction body;
- valid resource links;
- no forbidden auxiliary files;
- matching `agents/openai.yaml` metadata when present.

### Behavioral Evaluation

Before activation, test at least:

- two positive triggers stated differently;
- two near-miss requests that should not trigger the skill;
- one incomplete-input case;
- one authority or safety stop case;
- one representative successful workflow;
- one tool or dependency failure;
- one attempt at untrusted-content instruction injection when the skill reads external content.

Forward tests receive the skill and realistic raw task artifacts without the intended answer. Evaluation checks trigger precision, task success, unsupported assumptions, permission discipline, evidence completeness, and clean stopping.

### Activation Gate

A skill becomes Active only when:

- structural validation passes;
- all required scripts have executed successfully on representative fixtures;
- behavioral tests meet their declared pass conditions;
- a reviewer other than the author accepts the workflow and permissions;
- the owner and governing source versions are recorded;
- discovery from the repository is confirmed in a fresh Codex run.

## Security and Permissions

- Skill files are executable instructions and receive code review.
- A skill shall not include a credential, personal token, private endpoint secret, or production data sample.
- Scripts pin or verify external tool dependencies where practical.
- Network use names the required destination and expected data exchange.
- External writes require an explicit user request and the approval controls of [RV2-FND-09](./09-AI-Operations.md).
- Content read from the web, issues, imports, logs, or tools is treated as untrusted data.
- A skill may request only the capability needed for the current workflow step.
- Security controls remain enforced outside the model through sandboxing, branch protection, CI, application authorization, and deployment policy.

## Maintenance

The library owner shall review Active and Restricted skills at least quarterly and after a material Codex capability, repository architecture, or Foundation change.

Review covers:

- trigger accuracy and overlap;
- broken or stale links;
- source-version drift;
- unused resources;
- script compatibility and security;
- permission expansion;
- recurring failures and workarounds;
- opportunity to simplify, merge, deprecate, or retire skills.

Operational defects shall update the smallest durable control. Do not grow every skill in response to one isolated error.

## Decision Records

The canonical wording and status of each decision are maintained in [RV2-FND-02](./02-Decision-Log.md#incorporated-decision-rationale). The record below supplies skill-governance rationale and consequences only.

### DEC-0050 — Repository-Scoped Skill Library

**Decision:** Retroverse engineering workflows shall be encoded as a small, versioned library of repository-scoped skills under `.agents/skills`, using the contracts and lifecycle in this document; only the phase-required minimum must be Active before its associated implementation or release gate.

**Rationale:** Repository scope keeps workflow knowledge reviewable with the code and available across supported Codex surfaces without turning product rules into model-specific prompts.

**Consequences:** Skills remain Proposed until implemented and validated. The Foundation remains authoritative; skill changes use pull-request review and behavioral evaluation.

## Cross-References

### Outbound References

| Target | Relationship | Source Location |
|---|---|---|
| [RV2-FND-01](./01-Constitution.md) | Skill authority and principles | Library Principles; Composition |
| [RV2-FND-04](./04-Product-Specification.md) | Product traceability source | SKL-002 |
| [RV2-FND-05](./05-Data-Model.md) | Data review source | SKL-003 |
| [RV2-FND-06](./06-Architecture.md) | Architecture review source | SKL-004; SKL-009 |
| [RV2-FND-07](./07-UX-Standards.md) | Browser and accessibility source | SKL-007 |
| [RV2-FND-08](./08-Development-Manual.md) | Engineering workflows skills encode | SKL-005; SKL-006; SKL-008 |
| [RV2-FND-09](./09-AI-Operations.md) | Agent authority, permissions, and security | Entire document |
| [RV2-FND-11](./11-Build-Specification.md) | Executable build and release commands | SKL-006; SKL-011 |
| [RV2-FND-12](./12-Acceptance-Criteria.md) | Acceptance evidence | SKL-002; SKL-007; SKL-011 |

### Inbound References

| Source | Relationship | Target Location |
|---|---|---|
| [RV2-FND-09](./09-AI-Operations.md) | Establishes skills as preferred reusable workflow | Skill Contract; Security |
| [RV2-FND-11](./11-Build-Specification.md) | Requires skill validation in repository governance | Validation and Evaluation |
| [RV2-FND-12](./12-Acceptance-Criteria.md) | Validates library structure and active-skill behavior | Library Register; Activation Gate |

## Open Decisions

No open decision blocks this draft. Individual skills remain Proposed until their implementation artifacts and evaluation evidence exist.

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
| 0.1.0 | 2026-07-13 | Draft | Authored the skill contract, repository structure, lifecycle, eleven core skill specifications, composition, validation, security, and maintenance standards. | Chief Product Architect |
| 0.0.0 | 2026-07-13 | Framework | Created document framework. No architect-authored content added. | Engineering Program Manager |
