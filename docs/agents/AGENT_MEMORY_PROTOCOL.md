# Retroverse Agent Memory — Pilot Protocol

**Scope:** Retroverse only. This is an agent handoff/checkpoint pilot, not a new Studio milestone, memory database, agent framework, or product feature.

## Source-of-truth order

1. User's latest explicit instructions and approvals.
2. Current production evidence (Vercel deployment, deployed commit, runtime checks).
3. Current repository files and approved Studio phase in `docs/studio/STUDIO_BRAIN.md`.
4. `docs/agents/checkpoints/retroverse.json` for **handoff state**, not product or architecture truth.
5. Older documents and chat summaries, which can be stale.

Never override a higher-priority source with the checkpoint. Never assume a document labeled “current” is current without checking its date and production evidence.

## Start of each bounded assignment

1. Read `docs/agents/checkpoints/retroverse.json`, this protocol, and applicable `.cursor/rules/`.
2. State the **current objective**, **last verified completed work**, **known blockers**, and **single next action** in a brief handoff.
3. Check the referenced evidence before relying on a decision; flag broken or stale references.
4. If work touches Studio, read `docs/studio/STUDIO_BRAIN.md` and respect approved phases. A checkpoint never authorizes a new milestone.
5. Execute only the approved task. Do not change production, canonical data, secrets, or unrelated code as part of this pilot.

## End of assignment

Update the checkpoint on the working branch **only if the assignment explicitly permits repository edits**. Otherwise provide a proposed checkpoint update in the report.

- `lastTask.executionState`: exactly `COMPLETE`, `WAITING`, or `FAILED`, consistent with `.cursor/rules/retroverse-workflow.mdc`.
- `completed`: verified accomplishments only, each with at least one link or repo path as evidence.
- `decisions`: explicit, dated decisions with evidence and provenance; do not turn hypotheses into decisions.
- `blockers`: concrete unresolved obstacles; use an empty array if none.
- `nextAction`: one executable, bounded action; don't silently start a new milestone.
- `handoffTest`: mark `PASS` only after a **separate** resume attempt demonstrates accurate retrieval of the objective, completion evidence, blocker state, and next action. Otherwise use `NOT_RUN` or `FAIL`.
- `lastUpdated`: UTC date of actual update. No invented timestamps, commits, test results, or completion claims.

No passwords, API keys, tokens, private user data, or raw local paths containing secrets. Keep the checkpoint small and readable; link to evidence instead of copying logs.

## Acceptance test (two distinct sessions)

**Session A:** Complete a narrow, approved task, record evidence and next action, validate JSON, then stop.

**Session B:** Start from the saved checkpoint without relying on the prior chat. Report the exact last completed task, evidence, blockers, and next action. Compare against the file; run the validator. Mark `PASS` only when all four are correct.

```bash
node tools/agent-memory/validate-checkpoint.mjs docs/agents/checkpoints/retroverse.json
```

**Done:** The checkpoint validates; a separate agent/session resumes accurately; no existing Studio milestones, site behavior, data, or deployment are changed. Until the second session is verified, this is an implemented **pilot**, not a proven memory system.
