# Sprint 3.1 — Studio Training Mode

Generated: 2026-06-27

## Summary

Training Mode adds a **production academy** layer on top of existing Studio departments — no package contract changes, no new AI workers, no department redesigns.

## How to use

1. Open any Studio or Mission Control page.
2. Toggle **Training Mode** in the guide bar (next to Operator Guide).
3. In Mission Control, select a song — pipeline opens at `/ops/studio/training/{RVTR}/collector`.
4. Walk left-to-right: Collector → Editor → Director → Publisher → Renderer.
5. At each stage: review **input / output / decisions / confidence**, then **Approve**, **Needs Coaching**, or **Reject** with an optional note.
6. Department Health: `/ops/studio/training`

## What each department shows

| Department | Input | Output | Explainability |
|---|---|---|---|
| Collector | VDJ media + graph | collector.json, facts, frames, charts | Research quality, performance selection |
| Editor | Collector handoff | editor.json, blueprint, approved assets | Story angle, fact curation |
| Director | Editor handoff | director.json, render spec, scene order | Template choices per scene |
| Publisher | Render spec | Readiness, extended badge, missing assets | Publication gate reasoning |
| Renderer | Presentation spec | Patron swipe experience (live preview) | Composed vs museum mode |

## Spot Review

From `/ops/studio/training`, run **Spot Review** on the museum pilot batch (up to 20 songs → 3 representatives by confidence, risk, random).

Reviews stored in `data/ops/studio/training-reviews.json` — does not mutate packages.

## API

- `GET /api/ops/studio/training/{rvtr}` — full song snapshot
- `POST /api/ops/studio/training/review` — save operator review
- `GET /api/ops/studio/training/health` — department health
- `POST /api/ops/studio/training/spot-review` — pick 3 from batch

## Checkpoint

- Enable Training Mode → select RVTR720668 in Mission Control → should land on Collector training page with pipeline nav persistent across departments.
