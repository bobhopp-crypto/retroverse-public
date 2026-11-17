# Retroverse — agent and pull-request review guidance

## Resolve product boundaries
The repository contains `apps/live`, `apps/studio`, and local `tools/live-bridge`. Confirm the intended subsystem and actual deployment configuration before recommending a release. GitHub source alone does not prove which commit is deployed at retroverse.live.

## Scope review
1. Compare every changed file with the task acceptance criteria. Flag unrelated refactors, extra visual content, changes to public navigation, or regressions on small screens.
2. When the public homepage is in scope, verify against current owner intent rather than assuming the present JSX is approved.
3. Check VirtualDJ OSC and bridge changes carefully. Preserve song-change publishing and 10-minute resync; do not run a live bridge as a test without explicit approval.
4. Treat Redis, credentials, media identity, permissions, bulk file operations, and paid API usage as protected surfaces.
5. Prefer existing local Ollama Knowledge Department and Media Lab workflows over duplicate implementations.
6. Inspect actual test/build/lint evidence. When no execution environment or checks exist, state that clearly instead of guessing.
7. Give actionable findings with file locations and severity. End with the exact reviewed scope and unresolved risks.

No automated merging, deployment, destructive data operations, external paid calls, or publishing without separate authorization.
