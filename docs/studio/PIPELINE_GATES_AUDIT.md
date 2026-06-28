# Sprint 3.11 — Pipeline Gate Audit

## Root cause: why packages stopped at `partial` / `awaiting_manual_or_coaching`

| Stop state | Where set | Root cause (before 3.11) |
| --- | --- | --- |
| `awaiting_manual_or_coaching` | `production/run-song.ts` | Generic fallback whenever `isPublisherApproved()` was false — masked real reasons |
| `publisher:score_NN_class_needs_coaching` | `auto-approve.ts` | Required `qualityScore >= 70` **and** `publicationClass === "ready"`; most packages classified `needs_coaching` from dimension penalties |
| `needs_coaching` class | `evaluate.ts` `classifyPublication` | Triggered when `coachingIssues.length >= 2` OR `qualityScore < 62` OR `qualityScore < 70` — treated as approval gate |
| `blocked` class | `evaluate.ts` | `director.review.renderReadiness === "missing_required_assets"` even when minimum facts/images/performance existed |
| `needs_approval` | `production/queue.ts` | Re-queued evaluated-but-unapproved packages — correct queue signal, not a skip reason |
| `needs_pipeline` | `production/queue.ts` | Missing director render spec — legitimate fatal |
| `needs_publisher` | `production/queue.ts` | Director complete but no evaluation — pipeline step needed |
| `partial` (Collector stage) | `run-collector.ts` | Research completeness only — does **not** block downstream pass-through |

## Coaching was blocking (fixed)

**Old:** Publisher → `needs_coaching` → auto-approve refused → production `partial`.

**New:** Publisher evaluates → stores `coachingIssues` + `experienceCritic` → `autoPublishStandard()` publishes when structure is complete. Coaching feeds Director hints on **future** runs only.

## Fatal vs advisory (after 3.11)

**Fatal (skip publish):** missing collector/editor/director, invalid identity, no approved facts/images/performance, no hero/cover artwork, corrupted validation, golden frozen.

**Advisory (publish anyway):** quality score, dimension notes, critic observations, optional asset gaps, `needs_coaching` classification.

## Score tiers (`publish-policy.ts`)

| Score | Tier | Production behavior |
| --- | --- | --- |
| ≥ 80 | `publish` | Auto-publish, log "Passed automatic threshold" |
| 70–79 | `needs_review` | Auto-publish, log review recommended |
| < 70 | `reject_advisory` | Auto-publish if structure complete; coaching stored |

Threshold constant: `PUBLISH_SCORE_AUTO_THRESHOLD` (= 70).

## Files changed

- `lib/ops/studio/publisher/publish-policy.ts` — structural gates + auto publish
- `lib/ops/studio/publisher/auto-approve.ts` — re-exports policy
- `lib/ops/studio/publisher/evaluate.ts` — coaching advisory only; structural fatals
- `lib/ops/studio/production/run-song.ts` — specific skip reasons in `error`
