# Retroverse Agent Instructions

These instructions apply to coding agents working in this repository, including Codex and ChatGPT Work when they open the repo.

## Start every assignment

1. Read `docs/agents/AGENT_MEMORY_PROTOCOL.md` and `docs/agents/checkpoints/retroverse.json`.
2. Read the relevant `.cursor/rules/` and existing project guidance before changing code.
3. Confirm the current approved objective, the last **verified** completed task, unresolved blockers, and the single next action. Verify evidence rather than treating old checkpoint claims as current truth.
4. Follow the source-of-truth hierarchy in the memory protocol. The latest user instruction and live production evidence override stale repository notes.

## Finish every assignment

- Report execution state exactly as `COMPLETE`, `WAITING`, or `FAILED`, consistent with `.cursor/rules/retroverse-workflow.mdc`.
- Report what changed, what was tested, what remains blocked, and the next action.
- If repository edits are approved, update `docs/agents/checkpoints/retroverse.json` with verified facts and links to evidence. If not, propose the update without writing it.
- Validate checkpoint changes with `node tools/agent-memory/validate-checkpoint.mjs docs/agents/checkpoints/retroverse.json`.
- Do not mark the independent agent handoff test `PASS` until a genuinely separate agent session has read the checkpoint without the prior conversation and correctly resumed it.

## Boundaries

- This is a checkpoint pilot, not permission to start new Studio milestones.
- For Studio work, read `docs/studio/STUDIO_BRAIN.md` and obey its phase approval gates.
- Do not merge, deploy, alter canonical datasets, expose credentials, or expand the assignment without explicit approval.
- Cursor-specific instructions remain in `.cursor/rules/`. This file does not automatically configure local Ollama agents or Morbius; those require separate integration.
